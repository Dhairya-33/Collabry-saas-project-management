import express from "express";
import dotenv from "dotenv";
import connectDB from "./connect.js";
import userRoutes from "./src/routes/user.routes.js";
import cookieParser from "cookie-parser";
import taskRoutes from "./src/routes/task.routes.js";
import companyRoutes from "./src/routes/company.routes.js";
import projectRoutes from "./src/routes/project.routes.js";


dotenv.config();

const app = express();
app.use(express.json());
app.use(cookieParser());


(async () => (
    await connectDB()   
))()

app.use("/api/auth", userRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/projects", projectRoutes);


app.get("/", (req, res) => {
  res.send("API is running...");
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
