import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createNewGoals, getGoalsCard, updateMilestone } from "../controllers/goals-tracker.controller.js";

const router = Router();


router.route("/create-new-goal").post(verifyJWT ,createNewGoals)

router.route("/get-cards").get(verifyJWT , getGoalsCard )

router.route("/update-milestone").put(verifyJWT , updateMilestone)


export default router;