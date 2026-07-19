import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { createAuditLog } from "../utils/audit";

const prisma = new PrismaClient();

// GET /api/resume/:employeeId  - Aggregate all data needed for resume
export const generateResumeData = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: true,
        designation: true,
        employeeSkills: {
          include: { skill: { include: { category: true } } },
          where: { status: { in: ["APPROVED", "SUBMITTED"] } },
          orderBy: { finalRating: "desc" }
        },
        trainingPlans: {
          where: { status: "COMPLETED" },
          include: { skill: true, provider: true, certificates: true },
          orderBy: { completionDate: "desc" }
        },
        certificates: {
          where: { verificationStatus: "VERIFIED" },
          orderBy: { issueDate: "desc" }
        },
        learningPaths: {
          include: { learningPath: { include: { items: { include: { skill: true } } } } }
        },
        achievements: {
          include: { achievement: true },
          orderBy: { awardedDate: "desc" }
        },
        projectAssignments: {
          include: {
            project: {
              include: {
                manager: { select: { firstName: true, lastName: true } },
                requiredSkills: { include: { skill: { select: { skillName: true } } } }
              }
            }
          },
          orderBy: { joinedAt: "desc" }
        },
        languages: true
      }
    });

    if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });

    const companyLogoSetting = await prisma.systemSetting.findUnique({ where: { key: "COMPANY_LOGO_URL" } });
    const companyLogoUrl = companyLogoSetting?.value || process.env.COMPANY_LOGO_URL || "";
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:4200";
    const profileUrl = `${frontendUrl}/employee/profile/${employee.id}`;
    const qrCodeUrl = `https://chart.googleapis.com/chart?chs=140x140&cht=qr&chl=${encodeURIComponent(profileUrl)}`;

    // Compute career readiness
    const totalSkills     = employee.employeeSkills.length;
    const approvedSkills  = employee.employeeSkills.filter(s => s.status === "APPROVED").length;
    const completedTrain  = employee.trainingPlans.length;
    const verifiedCerts   = employee.certificates.length;
    const careerReadiness = totalSkills > 0
      ? Math.min(100, Math.round((approvedSkills / totalSkills) * 40 + Math.min(completedTrain * 5, 30) + Math.min(verifiedCerts * 10, 30)))
      : 0;

    const resumeData = {
      employee: {
        id:                employee.id,
        employeeCode:      employee.employeeCode,
        firstName:         employee.firstName,
        lastName:          employee.lastName,
        email:             employee.email,
        phone:             employee.phone,
        profileImage:      employee.profileImage,
        department:        employee.department.name,
        designation:       employee.designation.name,
        dateOfJoining:     employee.dateOfJoining,
        yearsOfExperience: employee.yearsOfExperience,
        workLocation:      employee.workLocation,
        workMode:          employee.workMode,
        employmentType:    employee.employmentType,
        careerObjective:   employee.careerObjective,
        resumeFeedback:    employee.resumeFeedback,
        resumeTemplate:    employee.resumeTemplate,
        resumeHideContact: employee.resumeHideContact,
        resumeHideRatings: employee.resumeHideRatings,
        companyLogoUrl,
        qrCodeUrl,
        profileUrl,
      },
      skills: employee.employeeSkills.map(s => ({
        name:         s.skill.skillName,
        category:     s.skill.category.name,
        type:         s.skill.skillType,
        selfRating:   s.selfRating,
        finalRating:  s.finalRating,
        status:       s.status,
        expMonths:    s.experienceMonths,
        verified:     s.status === "APPROVED"
      })),
      trainings: employee.trainingPlans.map(t => ({
        title:          t.trainingTitle,
        skill:          t.skill.skillName,
        provider:       t.provider?.name || "Internal",
        type:           t.trainingType,
        completionDate: t.completionDate,
        actualHours:    t.actualHours,
        hasCertificate: t.certificates.length > 0
      })),
      certificates: employee.certificates.map(c => ({
        name:         c.certificateName,
        number:       c.certificateNumber,
        issuer:       c.issuingOrganization,
        issueDate:    c.issueDate,
        expiryDate:   c.expiryDate,
        verified:     true
      })),
      projects: employee.projectAssignments.map(a => ({
        name:           a.project.name,
        code:           a.project.projectCode,
        client:         a.project.clientName,
        role:           a.role,
        responsibilities: a.responsibilities,
        technologies:   a.project.technologies,
        status:         a.project.status,
        startDate:      a.project.startDate,
        endDate:        a.project.endDate,
        completion:     a.project.completionPercent,
        contribution:   a.contributionPercent,
        manager:        a.project.manager ? `${a.project.manager.firstName} ${a.project.manager.lastName}` : null,
        assignmentStatus: a.status
      })),
      achievements: employee.achievements.map(a => ({
        name:        a.achievement.name,
        description: a.achievement.description,
        type:        a.achievement.type,
        points:      a.achievement.pointValue,
        badgeCode:   a.achievement.badgeCode,
        awardedDate: a.awardedDate
      })),
      languages: employee.languages.map(l => ({
        language:    l.language,
        proficiency: l.proficiency
      })),
      learningPaths: employee.learningPaths.map(lp => ({
        name:      lp.learningPath.pathName,
        status:    lp.status,
        progress:  lp.progressPercentage,
        startDate: lp.startDate,
        completed: lp.completedDate
      })),
      summary: {
        totalSkills:      totalSkills,
        approvedSkills:   approvedSkills,
        completedTrainings: completedTrain,
        verifiedCerts:    verifiedCerts,
        totalProjects:    employee.projectAssignments.length,
        activeProjects:   employee.projectAssignments.filter(a => a.status === "ACTIVE").length,
        careerReadiness:  careerReadiness
      }
    };

    return res.json({ success: true, data: resumeData });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// GET /api/resume/team/:managerId  - Manager can view team resumes
export const getTeamResumes = async (req: Request, res: Response) => {
  try {
    const employees = await prisma.employee.findMany({
      where: { managerId: req.params.managerId },
      select: {
        id: true, firstName: true, lastName: true,
        employeeCode: true, profileImage: true,
        resumeTemplate: true,
        resumeHideContact: true,
        resumeHideRatings: true,
        careerObjective: true,
        resumeFeedback: true,
        designation: { select: { name: true } },
        department: { select: { name: true } },
        _count: {
          select: { employeeSkills: true, trainingPlans: true, certificates: true, projectAssignments: true }
        }
      }
    });
    return res.json({ success: true, data: employees });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// PUT /api/resume/settings - Save resume template, hide rules, career objective
export const updateResumeSettings = async (req: Request, res: Response) => {
  try {
    const employeeId = (req as any).user.employeeId;
    if (!employeeId) return res.status(400).json({ success: false, message: "User is not associated with an employee profile" });

    const { careerObjective, resumeTemplate, resumeHideContact, resumeHideRatings } = req.body;

    const updated = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        careerObjective,
        resumeTemplate,
        resumeHideContact: resumeHideContact !== undefined ? Boolean(resumeHideContact) : undefined,
        resumeHideRatings: resumeHideRatings !== undefined ? Boolean(resumeHideRatings) : undefined,
      }
    });

    await createAuditLog((req as any).user.id, "UPDATE_RESUME_SETTINGS", "EMPLOYEE", null, { id: employeeId });

    return res.json({ success: true, data: updated });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// PUT /api/resume/feedback - Manager suggests CV improvements
export const suggestResumeImprovements = async (req: Request, res: Response) => {
  try {
    const { employeeId, feedback } = req.body;
    if (!employeeId) return res.status(400).json({ success: false, message: "employeeId is required" });

    const updated = await prisma.employee.update({
      where: { id: employeeId },
      data: { resumeFeedback: feedback }
    });

    // Send in-app notification to employee
    if (updated.userId) {
      await prisma.notification.create({
        data: {
          userId: updated.userId,
          title: "Resume Suggestion Received",
          message: `Your manager left feedback on your resume: "${feedback.substring(0, 50)}..."`,
          type: "PROFILE",
          deepLink: "/employee/resume"
        }
      });
    }

    await createAuditLog((req as any).user.id, "SUGGEST_RESUME_IMPROVEMENTS", "EMPLOYEE", null, { id: employeeId });

    return res.json({ success: true, data: updated });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// POST /api/resume/download - Track resume downloads in DB and trigger in-app alerts
export const trackResumeDownload = async (req: Request, res: Response) => {
  try {
    const { employeeId, template, format } = req.body;
    if (!employeeId) return res.status(400).json({ success: false, message: "employeeId is required" });

    const download = await prisma.resumeDownload.create({
      data: {
        employeeId,
        downloadedById: (req as any).user.id,
        template: template || "minimalist",
        format: format || "PDF",
      }
    });

    // Send in-app notification to user
    await prisma.notification.create({
      data: {
        userId: (req as any).user.id,
        title: "Resume Downloaded",
        message: `Your resume (${format}) was generated and downloaded successfully.`,
        type: "SYSTEM",
        deepLink: "/employee/resume"
      }
    });

    await createAuditLog((req as any).user.id, "DOWNLOAD_RESUME", "EMPLOYEE", null, download);

    return res.status(201).json({ success: true, data: download });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
