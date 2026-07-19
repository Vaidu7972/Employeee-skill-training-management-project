import { Request, Response, NextFunction } from "express";
import { PrismaClient, SystemRole, AccountStatus, SlaStatus, TicketStatus, TrainingStatus, SkillRatingStatus, CertificateStatus } from "@prisma/client";
import { createAuditLog } from "../utils/audit";

const prisma = new PrismaClient();

// ----------------------------------------------------
// 1. Dashboard Statistics Compilation
// ----------------------------------------------------

export const getAdminDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const totalEmployees = await prisma.employee.count();
    const activeEmployees = await prisma.employee.count({ where: { accountStatus: AccountStatus.ACTIVE } });
    const inactiveEmployees = totalEmployees - activeEmployees;

    const totalManagers = await prisma.employee.count({
      where: { user: { role: SystemRole.MANAGER }, accountStatus: AccountStatus.ACTIVE },
    });

    const totalDepartments = await prisma.department.count({ where: { status: AccountStatus.ACTIVE } });
    const totalSkills = await prisma.skill.count({ where: { status: AccountStatus.ACTIVE } });

    const pendingSkillReviews = await prisma.employeeSkill.count({
      where: { status: SkillRatingStatus.SUBMITTED },
    });

    const verifiedSkills = await prisma.employeeSkill.count({
      where: { status: SkillRatingStatus.APPROVED },
    });

    const activeTrainings = await prisma.trainingPlan.count({
      where: { status: { in: [TrainingStatus.ASSIGNED, TrainingStatus.NOT_STARTED, TrainingStatus.IN_PROGRESS] } },
    });

    const completedTrainings = await prisma.trainingPlan.count({
      where: { status: { in: [TrainingStatus.COMPLETED, TrainingStatus.VERIFIED] } },
    });

    const overdueTrainings = await prisma.trainingPlan.count({
      where: { status: TrainingStatus.OVERDUE },
    });

    // High priority skill gaps: gap >= 3 (Required level vs approved level)
    // We will query role skill requirements and matching employee skills.
    const designRequirements = await prisma.roleSkillRequirement.findMany({
      include: { skill: true },
    });
    const approvedEmpSkills = await prisma.employeeSkill.findMany({
      where: { status: SkillRatingStatus.APPROVED },
    });

    let highPriorityGaps = 0;
    for (const reqSk of designRequirements) {
      const activeEmps = await prisma.employee.findMany({
        where: { designationId: reqSk.designationId, accountStatus: AccountStatus.ACTIVE },
      });

      for (const emp of activeEmps) {
        const matchingSkill = approvedEmpSkills.find(es => es.employeeId === emp.id && es.skillId === reqSk.skillId);
        const currentRating = matchingSkill ? matchingSkill.finalRating : 0;
        const gap = reqSk.requiredLevel - currentRating;
        if (gap >= 3) {
          highPriorityGaps++;
        }
      }
    }

    const openSupportTickets = await prisma.supportTicket.count({
      where: { status: { in: [TicketStatus.OPEN, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.REOPENED] } },
    });

    const criticalTickets = await prisma.supportTicket.count({
      where: {
        priority: "CRITICAL",
        status: { in: [TicketStatus.OPEN, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.REOPENED] },
      },
    });

    const slaBreachedTickets = await prisma.supportTicket.count({
      where: { slaStatus: SlaStatus.BREACHED },
    });

    // Training completion rate
    const totalAssignedTrainings = await prisma.trainingPlan.count();
    const trainingCompletionRate = totalAssignedTrainings > 0 
      ? Math.round((completedTrainings / totalAssignedTrainings) * 100) 
      : 100;

    // Average skill rating
    const avgSkillObj = await prisma.employeeSkill.aggregate({
      where: { status: SkillRatingStatus.APPROVED },
      _avg: { finalRating: true },
    });
    const averageSkillRating = avgSkillObj._avg.finalRating 
      ? Number(avgSkillObj._avg.finalRating.toFixed(2)) 
      : 0.0;

    // Manager Capacity aggregated
    const managers = await prisma.employee.findMany({
      where: { user: { role: SystemRole.MANAGER }, accountStatus: AccountStatus.ACTIVE },
    });

    let managerAllocCount = 0;
    const managerCapacityDefault = 10; // default cap
    managers.forEach(() => {
      managerAllocCount += managerCapacityDefault;
    });

    const managerCapacityUtilization = managerAllocCount > 0 
      ? Math.round((activeEmployees / managerAllocCount) * 100) 
      : 0;

    return res.status(200).json({
      success: true,
      message: "Admin dashboard stats compiled",
      data: {
        totalEmployees,
        activeEmployees,
        inactiveEmployees,
        totalManagers,
        totalDepartments,
        totalSkills,
        pendingSkillReviews,
        verifiedSkills,
        activeTrainings,
        completedTrainings,
        overdueTrainings,
        highPriorityGaps,
        openSupportTickets,
        criticalTickets,
        slaBreachedTickets,
        trainingCompletionRate,
        averageSkillRating,
        managerCapacityUtilization,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getManagerDashboard = async (req: any, res: Response, next: NextFunction) => {
  const managerEmployeeId = req.user.employeeId;

  try {
    if (!managerEmployeeId) {
      return res.status(400).json({
        success: false,
        message: "Manager record not associated with this user.",
        code: "VALIDATION_ERROR",
      });
    }

    const team = await prisma.employee.findMany({
      where: { managerId: managerEmployeeId },
    });
    const teamIds = team.map(t => t.id);

    const totalTeamMembers = team.length;
    const activeTeamMembers = team.filter(t => t.accountStatus === AccountStatus.ACTIVE).length;

    const skillsAssigned = await prisma.employeeSkill.count({
      where: { employeeId: { in: teamIds } },
    });

    const verifiedSkills = await prisma.employeeSkill.count({
      where: { employeeId: { in: teamIds }, status: SkillRatingStatus.APPROVED },
    });

    const pendingSkillReviews = await prisma.employeeSkill.count({
      where: { employeeId: { in: teamIds }, status: SkillRatingStatus.SUBMITTED },
    });

    // Calculate team gaps
    const approvedTeamSkills = await prisma.employeeSkill.findMany({
      where: { employeeId: { in: teamIds }, status: SkillRatingStatus.APPROVED },
    });

    let highPrioritySkillGaps = 0;
    for (const member of team) {
      if (member.accountStatus === AccountStatus.INACTIVE) continue;
      const memberReqs = await prisma.roleSkillRequirement.findMany({
        where: { designationId: member.designationId },
      });

      for (const reqSk of memberReqs) {
        const match = approvedTeamSkills.find(es => es.employeeId === member.id && es.skillId === reqSk.skillId);
        const currentRating = match ? match.finalRating : 0;
        const gap = reqSk.requiredLevel - currentRating;
        if (gap >= 3) {
          highPrioritySkillGaps++;
        }
      }
    }

    const activeTrainings = await prisma.trainingPlan.count({
      where: { employeeId: { in: teamIds }, status: { in: [TrainingStatus.ASSIGNED, TrainingStatus.NOT_STARTED, TrainingStatus.IN_PROGRESS] } },
    });

    const completedTrainings = await prisma.trainingPlan.count({
      where: { employeeId: { in: teamIds }, status: { in: [TrainingStatus.COMPLETED, TrainingStatus.VERIFIED] } },
    });

    const overdueTrainings = await prisma.trainingPlan.count({
      where: { employeeId: { in: teamIds }, status: TrainingStatus.OVERDUE },
    });

    const pendingCertificateReviews = await prisma.certificate.count({
      where: { employeeId: { in: teamIds }, verificationStatus: CertificateStatus.PENDING },
    });

    const totalTeamTrainings = await prisma.trainingPlan.count({
      where: { employeeId: { in: teamIds } },
    });
    const teamCompletionRate = totalTeamTrainings > 0
      ? Math.round((completedTrainings / totalTeamTrainings) * 100)
      : 100;

    const avgSkillObj = await prisma.employeeSkill.aggregate({
      where: { employeeId: { in: teamIds }, status: SkillRatingStatus.APPROVED },
      _avg: { finalRating: true },
    });
    const averageTeamSkillRating = avgSkillObj._avg.finalRating 
      ? Number(avgSkillObj._avg.finalRating.toFixed(2)) 
      : 0.0;

    return res.status(200).json({
      success: true,
      message: "Manager dashboard stats compiled",
      data: {
        totalTeamMembers,
        activeTeamMembers,
        skillsAssigned,
        verifiedSkills,
        pendingSkillReviews,
        highPrioritySkillGaps,
        activeTrainings,
        completedTrainings,
        overdueTrainings,
        pendingCertificateReviews,
        teamCompletionRate,
        averageTeamSkillRating,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getEmployeeDashboard = async (req: any, res: Response, next: NextFunction) => {
  const employeeId = req.user.employeeId;

  try {
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "Employee record not associated with this user.",
        code: "VALIDATION_ERROR",
      });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { designation: true, department: true },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found.",
        code: "NOT_FOUND",
      });
    }

    const assignedSkills = await prisma.employeeSkill.count({ where: { employeeId } });
    const verifiedSkills = await prisma.employeeSkill.count({ where: { employeeId, status: SkillRatingStatus.APPROVED } });
    const pendingReviews = await prisma.employeeSkill.count({ where: { employeeId, status: SkillRatingStatus.SUBMITTED } });

    const approvedSkills = await prisma.employeeSkill.findMany({
      where: { employeeId, status: SkillRatingStatus.APPROVED },
    });

    const skillsRequiringImprovement = approvedSkills.filter(es => es.finalRating < 3).length;

    // High gaps
    const requirements = await prisma.roleSkillRequirement.findMany({
      where: { designationId: employee.designationId },
    });

    let highPrioritySkillGaps = 0;
    requirements.forEach(reqSk => {
      const match = approvedSkills.find(es => es.skillId === reqSk.skillId);
      const currentRating = match ? match.finalRating : 0;
      const gap = reqSk.requiredLevel - currentRating;
      if (gap >= 3) {
        highPrioritySkillGaps++;
      }
    });

    const activeTrainings = await prisma.trainingPlan.count({
      where: { employeeId, status: { in: [TrainingStatus.ASSIGNED, TrainingStatus.NOT_STARTED, TrainingStatus.IN_PROGRESS] } },
    });

    const completedTrainings = await prisma.trainingPlan.count({
      where: { employeeId, status: { in: [TrainingStatus.COMPLETED, TrainingStatus.VERIFIED] } },
    });

    const overdueTrainings = await prisma.trainingPlan.count({
      where: { employeeId, status: TrainingStatus.OVERDUE },
    });

    // Upcoming deadline training plan within next 7 days
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const upcomingDeadlines = await prisma.trainingPlan.count({
      where: {
        employeeId,
        dueDate: { lte: nextWeek, gte: new Date() },
        status: { in: [TrainingStatus.ASSIGNED, TrainingStatus.NOT_STARTED, TrainingStatus.IN_PROGRESS] },
      },
    });

    const certificatesEarned = await prisma.certificate.count({
      where: { employeeId, verificationStatus: CertificateStatus.VERIFIED },
    });

    const openSupportTickets = await prisma.supportTicket.count({
      where: { creatorId: employeeId, status: { in: [TicketStatus.OPEN, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.REOPENED] } },
    });

    const totalTrainings = await prisma.trainingPlan.count({ where: { employeeId } });
    const learningCompletionPercentage = totalTrainings > 0
      ? Math.round((completedTrainings / totalTrainings) * 100)
      : 100;

    return res.status(200).json({
      success: true,
      message: "Employee dashboard stats compiled",
      data: {
        assignedSkills,
        verifiedSkills,
        pendingReviews,
        skillsRequiringImprovement,
        highPrioritySkillGaps,
        activeTrainings,
        completedTrainings,
        overdueTrainings,
        upcomingDeadlines,
        certificatesEarned,
        openSupportTickets,
        learningCompletionPercentage,
        profileCompletion: employee.profileCompletion,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------
// 2. Audit & Error Log Grids
// ----------------------------------------------------

export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  const { page = 1, limit = 20, component } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  try {
    const where: any = {};
    if (component) {
      where.component = component as string;
    }

    const [logs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        include: { user: true },
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Audit logs retrieved",
      data: logs,
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

export const getErrorLogs = async (req: Request, res: Response, next: NextFunction) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  try {
    const [logs, total] = await prisma.$transaction([
      prisma.errorLog.findMany({
        include: { user: true },
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      prisma.errorLog.count(),
    ]);

    return res.status(200).json({
      success: true,
      message: "Error logs retrieved",
      data: logs,
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

// ----------------------------------------------------
// 3. Notification Hub
// ----------------------------------------------------

export const getNotifications = async (req: any, res: Response, next: NextFunction) => {
  const userId = req.user.id;
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return res.status(200).json({
      success: true,
      message: "Notifications retrieved",
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const markNotificationAsRead = async (req: any, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    await prisma.notification.update({
      where: { id, userId },
      data: { isRead: true },
    });
    return res.status(200).json({ success: true, message: "Notification marked read" });
  } catch (err) {
    next(err);
  }
};

export const markAllNotificationsAsRead = async (req: any, res: Response, next: NextFunction) => {
  const userId = req.user.id;

  try {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return res.status(200).json({ success: true, message: "All notifications marked read" });
  } catch (err) {
    next(err);
  }
};

export const deleteNotification = async (req: any, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    await prisma.notification.delete({
      where: { id, userId },
    });
    return res.status(200).json({ success: true, message: "Notification deleted" });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------
// 4. Learning & Career Readiness
// ----------------------------------------------------

export const getCareerReadiness = async (req: any, res: Response, next: NextFunction) => {
  const employeeId = req.user.employeeId;
  const { targetDesignationId } = req.query;

  try {
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "Employee profile required",
        code: "VALIDATION_ERROR",
      });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { designation: true },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found.",
        code: "NOT_FOUND",
      });
    }

    const targetDesigId = (targetDesignationId as string) || employee.designationId;

    // Fetch design requirements
    const roleRequirements = await prisma.roleSkillRequirement.findMany({
      where: { designationId: targetDesigId },
      include: { skill: true },
    });

    const approvedSkills = await prisma.employeeSkill.findMany({
      where: { employeeId, status: SkillRatingStatus.APPROVED },
    });

    const completedSkills: any[] = [];
    const missingSkills: any[] = [];
    let metWeight = 0;
    let totalWeight = roleRequirements.length;

    for (const reqSk of roleRequirements) {
      const match = approvedSkills.find(es => es.skillId === reqSk.skillId);
      const currentRating = match ? match.finalRating : 0;
      
      if (currentRating >= reqSk.requiredLevel) {
        metWeight++;
        completedSkills.push({
          skillId: reqSk.skillId,
          skillName: reqSk.skill.skillName,
          requiredLevel: reqSk.requiredLevel,
          currentLevel: currentRating,
        });
      } else {
        missingSkills.push({
          skillId: reqSk.skillId,
          skillName: reqSk.skill.skillName,
          requiredLevel: reqSk.requiredLevel,
          currentLevel: currentRating,
        });
      }
    }

    const readinessPercentage = totalWeight > 0 ? Math.round((metWeight / totalWeight) * 100) : 100;

    return res.status(200).json({
      success: true,
      message: "Career readiness score generated",
      data: {
        readinessPercentage,
        completedSkills,
        missingSkills,
        targetDesignationName: (await prisma.designation.findUnique({ where: { id: targetDesigId } }))?.name || "Target",
      },
    });
  } catch (err) {
    next(err);
  }
};
