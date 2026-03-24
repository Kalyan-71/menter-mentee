import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    sendConnectionRequest,
    getAllMentors,
    getMyMentees,
    acceptConnection,
    rejectConnection,
    getMyMentors,
    getPublicMentorProfile
} from "../controllers/connection.controller.js";

const router = Router();

router.use(verifyJWT);

// Mentee routes
router.route("/mentors").get(getAllMentors);
router.route("/mentor/:mentorId").get(getPublicMentorProfile); 
router.route("/request").post(sendConnectionRequest);
router.route("/my-mentors").get(getMyMentors);

// Mentor routes
router.route("/my-mentees").get(getMyMentees);
router.route("/accept/:connectionId").post(acceptConnection);
router.route("/reject/:connectionId").post(rejectConnection);

export default router;