import jwt from "jsonwebtoken";
const { verify } = jwt;
import { asyncHandler } from "../utils/asyncHandler.js";
import { configDotenv } from "dotenv";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
configDotenv({
      path:'./.env'
})

const verifyJWT = asyncHandler(async (req,res,next) => {
    try {
        const accessTKN = req.cookies?.accessToken 
        if(!accessTKN){
            throw new ApiError(401,"you are not logged in")
        }
        
        const decodedTKN = jwt.verify(accessTKN,process.env.ACCESSTKN_KEY)
    
        const user = await User.findById(decodedTKN?._id).select("-password -refreshToken")
    
        if(!user){
            throw new ApiError(401,"the user belonging to this token no longer exist")
        }
        
        req.user = user;
    
        next();
    }catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
})


export default verifyJWT;