import express from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  updatePassword,
  completeProfile,
  updateProfile,
  refreshAccessToken,
} from "../controllers/user.controller.js";
import verifyJWT from "../middlewares/jwt.middleware.js";
import { multerMiddleware } from "../middlewares/multer.middleware.js";
import { authLimiter } from "../middlewares/ratelimit.middleware.js";

const router = express.Router();

router.post("/register", authLimiter, registerUser);
router.post("/login", authLimiter, loginUser);
router.post("/refresh", refreshAccessToken);
router.post("/logout", logoutUser);

router.use(verifyJWT);
router.get("/me", getCurrentUser);
router.put("/password", updatePassword);
router.put("/profile/complete", multerMiddleware.single("profilePic"), completeProfile);
router.put("/profile/update", multerMiddleware.single("profilePic"), updateProfile);

export default router;