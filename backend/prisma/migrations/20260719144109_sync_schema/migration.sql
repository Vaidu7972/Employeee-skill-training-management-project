/*
  Warnings:

  - The values [LOGIN_ISSUE,PASSWORD_ISSUE,PROFILE_ISSUE,MANAGER_ASSIGNMENT,SKILL_ASSIGNMENT,SKILL_RATING,TRAINING_PLAN,NOTIFICATION,ACCESS_PERMISSION,TECHNICAL_ERROR,REPORT_ISSUE] on the enum `TicketCategory` will be removed. If these variants are still used in the database, this will fail.
  - The values [WAITING_FOR_EMPLOYEE,REJECTED] on the enum `TicketStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProjectPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ProjectAssignmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'REMOVED');

-- CreateEnum
CREATE TYPE "LanguageProficiency" AS ENUM ('BASIC', 'CONVERSATIONAL', 'FLUENT', 'NATIVE');

-- AlterEnum
BEGIN;
CREATE TYPE "TicketCategory_new" AS ENUM ('TRAINING', 'SKILL', 'ASSESSMENT', 'CERTIFICATE', 'MANAGER', 'PROFILE', 'LOGIN', 'TECHNICAL', 'ACCESS', 'DEADLINE', 'OTHER');
ALTER TABLE "support_tickets" ALTER COLUMN "category" TYPE "TicketCategory_new" USING ("category"::text::"TicketCategory_new");
ALTER TYPE "TicketCategory" RENAME TO "TicketCategory_old";
ALTER TYPE "TicketCategory_new" RENAME TO "TicketCategory";
DROP TYPE "TicketCategory_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "TicketStatus_new" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_USER', 'WAITING_MANAGER', 'ESCALATED', 'RESOLVED', 'CLOSED', 'REOPENED');
ALTER TABLE "support_tickets" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "support_tickets" ALTER COLUMN "status" TYPE "TicketStatus_new" USING ("status"::text::"TicketStatus_new");
ALTER TABLE "ticket_status_history" ALTER COLUMN "status" TYPE "TicketStatus_new" USING ("status"::text::"TicketStatus_new");
ALTER TYPE "TicketStatus" RENAME TO "TicketStatus_old";
ALTER TYPE "TicketStatus_new" RENAME TO "TicketStatus";
DROP TYPE "TicketStatus_old";
ALTER TABLE "support_tickets" ALTER COLUMN "status" SET DEFAULT 'OPEN';
COMMIT;

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "careerObjective" TEXT,
ADD COLUMN     "managerCapacity" INTEGER,
ADD COLUMN     "resumeFeedback" TEXT,
ADD COLUMN     "resumeHideContact" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resumeHideRatings" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resumeTemplate" TEXT NOT NULL DEFAULT 'minimalist';

-- CreateTable
CREATE TABLE "skill_assessments" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "skillId" UUID NOT NULL,
    "passingScore" INTEGER NOT NULL DEFAULT 70,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "skill_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_assessment_questions" (
    "id" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "questionText" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "correctOption" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "skill_assessment_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_assessment_submissions" (
    "id" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "answers" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_assessment_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "projectCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "clientName" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "priority" "ProjectPriority" NOT NULL DEFAULT 'MEDIUM',
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "completionPercent" INTEGER NOT NULL DEFAULT 0,
    "technologies" TEXT NOT NULL DEFAULT '',
    "repositoryUrl" TEXT,
    "documentationUrl" TEXT,
    "managerId" UUID,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_assignments" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Developer',
    "responsibilities" TEXT,
    "contributionPercent" INTEGER NOT NULL DEFAULT 100,
    "status" "ProjectAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMPTZ,
    "assignedById" UUID NOT NULL,

    CONSTRAINT "project_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_skill_requirements" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "skillId" UUID NOT NULL,
    "requiredLevel" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "project_skill_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_languages" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "language" TEXT NOT NULL,
    "proficiency" "LanguageProficiency" NOT NULL DEFAULT 'CONVERSATIONAL',

    CONSTRAINT "employee_languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_downloads" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "downloadedById" UUID NOT NULL,
    "template" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resume_downloads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_projectCode_key" ON "projects"("projectCode");

-- CreateIndex
CREATE INDEX "projects_managerId_idx" ON "projects"("managerId");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "project_assignments_projectId_idx" ON "project_assignments"("projectId");

-- CreateIndex
CREATE INDEX "project_assignments_employeeId_idx" ON "project_assignments"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "project_assignments_projectId_employeeId_key" ON "project_assignments"("projectId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "project_skill_requirements_projectId_skillId_key" ON "project_skill_requirements"("projectId", "skillId");

-- CreateIndex
CREATE INDEX "employee_languages_employeeId_idx" ON "employee_languages"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "employee_languages_employeeId_language_key" ON "employee_languages"("employeeId", "language");

-- AddForeignKey
ALTER TABLE "skill_assessments" ADD CONSTRAINT "skill_assessments_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_assessment_questions" ADD CONSTRAINT "skill_assessment_questions_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "skill_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_assessment_submissions" ADD CONSTRAINT "skill_assessment_submissions_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "skill_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_assessment_submissions" ADD CONSTRAINT "skill_assessment_submissions_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_skill_requirements" ADD CONSTRAINT "project_skill_requirements_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_skill_requirements" ADD CONSTRAINT "project_skill_requirements_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_languages" ADD CONSTRAINT "employee_languages_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_downloads" ADD CONSTRAINT "resume_downloads_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_downloads" ADD CONSTRAINT "resume_downloads_downloadedById_fkey" FOREIGN KEY ("downloadedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
