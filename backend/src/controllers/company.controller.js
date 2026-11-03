import jwt from "jsonwebtoken";
import { Company } from "../models/company.model.js";
import { User } from "../models/user.model.js";
import { ProjectMember } from "../models/projectMember.model.js";
import { ProjectInvite } from "../models/projectInvite.model.js";
import { Project } from "../models/project.model.js";
import { Task } from "../models/task.model.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import dotenv from "dotenv";

dotenv.config();

const createCompany = asyncHandler(async (req, res) => {
  const { companyName, description } = req.body;

  if (!companyName?.trim()) {
    throw new ApiError(400, "Company name is required");
  }

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
  const { token } = req.body;
  if (!token) throw new ApiError(400, "Invite token is required");

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.LINK_SECRET);
  } catch {
    throw new ApiError(400, "Invalid or expired invite token");
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
  user.role = "employee";
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
  const { userId } = req.body;

  if (!userId) {
    throw new ApiError(400, "userId is required");
  }

  // 1ï¸âƒ£ Validate company + owner
  const company = await Company.findById(owner.companyId);
  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  if (company.createdBy.toString() !== owner._id.toString()) {
    throw new ApiError(403, "Only company owner can remove members");
  }

  // 2ï¸âƒ£ Validate target user
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!user.companyId || user.companyId.toString() !== company._id.toString()) {
    throw new ApiError(400, "User does not belong to this company");
  }

  // 3ï¸âƒ£ Prevent removing company owner
  if (user._id.toString() === company.createdBy.toString()) {
    throw new ApiError(400, "Company owner cannot be removed");
  }

  // 4ï¸âƒ£ BLOCK if user manages any ACTIVE project
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

  // 5ï¸âƒ£ Remove from ALL project memberships (active + archived)
  await ProjectMember.deleteMany({
    companyId: company._id,
    userId: user._id,
  });

  // 6ï¸âƒ£ Remove all pending project invites
  await ProjectInvite.deleteMany({
    companyId: company._id,
    inviteeId: user._id,
  });

  // 7ï¸âƒ£ Detach user from company
  user.companyId = null;
  await user.save();

  res.status(200).json({
    status: "success",
    message: "User removed from company successfully",
  });
});


const reassignProjectManager = asyncHandler(async (req, res) => {
  const { projectId, newManagerUserId } = req.body;
  const actingUser = req.user;

  if (
    !mongoose.isValidObjectId(projectId) ||
    !mongoose.isValidObjectId(newManagerUserId)
  ) {
    throw new ApiError(400, "Invalid projectId or newManagerUserId");
  }

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

      // 1ï¸âƒ£ Demote current manager explicitly
      const demotion = await ProjectMember.updateOne(
        {
          projectId,
          userId: project.managerId,
          role: "manager",
        },
        { $set: { role: "employee" } },
        { session }
      );

      if (demotion.matchedCount === 0) {
        throw new ApiError(
          409,
          "Project is in invalid state: manager membership missing"
        );
      }

      // 2ï¸âƒ£ Promote new manager (or create membership)
      await ProjectMember.findOneAndUpdate(
        { projectId, userId: newManagerUserId },
        {
          $set: {
            role: "manager",
            companyId: company._id,
          },
        },
        { upsert: true, session, new: true }
      );

      // 3ï¸âƒ£ Sync project reference
      project.managerId = newManagerUserId;
      await project.save({ session });
    });

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
    "_id fullName username email phoneNo bio skills profilePictureUrl createdAt"
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

  const managingProjectIds = await ProjectMember.find({
    userId: user._id,
    companyId: company._id,
    role: "manager",
  }).distinct("projectId");

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
          projectId: { $in: employeeProjectIds }, // âœ… safety layer
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
