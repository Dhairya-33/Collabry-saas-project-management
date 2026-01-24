import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  updatePassword,
  refreshAccessToken
} from "../controllers/user.controller.js";
import verifyJWT  from "../middlewares/jwt.middleware.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh", refreshAccessToken);

router.get("/me", verifyJWT, getCurrentUser);
router.post("/logout", verifyJWT, logoutUser);
router.post("/update-password", verifyJWT, updatePassword);

export default router;
