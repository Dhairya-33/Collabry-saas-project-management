import express from "express";
import verifyJWT from "../middlewares/jwt.middleware.js";
import { multerMiddleware } from "../middlewares/multer.middleware.js";
import {
  getRoomMessages,
  deleteMessage,
  getMyChatRooms,
  uploadChatFile,
  ensureRoomAccess,
} from "../controllers/chat.controller.js";

const router = express.Router();

// rooms for the logged-in user (company, management, projects)
router.get("/", verifyJWT, getMyChatRooms);

// upload a file into a room (access is checked BEFORE the Cloudinary upload)
router.post(
  "/upload/:roomId",
  verifyJWT,
  ensureRoomAccess,
  multerMiddleware.single("file"),
  uploadChatFile
);

// delete a message
router.delete("/message/:messageId", verifyJWT, deleteMessage);

// message history: ?limit=50&before=<messageId>
router.get("/:roomId", verifyJWT, getRoomMessages);

export default router;
