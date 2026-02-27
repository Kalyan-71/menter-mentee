import mongoose from "mongoose";

const todoSchema = new mongoose.Schema({
    //front end has checkbox of lists for tasks completed

    todo:{
        type:String,
        required:true,
        trim:true,
    },
    isCompleted:{//for the frontend checkbox check or not checked
        type:Boolean,
        default:false,
    }
});

const goalsTrackerSchema = new mongoose.Schema(
    {
// Goal Title,Category,Description,Target Date,Milestones , user

        title:{
            type:String,
            required:true,
            trim:true,
        },
        category:{
            type:String,
            required:true,
            trim:true,
        },
        description:{
            type:String,
            required:true,
            trim:true,
        },
        targetDate:{
            type:Date,
            default:null,
        },
        milestones:{
            //array of todos
            type:[todoSchema],
            default:[],
            
        },
       user:{
        //ref to the user schema
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
       } 
    },
    {
        timestamps:true
    }
);

export const GoalsTracker = mongoose.model("GoalsTracker" , goalsTrackerSchema);