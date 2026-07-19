import { Router } from "express";
import {
  login,
  rotateToken,
  logout,
  logoutFromAllDevices,
  changePassword,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller";
import { authenticateJWT } from "../middlewares/auth.middleware";

const router = Router();

router.post("/login", login);
router.post("/refresh-token", rotateToken);
router.post("/logout", logout);
router.post("/logout-all", authenticateJWT, logoutFromAllDevices);
router.post("/change-password", authenticateJWT, changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
