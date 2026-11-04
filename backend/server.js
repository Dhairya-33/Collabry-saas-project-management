import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { initSocket } from "./src/socket/socket.js";
import userRoutes from "./src/routes/user.route.js";
import companyRoutes from "./src/routes/company.route.js";
import projectRoutes from "./src/routes/project.route.js";
import taskRoutes from "./src/routes/task.route.js";
import chatRoutes from "./src/routes/chat.route.js";
import connectDB from "./connect.js";
import errorHandler from "./src/middlewares/errorhandler.middleware.js";
import { updateOverdueTasks } from "./src/cron/updateOverdueTasks.js";

dotenv.config();

const required = [
  "MONGODB_URI",
  "ACCESSTKN_KEY",
  "ACCESSTKN_EXPIRESIN",
  "REFRESHTKN_KEY",
  "REFRESHTKN_EXPIRESIN",
  "LINK_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "FRONTEND_URL",
];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const app = express();
app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

app.get("/", (req, res) => res.send("API is running..."));
app.get("/health", (req, res) =>
  res.status(200).json({ status: "ok", db: mongoose.connection.readyState === 1 })
);

app.use("/api/auth", userRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/project", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/chat", chatRoutes);

app.use((req, res) =>
  res.status(404).json({ success: false, message: "Route not found", errors: [] })
);
app.use(errorHandler);

const server = http.createServer(app);
const io = initSocket(server);

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  updateOverdueTasks();
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};
start();

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down`);
  io.close(async () => {
    await mongoose.connection.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));