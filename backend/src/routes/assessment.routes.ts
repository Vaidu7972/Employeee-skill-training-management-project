import { Router } from "express";
import {
  createAssessment,
  getAssessments,
  getAssessmentById,
  submitAssessment,
  getMySubmissions,
  getAllSubmissions,
} from "../controllers/assessment.controller";
import { authenticateJWT, requireRoles } from "../middlewares/auth.middleware";
import { SystemRole } from "@prisma/client";

const router = Router();

// Assessments list/create
router.get("/", authenticateJWT, getAssessments);
router.post("/", authenticateJWT, requireRoles([SystemRole.ADMIN]), createAssessment);

// Submissions
router.get("/submissions", authenticateJWT, requireRoles([SystemRole.ADMIN, SystemRole.MANAGER]), getAllSubmissions);
router.get("/submissions/my", authenticateJWT, requireRoles([SystemRole.EMPLOYEE]), getMySubmissions);

// Single assessment detail & submission
router.get("/:id", authenticateJWT, getAssessmentById);
router.post("/:id/submit", authenticateJWT, requireRoles([SystemRole.EMPLOYEE]), submitAssessment);

export default router;
