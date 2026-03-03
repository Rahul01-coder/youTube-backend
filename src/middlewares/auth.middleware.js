import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler (async (req,_,next)=>{// agar (req, res) me se kuch use nahi ho rha to uski jagah "_" likh sakte hai
    try {
        const token = req.cookies?.accessToken || req.header("authorization")?.replace("Bearer ","")
    
        if(!token){
            throw new ApiError(401, "unauthorized request")
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken._id).select("-password -refreshToken")
    
        if(!user){
            throw new ApiError(401, "Invalid access token !!")
        }
    
        req.user = user
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
})