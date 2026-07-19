import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  getTickets,
  getTicketById,
  createTicket,
  assignTicket,
  escalateTicket,
  addTicketMessage,
  resolveTicket,
  confirmResolution,
  reopenTicket,
} from "../controllers/ticket.controller";
import { authenticateJWT, requireRoles } from "../middlewares/auth.middleware";
import { SystemRole } from "@prisma/client";

const router = Router();

// Configure local storage for ticket attachments
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/attachments";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedExts = [".pdf", ".jpg", ".jpeg", ".png", ".txt", ".csv", ".doc", ".docx", ".xlsx", ".zip"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("File type not supported for ticket attachments."));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
});

router.get("/", authenticateJWT, getTickets);
router.get("/:id", authenticateJWT, getTicketById);
router.post("/", authenticateJWT, requireRoles([SystemRole.EMPLOYEE]), createTicket);
router.put("/:id/assign", authenticateJWT, requireRoles([SystemRole.SUPER_ADMIN, SystemRole.ADMIN_SUPPORT]), assignTicket);
router.put("/:id/escalate", authenticateJWT, requireRoles([SystemRole.MANAGER]), escalateTicket);
router.post("/:id/messages", authenticateJWT, upload.single("file"), addTicketMessage);
router.put("/:id/resolve", authenticateJWT, requireRoles([SystemRole.SUPER_ADMIN, SystemRole.ADMIN_SUPPORT, SystemRole.MANAGER]), resolveTicket);
router.put("/:id/confirm", authenticateJWT, requireRoles([SystemRole.EMPLOYEE]), confirmResolution);
router.put("/:id/reopen", authenticateJWT, requireRoles([SystemRole.EMPLOYEE]), reopenTicket);

export default router;
