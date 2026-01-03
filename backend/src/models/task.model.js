import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  taskName: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String,
    default: ""
  },

  fileUrl: { // reference doc by manager
    type: String
  },

  submissionUrl: { // Employee's submitted file
    type: String
  },

  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed','overdue'],
    default: 'pending'
  },

  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  dueDate: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  }
}, {
  timestamps: true
});

export const Task = mongoose.model("Task", taskSchema);
