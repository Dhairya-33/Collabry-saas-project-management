import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";     


const generateAccessNRefreshTKN = async (_id) => {
  const user = await User.findById(_id);
  const accessTKN = await user.generateAccessTKN();
  const refreshTKN = await user.generateRefreshTKN();
  return { accessTKN, refreshTKN };
}
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
        data:user
      })
})

const loginUser =  asyncHandler ( async (req,res) => {
        
    const {email,username,password} = req.body
    if(!email && !username){
        throw new ApiError(400,"email or username is required")
    }
      if(!password){
    throw new ApiError(400,"password is required")
    }

    const user = await User.findOne(
        {$or:[{username},{email}]}
    )
    if(!user){
        throw new ApiError(404,"user not found")
    }
    
    const isMatch = await bcrypt.compare(password, user.password);

    if ( !isMatch) {
      throw new ApiError(401, "invalid credentials");
    }
   
    const {accessTKN,refreshTKN} = await generateAccessNRefreshTKN(user._id);
    user.refreshToken = refreshTKN;
    await user.save();  

    res.status(200)
    .cookie("accessToken",accessTKN,{httpOnly:true,secure:true})
    .cookie("refreshToken",refreshTKN,{httpOnly:true,secure:true})
    .json({
        status:"success",
        message:"user logged in successfully",
        data:user,
        accessToken:accessTKN
    })
})
const logoutUser = asyncHandler(async (req,res) => {
    const user = await User.findById(req.user._id); 
    if(!user){
        throw new ApiError(404,"user not found")
    } 
    user.refreshToken = null;
    await user.save();
    res.status(200)
    .clearCookie("accessToken")
    .clearCookie("refreshToken")    
    .json({
        status:"success",
        message:"user logged out successfully",
    })
})

const getCurrentUser = asyncHandler(async (req,res) => {
  const user = req.user;
  if(!user){
    throw new ApiError(404,"user not found")
  } 
    res.status(200).json({
      status:"success",
      message:"user detailed fetched succesfully",
      data:user,
  })
})



export {registerUser,loginUser,logoutUser,getCurrentUser};