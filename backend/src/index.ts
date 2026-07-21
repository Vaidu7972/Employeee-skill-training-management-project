import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import swaggerUi from "swagger-ui-express";

import authRoutes from "./routes/auth.routes";
import organizationRoutes from "./routes/organization.routes";
import employeeRoutes from "./routes/employee.routes";
import skillRoutes from "./routes/skill.routes";
import trainingRoutes from "./routes/training.routes";
import ticketRoutes from "./routes/ticket.routes";
import systemRoutes from "./routes/system.routes";
import assessmentRoutes from "./routes/assessment.routes";
import projectRoutes from "./routes/project.routes";
import resumeRoutes from "./routes/resume.routes";
import reportRoutes from "./routes/report.routes";

import { globalErrorHandler } from "./middlewares/error.middleware";
import { initSlaScheduler } from "./jobs/sla.job";
import logger from "./utils/logger";

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: "*", // Adjust origins in production
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 300 : 10000, // High limit for local E2E tests
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes",
    code: "RATE_LIMIT_EXCEEDED",
  },
});
app.use("/api", apiLimiter);

// Ensure local directories exist for uploads
const uploadPaths = ["uploads/certificates", "uploads/attachments"];
uploadPaths.forEach((dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logger.info(`Created local directory: ${dirPath}`);
  }
});

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Swagger API Documentation Setup
const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "SkillSphere API documentation",
    version: "1.0.0",
    description: "REST API endpoints powering the SkillSphere Employee Skill & Training Management System",
  },
  servers: [
    {
      url: "http://localhost:5000/api",
      description: "Development Server",
    },
  ],
  paths: {
    "/auth/login": {
      post: {
        summary: "User Login",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string" },
                  password: { type: "string" },
                  portal: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Success" },
        },
      },
    },
  },
};
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Route Mounts
app.use("/api/auth", authRoutes);
app.use("/api/org", organizationRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/training", trainingRoutes);
app.use("/api/ticket", ticketRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/assessments", assessmentRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/reports", reportRoutes);

// Root Ping Route
app.get("/ping", (req, res) => {
  res.status(200).json({ success: true, message: "SkillSphere API Server online" });
});

// Error handling middleware (should be registered last)
app.use(globalErrorHandler);

// Boot Server
app.listen(PORT, () => {
  logger.info(`----------------------------------------------------`);
  logger.info(`SkillSphere API Server running on port ${PORT}`);
  logger.info(`Swagger docs available at http://localhost:${PORT}/api-docs`);
  logger.info(`----------------------------------------------------`);

  // Start Cron Tasks
  initSlaScheduler();
});

export default app;
