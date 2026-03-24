import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createNewGoals, getGoalsCard, updateMilestone , getMenteeGoals , getMyGoalsWithMentor , createNewMentorGoal } from "../controllers/goals-tracker.controller.js";

const router = Router();


router.route("/create-new-goal").post(verifyJWT ,createNewGoals)
router.route("/create-new-mentor-goal").post(verifyJWT ,createNewMentorGoal)

router.route("/get-cards").get(verifyJWT , getGoalsCard )

router.route("/update-milestone").put(verifyJWT , updateMilestone)


router.route("/mentee/:menteeId").get(verifyJWT, getMenteeGoals);        // NEW: Mentor views mentee goals
router.route("/my-goals").get(verifyJWT, getMyGoalsWithMentor);          // NEW: Get goals with mentor filter

export default router;