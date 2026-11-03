import { asyncHandler } from "../utils/asyncHandler.js";
import { Chat } from "../models/chat.model.js";
import { ProjectMember } from "../models/projectMember.model.js";
import mongoose from "mongoose";
import { Project } from "../models/project.model.js";
import { ApiError } from "../utils/apiError.js";
import { Company } from "../models/company.model.js";

/**
 * Get all messages for a room (company or project chat)
 */
const getRoomMessages = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { roomId } = req.params;

  if (!roomId) throw new ApiError(400, "Room ID is required");

  let isAllowed = false;

  // ---------- COMPANY ROOM ----------
  if (roomId.startsWith("company_")) {
    const companyId = roomId.split("company_")[1];

    if (!mongoose.isValidObjectId(companyId)) {
      throw new ApiError(400, "Invalid company room");
    }

    if (req.user.companyId?.toString() === companyId) {
      isAllowed = true;
    }
  }

  // ---------- PROJECT ROOM ----------
  else if (mongoose.isValidObjectId(roomId)) {
    const project = await Project.findById(roomId);
    if (!project) throw new ApiError(404, "Project not found");

    const membership = await ProjectMember.findOne({
      projectId: roomId,
      userId,
    });

    if (membership) isAllowed = true;
  }

  if (!isAllowed) {
    throw new ApiError(403, "You are not allowed to access this room");
  }

  const messages = await Chat.find({ room: roomId }).sort({ createdAt: 1 });

  res.status(200).json({
    status: "success",
    message: "Messages fetched successfully",
    data: messages,
  });
});

/**
 * Get all chat rooms for logged-in user
 * (Company general chat + project chats)
 */
const getMyChatRooms = asyncHandler(async (req, res) => {
  const user = req.user;

  // Project rooms
  const memberships = await ProjectMember.find({ userId: user._id }).populate(
    "projectId",
    "projectName"
  );

  const projectRooms = memberships.filter((m) => m.projectId).map((m) => ({
    roomId: m.projectId._id.toString(),
    name: m.projectId.projectName,
    type: "project",
  }));

  // Company general chat
  const companyRoom = {
    roomId: `company_${user.companyId}`,
    name: "General Company Chat",
    type: "company",
  };

  res.status(200).json({
    status: "success",
    data: [companyRoom, ...projectRooms],
  });
});

/**
 * Delete a message (role based)
 */
const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  if (!mongoose.isValidObjectId(messageId)) {
    throw new ApiError(400, "Invalid messageId");
  }

  const message = await Chat.findById(messageId);
  if (!message) throw new ApiError(404, "Message not found");

  const roomId = message.room;

  // ---------- COMPANY ROOM ----------
  if (roomId.startsWith("company_")) {
    const company = await Company.findById(req.user.companyId);
    if (
      !company ||
      roomId !== `company_${company._id}` ||
      company.createdBy.toString() !== userId.toString()
    ) {
      throw new ApiError(
        403,
        "Only admin can delete messages in company general chat"
      );
    }
  }

  // ---------- PROJECT ROOM ----------
  else if (mongoose.isValidObjectId(roomId)) {
    const project = await Project.findById(roomId);
    if (!project) throw new ApiError(404, "Project not found");

    const member = await ProjectMember.findOne({
      projectId: roomId,
      userId,
      role: { $in: ["manager", "admin"] },
    });

    if (!member) {
      throw new ApiError(
        403,
        "Only project manager/admin can delete messages in this room"
      );
    }
  } else {
    throw new ApiError(400, "Invalid room reference");
  }

  await Chat.findByIdAndDelete(messageId);

  res.status(200).json({
    status: "success",
    message: "Message deleted successfully",
  });
});

export { getRoomMessages, getMyChatRooms, deleteMessage };
