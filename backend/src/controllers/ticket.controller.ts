import { Request, Response, NextFunction } from "express";
import { PrismaClient, TicketStatus, TicketPriority, TicketCategory, SlaStatus, SystemRole, AccountStatus } from "@prisma/client";
import { createAuditLog } from "../utils/audit";
import { SLA_HOURS } from "../jobs/sla.job";

const prisma = new PrismaClient();

// Helper to generate a unique ticket number: TK-YYYYMM-XXXXX
const generateTicketNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 90000) + 10000);
  return `TK-${year}${month}-${rand}`;
};

// Helper to calculate SLA due date
const calculateSlaDueDate = (priority: TicketPriority): Date => {
  const hours = SLA_HOURS[priority] || 24;
  const now = new Date();
  now.setMinutes(now.getMinutes() + hours * 60);
  return now;
};

// ----------------------------------------------------
// Ticket Administration & Management
// ----------------------------------------------------

export const getTickets = async (req: any, res: Response, next: NextFunction) => {
  const { status, priority, category, search, page = 1, limit = 10 } = req.query;
  const { id: userId, role, employeeId } = req.user;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  try {
    const whereClause: any = {};

    // Security: Employee can only see own tickets
    if (role === SystemRole.EMPLOYEE) {
      if (!employeeId) {
        return res.status(404).json({
          success: false,
          message: "Employee profile not found for this user.",
          code: "NOT_FOUND",
        });
      }
      whereClause.creatorId = employeeId;
    }

    // Security: Managers see their team's tickets
    if (role === SystemRole.MANAGER) {
      if (!employeeId) {
        return res.status(404).json({
          success: false,
          message: "Manager profile not found for this user.",
          code: "NOT_FOUND",
        });
      }
      whereClause.creator = {
        managerId: employeeId,
      };
    }

    // Admin filters
    if (role === SystemRole.SUPER_ADMIN || role === SystemRole.ADMIN_SUPPORT) {
      if (req.query.creatorId) {
        whereClause.creatorId = req.query.creatorId as string;
      }
      if (req.query.assignedAdminId) {
        whereClause.assignedAdminId = req.query.assignedAdminId as string;
      }
    }

    if (status) {
      whereClause.status = status as TicketStatus;
    }
    if (priority) {
      whereClause.priority = priority as TicketPriority;
    }
    if (category) {
      whereClause.category = category as TicketCategory;
    }
    if (search) {
      whereClause.OR = [
        { ticketNumber: { contains: String(search), mode: "insensitive" } },
        { subject: { contains: String(search), mode: "insensitive" } },
        { description: { contains: String(search), mode: "insensitive" } },
      ];
    }

    const [tickets, total] = await prisma.$transaction([
      prisma.supportTicket.findMany({
        where: whereClause,
        include: {
          creator: true,
        },
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      prisma.supportTicket.count({ where: whereClause }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Tickets retrieved successfully",
      data: tickets,
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

export const getTicketById = async (req: any, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { role, employeeId } = req.user;

  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        creator: true,
        messages: {
          orderBy: { createdAt: "asc" },
          include: { attachments: true },
        },
        attachments: true,
        statusHistories: true,
      },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
        code: "NOT_FOUND",
      });
    }

    // Security check: Employee must own this ticket
    if (role === SystemRole.EMPLOYEE && ticket.creatorId !== employeeId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this ticket.",
        code: "FORBIDDEN",
      });
    }

    // Security check: Manager can only view if it belongs to team
    if (role === SystemRole.MANAGER && ticket.creator.managerId !== employeeId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this team ticket.",
        code: "FORBIDDEN",
      });
    }

    // Filter out internal messages if requester is employee
    if (role === SystemRole.EMPLOYEE) {
      ticket.messages = ticket.messages.filter((m: any) => !m.isInternal);
    }

    return res.status(200).json({
      success: true,
      message: "Ticket details retrieved successfully",
      data: ticket,
    });
  } catch (err) {
    next(err);
  }
};

export const createTicket = async (req: any, res: Response, next: NextFunction) => {
  const { subject, description, category, priority } = req.body;
  const { id: userId, employeeId } = req.user;

  try {
    if (!subject || !description || !category) {
      return res.status(400).json({
        success: false,
        message: "Subject, description, and category are required",
        code: "VALIDATION_ERROR",
      });
    }

    if (!employeeId) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found. Tickets can only be opened by employees.",
        code: "NOT_FOUND",
      });
    }

    const ticketNumber = generateTicketNumber();
    const prio = (priority as TicketPriority) || TicketPriority.MEDIUM;
    const slaDueDate = calculateSlaDueDate(prio);

    const ticket = await prisma.$transaction(async (tx) => {
      const created = await tx.supportTicket.create({
        data: {
          ticketNumber,
          subject,
          description,
          category: category as TicketCategory,
          priority: prio,
          creatorId: employeeId,
          slaDueDate,
          status: TicketStatus.OPEN,
          slaStatus: SlaStatus.WITHIN_SLA,
        },
      });

      // Save initial status history
      await tx.ticketStatusHistory.create({
        data: {
          ticketId: created.id,
          status: TicketStatus.OPEN,
          updatedById: userId,
          comment: "Ticket opened by employee.",
        },
      });

      // Save initial SLA history
      await tx.ticketSlaHistory.create({
        data: {
          ticketId: created.id,
          action: "TICKET_CREATED",
          status: SlaStatus.WITHIN_SLA,
          details: `Initial response SLA due at: ${slaDueDate.toISOString()}`,
        },
      });

      // Fetch employee's manager info
      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        select: { manager: { select: { userId: true } } },
      });

      if (employee?.manager?.userId) {
        // Route ticket to Manager
        await tx.notification.create({
          data: {
            userId: employee.manager.userId,
            title: `🆕 New Team Ticket: #${ticketNumber}`,
            message: `Your team member has opened ticket #${ticketNumber} in "${category}".`,
            type: "TICKET",
            deepLink: `/manager/dashboard?tab=tickets&id=${created.id}`,
          },
        });
      } else {
        // No Manager: Route directly to Support Admins
        const supportAdmins = await tx.user.findMany({
          where: {
            role: { in: [SystemRole.SUPER_ADMIN, SystemRole.ADMIN_SUPPORT] },
            status: AccountStatus.ACTIVE,
          },
        });

        await tx.notification.createMany({
          data: supportAdmins.map((adm) => ({
            userId: adm.id,
            title: `🆕 New Support Ticket: #${ticketNumber}`,
            message: `Ticket #${ticketNumber} has been opened in "${category}" with priority "${prio}".`,
            type: "TICKET",
            deepLink: `/admin/tickets?id=${created.id}`,
          })),
        });
      }

      return created;
    });

    await createAuditLog(userId, "CREATE_TICKET", "TICKET", null, ticket);

    return res.status(201).json({
      success: true,
      message: "Support ticket created successfully",
      data: ticket,
    });
  } catch (err) {
    next(err);
  }
};

export const assignTicket = async (req: any, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { assignedAdminId } = req.body; // User ID of support agent
  const adminId = req.user.id;

  try {
    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
        code: "NOT_FOUND",
      });
    }

    const admin = await prisma.user.findUnique({ where: { id: assignedAdminId } });
    const allowedRoles: SystemRole[] = [SystemRole.SUPER_ADMIN, SystemRole.ADMIN_SUPPORT];
    if (!admin || !allowedRoles.includes(admin.role)) {
      return res.status(400).json({
        success: false,
        message: "Assigned user must be a valid support agent or admin",
        code: "VALIDATION_ERROR",
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const up = await tx.supportTicket.update({
        where: { id },
        data: {
          assignedAdminId,
          status: TicketStatus.ASSIGNED,
        },
      });

      await tx.ticketStatusHistory.create({
        data: {
          ticketId: id,
          status: TicketStatus.ASSIGNED,
          updatedById: adminId,
          comment: `Ticket assigned to support agent.`,
        },
      });

      // Notify the assigned agent
      await tx.notification.create({
        data: {
          userId: assignedAdminId,
          title: `Ticket Assigned: #${ticket.ticketNumber}`,
          message: `Support ticket #${ticket.ticketNumber} has been assigned to you.`,
          type: "TICKET",
          deepLink: `/admin/tickets?id=${id}`,
        },
      });

      return up;
    });

    await createAuditLog(adminId, "ASSIGN_TICKET", "TICKET", ticket, updated);

    return res.status(200).json({
      success: true,
      message: "Ticket assigned successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const escalateTicket = async (req: any, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { reason } = req.body;
  const { id: userId, role, employeeId } = req.user;

  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: { creator: true },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
        code: "NOT_FOUND",
      });
    }

    // Security: Only the team manager or admin can escalate
    if (role === SystemRole.MANAGER && ticket.creator.managerId !== employeeId) {
      return res.status(403).json({
        success: false,
        message: "You can only escalate tickets belonging to your team.",
        code: "FORBIDDEN",
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const up = await tx.supportTicket.update({
        where: { id },
        data: {
          status: TicketStatus.ESCALATED,
          escalationLevel: ticket.escalationLevel + 1,
        },
      });

      await tx.ticketStatusHistory.create({
        data: {
          ticketId: id,
          status: TicketStatus.ESCALATED,
          updatedById: userId,
          comment: `Ticket escalated to Admin Support. Reason: ${reason || "Escalated by manager"}`,
        },
      });

      // Post internal message
      await tx.ticketMessage.create({
        data: {
          ticketId: id,
          senderId: userId,
          message: `--- TICKET ESCALATED TO ADMIN SUPPORT ---\nReason: ${reason || "Not specified"}`,
          isInternal: false,
        },
      });

      // Notify Support & Super Admins
      const supportAdmins = await tx.user.findMany({
        where: {
          role: { in: [SystemRole.SUPER_ADMIN, SystemRole.ADMIN_SUPPORT] },
          status: AccountStatus.ACTIVE,
        },
      });

      await tx.notification.createMany({
        data: supportAdmins.map((adm) => ({
          userId: adm.id,
          title: `⚠️ Escalated Ticket: #${ticket.ticketNumber}`,
          message: `Ticket #${ticket.ticketNumber} was escalated by manager.`,
          type: "TICKET",
          deepLink: `/admin/tickets?id=${id}`,
        })),
      });

      return up;
    });

    await createAuditLog(userId, "ESCALATE_TICKET", "TICKET", ticket, updated);

    return res.status(200).json({
      success: true,
      message: "Ticket escalated to Admin Support successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const addTicketMessage = async (req: any, res: Response, next: NextFunction) => {
  const { id } = req.params; // Ticket ID
  const { message, isInternal } = req.body;
  const { id: userId, role, employeeId } = req.user;

  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: { creator: true },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
        code: "NOT_FOUND",
      });
    }

    if (ticket.status === TicketStatus.CLOSED) {
      return res.status(400).json({
        success: false,
        message: "Replies cannot be added to a closed ticket. Please reopen it first.",
        code: "VALIDATION_ERROR",
      });
    }

    // Security: Employee cannot write to other tickets and cannot write internal notes
    if (role === SystemRole.EMPLOYEE) {
      if (ticket.creatorId !== employeeId) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to reply to this ticket.",
          code: "FORBIDDEN",
        });
      }
      if (isInternal === "true" || isInternal === true) {
        return res.status(403).json({
          success: false,
          message: "Employees are not authorized to create internal notes.",
          code: "FORBIDDEN",
        });
      }
    }

    // Security: Manager must own the employee
    if (role === SystemRole.MANAGER) {
      if (ticket.creator.managerId !== employeeId) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to reply to this ticket.",
          code: "FORBIDDEN",
        });
      }
    }

    const internalFlag = (role === SystemRole.SUPER_ADMIN || role === SystemRole.ADMIN_SUPPORT || role === SystemRole.MANAGER) && (isInternal === "true" || isInternal === true);

    const msg = await prisma.$transaction(async (tx) => {
      // Create message
      const createdMsg = await tx.ticketMessage.create({
        data: {
          ticketId: id,
          senderId: userId,
          message,
          isInternal: internalFlag,
        },
      });

      // Handle attachments
      if (req.file) {
        await tx.ticketAttachment.create({
          data: {
            ticketId: id,
            ticketMessageId: createdMsg.id,
            fileName: req.file.originalname,
            filePath: req.file.path.replace(/\\/g, "/"),
            fileSize: req.file.size,
          },
        });
      }

      // Update ticket status based on workflow
      let nextStatus = ticket.status;
      let slaAction = "";
      let firstResponseUpdate: any = {};

      if (role === SystemRole.SUPER_ADMIN || role === SystemRole.ADMIN_SUPPORT || role === SystemRole.MANAGER) {
        if (!internalFlag) {
          nextStatus = TicketStatus.WAITING_USER;
          
          // Check SLA Response Calculations
          if (!ticket.firstResponseDate) {
            const now = new Date();
            const firstResponseTimeMinutes = Math.round((now.getTime() - ticket.createdAt.getTime()) / (1000 * 60));
            const isWithinSla = now <= ticket.slaDueDate;
            
            firstResponseUpdate = {
              firstResponseDate: now,
              firstResponseTimeMinutes,
              slaStatus: isWithinSla ? SlaStatus.COMPLETED_WITHIN_SLA : SlaStatus.COMPLETED_AFTER_SLA,
            };

            slaAction = "FIRST_RESPONSE";
          }
        }
      } else if (role === SystemRole.EMPLOYEE) {
        // If ticket is escalated, keep/shift to IN_PROGRESS. Otherwise shift to WAITING_MANAGER
        nextStatus = ticket.status === TicketStatus.ESCALATED ? TicketStatus.IN_PROGRESS : TicketStatus.WAITING_MANAGER;
      }

      await tx.supportTicket.update({
        where: { id },
        data: {
          status: nextStatus,
          ...firstResponseUpdate,
        },
      });

      // Log status changes
      if (nextStatus !== ticket.status) {
        await tx.ticketStatusHistory.create({
          data: {
            ticketId: id,
            status: nextStatus,
            updatedById: userId,
            comment: `Status automatically shifted on message post.`,
          },
        });
      }

      // Log SLA response completed
      if (slaAction) {
        await tx.ticketSlaHistory.create({
          data: {
            ticketId: id,
            action: slaAction,
            status: firstResponseUpdate.slaStatus,
            details: `First response SLA fulfilled in ${firstResponseUpdate.firstResponseTimeMinutes} mins. Status: ${firstResponseUpdate.slaStatus}`,
          },
        });
      }

      // Notify recipient
      if (role === SystemRole.EMPLOYEE) {
        // Notify manager or admin depending on escalation status
        if (ticket.status === TicketStatus.ESCALATED) {
          if (ticket.assignedAdminId) {
            await tx.notification.create({
              data: {
                userId: ticket.assignedAdminId,
                title: `💬 New Reply: Ticket #${ticket.ticketNumber}`,
                message: `The employee has replied to ticket #${ticket.ticketNumber}.`,
                type: "TICKET",
                deepLink: `/admin/tickets?id=${id}`,
              },
            });
          }
        } else {
          // Notify Manager
          const employee = await tx.employee.findUnique({
            where: { id: employeeId },
            select: { manager: { select: { userId: true } } },
          });
          if (employee?.manager?.userId) {
            await tx.notification.create({
              data: {
                userId: employee.manager.userId,
                title: `💬 New Reply: Ticket #${ticket.ticketNumber}`,
                message: `The employee has replied to ticket #${ticket.ticketNumber}.`,
                type: "TICKET",
                deepLink: `/manager/dashboard?tab=tickets&id=${id}`,
              },
            });
          }
        }
      } else if (!internalFlag && ticket.creator.userId) {
        // Notify employee of public response
        await tx.notification.create({
          data: {
            userId: ticket.creator.userId,
            title: `💬 Support Response: Ticket #${ticket.ticketNumber}`,
            message: `A response has been posted to your ticket #${ticket.ticketNumber}.`,
            type: "TICKET",
            deepLink: `/employee/my-tickets?id=${id}`,
          },
        });
      }

      return createdMsg;
    });

    await createAuditLog(userId, internalFlag ? "ADD_INTERNAL_NOTE" : "ADD_TICKET_REPLY", "TICKET", null, { messageId: msg.id });

    return res.status(201).json({
      success: true,
      message: internalFlag ? "Internal note posted" : "Reply posted successfully",
      data: msg,
    });
  } catch (err) {
    next(err);
  }
};

export const resolveTicket = async (req: any, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { resolutionDetails } = req.body;
  const userId = req.user.id;
  const { role, employeeId } = req.user;

  try {
    if (!resolutionDetails) {
      return res.status(400).json({
        success: false,
        message: "Resolution details are required",
        code: "VALIDATION_ERROR",
      });
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: { creator: true },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
        code: "NOT_FOUND",
      });
    }

    // Security: Only manager of team or admin can resolve
    if (role === SystemRole.MANAGER && ticket.creator.managerId !== employeeId) {
      return res.status(403).json({
        success: false,
        message: "You can only resolve tickets belonging to your team.",
        code: "FORBIDDEN",
      });
    }

    const now = new Date();
    const resolutionTimeMinutes = Math.round((now.getTime() - ticket.createdAt.getTime()) / (1000 * 60));

    const updated = await prisma.$transaction(async (tx) => {
      const up = await tx.supportTicket.update({
        where: { id },
        data: {
          status: TicketStatus.RESOLVED,
          resolutionDate: now,
          resolutionTimeMinutes,
        },
      });

      // Status history
      await tx.ticketStatusHistory.create({
        data: {
          ticketId: id,
          status: TicketStatus.RESOLVED,
          updatedById: userId,
          comment: `Ticket marked RESOLVED. Details: ${resolutionDetails}`,
        },
      });

      // Post public message with resolution
      await tx.ticketMessage.create({
        data: {
          ticketId: id,
          senderId: userId,
          message: `--- RESOLUTION DETAILS ---\n${resolutionDetails}`,
          isInternal: false,
        },
      });

      // Notify employee
      if (ticket.creator.userId) {
        await tx.notification.create({
          data: {
            userId: ticket.creator.userId,
            title: `✅ Ticket Resolved: #${ticket.ticketNumber}`,
            message: `Your support ticket #${ticket.ticketNumber} has been resolved. Please confirm or reopen.`,
            type: "TICKET",
            deepLink: `/employee/my-tickets?id=${id}`,
          },
        });
      }

      return up;
    });

    await createAuditLog(userId, "RESOLVE_TICKET", "TICKET", ticket, updated);

    return res.status(200).json({
      success: true,
      message: "Ticket resolved successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const confirmResolution = async (req: any, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { employeeId, id: userId } = req.user;

  try {
    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
        code: "NOT_FOUND",
      });
    }

    // Security: Only owner can confirm
    if (ticket.creatorId !== employeeId) {
      return res.status(403).json({
        success: false,
        message: "You can only confirm resolution for your own tickets.",
        code: "FORBIDDEN",
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const up = await tx.supportTicket.update({
        where: { id },
        data: {
          status: TicketStatus.CLOSED,
        },
      });

      await tx.ticketStatusHistory.create({
        data: {
          ticketId: id,
          status: TicketStatus.CLOSED,
          updatedById: userId,
          comment: "Employee confirmed resolution. Ticket closed.",
        },
      });

      return up;
    });

    await createAuditLog(userId, "CONFIRM_RESOLUTION", "TICKET", ticket, updated);

    return res.status(200).json({
      success: true,
      message: "Resolution confirmed and ticket closed.",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const reopenTicket = async (req: any, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { reason } = req.body;
  const { employeeId, id: userId } = req.user;

  try {
    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
        code: "NOT_FOUND",
      });
    }

    if (ticket.creatorId !== employeeId) {
      return res.status(403).json({
        success: false,
        message: "You can only reopen your own tickets.",
        code: "FORBIDDEN",
      });
    }

    if (ticket.status !== TicketStatus.RESOLVED && ticket.status !== TicketStatus.CLOSED) {
      return res.status(400).json({
        success: false,
        message: "Only resolved or closed tickets can be reopened.",
        code: "VALIDATION_ERROR",
      });
    }

    // Reopen window check (e.g. within 3 days / 72 hours of resolutionDate)
    if (ticket.resolutionDate) {
      const limitDate = new Date(ticket.resolutionDate);
      limitDate.setDate(limitDate.getDate() + 3);
      if (new Date() > limitDate) {
        return res.status(400).json({
          success: false,
          message: "Reopen limit exceeded. You cannot reopen a ticket after 3 days of resolution. Please open a new ticket.",
          code: "LIMIT_EXCEEDED",
        });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const up = await tx.supportTicket.update({
        where: { id },
        data: {
          status: TicketStatus.REOPENED,
          slaDueDate: calculateSlaDueDate(ticket.priority), // reset SLA timer
        },
      });

      await tx.ticketStatusHistory.create({
        data: {
          ticketId: id,
          status: TicketStatus.REOPENED,
          updatedById: userId,
          comment: `Ticket reopened by employee. Reason: ${reason || "Not specified"}`,
        },
      });

      await tx.ticketMessage.create({
        data: {
          ticketId: id,
          senderId: userId,
          message: `--- TICKET REOPENED ---\nReason: ${reason || "Not specified"}`,
          isInternal: false,
        },
      });

      // Notify assigned admin or manager depending on escalation status
      if (ticket.status === TicketStatus.ESCALATED) {
        if (ticket.assignedAdminId) {
          await tx.notification.create({
            data: {
              userId: ticket.assignedAdminId,
              title: `⚠️ Ticket Reopened: #${ticket.ticketNumber}`,
              message: `Ticket #${ticket.ticketNumber} was reopened by the employee.`,
              type: "TICKET",
              deepLink: `/admin/tickets?id=${id}`,
            },
          });
        }
      } else {
        // Notify Manager
        const employee = await tx.employee.findUnique({
          where: { id: employeeId },
          select: { manager: { select: { userId: true } } },
        });
        if (employee?.manager?.userId) {
          await tx.notification.create({
            data: {
              userId: employee.manager.userId,
              title: `⚠️ Ticket Reopened: #${ticket.ticketNumber}`,
              message: `Ticket #${ticket.ticketNumber} was reopened by the employee.`,
              type: "TICKET",
              deepLink: `/manager/dashboard?tab=tickets&id=${id}`,
            },
          });
        }
      }

      return up;
    });

    await createAuditLog(userId, "REOPEN_TICKET", "TICKET", ticket, updated);

    return res.status(200).json({
      success: true,
      message: "Ticket reopened successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};
