import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";

export const sanitizeUser = (user) => {
  if (!user) return null;
  const obj = user.toObject?.({ getters: true }) ?? { ...user };
  delete obj.password;
  delete obj.refreshToken;
  delete obj.__v;
  return obj;
};

const isProd = process.env.NODE_ENV === "production";

// cross-site (Vercel -> Render) cookies need SameSite=None + Secure in production
const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
};

const PASSWORD_RE = /^(?=.*[^A-Za-z0-9]).{8,}$/;
const PASSWORD_MSG = "Password must be at least 8 characters and contain at least 1 symbol";

const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;

const parseSkills = (skills) => {
  if (!skills) return [];
  const list = Array.isArray(skills) ? skills : String(skills).split(",");
  return [...new Set(list.map((s) => String(s).trim()).filter(Boolean))].slice(0, 30);
};

const generateAccessNRefreshTKN = async (user) => {
  const accessTKN = await user.generateAccessToken();
  const refreshTKN = await user.generateRefreshToken();
  return { accessTKN, refreshTKN };
};

const refreshAccessToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) throw new ApiError(401, "Refresh token missing");

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.REFRESHTKN_KEY);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const user = await User.findById(decoded._id);
  if (!user) throw new ApiError(401, "User not found");

  if (user.refreshToken !== refreshToken) {
    user.refreshToken = null;
    await user.save();
    throw new ApiError(401, "Refresh token reused or invalidated");
  }

  const { accessTKN, refreshTKN } = await generateAccessNRefreshTKN(user);
  user.refreshToken = refreshTKN;
  await user.save();

  res
    .status(200)
    .cookie("accessToken", accessTKN, cookieOptions)
    .cookie("refreshToken", refreshTKN, cookieOptions)
    .json({ status: "success" });
});

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body ?? {};

  if (![username, email, password].every(isNonEmptyString)) {
    throw new ApiError(400, "All fields are required");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw new ApiError(400, "Invalid email format");
  }
  if (!PASSWORD_RE.test(password)) throw new ApiError(400, PASSWORD_MSG);
  if (!/^[a-zA-Z0-9_]{3,16}$/.test(username.trim())) {
    throw new ApiError(400, "Username must be 3-16 chars, only letters, numbers, _");
  }

  const cleanEmail = email.trim();
  const cleanUsername = username.trim();

  const existedUser = await User.findOne({
    $or: [{ username: cleanUsername }, { email: cleanEmail }],
  });
  if (existedUser) {
    throw new ApiError(409, "user already exist with this username or email");
  }

  const user = await User.create({ username: cleanUsername, email: cleanEmail, password });

  const { accessTKN, refreshTKN } = await generateAccessNRefreshTKN(user);
  user.refreshToken = refreshTKN;
  await user.save();

  res
    .status(201)
    .cookie("accessToken", accessTKN, cookieOptions)
    .cookie("refreshToken", refreshTKN, cookieOptions)
    .json({
      status: "success",
      message: "user created successfully",
      data: sanitizeUser(user),
    });
});

const loginUser = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body ?? {};

  // typeof checks block NoSQL operator injection like { "$ne": "" }
  if (!isNonEmptyString(identifier)) throw new ApiError(400, "email or username is required");
  if (!isNonEmptyString(password)) throw new ApiError(400, "password is required");

  const id = identifier.trim();
  const user = await User.findOne({ $or: [{ email: id }, { username: id }] });

  // same response for unknown user and wrong password (no account enumeration)
  if (!user || !(await user.verifyPassword(password))) {
    throw new ApiError(401, "invalid credentials");
  }

  const { accessTKN, refreshTKN } = await generateAccessNRefreshTKN(user);
  user.refreshToken = refreshTKN;
  await user.save();

  res
    .status(200)
    .cookie("accessToken", accessTKN, cookieOptions)
    .cookie("refreshToken", refreshTKN, cookieOptions)
    .json({
      status: "success",
      message: "user logged in successfully",
      data: sanitizeUser(user),
    });
});

const logoutUser = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (refreshToken) {
    const user = await User.findOne({ refreshToken });
    if (user) {
      user.refreshToken = null;
      await user.save();
    }
  }

  res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json({ status: "success", message: "User logged out successfully" });
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) throw new ApiError(404, "user not found");
  res.status(200).json({
    status: "success",
    message: "user detailed fetched succesfully",
    data: sanitizeUser(user),
  });
});

const updatePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "user not found");

  const { currentPassword, newPassword } = req.body ?? {};
  if (!isNonEmptyString(currentPassword) || !isNonEmptyString(newPassword)) {
    throw new ApiError(400, "current and new password are required");
  }
  if (!PASSWORD_RE.test(newPassword)) throw new ApiError(400, PASSWORD_MSG);

  if (!(await user.verifyPassword(currentPassword))) {
    throw new ApiError(401, "your current password is incorrect");
  }

  user.password = newPassword;
  user.refreshToken = null;
  await user.save();

  res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json({ status: "success", message: "password updated successfully" });
});

const completeProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "user not found");
  if (user.isProfileComplete) throw new ApiError(400, "profile is already completed");

  const { fullname, phone, bio } = req.body ?? {};
  const skills = parseSkills(req.body?.skills);
  const profilePictureUrl = req.file?.path;

  if (
    !profilePictureUrl ||
    !isNonEmptyString(fullname) ||
    !isNonEmptyString(phone) ||
    !isNonEmptyString(bio) ||
    skills.length === 0
  ) {
    throw new ApiError(400, "all fields are required to complete your profile");
  }

  user.profilePictureUrl = profilePictureUrl;
  user.fullname = fullname.trim();
  user.phone = phone.trim();
  user.bio = bio.trim();
  user.skills = skills;
  user.isProfileComplete = true;
  await user.save();

  res.status(200).json({
    status: "success",
    message: "profile completed successfully",
    data: sanitizeUser(user),
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "user not found");

  const { fullname, phone, bio } = req.body ?? {};
  const skills = parseSkills(req.body?.skills);
  const profilePictureUrl = req.file?.path;

  if (profilePictureUrl) user.profilePictureUrl = profilePictureUrl;
  if (isNonEmptyString(fullname)) user.fullname = fullname.trim();
  if (isNonEmptyString(phone)) user.phone = phone.trim();
  if (isNonEmptyString(bio)) user.bio = bio.trim();
  if (skills.length > 0) user.skills = skills;
  await user.save();

  res.status(200).json({
    status: "success",
    message: "profile updated successfully",
    data: sanitizeUser(user),
  });
});

export {
  loginUser,
  registerUser,
  logoutUser,
  getCurrentUser,
  updatePassword,
  completeProfile,
  updateProfile,
  refreshAccessToken,
};