import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
    {
        participants: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }],
        participantRoles: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            role: {
                type: String,
                enum: ["mentor", "mentee"]
            }
        }],
        lastMessage: {
            content: String,
            sender: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            sentAt: Date
        },
        unreadCounts: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            count: {
                type: Number,
                default: 0
            }
        }]
    },
    {
        timestamps: true
    }
);

// Ensure unique conversations between same participants
conversationSchema.index({ participants: 1 }, { unique: true });

export const Conversation = mongoose.model("Conversation", conversationSchema);