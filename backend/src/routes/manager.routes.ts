import { Router } from "express";
import {
  getTeamSkillGaps,
  getTeamSkillGapSummary,
  exportTeamSkillGaps,
} from "../controllers/manager.controller";
import { authenticateJWT, requireRoles } from "../middlewares/auth.middleware";
import { SystemRole } from "@prisma/client";

const router = Router();

// Manager Team Skill Gap Endpoints
router.get(
  "/team/skill-gaps",
  authenticateJWT,
  requireRoles([SystemRole.ADMIN, SystemRole.MANAGER]),
  getTeamSkillGaps
);

router.get(
  "/team/skill-gaps/summary",
  authenticateJWT,
  requireRoles([SystemRole.ADMIN, SystemRole.MANAGER]),
  getTeamSkillGapSummary
);

router.get(
  "/team/skill-gaps/export",
  authenticateJWT,
  requireRoles([SystemRole.ADMIN, SystemRole.MANAGER]),
  exportTeamSkillGaps
);

export default router;
