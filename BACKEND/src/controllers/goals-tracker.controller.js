import { GoalsTracker } from "../models/goals-tracker.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";


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

export {
    createNewGoals,
    getGoalsCard,
    updateMilestone,
}