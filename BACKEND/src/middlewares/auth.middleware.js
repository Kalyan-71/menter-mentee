import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken"
import { ApiResponse } from "../utils/ApiResponse.js";


export const verifyJWT = asyncHandler(async (req,res,next)=>{  /// async (req , _ , next)
    try {
        const token = req.cookies?.JWTToken || req.header("Authorization")?.replace("Bearer ","")
            // console.log("ALL cookies:", req.cookies.JWTToken);
        if(!token){
            console.error("ERROR: Unauthorized request");
            return res.status(401).json(new ApiResponse(401 , {} , "Unauthorized request"));
        }

        const decodedToken = jwt.verify(token , process.env.ACCESS_TOKEN_SECRET)
        
            const user = await User.findById(decodedToken._id)
            .select("-password")
        
            if(!user){
                console.error("ERROR: Invalid Acess Token");
                return res.status(401).json(new ApiResponse(401 , null , "Invalid Acess Token"));
            }
        
            req.user = user;
            next()
    } catch (error) {
        console.error("ERROR: Invalid Acess Token");
        return res.status(401).json(new ApiResponse(401 , null ,error?.message || "Invalid acess token"));
    }
})