import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient, SystemRole, AccountStatus } from "@prisma/client";

const prisma = new PrismaClient();
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "skillsphere_super_secure_access_token_secret_2026";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: SystemRole;
    employeeId?: string; // Cache the associated Employee record ID
  };
}

// 1. Authenticate JWT Access Token
export const authenticateJWT = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access token is missing or invalid",
        code: "UNAUTHORIZED",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as {
      id: string;
      email: string;
      role: SystemRole;
    };

    // Fetch user from DB to confirm status is ACTIVE
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { employee: true },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account no longer exists",
        code: "UNAUTHORIZED",
      });
    }

    if (user.status === AccountStatus.INACTIVE) {
      return res.status(403).json({
        success: false,
        message: "Your user account has been deactivated",
        code: "FORBIDDEN",
      });
    }

    // Attach user metadata to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employee?.id || undefined,
    };

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Session expired or invalid token",
      code: "UNAUTHORIZED",
    });
  }
};

// 2. Authorize Roles (RBAC)
export const requireRoles = (allowedRoles: SystemRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User is not authenticated",
        code: "UNAUTHORIZED",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "This account is not authorized for this resource.",
        code: "FORBIDDEN",
      });
    }

    next();
  };
};

// 3. Verify Record Ownership or Manager Relationship
// Rules:
// - SUPER_ADMIN & ADMIN_SUPPORT can access anything
// - EMPLOYEE can only access their own employeeId
// - MANAGER can only access employees where managerId = MANAGER's employeeId
export const checkAccessRight = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User is not authenticated",
        code: "UNAUTHORIZED",
      });
    }

    const { role, id: userId, employeeId: userEmployeeId } = req.user;
    
    // Admins bypass this check
    if (role === SystemRole.SUPER_ADMIN || role === SystemRole.ADMIN_SUPPORT) {
      return next();
    }

    const targetEmployeeId = req.params.employeeId || req.query.employeeId || req.body.employeeId;

    if (!targetEmployeeId) {
      // No employee resource ID specified, proceed to standard controller
      return next();
    }

    // Employee checking self
    if (role === SystemRole.EMPLOYEE) {
      if (userEmployeeId !== targetEmployeeId) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to access another employee's records.",
          code: "FORBIDDEN",
        });
      }
      return next();
    }

    // Manager checking subordinate
    if (role === SystemRole.MANAGER) {
      if (!userEmployeeId) {
        return res.status(403).json({
          success: false,
          message: "Manager record not associated with this user.",
          code: "FORBIDDEN",
        });
      }

      // Check if targetEmployeeId belongs to this manager's team
      const subordinate = await prisma.employee.findFirst({
        where: {
          id: targetEmployeeId,
          managerId: userEmployeeId,
        },
      });

      if (!subordinate && userEmployeeId !== targetEmployeeId) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to view or manage this employee's records.",
          code: "FORBIDDEN",
        });
      }
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "Invalid role access criteria",
      code: "FORBIDDEN",
    });
  } catch (err) {
    next(err);
  }
};
