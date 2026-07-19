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
} from "../controllers/employee.controller";
import { authenticateJWT, requireRoles, checkAccessRight } from "../middlewares/auth.middleware";
import { SystemRole } from "@prisma/client";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Retrieve directory & export data
router.get("/", authenticateJWT, getEmployees);
router.get("/export/csv", authenticateJWT, requireRoles([SystemRole.SUPER_ADMIN]), exportEmployeesCSV);

// Manager capacity and allocations
router.get("/managers/capacities", authenticateJWT, requireRoles([SystemRole.SUPER_ADMIN]), getManagersCapacity);
router.post("/managers/allocate", authenticateJWT, requireRoles([SystemRole.SUPER_ADMIN]), allocateManagerAPI);

// Profile CRUD
router.post("/", authenticateJWT, requireRoles([SystemRole.SUPER_ADMIN]), createEmployee);
router.put("/:employeeId", authenticateJWT, checkAccessRight, updateEmployee);
router.put("/:id/status", authenticateJWT, requireRoles([SystemRole.SUPER_ADMIN]), toggleEmployeeStatus);

// Bulk Upload
router.post("/import/csv", authenticateJWT, requireRoles([SystemRole.SUPER_ADMIN]), upload.single("file"), importEmployeesCSV);

export default router;
