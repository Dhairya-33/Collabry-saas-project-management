import express from "express";
import  verifyJWT  from "../middlewares/jwt.middleware.js";
import {
  getRoomMessages,
  deleteMessage,
  getMyChatRooms
} from "../controllers/chat.controller.js";

const router = express.Router();

// Get all messages of room
router.get("/:roomId", verifyJWT, getRoomMessages);

// Delete a specific message
router.delete("/message/:messageId", verifyJWT, deleteMessage);

// Get all chat rooms for logged-in user (project rooms + company room)
router.get("/", verifyJWT, getMyChatRooms);

export default router;
