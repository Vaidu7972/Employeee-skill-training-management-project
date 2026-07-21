import cron from "node-cron";
import { PrismaClient, SlaStatus, TicketPriority } from "@prisma/client";
import logger from "../utils/logger";

const prisma = new PrismaClient();

// Map priorities to hours for SLA
export const SLA_HOURS: Record<TicketPriority, number> = {
  CRITICAL: 1,
  HIGH: 4,
  MEDIUM: 8,
  LOW: 24,
};

// Check ticket SLA status every 5 minutes
export const initSlaScheduler = () => {
  logger.info("Initializing Ticket SLA Cron Job (runs every 5 minutes)...");
  
  cron.schedule("*/5 * * * *", async () => {
    logger.debug("Running SLA Status Check...");
    try {
      const activeTickets = await prisma.supportTicket.findMany({
        where: {
          status: {
            in: ["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_USER", "REOPENED"],
          },
          slaStatus: {
            in: ["WITHIN_SLA", "NEAR_BREACH"],
          },
        },
        include: {
          employee: true,
          manager: true,
        },
      });

      const now = new Date();

      for (const ticket of activeTickets) {
        const dueDate = new Date(ticket.slaDueDate);
        const timeDiffMs = dueDate.getTime() - now.getTime();
        
        let newSlaStatus: SlaStatus | null = null;
        let details = "";

        if (timeDiffMs <= 0) {
          // Breached SLA
          newSlaStatus = SlaStatus.BREACHED;
          details = `Ticket breached its SLA. Due date: ${dueDate.toISOString()}`;
        } else {
          // Near Breach SLA check
          // Critical: Near breach if less than 15 mins remaining
          // High: Near breach if less than 1 hour remaining
          // Medium/Low: Near breach if less than 2 hours remaining
          const remainingMinutes = timeDiffMs / (1000 * 60);
          let nearBreachThreshold = 120; // 2 hours
          
          if (ticket.priority === TicketPriority.CRITICAL) {
            nearBreachThreshold = 15; // 15 mins
          } else if (ticket.priority === TicketPriority.HIGH) {
            nearBreachThreshold = 60; // 1 hour
          }

          if (remainingMinutes <= nearBreachThreshold && ticket.slaStatus === SlaStatus.WITHIN_SLA) {
            newSlaStatus = SlaStatus.NEAR_BREACH;
            details = `Ticket is approaching SLA breach. Remaining time: ${Math.round(remainingMinutes)} mins.`;
          }
        }

        if (newSlaStatus) {
          await prisma.$transaction(async (tx) => {
            // Update ticket
            const updatedTicket = await tx.supportTicket.update({
              where: { id: ticket.id },
              data: {
                slaStatus: newSlaStatus!,
                escalationLevel: newSlaStatus === SlaStatus.BREACHED ? ticket.escalationLevel + 1 : ticket.escalationLevel,
                breachReason: newSlaStatus === SlaStatus.BREACHED ? "Resolution response time exceeded limits." : undefined,
              },
            });

            // Log SLA change history
            await tx.ticketSlaHistory.create({
              data: {
                ticketId: ticket.id,
                action: newSlaStatus === SlaStatus.BREACHED ? "SLA_BREACHED" : "SLA_WARNING",
                status: newSlaStatus!,
                details,
              },
            });

            // Notify Support Admins and Super Admins
            const admins = await tx.user.findMany({
              where: {
                role: {
                  in: ["ADMIN", "ADMIN"],
                },
                status: "ACTIVE",
              },
            });

            const notificationTitle = newSlaStatus === SlaStatus.BREACHED 
              ? `🚨 SLA BREACH: Ticket #${ticket.ticketNumber}`
              : `⚠️ SLA WARNING: Ticket #${ticket.ticketNumber}`;

            const notificationMsg = newSlaStatus === SlaStatus.BREACHED
              ? `Ticket #${ticket.ticketNumber} (${ticket.priority}) has breached SLA. Immediate action required.`
              : `Ticket #${ticket.ticketNumber} (${ticket.priority}) is near breach. Please respond soon.`;

            await tx.notification.createMany({
              data: admins.map((adm) => ({
                userId: adm.id,
                title: notificationTitle,
                message: notificationMsg,
                type: "TICKET",
                deepLink: `/admin/tickets?id=${ticket.id}`,
              })),
            });
            
            logger.warn(`SLA update triggered for Ticket #${ticket.ticketNumber} -> Status: ${newSlaStatus}. Escalation: ${updatedTicket.escalationLevel}`);
          });
        }
      }
    } catch (err) {
      logger.error("Error in SLA check cron job: " + (err as Error).message);
    }
  });
};
