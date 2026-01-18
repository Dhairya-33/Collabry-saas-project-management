import jwt from "jsonwebtoken";
import { Company } from "../models/company.model.js";
import { User } from "../models/user.model.js";
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



export { createCompany, joinCompany, generateCompanyInvite };
