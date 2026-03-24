import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Message } from "../models/message.model.js";
import { Conversation } from "../models/conversation.model.js";
import mongoose from "mongoose";
import { Connection } from "../models/connection.model.js";

// Get all conversations for current user
const getConversations = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const conversations = await Conversation.find({
        participants: userId
    })
    .populate("participants", "fullname username role avatar")
    .populate("lastMessage.sender", "fullname")
    .sort({ "lastMessage.sentAt": -1 });

    // Format for frontend
    const formattedConversations = conversations.map(conv => {
        const otherParticipant = conv.participants.find(
            p => p._id.toString() !== userId.toString()
        );
        const myUnread = conv.unreadCounts.find(
            uc => uc.user.toString() === userId.toString()
        );

        return {
            conversationId: conv._id,
            participant: otherParticipant,
            lastMessage: conv.lastMessage,
            unreadCount: myUnread ? myUnread.count : 0,
            updatedAt: conv.updatedAt
        };
    });

    return res.status(200).json(
        new ApiResponse(200, formattedConversations, "Conversations retrieved")
    );
});

// Get messages between two users
const getMessages = asyncHandler(async (req, res) => {
    const { userId } = req.params; // Other user's ID
    const currentUserId = req.user._id;
    const { page = 1, limit = 50 } = req.query;

    const conversationId = generateConversationId(currentUserId, userId);

    const messages = await Message.find({ conversationId })
        .populate("sender", "fullname username avatar")
        .populate("receiver", "fullname username avatar")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    // Mark messages as read
    await Message.updateMany(
        {
            conversationId,
            sender: userId,
            receiver: currentUserId,
            isRead: false
        },
        { isRead: true }
    );

    // Reset unread count in conversation
    await Conversation.updateOne(
        {
            participants: { $all: [currentUserId, userId] }
        },
        {
            $set: {
                "unreadCounts.$[elem].count": 0
            }
        },
        {
            arrayFilters: [{ "elem.user": currentUserId }]
        }
    );

    return res.status(200).json(
        new ApiResponse(200, messages.reverse(), "Messages retrieved")
    );
});

// Get unread message count
const getUnreadCount = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const totalUnread = await Message.countDocuments({
        receiver: userId,
        isRead: false
    });

    const unreadByConversation = await Conversation.find({
        participants: userId,
        "unreadCounts.user": userId,
        "unreadCounts.count": { $gt: 0 }
    }).populate("participants", "fullname");

    return res.status(200).json(
        new ApiResponse(200, {
            totalUnread,
            conversations: unreadByConversation.map(conv => ({
                conversationId: conv._id,
                with: conv.participants.find(p => p._id.toString() !== userId.toString()),
                count: conv.unreadCounts.find(uc => uc.user.toString() === userId.toString())?.count || 0
            }))
        }, "Unread counts retrieved")
    );
});

// Delete message (only sender can delete)
const deleteMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findOneAndDelete({
        _id: messageId,
        sender: userId
    });

    if (!message) {
        throw new ApiError(404, "Message not found or unauthorized");
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Message deleted")
    );
});

// Helper function
function generateConversationId(userId1, userId2) {
    const ids = [userId1.toString(), userId2.toString()].sort();
    return `conv_${ids[0]}_${ids[1]}`;
}

//left bar
const getConnectedUsers = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const userRole = req.user.role;

    // Find active connections where current user is either mentor or mentee
    const query = userRole === 'mentor' 
        ? { mentor: userId, status: 'active' }
        : { mentee: userId, status: 'active' };

    const connections = await Connection.find(query)
        .populate('mentee', 'fullname username avatar role')
        .populate('mentor', 'fullname username avatar role');

    // Extract the OTHER person from each connection
    const connectedUsers = connections.map(conn => {
        const otherPerson = userRole === 'mentor' ? conn.mentee : conn.mentor;
        return {
            user: otherPerson,
            connectionId: conn._id,
            connectedSince: conn.startedAt || conn.createdAt
        };
    });

    return res.status(200).json(
        new ApiResponse(200, connectedUsers, "Connected users retrieved")
    );
});

export {
    getConversations,
    getMessages,
    getUnreadCount,
    deleteMessage,
    getConnectedUsers,
};