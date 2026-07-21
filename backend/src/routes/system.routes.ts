import { Router } from "express";
import {
  getAdminDashboard,
  getManagerDashboard,
  getEmployeeDashboard,
  getAuditLogs,
  getErrorLogs,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getCareerReadiness,
} from "../controllers/system.controller";
import { authenticateJWT, requireRoles } from "../middlewares/auth.middleware";
import { SystemRole } from "@prisma/client";

const router = Router();

// Dashboard Compile Statistics
router.get("/dashboard/admin", authenticateJWT, requireRoles([SystemRole.ADMIN, SystemRole.ADMIN]), getAdminDashboard);
router.get("/dashboard/manager", authenticateJWT, requireRoles([SystemRole.ADMIN, SystemRole.MANAGER]), getManagerDashboard);
router.get("/dashboard/employee", authenticateJWT, requireRoles([SystemRole.EMPLOYEE]), getEmployeeDashboard);

// Administration Log Grids
router.get("/audit-logs", authenticateJWT, requireRoles([SystemRole.ADMIN]), getAuditLogs);
router.get("/error-logs", authenticateJWT, requireRoles([SystemRole.ADMIN]), getErrorLogs);

// Notifications System
router.get("/notifications", authenticateJWT, getNotifications);
router.put("/notifications/:id/read", authenticateJWT, markNotificationAsRead);
router.put("/notifications/read-all", authenticateJWT, markAllNotificationsAsRead);
router.delete("/notifications/:id", authenticateJWT, deleteNotification);

// Career Paths & Readiness
router.get("/career-readiness", authenticateJWT, getCareerReadiness);

export default router;
