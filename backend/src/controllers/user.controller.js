import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";     

export const sanitizeUser = (user) => {
  if (!user) return null;

  const obj = user.toObject?.({ getters: true }) ?? { ...user };

  delete obj.password;
  delete obj.refreshToken;
  delete obj.__v;

  return obj;
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
};


const generateAccessNRefreshTKN = async (user) => {
  const accessTKN = await user.generateAccessToken();
  const refreshTKN = await user.generateRefreshToken();
  return { accessTKN, refreshTKN };
}

const refreshAccessToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    throw new ApiError(401, "Refresh token missing");
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.REFRESHTKN_KEY);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const user = await User.findById(decoded._id);

  if (!user || user.refreshToken !== refreshToken) {
    throw new ApiError(401, "Refresh token not recognized");
  }

  const newAccessToken = await user.generateAccessToken();

  res
    .status(200)
    .cookie("accessToken", newAccessToken, cookieOptions)
    .json({
      status: "success",
    });
});

const registerUser = asyncHandler(async (req,res) => {
    
    const {username,email,password} = req.body;
    if (
         [ email, username, password].some((field) => field?.trim() === "")
      ) {
         throw new ApiError(400, "All fields are required");
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new ApiError(400, "Invalid email format");

      if (!/^(?=.*[^A-Za-z0-9]).{8,}$/.test(password)) {
        throw new ApiError(400, "Password must be at least 8 characters and contain at least 1 symbol");
      }

      if (!/^[a-zA-Z0-9_]{3,16}$/.test(username))
        throw new ApiError(400, "Username must be 3–16 chars, only letters, numbers, _");


      const existedUser= await User.findOne(
        {$or:[{username},{email}]}
      )

      if(existedUser){
        throw new ApiError(409, "user already exist with this username or email");
      }

      const user = await User.create({username,email,password});
      if(!user){
        throw new ApiError(500, "failed to create user");
      }
      
        res.status(201).json({
        status:"success",
        message:"user created successfully",
        data:sanitizeUser(user),
      })
})

const loginUser =  asyncHandler ( async (req,res) => {
        
    const {identifier,password} = req.body
    if(!identifier){
        throw new ApiError(400,"email or username is required")
    }
      if(!password){
    throw new ApiError(400,"password is required")
    }

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    });
    if(!user){
        throw new ApiError(404,"user not found")
    }
    
    const isMatch = await user.verifyPassword(password);

    if ( !isMatch) {
      throw new ApiError(401, "invalid credentials");
    }
   
    const {accessTKN,refreshTKN} = await generateAccessNRefreshTKN(user);
    user.refreshToken = refreshTKN;
    await user.save();  

    res.status(200)
    .cookie("accessToken",accessTKN,cookieOptions)
    .cookie("refreshToken",refreshTKN,cookieOptions)
    .json({
        status:"success",
        message:"user logged in successfully",
        data:sanitizeUser(user),
    })
})
const logoutUser = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    return res.status(200).json({
      status: "success",
      message: "User already logged out",
    });
  }

  const user = await User.findOne({ refreshToken });

  if (!user) {
    res.clearCookie("accessToken").clearCookie("refreshToken");
    return res.status(200).json({
      status: "success",
      message: "Session already invalidated",
    });
  }

  user.refreshToken = null;
  await user.save();
  res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json({
      status: "success",
      message: "User logged out successfully",
    });
});


const getCurrentUser = asyncHandler(async (req,res) => {
  const user = req.user;
  if(!user){
    throw new ApiError(404,"user not found")
  } 
    res.status(200).json({
      status:"success",
      message:"user detailed fetched succesfully",
      data:sanitizeUser(user),
  })
})

const updatePassword = asyncHandler(async (req, res) => {
  
  const user = req.user;
  if(!user){
    throw new ApiError(404,"user not found")
  } 
  const { currentPassword, newPassword } = req.body;

  if(!currentPassword || !newPassword){
    throw new ApiError(400,"current and new password are required");
  }
  
  const ispasswordcorrect= await user.verifyPassword(currentPassword);

  if(!ispasswordcorrect){
    throw new ApiError(401,"your current password is incorrect");
  }
  
  user.password = newPassword;
  user.refreshToken = null;
  await user.save();

 res
  .clearCookie("accessToken", cookieOptions)
  .clearCookie("refreshToken", cookieOptions)
  .status(200)
  .json({
    status: "success",
    message: "password updated successfully",
  });
  
})

export {registerUser,loginUser,logoutUser,getCurrentUser,updatePassword,refreshAccessToken};