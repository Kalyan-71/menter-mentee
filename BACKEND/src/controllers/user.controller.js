import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User  } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import  jwt  from "jsonwebtoken";

import mongoose from "mongoose"


const registerUser = asyncHandler( async (req,res)=>{

        
        const {fullname , email , username ,role, password} = req.body;
        if(
            [fullname , email , username,role,password].some((field)=> field?.trim() === "")
        ){
            
            console.error("ERROR : All fields are required");
            return res.status(400).json(new ApiResponse(400 , null , "All fields are required"));
        }

        const existedUser = await User.findOne({
            $or: [{username} , { email }]
        })
        

        if(existedUser){
            console.error("ERROR : User with email or username already exists")
            return res.status(409)
                      .json(new ApiResponse(409,null ,"User with email or username already exists"))
        }

        

        const user = await User.create({
            fullname,
            email,
            password,
            role:role,
            username:username.toLowerCase()
        })



        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken"
        )

        if(!createdUser){
            console.error("ERROR : Something went wrong while registering the users");

            return res.status(500)
                .json(new ApiResponse(500,null ,"Something went wrong while registering the users"))
        }

        return res.status(201).json(
            new ApiResponse(200 , createdUser ,"User registered Successfully")
        )

    }
)

const loginUser = asyncHandler(async (req, res)=>{
    ///req.body -> data
    //username or email
    //find the user
    //password check
    //acess and refresh token 
    //send cookie

    const {email, password} = req.body
    
    if(!email){
        console.error("ERROR : Email is required")
        return res.status(400).json(new ApiResponse(400 ,null, "Email is required"));
    }

    const user = await User.findOne({email})

    

    if(!user){
        console.error("ERROR : User does not exists")
        return res.status(404).json(new ApiResponse(404,null,"User does not exists"))
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        console.log("ERROR: Invalid user credentials")
        return res.status(401).json(new ApiResponse(401 , null , "Invalid user credentials"))
    }
    
     const newUser = await User.findById(user._id);
    const JWTToken = await newUser.generateAccessToken();
    const loggedInUser = await User.findById(user.id).select("-password")
    
    const options = {
        httpOnly: true,
        // secure: true,
        // sameSite: "none"  /////production if needed 
        secure: process.env.SECURE,

    }

    return res
    .status(200)
    .cookie("JWTToken" , JWTToken , options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser ,
                JWTToken,
            },
            "User logged In Successfully"
        )
    )
})



const logoutUser = asyncHandler(async (req , res)=>{
    const options = {
        httpOnly:true,
        // secure:true,
        // sameSite: "none"
        secure: process.env.SECURE,
    }

    return res
    .status(200)
    .clearCookie("JWTToken" , options)
    .json(new ApiResponse(200 , {} , "User logged Out"))
})









const refreshAccessToken = asyncHandler(async (req , res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken

    if(!incomingRefreshToken){//if empty
        throw new ApiError(401,"unauthorized request")
    }
   
    try {

            const decodedToken = jwt.verify(
                incomingRefreshToken,
                process.env.REFRESH_TOKEN_SECRET
            )

            const user = await User.findById(decodedToken?._id)
            
            if(!user){
                throw new ApiError(401,"refresh Token is expired or used")
            }
        
            const options = {
                httpOnly:true,
                secure:true
            }
        
            const {accessToken , refreshToken} = await generateAccessTokenAndRefreshTokens(user.id)
            
            
            return res
            .status(200)
            .cookie("accessToken",accessToken,options)
            .cookie("refreshToken",refreshToken,options)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        refreshToken:refreshToken
                    },
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401,"Invalid refresh token")
    }

})

const changeCurrentPassword = asyncHandler(async (req,res)=>{
    const {oldPassword , newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect =  await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400 , "Invalid old passsword")
    }

    user.password = newPassword

    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(new ApiResponse(200 , {} , "Password changed successfully"))
})

const getCurrentUser = asyncHandler( async(req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse( 200 , req.user , "current user fetched succesfully" ))
})

const updateAccountDetails = asyncHandler(async (req,res)=>{
    const {fullname , email} = req.body

    if(!fullname || !email){
        throw new ApiError(400 , "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullname,
                email:email,
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200 , user , "Account details updated successfully"))
})
/*
const updateUserAvatar = asyncHandler(async (req,res)=>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400 , "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400 , "Error while uploading on avatar")
    }

   const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {
            new:true
        }
    ).select("-password ")


     return res
    .status(200)
    .json(
        new ApiResponse(200 , user , "Avatar image updated sucessfully")
    )
})
*/

/*
const updateUserCoverImage = asyncHandler(async (req,res)=>{

    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover Image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400 , "Error while uploading on coverImage")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },{new:true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200 , user , "Cover image updates sucessfully")
    )
})

*/



export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    // updateUserAvatar,
    // updateUserCoverImage,
}