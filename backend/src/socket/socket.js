import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { parse } from "cookie";
import { User } from "../models/user.model.js";
import { Chat } from "../models/chat.model.js";
import {
  OID_RE,
  parseRoomId,
  companyRoomId,
  managementRoomId,
  getRoomAccess,
} from "../utils/chatRooms.js";
import { isOwnedChatUpload } from "../utils/cloudinaryOwnership.js";

let io;

export const getIO = () => io;

// every socket joins this private room so we can find all of one user's sockets
const userRoom = (id) => `user_${id}`;

// how long a positive access decision is trusted for one socket + room
const ACCESS_TTL_MS = 15_000;

// simple per-socket limiter: max `max` events per `windowMs`
const makeLimiter = (max, windowMs) => {
  let count = 0;
  let resetAt = Date.now() + windowMs;
  return () => {
    const now = Date.now();
    if (now > resetAt) {
      count = 0;
      resetAt = now + windowMs;
    }
    count += 1;
    return count <= max;
  };
};

/**
 * Call after anything that can remove or downgrade access (member removed, manager
 * reassigned, user removed from company). Re-checks every chat room of every socket
 * that user has open and kicks them out of rooms they may no longer read.
 */
export const revalidateUserRooms = async (userId) => {
  if (!io || !userId) return;

  const sockets = await io.in(userRoom(userId)).fetchSockets();
  if (sockets.length === 0) return;

  const me = await User.findById(userId).select("_id companyId");

  for (const s of sockets) {
    for (const room of [...s.rooms]) {
      if (parseRoomId(room).type === "invalid") continue; // socket id, user_ room
      const access = me ? await getRoomAccess(me, room) : null;
      if (!access || !access.canRead || access.notFound) {
        s.leave(room);
        s.emit("roomRevoked", room);
      }
    }
  }
};

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Auth from the httpOnly accessToken cookie (client: io(url, { withCredentials: true }))
  io.use(async (socket, next) => {
    try {
      const cookies = parse(socket.handshake.headers.cookie || "");
      const token = cookies.accessToken;
      if (!token) throw new Error("No token provided");

      const decoded = jwt.verify(token, process.env.ACCESSTKN_KEY);
      const user = await User.findById(decoded?._id).select("_id fullname username email companyId");
      if (!user) throw new Error("User not found");

      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.user;
    const displayName = user.fullname || user.username;
    const allowSend = makeLimiter(20, 10_000);
    const accessCache = new Map(); // room -> { ok, at }

    socket.join(userRoom(user._id));

    // fresh DB check (cached briefly). Leaves the room and tells the client if access is gone.
    const ensureAccess = async (room) => {
      const hit = accessCache.get(room);
      if (hit && Date.now() - hit.at < ACCESS_TTL_MS) return hit.ok;

      const me = await User.findById(user._id).select("_id companyId");
      const access = me ? await getRoomAccess(me, room) : null;
      const ok = !!access && access.canRead && !access.notFound;

      accessCache.set(room, { ok, at: Date.now() });
      if (!ok) {
        socket.leave(room);
        socket.emit("roomRevoked", room);
      }
      return ok;
    };

    // re-reads the user so joining a company AFTER connecting still works
    const joinIfAllowed = async (rawId, roomFor, deniedMsg, failMsg) => {
      try {
        const id = String(rawId ?? "");
        if (!OID_RE.test(id)) return socket.emit("error", "valid id required");

        const me = await User.findById(user._id).select("_id companyId");
        if (!me) return socket.emit("error", "User not found");

        const room = roomFor(id);
        const access = await getRoomAccess(me, room);
        if (access.notFound) return socket.emit("error", "Room not found");
        if (!access.canRead) return socket.emit("error", deniedMsg);

        accessCache.set(room, { ok: true, at: Date.now() });
        socket.join(room);
        socket.emit("joinedRoom", room);
      } catch {
        socket.emit("error", failMsg);
      }
    };

    socket.on("joinCompanyRoom", (id) =>
      joinIfAllowed(id, companyRoomId, "Unauthorized: not a member of this company", "Failed to join company room")
    );
    socket.on("joinProjectRoom", (id) =>
      joinIfAllowed(id, (x) => String(x), "Unauthorized: not a member of this project", "Failed to join project room")
    );
    socket.on("joinManagementRoom", (id) =>
      joinIfAllowed(id, managementRoomId, "Unauthorized: managers/admins only", "Failed to join management room")
    );

    socket.on("sendMessage", async (payload) => {
      try {
        const { room, message } = payload ?? {};
        if (typeof room !== "string" || typeof message !== "string") return;
        if (parseRoomId(room).type === "invalid") return;
        const text = message.trim();
        if (!text || text.length > 2000) return;
        if (!socket.rooms.has(room)) return socket.emit("error", "Join the room before sending");
        if (!allowSend()) return socket.emit("error", "You are sending messages too fast");
        if (!(await ensureAccess(room))) return;

        const saved = await Chat.create({
          room,
          sender: user._id,
          senderName: displayName,
          message: text,
        });

        io.to(room).emit("receiveMessage", {
          _id: saved._id,
          room: saved.room,
          sender: saved.sender,
          senderName: saved.senderName,
          message: saved.message,
          fileUrl: null,
          createdAt: saved.createdAt,
        });
      } catch (e) {
        console.error("sendMessage error:", e.message);
        socket.emit("error", "Failed to send message");
      }
    });

    socket.on("shareFile", async (payload) => {
      try {
        const { room, fileUrl } = payload ?? {};
        if (typeof room !== "string" || typeof fileUrl !== "string") return;
        if (parseRoomId(room).type === "invalid") return;
        if (!socket.rooms.has(room)) return socket.emit("error", "Join the room before sending");
        if (!allowSend()) return socket.emit("error", "You are sending messages too fast");
        if (!(await ensureAccess(room))) return;

        // the file must sit in THIS user's own chat upload folder
        const me = await User.findById(user._id).select("_id companyId");
        if (!me || !isOwnedChatUpload(fileUrl, me)) {
          return socket.emit("error", "Invalid file URL");
        }

        const saved = await Chat.create({
          room,
          sender: user._id,
          senderName: displayName,
          fileUrl,
        });

        io.to(room).emit("fileShared", {
          _id: saved._id,
          room: saved.room,
          sender: saved.sender,
          senderName: saved.senderName,
          fileUrl: saved.fileUrl,
          createdAt: saved.createdAt,
        });
      } catch (e) {
        console.error("shareFile error:", e.message);
        socket.emit("error", "Failed to share file");
      }
    });

    socket.on("typing", async (payload) => {
      try {
        const { room, isTyping } = payload ?? {};
        if (typeof room !== "string" || !socket.rooms.has(room)) return;
        if (!(await ensureAccess(room))) return;
        socket.broadcast.to(room).emit("typing", {
          userId: user._id,
          userName: displayName,
          isTyping: !!isTyping,
        });
      } catch {
        /* ignore */
      }
    });
  });

  return io;
};
