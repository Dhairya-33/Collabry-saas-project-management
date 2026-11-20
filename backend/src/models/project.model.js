import mongoose, { Schema } from "mongoose";

const projectSchema = new Schema(
  {
    projectName: {
      type: String,
      required: true,
      trim: true,
    },

    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    managerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    description: {
      type: String,
      default: "",
    },

    archived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/* ================= INDEXES ================= */

// Fast queries
projectSchema.index({ companyId: 1, archived: 1 });

// Prevent duplicate project names in same company
projectSchema.index(
  { companyId: 1, projectName: 1 },
  { unique: true }
);

export const Project = mongoose.model("Project", projectSchema);