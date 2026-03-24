import mongoose from "mongoose";

const connectionSchema = new mongoose.Schema(
    {
        mentee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        mentor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        status: {
            type: String,
            enum: ["pending", "active", "rejected", "completed"],
            default: "pending"
        },
        message: {
            type: String,
            default: ""
        },
        goals: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "GoalsTracker"
        }],
        startedAt: {
            type: Date,
            default: null
        },
        completedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

// Ensure unique mentor-mentee pairs
connectionSchema.index({ mentee: 1, mentor: 1 }, { unique: true });

export const Connection = mongoose.model("Connection", connectionSchema);