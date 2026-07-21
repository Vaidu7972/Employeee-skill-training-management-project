import { Router } from "express";
import {
  getCategories,
  createCategory,
  getSkills,
  createSkill,
  updateSkill,
  assignSkillToEmployee,
  submitSelfAssessment,
  reviewAssessment,
  getSkillGapAnalysis,
} from "../controllers/skill.controller";
import { authenticateJWT, requireRoles } from "../middlewares/auth.middleware";
import { SystemRole } from "@prisma/client";

const router = Router();

// Skill Categories
router.get("/categories", authenticateJWT, getCategories);
router.post("/categories", authenticateJWT, requireRoles([SystemRole.ADMIN]), createCategory);

// Skill Catalog
router.get("/", authenticateJWT, getSkills);
router.post("/", authenticateJWT, requireRoles([SystemRole.ADMIN]), createSkill);
router.put("/:id", authenticateJWT, requireRoles([SystemRole.ADMIN]), updateSkill);

// Assignments & Self-Assessments
router.post("/assign", authenticateJWT, requireRoles([SystemRole.ADMIN, SystemRole.MANAGER]), assignSkillToEmployee);
router.put("/assessment/:id", authenticateJWT, submitSelfAssessment);
router.put("/review/:id", authenticateJWT, requireRoles([SystemRole.ADMIN, SystemRole.MANAGER]), reviewAssessment);

// Analytics & Gaps
router.get("/gap-analysis", authenticateJWT, getSkillGapAnalysis);

export default router;
