import mongoose, { isValidObjectId } from "mongoose";
import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js";
import { Project } from "../models/project.model.js";
import { ProjectMember } from "../models/projectMember.model.js";
import { Task } from "../models/task.model.js";


const assignTask = asyncHandler(async (req, res) => {
  const { taskName, description, empId, projectId, dueDate } = req.body;

  if (!taskName || !empId || !projectId) {
    throw new ApiError(400, "taskName, empId, and projectId are required");
  }

  if (
    !mongoose.isValidObjectId(projectId) ||
    !mongoose.isValidObjectId(empId)
  ) {
    throw new ApiError(400, "Invalid projectId or empId");
  }
  
  const projectExists = await Project.exists({ _id: projectId });
  if (!projectExists) throw new ApiError(404, "Project not found");

  const managerId = req.user._id;

  const person = await ProjectMember.findOne({
    projectId,
    userId: managerId,
    role: { $in: ["manager", "admin"] },
  });

  if (!person) {
    throw new ApiError(403, "You are not authorized to assign tasks in this project");
  }

  const employee = await ProjectMember.findOne({
    projectId,
    userId: empId,
    role: "employee",
  });
  if (!employee) {
    throw new ApiError(404, "Employee not found in this project");
  }

  const fileUrl = req.file ? req.file.path : undefined;


  const task = await Task.create({
    taskName: taskName.trim(),
    description: description?.trim() || "",
    assignedTo: empId,
    assignedBy: managerId,
    dueDate,
    projectId,
    status: "pending",
    fileUrl,
  });

  if (!task) {
    throw new ApiError(500, "Task creation failed, please try again");
  }

  res.status(201).json({
    status: "success",
    message: "Task assigned successfully",
    data: {
      taskId: task._id,
      taskName: task.taskName,
      assignedTo: task.assignedTo,
      dueDate: task.dueDate,
      status: task.status,
    },
  });
});

const editTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { taskName, description, dueDate, status, assignedTo } = req.body;
  const userId = req.user._id;

  if (!mongoose.isValidObjectId(taskId)) {
    throw new ApiError(400, "Invalid taskId");
  }

  if (assignedTo && !mongoose.isValidObjectId(assignedTo)) {
    throw new ApiError(400, "Invalid assignedTo id");
  }

  const task = await Task.findById(taskId);
  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  const projectMember = await ProjectMember.findOne({
    projectId: task.projectId,
    userId,
    role: { $in: ["manager", "admin"] },
  });

  if (!projectMember) {
    throw new ApiError(403, "You are not authorized to edit this task");
  }

  if (task.status === "completed" && dueDate) {
    throw new ApiError(400, "Cannot change due date for completed tasks");
  }

  if (task.status === "completed" && assignedTo) {
    throw new ApiError(400, "Cannot reassign a completed task");
  }

  if (taskName?.trim()) task.taskName = taskName.trim();
  if (description?.trim()) task.description = description.trim();
  if (dueDate) task.dueDate = dueDate;

  if (status) {
    const validStatuses = ["pending", "in-progress", "completed"];
    if (!validStatuses.includes(status)) {
      throw new ApiError(400, "Invalid status value");
    }
    task.status = status;
  }

  if (req.file) {
    task.fileUrl = req.file.path;
  }

  if (assignedTo && assignedTo !== String(task.assignedTo)) {
    const employee = await ProjectMember.findOne({
      projectId: task.projectId,
      userId: assignedTo,
      role: "employee",
    });

    if (!employee) {
      throw new ApiError(400, "New assignee must be a project member");
    }

    task.assignedTo = assignedTo;
  }

  await task.save();
  
  res.status(200).json({
    status: "success",
    message: "Task updated successfully",
    data: {
      taskId: task._id,
      taskName: task.taskName,
      description: task.description,
      dueDate: task.dueDate,
      status: task.status,
      assignedTo: task.assignedTo,
      updatedAt: task.updatedAt,
    },
  });
});


const deleteTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const managerId = req.user._id;

  if (!mongoose.isValidObjectId(taskId)) {
    throw new ApiError(400, "Invalid taskId");
  }

  const task = await Task.findById(taskId).populate("projectId");
  if (!task) {
    throw new ApiError(404, "Task not found");
  }
const member = await ProjectMember.findOne({
  projectId: task.projectId._id,
  userId: managerId,
  role: { $in: ["manager", "admin"] },
});
if (!member) throw new ApiError(403, "Not authorized to delete this task");


  await Task.findByIdAndDelete(taskId);

  res.status(200).json({
    status: "success",
    message: "Task deleted successfully",
  });
});

const myTasks = asyncHandler(async (req, res) => {
  const userId = req.user._id;  
  const projectId = req.params.projectId;

  if (!mongoose.isValidObjectId(projectId)) {
    throw new ApiError(400, "Invalid projectId");
  }
  const project = await Project.findById(projectId);   
  if (!project) {
    throw new ApiError(404, "Project not found");
  } 

  const projectMember = await ProjectMember.findOne({
    projectId: projectId,
    userId: userId,
    role: "employee",
  });
    if (!projectMember) {
        throw new ApiError(403, "You are not a member of this project");
    }

    const tasks = await Task.aggregate([  
    { $match: { assignedTo: mongoose.Types.ObjectId(userId), projectId: mongoose.Types.ObjectId(projectId) } },
    
    { $addFields: {
        statusOrder: {
            $switch: {
            branches: [
                { case: { $eq: ["$status", "overdue"] }, then: 0 },
                { case: { $eq: ["$status", "pending"] }, then: 1 },
                { case: { $eq: ["$status", "in-progress"] }, then: 2 },
                { case: { $eq: ["$status", "completed"] }, then: 3 },
            ],
            default: 4
            }
        }
        }
    },

    { $sort: { statusOrder: 1, dueDate: 1, _id: 1 } },
    { $project: { statusOrder: 0 } }
    ]);

    if (!tasks.length) {
    return res.status(200).json({
    status: "success",
    message: "No tasks assigned yet",
    data: { tasks: [] },
  });
}

    res.json({
    status: "success",
    message: "Tasks retrieved successfully",
    data: {
        tasks
    }
    })

})

const managerTasks = asyncHandler(async (req,res) => {
    const userId = req.user._id;  
    const projectId = req.params.projectId;

  if (!mongoose.isValidObjectId(projectId)) {
    throw new ApiError(400, "Invalid projectId");
  } 
  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }
  
  // Check if user is either Manager or Admin in this project
  const projectMember = await ProjectMember.findOne({
    projectId,
    userId,
    role: { $in: ["manager", "admin"] },
  });

  if (!projectMember) {
    throw new ApiError(403, "You are not authorized to view tasks in this project");
  }


  const tasks = await Task.find({ projectId })
    .populate("assignedTo", "fullname email username")
    .sort({ dueDate: 1 });

  if (!tasks.length) {
    return res.status(200).json({
      status: "success",
      message: "No tasks found for this project",
      data: [],
    });
  }

  const statusPriority = {
    "overdue": 0,
    "pending": 1,
    "in-progress": 2,
    "completed": 3,
  };

  // Sort tasks → employee name → status → due date
  tasks.sort((a, b) => {
    const nameA = a.assignedTo.fullname.toLowerCase();
    const nameB = b.assignedTo.fullname.toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;

    const statusA = statusPriority[a.status] ?? 99;
    const statusB = statusPriority[b.status] ?? 99;
    if (statusA !== statusB) return statusA - statusB;

    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  // Group tasks by employee
  const grouped = tasks.reduce((acc, task) => {
    const userId = task.assignedTo._id.toString();
    if (!acc[userId]) {
      acc[userId] = {
        employee: task.assignedTo,
        tasks: [],
      };
    }
    acc[userId].tasks.push({
      _id: task._id,
      taskName: task.taskName,
      description: task.description,
      status: task.status,
      dueDate: task.dueDate,
      fileUrl: task.fileUrl,
      submissionUrl: task.submissionUrl,
    });
    return acc;
  }, {});

  // Convert grouped object → array for frontend
  const result = Object.values(grouped);


  res.status(200).json({    
    status: "success",
    message: "Tasks retrieved successfully",
    data: { tasks: result  }  
  });
})


const respondToTask = asyncHandler(async (req, res) => {
  const user = req.user;
  const { taskId } = req.params;
  const { status } = req.body;

  if (!isValidObjectId(taskId)) {
    throw new ApiError(400, "Invalid taskId");
  }
  if (!["completed", "in-progress"].includes(status)) {
    throw new ApiError(400, "Invalid status. Allowed: completed or in-progress.");
  }

  const task = await Task.findById(taskId);
  if (!task) throw new ApiError(404, "Task not found");

  if (!task.assignedTo.equals(user._id)) {
    throw new ApiError(403, "You are not authorized to modify this task");
  }

  const projectMember = await ProjectMember.findOne({
    projectId: task.projectId,
    userId: user._id,
    role: "employee",
  });
  if (!projectMember) {
    throw new ApiError(403, "You are not assigned to this project");
  }

  if (req.file) {
    task.submissionUrl = req.file.path;
  }

  const prevStatus = task.status;

  if (prevStatus === "completed") {
    throw new ApiError(400, "This task is already marked as completed");
  }

  task.status = status;

  if (status === "completed") {
    task.completedAt = new Date();
  }

  await task.save();

  res.status(200).json({
    status: "success",
    message: `Task marked as ${status} successfully`,
    data: {
      taskId: task._id,
      taskName: task.taskName,
      status: task.status,
      submissionUrl: task.submissionUrl || null,
      completedAt: task.completedAt || null,
    },
  });
});

const getSingleTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  if (!isValidObjectId(taskId)) throw new ApiError(400, "Invalid taskId");

  const task = await Task.findById(taskId)
    .populate("assignedTo", "fullname email")
    .populate("assignedBy", "fullname email");

  if (!task) throw new ApiError(404, "Task not found");

  res.status(200).json({ status: "success", data: task });
});

export { assignTask, editTask , deleteTask ,myTasks,managerTasks ,respondToTask,getSingleTask};
