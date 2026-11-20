import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";
import { chatUploadFolder } from "../utils/cloudinaryOwnership.js";

dotenv.config();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_FILE_SIZE = 5 * 1024 * 1024;

// tasks, submissions, profile pictures
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "project_task",
    resource_type: "auto",
  },
});

export const multerMiddleware = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
});

// chat files: folder is built from req.user (verifyJWT must run first)
const chatStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req) => ({
    folder: chatUploadFolder(req.user),
    resource_type: "auto",
  }),
});

export const chatUpload = multer({
  storage: chatStorage,
  limits: { fileSize: MAX_FILE_SIZE },
});
