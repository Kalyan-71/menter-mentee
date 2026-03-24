import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    getConversations,
    getMessages,
    getUnreadCount,
    deleteMessage,
    getConnectedUsers
} from "../controllers/message.controller.js";

const router = Router();

// All routes protected
router.use(verifyJWT);


///left bar users
router.get("/connected-users", getConnectedUsers);

//
router.get("/conversations", getConversations);
router.get("/unread-count", getUnreadCount);
router.get("/:userId", getMessages);
router.delete("/:messageId", deleteMessage);



export default router;