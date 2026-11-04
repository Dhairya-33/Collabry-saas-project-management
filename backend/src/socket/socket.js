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

let io;

export const getIO = () => io;

// only accept files that live in OUR Cloudinary account
const cloudinaryPrefix = () =>
  `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/`;

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
        if (fileUrl.length > 2048 || !fileUrl.startsWith(cloudinaryPrefix())) {
          return socket.emit("error", "Invalid file URL");
        }
        if (!socket.rooms.has(room)) return socket.emit("error", "Join the room before sending");
        if (!allowSend()) return socket.emit("error", "You are sending messages too fast");

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

    socket.on("typing", (payload) => {
      const { room, isTyping } = payload ?? {};
      if (typeof room !== "string" || !socket.rooms.has(room)) return;
      socket.broadcast.to(room).emit("typing", {
        userId: user._id,
        userName: displayName,
        isTyping: !!isTyping,
      });
    });
  });

  return io;
};
