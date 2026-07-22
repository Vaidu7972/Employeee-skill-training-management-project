import { Router } from "express";
import multer from "multer";
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  getManagersCapacity,
  allocateManagerAPI,
  exportEmployeesCSV,
  importEmployeesCSV,
  getEmployeeDashboardAnalytics,
  getEmployeeSkillsAnalytics,
  getEmployeeTrainingAnalytics,
  getEmployeeCertificatesAnalytics,
  getEmployeeProjectsAnalytics,
  getEmployeeResumeAnalytics,
} from "../controllers/employee.controller";
import { authenticateJWT, requireRoles, checkAccessRight } from "../middlewares/auth.middleware";
import { SystemRole } from "@prisma/client";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Employee Dashboard Analytics
router.get("/dashboard/analytics", authenticateJWT, getEmployeeDashboardAnalytics);
router.get("/skills/analytics", authenticateJWT, getEmployeeSkillsAnalytics);
router.get("/training/analytics", authenticateJWT, getEmployeeTrainingAnalytics);
router.get("/certificates/analytics", authenticateJWT, getEmployeeCertificatesAnalytics);
router.get("/projects/analytics", authenticateJWT, getEmployeeProjectsAnalytics);
router.get("/resume/analytics", authenticateJWT, getEmployeeResumeAnalytics);

// Retrieve directory & export data
router.get("/", authenticateJWT, getEmployees);
router.get("/export/csv", authenticateJWT, requireRoles([SystemRole.ADMIN]), exportEmployeesCSV);

// Manager capacity and allocations
router.get("/managers/capacities", authenticateJWT, requireRoles([SystemRole.ADMIN]), getManagersCapacity);
router.post("/managers/allocate", authenticateJWT, requireRoles([SystemRole.ADMIN]), allocateManagerAPI);

// Profile CRUD
router.post("/", authenticateJWT, requireRoles([SystemRole.ADMIN]), createEmployee);
router.put("/:employeeId", authenticateJWT, checkAccessRight, updateEmployee);
router.put("/:id/status", authenticateJWT, requireRoles([SystemRole.ADMIN]), toggleEmployeeStatus);

// Bulk Upload
router.post("/import/csv", authenticateJWT, requireRoles([SystemRole.ADMIN]), upload.single("file"), importEmployeesCSV);

export default router;
