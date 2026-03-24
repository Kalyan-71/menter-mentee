import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { Message } from "../models/message.model.js";
import { Conversation } from "../models/conversation.model.js";

const connectedUsers = new Map(); // userId -> socketId

export const initializeChatSocket = (io) => {
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || 
                         socket.handshake.query.token;
            
            if (!token) {
                return next(new Error("Authentication error: No token"));
            }

            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            const user = await User.findById(decoded._id).select("-password");
            
            if (!user) {
                return next(new Error("Authentication error: User not found"));
            }

            socket.user = user;
            next();
        } catch (error) {
            next(new Error("Authentication error: Invalid token"));
        }
    });

    io.on("connection", (socket) => {
        console.log(`User connected: ${socket.user.fullname} (${socket.user._id})`);
        
        // Store user connection
        connectedUsers.set(socket.user._id.toString(), socket.id);
        socket.join(`user_${socket.user._id}`);

        // Send online status to relevant users
        broadcastUserStatus(io, socket.user._id, true);

        // Handle joining conversation room
        socket.on("join_conversation", (data) => {
            const { conversationId } = data;
            socket.join(conversationId);
            console.log(`${socket.user.fullname} joined room: ${conversationId}`);
        });

        // Handle leaving conversation room
        socket.on("leave_conversation", (data) => {
            const { conversationId } = data;
            socket.leave(conversationId);
        });

        // Handle sending message
        socket.on("send_message", async (data) => {
            try {
                const { receiverId, content, conversationId } = data;
                const senderId = socket.user._id;

                // Validate receiver exists
                const receiver = await User.findById(receiverId);
                if (!receiver) {
                    socket.emit("error", { message: "Receiver not found" });
                    return;
                }

                // Create message
                const message = await Message.create({
                    sender: senderId,
                    receiver: receiverId,
                    content: content.trim(),
                    conversationId: conversationId || generateConversationId(senderId, receiverId),
                    isRead: false
                });

                // Populate sender info
                const populatedMessage = await Message.findById(message._id)
                    .populate("sender", "fullname username avatar")
                    .populate("receiver", "fullname username avatar");

                // Update or create conversation
                await updateConversation(senderId, receiverId, content, message.conversationId);

                // FIXED: Check if receiver is in the conversation room
                const receiverSocketId = connectedUsers.get(receiverId);
                const room = io.sockets.adapter.rooms.get(message.conversationId);
                const isReceiverInRoom = room && room.has(receiverSocketId);

                // Send to receiver if online but NOT in room (to avoid duplicate with broadcast)
                if (receiverSocketId && !isReceiverInRoom) {
                    io.to(receiverSocketId).emit("receive_message", populatedMessage);
                    io.to(receiverSocketId).emit("new_notification", {
                        type: "message",
                        sender: socket.user.fullname,
                        preview: content.substring(0, 50)
                    });
                }

                // Confirm to sender
                socket.emit("message_sent", populatedMessage);

                // Broadcast to conversation room (receiver gets this if in room)
                socket.to(message.conversationId).emit("message_broadcast", populatedMessage);

            } catch (error) {
                console.error("Send message error:", error);
                socket.emit("error", { message: "Failed to send message" });
            }
        });

        // Handle typing indicator
        socket.on("typing", (data) => {
            const { conversationId, receiverId } = data;
            const receiverSocketId = connectedUsers.get(receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("user_typing", {
                    conversationId,
                    userId: socket.user._id,
                    fullname: socket.user.fullname
                });
            }
        });

        socket.on("stop_typing", (data) => {
            const { conversationId, receiverId } = data;
            const receiverSocketId = connectedUsers.get(receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("user_stop_typing", {
                    conversationId,
                    userId: socket.user._id
                });
            }
        });

        // Handle mark as read
        socket.on("mark_read", async (data) => {
            const { conversationId, senderId } = data;
            
            await Message.updateMany(
                {
                    conversationId,
                    sender: senderId,
                    receiver: socket.user._id,
                    isRead: false
                },
                { isRead: true }
            );

            // Notify sender that messages were read
            const senderSocketId = connectedUsers.get(senderId);
            if (senderSocketId) {
                io.to(senderSocketId).emit("messages_read", {
                    conversationId,
                    readBy: socket.user._id,
                    readAt: new Date()
                });
            }
        });

        // Handle disconnect
        socket.on("disconnect", () => {
            console.log(`User disconnected: ${socket.user.fullname}`);
            connectedUsers.delete(socket.user._id.toString());
            broadcastUserStatus(io, socket.user._id, false);
        });
    });
};

// Helper functions
function generateConversationId(userId1, userId2) {
    const ids = [userId1.toString(), userId2.toString()].sort();
    return `conv_${ids[0]}_${ids[1]}`;
}

async function updateConversation(senderId, receiverId, lastMessageContent, conversationId) {
    try {
        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] }
        });

        if (!conversation) {
            // Get roles
            const [sender, receiver] = await Promise.all([
                User.findById(senderId),
                User.findById(receiverId)
            ]);

            conversation = await Conversation.create({
                participants: [senderId, receiverId],
                participantRoles: [
                    { user: senderId, role: sender.role },
                    { user: receiverId, role: receiver.role }
                ],
                unreadCounts: [
                    { user: senderId, count: 0 },
                    { user: receiverId, count: 0 }
                ]
            });
        }

        // Update last message
        conversation.lastMessage = {
            content: lastMessageContent,
            sender: senderId,
            sentAt: new Date()
        };

        // Increment unread count for receiver
        const unreadEntry = conversation.unreadCounts.find(
            uc => uc.user.toString() === receiverId.toString()
        );
        if (unreadEntry) {
            unreadEntry.count += 1;
        }

        await conversation.save();
    } catch (error) {
        console.error("Update conversation error:", error);
    }
}

function broadcastUserStatus(io, userId, isOnline) {
    io.emit("user_status", {
        userId: userId.toString(),
        isOnline,
        lastSeen: isOnline ? null : new Date()
    });
}

export const getConnectedUsers = () => connectedUsers;