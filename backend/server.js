import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import  {initSocket} from "./src/socket/socket.js"; 
import userRoutes from "./src/routes/user.route.js";
import companyRoutes from "./src/routes/company.route.js";
import projectRoutes from "./src/routes/project.route.js";
import taskRoutes from "./src/routes/task.route.js";
import chatRoutes from "./src/routes/chat.route.js";
import connectDB from "./connect.js";
import errorHandler from "./src/middlewares/errorhandler.middleware.js";


dotenv.config();

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.FRONTEND_URL, 
    credentials: true, 
  })
);

app.use("/api/auth", userRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/project", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/chat", chatRoutes);


const fun = async () => (
    await connectDB()   
)
fun();


const server = http.createServer(app);

initSocket(server); 


app.get("/", (req, res) => {
  res.send("API is running...");
});

app.use(errorHandler)

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
});
