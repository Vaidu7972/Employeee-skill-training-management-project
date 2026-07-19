import { Router } from "express";
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  getDesignations,
  createDesignation,
  updateDesignation,
} from "../controllers/organization.controller";
import { authenticateJWT, requireRoles } from "../middlewares/auth.middleware";
import { SystemRole } from "@prisma/client";

const router = Router();

// Departments
router.get("/departments", authenticateJWT, getDepartments);
router.post("/departments", authenticateJWT, requireRoles([SystemRole.SUPER_ADMIN]), createDepartment);
router.put("/departments/:id", authenticateJWT, requireRoles([SystemRole.SUPER_ADMIN]), updateDepartment);

// Designations
router.get("/designations", authenticateJWT, getDesignations);
router.post("/designations", authenticateJWT, requireRoles([SystemRole.SUPER_ADMIN]), createDesignation);
router.put("/designations/:id", authenticateJWT, requireRoles([SystemRole.SUPER_ADMIN]), updateDesignation);

export default router;
