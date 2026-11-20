import mongoose, { Schema } from "mongoose";

const projectMember = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },

    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    role: {
      type: String,
      enum: ["admin", "manager", "employee"],
      default: "employee",
    },
  },
  {
    timestamps: true,
  }
);

/* ================= CRITICAL INDEX ================= */

// ✅ Prevent duplicate membership in same project
projectMember.index(
  { userId: 1, projectId: 1 },
  { unique: true }
);

/* ================= QUERY OPTIMIZATION ================= */

projectMember.index({ userId: 1, companyId: 1, role: 1 });
projectMember.index({ projectId: 1, role: 1 });

export const ProjectMember = mongoose.model("ProjectMember", projectMember);