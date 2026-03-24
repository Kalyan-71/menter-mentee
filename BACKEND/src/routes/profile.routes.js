import { Router } from "express"
import {
    getProfile,
    updateProfile,
    updateSkills,
    addExperience,
    removeExperience,
    addEducation,
    removeEducation,
    updateAvatar,
    completeProfile,
    checkProfileStatus,
    updateStats,
    getPublicProfile
} from "../controllers/profile.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { upload } from "../middlewares/multer.middleware.js"

const router = Router()

// Public route (must be before verifyJWT middleware)
router.route("/public/:userId").get(getPublicProfile)

// Secured routes
router.use(verifyJWT)

router.route("/").get(getProfile)
router.route("/").patch(updateProfile)
router.route("/status").get(checkProfileStatus)
router.route("/complete").post(completeProfile)
router.route("/stats").patch(updateStats)

router.route("/skills").patch(updateSkills)

router.route("/experience").post(addExperience)
router.route("/experience/:experienceId").delete(removeExperience)

router.route("/education").post(addEducation)
router.route("/education/:educationId").delete(removeEducation)

router.route("/avatar").patch(upload.single("avatar"), updateAvatar)

export default router