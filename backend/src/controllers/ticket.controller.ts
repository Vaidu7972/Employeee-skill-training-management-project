import { Response, NextFunction } from "express";
import { PrismaClient, SystemRole, TicketStatus, TicketPriority, TicketCategory, SlaStatus, AccountStatus } from "@prisma/client";
import { createAuditLog } from "../utils/audit";

const prisma = new PrismaClient();

// Helper to generate Ticket Number: TKT-YYYYMM-XXXXXX
const generateTicketNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const random = String(Math.floor(100000 + Math.random() * 900000));
  return `TKT-${year}${month}-${random}`;
};

// Helper to calculate SLA due date based on priority
const calculateSlaDueDate = (priority: TicketPriority) => {
  const now = new Date();
  switch (priority) {
    case TicketPriority.CRITICAL:
      return new Date(now.getTime() + 1 * 60 * 60 * 1000); // 1 Hour
    case TicketPriority.HIGH:
      return new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 Hours
    case TicketPriority.MEDIUM:
      return new Date(now.getTime() + 8 * 60 * 60 * 1000); // 8 Hours
    case TicketPriority.LOW:
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 Hours
  }
};

// 1. Get List of Tickets
export const getTickets = async (req: any, res: Response, next: NextFunction) => {
  try {
    const { role, id: userId, employeeId } = req.user;
    const whereClause: any = {};

    // Filters
    if (req.query.status) {
      whereClause.status = req.query.status;
    }
    if (req.query.priority) {
      whereClause.priority = req.query.priority;
    }
    if (req.query.category) {
      whereClause.category = req.query.category;
    }

    // Role restrictions
    if (role === SystemRole.EMPLOYEE) {
      whereClause.employeeId = employeeId;
    } else if (role === SystemRole.MANAGER) {
      whereClause.OR = [
        { managerId: employeeId },
        { employee: { managerId: employeeId } }
      ];
    } else if (role === SystemRole.ADMIN) {
      if (req.query.employeeId) {
        whereClause.employeeId = req.query.employeeId;
      }
      if (req.query.managerId) {
        whereClause.managerId = req.query.managerId;
      }
    }

    const tickets = await prisma.supportTicket.findMany({
      where: whereClause,
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, email: true, employeeCode: true },
        },
        manager: {
          select: { id: true, firstName: true, lastName: true, email: true, employeeCode: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      data: tickets,
    });
  } catch (err) {
    next(err);
  }
};

// 2. Get Ticket Details by ID
export const getTicketById = async (req: any, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { role, employeeId } = req.user;

  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        employee: true,
        manager: true,
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            attachments: true,
          },
        },
        attachments: true,
        histories: {
          orderBy: { createdAt: "desc" },
        },
        slaHistories: {
          orderBy: { timestamp: "desc" },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
        code: "NOT_FOUND",
      });
    }

    // Security: Validate access rights
    if (role === SystemRole.EMPLOYEE && ticket.employeeId !== employeeId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this ticket.",
        code: "FORBIDDEN",
      });
    }

    if (role === SystemRole.MANAGER && ticket.managerId !== employeeId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this ticket.",
        code: "FORBIDDEN",
      });
    }

    // Filter out internal comments from Employee/Manager visibility
    if (role !== SystemRole.ADMIN) {
      ticket.comments = ticket.comments.filter((c: any) => !c.isInternalNote);
    }

    return res.status(200).json({
      success: true,
      data: ticket,
    });
  } catch (err) {
    next(err);
  }
};

// 3. Create Ticket (Employee or Manager raises a ticket)
export const createTicket = async (req: any, res: Response, next: NextFunction) => {
  const { subject, description, category, priority } = req.body;
  const { id: userId, role, employeeId } = req.user;

  try {
    if (!subject || !description || !category) {
      return res.status(400).json({
        success: false,
        message: "Subject, description, and category are required fields.",
        code: "VALIDATION_ERROR",
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
          createdByUserId: userId,
          createdByRole: role,
          employeeId: role === SystemRole.EMPLOYEE ? employeeId : null,
          managerId: role === SystemRole.MANAGER ? employeeId : null,
          slaDueDate,
          status: TicketStatus.OPEN,
          slaStatus: SlaStatus.WITHIN_SLA,
        },
      });

      // Save initial status history
      await tx.ticketHistory.create({
        data: {
          ticketId: created.id,
          action: "TICKET_CREATED",
          newStatus: TicketStatus.OPEN,
          performedByUserId: userId,
          performedByRole: role,
          comment: `Ticket opened by ${role.toLowerCase()}.`,
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

      // Send routing notifications to Admins
      const supportAdmins = await tx.user.findMany({
        where: {
          role: SystemRole.ADMIN,
          status: AccountStatus.ACTIVE,
        },
      });

      await tx.notification.createMany({
        data: supportAdmins.map((adm) => ({
          userId: adm.id,
          title: `🆕 New Ticket: ${ticketNumber}`,
          message: `${role} raised ticket ${ticketNumber} in category "${category}".`,
          type: "TICKET",
          deepLink: `/admin/tickets?id=${created.id}`,
        })),
      });

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

// 4. Assign Ticket (Admin assigns to a support user/admin)
export const assignTicket = async (req: any, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { assignedAdminId } = req.body;
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
    if (!admin || admin.role !== SystemRole.ADMIN) {
      return res.status(400).json({
        success: false,
        message: "Assigned user must be a valid admin",
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

      await tx.ticketHistory.create({
        data: {
          ticketId: id,
          action: "TICKET_ASSIGNED",
          oldStatus: ticket.status,
          newStatus: TicketStatus.ASSIGNED,
          performedByUserId: adminId,
          performedByRole: SystemRole.ADMIN,
          comment: `Ticket assigned to admin.`,
        },
      });

      await tx.notification.create({
        data: {
          userId: assignedAdminId,
          title: `Ticket Assigned: ${ticket.ticketNumber}`,
          message: `Support ticket ${ticket.ticketNumber} has been assigned to you.`,
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

// 5. Escalate Ticket (Manager or Admin escalates)
export const escalateTicket = async (req: any, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { reason } = req.body;
  const { id: userId, role, employeeId } = req.user;

  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
        code: "NOT_FOUND",
      });
    }

    // Security: Only Manager (creator of ticket or creator's manager) or Admin can escalate
    if (role === SystemRole.MANAGER && ticket.managerId !== employeeId) {
      return res.status(403).json({
        success: false,
        message: "You can only escalate your own manager support tickets.",
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

      await tx.ticketHistory.create({
        data: {
          ticketId: id,
          action: "TICKET_ESCALATED",
          oldStatus: ticket.status,
          newStatus: TicketStatus.ESCALATED,
          performedByUserId: userId,
          performedByRole: role,
          comment: `Ticket escalated. Reason: ${reason || "Escalated by user"}`,
        },
      });

      // Post comment stating escalation
      await tx.ticketComment.create({
        data: {
          ticketId: id,
          senderUserId: userId,
          senderRole: role,
          message: `--- TICKET ESCALATED ---\nReason: ${reason || "Not specified"}`,
          isInternalNote: false,
        },
      });

      // Notify Admins
      const supportAdmins = await tx.user.findMany({
        where: {
          role: SystemRole.ADMIN,
          status: AccountStatus.ACTIVE,
        },
      });

      await tx.notification.createMany({
        data: supportAdmins.map((adm) => ({
          userId: adm.id,
          title: `⚠️ Escalated Ticket: ${ticket.ticketNumber}`,
          message: `Ticket ${ticket.ticketNumber} has been escalated.`,
          type: "TICKET",
          deepLink: `/admin/tickets?id=${id}`,
        })),
      });

      return up;
    });

    await createAuditLog(userId, "ESCALATE_TICKET", "TICKET", ticket, updated);

    return res.status(200).json({
      success: true,
      message: "Ticket escalated successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

// 6. Post Ticket Comment (Public reply or Internal note)
export const addTicketMessage = async (req: any, res: Response, next: NextFunction) => {
  const { id } = req.params; // Ticket ID
  const { message, isInternal } = req.body;
  const { id: userId, role, employeeId } = req.user;

  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
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
        message: "Replies cannot be added to a closed ticket. Please reopen first.",
        code: "VALIDATION_ERROR",
      });
    }

    // Role check constraints
    if (role === SystemRole.EMPLOYEE) {
      if (ticket.employeeId !== employeeId) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to reply to this ticket.",
          code: "FORBIDDEN",
        });
      }
      if (isInternal === "true" || isInternal === true) {
        return res.status(403).json({
          success: false,
          message: "Employees cannot create internal notes.",
          code: "FORBIDDEN",
        });
      }
    }

    if (role === SystemRole.MANAGER) {
      if (ticket.managerId !== employeeId) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to reply to this ticket.",
          code: "FORBIDDEN",
        });
      }
      if (isInternal === "true" || isInternal === true) {
        return res.status(403).json({
          success: false,
          message: "Managers cannot create internal notes.",
          code: "FORBIDDEN",
        });
      }
    }

    const internalFlag = role === SystemRole.ADMIN && (isInternal === "true" || isInternal === true);

    const msg = await prisma.$transaction(async (tx) => {
      // Create Comment
      const createdComment = await tx.ticketComment.create({
        data: {
          ticketId: id,
          senderUserId: userId,
          senderRole: role,
          message,
          isInternalNote: internalFlag,
        },
      });

      // Save attachment details if present
      if (req.file) {
        await tx.ticketAttachment.create({
          data: {
            ticketId: id,
            commentId: createdComment.id,
            fileName: req.file.filename,
            originalFileName: req.file.originalname,
            filePath: req.file.path.replace(/\\/g, "/"),
            mimeType: req.file.mimetype || "application/octet-stream",
            fileSize: req.file.size,
            uploadedByUserId: userId,
          },
        });
      }

      // Update ticket status
      let nextStatus = ticket.status;
      let slaAction = "";
      let firstResponseUpdate: any = {};

      if (role === SystemRole.ADMIN) {
        if (!internalFlag) {
          nextStatus = TicketStatus.WAITING_USER;
          // First response SLA check
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
      } else {
        // Employee or Manager replied
        nextStatus = TicketStatus.IN_PROGRESS;
      }

      await tx.supportTicket.update({
        where: { id },
        data: {
          status: nextStatus,
          ...firstResponseUpdate,
        },
      });

      if (nextStatus !== ticket.status) {
        await tx.ticketHistory.create({
          data: {
            ticketId: id,
            action: "STATUS_CHANGE",
            oldStatus: ticket.status,
            newStatus: nextStatus,
            performedByUserId: userId,
            performedByRole: role,
            comment: `Status updated to ${nextStatus} on message posting.`,
          },
        });
      }

      if (slaAction) {
        await tx.ticketSlaHistory.create({
          data: {
            ticketId: id,
            action: slaAction,
            status: firstResponseUpdate.slaStatus,
            details: `First response SLA met. Response time: ${firstResponseUpdate.firstResponseTimeMinutes} mins.`,
          },
        });
      }

      // Route notifications
      if (role === SystemRole.ADMIN && !internalFlag) {
        const notifyUserId = ticket.createdByUserId;
        await tx.notification.create({
          data: {
            userId: notifyUserId,
            title: `💬 Ticket Update: ${ticket.ticketNumber}`,
            message: `Admin posted a reply to ticket ${ticket.ticketNumber}.`,
            type: "TICKET",
            deepLink: role === SystemRole.EMPLOYEE ? `/employee/my-tickets?id=${id}` : `/manager/dashboard?tab=tickets&id=${id}`,
          },
        });
      } else if (role !== SystemRole.ADMIN) {
        // Notify assigned admin or routing list
        const notifyUserId = ticket.assignedAdminId;
        if (notifyUserId) {
          await tx.notification.create({
            data: {
              userId: notifyUserId,
              title: `💬 Reply Posted: ${ticket.ticketNumber}`,
              message: `A reply was added by the sender on ticket ${ticket.ticketNumber}.`,
              type: "TICKET",
              deepLink: `/admin/tickets?id=${id}`,
            },
          });
        }
      }

      return createdComment;
    });

    await createAuditLog(userId, internalFlag ? "ADD_INTERNAL_NOTE" : "ADD_TICKET_REPLY", "TICKET", null, { commentId: msg.id });

    return res.status(201).json({
      success: true,
      message: internalFlag ? "Internal note posted successfully" : "Reply posted successfully",
      data: msg,
    });
  } catch (err) {
    next(err);
  }
};

// 7. Resolve Ticket
export const resolveTicket = async (req: any, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { resolutionDetails } = req.body;
  const userId = req.user.id;
  const { role, employeeId } = req.user;

  try {
    if (!resolutionDetails) {
      return res.status(400).json({
        success: false,
        message: "Resolution details are required to resolve a ticket.",
        code: "VALIDATION_ERROR",
      });
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
        code: "NOT_FOUND",
      });
    }

    // Only Admin can resolve tickets in this version (Consolidated roles check)
    if (role !== SystemRole.ADMIN) {
      return res.status(403).json({
        success: false,
        message: "Only Admins are authorized to resolve support tickets.",
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
          resolution: resolutionDetails,
          resolvedAt: now,
        },
      });

      await tx.ticketHistory.create({
        data: {
          ticketId: id,
          action: "TICKET_RESOLVED",
          oldStatus: ticket.status,
          newStatus: TicketStatus.RESOLVED,
          performedByUserId: userId,
          performedByRole: role,
          comment: `Ticket marked as RESOLVED. Resolution: ${resolutionDetails}`,
        },
      });

      await tx.ticketComment.create({
        data: {
          ticketId: id,
          senderUserId: userId,
          senderRole: role,
          message: `--- RESOLUTION DETAILS ---\n${resolutionDetails}`,
          isInternalNote: false,
        },
      });

      // Notify creator
      await tx.notification.create({
        data: {
          userId: ticket.createdByUserId,
          title: `✅ Ticket Resolved: ${ticket.ticketNumber}`,
          message: `Your ticket ${ticket.ticketNumber} has been resolved.`,
          type: "TICKET",
          deepLink: ticket.createdByRole === SystemRole.EMPLOYEE ? `/employee/my-tickets?id=${id}` : `/manager/dashboard?tab=tickets&id=${id}`,
        },
      });

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

// 8. Confirm Resolution (Close Ticket)
export const confirmResolution = async (req: any, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { employeeId, id: userId, role } = req.user;

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
    if (ticket.createdByUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only close tickets you have raised.",
        code: "FORBIDDEN",
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const up = await tx.supportTicket.update({
        where: { id },
        data: {
          status: TicketStatus.CLOSED,
          closedAt: new Date(),
        },
      });

      await tx.ticketHistory.create({
        data: {
          ticketId: id,
          action: "TICKET_CLOSED",
          oldStatus: ticket.status,
          newStatus: TicketStatus.CLOSED,
          performedByUserId: userId,
          performedByRole: role,
          comment: "User confirmed resolution. Ticket closed.",
        },
      });

      return up;
    });

    await createAuditLog(userId, "CLOSE_TICKET", "TICKET", ticket, updated);

    return res.status(200).json({
      success: true,
      message: "Resolution confirmed and ticket closed.",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

// 9. Reopen Ticket
export const reopenTicket = async (req: any, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { reason } = req.body;
  const { employeeId, id: userId, role } = req.user;

  try {
    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
        code: "NOT_FOUND",
      });
    }

    if (ticket.createdByUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only reopen tickets you have raised.",
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

    // Check reopen limit (3 days)
    if (ticket.resolvedAt) {
      const limitDate = new Date(ticket.resolvedAt);
      limitDate.setDate(limitDate.getDate() + 3);
      if (new Date() > limitDate) {
        return res.status(400).json({
          success: false,
          message: "Reopen limit exceeded. You cannot reopen a ticket 3 days after resolution.",
          code: "LIMIT_EXCEEDED",
        });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const up = await tx.supportTicket.update({
        where: { id },
        data: {
          status: TicketStatus.REOPENED,
          slaDueDate: calculateSlaDueDate(ticket.priority),
          reopenedAt: new Date(),
        },
      });

      await tx.ticketHistory.create({
        data: {
          ticketId: id,
          action: "TICKET_REOPENED",
          oldStatus: ticket.status,
          newStatus: TicketStatus.REOPENED,
          performedByUserId: userId,
          performedByRole: role,
          comment: `Ticket reopened. Reason: ${reason || "Not specified"}`,
        },
      });

      await tx.ticketComment.create({
        data: {
          ticketId: id,
          senderUserId: userId,
          senderRole: role,
          message: `--- TICKET REOPENED ---\nReason: ${reason || "Not specified"}`,
          isInternalNote: false,
        },
      });

      // Notify assigned admin
      if (ticket.assignedAdminId) {
        await tx.notification.create({
          data: {
            userId: ticket.assignedAdminId,
            title: `⚠️ Ticket Reopened: ${ticket.ticketNumber}`,
            message: `Ticket ${ticket.ticketNumber} was reopened by the user.`,
            type: "TICKET",
            deepLink: `/admin/tickets?id=${id}`,
          },
        });
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
