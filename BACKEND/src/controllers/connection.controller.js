import { Connection } from "../models/connection.model.js";
import { User } from "../models/user.model.js";
import { Profile } from "../models/profile.model.js";
import { GoalsTracker } from "../models/goals-tracker.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Send connection request (Mentee only)
const sendConnectionRequest = asyncHandler(async(req, res) => {
    const { mentorId, message } = req.body;
    const menteeId = req.user._id;

    // Verify mentor exists and is actually a mentor
    const mentor = await User.findOne({ _id: mentorId, role: "mentor" });
    if (!mentor) {
        throw new ApiError(404, "Mentor not found");
    }

    // Check if request already exists
    const existingConnection = await Connection.findOne({
        mentee: menteeId,
        mentor: mentorId
    });

    if (existingConnection) {
        throw new ApiError(400, "Connection request already exists");
    }

    const connection = await Connection.create({
        mentee: menteeId,
        mentor: mentorId,
        message: message || "",
        status: "pending"
    });

    const populatedConnection = await Connection.findById(connection._id)
        .populate("mentee", "username fullname email")
        .populate("mentor", "username fullname email");

    return res.status(201).json(
        new ApiResponse(201, populatedConnection, "Connection request sent successfully")
    );
});

// Get all mentors for search (with at least 1 skill)
const getAllMentors = asyncHandler(async(req, res) => {
    // Find all mentor profiles with at least 1 skill
    const mentorProfiles = await Profile.find({
        skills: { $exists: true, $not: { $size: 0 } }
    }).populate("user", "username fullname email role isProfileComplete");

    // Filter only mentors and format data
    const mentors = mentorProfiles
        .filter(profile => profile.user.role === "mentor" && profile.user.isProfileComplete)
        .map(profile => ({
            _id: profile.user._id,
            username: profile.user.username,
            fullname: profile.user.fullname,
            avatar: profile.avatar,
            bio: profile.bio,
            location: profile.location,
            industry: profile.industry,
            yearsOfExperience: profile.yearsOfExperience,
            hourlyRate: profile.hourlyRate,
            availability: profile.availability,
            skills: profile.skills,
            stats: profile.stats
        }));

    // Check existing connections for this mentee
    const menteeId = req.user._id;
    const existingConnections = await Connection.find({
        mentee: menteeId,
        status: { $in: ["pending", "active"] }
    }).select("mentor status");

    const connectedMentorIds = existingConnections.map(c => c.mentor.toString());

    // Add connection status to each mentor
    const mentorsWithStatus = mentors.map(mentor => ({
        ...mentor,
        connectionStatus: connectedMentorIds.includes(mentor._id.toString()) 
            ? existingConnections.find(c => c.mentor.toString() === mentor._id.toString()).status
            : null
    }));

    return res.status(200).json(
        new ApiResponse(200, mentorsWithStatus, "Mentors fetched successfully")
    );
});

// Get mentor's all mentees (with goals progress)
const getMyMentees = asyncHandler(async(req, res) => {
    const mentorId = req.user._id;

    const connections = await Connection.find({ mentor: mentorId })
        .populate("mentee", "username fullname email")
        .populate({
            path: "goals",
            select: "title category description milestones targetDate"
        })
        .sort({ createdAt: -1 });

    const menteesData = await Promise.all(connections.map(async(conn) => {
        // Get mentee profile
        const profile = await Profile.findOne({ user: conn.mentee._id })
            .select("avatar bio location industry skills");

        // Calculate progress from goals
        let totalMilestones = 0;
        let completedMilestones = 0;
        
        conn.goals.forEach(goal => {
            if (goal.milestones) {
                totalMilestones += goal.milestones.length;
                completedMilestones += goal.milestones.filter(m => m.isCompleted).length;
            }
        });

        const progressPercentage = totalMilestones > 0 
            ? Math.round((completedMilestones / totalMilestones) * 100) 
            : 0;

        // Calculate sessions (mock for now)
        const sessionsCount = conn.goals.length * 3;

        return {
            connectionId: conn._id,
            mentee: {
                _id: conn.mentee._id,
                fullname: conn.mentee.fullname,
                username: conn.mentee.username,
                email: conn.mentee.email,
                avatar: profile?.avatar || "",
                bio: profile?.bio || "",
                location: profile?.location || "",
                industry: profile?.industry || "",
                skills: profile?.skills || []
            },
            status: conn.status,
            message: conn.message,
            startedAt: conn.startedAt,
            progress: {
                percentage: progressPercentage,
                totalGoals: conn.goals.length,
                completedGoals: conn.goals.filter(g => 
                    g.milestones.every(m => m.isCompleted)
                ).length,
                totalMilestones,
                completedMilestones
            },
            sessionsCount,
            goals: conn.goals,
            requestedAt: conn.createdAt
        };
    }));

    // Separate pending and active
    const pending = menteesData.filter(m => m.status === "pending");
    const active = menteesData.filter(m => m.status === "active");

    return res.status(200).json(
        new ApiResponse(200, { pending, active, total: menteesData.length }, "Mentees fetched successfully")
    );
});

// Accept connection request (Mentor only)
const acceptConnection = asyncHandler(async(req, res) => {
    const { connectionId } = req.params;
    const mentorId = req.user._id;

    const connection = await Connection.findOne({
        _id: connectionId,
        mentor: mentorId,
        status: "pending"
    });

    if (!connection) {
        throw new ApiError(404, "Connection request not found");
    }

    connection.status = "active";
    connection.startedAt = new Date();
    await connection.save();

    const populatedConnection = await Connection.findById(connection._id)
        .populate("mentee", "username fullname email")
        .populate("mentor", "username fullname email");

    return res.status(200).json(
        new ApiResponse(200, populatedConnection, "Connection accepted successfully")
    );
});

// Reject/Decline connection request (Mentor only)
const rejectConnection = asyncHandler(async(req, res) => {
    const { connectionId } = req.params;
    const mentorId = req.user._id;

    const connection = await Connection.findOne({
        _id: connectionId,
        mentor: mentorId,
        status: "pending"
    });

    if (!connection) {
        throw new ApiError(404, "Connection request not found");
    }

    connection.status = "rejected";
    await connection.save();

    return res.status(200).json(
        new ApiResponse(200, {}, "Connection request declined")
    );
});

// Get mentee's active mentors (for mentee dashboard)
const getMyMentors = asyncHandler(async(req, res) => {
    const menteeId = req.user._id;

    const connections = await Connection.find({
        mentee: menteeId,
        status: { $in: ["pending", "active"] }
    }).populate("mentor", "username fullname email")
      .populate("goals");

    const mentorsData = await Promise.all(connections.map(async(conn) => {
        const profile = await Profile.findOne({ user: conn.mentor._id })
            .select("avatar bio location industry skills hourlyRate availability");

        return {
            connectionId: conn._id,
            mentor: {
                _id: conn.mentor._id,
                fullname: conn.mentor.fullname,
                username: conn.mentor.username,
                avatar: profile?.avatar || "",
                bio: profile?.bio || "",
                location: profile?.location || "",
                industry: profile?.industry || "",
                skills: profile?.skills || [],
                hourlyRate: profile?.hourlyRate || "",
                availability: profile?.availability || ""
            },
            status: conn.status,
            goals: conn.goals,
            startedAt: conn.startedAt
        };
    }));

    return res.status(200).json(
        new ApiResponse(200, mentorsData, "My mentors fetched successfully")
    );
});

// Get public mentor profile (for viewing before/after connection)
const getPublicMentorProfile = asyncHandler(async(req, res) => {
    const { mentorId } = req.params;
    const menteeId = req.user._id;

    // Get mentor basic info
    const mentor = await User.findOne({ 
        _id: mentorId, 
        role: "mentor",
        isProfileComplete: true 
    }).select("username fullname email");

    if (!mentor) {
        throw new ApiError(404, "Mentor not found");
    }

    // Get mentor profile
    const profile = await Profile.findOne({ user: mentorId })
        .select("avatar bio location industry yearsOfExperience hourlyRate availability skills experience education stats");

    if (!profile) {
        throw new ApiError(404, "Profile not found");
    }

    // Check connection status between this mentee and mentor
    const connection = await Connection.findOne({
        mentee: menteeId,
        mentor: mentorId
    }).select("status goals startedAt");

    // Get active goals if connected
    let sharedGoals = [];
    if (connection && connection.status === "active") {
        sharedGoals = await GoalsTracker.find({
            _id: { $in: connection.goals }
        }).select("title category description milestones targetDate");
    }

    // Calculate average rating from stats (mock for now)
    const rating = 4.8; // Can be calculated from reviews later

    const publicProfile = {
        _id: mentor._id,
        fullname: mentor.fullname,
        username: mentor.username,
        avatar: profile.avatar,
        bio: profile.bio,
        location: profile.location,
        industry: profile.industry,
        yearsOfExperience: profile.yearsOfExperience,
        hourlyRate: profile.hourlyRate,
        availability: profile.availability,
        skills: profile.skills,
        experience: profile.experience,
        education: profile.education,
        stats: {
            ...profile.stats,
            rating: rating,
            totalMentees: await Connection.countDocuments({ 
                mentor: mentorId, 
                status: "active" 
            })
        },
        connectionStatus: connection ? connection.status : null,
        connectionInfo: connection ? {
            startedAt: connection.startedAt,
            sharedGoals: sharedGoals
        } : null
    };

    return res.status(200).json(
        new ApiResponse(200, publicProfile, "Public profile fetched successfully")
    );
});

export {
    sendConnectionRequest,
    getAllMentors,
    getMyMentees,
    acceptConnection,
    rejectConnection,
    getMyMentors,
    getPublicMentorProfile ,
};