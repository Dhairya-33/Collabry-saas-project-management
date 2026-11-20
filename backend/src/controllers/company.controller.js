import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Company } from "../models/company.model.js";
import { User } from "../models/user.model.js";
import { ProjectMember } from "../models/projectMember.model.js";
import { revalidateUserRooms } from "../socket/socket.js";
import { ProjectInvite } from "../models/projectInvite.model.js";
import { Project } from "../models/project.model.js";
import { Task } from "../models/task.model.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import dotenv from "dotenv";

dotenv.config();

const createCompany = asyncHandler(async (req, res) => {
  const { companyName, description } = req.body ?? {};

  if (!companyName?.trim()) {
    throw new ApiError(400, "Company name is required");
  }

  if (req.user.companyId) throw new ApiError(400, "You already belong to a company");
  const existingCompany = await Company.findOne({ companyName });
  if (existingCompany) {
    throw new ApiError(400, "Company name already taken");
  }

  const company = await Company.create({
    companyName,
    description,
    createdBy: req.user._id,
  });

  const user = await User.findById(req.user._id);
  user.companyId = company._id;
  await user.save();

  res.status(201).json({
    status: "success",
    message: "Company created successfully",
    data: company,
  });
});


const joinCompany = asyncHandler(async (req, res) => {
  const { token } = req.body ?? {};
  if (!token) throw new ApiError(400, "Invite token is required");

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.LINK_SECRET);
  } catch {
    throw new ApiError(400, "Invalid or expired invite token");
  }

  if (decoded?.type !== "company_invite") {
    throw new ApiError(400, "Invalid invite token");
  }

  const company = await Company.findById(decoded.companyId);
  if (!company) throw new ApiError(404, "Company not found");

  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  if (user.companyId?.toString() === decoded.companyId) {
    return res.status(200).json({
      status: "success",
      message: "User already part of this company",
      data: { companyId: decoded.companyId }
    });
  }

  if (user.companyId) {
    throw new ApiError(400, "User already belongs to another company");
  }

  user.companyId = decoded.companyId;
  await user.save();

  res.status(200).json({
    status: "success",
    message: `Joined ${company.companyName} successfully`,
    data: { companyId: company._id },
  });
});


const generateCompanyInvite = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user) {
    throw new ApiError(401, "Authentication required");
  }

  if (!user.companyId) {
    throw new ApiError(400, "User does not belong to any company");
  }

  const company = await Company.findById(user.companyId);
  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  if (company.createdBy.toString() !== user._id.toString()) {
    throw new ApiError(403, "Only company owner can generate invite links");
  }

  const inviteToken = jwt.sign(
    {
      companyId: company._id.toString(),
      type: "company_invite",
    },
    process.env.LINK_SECRET,
    { expiresIn: "24h" }
  );

  res.status(200).json({
    status: "success",
    inviteToken,
    expiresIn: "24h",
  });
});


const removeCompanyMember = asyncHandler(async (req, res) => {
  const owner = req.user;
  const { userId } = req.body ?? {};

  if (!userId) {
    throw new ApiError(400, "userId is required");
  }

  // 1) Validate company + owner
  const company = await Company.findById(owner.companyId);
  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  if (company.createdBy.toString() !== owner._id.toString()) {
    throw new ApiError(403, "Only company owner can remove members");
  }

  // 2) Validate target user
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!user.companyId || user.companyId.toString() !== company._id.toString()) {
    throw new ApiError(400, "User does not belong to this company");
  }

  // 3) Prevent removing company owner
  if (user._id.toString() === company.createdBy.toString()) {
    throw new ApiError(400, "Company owner cannot be removed");
  }

  // 4) BLOCK if user manages any ACTIVE project
  const memberships = await ProjectMember.find({
    companyId: company._id,
    userId: user._id,
    role: { $in: ["admin", "manager"] },
  }).populate("projectId", "archived");

  const activeProjects = memberships.filter(
    (m) => m.projectId && m.projectId.archived === false
  );

  if (activeProjects.length > 0) {
    throw new ApiError(
      400,
      "User is manager/admin of active projects. Reassign before removal.",
      {
        projects: activeProjects.map((m) => m.projectId._id),
      }
    );
  }

  // 5) Remove from ALL project memberships (active + archived)
  await ProjectMember.deleteMany({
    companyId: company._id,
    userId: user._id,
  });

  // 6) Remove all pending project invites
  await ProjectInvite.deleteMany({
    companyId: company._id,
    inviteeId: user._id,
  });

  // 7) Detach user from company
  user.companyId = null;
  await user.save();

  void revalidateUserRooms(user._id).catch(() => {});

  res.status(200).json({
    status: "success",
    message: "User removed from company successfully",
  });
});


const reassignProjectManager = asyncHandler(async (req, res) => {
  const { projectId, newManagerUserId } = req.body ?? {};
  const actingUser = req.user;

  if (
    !mongoose.isValidObjectId(projectId) ||
    !mongoose.isValidObjectId(newManagerUserId)
  ) {
    throw new ApiError(400, "Invalid projectId or newManagerUserId");
  }

  let previousManagerId;
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      /* ========= Company ========= */
      const company = await Company.findById(actingUser.companyId).session(session);
      if (!company) throw new ApiError(404, "Company not found");

      if (company.createdBy.toString() !== actingUser._id.toString()) {
        throw new ApiError(403, "Only company owner can reassign project manager");
      }

      /* ========= Project ========= */
      const project = await Project.findById(projectId).session(session);
      if (!project) throw new ApiError(404, "Project not found");

      if (project.companyId.toString() !== company._id.toString()) {
        throw new ApiError(403, "Project does not belong to this company");
      }

      if (project.archived) {
        throw new ApiError(400, "Cannot reassign manager of archived project");
      }

      if (project.managerId?.toString() === newManagerUserId) {
        throw new ApiError(400, "User is already the project manager");
      }

      /* ========= New Manager ========= */
      const newManager = await User.findById(newManagerUserId).session(session);
      if (!newManager) throw new ApiError(404, "User not found");

      if (newManager.companyId?.toString() !== company._id.toString()) {
        throw new ApiError(400, "User does not belong to this company");
      }

      /* ========= Current Manager ========= */
      if (!project.managerId) {
        throw new ApiError(
          409,
          "Project is in invalid state: missing manager reference"
        );
      }

      /* ========= REASSIGN ========= */

      // 1) Demote current manager explicitly
      const oldMembership = await ProjectMember.findOne({
        projectId,
        userId: project.managerId,
      }).session(session);

      if (!oldMembership) {
        throw new ApiError(
          409,
          "Project is in invalid state: manager membership missing"
        );
      }

      // owner-as-manager only has an "admin" row: leave it untouched
      if (oldMembership.role === "manager") {
        await ProjectMember.updateOne(
          { _id: oldMembership._id },
          { $set: { role: "employee" } },
          { session }
        );
      }

      // promote the new manager, but never overwrite an "admin" row
      const newMembership = await ProjectMember.findOne({
        projectId,
        userId: newManagerUserId,
      }).session(session);

      if (!newMembership) {
        await ProjectMember.create(
          [{ projectId, userId: newManagerUserId, companyId: company._id, role: "manager" }],
          { session }
        );
      } else if (newMembership.role === "employee") {
        newMembership.role = "manager";
        await newMembership.save({ session });
      }

      // 3) Sync project reference
      previousManagerId = project.managerId;
      project.managerId = newManagerUserId;
      await project.save({ session });
    });

    for (const id of [previousManagerId, newManagerUserId]) {
      if (id) void revalidateUserRooms(id).catch(() => {});
    }

    res.status(200).json({
      success: true,
      message: "Project manager reassigned successfully",
      data: {
        projectId,
        managerUserId: newManagerUserId,
      },
    });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, "Failed to reassign project manager", err.message);
  } finally {
    session.endSession();
  }
});


const getCompanyMembers = asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user.companyId) {
    throw new ApiError(400, "User is not part of any company");
  }

  const company = await Company.findById(user.companyId);
  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  const members = await User.find(
    { companyId: company._id },
    "_id fullname username email phone bio skills profilePictureUrl createdAt"
  ).sort({ username: 1 }); 

  res.status(200).json({
    success: true,
    data: {
      totalMembers: members.length,
      members,
    },
  });
});


const getOverview = asyncHandler(async (req, res) => {
  const user = req.user;

  /* ================= COMPANY CHECK ================= */

  if (!user.companyId) {
    throw new ApiError(400, "User is not part of any company");
  }

  const company = await Company.findById(user.companyId);
  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  const isAdmin = company.createdBy.toString() === user._id.toString();

  /* ================= MANAGER PROJECTS ================= */

  const managingProjectIds = await Project.distinct("_id", {
    companyId: company._id,
    managerId: user._id,
  });

  const isManager = managingProjectIds.length > 0;

  /* ================= EMPLOYEE PROJECTS ================= */

  const employeeProjectIds = await ProjectMember.find({
    userId: user._id,
    companyId: company._id,
    role: "employee",
  }).distinct("projectId");

  const isEmployee = employeeProjectIds.length > 0;

  /* ================= ADMIN ================= */

  let admin = null;

  if (isAdmin) {
    const [
      totalProjects,
      activeProjects,
      archivedProjects,
      totalMembers,
      taskStats,
    ] = await Promise.all([
      Project.countDocuments({ companyId: company._id }),
      Project.countDocuments({ companyId: company._id, archived: false }),
      Project.countDocuments({ companyId: company._id, archived: true }),
      User.countDocuments({ companyId: company._id }),

      Task.aggregate([
        {
          $match: { companyId: company._id },
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const taskMap = Object.fromEntries(
      taskStats.map((t) => [t._id, t.count])
    );

    admin = {
      projects: {
        total: totalProjects,
        active: activeProjects,
        archived: archivedProjects,
      },
      members: {
        total: totalMembers,
      },
      tasks: {
        total:
          (taskMap.pending || 0) +
          (taskMap["in-progress"] || 0) +
          (taskMap.completed || 0) +
          (taskMap.overdue || 0),
        pending: taskMap.pending || 0,
        inProgress: taskMap["in-progress"] || 0,
        completed: taskMap.completed || 0,
        overdue: taskMap.overdue || 0,
      },
    };
  }

  /* ================= MANAGER ================= */

  let manager = null;

  if (isManager) {
    const [activeManagingProjectsCount, managerTaskStats] =
      await Promise.all([
        Project.countDocuments({
          _id: { $in: managingProjectIds },
          archived: false,
        }),

        Task.aggregate([
          {
            $match: {
              companyId: company._id,
              projectId: { $in: managingProjectIds },
            },
          },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

    const map = Object.fromEntries(
      managerTaskStats.map((t) => [t._id, t.count])
    );

    manager = {
      projects: {
        managingCount: activeManagingProjectsCount,
      },
      tasks: {
        pending: map.pending || 0,
        inProgress: map["in-progress"] || 0,
        overdue: map.overdue || 0,
      },
    };
  }

  /* ================= EMPLOYEE ================= */

  let employee = null;

  if (isEmployee) {
    const employeeTaskStats = await Task.aggregate([
      {
        $match: {
          companyId: company._id,
          assignedTo: user._id,
          projectId: { $in: employeeProjectIds }, // safety layer
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const map = Object.fromEntries(
      employeeTaskStats.map((t) => [t._id, t.count])
    );

    employee = {
      projects: {
        contributingCount: employeeProjectIds.length,
      },
      tasks: {
        pending: map.pending || 0,
        inProgress: map["in-progress"] || 0,
        completed: map.completed || 0,
        overdue: map.overdue || 0,
      },
    };
  }

  /* ================= RESPONSE ================= */

  res.status(200).json({
    success: true,
    data: {
      roles: {
        isAdmin,
        isManager,
        isEmployee,
      },
      admin,
      manager,
      employee,
    },
  });
});



export { createCompany, joinCompany, generateCompanyInvite,removeCompanyMember, reassignProjectManager , getCompanyMembers ,getOverview};
