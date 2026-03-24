import { Profile } from "../models/profile.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

// Get or create profile
const getProfile = asyncHandler(async(req, res) => {
    let profile = await Profile.findOne({ user: req.user._id })
        .populate('user', 'username email fullname role isProfileComplete isFirstLogin')
    
    if(!profile){
        // Create profile if doesn't exist
        profile = await Profile.create({ user: req.user._id })
        profile = await Profile.findById(profile._id)
            .populate('user', 'username email fullname role isProfileComplete isFirstLogin')
    }

    // Combine user and profile data for frontend
    const profileData = {
        ...profile.toObject(),
        username: profile.user.username,
        email: profile.user.email,
        fullname: profile.user.fullname,
        role: profile.user.role,
        isProfileComplete: profile.user.isProfileComplete,
        isFirstLogin: profile.user.isFirstLogin
    }
    delete profileData.user // Remove populated user object

    return res.status(200).json(
        new ApiResponse(200, profileData, "Profile fetched successfully")
    )
})

// Update basic profile info
const updateProfile = asyncHandler(async(req, res) => {
    const {
        fullname, // This updates User model
        bio,
        location,
        industry,
        yearsOfExperience,
        hourlyRate,
        availability,
        careerGoal
    } = req.body

    // Update User model if fullname provided
    if(fullname){
        await User.findByIdAndUpdate(
            req.user._id,
            { $set: { fullname } },
            { new: true }
        )
    }

    // Build update object for Profile
    const updateFields = {}
    if(bio !== undefined) updateFields.bio = bio
    if(location !== undefined) updateFields.location = location
    if(industry !== undefined) updateFields.industry = industry
    if(yearsOfExperience !== undefined) updateFields.yearsOfExperience = yearsOfExperience
    
    // Role-specific fields - check current user role
    const user = await User.findById(req.user._id)
    if(user.role === "mentor"){
        if(hourlyRate !== undefined) updateFields.hourlyRate = hourlyRate
        if(availability !== undefined) updateFields.availability = availability
    } else {
        if(careerGoal !== undefined) updateFields.careerGoal = careerGoal
    }

    const profile = await Profile.findOneAndUpdate(
        { user: req.user._id },
        { $set: updateFields },
        { new: true, upsert: true }
    ).populate('user', 'username email fullname role isProfileComplete isFirstLogin')

    // Combine data
    const profileData = {
        ...profile.toObject(),
        username: profile.user.username,
        email: profile.user.email,
        fullname: profile.user.fullname,
        role: profile.user.role,
        isProfileComplete: profile.user.isProfileComplete,
        isFirstLogin: profile.user.isFirstLogin
    }
    delete profileData.user

    return res.status(200).json(
        new ApiResponse(200, profileData, "Profile updated successfully")
    )
})

// Update skills
const updateSkills = asyncHandler(async(req, res) => {
    const { skills } = req.body
    
    if(!Array.isArray(skills)){
        throw new ApiError(400, "Skills must be an array")
    }

    const profile = await Profile.findOneAndUpdate(
        { user: req.user._id },
        { $set: { skills: skills } },
        { new: true, upsert: true }
    ).populate('user', 'username email fullname role isProfileComplete isFirstLogin')

    const profileData = {
        ...profile.toObject(),
        username: profile.user.username,
        email: profile.user.email,
        fullname: profile.user.fullname,
        role: profile.user.role,
        isProfileComplete: profile.user.isProfileComplete,
        isFirstLogin: profile.user.isFirstLogin
    }
    delete profileData.user

    return res.status(200).json(
        new ApiResponse(200, profileData, "Skills updated successfully")
    )
})

// Add experience
const addExperience = asyncHandler(async(req, res) => {
    const { title, company, period } = req.body
    
    if(!title || !company){
        throw new ApiError(400, "Title and company are required")
    }

    const profile = await Profile.findOneAndUpdate(
        { user: req.user._id },
        {
            $push: {
                experience: { title, company, period }
            }
        },
        { new: true, upsert: true }
    ).populate('user', 'username email fullname role isProfileComplete isFirstLogin')

    const profileData = {
        ...profile.toObject(),
        username: profile.user.username,
        email: profile.user.email,
        fullname: profile.user.fullname,
        role: profile.user.role,
        isProfileComplete: profile.user.isProfileComplete,
        isFirstLogin: profile.user.isFirstLogin
    }
    delete profileData.user

    return res.status(200).json(
        new ApiResponse(200, profileData, "Experience added successfully")
    )
})

// Remove experience
const removeExperience = asyncHandler(async(req, res) => {
    const { experienceId } = req.params
    
    const profile = await Profile.findOneAndUpdate(
        { user: req.user._id },
        {
            $pull: {
                experience: { _id: experienceId }
            }
        },
        { new: true }
    ).populate('user', 'username email fullname role isProfileComplete isFirstLogin')

    if(!profile){
        throw new ApiError(404, "Profile not found")
    }

    const profileData = {
        ...profile.toObject(),
        username: profile.user.username,
        email: profile.user.email,
        fullname: profile.user.fullname,
        role: profile.user.role,
        isProfileComplete: profile.user.isProfileComplete,
        isFirstLogin: profile.user.isFirstLogin
    }
    delete profileData.user

    return res.status(200).json(
        new ApiResponse(200, profileData, "Experience removed successfully")
    )
})

// Add education
const addEducation = asyncHandler(async(req, res) => {
    const { degree, institution, period } = req.body
    
    if(!degree || !institution){
        throw new ApiError(400, "Degree and institution are required")
    }

    const profile = await Profile.findOneAndUpdate(
        { user: req.user._id },
        {
            $push: {
                education: { degree, institution, period }
            }
        },
        { new: true, upsert: true }
    ).populate('user', 'username email fullname role isProfileComplete isFirstLogin')

    const profileData = {
        ...profile.toObject(),
        username: profile.user.username,
        email: profile.user.email,
        fullname: profile.user.fullname,
        role: profile.user.role,
        isProfileComplete: profile.user.isProfileComplete,
        isFirstLogin: profile.user.isFirstLogin
    }
    delete profileData.user

    return res.status(200).json(
        new ApiResponse(200, profileData, "Education added successfully")
    )
})

// Remove education
const removeEducation = asyncHandler(async(req, res) => {
    const { educationId } = req.params
    
    const profile = await Profile.findOneAndUpdate(
        { user: req.user._id },
        {
            $pull: {
                education: { _id: educationId }
            }
        },
        { new: true }
    ).populate('user', 'username email fullname role isProfileComplete isFirstLogin')

    if(!profile){
        throw new ApiError(404, "Profile not found")
    }

    const profileData = {
        ...profile.toObject(),
        username: profile.user.username,
        email: profile.user.email,
        fullname: profile.user.fullname,
        role: profile.user.role,
        isProfileComplete: profile.user.isProfileComplete,
        isFirstLogin: profile.user.isFirstLogin
    }
    delete profileData.user

    return res.status(200).json(
        new ApiResponse(200, profileData, "Education removed successfully")
    )
})

// Update avatar
const updateAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path
    
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    // TODO: Upload to Cloudinary or your storage service
    const avatar = avatarLocalPath // Replace with actual URL after upload

    const profile = await Profile.findOneAndUpdate(
        { user: req.user._id },
        { $set: { avatar: avatar } },
        { new: true, upsert: true }
    ).populate('user', 'username email fullname role isProfileComplete isFirstLogin')

    const profileData = {
        ...profile.toObject(),
        username: profile.user.username,
        email: profile.user.email,
        fullname: profile.user.fullname,
        role: profile.user.role,
        isProfileComplete: profile.user.isProfileComplete,
        isFirstLogin: profile.user.isFirstLogin
    }
    delete profileData.user

    return res.status(200).json(
        new ApiResponse(200, profileData, "Avatar updated successfully")
    )
})

// Mark profile as complete
const completeProfile = asyncHandler(async(req, res) => {
    const profile = await Profile.findOne({ user: req.user._id })
    
    if(!profile){
        throw new ApiError(404, "Profile not found")
    }

    // Check required fields
    const missingFields = profile.checkRequiredFields()
    if(missingFields.length > 0){
        throw new ApiError(400, `Please complete required fields: ${missingFields.join(', ')}`)
    }

    // Update both User and Profile
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                isProfileComplete: true,
                isFirstLogin: false
            }
        }
    )

    const updatedProfile = await Profile.findOne({ user: req.user._id })
        .populate('user', 'username email fullname role isProfileComplete isFirstLogin')

    const profileData = {
        ...updatedProfile.toObject(),
        username: updatedProfile.user.username,
        email: updatedProfile.user.email,
        fullname: updatedProfile.user.fullname,
        role: updatedProfile.user.role,
        isProfileComplete: updatedProfile.user.isProfileComplete,
        isFirstLogin: updatedProfile.user.isFirstLogin
    }
    delete profileData.user

    return res.status(200).json(
        new ApiResponse(200, profileData, "Profile completed successfully")
    )
})

// Check profile status
const checkProfileStatus = asyncHandler(async(req, res) => {
    const user = await User.findById(req.user._id).select("isProfileComplete isFirstLogin role")
    const profile = await Profile.findOne({ user: req.user._id })
    
    const completionPercentage = profile ? profile.getCompletionPercentage() : 0
    
    return res.status(200).json(
        new ApiResponse(200, {
            isProfileComplete: user.isProfileComplete,
            isFirstLogin: user.isFirstLogin,
            role: user.role,
            completionPercentage
        }, "Profile status fetched")
    )
})

// Update stats (connections, sessions, goals)
const updateStats = asyncHandler(async(req, res) => {
    const { connections, sessions, goals } = req.body
    
    const updateFields = {}
    if(connections !== undefined) updateFields['stats.connections'] = connections
    if(sessions !== undefined) updateFields['stats.sessions'] = sessions
    if(goals !== undefined) updateFields['stats.goals'] = goals

    const profile = await Profile.findOneAndUpdate(
        { user: req.user._id },
        { $set: updateFields },
        { new: true, upsert: true }
    ).populate('user', 'username email fullname role isProfileComplete isFirstLogin')

    const profileData = {
        ...profile.toObject(),
        username: profile.user.username,
        email: profile.user.email,
        fullname: profile.user.fullname,
        role: profile.user.role,
        isProfileComplete: profile.user.isProfileComplete,
        isFirstLogin: profile.user.isFirstLogin
    }
    delete profileData.user

    return res.status(200).json(
        new ApiResponse(200, profileData, "Stats updated successfully")
    )
})

// Get public profile (for viewing other users)
const getPublicProfile = asyncHandler(async(req, res) => {
    const { userId } = req.params
    
    const profile = await Profile.findOne({ user: userId })
        .populate('user', 'username fullname role isProfileComplete')
        .select('-stats') // Hide sensitive stats
    
    if(!profile){
        throw new ApiError(404, "Profile not found")
    }

    // Only show complete profiles publicly
    if(!profile.user.isProfileComplete){
        throw new ApiError(403, "Profile not available")
    }

    const profileData = {
        ...profile.toObject(),
        username: profile.user.username,
        fullname: profile.user.fullname,
        role: profile.user.role
    }
    delete profileData.user

    return res.status(200).json(
        new ApiResponse(200, profileData, "Public profile fetched")
    )
})

export {
    getProfile,
    updateProfile,
    updateSkills,
    addExperience,
    removeExperience,
    addEducation,
    removeEducation,
    updateAvatar,
    completeProfile,
    checkProfileStatus,
    updateStats,
    getPublicProfile
}