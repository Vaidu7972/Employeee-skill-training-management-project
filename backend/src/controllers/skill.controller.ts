import { Request, Response, NextFunction } from "express";
import { PrismaClient, SkillRatingStatus, RatingSource, SystemRole, AccountStatus } from "@prisma/client";
import { createAuditLog } from "../utils/audit";

const prisma = new PrismaClient();

// ----------------------------------------------------
// Skill Category Controllers
// ----------------------------------------------------

export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.skillCategory.findMany({
      orderBy: { name: "asc" },
    });
    return res.status(200).json({
      success: true,
      message: "Categories retrieved successfully",
      data: categories,
    });
  } catch (err) {
    next(err);
  }
};

export const createCategory = async (req: any, res: Response, next: NextFunction) => {
  const { name, description } = req.body;
  const actorId = req.user.id;

  try {
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
        code: "VALIDATION_ERROR",
      });
    }

    const existing = await prisma.skillCategory.findUnique({ where: { name } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Category name must be unique",
        code: "VALIDATION_ERROR",
      });
    }

    const category = await prisma.skillCategory.create({
      data: { name, description },
    });

    await createAuditLog(actorId, "CREATE_SKILL_CATEGORY", "SKILL", null, category);

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------
// Skill Catalog Controllers
// ----------------------------------------------------

export const getSkills = async (req: Request, res: Response, next: NextFunction) => {
  const { search, categoryId, skillType, status, employeeId, page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  try {
    const skillRatingStatuses = Object.values(SkillRatingStatus);
    const isEmployeeSkillStatus = status && skillRatingStatuses.includes(status as SkillRatingStatus);
    const shouldReturnEmployeeSkills = Boolean(employeeId || isEmployeeSkillStatus);

    if (shouldReturnEmployeeSkills) {
      const whereClause: any = {};
      if (employeeId) {
        whereClause.employeeId = employeeId as string;
      }
      if (status && isEmployeeSkillStatus) {
        whereClause.status = status as SkillRatingStatus;
      }
      if (categoryId) {
        // Allow filtering skill entries by related skill category
        whereClause.skill = { categoryId: categoryId as string };
      }
      if (skillType) {
        whereClause.skill = { ...whereClause.skill, skillType: skillType as any };
      }
      if (search) {
        whereClause.OR = [
          { skill: { skillName: { contains: String(search), mode: "insensitive" } } },
          { skill: { skillCode: { contains: String(search), mode: "insensitive" } } },
          { employee: { firstName: { contains: String(search), mode: "insensitive" } } },
          { employee: { lastName: { contains: String(search), mode: "insensitive" } } },
        ];
      }

      const [skills, total] = await prisma.$transaction([
        prisma.employeeSkill.findMany({
          where: whereClause,
          include: { skill: { include: { category: true } }, employee: true },
          skip,
          take,
          orderBy: { updatedAt: "desc" },
        }),
        prisma.employeeSkill.count({ where: whereClause }),
      ]);

      return res.status(200).json({
        success: true,
        message: "Employee skill records retrieved successfully",
        data: skills,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    }

    const whereClause: any = {};
    if (status) {
      whereClause.status = status as AccountStatus;
    }
    if (categoryId) {
      whereClause.categoryId = categoryId as string;
    }
    if (skillType) {
      whereClause.skillType = skillType as any;
    }
    if (search) {
      whereClause.OR = [
        { skillName: { contains: String(search), mode: "insensitive" } },
        { skillCode: { contains: String(search), mode: "insensitive" } },
      ];
    }

    const [skills, total] = await prisma.$transaction([
      prisma.skill.findMany({
        where: whereClause,
        include: { category: true },
        skip,
        take,
        orderBy: { skillName: "asc" },
      }),
      prisma.skill.count({ where: whereClause }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Skills retrieved successfully",
      data: skills,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const createSkill = async (req: any, res: Response, next: NextFunction) => {
  const { skillCode, skillName, categoryId, skillType, description, defaultRequiredLevel, demandScore } = req.body;
  const actorId = req.user.id;

  try {
    if (!skillCode || !skillName || !categoryId || !skillType) {
      return res.status(400).json({
        success: false,
        message: "Code, name, category, and skill type are required",
        code: "VALIDATION_ERROR",
      });
    }

    // Uniqueness
    const codeDup = await prisma.skill.findUnique({ where: { skillCode } });
    if (codeDup) {
      return res.status(400).json({
        success: false,
        message: "Skill code already exists",
        code: "VALIDATION_ERROR",
      });
    }

    const nameDup = await prisma.skill.findUnique({ where: { skillName } });
    if (nameDup) {
      return res.status(400).json({
        success: false,
        message: "Skill name already exists",
        code: "VALIDATION_ERROR",
      });
    }

    const skill = await prisma.skill.create({
      data: {
        skillCode,
        skillName,
        categoryId,
        skillType,
        description,
        defaultRequiredLevel: defaultRequiredLevel ? Number(defaultRequiredLevel) : 3,
        demandScore: demandScore ? Number(demandScore) : 50,
      },
    });

    await createAuditLog(actorId, "CREATE_SKILL", "SKILL", null, skill);

    return res.status(201).json({
      success: true,
      message: "Skill created successfully",
      data: skill,
    });
  } catch (err) {
    next(err);
  }
};

export const updateSkill = async (req: any, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { skillName, categoryId, skillType, description, defaultRequiredLevel, demandScore, status } = req.body;
  const actorId = req.user.id;

  try {
    const oldSkill = await prisma.skill.findUnique({ where: { id } });
    if (!oldSkill) {
      return res.status(404).json({
        success: false,
        message: "Skill not found",
        code: "NOT_FOUND",
      });
    }

    const updated = await prisma.skill.update({
      where: { id },
      data: {
        skillName,
        categoryId,
        skillType,
        description,
        defaultRequiredLevel: defaultRequiredLevel ? Number(defaultRequiredLevel) : undefined,
        demandScore: demandScore ? Number(demandScore) : undefined,
        status: status as AccountStatus,
      },
    });

    await createAuditLog(actorId, "UPDATE_SKILL", "SKILL", oldSkill, updated);

    return res.status(200).json({
      success: true,
      message: "Skill updated successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------
// Employee Skill Assignment & Assessment Flow
// ----------------------------------------------------

export const assignSkillToEmployee = async (req: any, res: Response, next: NextFunction) => {
  const { employeeId, skillId } = req.body;
  const actorId = req.user.id;

  try {
    if (!employeeId || !skillId) {
      return res.status(400).json({
        success: false,
        message: "Employee ID and Skill ID are required",
        code: "VALIDATION_ERROR",
      });
    }

    const skill = await prisma.skill.findUnique({ where: { id: skillId } });
    if (!skill || skill.status === AccountStatus.INACTIVE) {
      return res.status(400).json({
        success: false,
        message: "Skill does not exist or is inactive",
        code: "VALIDATION_ERROR",
      });
    }

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
        code: "NOT_FOUND",
      });
    }

    // Check duplicate assignments
    const existing = await prisma.employeeSkill.findUnique({
      where: {
        employeeId_skillId: { employeeId, skillId },
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "This skill is already assigned to the employee",
        code: "DUPLICATE_ASSIGNMENT",
      });
    }

    const empSkill = await prisma.$transaction(async (tx) => {
      const created = await tx.employeeSkill.create({
        data: {
          employeeId,
          skillId,
          status: SkillRatingStatus.ASSIGNED,
          selfRating: 1,
          finalRating: 1,
        },
      });

      // Notify employee
      if (employee.userId) {
        await tx.notification.create({
          data: {
            userId: employee.userId,
            title: "New Skill Assigned",
            message: `You have been assigned the skill "${skill.skillName}". Please complete the self-assessment.`,
            type: "SKILL",
            deepLink: `/employee/self-assessment?id=${created.id}`,
          },
        });
      }

      return created;
    });

    await createAuditLog(actorId, "ASSIGN_SKILL", "SKILL", null, empSkill);

    return res.status(201).json({
      success: true,
      message: "Skill assigned to employee successfully",
      data: empSkill,
    });
  } catch (err) {
    next(err);
  }
};

export const submitSelfAssessment = async (req: any, res: Response, next: NextFunction) => {
  const { id } = req.params; // EmployeeSkill ID
  const { selfRating, experienceMonths, employeeComments, isDraft } = req.body;
  const user = req.user;

  try {
    const empSkill = await prisma.employeeSkill.findUnique({
      where: { id },
      include: { employee: true, skill: true },
    });

    if (!empSkill) {
      return res.status(404).json({
        success: false,
        message: "Employee skill record not found",
        code: "NOT_FOUND",
      });
    }

    // Security: Employee must own this record
    if (user.role === SystemRole.EMPLOYEE && empSkill.employee.userId !== user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own assessments.",
        code: "FORBIDDEN",
      });
    }

    const ratingVal = Number(selfRating);
    if (ratingVal < 1 || ratingVal > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
        code: "VALIDATION_ERROR",
      });
    }

    const nextStatus = isDraft ? SkillRatingStatus.DRAFT : SkillRatingStatus.SUBMITTED;

    const updated = await prisma.$transaction(async (tx) => {
      const up = await tx.employeeSkill.update({
        where: { id },
        data: {
          selfRating: ratingVal,
          experienceMonths: Number(experienceMonths || 0),
          employeeComments,
          status: nextStatus,
        },
      });

      // Save history
      await tx.skillRatingHistory.create({
        data: {
          employeeSkillId: id,
          rating: ratingVal,
          source: RatingSource.SELF,
          updatedById: user.id,
          comments: employeeComments,
        },
      });

      // Notify manager if submitted
      if (nextStatus === SkillRatingStatus.SUBMITTED && empSkill.employee.managerId) {
        const manager = await tx.employee.findUnique({
          where: { id: empSkill.employee.managerId },
        });
        if (manager?.userId) {
          await tx.notification.create({
            data: {
              userId: manager.userId,
              title: "Assessment Review Required",
              message: `${empSkill.employee.firstName} ${empSkill.employee.lastName} has submitted a self-assessment for "${empSkill.skill.skillName}".`,
              type: "SKILL",
              deepLink: `/manager/reviews?id=${id}`,
            },
          });
        }
      }

      return up;
    });

    await createAuditLog(user.id, `ASSESSMENT_SUBMIT_${nextStatus}`, "SKILL", empSkill, updated);

    return res.status(200).json({
      success: true,
      message: isDraft ? "Assessment saved as draft" : "Assessment submitted to manager for review",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const reviewAssessment = async (req: any, res: Response, next: NextFunction) => {
  const { id } = req.params; // EmployeeSkill ID
  const { decision, finalRating, managerFeedback } = req.body; // APPROVED, REJECTED, NEEDS_CHANGES
  const user = req.user;

  try {
    const empSkill = await prisma.employeeSkill.findUnique({
      where: { id },
      include: { employee: true, skill: true },
    });

    if (!empSkill) {
      return res.status(404).json({
        success: false,
        message: "Employee skill record not found",
        code: "NOT_FOUND",
      });
    }

    // Security: Only Manager associated with employee or Admin can review
    if (user.role === SystemRole.MANAGER && empSkill.employee.managerId !== user.employeeId) {
      return res.status(403).json({
        success: false,
        message: "You can only review assessments of your direct team members.",
        code: "FORBIDDEN",
      });
    }

    if (![SkillRatingStatus.APPROVED, SkillRatingStatus.REJECTED, SkillRatingStatus.NEEDS_CHANGES].includes(decision as any)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review decision. Must be APPROVED, REJECTED, or NEEDS_CHANGES.",
        code: "VALIDATION_ERROR",
      });
    }

    if (decision === SkillRatingStatus.REJECTED && !managerFeedback) {
      return res.status(400).json({
        success: false,
        message: "A manager feedback comment is required for rejection.",
        code: "VALIDATION_ERROR",
      });
    }

    const ratingVal = decision === SkillRatingStatus.APPROVED ? Number(finalRating || empSkill.selfRating) : empSkill.finalRating;

    const updated = await prisma.$transaction(async (tx) => {
      const up = await tx.employeeSkill.update({
        where: { id },
        data: {
          finalRating: ratingVal,
          managerFeedback,
          status: decision as SkillRatingStatus,
          approvedById: user.id,
          approvedAt: decision === SkillRatingStatus.APPROVED ? new Date() : null,
        },
      });

      // Save history if approved/modified
      if (decision === SkillRatingStatus.APPROVED) {
        await tx.skillRatingHistory.create({
          data: {
            employeeSkillId: id,
            rating: ratingVal,
            source: RatingSource.MANAGER,
            updatedById: user.id,
            comments: managerFeedback,
          },
        });
      }

      // Notify employee
      if (empSkill.employee.userId) {
        await tx.notification.create({
          data: {
            userId: empSkill.employee.userId,
            title: `Assessment Review: ${decision}`,
            message: `Your assessment for "${empSkill.skill.skillName}" has been ${decision.toLowerCase()} by the manager.`,
            type: "SKILL",
            deepLink: `/employee/my-skills`,
          },
        });
      }

      return up;
    });

    await createAuditLog(user.id, `ASSESSMENT_REVIEW_${decision}`, "SKILL", empSkill, updated);

    return res.status(200).json({
      success: true,
      message: `Assessment successfully updated to ${decision}`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------
// Skill Gap Analysis Controllers
// ----------------------------------------------------

export const getSkillGapAnalysis = async (req: Request, res: Response, next: NextFunction) => {
  const { employeeId, departmentId } = req.query;

  try {
    if (employeeId) {
      // Analyze single employee skill gaps
      const emp = await prisma.employee.findUnique({
        where: { id: employeeId as string },
        include: { designation: true },
      });
      if (!emp) {
        return res.status(404).json({
          success: false,
          message: "Employee profile not found",
          code: "NOT_FOUND",
        });
      }

      // 1. Fetch designation required skills
      const reqSkills = await prisma.roleSkillRequirement.findMany({
        where: { designationId: emp.designationId },
        include: { skill: { include: { category: true } } },
      });

      // 2. Fetch employee approved skills
      const empSkills = await prisma.employeeSkill.findMany({
        where: {
          employeeId: employeeId as string,
          status: SkillRatingStatus.APPROVED,
        },
      });

      const skillMap = new Map<string, number>();
      empSkills.forEach(es => skillMap.set(es.skillId, es.finalRating));

      const gapAnalysis = reqSkills.map(reqSk => {
        const currentRating = skillMap.get(reqSk.skillId) || 0;
        const requiredRating = reqSk.requiredLevel;
        const gap = requiredRating - currentRating;

        let priority = "NONE";
        if (gap === 1) priority = "LOW";
        else if (gap === 2) priority = "MEDIUM";
        else if (gap >= 3) priority = "HIGH";

        return {
          skillId: reqSk.skillId,
          skillName: reqSk.skill.skillName,
          category: reqSk.skill.category.name,
          skillType: reqSk.skill.skillType,
          requiredRating,
          currentRating,
          gap: gap > 0 ? gap : 0,
          priority,
        };
      });

      return res.status(200).json({
        success: true,
        message: "Employee skill gap analysis compiled successfully",
        data: gapAnalysis,
      });
    }

    if (departmentId) {
      // Analyze department skill gaps
      const deptSkills = await prisma.departmentSkillRequirement.findMany({
        where: { departmentId: departmentId as string },
        include: { skill: { include: { category: true } } },
      });

      const employees = await prisma.employee.findMany({
        where: { departmentId: departmentId as string, accountStatus: AccountStatus.ACTIVE },
      });

      const empIds = employees.map(e => e.id);

      const approvedSkills = await prisma.employeeSkill.findMany({
        where: {
          employeeId: { in: empIds },
          status: SkillRatingStatus.APPROVED,
        },
      });

      const gapAnalysis = deptSkills.map(reqSk => {
        const matchingRatings = approvedSkills.filter(es => es.skillId === reqSk.skillId);
        const totalEmployees = employees.length;
        const metCount = matchingRatings.filter(mr => mr.finalRating >= reqSk.requiredLevel).length;
        
        const gapCount = totalEmployees - metCount;
        const metPercentage = totalEmployees > 0 ? (metCount / totalEmployees) * 100 : 100;

        return {
          skillId: reqSk.skillId,
          skillName: reqSk.skill.skillName,
          category: reqSk.skill.category.name,
          requiredRating: reqSk.requiredLevel,
          totalEmployees,
          metCount,
          gapCount,
          metPercentage,
          priority: gapCount > (totalEmployees * 0.5) ? "HIGH" : gapCount > (totalEmployees * 0.2) ? "MEDIUM" : "LOW",
        };
      });

      return res.status(200).json({
        success: true,
        message: "Department skill gap analysis compiled successfully",
        data: gapAnalysis,
      });
    }

    return res.status(400).json({
      success: false,
      message: "Please specify employeeId or departmentId",
      code: "VALIDATION_ERROR",
    });
  } catch (err) {
    next(err);
  }
};
