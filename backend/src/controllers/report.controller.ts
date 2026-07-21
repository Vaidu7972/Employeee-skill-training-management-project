import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------
// GET /api/reports/employees
// Flat table: all employees with key metrics
// ---------------------------------------------------------------
export const reportEmployees = async (req: Request, res: Response) => {
  try {
    const { departmentId, designationId, status, managerId, search } = req.query as any;
    const where: any = {};
    if (departmentId) where.departmentId = departmentId;
    if (designationId) where.designationId = designationId;
    if (status)       where.status = status;
    if (managerId)    where.managerId = managerId;
    if (search) {
      where.OR = [
        { firstName:    { contains: search, mode: "insensitive" } },
        { lastName:     { contains: search, mode: "insensitive" } },
        { employeeCode: { contains: search, mode: "insensitive" } },
        { email:        { contains: search, mode: "insensitive" } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        department:   { select: { name: true } },
        designation:  { select: { name: true } },
        manager:      { select: { firstName: true, lastName: true } },
        _count: {
          select: {
            employeeSkills:     true,
            trainingPlans:      true,
            certificates:       true,
            projectAssignments: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const rows = employees.map((e) => ({
      employeeCode:      e.employeeCode,
      name:              `${e.firstName} ${e.lastName}`,
      email:             e.email,
      department:        e.department.name,
      designation:       e.designation.name,
      manager:           e.manager ? `${e.manager.firstName} ${e.manager.lastName}` : "—",
      status:            e.accountStatus,
      workLocation:      e.workLocation,
      workMode:          e.workMode,
      employmentType:    e.employmentType,
      yearsOfExperience: e.yearsOfExperience,
      dateOfJoining:     e.dateOfJoining,
      skills:            e._count.employeeSkills,
      trainings:         e._count.trainingPlans,
      certificates:      e._count.certificates,
      projects:          e._count.projectAssignments,
    }));

    return res.json({ success: true, data: rows, total: rows.length });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// ---------------------------------------------------------------
// GET /api/reports/managers
// Manager capacity utilisation report
// ---------------------------------------------------------------
export const reportManagers = async (req: Request, res: Response) => {
  try {
    const defaultCap = await prisma.systemSetting.findUnique({
      where: { key: "MANAGER_DEFAULT_CAPACITY" },
    });
    const defCap = defaultCap ? parseInt(defaultCap.value) : 10;

    const managers = await prisma.employee.findMany({
      where: { user: { role: "MANAGER" } },
      include: {
        department:  { select: { name: true } },
        designation: { select: { name: true } },
        _count: { select: { subordinates: true } },
      },
    });

    const rows = managers.map((m) => {
      const maxCap = m.managerCapacity ?? defCap;
      const used   = m._count.subordinates;
      const pct    = Math.round((used / maxCap) * 100);
      return {
        employeeCode: m.employeeCode,
        name:         `${m.firstName} ${m.lastName}`,
        email:        m.email,
        department:   m.department.name,
        designation:  m.designation.name,
        maxCapacity:  maxCap,
        teamSize:     used,
        utilisation:  pct,
        status:       used >= maxCap ? "FULL" : used > maxCap ? "OVER" : "AVAILABLE",
      };
    });

    return res.json({ success: true, data: rows, total: rows.length });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// ---------------------------------------------------------------
// GET /api/reports/projects
// ---------------------------------------------------------------
export const reportProjects = async (req: Request, res: Response) => {
  try {
    const { status, priority, managerId, search } = req.query as any;
    const where: any = {};
    if (status)    where.status = status;
    if (priority)  where.priority = priority;
    if (managerId) where.managerId = managerId;
    if (search) {
      where.OR = [
        { name:        { contains: search, mode: "insensitive" } },
        { projectCode: { contains: search, mode: "insensitive" } },
        { clientName:  { contains: search, mode: "insensitive" } },
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        manager: { select: { firstName: true, lastName: true } },
        _count: {
          select: {
            assignments:    true,
            requiredSkills: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const rows = projects.map((p) => ({
      projectCode:      p.projectCode,
      name:             p.name,
      client:           p.clientName,
      status:           p.status,
      priority:         p.priority,
      manager:          p.manager ? `${p.manager.firstName} ${p.manager.lastName}` : "—",
      startDate:        p.startDate,
      endDate:          p.endDate,
      completion:       p.completionPercent,
      technologies:     p.technologies,
      teamSize:         p._count.assignments,
      requiredSkills:   p._count.requiredSkills,
    }));

    return res.json({ success: true, data: rows, total: rows.length });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// ---------------------------------------------------------------
// GET /api/reports/training
// ---------------------------------------------------------------
export const reportTraining = async (req: Request, res: Response) => {
  try {
    const { status, employeeId, search } = req.query as any;
    const where: any = {};
    if (status)     where.status = status;
    if (employeeId) where.employeeId = employeeId;
    if (search) {
      where.OR = [{ trainingTitle: { contains: search, mode: "insensitive" } }];
    }

    const plans = await prisma.trainingPlan.findMany({
      where,
      include: {
        employee: { select: { firstName: true, lastName: true, employeeCode: true } },
        skill:    { select: { skillName: true } },
        provider: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const rows = plans.map((t) => ({
      employee:       `${t.employee.firstName} ${t.employee.lastName}`,
      employeeCode:   t.employee.employeeCode,
      trainingTitle:  t.trainingTitle,
      skill:          t.skill.skillName,
      provider:       t.provider?.name || "Internal",
      type:           t.trainingType,
      status:         t.status,
      progress:       t.progress,
      plannedHours:   t.estimatedHours,
      actualHours:    t.actualHours,
      dueDate:        t.dueDate,
      completionDate: t.completionDate,
    }));

    return res.json({ success: true, data: rows, total: rows.length });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// ---------------------------------------------------------------
// GET /api/reports/skills
// ---------------------------------------------------------------
export const reportSkills = async (req: Request, res: Response) => {
  try {
    const { categoryId, status, search } = req.query as any;
    const where: any = {};
    if (status)     where.status = status;
    if (categoryId) where.skill = { categoryId };
    if (search) {
      where.OR = [{ skill: { skillName: { contains: search, mode: "insensitive" } } }];
    }

    const empSkills = await prisma.employeeSkill.findMany({
      where,
      include: {
        employee: { select: { firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } } },
        skill:    { include: { category: { select: { name: true } } } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const rows = empSkills.map((s) => ({
      employee:        `${s.employee.firstName} ${s.employee.lastName}`,
      employeeCode:    s.employee.employeeCode,
      department:      s.employee.department.name,
      skill:           s.skill.skillName,
      category:        s.skill.category.name,
      type:            s.skill.skillType,
      selfRating:      s.selfRating,
      finalRating:     s.finalRating,
      status:          s.status,
      expMonths:       s.experienceMonths,
      lastAssessed:    s.updatedAt,
    }));

    return res.json({ success: true, data: rows, total: rows.length });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// ---------------------------------------------------------------
// GET /api/reports/certificates
// ---------------------------------------------------------------
export const reportCertificates = async (req: Request, res: Response) => {
  try {
    const { verificationStatus, search } = req.query as any;
    const where: any = {};
    if (verificationStatus) where.verificationStatus = verificationStatus;
    if (search) {
      where.OR = [
        { certificateName:   { contains: search, mode: "insensitive" } },
        { issuingOrganization: { contains: search, mode: "insensitive" } },
      ];
    }

    const certs = await prisma.certificate.findMany({
      where,
      include: {
        employee: { select: { firstName: true, lastName: true, employeeCode: true } },
      },
      orderBy: { issueDate: "desc" },
    });

    const rows = certs.map((c) => ({
      employee:            `${c.employee.firstName} ${c.employee.lastName}`,
      employeeCode:        c.employee.employeeCode,
      certificateName:     c.certificateName,
      certificateNumber:   c.certificateNumber,
      issuingOrganization: c.issuingOrganization,
      issueDate:           c.issueDate,
      expiryDate:          c.expiryDate,
      verificationStatus:  c.verificationStatus,
    }));

    return res.json({ success: true, data: rows, total: rows.length });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// ---------------------------------------------------------------
// GET /api/reports/tickets
// ---------------------------------------------------------------
export const reportTickets = async (req: Request, res: Response) => {
  try {
    const { status, priority, search } = req.query as any;
    const where: any = {};
    if (status)   where.status = status;
    if (priority) where.priority = priority;
    if (search) {
      where.OR = [{ subject: { contains: search, mode: "insensitive" } }];
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        employee: { select: { email: true } },
        manager: { select: { email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const rows = tickets.map((t) => ({
      ticketNumber: t.ticketNumber,
      subject:      t.subject,
      category:     t.category,
      priority:     t.priority,
      status:       t.status,
      createdBy:    t.employee?.email || t.manager?.email || "—",
      assignedTo:   t.assignedAdminId || "—",
      createdAt:    t.createdAt,
      resolvedAt:   t.resolutionDate,
      slaBreached:  t.slaStatus === "BREACHED",
    }));

    return res.json({ success: true, data: rows, total: rows.length });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// ---------------------------------------------------------------
// GET /api/reports/downloads
// Resume download history
// ---------------------------------------------------------------
export const reportDownloads = async (req: Request, res: Response) => {
  try {
    const downloads = await prisma.resumeDownload.findMany({
      include: {
        employee:     { select: { firstName: true, lastName: true, employeeCode: true } },
        downloadedBy: { select: { email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const rows = downloads.map((d) => ({
      employee:     `${d.employee.firstName} ${d.employee.lastName}`,
      employeeCode: d.employee.employeeCode,
      downloadedBy: d.downloadedBy.email,
      template:     d.template,
      format:       d.format,
      downloadedAt: d.createdAt,
    }));

    return res.json({ success: true, data: rows, total: rows.length });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};


// ---------------------------------------------------------------
// GET /api/reports/departments
// ---------------------------------------------------------------
export const reportDepartments = async (req: Request, res: Response) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        employees: { select: { id: true, accountStatus: true } },
        skillRequirements: { select: { id: true } },
      }
    });

    const heads = await prisma.employee.findMany({
      where: { id: { in: departments.map(d => d.departmentHeadId).filter(Boolean) as string[] } },
      select: { id: true, firstName: true, lastName: true }
    });
    const headMap = new Map(heads.map(h => [h.id, `${h.firstName} ${h.lastName}`]));

    const rows = departments.map((d) => ({
      code:        d.code,
      name:        d.name,
      description: d.description || "—",
      head:        d.departmentHeadId ? headMap.get(d.departmentHeadId) || "—" : "—",
      status:      d.status,
      staffCount:  d.employees.filter(e => e.accountStatus === "ACTIVE").length,
      skillsCount: d.skillRequirements.length,
    }));

    return res.json({ success: true, data: rows, total: rows.length });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// ---------------------------------------------------------------
// GET /api/reports/teams
// ---------------------------------------------------------------
export const reportTeams = async (req: Request, res: Response) => {
  try {
    const managers = await prisma.employee.findMany({
      where: { user: { role: "MANAGER" } },
      include: {
        department: { select: { name: true } },
        subordinates: {
          include: {
            employeeSkills: {
              where: { status: "APPROVED" },
              select: { finalRating: true }
            },
            trainingPlans: {
              select: { status: true }
            },
            certificates: {
              select: { verificationStatus: true }
            }
          }
        }
      }
    });

    const rows = managers.map((m) => {
      const teamSize = m.subordinates.length;
      let totalRating = 0;
      let skillCount = 0;
      let completedTrainings = 0;
      let overdueTrainings = 0;
      let activeTrainings = 0;
      let pendingCerts = 0;

      m.subordinates.forEach(s => {
        s.employeeSkills.forEach(sk => {
          totalRating += sk.finalRating;
          skillCount++;
        });
        s.trainingPlans.forEach(tp => {
          if (tp.status === "COMPLETED" || tp.status === "VERIFIED") completedTrainings++;
          else if (tp.status === "OVERDUE") overdueTrainings++;
          else if (tp.status === "IN_PROGRESS" || tp.status === "ASSIGNED") activeTrainings++;
        });
        s.certificates.forEach(c => {
          if (c.verificationStatus === "PENDING") pendingCerts++;
        });
      });

      const avgRating = skillCount > 0 ? Number((totalRating / skillCount).toFixed(2)) : 0;

      return {
        manager: `${m.firstName} ${m.lastName}`,
        department: m.department?.name || "—",
        teamSize,
        avgSkillRating: avgRating,
        activeTrainings,
        completedTrainings,
        overdueTrainings,
        pendingCertificates: pendingCerts
      };
    });

    return res.json({ success: true, data: rows, total: rows.length });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// ---------------------------------------------------------------
// GET /api/reports/skillgaps
// ---------------------------------------------------------------
export const reportSkillGaps = async (req: Request, res: Response) => {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        department: {
          include: {
            skillRequirements: {
              include: { skill: { select: { skillName: true, skillCode: true } } }
            }
          }
        },
        designation: {
          include: {
            skillRequirements: {
              include: { skill: { select: { skillName: true, skillCode: true } } }
            }
          }
        },
        employeeSkills: {
          include: { skill: { select: { skillName: true, skillCode: true } } }
        }
      }
    });

    const rows: any[] = [];

    employees.forEach(emp => {
      const empSkillMap = new Map(emp.employeeSkills.map(es => [es.skillId, es]));
      const requiredSkillsMap = new Map<string, { skillName: string, skillCode: string, requiredLevel: number }>();
      
      emp.department.skillRequirements.forEach(req => {
        requiredSkillsMap.set(req.skillId, {
          skillName: req.skill.skillName,
          skillCode: req.skill.skillCode,
          requiredLevel: req.requiredLevel
        });
      });

      emp.designation.skillRequirements.forEach(req => {
        const existing = requiredSkillsMap.get(req.skillId);
        if (!existing || req.requiredLevel > existing.requiredLevel) {
          requiredSkillsMap.set(req.skillId, {
            skillName: req.skill.skillName,
            skillCode: req.skill.skillCode,
            requiredLevel: req.requiredLevel
          });
        }
      });

      requiredSkillsMap.forEach((req, skillId) => {
        const empSkill = empSkillMap.get(skillId);
        const currentLevel = empSkill && empSkill.status === "APPROVED" ? empSkill.finalRating : 0;
        const gap = req.requiredLevel - currentLevel;
        
        if (gap > 0) {
          rows.push({
            employeeCode: emp.employeeCode,
            name: `${emp.firstName} ${emp.lastName}`,
            department: emp.department.name,
            skillCode: req.skillCode,
            skillName: req.skillName,
            requiredLevel: req.requiredLevel,
            currentLevel,
            gap,
            priority: gap >= 3 ? "CRITICAL" : gap >= 2 ? "HIGH" : "MEDIUM"
          });
        }
      });
    });

    return res.json({ success: true, data: rows, total: rows.length });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// ---------------------------------------------------------------
// GET /api/reports/audit
// ---------------------------------------------------------------
export const reportAudit = async (req: Request, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: { select: { email: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    const rows = logs.map((log) => ({
      userEmail: log.user?.email || "SYSTEM",
      action: log.action,
      component: log.component,
      ipAddress: log.ipAddress || "—",
      createdAt: log.createdAt,
      details: log.oldValue || log.newValue ? `Old: ${JSON.stringify(log.oldValue).substring(0,60)}... | New: ${JSON.stringify(log.newValue).substring(0,60)}...` : "None"
    }));

    return res.json({ success: true, data: rows, total: rows.length });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// ---------------------------------------------------------------
// GET /api/reports/global-search
// Search across employees, projects, skills, trainings, certs
// ---------------------------------------------------------------
export const globalSearch = async (req: Request, res: Response) => {
  try {
    const { q } = req.query as any;
    if (!q || q.length < 2)
      return res.status(400).json({ success: false, message: "Query must be at least 2 characters" });

    const [employees, projects, skills, trainings, certificates] = await Promise.all([
      prisma.employee.findMany({
        where: {
          OR: [
            { firstName:    { contains: q, mode: "insensitive" } },
            { lastName:     { contains: q, mode: "insensitive" } },
            { employeeCode: { contains: q, mode: "insensitive" } },
            { email:        { contains: q, mode: "insensitive" } },
            { department:   { name: { contains: q, mode: "insensitive" } } },
            { designation:  { name: { contains: q, mode: "insensitive" } } },
            { manager:      { firstName: { contains: q, mode: "insensitive" } } },
            { manager:      { lastName: { contains: q, mode: "insensitive" } } },
          ],
        },
        include: {
          department:  { select: { name: true } },
          designation: { select: { name: true } },
          manager:     { select: { firstName: true, lastName: true } },
        },
        take: 10,
      }),
      prisma.project.findMany({
        where: {
          OR: [
            { name:        { contains: q, mode: "insensitive" } },
            { projectCode: { contains: q, mode: "insensitive" } },
            { clientName:  { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 10,
      }),
      prisma.skill.findMany({
        where: {
          OR: [
            { skillName: { contains: q, mode: "insensitive" } },
            { skillCode: { contains: q, mode: "insensitive" } },
          ],
        },
        include: { category: { select: { name: true } } },
        take: 10,
      }),
      prisma.trainingPlan.findMany({
        where: {
          OR: [
            { trainingTitle: { contains: q, mode: "insensitive" } },
            { skill: { skillName: { contains: q, mode: "insensitive" } } },
          ],
        },
        include: {
          employee: { select: { firstName: true, lastName: true, employeeCode: true } },
          skill: { select: { skillName: true } },
        },
        take: 10,
      }),
      prisma.certificate.findMany({
        where: {
          OR: [
            { certificateName: { contains: q, mode: "insensitive" } },
            { issuingOrganization: { contains: q, mode: "insensitive" } },
          ],
        },
        include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
        take: 10,
      }),
    ]);

    return res.json({
      success: true,
      data: {
        employees: employees.map((e) => ({
          type: "employee",
          id: e.id,
          label: `${e.firstName} ${e.lastName}`,
          sub: `${e.employeeCode} · ${e.department.name} · ${e.designation.name}${e.manager ? ` · Manager: ${e.manager.firstName} ${e.manager.lastName}` : ''}`,
          link: `/admin/employees`,
        })),
        projects: projects.map((p) => ({
          type: "project",
          id: p.id,
          label: p.name,
          sub: `${p.projectCode} · ${p.clientName || ""} · ${p.status}`,
          link: `/admin/projects`,
        })),
        skills: skills.map((s) => ({
          type: "skill",
          id: s.id,
          label: s.skillName,
          sub: `${s.skillCode} · ${s.category.name}`,
          link: `/admin/skills`,
        })),
        trainings: trainings.map((t) => ({
          type: "training",
          id: t.id,
          label: t.trainingTitle,
          sub: `${t.skill?.skillName || ""} · ${t.employee.firstName} ${t.employee.lastName}`,
          link: `/admin/training`,
        })),
        certificates: certificates.map((c) => ({
          type: "certificate",
          id: c.id,
          label: c.certificateName,
          sub: `${c.issuingOrganization} · ${c.employee.firstName} ${c.employee.lastName}`,
          link: `/admin/training`,
        })),
      },
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
