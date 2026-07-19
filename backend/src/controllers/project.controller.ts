import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { createAuditLog } from "../utils/audit";

const prisma = new PrismaClient();

const include = {
  manager: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
  assignments: {
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, designation: { select: { name: true } } } }
    }
  },
  requiredSkills: { include: { skill: { select: { id: true, skillName: true, skillCode: true } } } }
};

// GET /api/projects
export const getProjects = async (req: Request, res: Response) => {
  try {
    const { status, priority, managerId, search, page = "1", limit = "20" } = req.query as any;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = {};
    if (status)    where.status = status;
    if (priority)  where.priority = priority;
    if (managerId) where.managerId = managerId;
    if (search) {
      where.OR = [
        { name:        { contains: search, mode: "insensitive" } },
        { projectCode: { contains: search, mode: "insensitive" } },
        { clientName:  { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await prisma.$transaction([
      prisma.project.findMany({ where, include, skip, take: parseInt(limit), orderBy: { createdAt: "desc" } }),
      prisma.project.count({ where })
    ]);

    return res.json({ success: true, data, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// GET /api/projects/:id
export const getProjectById = async (req: Request, res: Response) => {
  try {
    const proj = await prisma.project.findUnique({ where: { id: req.params.id }, include });
    if (!proj) return res.status(404).json({ success: false, message: "Project not found" });
    return res.json({ success: true, data: proj });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// POST /api/projects
export const createProject = async (req: Request, res: Response) => {
  try {
    const { projectCode, name, description, clientName, status, priority, startDate, endDate,
            completionPercent, technologies, managerId, repositoryUrl, documentationUrl } = req.body;

    if (!projectCode || !name || !startDate)
      return res.status(400).json({ success: false, message: "projectCode, name, startDate are required" });

    const exists = await prisma.project.findUnique({ where: { projectCode } });
    if (exists) return res.status(409).json({ success: false, message: "Project code already exists" });

    const proj = await prisma.project.create({
      data: {
        projectCode, name, description, clientName,
        status: status || "PLANNING",
        priority: priority || "MEDIUM",
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        completionPercent: completionPercent || 0,
        technologies: technologies || "",
        managerId: managerId || null,
        repositoryUrl, documentationUrl,
        createdById: (req as any).user.id
      },
      include
    });

    await createAuditLog((req as any).user.id, "CREATE_PROJECT", "PROJECT", null, proj);

    return res.status(201).json({ success: true, data: proj });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// PUT /api/projects/:id
export const updateProject = async (req: Request, res: Response) => {
  try {
    const old = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!old) return res.status(404).json({ success: false, message: "Project not found" });

    const { name, description, clientName, status, priority, startDate, endDate,
            completionPercent, technologies, managerId, repositoryUrl, documentationUrl } = req.body;

    const proj = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        ...(name              !== undefined && { name }),
        ...(description       !== undefined && { description }),
        ...(clientName        !== undefined && { clientName }),
        ...(status            !== undefined && { status }),
        ...(priority          !== undefined && { priority }),
        ...(startDate         !== undefined && { startDate: new Date(startDate) }),
        ...(endDate           !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(completionPercent !== undefined && { completionPercent }),
        ...(technologies      !== undefined && { technologies }),
        ...(managerId         !== undefined && { managerId: managerId || null }),
        ...(repositoryUrl     !== undefined && { repositoryUrl }),
        ...(documentationUrl  !== undefined && { documentationUrl }),
      },
      include
    });

    if (old.status !== proj.status && proj.status === "COMPLETED") {
      const assignments = await prisma.projectAssignment.findMany({
        where: { projectId: proj.id, status: "ACTIVE" },
        include: { employee: true }
      });

      for (const assignment of assignments) {
        if (assignment.employee.userId) {
          await prisma.notification.create({
            data: {
              userId: assignment.employee.userId,
              title: "Project Completed",
              message: `Project ${proj.name} has been marked complete. Your contribution has been recorded.`,
              type: "PROJECT",
              deepLink: "/employee/projects"
            }
          });
        }
      }

      if (proj.managerId) {
        const manager = await prisma.employee.findUnique({ where: { id: proj.managerId } });
        if (manager?.userId) {
          await prisma.notification.create({
            data: {
              userId: manager.userId,
              title: "Project Completed",
              message: `Project ${proj.name} has transitioned to Completed status.`,
              type: "PROJECT",
              deepLink: "/manager/projects"
            }
          });
        }
      }
    }

    await createAuditLog((req as any).user.id, "UPDATE_PROJECT", "PROJECT", old, proj);

    return res.json({ success: true, data: proj });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// DELETE /api/projects/:id  (archive)
export const archiveProject = async (req: Request, res: Response) => {
  try {
    const proj = await prisma.project.update({
      where: { id: req.params.id },
      data: { status: "ARCHIVED" }
    });
    await createAuditLog((req as any).user.id, "ARCHIVE_PROJECT", "PROJECT", null, { id: proj.id });
    return res.json({ success: true, data: proj });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// DELETE /api/projects/:id/delete  (permanent)
export const deleteProject = async (req: Request, res: Response) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    await createAuditLog((req as any).user.id, "DELETE_PROJECT", "PROJECT", null, { id: req.params.id });
    return res.json({ success: true, message: "Project deleted" });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// POST /api/projects/:id/assign
export const assignEmployee = async (req: Request, res: Response) => {
  try {
    const { employeeId, role, responsibilities, contributionPercent } = req.body;
    if (!employeeId) return res.status(400).json({ success: false, message: "employeeId required" });

    const existing = await prisma.projectAssignment.findUnique({
      where: { projectId_employeeId: { projectId: req.params.id, employeeId } }
    });
    if (existing && existing.status === "ACTIVE")
      return res.status(409).json({ success: false, message: "Employee already assigned to this project" });

    let assignment;
    if (existing) {
      assignment = await prisma.projectAssignment.update({
        where: { id: existing.id },
        data: { status: "ACTIVE", role: role || existing.role, leftAt: null }
      });
    } else {
      assignment = await prisma.projectAssignment.create({
        data: {
          projectId: req.params.id, employeeId,
          role: role || "Developer",
          responsibilities: responsibilities || null,
          contributionPercent: contributionPercent || 100,
          assignedById: (req as any).user.id
        }
      });
    }

    // Notify employee
    const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (emp?.userId) {
      const proj = await prisma.project.findUnique({ where: { id: req.params.id } });
      await prisma.notification.create({
        data: {
          userId: emp.userId,
          title: "Project Assigned",
          message: `You have been assigned to project "${proj?.name}" as ${role || "Developer"}.`,
          type: "PROJECT",
          deepLink: `/employee/projects`
        }
      });
    }

    await createAuditLog((req as any).user.id, "ASSIGN_PROJECT_EMPLOYEE", "PROJECT", null, assignment);
    return res.json({ success: true, data: assignment });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// DELETE /api/projects/:id/unassign/:employeeId
export const unassignEmployee = async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    await prisma.projectAssignment.updateMany({
      where: { projectId: req.params.id, employeeId: req.params.employeeId, status: "ACTIVE" },
      data: { status: "REMOVED", leftAt: new Date() }
    });
    return res.json({ success: true, message: "Employee removed from project" });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// GET /api/projects/employee/:employeeId
export const getEmployeeProjects = async (req: Request, res: Response) => {
  try {
    const assignments = await prisma.projectAssignment.findMany({
      where: { employeeId: req.params.employeeId },
      include: {
        project: {
          include: {
            manager: { select: { firstName: true, lastName: true } },
            requiredSkills: { include: { skill: { select: { skillName: true } } } }
          }
        }
      },
      orderBy: { joinedAt: "desc" }
    });
    return res.json({ success: true, data: assignments });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// GET /api/projects/manager/:managerId
export const getManagerProjects = async (req: Request, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      where: { managerId: req.params.managerId },
      include: {
        assignments: {
          where: { status: "ACTIVE" },
          include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    return res.json({ success: true, data: projects });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// POST /api/projects/:id/skills
export const addProjectSkill = async (req: Request, res: Response) => {
  try {
    const { skillId, requiredLevel } = req.body;
    const req_ = await prisma.projectSkillRequirement.upsert({
      where: { projectId_skillId: { projectId: req.params.id, skillId } },
      update: { requiredLevel: requiredLevel || 3 },
      create: { projectId: req.params.id, skillId, requiredLevel: requiredLevel || 3 }
    });
    return res.json({ success: true, data: req_ });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
