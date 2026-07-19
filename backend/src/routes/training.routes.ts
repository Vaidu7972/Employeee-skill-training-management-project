import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  getProviders,
  createProvider,
  getTrainingPlans,
  createTrainingPlan,
  updateTrainingProgress,
  verifyTrainingCompletion,
  getCertificates,
  uploadCertificate,
  verifyCertificate,
} from "../controllers/training.controller";
import { authenticateJWT, requireRoles } from "../middlewares/auth.middleware";
import { SystemRole } from "@prisma/client";

const router = Router();

// Configure local storage for uploaded certificates
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/certificates";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedExts = [".pdf", ".jpg", ".jpeg", ".png"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, JPG, JPEG, and PNG certificate documents are allowed."));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// Training Providers
router.get("/providers", authenticateJWT, getProviders);
router.post("/providers", authenticateJWT, requireRoles([SystemRole.SUPER_ADMIN]), createProvider);

// Training Plans
router.get("/plans", authenticateJWT, getTrainingPlans);
router.post("/plans", authenticateJWT, requireRoles([SystemRole.SUPER_ADMIN, SystemRole.MANAGER]), createTrainingPlan);
router.put("/plans/:id/progress", authenticateJWT, updateTrainingProgress);
router.put("/plans/:id/verify", authenticateJWT, requireRoles([SystemRole.SUPER_ADMIN, SystemRole.MANAGER]), verifyTrainingCompletion);

// Certificates
router.get("/certificates", authenticateJWT, getCertificates);
router.post("/certificates/upload", authenticateJWT, upload.single("file"), uploadCertificate);
router.put("/certificates/:id/verify", authenticateJWT, requireRoles([SystemRole.SUPER_ADMIN, SystemRole.MANAGER]), verifyCertificate);

export default router;
