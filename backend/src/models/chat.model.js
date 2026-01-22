import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    room: {
      type: String,
      required: true, 
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      trim: true,
    },
    fileUrl: {
      type: String,
    },
  },
  { timestamps: true }
);

export const Chat = mongoose.model("Chat", chatSchema);
