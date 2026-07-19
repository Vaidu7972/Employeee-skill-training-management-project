import { Router } from "express";
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  archiveProject,
  deleteProject,
  assignEmployee,
  unassignEmployee,
  getEmployeeProjects,
  getManagerProjects,
  addProjectSkill,
} from "../controllers/project.controller";
import { authenticateJWT, requireRoles } from "../middlewares/auth.middleware";
import { SystemRole } from "@prisma/client";

const router = Router();

// Public-ish (all authenticated users can read)
router.get("/", authenticateJWT, getProjects);
router.get("/employee/:employeeId", authenticateJWT, getEmployeeProjects);
router.get("/manager/:managerId", authenticateJWT, getManagerProjects);
router.get("/:id", authenticateJWT, getProjectById);

// Admin + Manager can create / update
router.post(
  "/",
  authenticateJWT,
  requireRoles([SystemRole.SUPER_ADMIN, SystemRole.MANAGER]),
  createProject
);
router.put(
  "/:id",
  authenticateJWT,
  requireRoles([SystemRole.SUPER_ADMIN, SystemRole.MANAGER]),
  updateProject
);

// Archive (soft-delete)
router.put(
  "/:id/archive",
  authenticateJWT,
  requireRoles([SystemRole.SUPER_ADMIN, SystemRole.MANAGER]),
  archiveProject
);

// Hard delete (admin only)
router.delete(
  "/:id",
  authenticateJWT,
  requireRoles([SystemRole.SUPER_ADMIN]),
  deleteProject
);

// Employee assignment
router.post(
  "/:id/assign",
  authenticateJWT,
  requireRoles([SystemRole.SUPER_ADMIN, SystemRole.MANAGER]),
  assignEmployee
);
router.put(
  "/:id/unassign/:employeeId",
  authenticateJWT,
  requireRoles([SystemRole.SUPER_ADMIN, SystemRole.MANAGER]),
  unassignEmployee
);

// Required skills on a project
router.post(
  "/:id/skills",
  authenticateJWT,
  requireRoles([SystemRole.SUPER_ADMIN, SystemRole.MANAGER]),
  addProjectSkill
);

export default router;
