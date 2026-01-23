import {asyncHandler} from "../utils/asyncHandler.js";
import { Chat } from "../models/chat.model.js";
import { ProjectMember } from "../models/projectMember.model.js";
import mongoose from "mongoose";
import { Project } from "../models/project.model.js";
import { ApiError } from "../utils/apiError.js";

/**
 * Get all messages for a room (company or project chat)
 */
 const getRoomMessages = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { roomId } = req.params;

  if (!roomId) throw new ApiError(400, "Room ID is required");

  const isMongoId = mongoose.isValidObjectId(roomId);

  let isAllowed = false;

  /**
   * AUTH RULES:
   * ----------------------------------------------------
   * 1. If roomId is a COMPANY ID → allow if user's companyId matches
   * 2. If roomId is a PROJECT ID → allow only if user is member of that project
   */
  
  // Case 1: roomId is company-level room
  if (!isMongoId) {
    // Example company rooms: "company_12345"
    const companyRoomPrefix = `company_${req.user.companyId}`;

    if (roomId === companyRoomPrefix) {
      isAllowed = true;
    }
  } 
  else {
    // Case 2: Project-level room
    const membership = await ProjectMember.findOne({
      projectId: roomId,
      userId,
    });

    if (membership) isAllowed = true;
  }

  if (!isAllowed) {
    throw new ApiError(403, "You are not allowed to access this room");
  }

  // Fetch messages
  const messages = await Chat.find({ room: roomId }).sort({ createdAt: 1 });

  return res.status(200).json({
    status: "success",
    message: "Messages fetched successfully",
    data: messages,
  });
});

//  GET CHAT ROOMS FOR LOGGED-IN USER
//  (Company General Chat + All Project Rooms)
 const getMyChatRooms = asyncHandler(async (req, res) => {
  const user = req.user;

  // 1️⃣ Get all project rooms this user belongs to
  const memberships = await ProjectMember.find({ userId: user._id }).populate(
    "projectId",
    "projectName"
  );

  const projectRooms = memberships.map((m) => ({
    roomId: m.projectId._id,
    name: m.projectId.projectName,
    type: "project",
  }));

  // 2️⃣ Add general company chat
  const generalRoom = {
    roomId: user.companyId,
    name: "General Company Chat",
    type: "company",
  };

  // 3️⃣ Return all rooms
  res.status(200).json({
    status: "success",
    data: [generalRoom, ...projectRooms],
  });
});


const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  if (!mongoose.isValidObjectId(messageId)) {
    throw new ApiError(400, "Invalid messageId");
  }

  const message = await Chat.findById(messageId);

  if (!message) throw new ApiError(404, "Message not found");

  const project = await Project.findById(message.room);
  if (project) {
    // Room is a project room → check manager/admin role
    const member = await ProjectMember.findOne({
      projectId: project._id,
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
    // Room = Company General Chat
    if (req.user.role !== "admin") {
      throw new ApiError(
        403,
        "Only admin can delete messages in company general chat"
      );
    }
  }

  await Chat.findByIdAndDelete(messageId);

  res.status(200).json({
    status: "success",
    message: "Message deleted successfully",
  });
});


export { getRoomMessages, getMyChatRooms,deleteMessage };