import { Request, Response, NextFunction } from "express";
import { PrismaClient, SystemRole, AccountStatus, SkillRatingStatus, RatingSource } from "@prisma/client";
import { createAuditLog } from "../utils/audit";

const prisma = new PrismaClient();

function sortQuestions(questions: any[]): any[] {
  return questions.sort((a, b) => {
    const getOrderScore = (qText: string) => {
      if (qText.includes("declare a variable")) return 1;
      if (qText.includes("typeof null")) return 2;
      if (qText.includes("map items") || qText.includes("map into a new array")) return 3;
      return 99;
    };
    return getOrderScore(a.questionText) - getOrderScore(b.questionText);
  });
}

// Create/Update Assessment (Admin Only)
export const createAssessment = async (req: any, res: Response, next: NextFunction) => {
  const { title, description, skillId, passingScore, questions } = req.body;

  try {
    if (!title || !skillId || !questions || !Array.isArray(questions)) {
      return res.status(400).json({
        success: false,
        message: "Title, skillId, and questions array are required",
        code: "VALIDATION_ERROR",
      });
    }

    const created = await prisma.$transaction(async (tx) => {
      // Deactivate old assessments for this skill
      await tx.skillAssessment.updateMany({
        where: { skillId, status: AccountStatus.ACTIVE },
        data: { status: AccountStatus.INACTIVE },
      });

      // Create new assessment
      const assessment = await tx.skillAssessment.create({
        data: {
          title,
          description,
          skillId,
          passingScore: passingScore ? Number(passingScore) : 70,
          questions: {
            create: questions.map((q: any) => ({
              questionText: q.questionText,
              options: q.options, // pipe-separated string
              correctOption: Number(q.correctOption),
              points: q.points ? Number(q.points) : 10,
            })),
          },
        },
        include: {
          questions: true,
        },
      });

      return assessment;
    });

    await createAuditLog(req.user.id, "CREATE_ASSESSMENT", "SKILL_ASSESSMENT", created.id, { title, skillId });

    return res.status(201).json({
      success: true,
      message: "Skill assessment created successfully",
      data: created,
    });
  } catch (err) {
    next(err);
  }
};

// Get Assessments List (All Roles)
export const getAssessments = async (req: any, res: Response, next: NextFunction) => {
  const { skillId } = req.query;

  try {
    const where: any = { status: AccountStatus.ACTIVE };
    if (skillId) {
      where.skillId = String(skillId);
    }

    const assessments = await prisma.skillAssessment.findMany({
      where,
      include: {
        skill: {
          select: {
            skillName: true,
            skillCode: true,
            defaultRequiredLevel: true,
          },
        },
        _count: {
          select: { questions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      message: "Assessments retrieved successfully",
      data: assessments,
    });
  } catch (err) {
    next(err);
  }
};

// Get Assessment Details by ID
export const getAssessmentById = async (req: any, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const assessment = await prisma.skillAssessment.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { id: "asc" } },
        skill: true,
      },
    });

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found",
        code: "NOT_FOUND",
      });
    }

    if (assessment && assessment.questions) {
      assessment.questions = sortQuestions(assessment.questions);
    }

    // Security check: Mask correctOption for employee taking the test
    const responsePayload = JSON.parse(JSON.stringify(assessment));
    if (req.user.role === SystemRole.EMPLOYEE) {
      responsePayload.questions = responsePayload.questions.map((q: any) => {
        delete q.correctOption;
        return q;
      });
    }

    return res.status(200).json({
      success: true,
      message: "Assessment details retrieved successfully",
      data: responsePayload,
    });
  } catch (err) {
    next(err);
  }
};

// Submit Assessment (Employee Only)
export const submitAssessment = async (req: any, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { answers } = req.body; // Array of selected option indices corresponding to question list order

  try {
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: "Answers array is required",
        code: "VALIDATION_ERROR",
      });
    }

    const assessment = await prisma.skillAssessment.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { id: "asc" } },
        skill: true,
      },
    });

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found",
        code: "NOT_FOUND",
      });
    }

    if (assessment && assessment.questions) {
      assessment.questions = sortQuestions(assessment.questions);
    }

    // Calculate score
    const questions = assessment.questions;
    let correctCount = 0;
    for (let i = 0; i < questions.length; i++) {
      if (answers[i] !== undefined && answers[i] === questions[i].correctOption) {
        correctCount++;
      }
    }

    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= assessment.passingScore;

    // Find direct employee profile
    const employee = await prisma.employee.findUnique({
      where: { userId: req.user.id },
    });

    if (!employee) {
      return res.status(403).json({
        success: false,
        message: "Employee profile is required to submit assessments.",
        code: "FORBIDDEN",
      });
    }

    const submission = await prisma.$transaction(async (tx) => {
      // Record submission
      const sub = await tx.skillAssessmentSubmission.create({
        data: {
          assessmentId: id,
          employeeId: employee.id,
          score,
          passed,
          answers: JSON.stringify(answers),
        },
      });

      // If passed, auto-approve the Skill Rating!
      if (passed) {
        const ratingValue = assessment.skill.defaultRequiredLevel || 3;
        const employeeSkill = await tx.employeeSkill.findUnique({
          where: { employeeId_skillId: { employeeId: employee.id, skillId: assessment.skillId } },
        });

        if (employeeSkill) {
          // Update existing
          await tx.employeeSkill.update({
            where: { id: employeeSkill.id },
            data: {
              selfRating: ratingValue,
              finalRating: ratingValue,
              status: SkillRatingStatus.APPROVED,
              approvedById: employee.managerId || undefined,
              approvedAt: new Date(),
              managerFeedback: `Auto-approved by passing skill assessment "${assessment.title}" with score ${score}%`,
            },
          });

          await tx.skillRatingHistory.create({
            data: {
              employeeSkillId: employeeSkill.id,
              rating: ratingValue,
              source: RatingSource.SYSTEM,
              updatedById: req.user.id,
              comments: `System auto-approval: Passed assessment with score ${score}%`,
            },
          });
        } else {
          // Create new record
          const createdSkill = await tx.employeeSkill.create({
            data: {
              employeeId: employee.id,
              skillId: assessment.skillId,
              selfRating: ratingValue,
              finalRating: ratingValue,
              status: SkillRatingStatus.APPROVED,
              approvedById: employee.managerId || undefined,
              approvedAt: new Date(),
              managerFeedback: `Auto-approved by passing skill assessment "${assessment.title}" with score ${score}%`,
            },
          });

          await tx.skillRatingHistory.create({
            data: {
              employeeSkillId: createdSkill.id,
              rating: ratingValue,
              source: RatingSource.SYSTEM,
              updatedById: req.user.id,
              comments: `System auto-approval: Passed assessment with score ${score}%`,
            },
          });
        }
      }

      return sub;
    });

    await createAuditLog(req.user.id, "SUBMIT_ASSESSMENT", "SKILL_ASSESSMENT_SUBMISSION", submission.id, {
      score,
      passed,
      assessmentId: id,
    });

    return res.status(200).json({
      success: true,
      message: passed ? "Congratulations! You passed the assessment." : "Assessment completed. You did not meet the passing score.",
      data: {
        score,
        passed,
        passingScore: assessment.passingScore,
        correctCount,
        totalQuestions: questions.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Get personal submission logs (Employee)
export const getMySubmissions = async (req: any, res: Response, next: NextFunction) => {
  try {
    const employee = await prisma.employee.findUnique({ where: { userId: req.user.id } });
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee profile not found" });
    }

    const submissions = await prisma.skillAssessmentSubmission.findMany({
      where: { employeeId: employee.id },
      include: {
        assessment: {
          include: {
            skill: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      message: "Submissions retrieved successfully",
      data: submissions,
    });
  } catch (err) {
    next(err);
  }
};

// View Team Submissions (Admin & Manager)
export const getAllSubmissions = async (req: any, res: Response, next: NextFunction) => {
  try {
    let where: any = {};

    // Role filtration
    if (req.user.role === SystemRole.MANAGER) {
      const managerEmp = await prisma.employee.findUnique({ where: { userId: req.user.id } });
      if (managerEmp) {
        const team = await prisma.employee.findMany({
          where: { managerId: managerEmp.id },
        });
        const teamIds = team.map((t) => t.id);
        where = { employeeId: { in: teamIds } };
      } else {
        where = { id: "none" };
      }
    }

    const submissions = await prisma.skillAssessmentSubmission.findMany({
      where,
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: true,
          },
        },
        assessment: {
          include: {
            skill: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      message: "All submissions retrieved",
      data: submissions,
    });
  } catch (err) {
    next(err);
  }
};
