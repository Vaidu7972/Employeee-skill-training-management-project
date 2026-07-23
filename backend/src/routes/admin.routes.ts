import { Router } from "express";
import {
  getGenericReport,
  exportGenericReport,
} from "../controllers/report.controller";
import {
  getAuditLogs,
  exportAuditLogs,
  getErrorLogs,
  exportErrorLogs,
} from "../controllers/system.controller";
import { authenticateJWT, requireRoles } from "../middlewares/auth.middleware";
import { SystemRole } from "@prisma/client";

const router = Router();
const adminOnly = requireRoles([SystemRole.ADMIN]);

// Admin Reports Endpoints
router.get("/reports/:type/export/:format", authenticateJWT, adminOnly, exportGenericReport);
router.get("/reports/:type/export", authenticateJWT, adminOnly, exportGenericReport);
router.get("/reports/:type", authenticateJWT, adminOnly, getGenericReport);

// Admin & System Audit & Error Log Endpoints
router.get("/audit-logs/export", authenticateJWT, exportAuditLogs);
router.get("/audit-logs", authenticateJWT, getAuditLogs);
router.get("/error-logs/export", authenticateJWT, exportErrorLogs);
router.get("/error-logs", authenticateJWT, getErrorLogs);

export default router;
