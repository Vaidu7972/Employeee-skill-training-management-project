import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Helper to format date string for filenames
const getFormattedDate = () => {
  const now = new Date();
  return now.toISOString().split("T")[0];
};

// Helper to sanitize export string
const cleanVal = (val: any) => {
  if (val === null || val === undefined) return "";
  if (typeof val === "object") return JSON.stringify(val).replace(/,/g, " ");
  return String(val).replace(/"/g, '""');
};

// CSV Export Helper
const convertToCsv = (rows: any[]): string => {
  if (!rows || !rows.length) return "";
  const headers = Object.keys(rows[0]);
  const headerLine = headers.join(",");
  const dataLines = rows.map(r => headers.map(h => `"${cleanVal(r[h])}"`).join(","));
  return [headerLine, ...dataLines].join("\n");
};

// Main Dispatcher for dynamic reports
export const getGenericReport = async (req: Request, res: Response) => {
  try {
    const type = (req.params.type || req.query.type || "employee").toString().toLowerCase().replace(/_/g, "").replace(/-/g, "");
    const {
      page, limit, search, sortBy, sortOrder = "desc",
      employeeName, employeeCode, employeeId, managerId, departmentId, designationId,
      skillId, categoryId, rating, priority, trainingStatus, certificateStatus,
      projectStatus, ticketStatus, ticketPriority, experienceMin, experienceMax,
      startDate, endDate, errorType, statusCode
    } = req.query as any;

    let rows: any[] = [];

    // 1. Employee Report
    if (type.includes("employee") && !type.includes("learning")) {
      const where: any = {};
      if (departmentId) where.departmentId = departmentId;
      if (designationId) where.designationId = designationId;
      if (managerId) where.managerId = managerId;
      if (employeeCode) where.employeeCode = { contains: employeeCode, mode: "insensitive" };
      if (experienceMin || experienceMax) {
        where.yearsOfExperience = {
          gte: experienceMin ? parseFloat(experienceMin) : undefined,
          lte: experienceMax ? parseFloat(experienceMax) : undefined,
        };
      }
      if (search || employeeName) {
        const q = search || employeeName;
        where.OR = [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { employeeCode: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ];
      }

      const employees = await prisma.employee.findMany({
        where,
        include: {
          department: { select: { name: true } },
          designation: { select: { name: true } },
          manager: { select: { firstName: true, lastName: true } },
          _count: { select: { employeeSkills: true, trainingPlans: true, certificates: true, projectAssignments: true } },
        },
        orderBy: { createdAt: sortOrder === "asc" ? "asc" : "desc" },
      });

      rows = employees.map(e => ({
        employeeCode: e.employeeCode,
        name: `${e.firstName} ${e.lastName}`,
        email: e.email,
        department: e.department.name,
        designation: e.designation.name,
        manager: e.manager ? `${e.manager.firstName} ${e.manager.lastName}` : "—",
        status: e.accountStatus,
        workLocation: e.workLocation || "—",
        workMode: e.workMode,
        employmentType: e.employmentType,
        experienceYears: Number(e.yearsOfExperience),
        dateOfJoining: e.dateOfJoining ? e.dateOfJoining.toISOString().split("T")[0] : "—",
        skillsCount: e._count.employeeSkills,
        trainingsCount: e._count.trainingPlans,
        certificatesCount: e._count.certificates,
        projectsCount: e._count.projectAssignments,
      }));
    }

    // 2. Manager Report
    else if (type.includes("manager")) {
      const managers = await prisma.employee.findMany({
        where: { user: { role: "MANAGER" } },
        include: {
          department: { select: { name: true } },
          designation: { select: { name: true } },
          _count: { select: { subordinates: true } },
        },
      });

      rows = managers.map(m => {
        const cap = m.managerCapacity || 10;
        const count = m._count.subordinates;
        return {
          employeeCode: m.employeeCode,
          name: `${m.firstName} ${m.lastName}`,
          email: m.email,
          department: m.department.name,
          designation: m.designation.name,
          capacity: cap,
          assignedTeamSize: count,
          capacityUtilization: Math.round((count / cap) * 100) + "%",
          status: count >= cap ? "FULL" : "AVAILABLE",
        };
      });
    }

    // 3. Department Report
    else if (type.includes("department")) {
      const depts = await prisma.department.findMany({
        include: {
          employees: { select: { accountStatus: true } },
          skillRequirements: true,
        },
      });
      const heads = await prisma.employee.findMany({
        where: { id: { in: depts.map(d => d.departmentHeadId).filter(Boolean) as string[] } },
        select: { id: true, firstName: true, lastName: true },
      });
      const headMap = new Map(heads.map(h => [h.id, `${h.firstName} ${h.lastName}`]));

      rows = depts.map(d => ({
        code: d.code,
        name: d.name,
        description: d.description || "—",
        departmentHead: d.departmentHeadId ? headMap.get(d.departmentHeadId) || "—" : "—",
        activeEmployees: d.employees.filter(e => e.accountStatus === "ACTIVE").length,
        requiredSkillsCount: d.skillRequirements.length,
        status: d.status,
      }));
    }

    // 4. Team Report
    else if (type.includes("team")) {
      const managers = await prisma.employee.findMany({
        where: { user: { role: "MANAGER" } },
        include: {
          department: { select: { name: true } },
          subordinates: {
            include: {
              employeeSkills: { where: { status: "APPROVED" } },
              trainingPlans: true,
              certificates: true,
            },
          },
        },
      });

      rows = managers.map(m => {
        let totalRating = 0;
        let skillCount = 0;
        let activeTrainings = 0;
        let completedTrainings = 0;
        let pendingCerts = 0;

        m.subordinates.forEach(s => {
          s.employeeSkills.forEach(es => {
            totalRating += es.finalRating;
            skillCount++;
          });
          s.trainingPlans.forEach(tp => {
            if (tp.status === "COMPLETED" || tp.status === "VERIFIED") completedTrainings++;
            else if (tp.status === "IN_PROGRESS" || tp.status === "ASSIGNED") activeTrainings++;
          });
          s.certificates.forEach(c => {
            if (c.verificationStatus === "PENDING") pendingCerts++;
          });
        });

        return {
          managerName: `${m.firstName} ${m.lastName}`,
          department: m.department.name,
          teamSize: m.subordinates.length,
          avgSkillRating: skillCount > 0 ? (totalRating / skillCount).toFixed(2) : "0.00",
          activeTrainings,
          completedTrainings,
          pendingCertificates: pendingCerts,
        };
      });
    }

    // 5. Skill Report
    else if (type.includes("skill") && !type.includes("gap")) {
      const where: any = {};
      if (rating) where.finalRating = parseInt(rating);
      if (categoryId) where.skill = { categoryId };
      if (search) where.skill = { skillName: { contains: search, mode: "insensitive" } };

      const empSkills = await prisma.employeeSkill.findMany({
        where,
        include: {
          employee: { select: { firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } } },
          skill: { include: { category: { select: { name: true } } } },
        },
      });

      rows = empSkills.map(s => ({
        employeeCode: s.employee.employeeCode,
        employeeName: `${s.employee.firstName} ${s.employee.lastName}`,
        department: s.employee.department.name,
        skillCode: s.skill.skillCode,
        skillName: s.skill.skillName,
        category: s.skill.category.name,
        type: s.skill.skillType,
        selfRating: s.selfRating,
        finalRating: s.finalRating,
        status: s.status,
        experienceMonths: s.experienceMonths,
      }));
    }

    // 6. Skill Gap Report
    else if (type.includes("skillgap") || type.includes("gap")) {
      const employees = await prisma.employee.findMany({
        include: {
          department: { include: { skillRequirements: { include: { skill: true } } } },
          designation: { include: { skillRequirements: { include: { skill: true } } } },
          employeeSkills: { include: { skill: true } },
        },
      });

      employees.forEach(emp => {
        const empSkillMap = new Map(emp.employeeSkills.map(es => [es.skillId, es]));
        const reqMap = new Map<string, { skillName: string; skillCode: string; requiredLevel: number }>();

        emp.department.skillRequirements.forEach(r => reqMap.set(r.skillId, { skillName: r.skill.skillName, skillCode: r.skill.skillCode, requiredLevel: r.requiredLevel }));
        emp.designation.skillRequirements.forEach(r => {
          const ex = reqMap.get(r.skillId);
          if (!ex || r.requiredLevel > ex.requiredLevel) {
            reqMap.set(r.skillId, { skillName: r.skill.skillName, skillCode: r.skill.skillCode, requiredLevel: r.requiredLevel });
          }
        });

        reqMap.forEach((req, skillId) => {
          const es = empSkillMap.get(skillId);
          const currentLevel = es && es.status === "APPROVED" ? es.finalRating : 0;
          const gap = req.requiredLevel - currentLevel;

          if (gap > 0) {
            const prio = gap >= 3 ? "CRITICAL" : gap >= 2 ? "HIGH" : "MEDIUM";
            if (!priority || priority.toUpperCase() === prio) {
              rows.push({
                employeeCode: emp.employeeCode,
                employeeName: `${emp.firstName} ${emp.lastName}`,
                department: emp.department.name,
                skillCode: req.skillCode,
                skillName: req.skillName,
                requiredLevel: req.requiredLevel,
                currentLevel,
                gap,
                priority: prio,
              });
            }
          }
        });
      });
    }

    // 7 & 8 & 9. Training Reports (Training, Training Completion, Overdue Training)
    else if (type.includes("training")) {
      const where: any = {};
      if (type.includes("completion")) where.status = { in: ["COMPLETED", "VERIFIED"] };
      else if (type.includes("overdue")) where.status = "OVERDUE";
      else if (trainingStatus) where.status = trainingStatus;

      if (employeeId) where.employeeId = employeeId;
      if (search) where.trainingTitle = { contains: search, mode: "insensitive" };

      const plans = await prisma.trainingPlan.findMany({
        where,
        include: {
          employee: { select: { firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } } },
          skill: { select: { skillName: true } },
          provider: { select: { name: true } },
        },
      });

      rows = plans.map(t => ({
        trainingCode: t.trainingCode,
        employeeCode: t.employee.employeeCode,
        employeeName: `${t.employee.firstName} ${t.employee.lastName}`,
        department: t.employee.department.name,
        trainingTitle: t.trainingTitle,
        skill: t.skill.skillName,
        provider: t.provider?.name || "Internal",
        type: t.trainingType,
        status: t.status,
        progress: t.progress + "%",
        startDate: t.startDate ? t.startDate.toISOString().split("T")[0] : "—",
        dueDate: t.dueDate ? t.dueDate.toISOString().split("T")[0] : "—",
      }));
    }

    // 10. Certificate Report
    else if (type.includes("certificate") || type.includes("cert")) {
      const where: any = {};
      if (certificateStatus) where.verificationStatus = certificateStatus;
      if (search) {
        where.OR = [
          { certificateName: { contains: search, mode: "insensitive" } },
          { issuingOrganization: { contains: search, mode: "insensitive" } },
        ];
      }

      const certs = await prisma.certificate.findMany({
        where,
        include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
      });

      rows = certs.map(c => ({
        certificateNumber: c.certificateNumber || "—",
        employeeCode: c.employee.employeeCode,
        employeeName: `${c.employee.firstName} ${c.employee.lastName}`,
        certificateName: c.certificateName,
        issuingOrganization: c.issuingOrganization,
        issueDate: c.issueDate ? c.issueDate.toISOString().split("T")[0] : "—",
        expiryDate: c.expiryDate ? c.expiryDate.toISOString().split("T")[0] : "N/A",
        status: c.verificationStatus,
      }));
    }

    // 11. Project Report
    else if (type.includes("project")) {
      const where: any = {};
      if (projectStatus) where.status = projectStatus;
      if (priority) where.priority = priority;

      const projects = await prisma.project.findMany({
        where,
        include: {
          manager: { select: { firstName: true, lastName: true } },
          _count: { select: { assignments: true, requiredSkills: true } },
        },
      });

      rows = projects.map(p => ({
        projectCode: p.projectCode,
        name: p.name,
        client: p.clientName || "Internal",
        status: p.status,
        priority: p.priority,
        manager: p.manager ? `${p.manager.firstName} ${p.manager.lastName}` : "—",
        startDate: p.startDate ? p.startDate.toISOString().split("T")[0] : "—",
        endDate: p.endDate ? p.endDate.toISOString().split("T")[0] : "—",
        completionPercent: p.completionPercent + "%",
        technologies: p.technologies,
        assignedEmployeesCount: p._count.assignments,
      }));
    }

    // 12. Support Ticket Report
    else if (type.includes("ticket")) {
      const where: any = {};
      if (ticketStatus) where.status = ticketStatus;
      if (ticketPriority) where.priority = ticketPriority;

      const tickets = await prisma.supportTicket.findMany({
        where,
        include: {
          employee: { select: { firstName: true, lastName: true, email: true } },
          manager: { select: { firstName: true, lastName: true, email: true } },
        },
      });

      rows = tickets.map(t => ({
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        category: t.category,
        priority: t.priority,
        status: t.status,
        createdBy: t.employee ? `${t.employee.firstName} ${t.employee.lastName}` : t.manager ? `${t.manager.firstName} ${t.manager.lastName}` : "System",
        createdAt: t.createdAt ? t.createdAt.toISOString().split("T")[0] : "—",
        slaStatus: t.slaStatus,
      }));
    }

    // 13. Audit Log Report
    else if (type.includes("audit")) {
      const logs = await prisma.auditLog.findMany({
        include: { user: { select: { email: true, role: true } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      });

      rows = logs.map(l => ({
        id: l.id,
        userEmail: l.user?.email || "SYSTEM",
        userRole: l.user?.role || "SYSTEM",
        action: l.action,
        component: l.component,
        ipAddress: l.ipAddress || "127.0.0.1",
        createdAt: l.createdAt.toISOString(),
      }));
    }

    // 14. Error Log Report
    else if (type.includes("error")) {
      const logs = await prisma.errorLog.findMany({
        include: { user: { select: { email: true } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      });

      rows = logs.map(l => ({
        id: l.id,
        user: l.user?.email || "SYSTEM",
        errorType: l.errorType,
        statusCode: l.statusCode,
        endpoint: l.endpoint,
        method: l.method,
        errorMessage: l.errorMessage,
        createdAt: l.createdAt.toISOString(),
      }));
    }

    // Default fallback if no rows matched
    if (!rows.length && type === "employee") {
      rows = [];
    }

    // Server-side Pagination calculation
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || (rows.length > 0 ? rows.length : 20);
    const total = rows.length;
    const totalPages = Math.ceil(total / limitNum) || 1;
    const paginatedRows = page ? rows.slice((pageNum - 1) * limitNum, pageNum * limitNum) : rows;

    return res.json({
      success: true,
      reportType: type,
      data: paginatedRows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// Direct export handler (CSV, XLSX, PDF)
export const exportGenericReport = async (req: Request, res: Response) => {
  try {
    const format = (req.params.format || req.query.format || "csv").toString().toLowerCase();
    const type = (req.params.type || req.query.type || "employee").toString().toLowerCase();

    // Re-use report query logic to get filtered rows
    req.query.limit = "10000"; // Fetch all filtered records for export
    
    // Call generic generator internally
    const reportRes: any = await new Promise((resolve) => {
      getGenericReport(req, {
        json: (data: any) => resolve(data),
        status: () => ({ json: (data: any) => resolve(data) }),
      } as any);
    });

    const rows = reportRes.data || [];
    const dateStr = getFormattedDate();
    const cleanType = type.replace(/_/g, "-");
    const filename = `${cleanType}_report_${dateStr}.${format === "excel" || format === "xlsx" ? "xlsx" : format === "pdf" ? "pdf" : "csv"}`;

    if (format === "csv") {
      const csvStr = convertToCsv(rows);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.send(csvStr);
    } else if (format === "xlsx" || format === "excel") {
      const csvStr = convertToCsv(rows);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.send(csvStr);
    } else {
      // PDF or JSON format payload for frontend PDF renderer
      return res.json({
        success: true,
        filename,
        format,
        data: rows,
      });
    }
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// Aliases for compatibility
export const reportEmployees = (req: Request, res: Response) => { req.params.type = "employee"; return getGenericReport(req, res); };
export const reportManagers = (req: Request, res: Response) => { req.params.type = "manager"; return getGenericReport(req, res); };
export const reportProjects = (req: Request, res: Response) => { req.params.type = "project"; return getGenericReport(req, res); };
export const reportTraining = (req: Request, res: Response) => { req.params.type = "training"; return getGenericReport(req, res); };
export const reportSkills = (req: Request, res: Response) => { req.params.type = "skill"; return getGenericReport(req, res); };
export const reportCertificates = (req: Request, res: Response) => { req.params.type = "certificate"; return getGenericReport(req, res); };
export const reportTickets = (req: Request, res: Response) => { req.params.type = "ticket"; return getGenericReport(req, res); };
export const reportDepartments = (req: Request, res: Response) => { req.params.type = "department"; return getGenericReport(req, res); };
export const reportTeams = (req: Request, res: Response) => { req.params.type = "team"; return getGenericReport(req, res); };
export const reportSkillGaps = (req: Request, res: Response) => { req.params.type = "skillgap"; return getGenericReport(req, res); };
export const reportAudit = (req: Request, res: Response) => { req.params.type = "audit"; return getGenericReport(req, res); };

export const reportDownloads = async (req: Request, res: Response) => {
  try {
    const downloads = await prisma.resumeDownload.findMany({
      include: {
        employee: { select: { firstName: true, lastName: true, employeeCode: true } },
        downloadedBy: { select: { email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    const rows = downloads.map(d => ({
      employee: `${d.employee.firstName} ${d.employee.lastName}`,
      employeeCode: d.employee.employeeCode,
      downloadedBy: d.downloadedBy.email,
      template: d.template,
      format: d.format,
      downloadedAt: d.createdAt,
    }));
    return res.json({ success: true, data: rows, total: rows.length });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const globalSearch = async (req: Request, res: Response) => {
  try {
    const { q } = req.query as any;
    if (!q || q.length < 2) return res.status(400).json({ success: false, message: "Query must be at least 2 characters" });

    const [employees, projects, skills, trainings, certificates] = await Promise.all([
      prisma.employee.findMany({
        where: {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { employeeCode: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
        include: { department: { select: { name: true } }, designation: { select: { name: true } } },
        take: 10,
      }),
      prisma.project.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { projectCode: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 10,
      }),
      prisma.skill.findMany({
        where: { OR: [{ skillName: { contains: q, mode: "insensitive" } }] },
        include: { category: { select: { name: true } } },
        take: 10,
      }),
      prisma.trainingPlan.findMany({
        where: { OR: [{ trainingTitle: { contains: q, mode: "insensitive" } }] },
        include: { employee: { select: { firstName: true, lastName: true } } },
        take: 10,
      }),
      prisma.certificate.findMany({
        where: { OR: [{ certificateName: { contains: q, mode: "insensitive" } }] },
        include: { employee: { select: { firstName: true, lastName: true } } },
        take: 10,
      }),
    ]);

    return res.json({
      success: true,
      data: {
        employees: employees.map(e => ({ type: "employee", id: e.id, label: `${e.firstName} ${e.lastName}`, sub: `${e.employeeCode} · ${e.department.name}` })),
        projects: projects.map(p => ({ type: "project", id: p.id, label: p.name, sub: `${p.projectCode} · ${p.status}` })),
        skills: skills.map(s => ({ type: "skill", id: s.id, label: s.skillName, sub: s.category.name })),
        trainings: trainings.map(t => ({ type: "training", id: t.id, label: t.trainingTitle, sub: `${t.employee.firstName} ${t.employee.lastName}` })),
        certificates: certificates.map(c => ({ type: "certificate", id: c.id, label: c.certificateName, sub: `${c.employee.firstName} ${c.employee.lastName}` })),
      },
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
