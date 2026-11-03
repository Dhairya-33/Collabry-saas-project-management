import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { parse } from "cookie";
import { User } from "../models/user.model.js";
import { ProjectMember } from "../models/projectMember.model.js";
import { Chat } from "../models/chat.model.js";

let io;

// Room naming (must match chat.controller.js):
//   company room  -> "company_<companyId>"
//   project room  -> "<projectId>"
const companyRoom = (id) => `company_${id}`;
const managementRoom = (id) => `company_${id}_management`;

export const getIO = () => io;

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

    socket.on("joinCompanyRoom", (companyId) => {
      try {
        if (!mongoose.isValidObjectId(companyId)) return socket.emit("error", "valid companyId required");
        if (!user.companyId || user.companyId.toString() !== String(companyId)) {
          return socket.emit("error", "Unauthorized: not a member of this company");
        }
        const room = companyRoom(companyId);
        socket.join(room);
        socket.emit("joinedRoom", room);
      } catch {
        socket.emit("error", "Failed to join company room");
      }
    });

    socket.on("joinProjectRoom", async (projectId) => {
      try {
        if (!mongoose.isValidObjectId(projectId)) return socket.emit("error", "valid projectId required");
        const membership = await ProjectMember.findOne({ projectId, userId: user._id }).select("_id");
        if (!membership) return socket.emit("error", "Unauthorized: not a member of this project");
        const room = String(projectId);
        socket.join(room);
        socket.emit("joinedRoom", room);
      } catch {
        socket.emit("error", "Failed to join project room");
      }
    });

    socket.on("joinManagementRoom", async (companyId) => {
      try {
        if (!mongoose.isValidObjectId(companyId)) return socket.emit("error", "valid companyId required");
        if (!user.companyId || user.companyId.toString() !== String(companyId)) {
          return socket.emit("error", "Unauthorized: not a member of this company");
        }
        const membership = await ProjectMember.findOne({
          companyId,
          userId: user._id,
          role: { $in: ["admin", "manager"] },
        }).select("_id");
        if (!membership) return socket.emit("error", "Unauthorized: managers/admins only");
        const room = managementRoom(companyId);
        socket.join(room);
        socket.emit("joinedRoom", room);
      } catch {
        socket.emit("error", "Failed to join management room");
      }
    });

    socket.on("sendMessage", async ({ room, message } = {}) => {
      try {
        if (typeof room !== "string" || typeof message !== "string") return;
        const text = message.trim();
        if (!text || text.length > 2000) return;
        if (!socket.rooms.has(room)) return socket.emit("error", "Join the room before sending");

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

    socket.on("shareFile", async ({ room, fileUrl } = {}) => {
      try {
        if (typeof room !== "string" || typeof fileUrl !== "string") return;
        if (!/^https:\/\//.test(fileUrl)) return;
        if (!socket.rooms.has(room)) return socket.emit("error", "Join the room before sending");

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

    socket.on("typing", ({ room, isTyping } = {}) => {
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