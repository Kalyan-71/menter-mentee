import { User } from "../models/user.model.js";
import { Profile } from "../models/profile.model.js";
import { Connection } from "../models/connection.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Search mentors/mentees with filters
const searchMatches = asyncHandler(async(req, res) => {
    const { 
        query, 
        industry, 
        experience, 
        availability,
        role // 'mentor' or 'mentee' - what we're searching for
    } = req.query;

    const userRole = req.user.role;
    const searchRole = role || (userRole === "mentee" ? "mentor" : "mentee");

    // Build match criteria
    const matchCriteria = { role: searchRole };

    // Text search on user fields
    if (query) {
        const users = await User.find({
            $or: [
                { fullname: { $regex: query, $options: "i" } },
                { username: { $regex: query, $options: "i" } }
            ]
        }).select("_id");
        
        matchCriteria.user = { $in: users.map(u => u._id) };
    }

    // Profile filters
    const profileFilter = {};
    
    if (industry) {
        profileFilter.industry = { $regex: industry, $options: "i" };
    }
    
    if (experience) {
        profileFilter.yearsOfExperience = experience;
    }

    if (availability) {
        profileFilter.availability = { $regex: availability, $options: "i" };
    }

    // Find profiles matching criteria
    let profiles = await Profile.find(profileFilter)
        .populate("user", "fullname username email role createdAt")
        .select("-__v");

    // Filter by text query if not already filtered
    if (query && !matchCriteria.user) {
        profiles = profiles.filter(p => 
            p.user.fullname?.toLowerCase().includes(query.toLowerCase()) ||
            p.bio?.toLowerCase().includes(query.toLowerCase()) ||
            p.skills?.some(s => s.toLowerCase().includes(query.toLowerCase()))
        );
    }

    // Get existing connections to exclude
    const existingConnections = await Connection.find({
        $or: [
            { mentor: req.user._id },
            { mentee: req.user._id }
        ]
    }).select("mentor mentee");

    const connectedUserIds = existingConnections.map(c => 
        c.mentor.toString() === req.user._id.toString() ? c.mentee.toString() : c.mentor.toString()
    );

    // Format results with match score
    const results = profiles
        .filter(p => p.user._id.toString() !== req.user._id.toString())
        .filter(p => !connectedUserIds.includes(p.user._id.toString()))
        .map(async(profile) => {
            // Calculate match score (0-100)
            let score = 70; // Base score
            
            const userProfile = await Profile.findOne({ user: req.user._id });
            
            // Boost score for matching skills
            if (userProfile?.skills && profile.skills) {
                const commonSkills = userProfile.skills.filter(s => 
                    profile.skills.some(ps => ps.toLowerCase() === s.toLowerCase())
                );
                score += commonSkills.length * 5;
            }
            
            // Boost for same industry
            if (userProfile?.industry && profile.industry === userProfile.industry) {
                score += 10;
            }
            
            // Cap at 100
            score = Math.min(score, 100);

            return {
                _id: profile.user._id,
                fullname: profile.user.fullname,
                username: profile.user.username,
                avatar: profile.avatar,
                bio: profile.bio,
                industry: profile.industry,
                yearsOfExperience: profile.yearsOfExperience,
                skills: profile.skills?.slice(0, 5) || [],
                hourlyRate: profile.hourlyRate,
                availability: profile.availability,
                careerGoal: profile.careerGoal,
                matchScore: score,
                isRecommended: score >= 90
            };
        });

    // Sort by match score
    results.sort((a, b) => b.matchScore - a.matchScore);

    return res.status(200).json(
        new ApiResponse(200, results, "Search results fetched")
    );
});

// Get recommended matches
const getRecommendedMatches = asyncHandler(async(req, res) => {
    const userRole = req.user.role;
    const searchRole = userRole === "mentee" ? "mentor" : "mentee";

    const userProfile = await Profile.findOne({ user: req.user._id });

    if (!userProfile) {
        throw new ApiError(404, "Profile not found");
    }

    // Find profiles with matching criteria
    const matchFilter = {
        role: searchRole,
        $or: [
            { industry: userProfile.industry },
            { skills: { $in: userProfile.skills || [] } }
        ]
    };

    const profiles = await Profile.find(matchFilter)
        .populate("user", "fullname username email")
        .limit(10);

    // Get existing connections
    const existingConnections = await Connection.find({
        $or: [
            { mentor: req.user._id },
            { mentee: req.user._id }
        ]
    });

    const connectedIds = existingConnections.map(c => 
        c.mentor.toString() === req.user._id.toString() ? c.mentee.toString() : c.mentor.toString()
    );

    const recommendations = profiles
        .filter(p => !connectedIds.includes(p.user._id.toString()))
        .map(profile => ({
            _id: profile.user._id,
            fullname: profile.user.fullname,
            avatar: profile.avatar,
            bio: profile.bio,
            industry: profile.industry,
            skills: profile.skills?.slice(0, 3) || [],
            matchScore: 95,
            isRecommended: true
        }));

    return res.status(200).json(
        new ApiResponse(200, recommendations, "Recommendations fetched")
    );
});

export {
    searchMatches,
    getRecommendedMatches
};