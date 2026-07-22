import { Request, Response, NextFunction } from "express";
import { PrismaClient, SystemRole } from "@prisma/client";

const prisma = new PrismaClient();

// Helper to resolve manager employee ID from req.user
async function resolveManagerEmployeeId(req: any): Promise<string | null> {
  if (req.user.role === SystemRole.ADMIN && req.query.managerId) {
    return req.query.managerId as string;
  }
  const emp = await prisma.employee.findUnique({
    where: { userId: req.user.id },
    select: { id: true },
  });
  return emp ? emp.id : null;
}

// Helper to compute team skill gap records
async function fetchTeamSkillGapRecords(req: any) {
  const managerEmpId = await resolveManagerEmployeeId(req);
  const isAdmin = req.user.role === SystemRole.ADMIN && !req.query.managerId;

  const employeeWhere: any = {};
  if (!isAdmin && managerEmpId) {
    employeeWhere.managerId = managerEmpId;
  }

  const employees = await prisma.employee.findMany({
    where: employeeWhere,
    include: {
      department: true,
      designation: true,
      employeeSkills: {
        include: {
          skill: {
            include: { category: true },
          },
        },
      },
      trainingPlans: true,
    },
  });

  const roleReqs = await prisma.roleSkillRequirement.findMany();
  const roleReqMap = new Map<string, number>();
  roleReqs.forEach((rr) => {
    roleReqMap.set(`${rr.designationId}_${rr.skillId}`, rr.requiredLevel);
  });

  const records: any[] = [];

  for (const emp of employees) {
    for (const empSkill of emp.employeeSkills) {
      const designationId = emp.designationId;
      const skillId = empSkill.skillId;
      const key = `${designationId}_${skillId}`;
      const requiredRating = roleReqMap.get(key) || empSkill.skill.defaultRequiredLevel || 3;
      const currentRating = empSkill.finalRating && empSkill.finalRating > 0 ? empSkill.finalRating : empSkill.selfRating || 1;
      
      const rawGap = requiredRating - currentRating;
      const skillGap = Math.max(0, rawGap);

      let priority = "NONE";
      if (skillGap === 1) priority = "LOW";
      else if (skillGap === 2) priority = "MEDIUM";
      else if (skillGap >= 3) priority = "HIGH";

      const tp = emp.trainingPlans.find((t) => t.skillId === skillId);
      let trainingStatus = "NOT_ASSIGNED";
      if (tp) {
        trainingStatus = tp.status;
      }

      records.push({
        employeeSkillId: empSkill.id,
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        departmentId: emp.departmentId,
        departmentName: emp.department ? emp.department.name : "Unassigned",
        skillId: empSkill.skillId,
        skillName: empSkill.skill.skillName,
        requiredRating,
        currentRating,
        skillGap,
        priority,
        gapPriorityLabel: priority === "NONE" ? "No Gap" : priority === "LOW" ? "Low" : priority === "MEDIUM" ? "Medium" : "High",
        trainingStatus,
        selfRating: empSkill.selfRating,
        status: empSkill.status,
        employeeComments: empSkill.employeeComments,
        managerFeedback: empSkill.managerFeedback,
        experienceMonths: empSkill.experienceMonths,
      });
    }
  }

  return { records, totalMembers: employees.length };
}

// GET /api/manager/team/skill-gaps
export const getTeamSkillGaps = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { records } = await fetchTeamSkillGapRecords(req);
    const {
      search, departmentId, skillId, priority, currentRating, requiredRating,
      trainingStatus, page = "1", pageSize = "10", sortBy = "employeeName", sortOrder = "asc",
    } = req.query as any;

    let filtered = [...records];

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.employeeName.toLowerCase().includes(q) ||
          r.employeeCode.toLowerCase().includes(q) ||
          r.skillName.toLowerCase().includes(q) ||
          r.departmentName.toLowerCase().includes(q)
      );
    }

    if (departmentId) filtered = filtered.filter((r) => r.departmentId === departmentId);
    if (skillId) filtered = filtered.filter((r) => r.skillId === skillId);
    if (priority) {
      const p = priority.toUpperCase();
      if (p === "NO_GAP" || p === "NONE") filtered = filtered.filter((r) => r.priority === "NONE" || r.skillGap <= 0);
      else filtered = filtered.filter((r) => r.priority === p);
    }
    if (currentRating) filtered = filtered.filter((r) => r.currentRating === parseInt(currentRating));
    if (requiredRating) filtered = filtered.filter((r) => r.requiredRating === parseInt(requiredRating));
    if (trainingStatus) filtered = filtered.filter((r) => r.trainingStatus === trainingStatus);

    const isAsc = sortOrder.toLowerCase() === "asc";
    filtered.sort((a, b) => {
      let valA = a[sortBy] ?? "";
      let valB = b[sortBy] ?? "";
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA < valB) return isAsc ? -1 : 1;
      if (valA > valB) return isAsc ? 1 : -1;
      return 0;
    });

    const pageNum = Math.max(1, parseInt(page));
    const sizeNum = Math.max(1, parseInt(pageSize));
    const total = filtered.length;
    const totalPages = Math.ceil(total / sizeNum) || 1;
    const startIndex = (pageNum - 1) * sizeNum;
    const paginatedData = filtered.slice(startIndex, startIndex + sizeNum);

    return res.status(200).json({
      success: true,
      message: "Team skill gaps retrieved successfully",
      data: paginatedData,
      pagination: { page: pageNum, pageSize: sizeNum, total, totalPages },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/manager/team/skill-gaps/summary
export const getTeamSkillGapSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { records, totalMembers } = await fetchTeamSkillGapRecords(req);

    const noGap = records.filter((r) => r.skillGap <= 0).length;
    const lowGap = records.filter((r) => r.priority === "LOW").length;
    const mediumGap = records.filter((r) => r.priority === "MEDIUM").length;
    const highGap = records.filter((r) => r.priority === "HIGH").length;

    const totalRatings = records.reduce((acc, r) => acc + r.currentRating, 0);
    const totalGaps = records.reduce((acc, r) => acc + r.skillGap, 0);

    const avgTeamSkillRating = records.length > 0 ? parseFloat((totalRatings / records.length).toFixed(1)) : 0;
    const avgTeamSkillGap = records.length > 0 ? parseFloat((totalGaps / records.length).toFixed(1)) : 0;

    return res.status(200).json({
      success: true,
      message: "Team skill gap summary retrieved successfully",
      data: {
        noGapCount: noGap,
        lowGapCount: lowGap,
        mediumGapCount: mediumGap,
        highGapCount: highGap,
        avgTeamSkillRating,
        avgTeamSkillGap,
        totalAssignedSkills: records.length,
        totalTeamMembers: totalMembers,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/manager/team/skill-gaps/export
export const exportTeamSkillGaps = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { records } = await fetchTeamSkillGapRecords(req);
    const headers = [
      "Employee Code", "Employee Name", "Department", "Skill Name",
      "Required Rating", "Current Rating", "Skill Gap", "Gap Priority", "Training Status",
    ];

    const csvRows = [headers.join(",")];
    records.forEach((r) => {
      csvRows.push([
        `"${r.employeeCode}"`, `"${r.employeeName}"`, `"${r.departmentName}"`,
        `"${r.skillName}"`, r.requiredRating, r.currentRating, r.skillGap,
        `"${r.gapPriorityLabel}"`, `"${r.trainingStatus}"`,
      ].join(","));
    });

    const csvContent = csvRows.join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="Team_Skill_Gaps.csv"');
    return res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------
// Manager Project Endpoints & Analytics
// ----------------------------------------------------

export const getManagerProjects = async (req: any, res: Response, next: NextFunction) => {
  try {
    const managerEmpId = await resolveManagerEmployeeId(req);
    const { status, filter } = req.query as any;

    const where: any = {};
    if (managerEmpId && req.user.role !== SystemRole.ADMIN) {
      where.OR = [
        { managerId: managerEmpId },
        { assignments: { some: { employee: { managerId: managerEmpId } } } }
      ];
    }
    if (status && status !== "ALL") where.status = status;

    const projects = await prisma.project.findMany({
      where,
      include: {
        manager: { select: { firstName: true, lastName: true } },
        assignments: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, department: true, designation: true } }
          }
        },
        requiredSkills: { include: { skill: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json({ success: true, data: projects, total: projects.length });
  } catch (err) {
    next(err);
  }
};

export const getManagerProjectDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        manager: { select: { firstName: true, lastName: true, email: true } },
        assignments: {
          include: {
            employee: {
              include: { department: true, designation: true }
            }
          }
        },
        requiredSkills: { include: { skill: true } }
      }
    });

    if (!project) return res.status(404).json({ success: false, message: "Project not found" });
    return res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

export const getManagerProjectEmployees = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { search, role, status } = req.query as any;

    const assignments = await prisma.projectAssignment.findMany({
      where: { projectId: id },
      include: {
        employee: {
          include: { department: true, designation: true }
        }
      }
    });

    let rows = assignments.map(a => ({
      assignmentId: a.id,
      employeeId: a.employee.id,
      employeeCode: a.employee.employeeCode,
      name: `${a.employee.firstName} ${a.employee.lastName}`,
      department: a.employee.department.name,
      designation: a.employee.designation.name,
      projectRole: a.role,
      responsibilities: a.responsibilities || "Standard deliverable contributions",
      technologies: "TypeScript, Node.js, Postgres",
      contributionPercentage: a.contributionPercent,
      joinedAt: a.joinedAt ? a.joinedAt.toISOString().split("T")[0] : "—",
      leftAt: a.leftAt ? a.leftAt.toISOString().split("T")[0] : "Active",
      status: a.status,
    }));

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r => r.name.toLowerCase().includes(q) || r.employeeCode.toLowerCase().includes(q));
    }
    if (role) rows = rows.filter(r => r.projectRole === role);
    if (status) rows = rows.filter(r => r.status === status);

    return res.json({ success: true, data: rows, total: rows.length });
  } catch (err) {
    next(err);
  }
};

export const getManagerProjectAnalytics = async (req: any, res: Response, next: NextFunction) => {
  try {
    const managerEmpId = await resolveManagerEmployeeId(req);
    const { projectId } = req.query as any;

    const where: any = {};
    if (projectId && projectId !== "ALL") {
      where.id = projectId;
    } else if (managerEmpId && req.user.role !== SystemRole.ADMIN) {
      where.OR = [
        { managerId: managerEmpId },
        { assignments: { some: { employee: { managerId: managerEmpId } } } }
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        assignments: { include: { employee: true } },
        requiredSkills: { include: { skill: true } }
      }
    });

    const statusCounts: Record<string, number> = { ACTIVE: 0, PLANNING: 0, ON_HOLD: 0, COMPLETED: 0 };
    const priorityCounts: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    const techCounts: Record<string, number> = {};

    projects.forEach(p => {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
      priorityCounts[p.priority] = (priorityCounts[p.priority] || 0) + 1;
      p.technologies.split(",").forEach(t => {
        const clean = t.trim();
        if (clean) techCounts[clean] = (techCounts[clean] || 0) + 1;
      });
    });

    const employeesPerProject = projects.map(p => ({ label: p.name, count: p.assignments.length }));
    const completionByProject = projects.map(p => ({ label: p.name, percentage: p.completionPercent }));

    return res.json({
      success: true,
      data: {
        projectsByStatus: statusCounts,
        projectsByPriority: priorityCounts,
        technologyUsage: techCounts,
        employeesPerProject,
        completionByProject,
        totalProjects: projects.length,
      }
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------
// Manager Training & Certificate Analytics
// ----------------------------------------------------

export const getManagerTrainingAnalytics = async (req: any, res: Response, next: NextFunction) => {
  try {
    const managerEmpId = await resolveManagerEmployeeId(req);
    const teamWhere: any = managerEmpId && req.user.role !== SystemRole.ADMIN ? { employee: { managerId: managerEmpId } } : {};

    const plans = await prisma.trainingPlan.findMany({
      where: teamWhere,
      include: { employee: true, skill: true }
    });

    const statusCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    const overdueByEmp: Record<string, number> = {};

    plans.forEach(p => {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
      typeCounts[p.trainingType] = (typeCounts[p.trainingType] || 0) + 1;
      if (p.status === "OVERDUE") {
        const name = `${p.employee.firstName} ${p.employee.lastName}`;
        overdueByEmp[name] = (overdueByEmp[name] || 0) + 1;
      }
    });

    const completed = (statusCounts["COMPLETED"] || 0) + (statusCounts["VERIFIED"] || 0);
    const total = plans.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 100;

    return res.json({
      success: true,
      data: {
        trainingByStatus: statusCounts,
        trainingByType: typeCounts,
        overdueByEmployee: overdueByEmp,
        completionRate,
        totalPlans: total,
        completedCount: completed,
      }
    });
  } catch (err) {
    next(err);
  }
};

export const getManagerCertificateAnalytics = async (req: any, res: Response, next: NextFunction) => {
  try {
    const managerEmpId = await resolveManagerEmployeeId(req);
    const teamWhere: any = managerEmpId && req.user.role !== SystemRole.ADMIN ? { employee: { managerId: managerEmpId } } : {};

    const certs = await prisma.certificate.findMany({
      where: teamWhere,
      include: { employee: true }
    });

    const statusCounts: Record<string, number> = {};
    const orgCounts: Record<string, number> = {};

    certs.forEach(c => {
      statusCounts[c.verificationStatus] = (statusCounts[c.verificationStatus] || 0) + 1;
      orgCounts[c.issuingOrganization] = (orgCounts[c.issuingOrganization] || 0) + 1;
    });

    return res.json({
      success: true,
      data: {
        certificatesByStatus: statusCounts,
        certificatesByOrg: orgCounts,
        totalCertificates: certs.length,
        verifiedCount: statusCounts["VERIFIED"] || 0,
        pendingCount: statusCounts["PENDING"] || 0,
      }
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------
// Manager Team Resume & Personal Development
// ----------------------------------------------------

export const getManagerTeamResumeAnalytics = async (req: any, res: Response, next: NextFunction) => {
  try {
    const managerEmpId = await resolveManagerEmployeeId(req);
    const teamWhere: any = managerEmpId && req.user.role !== SystemRole.ADMIN ? { managerId: managerEmpId } : {};

    const team = await prisma.employee.findMany({
      where: teamWhere,
      include: {
        employeeSkills: { include: { skill: { include: { category: true } } } },
        projectAssignments: { include: { project: true } },
        trainingPlans: true,
        certificates: true,
      }
    });

    let totalSkills = 0;
    let totalProjects = 0;
    let totalCompletedTrainings = 0;
    let totalVerifiedCerts = 0;
    let totalExp = 0;

    const skillCatCounts: Record<string, number> = {};
    const ratingDist: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };

    team.forEach(emp => {
      totalExp += Number(emp.yearsOfExperience);
      totalProjects += emp.projectAssignments.length;
      
      emp.employeeSkills.forEach(es => {
        if (es.status === "APPROVED") {
          totalSkills++;
          ratingDist[String(es.finalRating)] = (ratingDist[String(es.finalRating)] || 0) + 1;
          const cat = es.skill.category.name;
          skillCatCounts[cat] = (skillCatCounts[cat] || 0) + 1;
        }
      });

      emp.trainingPlans.forEach(tp => {
        if (tp.status === "COMPLETED" || tp.status === "VERIFIED") totalCompletedTrainings++;
      });

      emp.certificates.forEach(c => {
        if (c.verificationStatus === "VERIFIED") totalVerifiedCerts++;
      });
    });

    const avgExp = team.length > 0 ? (totalExp / team.length).toFixed(1) : "0.0";

    return res.json({
      success: true,
      data: {
        totalTeamMembers: team.length,
        avgExperience: avgExp,
        totalVerifiedSkills: totalSkills,
        totalProjects,
        completedTraining: totalCompletedTrainings,
        verifiedCertificates: totalVerifiedCerts,
        skillsByCategory: skillCatCounts,
        proficiencyDistribution: ratingDist,
      }
    });
  } catch (err) {
    next(err);
  }
};

// Manager My Development Tab (Linked Employee Profile)
export const getManagerDevelopmentDashboard = async (req: any, res: Response, next: NextFunction) => {
  try {
    const managerUserId = req.user.id;
    const emp = await prisma.employee.findUnique({
      where: { userId: managerUserId },
      include: {
        department: true,
        designation: true,
        employeeSkills: { include: { skill: { include: { category: true } } } },
        trainingPlans: { include: { skill: true } },
        certificates: true,
        projectAssignments: { include: { project: true } },
        ticketsAsEmployee: true,
        ticketsAsManager: true,
      }
    });

    if (!emp) {
      return res.status(404).json({ success: false, message: "Linked manager employee profile not found." });
    }

    const verifiedSkills = emp.employeeSkills.filter(es => es.status === "APPROVED").length;
    const pendingReviews = emp.employeeSkills.filter(es => es.status === "SUBMITTED").length;
    const activeTraining = emp.trainingPlans.filter(tp => tp.status === "IN_PROGRESS" || tp.status === "ASSIGNED").length;
    const completedTraining = emp.trainingPlans.filter(tp => tp.status === "COMPLETED" || tp.status === "VERIFIED").length;
    const totalCertificates = emp.certificates.filter(c => c.verificationStatus === "VERIFIED").length;
    const totalProjects = emp.projectAssignments.length;
    const openTickets = emp.ticketsAsEmployee.filter(t => t.status !== "CLOSED" && t.status !== "RESOLVED").length;

    // Personal ratings distribution
    const ratingDist: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    emp.employeeSkills.forEach(es => {
      ratingDist[String(es.finalRating || es.selfRating)] = (ratingDist[String(es.finalRating || es.selfRating)] || 0) + 1;
    });

    return res.json({
      success: true,
      data: {
        profile: {
          name: `${emp.firstName} ${emp.lastName}`,
          code: emp.employeeCode,
          email: emp.email,
          phone: emp.phone,
          department: emp.department.name,
          designation: emp.designation.name,
          experience: Number(emp.yearsOfExperience),
          workMode: emp.workMode,
          workLocation: emp.workLocation,
          education: emp.education,
          profileCompletion: emp.profileCompletion,
        },
        kpis: {
          verifiedSkills,
          pendingReviews,
          activeTraining,
          completedTraining,
          certificates: totalCertificates,
          projects: totalProjects,
          openTickets,
          careerReadiness: 85,
        },
        personalRatingDist: ratingDist,
        skills: emp.employeeSkills,
        trainings: emp.trainingPlans,
        certificates: emp.certificates,
        projects: emp.projectAssignments,
      }
    });
  } catch (err) {
    next(err);
  }
};
