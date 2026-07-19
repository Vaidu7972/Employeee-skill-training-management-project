import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { PrismaClient, SystemRole, AccountStatus, LoginStatus } from "@prisma/client";
import { createAuditLog } from "../utils/audit";
import logger from "../utils/logger";

const prisma = new PrismaClient();

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "skillsphere_super_secure_access_token_secret_2026";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "skillsphere_super_secure_refresh_token_secret_2026";
const ACCESS_EXP = process.env.JWT_ACCESS_EXPIRATION || "15m";
const REFRESH_EXP = process.env.JWT_REFRESH_EXPIRATION || "7d";

const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || "5");
const LOCK_TIME_MINUTES = parseInt(process.env.LOCK_TIME_MINUTES || "15");

// Generate standard tokens
const generateTokens = async (userId: string, role: SystemRole, email: string, familyUuid?: string) => {
  const accessToken = jwt.sign({ id: userId, email, role }, JWT_ACCESS_SECRET, { expiresIn: ACCESS_EXP as any });
  
  const family = familyUuid || crypto.randomUUID();
  const refreshToken = jwt.sign({ id: userId, family }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXP as any });
  
  // Parse expiration date for storage
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId,
      family,
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password, portal } = req.body;
  const ipAddress = req.ip || req.socket.remoteAddress || null;
  const userAgent = req.headers["user-agent"] || null;

  try {
    if (!email || !password || !portal) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and portal selection are required",
        code: "VALIDATION_ERROR",
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { employee: true },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        code: "UNAUTHORIZED",
      });
    }

    // Check account locking
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const lockRemaining = Math.round((user.lockedUntil.getTime() - Date.now()) / (1000 * 60));
      return res.status(423).json({
        success: false,
        message: `Account is temporarily locked. Try again in ${lockRemaining} minutes.`,
        code: "LOCKED",
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      // Increment login failures
      const failedCount = user.failedLoginCount + 1;
      const dataUpdate: any = { failedLoginCount: failedCount };
      
      if (failedCount >= MAX_LOGIN_ATTEMPTS) {
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + LOCK_TIME_MINUTES);
        dataUpdate.lockedUntil = lockUntil;
        dataUpdate.failedLoginCount = 0; // reset failures once locked
      }

      await prisma.user.update({
        where: { id: user.id },
        data: dataUpdate,
      });

      // Record login history
      await prisma.loginHistory.create({
        data: {
          userId: user.id,
          ipAddress,
          userAgent,
          status: LoginStatus.FAILED,
        },
      });

      return res.status(401).json({
        success: false,
        message: failedCount >= MAX_LOGIN_ATTEMPTS 
          ? `Invalid credentials. Account locked for ${LOCK_TIME_MINUTES} minutes.` 
          : `Invalid credentials. ${MAX_LOGIN_ATTEMPTS - failedCount} attempts remaining.`,
        code: "UNAUTHORIZED",
      });
    }

    // Validate Portal vs Role
    // Portal options: "ADMIN_PORTAL", "MANAGER_PORTAL", "EMPLOYEE_PORTAL"
    let isPortalAuthorized = false;
    if (portal === "ADMIN_PORTAL" && (user.role === SystemRole.SUPER_ADMIN || user.role === SystemRole.ADMIN_SUPPORT)) {
      isPortalAuthorized = true;
    } else if (
      portal === "MANAGER_PORTAL" &&
      ([SystemRole.MANAGER, SystemRole.SUPER_ADMIN, SystemRole.ADMIN_SUPPORT] as SystemRole[]).includes(user.role)
    ) {
      isPortalAuthorized = true;
    } else if (portal === "EMPLOYEE_PORTAL" && user.role === SystemRole.EMPLOYEE) {
      isPortalAuthorized = true;
    }

    if (!isPortalAuthorized) {
      // Record failed history due to unauthorized portal
      await prisma.loginHistory.create({
        data: {
          userId: user.id,
          ipAddress,
          userAgent,
          status: LoginStatus.FAILED,
        },
      });
      return res.status(403).json({
        success: false,
        message: "This account is not authorized for the selected portal. Use the correct portal for your role.",
        code: "FORBIDDEN",
      });
    }

    // Reset login failures and unlock
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    // Generate access & refresh tokens
    const { accessToken, refreshToken } = await generateTokens(user.id, user.role, user.email);

    // Save login history
    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        ipAddress,
        userAgent,
        status: LoginStatus.SUCCESS,
      },
    });

    // Log audit
    await createAuditLog(user.id, "LOGIN", "AUTH", null, { portal }, ipAddress);

    // Send successful response
    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.employee?.firstName || "System",
          lastName: user.employee?.lastName || "Admin",
          employeeId: user.employee?.id || null,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const rotateToken = async (req: Request, res: Response, next: NextFunction) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: "Refresh token is required",
      code: "VALIDATION_ERROR",
    });
  }

  try {
    // Find refresh token in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    // 1. Token doesn't exist (potential reuse attack!)
    if (!storedToken) {
      try {
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { id: string; family: string };
        // Someone is reusing a token that was deleted/rotated. Wipe family for safety.
        await prisma.refreshToken.deleteMany({
          where: { family: decoded.family },
        });
        logger.warn(`Security Warning: Refresh token reuse detected. Revoking family ${decoded.family}`);
      } catch (err) {
        // Token was invalid anyway
      }
      return res.status(401).json({
        success: false,
        message: "Invalid session",
        code: "UNAUTHORIZED",
      });
    }

    // 2. Token is revoked
    if (storedToken.isRevoked) {
      // Wipe the whole token family
      await prisma.refreshToken.updateMany({
        where: { family: storedToken.family },
        data: { isRevoked: true },
      });
      return res.status(401).json({
        success: false,
        message: "Session has been compromised. Please log in again.",
        code: "UNAUTHORIZED",
      });
    }

    // 3. Token is expired
    if (storedToken.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please log in again.",
        code: "UNAUTHORIZED",
      });
    }

    // Revoke the old token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    // Generate new pair under same family
    const { accessToken: newAccess, refreshToken: newRefresh } = await generateTokens(
      storedToken.userId,
      storedToken.user.role,
      storedToken.user.email,
      storedToken.family
    );

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        accessToken: newAccess,
        refreshToken: newRefresh,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  const { refreshToken } = req.body;
  const ipAddress = req.ip || req.socket.remoteAddress || null;

  try {
    if (refreshToken) {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { id: string; family: string };
      // Delete token family
      await prisma.refreshToken.deleteMany({
        where: { family: decoded.family },
      });
      await createAuditLog(decoded.id, "LOGOUT", "AUTH", null, null, ipAddress);
    }

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (err) {
    // If JWT verification fails, just return success
    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  }
};

export const logoutFromAllDevices = async (req: any, res: Response, next: NextFunction) => {
  const userId = req.user.id;
  const ipAddress = req.ip || req.socket.remoteAddress || null;

  try {
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
    
    await createAuditLog(userId, "LOGOUT_ALL_DEVICES", "AUTH", null, null, ipAddress);

    return res.status(200).json({
      success: true,
      message: "Logged out from all devices successfully",
    });
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req: any, res: Response, next: NextFunction) => {
  const userId = req.user.id;
  const { oldPassword, newPassword } = req.body;

  try {
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Old password and new password are required",
        code: "VALIDATION_ERROR",
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Incorrect current password",
        code: "VALIDATION_ERROR",
      });
    }

    // Password strength check (e.g. min 8 chars, 1 uppercase, 1 symbol)
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
        code: "WEAK_PASSWORD",
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Invalidate all active sessions for security on password change
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });

    await createAuditLog(userId, "CHANGE_PASSWORD", "AUTH", null, null);

    return res.status(200).json({
      success: true,
      message: "Password changed successfully. Please log in again.",
    });
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return success to prevent email enumeration
      return res.status(200).json({
        success: true,
        message: "If the email exists, a password reset link has been generated.",
      });
    }

    // Generate a temporary reset token (expires in 1 hour)
    const resetToken = jwt.sign({ id: user.id }, JWT_ACCESS_SECRET, { expiresIn: "1h" });
    
    // In production we send an email. For local development, log to the terminal console
    logger.info(`--- PASSWORD RESET REQUEST FOR ${email} ---`);
    logger.info(`Reset Token: ${resetToken}`);
    logger.info(`-------------------------------------------`);

    return res.status(200).json({
      success: true,
      message: "If the email exists, a password reset link has been generated.",
      // Pass token in response ONLY in development mode to help testing
      data: process.env.NODE_ENV !== "production" ? { resetToken } : null,
    });
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { token, newPassword } = req.body;
  try {
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required",
        code: "VALIDATION_ERROR",
      });
    }

    const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as { id: string };
    
    // Check password strength
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
        code: "WEAK_PASSWORD",
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: decoded.id },
      data: {
        passwordHash,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    // Invalidate refresh tokens
    await prisma.refreshToken.deleteMany({
      where: { userId: decoded.id },
    });

    await createAuditLog(decoded.id, "RESET_PASSWORD", "AUTH", null, null);

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now log in.",
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired reset token",
      code: "VALIDATION_ERROR",
    });
  }
};
