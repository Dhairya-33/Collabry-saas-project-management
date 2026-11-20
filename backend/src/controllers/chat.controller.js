import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { Chat } from "../models/chat.model.js";
import { ProjectMember } from "../models/projectMember.model.js";
import { getIO } from "../socket/socket.js";
import {
  OID_RE,
  companyRoomId,
  managementRoomId,
  getRoomAccess,
} from "../utils/chatRooms.js";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const DELETE_DENIED = {
  company: "Only the company owner can delete messages in the general chat",
  management: "Only the company owner can delete messages in the management chat",
  project: "Only project manager/admin can delete messages in this room",
};

const assertReadable = (access) => {
  if (access.type === "invalid") throw new ApiError(400, "Invalid room");
  if (access.notFound) throw new ApiError(404, "Room not found");
  if (!access.canRead) throw new ApiError(403, "You are not allowed to access this room");
};

/**
 * Route middleware: run BEFORE multer so non-members cannot push files to Cloudinary.
 */
const ensureRoomAccess = asyncHandler(async (req, res, next) => {
  const access = await getRoomAccess(req.user, req.params.roomId);
  assertReadable(access);
  next();
});

/**
 * GET /api/chat/:roomId?limit=50&before=<messageId>
 * Returns messages oldest -> newest. Use pagination.nextBefore to load older ones.
 */
const getRoomMessages = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const access = await getRoomAccess(req.user, roomId);
  assertReadable(access);

  const rawLimit =
    typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : NaN;
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  const filter = { room: roomId };
  if (req.query.before !== undefined) {
    if (typeof req.query.before !== "string" || !OID_RE.test(req.query.before)) {
      throw new ApiError(400, "Invalid 'before' cursor");
    }
    filter._id = { $lt: req.query.before };
  }

  const page = await Chat.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore = page.length > limit;
  if (hasMore) page.pop();
  page.reverse();

  res.status(200).json({
    status: "success",
    message: "Messages fetched successfully",
    data: page,
    pagination: {
      limit,
      hasMore,
      nextBefore: hasMore ? page[0]._id : null,
    },
  });
});

/**
 * GET /api/chat  - rooms for the logged-in user
 * (company general chat, management chat if allowed, project chats)
 */
const getMyChatRooms = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user.companyId) {
    return res.status(200).json({ status: "success", data: [] });
  }

  const rooms = [
    {
      roomId: companyRoomId(user.companyId),
      name: "General Company Chat",
      type: "company",
    },
  ];

  const mgmtId = managementRoomId(user.companyId);
  const mgmt = await getRoomAccess(user, mgmtId);
  if (mgmt.canRead) {
    rooms.push({ roomId: mgmtId, name: "Management Chat", type: "management" });
  }

  const memberships = await ProjectMember.find({
    userId: user._id,
    companyId: user.companyId,
  }).populate("projectId", "projectName");

  const projectRooms = memberships
    .filter((m) => m.projectId)
    .map((m) => ({
      roomId: m.projectId._id.toString(),
      name: m.projectId.projectName,
      type: "project",
    }));

  res.status(200).json({
    status: "success",
    data: [...rooms, ...projectRooms],
  });
});

/**
 * POST /api/chat/upload/:roomId  (multipart, field "file")
 * Stores the file on Cloudinary, saves a chat message and broadcasts "fileShared".
 */
const uploadChatFile = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const user = req.user;

  if (!req.file?.path) throw new ApiError(400, "File is required");

  const saved = await Chat.create({
    room: roomId,
    sender: user._id,
    senderName: user.fullname || user.username,
    fileUrl: req.file.path,
  });

  const payload = {
    _id: saved._id,
    room: saved.room,
    sender: saved.sender,
    senderName: saved.senderName,
    fileUrl: saved.fileUrl,
    createdAt: saved.createdAt,
  };

  getIO()?.to(roomId).emit("fileShared", payload);

  res.status(201).json({
    status: "success",
    message: "File shared successfully",
    data: payload,
  });
});

/**
 * DELETE /api/chat/message/:messageId
 */
const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  if (!mongoose.isValidObjectId(messageId)) {
    throw new ApiError(400, "Invalid messageId");
  }

  const message = await Chat.findById(messageId);
  if (!message) throw new ApiError(404, "Message not found");

  const roomId = message.room;
  const access = await getRoomAccess(req.user, roomId);

  if (access.type === "invalid") throw new ApiError(400, "Invalid room reference");
  if (access.notFound) throw new ApiError(404, "Room not found");
  if (!access.canDelete) throw new ApiError(403, DELETE_DENIED[access.type]);

  await Chat.findByIdAndDelete(messageId);

  getIO()?.to(roomId).emit("messageDeleted", { _id: message._id, room: roomId });

  res.status(200).json({
    status: "success",
    message: "Message deleted successfully",
  });
});

export {
  getRoomMessages,
  getMyChatRooms,
  deleteMessage,
  uploadChatFile,
  ensureRoomAccess,
};
