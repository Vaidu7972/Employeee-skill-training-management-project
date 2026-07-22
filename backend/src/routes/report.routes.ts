import { Router } from "express";
import {
  reportEmployees,
  reportManagers,
  reportProjects,
  reportTraining,
  reportSkills,
  reportCertificates,
  reportTickets,
  reportDownloads,
  reportDepartments,
  reportTeams,
  reportSkillGaps,
  reportAudit,
  globalSearch,
  getGenericReport,
  exportGenericReport,
} from "../controllers/report.controller";
import { authenticateJWT, requireRoles } from "../middlewares/auth.middleware";
import { SystemRole } from "@prisma/client";

const router = Router();
const adminOrManager = requireRoles([SystemRole.ADMIN, SystemRole.MANAGER]);

// Global search
router.get("/search", authenticateJWT, globalSearch);

// Generic dynamic reports & exports
router.get("/:type/export/:format", authenticateJWT, adminOrManager, exportGenericReport);
router.get("/:type/export", authenticateJWT, adminOrManager, exportGenericReport);

// Direct report endpoints
router.get("/employees", authenticateJWT, adminOrManager, reportEmployees);
router.get("/managers", authenticateJWT, adminOrManager, reportManagers);
router.get("/projects", authenticateJWT, adminOrManager, reportProjects);
router.get("/training", authenticateJWT, adminOrManager, reportTraining);
router.get("/skills", authenticateJWT, adminOrManager, reportSkills);
router.get("/certificates", authenticateJWT, adminOrManager, reportCertificates);
router.get("/tickets", authenticateJWT, adminOrManager, reportTickets);
router.get("/departments", authenticateJWT, adminOrManager, reportDepartments);
router.get("/teams", authenticateJWT, adminOrManager, reportTeams);
router.get("/skillgaps", authenticateJWT, adminOrManager, reportSkillGaps);
router.get("/audit", authenticateJWT, requireRoles([SystemRole.ADMIN]), reportAudit);
router.get("/downloads", authenticateJWT, requireRoles([SystemRole.ADMIN]), reportDownloads);
router.get("/:type", authenticateJWT, adminOrManager, getGenericReport);

export default router;
