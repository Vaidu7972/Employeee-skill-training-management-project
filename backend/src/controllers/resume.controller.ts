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

    // Generate professional auto-summary
    const approvedSkillsList = employee.employeeSkills.filter(s => s.status === "APPROVED");
    const topSkills = approvedSkillsList
      .slice(0, 3)
      .map(s => s.skill.skillName)
      .join(", ");
    
    // Main technologies
    const techSet = new Set<string>();
    employee.projectAssignments.forEach(pa => {
      if (pa.project.technologies) {
        pa.project.technologies.split(",").forEach(t => {
          const cleaned = t.trim();
          if (cleaned) techSet.add(cleaned);
        });
      }
    });
    const mainTech = Array.from(techSet).slice(0, 4).join(", ");
    
    // Completed projects count
    const completedProjectsCount = employee.projectAssignments.filter(pa => pa.project.status === "COMPLETED").length;
    
    // Project domains
    const domainsSet = new Set<string>();
    employee.projectAssignments.forEach(pa => {
      // simple extraction of domain keywords from project name
      const lastWord = pa.project.name.split(" ").slice(-1)[0];
      domainsSet.add(lastWord);
    });
    const domains = Array.from(domainsSet).slice(0, 3).join(", ");

    let autoSummary = `Professional ${employee.designation.name} with ${employee.yearsOfExperience} years of experience in the ${employee.department.name} department. `;
    if (topSkills) {
      autoSummary += `Recognized for verified proficiency in ${topSkills}. `;
    }
    if (mainTech) {
      autoSummary += `Experienced in core technologies including ${mainTech}. `;
    }
    if (completedProjectsCount > 0) {
      autoSummary += `Successfully delivered ${completedProjectsCount} completed project(s) `;
      if (domains) {
        autoSummary += `focusing on ${domains} domains. `;
      }
    } else {
      autoSummary += `Actively contributing to critical project workflows. `;
    }
    if (completedTrain > 0 || verifiedCerts > 0) {
      autoSummary += `Demonstrates continuous learning, with ${completedTrain} completed training plan(s) and ${verifiedCerts} verified credential(s).`;
    }

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
        education:         employee.education,
        autoSummary:       autoSummary,
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

// GET /api/resume/team-summary/:managerId - Get aggregated dashboard data for Team Resume
export const getTeamSummary = async (req: Request, res: Response) => {
  try {
    const { managerId } = req.params;
    const manager = await prisma.employee.findUnique({
      where: { id: managerId },
      include: { department: true }
    });
    if (!manager) return res.status(404).json({ success: false, message: "Manager not found" });

    const team = await prisma.employee.findMany({
      where: { managerId },
      include: {
        designation: true,
        department: true,
        employeeSkills: {
          where: { status: "APPROVED" },
          include: { skill: true }
        },
        trainingPlans: true,
        certificates: {
          where: { verificationStatus: "VERIFIED" }
        },
        projectAssignments: {
          include: { project: true }
        }
      }
    });

    // Aggregate stats
    const totalTeamMembers = team.length;
    const avgExperience = totalTeamMembers > 0 
      ? Number((team.reduce((acc, t) => acc + Number(t.yearsOfExperience), 0) / totalTeamMembers).toFixed(1))
      : 0;

    // Top Skills
    const skillCounts: Record<string, number> = {};
    team.forEach(t => {
      t.employeeSkills.forEach(es => {
        skillCounts[es.skill.skillName] = (skillCounts[es.skill.skillName] || 0) + 1;
      });
    });
    const topSkills = Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);

    // Main Technologies
    const techCounts: Record<string, number> = {};
    team.forEach(t => {
      t.projectAssignments.forEach(pa => {
        if (pa.project.technologies) {
          pa.project.technologies.split(",").forEach(tech => {
            const cleaned = tech.trim();
            if (cleaned) {
              techCounts[cleaned] = (techCounts[cleaned] || 0) + 1;
            }
          });
        }
      });
    });
    const mainTechnologies = Object.entries(techCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);

    // Projects
    const projectIds = new Set<string>();
    let activeProjectsCount = 0;
    let completedProjectsCount = 0;
    team.forEach(t => {
      t.projectAssignments.forEach(pa => {
        if (!projectIds.has(pa.project.id)) {
          projectIds.add(pa.project.id);
          if (pa.project.status === "ACTIVE") activeProjectsCount++;
          else if (pa.project.status === "COMPLETED") completedProjectsCount++;
        }
      });
    });

    // Trainings
    let totalTrainings = 0;
    let completedTrainings = 0;
    team.forEach(t => {
      t.trainingPlans.forEach(tp => {
        totalTrainings++;
        if (tp.status === "COMPLETED" || tp.status === "VERIFIED") {
          completedTrainings++;
        }
      });
    });
    const trainingCompletionPercent = totalTrainings > 0
      ? Math.round((completedTrainings / totalTrainings) * 100)
      : 0;

    // Certificates
    const verifiedCertificatesCount = team.reduce((acc, t) => acc + t.certificates.length, 0);

    // Employee project contributions list
    const projectContributions: any[] = [];
    team.forEach(t => {
      t.projectAssignments.forEach(pa => {
        projectContributions.push({
          employeeId: t.id,
          employeeName: `${t.firstName} ${t.lastName}`,
          projectCode: pa.project.projectCode,
          projectName: pa.project.name,
          role: pa.role,
          contributionPercent: pa.contributionPercent,
          status: pa.project.status,
          technologies: pa.project.technologies,
        });
      });
    });

    return res.json({
      success: true,
      data: {
        managerName: `${manager.firstName} ${manager.lastName}`,
        department: manager.department?.name || "Engineering",
        totalTeamMembers,
        averageExperience: avgExperience,
        topSkills,
        mainTechnologies,
        activeProjects: activeProjectsCount,
        completedProjects: completedProjectsCount,
        trainingCompletionPercentage: trainingCompletionPercent,
        verifiedCertificates: verifiedCertificatesCount,
        employeeContributions: projectContributions,
        teamMembers: team.map(t => ({
          id: t.id,
          firstName: t.firstName,
          lastName: t.lastName,
          employeeCode: t.employeeCode,
          designation: t.designation?.name,
          yearsOfExperience: t.yearsOfExperience,
          email: t.email,
        }))
      }
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
