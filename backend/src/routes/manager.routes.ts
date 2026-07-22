import { Router } from "express";
import {
  getTeamSkillGaps,
  getTeamSkillGapSummary,
  exportTeamSkillGaps,
  getManagerProjects,
  getManagerProjectDetails,
  getManagerProjectEmployees,
  getManagerProjectAnalytics,
  getManagerTrainingAnalytics,
  getManagerCertificateAnalytics,
  getManagerTeamResumeAnalytics,
  getManagerDevelopmentDashboard,
} from "../controllers/manager.controller";
import { authenticateJWT, requireRoles } from "../middlewares/auth.middleware";
import { SystemRole } from "@prisma/client";

const router = Router();
const managerOrAdmin = requireRoles([SystemRole.ADMIN, SystemRole.MANAGER]);

// Manager Team Skill Gap Endpoints
router.get("/team/skill-gaps", authenticateJWT, managerOrAdmin, getTeamSkillGaps);
router.get("/team/skill-gaps/summary", authenticateJWT, managerOrAdmin, getTeamSkillGapSummary);
router.get("/team/skill-gaps/export", authenticateJWT, managerOrAdmin, exportTeamSkillGaps);

// Manager Project Module & Analytics
router.get("/projects/analytics", authenticateJWT, managerOrAdmin, getManagerProjectAnalytics);
router.get("/projects/:id/employees", authenticateJWT, managerOrAdmin, getManagerProjectEmployees);
router.get("/projects/:id", authenticateJWT, managerOrAdmin, getManagerProjectDetails);
router.get("/projects", authenticateJWT, managerOrAdmin, getManagerProjects);

// Manager Training & Certificate Analytics
router.get("/training/analytics", authenticateJWT, managerOrAdmin, getManagerTrainingAnalytics);
router.get("/certificates/analytics", authenticateJWT, managerOrAdmin, getManagerCertificateAnalytics);
router.get("/team-resume/analytics", authenticateJWT, managerOrAdmin, getManagerTeamResumeAnalytics);

// Manager My Development Tab
router.get("/development/dashboard", authenticateJWT, managerOrAdmin, getManagerDevelopmentDashboard);
router.get("/development/analytics", authenticateJWT, managerOrAdmin, getManagerDevelopmentDashboard);

export default router;
