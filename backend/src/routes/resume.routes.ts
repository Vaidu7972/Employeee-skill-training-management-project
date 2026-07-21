import { Router } from "express";
import {
  generateResumeData,
  getTeamResumes,
  updateResumeSettings,
  suggestResumeImprovements,
  trackResumeDownload,
  getTeamSummary,
} from "../controllers/resume.controller";
import { authenticateJWT, requireRoles } from "../middlewares/auth.middleware";
import { SystemRole } from "@prisma/client";

const router = Router();

// Employee: get their own resume data (or admin/manager can view by ID)
router.get("/:employeeId", authenticateJWT, generateResumeData);

// Manager: view team member resume summaries
router.get(
  "/team/:managerId",
  authenticateJWT,
  requireRoles([SystemRole.ADMIN, SystemRole.MANAGER]),
  getTeamResumes
);

// Manager: get aggregated dashboard data for Team Resume
router.get(
  "/team-summary/:managerId",
  authenticateJWT,
  requireRoles([SystemRole.ADMIN, SystemRole.MANAGER]),
  getTeamSummary
);

// Employee: save resume preferences (template, visibility toggles, career objective)
router.put("/settings", authenticateJWT, updateResumeSettings);

// Manager: submit improvement suggestions for an employee's CV
router.put(
  "/feedback",
  authenticateJWT,
  requireRoles([SystemRole.ADMIN, SystemRole.MANAGER]),
  suggestResumeImprovements
);

// Track every download event
router.post("/download", authenticateJWT, trackResumeDownload);

export default router;
