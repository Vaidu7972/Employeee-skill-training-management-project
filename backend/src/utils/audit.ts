import { PrismaClient } from "@prisma/client";
import logger from "./logger";

const prisma = new PrismaClient();

export const createAuditLog = async (
  userId: string | null,
  action: string,
  component: string,
  oldValue: any = null,
  newValue: any = null,
  ipAddress: string | null = null
) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        component,
        oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
        newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
        ipAddress,
      },
    });
    logger.info(`Audit Log created: ${action} in ${component} by user ${userId || "SYSTEM"}`);
  } catch (err) {
    logger.error("Failed to create Audit Log: " + (err as Error).message);
  }
};
