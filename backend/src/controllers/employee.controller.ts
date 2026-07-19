import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { PrismaClient, SystemRole, AccountStatus } from "@prisma/client";
import { createAuditLog } from "../utils/audit";

const prisma = new PrismaClient();

// Helper to convert CSV string to array of objects
const parseCSV = (csvText: string): any[] => {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const results = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || "";
    });
    results.push(obj);
  }
  return results;
};

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
// Manager Capacity & Allocation Helpers
// ----------------------------------------------------

export const getManagerCapacityDetails = async (managerId: string) => {
  // Count active team members
  const currentTeamSize = await prisma.employee.count({
    where: {
      managerId,
      accountStatus: AccountStatus.ACTIVE,
    },
  });

  // Get manager's custom capacity
  const manager = await prisma.employee.findUnique({
    where: { id: managerId },
    select: { managerCapacity: true },
  });

  let maxCapacity = manager?.managerCapacity || 0;
  if (!maxCapacity) {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "MANAGER_DEFAULT_CAPACITY" },
    });
    maxCapacity = setting ? (parseInt(setting.value) || 10) : 10;
  }

  const availableCapacity = maxCapacity - currentTeamSize;
  const capacityPercentage = maxCapacity > 0 ? (currentTeamSize / maxCapacity) * 100 : 0;
  
  let capacityStatus = "AVAILABLE";
  if (currentTeamSize > maxCapacity) {
    capacityStatus = "OVER_CAPACITY";
  } else if (currentTeamSize === maxCapacity) {
    capacityStatus = "FULL";
  } else if (capacityPercentage >= 80) {
    capacityStatus = "NEARLY_FULL";
  }

  return {
    currentTeamSize,
    maxCapacity,
    availableCapacity,
    capacityPercentage,
    capacityStatus,
  };
};

export const getManagersCapacity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const managers = await prisma.employee.findMany({
      where: {
        user: {
          role: SystemRole.MANAGER,
        },
        accountStatus: AccountStatus.ACTIVE,
      },
      include: {
        department: true,
      },
    });

    const capacityReports = [];
    for (const m of managers) {
      const cap = await getManagerCapacityDetails(m.id);
      capacityReports.push({
        managerId: m.id,
        managerName: `${m.firstName} ${m.lastName}`,
        department: m.department.name,
        ...cap,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Manager capacities retrieved successfully",
      data: capacityReports,
    });
  } catch (err) {
    next(err);
  }
};

// Auto Allocate Manager logic
export const autoAllocateManager = async (departmentId: string): Promise<string | null> => {
  // 1. Get active managers in this department
  const deptManagers = await prisma.employee.findMany({
    where: {
      departmentId,
      accountStatus: AccountStatus.ACTIVE,
      user: {
        role: SystemRole.MANAGER,
      },
    },
  });

  let bestManagerId: string | null = null;
  let lowestTeamCount = Infinity;

  // Find manager in department with lowest active team count
  for (const m of deptManagers) {
    const cap = await getManagerCapacityDetails(m.id);
    if (cap.capacityStatus !== "FULL" && cap.capacityStatus !== "OVER_CAPACITY") {
      if (cap.currentTeamSize < lowestTeamCount) {
        lowestTeamCount = cap.currentTeamSize;
        bestManagerId = m.id;
      }
    }
  }

  // 2. Fallback to active managers in other departments if department manager is not available
  if (!bestManagerId) {
    const otherManagers = await prisma.employee.findMany({
      where: {
        departmentId: { not: departmentId },
        accountStatus: AccountStatus.ACTIVE,
        user: {
          role: SystemRole.MANAGER,
        },
      },
    });

    for (const m of otherManagers) {
      const cap = await getManagerCapacityDetails(m.id);
      if (cap.capacityStatus !== "FULL" && cap.capacityStatus !== "OVER_CAPACITY") {
        if (cap.currentTeamSize < lowestTeamCount) {
          lowestTeamCount = cap.currentTeamSize;
          bestManagerId = m.id;
        }
      }
    }
  }

  return bestManagerId;
};

// Reassign Manager API handler
export const allocateManagerAPI = async (req: any, res: Response, next: NextFunction) => {
  const { employeeId, managerId, overrideReason, forceOverride } = req.body;
  const adminUserId = req.user.id;

  try {
    if (!employeeId || !managerId) {
      return res.status(400).json({
        success: false,
        message: "Employee ID and Manager ID are required",
        code: "VALIDATION_ERROR",
      });
    }

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    const manager = await prisma.employee.findUnique({
      where: { id: managerId },
      include: { user: true },
    });

    if (!employee || !manager || manager.user?.role !== SystemRole.MANAGER) {
      return res.status(404).json({
        success: false,
        message: "Employee or Manager record not found",
        code: "NOT_FOUND",
      });
    }

    const cap = await getManagerCapacityDetails(managerId);
    if (cap.capacityStatus === "FULL" || cap.capacityStatus === "OVER_CAPACITY") {
      if (!forceOverride || !overrideReason) {
        return res.status(400).json({
          success: false,
          message: "Manager is at full capacity. Override requires a mandatory reason.",
          code: "CAPACITY_FULL",
          data: cap,
        });
      }
    }

    // Process Reassignment Transaction
    await prisma.$transaction(async (tx) => {
      // Deactivate old active manager assignment if exists
      const oldActive = await tx.managerAssignment.findFirst({
        where: { employeeId, status: "ACTIVE" },
      });

      if (oldActive) {
        await tx.managerAssignment.update({
          where: { id: oldActive.id },
          data: { status: "INACTIVE" },
        });

        await tx.managerAssignmentHistory.create({
          data: {
            employeeId,
            managerId: oldActive.managerId,
            assignedById: oldActive.assignedById,
            assignedAt: oldActive.assignedAt,
            reason: "Reassigned to a new manager",
          },
        });
      }

      // Create new assignment
      await tx.managerAssignment.create({
        data: {
          employeeId,
          managerId,
          assignedById: adminUserId,
          reason: overrideReason || "Standard manager assignment",
        },
      });

      // Update Employee record
      await tx.employee.update({
        where: { id: employeeId },
        data: { managerId },
      });
    });

    await createAuditLog(
      adminUserId,
      "ALLOCATE_MANAGER",
      "EMPLOYEE",
      { oldManagerId: employee.managerId },
      { newManagerId: managerId, reason: overrideReason }
    );

    const updatedEmployee = await prisma.employee.findUnique({ where: { id: employeeId }, include: { user: true, manager: { include: { user: true } } } });
    if (updatedEmployee?.userId) {
      await prisma.notification.create({
        data: {
          userId: updatedEmployee.userId,
          title: "Manager Assigned",
          message: `Your manager has been updated to ${manager.firstName} ${manager.lastName}.`,
          type: "MANAGER",
          deepLink: "/employee/profile"
        }
      });
    }

    if (manager.userId) {
      await prisma.notification.create({
        data: {
          userId: manager.userId,
          title: "New Team Member",
          message: `${employee.firstName} ${employee.lastName} has been assigned to your team.`,
          type: "MANAGER",
          deepLink: "/manager/team"
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: "Manager allocated successfully",
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------
// Employee CRUD Controllers
// ----------------------------------------------------

export const getEmployees = async (req: Request, res: Response, next: NextFunction) => {
  const { search, departmentId, designationId, managerId, status, page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  try {
    const whereClause: any = {};
    if (status) {
      whereClause.accountStatus = status as AccountStatus;
    }
    if (departmentId) {
      whereClause.departmentId = departmentId as string;
    }
    if (designationId) {
      whereClause.designationId = designationId as string;
    }
    if (managerId) {
      whereClause.managerId = managerId as string;
    }
    if (search) {
      whereClause.OR = [
        { firstName: { contains: String(search), mode: "insensitive" } },
        { lastName: { contains: String(search), mode: "insensitive" } },
        { employeeCode: { contains: String(search), mode: "insensitive" } },
        { email: { contains: String(search), mode: "insensitive" } },
      ];
    }

    const [employees, total] = await prisma.$transaction([
      prisma.employee.findMany({
        where: whereClause,
        include: {
          department: true,
          designation: true,
          manager: true,
          user: true,
        },
        skip,
        take,
        orderBy: { employeeCode: "asc" },
      }),
      prisma.employee.count({ where: whereClause }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Employees retrieved successfully",
      data: employees,
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

export const createEmployee = async (req: any, res: Response, next: NextFunction) => {
  const {
    employeeCode,
    firstName,
    lastName,
    email,
    phone,
    departmentId,
    designationId,
    managerId,
    dateOfJoining,
    yearsOfExperience,
    employmentType,
    workLocation,
    workMode,
    role, // SystemRole
    managerCapacity,
    careerObjective,
  } = req.body;
  const creatorUserId = req.user.id;

  try {
    if (!employeeCode || !firstName || !lastName || !email || !departmentId || !designationId || !dateOfJoining) {
      return res.status(400).json({
        success: false,
        message: "Required employee details are missing",
        code: "VALIDATION_ERROR",
      });
    }

    // Verify uniqueness
    const codeDup = await prisma.employee.findUnique({ where: { employeeCode } });
    if (codeDup) {
      return res.status(400).json({
        success: false,
        message: "Employee Code is already assigned",
        code: "VALIDATION_ERROR",
      });
    }

    const emailDup = await prisma.employee.findUnique({ where: { email } });
    if (emailDup) {
      return res.status(400).json({
        success: false,
        message: "Employee Email is already registered",
        code: "VALIDATION_ERROR",
      });
    }

    // Resolve Manager Allocation
    let finalManagerId = managerId || null;
    if (!finalManagerId && role !== SystemRole.SUPER_ADMIN && role !== SystemRole.ADMIN_SUPPORT && role !== SystemRole.MANAGER) {
      // Auto-assign manager
      finalManagerId = await autoAllocateManager(departmentId);
    }

    // Hash default password based on Role
    const defaultPassword = role === SystemRole.MANAGER ? "Manager@2026" : "Employee@2026";
    const passwordHash = await bcrypt.hash(defaultPassword, 12);

    const employee = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: (role as SystemRole) || SystemRole.EMPLOYEE,
        },
      });

      // Create employee profile
      const emp = await tx.employee.create({
        data: {
          employeeCode,
          firstName,
          lastName,
          email,
          phone,
          departmentId,
          designationId,
          managerId: finalManagerId,
          dateOfJoining: new Date(dateOfJoining),
          yearsOfExperience: Number(yearsOfExperience || 0),
          employmentType: employmentType || "FULL_TIME",
          workLocation,
          workMode: workMode || "HYBRID",
          userId: user.id,
          profileCompletion: 30, // Initial completion score
          managerCapacity: managerCapacity ? Number(managerCapacity) : null,
          careerObjective: careerObjective || null,
        },
      });

      // Create manager assignment history
      if (finalManagerId) {
        await tx.managerAssignment.create({
          data: {
            employeeId: emp.id,
            managerId: finalManagerId,
            assignedById: creatorUserId,
            reason: "Initial manager allocation",
          },
        });
      }

      // Initialize notification preference
      await tx.notificationPreference.create({
        data: {
          userId: user.id,
        },
      });

      return emp;
    });

    await createAuditLog(creatorUserId, "CREATE_EMPLOYEE", "EMPLOYEE", null, employee);

    return res.status(201).json({
      success: true,
      message: "Employee profile and user account created successfully",
      data: employee,
    });
  } catch (err) {
    next(err);
  }
};

export const updateEmployee = async (req: any, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const {
    firstName,
    lastName,
    phone,
    departmentId,
    designationId,
    yearsOfExperience,
    employmentType,
    workLocation,
    workMode,
    profileImage,
    profileCompletion,
    managerCapacity,
    careerObjective,
  } = req.body;
  const actorId = req.user.id;

  try {
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
        code: "NOT_FOUND",
      });
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        firstName,
        lastName,
        phone,
        departmentId,
        designationId,
        yearsOfExperience: yearsOfExperience ? Number(yearsOfExperience) : undefined,
        employmentType,
        workLocation,
        workMode,
        profileImage,
        profileCompletion: profileCompletion ? Number(profileCompletion) : undefined,
        managerCapacity: managerCapacity !== undefined ? (managerCapacity ? Number(managerCapacity) : null) : undefined,
        careerObjective,
      },
    });

    await createAuditLog(actorId, "UPDATE_EMPLOYEE", "EMPLOYEE", employee, updated);

    return res.status(200).json({
      success: true,
      message: "Employee profile updated successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const toggleEmployeeStatus = async (req: any, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { status } = req.body; // ACTIVE, INACTIVE
  const actorId = req.user.id;

  try {
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
        code: "NOT_FOUND",
      });
    }

    const newStatus = status as AccountStatus;

    await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id },
        data: { accountStatus: newStatus },
      });

      if (employee.userId) {
        await tx.user.update({
          where: { id: employee.userId },
          data: { status: newStatus },
        });

        // If deactivating, wipe active refresh tokens
        if (newStatus === AccountStatus.INACTIVE) {
          await tx.refreshToken.deleteMany({
            where: { userId: employee.userId },
          });
        }
      }
    });

    await createAuditLog(actorId, `TOGGLE_STATUS_${newStatus}`, "EMPLOYEE", { status: employee.accountStatus }, { status: newStatus });

    return res.status(200).json({
      success: true,
      message: `Employee account status changed to ${newStatus}`,
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------
// CSV Import & Export Handlers
// ----------------------------------------------------

export const exportEmployeesCSV = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        department: true,
        designation: true,
        manager: true,
      },
    });

    const headers = [
      "employeeCode",
      "firstName",
      "lastName",
      "email",
      "phone",
      "department",
      "designation",
      "manager",
      "dateOfJoining",
      "yearsOfExperience",
      "workMode",
      "accountStatus",
    ];

    const data = employees.map(emp => ({
      employeeCode: emp.employeeCode,
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      phone: emp.phone || "",
      department: emp.department.name,
      designation: emp.designation.name,
      manager: emp.manager ? `${emp.manager.firstName} ${emp.manager.lastName}` : "None",
      dateOfJoining: emp.dateOfJoining.toISOString().split("T")[0],
      yearsOfExperience: emp.yearsOfExperience.toString(),
      workMode: emp.workMode,
      accountStatus: emp.accountStatus,
    }));

    const csvString = convertToCSV(data, headers);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=employees_export.csv");
    return res.status(200).send(csvString);
  } catch (err) {
    next(err);
  }
};

export const importEmployeesCSV = async (req: any, res: Response, next: NextFunction) => {
  const actorId = req.user.id;
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "CSV file is required for upload",
        code: "VALIDATION_ERROR",
      });
    }

    const csvText = req.file.buffer.toString("utf-8");
    const parsedData = parseCSV(csvText);

    let createdCount = 0;
    const errors: string[] = [];

    // Process each line in the CSV
    for (const row of parsedData) {
      try {
        const {
          employeeCode,
          firstName,
          lastName,
          email,
          phone,
          departmentCode,
          designationCode,
          dateOfJoining,
          yearsOfExperience,
          role,
        } = row;

        if (!employeeCode || !firstName || !lastName || !email || !departmentCode || !designationCode) {
          errors.push(`Row with Code ${employeeCode || "unknown"}: Missing required parameters.`);
          continue;
        }

        // Check if code or email exists
        const codeDup = await prisma.employee.findUnique({ where: { employeeCode } });
        const emailDup = await prisma.employee.findUnique({ where: { email } });
        if (codeDup || emailDup) {
          errors.push(`Row with Code ${employeeCode}: Code or email already exists.`);
          continue;
        }

        // Resolve department & designation ids from codes
        const dept = await prisma.department.findUnique({ where: { code: departmentCode } });
        const desig = await prisma.designation.findUnique({ where: { code: designationCode } });
        if (!dept || !desig) {
          errors.push(`Row with Code ${employeeCode}: Department or Designation code is invalid.`);
          continue;
        }

        // Auto allocate manager
        const resolvedManagerId = await autoAllocateManager(dept.id);
        const defaultPassword = role === SystemRole.MANAGER ? "Manager@2026" : "Employee@2026";
        const passwordHash = await bcrypt.hash(defaultPassword, 12);

        await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              email,
              passwordHash,
              role: (role as SystemRole) || SystemRole.EMPLOYEE,
            },
          });

          const emp = await tx.employee.create({
            data: {
              employeeCode,
              firstName,
              lastName,
              email,
              phone,
              departmentId: dept.id,
              designationId: desig.id,
              managerId: resolvedManagerId,
              dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : new Date(),
              yearsOfExperience: Number(yearsOfExperience || 0),
              userId: user.id,
              profileCompletion: 30,
            },
          });

          if (resolvedManagerId) {
            await tx.managerAssignment.create({
              data: {
                employeeId: emp.id,
                managerId: resolvedManagerId,
                assignedById: actorId,
                reason: "Bulk assignment via CSV import",
              },
            });
          }

          await tx.notificationPreference.create({
            data: {
              userId: user.id,
            },
          });
        });

        createdCount++;
      } catch (err) {
        errors.push(`Row with Code ${row.employeeCode || "unknown"}: Exception - ${(err as Error).message}`);
      }
    }

    await createAuditLog(actorId, "IMPORT_EMPLOYEES_CSV", "EMPLOYEE", null, { createdCount, failedCount: errors.length });

    return res.status(200).json({
      success: true,
      message: `CSV import completed: ${createdCount} employees created, ${errors.length} failed.`,
      data: {
        createdCount,
        failedCount: errors.length,
        errors,
      },
    });
  } catch (err) {
    next(err);
  }
};
