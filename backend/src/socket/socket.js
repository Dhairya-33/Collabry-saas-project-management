import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ProjectMember } from "../models/projectMember.model.js"; 
import { Chat } from "../models/chat.model.js"; 
import { configDotenv } from "dotenv";
configDotenv({})

let io; 

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "*", // e.g. http://localhost:5173
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // 1) Authenticate every socket at handshake time
  io.use(async (socket, next) => {
    try {
      // Frontend should connect like: io(BASE_URL, { auth: { token } })
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) throw new Error("No token provided");

      const decoded = jwt.verify(token, process.env.ACCESSTKN_KEY);

      const userId = decoded?._id || decoded?.this_id;
      if (!userId) throw new Error("Invalid token payload");

      const user = await User.findById(userId).select(
        "_id fullname email companyId"
      );
      if (!user) throw new Error("User not found");

      socket.user = user; 
      next();
    } catch (err) {
      console.error("Socket auth failed:", err.message);
      next(new Error("Unauthorized"));
    }
  });

  // 2) Main socket connection
  io.on("connection", (socket) => {
    const user = socket.user;
    console.log(`✅ Socket connected: ${user.fullname} (${socket.id})`);


    // Company-wide general room: "company:<companyId>"
    socket.on("joinCompanyRoom", (companyId) => {
      try {
        if (!companyId) return socket.emit("error", "companyId required");
        if (!user.companyId || user.companyId.toString() !== companyId) {
          return socket.emit(
            "error",
            "Unauthorized: not a member of this company"
          );
        }
        const room = `company:${companyId}`;
        socket.join(room);
        socket.emit("joinedRoom", room);
      } catch (e) {
        socket.emit("error", "Failed to join company room");
      }
    });

    // Project room: "project:<projectId>" (must be a ProjectMember)
    socket.on("joinProjectRoom", async (projectId) => {
      try {
        if (!projectId) return socket.emit("error", "projectId required");

        const membership = await ProjectMember.findOne({
          projectId,
          userId: user._id,
        }).select("_id role companyId");

        if (!membership) {
          return socket.emit(
            "error",
            "Unauthorized: not a member of this project"
          );
        }

        const room = `project:${projectId}`;
        socket.join(room);
        socket.emit("joinedRoom", room);
      } catch (e) {
        socket.emit("error", "Failed to join project room");
      }
    });

    // Management-only room (admin/manager): "company:<companyId>:management"
    socket.on("joinManagementRoom", async (companyId) => {
      try {
        if (!companyId) return socket.emit("error", "companyId required");

        // Any project membership within the company counts, but role must be admin/manager
        const membership = await ProjectMember.findOne({
          companyId,
          userId: user._id,
          role: { $in: ["admin", "manager"] },
        }).select("_id");

        if (!membership) {
          return socket.emit(
            "error",
            "Unauthorized: only managers/admins can join management room"
          );
        }

        const room = `company:${companyId}:management`;
        socket.join(room);
        socket.emit("joinedRoom", room);
      } catch (e) {
        socket.emit("error", "Failed to join management room");
      }
    });

    
    socket.on("sendMessage", async ({ room, message }) => {
      try {
        if (!room || !message?.trim()) return;

        const joined = socket.rooms.has(room);
        if (!joined) return socket.emit("error", "Join the room before sending");

        const saved = await Chat.create({
          room,
          sender: user._id,
          senderName: user.fullname,
          message: message.trim(),
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

    
    socket.on("shareFile", async ({ room, fileUrl }) => {
      try {
        if (!room || !fileUrl) return;

        const joined = socket.rooms.has(room);
        if (!joined) return socket.emit("error", "Join the room before sending");

        const saved = await Chat.create({
          room,
          sender: user._id,
          senderName: user.fullname,
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

    socket.on("typing", ({ room, isTyping }) => {
      if (!room) return;
      socket.broadcast.to(room).emit("typing", {
        userId: user._id,
        userName: user.fullname,
        isTyping: !!isTyping,
      });
    });

    socket.on("disconnect", () => {
      console.log(`❌ Socket disconnected: ${user.fullname} (${socket.id})`);
    });
  });

  return io;
};


