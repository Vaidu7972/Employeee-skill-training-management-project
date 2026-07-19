import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import logger from "../utils/logger";

const prisma = new PrismaClient();

// Helper to mask sensitive keys in request body
const maskBody = (body: any): string => {
  if (!body) return "";
  try {
    const cloned = JSON.parse(JSON.stringify(body));
    const sensitiveKeys = ["password", "passwordConfirm", "token", "refreshToken", "accessToken", "oldPassword", "newPassword"];
    
    const maskObject = (obj: any) => {
      for (const key in obj) {
        if (sensitiveKeys.includes(key)) {
          obj[key] = "********";
        } else if (typeof obj[key] === "object" && obj[key] !== null) {
          maskObject(obj[key]);
        }
      }
    };
    
    maskObject(cloned);
    return JSON.stringify(cloned);
  } catch (err) {
    return "[Body Unparseable]";
  }
};

export const globalErrorHandler = async (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.status || err.statusCode || 500;
  const errorCode = err.code || "INTERNAL_SERVER_ERROR";
  const errorMessage = err.message || "An unexpected error occurred.";
  const stackTrace = process.env.NODE_ENV === "production" ? null : err.stack;
  
  const userId = (req as any).user?.id || null;
  const ipAddress = req.ip || req.socket.remoteAddress || null;
  const userAgent = req.headers["user-agent"] || null;
  const requestBody = maskBody(req.body);
  const endpoint = req.originalUrl;
  const method = req.method;

  // Log to standard console/file logs
  logger.error(`${method} ${endpoint} - Status: ${statusCode} - Message: ${errorMessage}`);
  if (err.stack) {
    logger.error(err.stack);
  }

  // Attempt to write to database ErrorLog table
  try {
    await prisma.errorLog.create({
      data: {
        userId,
        endpoint,
        method,
        errorType: errorCode.toString(),
        errorMessage,
        stackTrace: err.stack || null,
        requestBody,
        statusCode,
        ipAddress,
        userAgent,
      },
    });
  } catch (dbErr) {
    // If database logging fails (e.g. table doesn't exist yet or connection down), log to winston
    logger.error("Failed to log error to PostgreSQL database: " + (dbErr as Error).message);
  }

  return res.status(statusCode).json({
    success: false,
    message: errorMessage,
    code: errorCode,
    errors: err.errors || [],
  });
};
