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

    const verifiedCertificates = await prisma.certificate.count({
      where: { verificationStatus: CertificateStatus.VERIFIED },
    });

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
        verifiedCertificates,
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
  try {
    let employeeId = req.user?.employeeId;
    if (!employeeId) {
      const emp = await prisma.employee.findFirst({
        where: { OR: [{ userId: req.user?.id }, { email: req.user?.email }] },
      });
      if (emp) {
        employeeId = emp.id;
      } else {
        const firstEmp = await prisma.employee.findFirst();
        if (firstEmp) employeeId = firstEmp.id;
      }
    }

    let employee = employeeId ? await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { designation: true, department: true },
    }) : null;

    if (!employee) {
      employee = await prisma.employee.findFirst({
        include: { designation: true, department: true },
      });
      if (employee) employeeId = employee.id;
    }

    if (!employee || !employeeId) {
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
      where: { employeeId, status: { in: [TicketStatus.OPEN, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.REOPENED] } },
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

export const getAuditLogs = async (req: any, res: Response, next: NextFunction) => {
  const { page = 1, limit = 20, search, action, component, role, user, startDate, endDate } = req.query as any;
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.max(1, Number(limit));
  const skip = (pageNum - 1) * limitNum;
  const currentUser = req.user;

  try {
    const where: any = {};
    if (currentUser?.role === SystemRole.EMPLOYEE) {
      where.userId = currentUser.id;
    } else if (currentUser?.role === SystemRole.MANAGER) {
      const managerEmpId = currentUser.employeeId || currentUser.employee?.id;
      const teamEmployees = managerEmpId ? await prisma.employee.findMany({
        where: { managerId: managerEmpId },
        select: { userId: true }
      }) : [];
      const teamUserIds = teamEmployees.map(e => e.userId).filter(Boolean) as string[];
      teamUserIds.push(currentUser.id);
      
      where.OR = [
        { userId: { in: teamUserIds } },
        { component: { in: ["SKILL", "TRAINING", "CERTIFICATE", "PROJECT", "EMPLOYEE", "MANAGER", "TICKET"] } }
      ];
    }

    if (action) where.action = action;
    if (component) where.component = component;
    if (role && currentUser?.role === SystemRole.ADMIN) where.user = { role };
    if (user && currentUser?.role === SystemRole.ADMIN) {
      where.user = {
        OR: [
          { email: { contains: user, mode: "insensitive" } },
          { employee: { firstName: { contains: user, mode: "insensitive" } } },
          { employee: { lastName: { contains: user, mode: "insensitive" } } },
        ]
      };
    }
    if (startDate || endDate) {
      where.createdAt = {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined,
      };
    }
    if (search) {
      where.OR = [
        { action: { contains: search, mode: "insensitive" } },
        { component: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { ipAddress: { contains: search, mode: "insensitive" } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [logs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
              role: true,
              employee: { select: { firstName: true, lastName: true, employeeCode: true } }
            }
          }
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditLog.count({ where }),
    ]);

    const formattedLogs = logs.map(l => ({
      id: l.id,
      userName: l.user?.employee ? `${l.user.employee.firstName} ${l.user.employee.lastName}` : l.user?.email || "SYSTEM",
      userEmail: l.user?.email || "SYSTEM",
      userRole: l.user?.role || "SYSTEM",
      action: l.action,
      component: l.component || (l as any).module || "SYSTEM",
      module: l.component || (l as any).module || "SYSTEM",
      description: l.description || `${l.action} on ${l.component}`,
      entityName: l.entityName || l.component,
      entityId: l.entityId || l.id,
      oldValue: l.oldValue,
      newValue: l.newValue,
      oldValues: l.oldValue,
      newValues: l.newValue,
      ipAddress: currentUser?.role === SystemRole.ADMIN ? (l.ipAddress || "127.0.0.1") : undefined,
      userAgent: currentUser?.role === SystemRole.ADMIN ? (l.userAgent || "Mozilla/5.0") : undefined,
      createdAt: l.createdAt,
    }));

    return res.status(200).json({
      success: true,
      message: "Audit logs retrieved",
      data: formattedLogs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const exportAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    req.query.limit = "10000";
    const result: any = await new Promise((resolve) => {
      getAuditLogs(req, {
        status: () => ({ json: (d: any) => resolve(d) }),
        json: (d: any) => resolve(d),
      } as any, next);
    });

    const logs = result.data || [];
    const headers = ["ID", "User Name", "User Role", "Action", "Component", "Description", "IP Address", "Date and Time"];
    const csvRows = [headers.join(",")];

    logs.forEach((l: any) => {
      csvRows.push([
        `"${l.id}"`, `"${l.userName}"`, `"${l.userRole}"`, `"${l.action}"`,
        `"${l.component}"`, `"${(l.description || '').replace(/"/g, '""')}"`, `"${l.ipAddress || ''}"`, `"${new Date(l.createdAt).toISOString()}"`
      ].join(","));
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="audit_logs_report.csv"');
    return res.status(200).send(csvRows.join("\n"));
  } catch (err) {
    next(err);
  }
};

export const getErrorLogs = async (req: any, res: Response, next: NextFunction) => {
  const { page = 1, limit = 20, search, errorType, statusCode, user, endpoint, startDate, endDate, severity, resolutionStatus } = req.query as any;
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.max(1, Number(limit));
  const skip = (pageNum - 1) * limitNum;
  const currentUser = req.user;

  try {
    const where: any = {};
    if (currentUser?.role !== SystemRole.ADMIN) {
      if (currentUser?.role === SystemRole.MANAGER) {
        where.OR = [
          { userId: currentUser.id },
          { category: { in: ["VALIDATION", "DATABASE", "SYSTEM", "SECURITY"] } }
        ];
      } else {
        where.OR = [
          { userId: currentUser.id },
          { category: "VALIDATION" }
        ];
      }
    }
    if (errorType) where.errorType = errorType;
    if (statusCode) where.statusCode = parseInt(statusCode);
    if (severity) where.severity = severity;
    if (resolutionStatus) where.resolutionStatus = resolutionStatus;
    if (endpoint) where.endpoint = { contains: endpoint, mode: "insensitive" };
    if (user && currentUser?.role === SystemRole.ADMIN) {
      where.user = { email: { contains: user, mode: "insensitive" } };
    }
    if (startDate || endDate) {
      where.createdAt = {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined,
      };
    }
    if (search) {
      where.OR = [
        { errorType: { contains: search, mode: "insensitive" } },
        { errorMessage: { contains: search, mode: "insensitive" } },
        { endpoint: { contains: search, mode: "insensitive" } },
      ];
    }

    const [logs, total] = await prisma.$transaction([
      prisma.errorLog.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
              role: true,
              employee: { select: { firstName: true, lastName: true } }
            }
          }
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
      }),
      prisma.errorLog.count({ where }),
    ]);

    const formattedLogs = logs.map(l => {
      const isAdmin = currentUser?.role === SystemRole.ADMIN;
      return {
        id: l.id,
        errorCode: l.errorCode || `ERR-${l.id.substring(0, 6).toUpperCase()}`,
        user: l.user?.employee ? `${l.user.employee.firstName} ${l.user.employee.lastName}` : l.user?.email || "SYSTEM",
        userEmail: l.user?.email || "SYSTEM",
        userRole: l.user?.role || "SYSTEM",
        errorType: l.errorType,
        category: l.category || l.errorType,
        errorMessage: l.errorMessage,
        message: l.errorMessage,
        endpoint: l.endpoint,
        method: l.method,
        statusCode: l.statusCode,
        severity: l.severity || (l.statusCode >= 500 ? "CRITICAL" : "ERROR"),
        resolutionStatus: l.resolutionStatus || "OPEN",
        resolvedBy: l.resolvedBy,
        resolutionNote: l.resolutionNote,
        resolvedAt: l.resolvedAt,
        // Sensitive parameters strictly omitted for non-admins
        technicalMessage: isAdmin ? (l.technicalMessage || l.errorMessage) : undefined,
        stackTrace: isAdmin ? l.stackTrace : undefined,
        requestBody: isAdmin ? l.requestBody : undefined,
        ipAddress: isAdmin ? (l.ipAddress || "127.0.0.1") : undefined,
        userAgent: isAdmin ? (l.userAgent || "Mozilla/5.0") : undefined,
        createdAt: l.createdAt,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Error logs retrieved",
      data: formattedLogs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const exportErrorLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    req.query.limit = "10000";
    const result: any = await new Promise((resolve) => {
      getErrorLogs(req, {
        status: () => ({ json: (d: any) => resolve(d) }),
        json: (d: any) => resolve(d),
      } as any, next);
    });

    const logs = result.data || [];
    const headers = ["Error ID", "User", "Error Type", "Severity", "Message", "Endpoint", "Method", "Status Code", "Resolution Status", "Date"];
    const csvRows = [headers.join(",")];

    logs.forEach((l: any) => {
      csvRows.push([
        `"${l.id}"`, `"${l.user}"`, `"${l.errorType}"`, `"${l.severity}"`, `"${(l.message || '').replace(/"/g, '""')}"`,
        `"${l.endpoint}"`, `"${l.method}"`, l.statusCode, `"${l.resolutionStatus}"`, `"${new Date(l.createdAt).toISOString()}"`
      ].join(","));
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="error_logs_report.csv"');
    return res.status(200).send(csvRows.join("\n"));
  } catch (err) {
    next(err);
  }
};

export const updateErrorLogStatus = async (req: any, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { resolutionStatus, resolutionNote } = req.body;
  const currentUser = req.user;

  try {
    if (currentUser?.role !== SystemRole.ADMIN) {
      return res.status(403).json({
        success: false,
        message: "Only system administrators can resolve error logs",
        code: "FORBIDDEN",
      });
    }

    const updated = await prisma.errorLog.update({
      where: { id },
      data: {
        resolutionStatus,
        resolutionNote,
        resolvedBy: currentUser.email || currentUser.id,
        resolvedAt: new Date(),
      },
    });

    // Create Audit Log entry for error resolution
    await createAuditLog(
      currentUser.id,
      "ERROR_LOG_RESOLVED",
      "SYSTEM",
      { id, previousStatus: "OPEN" },
      { id, resolutionStatus, resolutionNote }
    );

    return res.status(200).json({
      success: true,
      message: "Error log resolution updated successfully",
      data: updated,
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
  const { targetDesignationId } = req.query;

  try {
    let employeeId = req.user?.employeeId;
    if (!employeeId) {
      const emp = await prisma.employee.findFirst({
        where: { OR: [{ userId: req.user?.id }, { email: req.user?.email }] },
      });
      if (emp) {
        employeeId = emp.id;
      } else {
        const firstEmp = await prisma.employee.findFirst();
        if (firstEmp) employeeId = firstEmp.id;
      }
    }

    let employee = employeeId ? await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { designation: true },
    }) : null;

    if (!employee) {
      employee = await prisma.employee.findFirst({
        include: { designation: true },
      });
      if (employee) employeeId = employee.id;
    }

    if (!employee || !employeeId) {
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
