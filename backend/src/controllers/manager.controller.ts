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

  // Build employee filter condition
  const employeeWhere: any = {};
  if (!isAdmin && managerEmpId) {
    employeeWhere.managerId = managerEmpId;
  }

  // Fetch all employees under manager (or all if admin)
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

  // Fetch role skill requirements for exact required rating calculation
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

      // Determine training status
      const tp = emp.trainingPlans.find((t) => t.skillId === skillId);
      let trainingStatus = "NOT_ASSIGNED";
      if (tp) {
        trainingStatus = tp.status; // COMPLETED, IN_PROGRESS, ASSIGNED, OVERDUE, etc.
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
        priority, // "NONE", "LOW", "MEDIUM", "HIGH"
        gapPriorityLabel: priority === "NONE" ? "No Gap" : priority === "LOW" ? "Low" : priority === "MEDIUM" ? "Medium" : "High",
        trainingStatus,
        selfRating: empSkill.selfRating,
        status: empSkill.status, // SUBMITTED, APPROVED, NEEDS_CHANGES
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
      search,
      departmentId,
      skillId,
      priority,
      currentRating,
      requiredRating,
      trainingStatus,
      page = "1",
      pageSize = "10",
      sortBy = "employeeName",
      sortOrder = "asc",
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

    if (departmentId) {
      filtered = filtered.filter((r) => r.departmentId === departmentId);
    }

    if (skillId) {
      filtered = filtered.filter((r) => r.skillId === skillId);
    }

    if (priority) {
      const p = priority.toUpperCase();
      if (p === "NO_GAP" || p === "NONE") {
        filtered = filtered.filter((r) => r.priority === "NONE" || r.skillGap <= 0);
      } else {
        filtered = filtered.filter((r) => r.priority === p);
      }
    }

    if (currentRating) {
      filtered = filtered.filter((r) => r.currentRating === parseInt(currentRating));
    }

    if (requiredRating) {
      filtered = filtered.filter((r) => r.requiredRating === parseInt(requiredRating));
    }

    if (trainingStatus) {
      filtered = filtered.filter((r) => r.trainingStatus === trainingStatus);
    }

    // Sort
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

    // Pagination
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
      pagination: {
        page: pageNum,
        pageSize: sizeNum,
        total,
        totalPages,
      },
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
      "Employee Code",
      "Employee Name",
      "Department",
      "Skill Name",
      "Required Rating",
      "Current Rating",
      "Skill Gap",
      "Gap Priority",
      "Training Status",
    ];

    const csvRows = [headers.join(",")];
    records.forEach((r) => {
      const row = [
        `"${r.employeeCode}"`,
        `"${r.employeeName}"`,
        `"${r.departmentName}"`,
        `"${r.skillName}"`,
        r.requiredRating,
        r.currentRating,
        r.skillGap,
        `"${r.gapPriorityLabel}"`,
        `"${r.trainingStatus}"`,
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = csvRows.join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="Team_Skill_Gaps.csv"');
    return res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
};
