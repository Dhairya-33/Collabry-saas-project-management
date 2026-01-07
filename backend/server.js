import express from "express";
import dotenv from "dotenv";
import connectDB from "./connect.js";
import userRoutes from "./src/routes/user.routes.js";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cookieParser());


(async () => (
    await connectDB()   
))()

app.use("/api/auth", userRoutes);

app.get("/", (req, res) => {
  res.send("API is running...");
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
