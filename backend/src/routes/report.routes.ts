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
  globalSearch,
} from "../controllers/report.controller";
import { authenticateJWT, requireRoles } from "../middlewares/auth.middleware";
import { SystemRole } from "@prisma/client";

const router = Router();

const adminOrManager = requireRoles([SystemRole.SUPER_ADMIN, SystemRole.MANAGER]);

// Global search
router.get("/search", authenticateJWT, globalSearch);

// Tabular reports (Admin + Manager)
router.get("/employees",    authenticateJWT, adminOrManager, reportEmployees);
router.get("/managers",     authenticateJWT, adminOrManager, reportManagers);
router.get("/projects",     authenticateJWT, adminOrManager, reportProjects);
router.get("/training",     authenticateJWT, adminOrManager, reportTraining);
router.get("/skills",       authenticateJWT, adminOrManager, reportSkills);
router.get("/certificates", authenticateJWT, adminOrManager, reportCertificates);
router.get("/tickets",      authenticateJWT, adminOrManager, reportTickets);
router.get("/downloads",    authenticateJWT, requireRoles([SystemRole.SUPER_ADMIN]), reportDownloads);

export default router;
