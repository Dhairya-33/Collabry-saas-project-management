import express from "express";
import dotenv from "dotenv";
import connectDB from "./connect.js";

dotenv.config();

const app = express();

(async () => (
    await connectDB()   
))()


app.get("/", (req, res) => {
  res.send("API is running...");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
