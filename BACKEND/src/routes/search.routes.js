import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { searchMatches, getRecommendedMatches } from "../controllers/search.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/").get(searchMatches);
router.route("/recommended").get(getRecommendedMatches);

export default router;