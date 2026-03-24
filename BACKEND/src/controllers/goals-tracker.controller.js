import { GoalsTracker } from "../models/goals-tracker.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

import { Connection } from "../models/connection.model.js";

const createNewGoals = asyncHandler(async (req,res)=>{
    const {
        title,
        category,
        description,
        targetDate,
        milestones} = req.body;

        if(
            [title , category, description].some((field)=> !field || field?.trim() === "")
        ){
            
            console.error("ERROR :Title, category and description are required");
            return res.status(400).json(new ApiResponse(400 , null , "Title, category and description are required"));
        }

        const userId = req.user._id;

        const createGoals = await GoalsTracker.create({
                title,
                category,
                description,
                user:userId,
                targetDate:targetDate || null,
                milestones:Array.isArray(milestones) ? milestones : [],
                })

        if(!createGoals){
            console.error("ERROR : Something went wrong while creating the new goals");

            return res.status(500)
                .json(new ApiResponse(500,null ,"Something went wrong while creating the new goals"))
        }

        return res.status(201).json(
            new ApiResponse(201 , createGoals ,"New Goals Successfully Created")
        )
})

const createNewMentorGoal = asyncHandler(async (req,res)=>{
        const {
        title,
        category,
        description,
        targetDate,
        milestones,
        suggestedFor} = req.body;

        

            // suggestedFor: menteeId,
            // suggestedBy: 'mentor'

        if(
            [title , category, description].some((field)=> !field || field?.trim() === "")
        ){
            
            console.error("ERROR :Title, category and description are required");
            return res.status(400).json(new ApiResponse(400 , null , "Title, category and description are required"));
        }

        const userId = suggestedFor;

        const createGoals = await GoalsTracker.create({
                title,
                category,
                description,
                user:userId,
                targetDate:targetDate || null,
                milestones:Array.isArray(milestones) ? milestones : [],
                })

        if(!createGoals){
            console.error("ERROR : Something went wrong while creating the new goals");

            return res.status(500)
                .json(new ApiResponse(500,null ,"Something went wrong while creating the new goals"))
        }

        return res.status(201).json(
            new ApiResponse(201 , createGoals ,"New Goals Successfully Created")
        )

})


const getGoalsCard = asyncHandler(async (req,res)=>{
    const userId = req.user._id;

    const goalsCard = await GoalsTracker.find({user:userId});

    if(!goalsCard ){
         console.error("ERROR : Something went wrong while fecthing the goals Cards");

        return res.status(500)
            .json(new ApiResponse(500,null ,"Something went wrong while fecthing the goals Cards"))
    }

    return res.status(201).json(goalsCard);
})

const updateMilestone = asyncHandler(async (req, res)=>{
    const completed = req.body.completed;
    const goalId = req.body.goalId.trim();
    const milestoneId = req.body.milestoneId.trim();
    
    const goal = await GoalsTracker.findById(goalId);

    if(!goal ){
        console.error("ERROR : Goal not found");

     return res.status(404)
        .json(new ApiResponse(404,null ,"Goal not found"))
    }

    const milestone= goal.milestones.id(milestoneId);

     if(!milestone ){
        console.error("ERROR :Milestone not found");

     return res.status(404)
        .json(new ApiResponse(404,null ,"Milestone not found"))
    }

    milestone.isCompleted = completed;
    
    await goal.save();

    return res.status(201).json({ message: "Milestone updated", goal });
})

// Get goals for a specific mentee (for mentor viewing)
const getMenteeGoals = asyncHandler(async (req, res) => {
    const { menteeId } = req.params;
    const mentorId = req.user._id;

    // Verify mentor has active connection with this mentee
    const connection = await Connection.findOne({
        mentee: menteeId,
        mentor: mentorId,
        status: "active"
    });

    if (!connection) {
        throw new ApiError(403, "No active connection with this mentee");
    }

    // Get all goals for this mentee
    const goals = await GoalsTracker.find({ user: menteeId })
        .select("title category description milestones targetDate createdAt");

    return res.status(200).json(
        new ApiResponse(200, goals, "Mentee goals fetched successfully")
    );
});

// Get my goals with mentor context (for mentee viewing their own goals with mentor)
const getMyGoalsWithMentor = asyncHandler(async (req, res) => {
    const menteeId = req.user._id;
    const { mentorId } = req.query;

    let query = { user: menteeId };
    
    // If mentorId provided, filter goals created during that connection
    if (mentorId) {
        const connection = await Connection.findOne({
            mentee: menteeId,
            mentor: mentorId,
            status: "active"
        });
        
        if (connection) {
            // Goals created after connection started
            query.createdAt = { $gte: connection.startedAt };
        }
    }

    const goals = await GoalsTracker.find(query)
        .sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, goals, "Goals fetched successfully")
    );
});

export {
    createNewGoals,
    getGoalsCard,
    updateMilestone,
    getMenteeGoals,        // Add this
    getMyGoalsWithMentor,   // Add this
    createNewMentorGoal,
};