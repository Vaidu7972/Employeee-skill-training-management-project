import { Request, Response, NextFunction } from "express";
import { PrismaClient, AccountStatus } from "@prisma/client";
import { createAuditLog } from "../utils/audit";

const prisma = new PrismaClient();

// Helper to convert array of objects to CSV string
const convertToCSV = (data: any[], headers: string[]): string => {
  const csvRows = [];
  csvRows.push(headers.join(","));
  
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      const escaped = ("" + (val || "")).replace(/"/g, '\\"');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(","));
  }
  return csvRows.join("\n");
};

// ----------------------------------------------------
// Department Controllers
// ----------------------------------------------------

export const getDepartments = async (req: Request, res: Response, next: NextFunction) => {
  const { search, status, page = 1, limit = 10, exportCsv } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  try {
    const whereClause: any = {};
    if (status) {
      whereClause.status = status as AccountStatus;
    }
    if (search) {
      whereClause.OR = [
        { name: { contains: String(search), mode: "insensitive" } },
        { code: { contains: String(search), mode: "insensitive" } },
      ];
    }

    if (exportCsv === "true") {
      const departments = await prisma.department.findMany({
        where: whereClause,
        orderBy: { code: "asc" },
      });
      const csvData = convertToCSV(departments, ["id", "code", "name", "description", "status", "createdAt"]);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=departments.csv");
      return res.status(200).send(csvData);
    }

    const [departments, total] = await prisma.$transaction([
      prisma.department.findMany({
        where: whereClause,
        skip,
        take,
        orderBy: { code: "asc" },
      }),
      prisma.department.count({ where: whereClause }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Departments retrieved successfully",
      data: departments,
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

export const createDepartment = async (req: any, res: Response, next: NextFunction) => {
  const { code, name, description, departmentHeadId } = req.body;
  const userId = req.user.id;

  try {
    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: "Department code and name are required",
        code: "VALIDATION_ERROR",
      });
    }

    // Prevent duplicate codes
    const existing = await prisma.department.findUnique({ where: { code } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "A department with this code already exists",
        code: "VALIDATION_ERROR",
      });
    }

    const department = await prisma.department.create({
      data: {
        code,
        name,
        description,
        departmentHeadId,
      },
    });

    await createAuditLog(userId, "CREATE_DEPARTMENT", "ORGANIZATION", null, department);

    return res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: department,
    });
  } catch (err) {
    next(err);
  }
};

export const updateDepartment = async (req: any, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { name, description, departmentHeadId, status } = req.body;
  const userId = req.user.id;

  try {
    const oldDept = await prisma.department.findUnique({ where: { id } });
    if (!oldDept) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
        code: "NOT_FOUND",
      });
    }

    const updated = await prisma.department.update({
      where: { id },
      data: {
        name,
        description,
        departmentHeadId,
        status: status as AccountStatus,
      },
    });

    await createAuditLog(userId, "UPDATE_DEPARTMENT", "ORGANIZATION", oldDept, updated);

    return res.status(200).json({
      success: true,
      message: "Department updated successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------
// Designation Controllers
// ----------------------------------------------------

export const getDesignations = async (req: Request, res: Response, next: NextFunction) => {
  const { search, status, departmentId, page = 1, limit = 10, exportCsv } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  try {
    const whereClause: any = {};
    if (status) {
      whereClause.status = status as AccountStatus;
    }
    if (departmentId) {
      whereClause.departmentId = departmentId as string;
    }
    if (search) {
      whereClause.OR = [
        { name: { contains: String(search), mode: "insensitive" } },
        { code: { contains: String(search), mode: "insensitive" } },
      ];
    }

    if (exportCsv === "true") {
      const designations = await prisma.designation.findMany({
        where: whereClause,
        include: { department: true },
        orderBy: { level: "asc" },
      });
      const dataRows = designations.map(d => ({
        id: d.id,
        code: d.code,
        name: d.name,
        departmentName: d.department.name,
        level: d.level,
        status: d.status,
      }));
      const csvData = convertToCSV(dataRows, ["id", "code", "name", "departmentName", "level", "status"]);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=designations.csv");
      return res.status(200).send(csvData);
    }

    const [designations, total] = await prisma.$transaction([
      prisma.designation.findMany({
        where: whereClause,
        include: { department: true },
        skip,
        take,
        orderBy: { level: "asc" },
      }),
      prisma.designation.count({ where: whereClause }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Designations retrieved successfully",
      data: designations,
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

export const createDesignation = async (req: any, res: Response, next: NextFunction) => {
  const { code, name, departmentId, level, description } = req.body;
  const userId = req.user.id;

  try {
    if (!code || !name || !departmentId) {
      return res.status(400).json({
        success: false,
        message: "Code, name, and department are required",
        code: "VALIDATION_ERROR",
      });
    }

    const existing = await prisma.designation.findUnique({ where: { code } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "A designation with this code already exists",
        code: "VALIDATION_ERROR",
      });
    }

    const designation = await prisma.designation.create({
      data: {
        code,
        name,
        departmentId,
        level: level ? Number(level) : 1,
        description,
      },
    });

    await createAuditLog(userId, "CREATE_DESIGNATION", "ORGANIZATION", null, designation);

    return res.status(201).json({
      success: true,
      message: "Designation created successfully",
      data: designation,
    });
  } catch (err) {
    next(err);
  }
};

export const updateDesignation = async (req: any, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { name, departmentId, level, description, status } = req.body;
  const userId = req.user.id;

  try {
    const oldDesig = await prisma.designation.findUnique({ where: { id } });
    if (!oldDesig) {
      return res.status(404).json({
        success: false,
        message: "Designation not found",
        code: "NOT_FOUND",
      });
    }

    const updated = await prisma.designation.update({
      where: { id },
      data: {
        name,
        departmentId,
        level: level ? Number(level) : undefined,
        description,
        status: status as AccountStatus,
      },
    });

    await createAuditLog(userId, "UPDATE_DESIGNATION", "ORGANIZATION", oldDesig, updated);

    return res.status(200).json({
      success: true,
      message: "Designation updated successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};
