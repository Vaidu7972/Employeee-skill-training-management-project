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

// Admin Audit & Error Log Endpoints
router.get("/audit-logs/export", authenticateJWT, adminOnly, exportAuditLogs);
router.get("/audit-logs", authenticateJWT, adminOnly, getAuditLogs);
router.get("/error-logs/export", authenticateJWT, adminOnly, exportErrorLogs);
router.get("/error-logs", authenticateJWT, adminOnly, getErrorLogs);

export default router;
