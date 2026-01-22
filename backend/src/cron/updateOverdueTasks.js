import cron from "node-cron";
import { Task } from "../models/task.model.js";

export const updateOverdueTasks = () => {
  cron.schedule("0 0 * * *", async () => {
    try {
      console.log("🕛 Running daily overdue task check...");

      const now = new Date();

      const result = await Task.updateMany(
        {
          dueDate: { $lt: now },
          status: { $nin: ["completed", "overdue"] },
        },
        { $set: { status: "overdue" } }
      );

      console.log(`✅ ${result.modifiedCount} tasks marked as overdue`);
    } catch (error) {
      console.error("❌ Cron job error:", error);
    }
  });
};
