import { Request, Response, NextFunction } from "express";
import { PrismaClient, TrainingStatus, CertificateStatus, TrainingPriority, SystemRole, AccountStatus } from "@prisma/client";
import { createAuditLog } from "../utils/audit";

const prisma = new PrismaClient();

// ----------------------------------------------------
// Training Provider Controllers
// ----------------------------------------------------

export const getProviders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const providers = await prisma.trainingProvider.findMany({
      where: { status: AccountStatus.ACTIVE },
      orderBy: { name: "asc" },
    });
    return res.status(200).json({
      success: true,
      message: "Providers retrieved successfully",
      data: providers,
    });
  } catch (err) {
    next(err);
  }
};

export const createProvider = async (req: any, res: Response, next: NextFunction) => {
  const { name, contactPerson, email, phone } = req.body;
  const actorId = req.user.id;

  try {
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Provider name is required",
        code: "VALIDATION_ERROR",
      });
    }

    const provider = await prisma.trainingProvider.create({
      data: { name, contactPerson, email, phone },
    });

    await createAuditLog(actorId, "CREATE_TRAINING_PROVIDER", "TRAINING", null, provider);

    return res.status(201).json({
      success: true,
      message: "Provider created successfully",
      data: provider,
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------
// Training Plan Controllers
// ----------------------------------------------------

export const getTrainingPlans = async (req: Request, res: Response, next: NextFunction) => {
  const { employeeId, skillId, status, page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  try {
    const whereClause: any = {};
    if (employeeId) {
      whereClause.employeeId = employeeId as string;
    }
    if (skillId) {
      whereClause.skillId = skillId as string;
    }
    if (status) {
      whereClause.status = status as TrainingStatus;
    }

    // Auto-update status to OVERDUE if target date has passed
    const now = new Date();
    await prisma.trainingPlan.updateMany({
      where: {
        dueDate: { lt: now },
        status: { in: [TrainingStatus.ASSIGNED, TrainingStatus.NOT_STARTED, TrainingStatus.IN_PROGRESS, TrainingStatus.ON_HOLD] },
      },
      data: {
        status: TrainingStatus.OVERDUE,
      },
    });

    const [plans, total] = await prisma.$transaction([
      prisma.trainingPlan.findMany({
        where: whereClause,
        include: {
          employee: true,
          skill: true,
          provider: true,
        },
        skip,
        take,
        orderBy: { dueDate: "asc" },
      }),
      prisma.trainingPlan.count({ where: whereClause }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Training plans retrieved successfully",
      data: plans,
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

export const createTrainingPlan = async (req: any, res: Response, next: NextFunction) => {
  const {
    trainingCode,
    trainingTitle,
    description,
    employeeId,
    skillId,
    providerId,
    trainingType,
    startDate,
    dueDate,
    priority,
    estimatedHours,
    trainingUrl,
    certificateRequired,
  } = req.body;
  const actorId = req.user.id;

  try {
    if (!trainingCode || !trainingTitle || !employeeId || !skillId || !startDate || !dueDate || !estimatedHours) {
      return res.status(400).json({
        success: false,
        message: "Required parameters are missing.",
        code: "VALIDATION_ERROR",
      });
    }

    const start = new Date(startDate);
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (due < today) {
      return res.status(400).json({
        success: false,
        message: "Due date cannot be in the past",
        code: "VALIDATION_ERROR",
      });
    }

    if (due < start) {
      return res.status(400).json({
        success: false,
        message: "Due date must be after the start date",
        code: "VALIDATION_ERROR",
      });
    }

    const existingCode = await prisma.trainingPlan.findUnique({ where: { trainingCode } });
    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: "Training Code already exists",
        code: "VALIDATION_ERROR",
      });
    }

    // Lookup actor employeeId
    const actorEmployee = await prisma.employee.findFirst({
      where: { userId: actorId },
    });

    if (!actorEmployee) {
      return res.status(400).json({
        success: false,
        message: "Assigning user must possess an employee profile.",
        code: "VALIDATION_ERROR",
      });
    }

    const plan = await prisma.$transaction(async (tx) => {
      const created = await tx.trainingPlan.create({
        data: {
          trainingCode,
          trainingTitle,
          description,
          employeeId,
          skillId,
          assignedById: actorEmployee.id,
          providerId,
          trainingType: trainingType || "ONLINE",
          startDate: start,
          dueDate: due,
          priority: (priority as TrainingPriority) || TrainingPriority.MEDIUM,
          estimatedHours: Number(estimatedHours),
          trainingUrl,
          certificateRequired: certificateRequired === "true" || certificateRequired === true,
          status: TrainingStatus.ASSIGNED,
          progress: 0,
        },
      });

      // Notify employee
      const employee = await tx.employee.findUnique({ where: { id: employeeId } });
      if (employee?.userId) {
        await tx.notification.create({
          data: {
            userId: employee.userId,
            title: "New Training Assigned",
            message: `You have been assigned the training: "${trainingTitle}". Target Completion: ${due.toISOString().split("T")[0]}`,
            type: "TRAINING",
            deepLink: `/employee/my-training?id=${created.id}`,
          },
        });
      }

      return created;
    });

    await createAuditLog(actorId, "CREATE_TRAINING_PLAN", "TRAINING", null, plan);

    return res.status(201).json({
      success: true,
      message: "Training plan assigned successfully",
      data: plan,
    });
  } catch (err) {
    next(err);
  }
};

export const updateTrainingProgress = async (req: any, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { progress, employeeComments, actualHours } = req.body;
  const userId = req.user.id;

  try {
    const plan = await prisma.trainingPlan.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Training plan not found",
        code: "NOT_FOUND",
      });
    }

    // Security: Employee must own this record
    if (req.user.role === SystemRole.EMPLOYEE && plan.employee.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own training progress.",
        code: "FORBIDDEN",
      });
    }

    const progVal = Number(progress);
    if (progVal < 0 || progVal > 100) {
      return res.status(400).json({
        success: false,
        message: "Progress must be between 0 and 100",
        code: "VALIDATION_ERROR",
      });
    }

    let nextStatus: TrainingStatus = TrainingStatus.IN_PROGRESS;
    if (progVal === 0) {
      nextStatus = TrainingStatus.NOT_STARTED;
    } else if (progVal === 100) {
      nextStatus = TrainingStatus.SUBMITTED_FOR_REVIEW;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const up = await tx.trainingPlan.update({
        where: { id },
        data: {
          progress: progVal,
          employeeComments,
          actualHours: actualHours ? Number(actualHours) : undefined,
          status: nextStatus,
          completionDate: progVal === 100 ? new Date() : null,
        },
      });

      // Record progress history
      await tx.trainingProgressHistory.create({
        data: {
          trainingPlanId: id,
          progress: progVal,
          comments: employeeComments,
          updatedById: userId,
        },
      });

      // Notify manager if submitted for review
      if (nextStatus === TrainingStatus.SUBMITTED_FOR_REVIEW && plan.employee.managerId) {
        const manager = await tx.employee.findUnique({ where: { id: plan.employee.managerId } });
        if (manager?.userId) {
          await tx.notification.create({
            data: {
              userId: manager.userId,
              title: "Training Review Required",
              message: `${plan.employee.firstName} ${plan.employee.lastName} completed "${plan.trainingTitle}" and submitted it for review.`,
              type: "TRAINING",
              deepLink: `/manager/training-progress?id=${id}`,
            },
          });
        }
      }

      return up;
    });

    await createAuditLog(userId, "UPDATE_TRAINING_PROGRESS", "TRAINING", plan, updated);

    return res.status(200).json({
      success: true,
      message: "Training progress updated successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const verifyTrainingCompletion = async (req: any, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { decision, managerFeedback } = req.body; // VERIFIED, ON_HOLD, CANCELLED
  const userId = req.user.id;

  try {
    const plan = await prisma.trainingPlan.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Training plan not found",
        code: "NOT_FOUND",
      });
    }

    // Security: Only Manager associated or Admin can review
    if (req.user.role === SystemRole.MANAGER && plan.employee.managerId !== req.user.employeeId) {
      return res.status(403).json({
        success: false,
        message: "You can only verify trainings of your team members.",
        code: "FORBIDDEN",
      });
    }

    if (![TrainingStatus.VERIFIED, TrainingStatus.ON_HOLD, TrainingStatus.CANCELLED].includes(decision as any)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review decision. Must be VERIFIED, ON_HOLD, or CANCELLED.",
        code: "VALIDATION_ERROR",
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const up = await tx.trainingPlan.update({
        where: { id },
        data: {
          status: decision as TrainingStatus,
          managerFeedback,
          cancellationReason: decision === TrainingStatus.CANCELLED ? managerFeedback : undefined,
        },
      });

      // Notify employee
      if (plan.employee.userId) {
        await tx.notification.create({
          data: {
            userId: plan.employee.userId,
            title: `Training Verification: ${decision}`,
            message: `Your training plan "${plan.trainingTitle}" was reviewed and marked as ${decision.toLowerCase()}.`,
            type: "TRAINING",
            deepLink: `/employee/my-training`,
          },
        });
      }

      return up;
    });

    await createAuditLog(userId, `VERIFY_TRAINING_${decision}`, "TRAINING", plan, updated);

    return res.status(200).json({
      success: true,
      message: `Training marked as ${decision} successfully`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------
// Certificate Management Controllers
// ----------------------------------------------------

export const getCertificates = async (req: Request, res: Response, next: NextFunction) => {
  const { employeeId, status, verificationStatus, page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  try {
    const whereClause: any = {};
    if (employeeId) {
      whereClause.employeeId = employeeId as string;
    }

    const certStatus = (verificationStatus as string) || (status as string);
    if (certStatus) {
      whereClause.verificationStatus = certStatus as CertificateStatus;
    }

    // Automatically expire certificates past expiryDate
    const now = new Date();
    await prisma.certificate.updateMany({
      where: {
        expiryDate: { lt: now },
        verificationStatus: CertificateStatus.VERIFIED,
      },
      data: {
        verificationStatus: CertificateStatus.EXPIRED,
      },
    });

    const [certs, total] = await prisma.$transaction([
      prisma.certificate.findMany({
        where: whereClause,
        include: { employee: true, trainingPlan: true },
        skip,
        take,
        orderBy: { issueDate: "desc" },
      }),
      prisma.certificate.count({ where: whereClause }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Certificates retrieved successfully",
      data: certs,
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

export const uploadCertificate = async (req: any, res: Response, next: NextFunction) => {
  const { certificateName, certificateNumber, issuingOrganization, issueDate, expiryDate, trainingPlanId } = req.body;
  const userId = req.user.id;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Certificate file upload is required",
        code: "VALIDATION_ERROR",
      });
    }

    if (!certificateName || !issuingOrganization || !issueDate) {
      return res.status(400).json({
        success: false,
        message: "Required certificate parameters are missing.",
        code: "VALIDATION_ERROR",
      });
    }

    const employee = await prisma.employee.findFirst({ where: { userId } });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
        code: "NOT_FOUND",
      });
    }

    // Save path using relative path from uploads dir
    const filePath = req.file.path.replace(/\\/g, "/");

    const cert = await prisma.$transaction(async (tx) => {
      const created = await tx.certificate.create({
        data: {
          employeeId: employee.id,
          trainingPlanId: trainingPlanId || null,
          certificateName,
          certificateNumber,
          issuingOrganization,
          issueDate: new Date(issueDate),
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          filePath,
          verificationStatus: CertificateStatus.PENDING,
        },
      });

      // Notify manager if exists
      if (employee.managerId) {
        const manager = await tx.employee.findUnique({ where: { id: employee.managerId } });
        if (manager?.userId) {
          await tx.notification.create({
            data: {
              userId: manager.userId,
              title: "Certificate Pending Approval",
              message: `${employee.firstName} ${employee.lastName} uploaded a new certificate: "${certificateName}".`,
              type: "TRAINING",
              deepLink: `/manager/certificates?id=${created.id}`,
            },
          });
        }
      }

      return created;
    });

    await createAuditLog(userId, "UPLOAD_CERTIFICATE", "TRAINING", null, cert);

    return res.status(201).json({
      success: true,
      message: "Certificate uploaded successfully, awaiting review.",
      data: cert,
    });
  } catch (err) {
    next(err);
  }
};

export const verifyCertificate = async (req: any, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { decision, rejectionReason } = req.body; // VERIFIED, REJECTED
  const userId = req.user.id;

  try {
    const cert = await prisma.certificate.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!cert) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found",
        code: "NOT_FOUND",
      });
    }

    // Security: Only Manager associated or Admin can review
    if (req.user.role === SystemRole.MANAGER && cert.employee.managerId !== req.user.employeeId) {
      return res.status(403).json({
        success: false,
        message: "You can only review certificates of your team members.",
        code: "FORBIDDEN",
      });
    }

    if (![CertificateStatus.VERIFIED, CertificateStatus.REJECTED].includes(decision as any)) {
      return res.status(400).json({
        success: false,
        message: "Invalid decision. Must be VERIFIED or REJECTED.",
        code: "VALIDATION_ERROR",
      });
    }

    if (decision === CertificateStatus.REJECTED && !rejectionReason) {
      return res.status(400).json({
        success: false,
        message: "A rejection reason is required.",
        code: "VALIDATION_ERROR",
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const up = await tx.certificate.update({
        where: { id },
        data: {
          verificationStatus: decision as CertificateStatus,
          rejectionReason: decision === CertificateStatus.REJECTED ? rejectionReason : null,
          verifiedById: userId,
          verifiedDate: new Date(),
        },
      });

      // Notify employee
      if (cert.employee.userId) {
        await tx.notification.create({
          data: {
            userId: cert.employee.userId,
            title: `Certificate Review: ${decision}`,
            message: `Your certificate "${cert.certificateName}" was reviewed and marked as ${decision.toLowerCase()}.`,
            type: "TRAINING",
            deepLink: `/employee/my-certificates`,
          },
        });
      }

      return up;
    });

    await createAuditLog(userId, `VERIFY_CERTIFICATE_${decision}`, "TRAINING", cert, updated);

    return res.status(200).json({
      success: true,
      message: `Certificate marked as ${decision} successfully`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};
