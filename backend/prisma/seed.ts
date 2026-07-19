import { PrismaClient, SystemRole, SkillType, SkillRatingStatus, RatingSource, TrainingStatus, CertificateStatus, TicketCategory, TicketPriority, TicketStatus, SlaStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seeding...");

  // Reset database before seeding
  await prisma.errorLog.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.savedFilter.deleteMany({});
  await prisma.employeeAchievement.deleteMany({});
  await prisma.achievement.deleteMany({});
  await prisma.notificationPreference.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.ticketSlaHistory.deleteMany({});
  await prisma.ticketStatusHistory.deleteMany({});
  await prisma.ticketAttachment.deleteMany({});
  await prisma.ticketMessage.deleteMany({});
  await prisma.supportTicket.deleteMany({});
  await prisma.careerPathSkill.deleteMany({});
  await prisma.careerPath.deleteMany({});
  await prisma.employeeLearningPath.deleteMany({});
  await prisma.learningPathItem.deleteMany({});
  await prisma.learningPath.deleteMany({});
  await prisma.certificate.deleteMany({});
  await prisma.trainingComment.deleteMany({});
  await prisma.trainingProgressHistory.deleteMany({});
  await prisma.trainingPlan.deleteMany({});
  await prisma.trainingProvider.deleteMany({});
  await prisma.skillRatingHistory.deleteMany({});
  await prisma.employeeSkill.deleteMany({});
  await prisma.roleSkillRequirement.deleteMany({});
  await prisma.departmentSkillRequirement.deleteMany({});
  await prisma.skillDependency.deleteMany({});
  await prisma.skill.deleteMany({});
  await prisma.skillCategory.deleteMany({});
  await prisma.managerAssignmentHistory.deleteMany({});
  await prisma.managerAssignment.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.designation.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.loginHistory.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.systemSetting.deleteMany({});

  // 1. Create System Settings
  await prisma.systemSetting.createMany({
    data: [
      { key: "MANAGER_DEFAULT_CAPACITY", value: "10", description: "Default manager capacity limit" },
      { key: "TICKET_REOPEN_LIMIT_DAYS", value: "3", description: "Number of days within which ticket can be reopened" },
      { key: "COMPANY_LOGO_URL", value: "https://via.placeholder.com/160x80.png?text=SkillSphere", description: "Default resume branding logo" },
    ],
  });

  // 2. Create Achievements / Badges
  await prisma.achievement.create({
    data: { name: "Quick Learner", description: "Complete a training plan within 7 days of assignment", badgeCode: "ACH_QUICK_LEARNER", pointValue: 150 },
  });
  await prisma.achievement.create({
    data: { name: "Learning Streak", description: "Complete 3 training plans back-to-back", badgeCode: "ACH_STREAK", pointValue: 300 },
  });
  await prisma.achievement.create({
    data: { name: "Skill Expert", description: "Attain Level 5 rating in any technical skill", badgeCode: "ACH_SKILL_EXPERT", pointValue: 200 },
  });
  await prisma.achievement.create({
    data: { name: "Certified Professional", description: "Get a verified certificate approved", badgeCode: "ACH_CERTIFIED", pointValue: 100 },
  });

  // 3. Create Departments (7)
  const depts = [
    { code: "ENG", name: "Engineering", description: "Software development and infrastructure management" },
    { code: "DATA", name: "Data and Analytics", description: "Data science, database admin, and warehousing" },
    { code: "QA", name: "Quality Assurance", description: "Testing and automation standards checking" },
    { code: "HR", name: "Human Resources", description: "People management, onboarding, and learning support" },
    { code: "FIN", name: "Finance", description: "Company budgeting, accounts, and audits" },
    { code: "SAL", name: "Sales", description: "Enterprise client relationships and acquisitions" },
    { code: "PROD", name: "Product Management", description: "Product strategy, definitions, and roadmaps" },
  ];
  const deptRecords = [];
  for (const d of depts) {
    const dept = await prisma.department.create({ data: d });
    deptRecords.push(dept);
  }

  // Map departments helper
  const deptEng = deptRecords.find(d => d.code === "ENG")!;
  const deptData = deptRecords.find(d => d.code === "DATA")!;
  const deptQa = deptRecords.find(d => d.code === "QA")!;
  const deptHr = deptRecords.find(d => d.code === "HR")!;
  const deptProd = deptRecords.find(d => d.code === "PROD")!;

  // 4. Create Designations (12)
  const designations = [
    { code: "ENG_DIR", name: "Director of Engineering", departmentId: deptEng.id, level: 6 },
    { code: "ENG_MGR", name: "Engineering Manager", departmentId: deptEng.id, level: 5 },
    { code: "ENG_SR", name: "Senior Software Engineer", departmentId: deptEng.id, level: 4 },
    { code: "ENG_JR", name: "Software Engineer", departmentId: deptEng.id, level: 3 },
    
    { code: "DATA_MGR", name: "Data Manager", departmentId: deptData.id, level: 5 },
    { code: "DATA_SCI", name: "Data Scientist", departmentId: deptData.id, level: 4 },
    { code: "DATA_ENG", name: "Data Engineer", departmentId: deptData.id, level: 3 },
    
    { code: "QA_MGR", name: "QA Manager", departmentId: deptQa.id, level: 5 },
    { code: "QA_SR", name: "Senior QA Automation Engineer", departmentId: deptQa.id, level: 4 },
    { code: "QA_JR", name: "QA Tester", departmentId: deptQa.id, level: 2 },
    
    { code: "HR_MGR", name: "HR Manager", departmentId: deptHr.id, level: 5 },
    { code: "PROD_MGR", name: "Product Manager", departmentId: deptProd.id, level: 4 },
  ];
  const desigRecords = [];
  for (const ds of designations) {
    const desig = await prisma.designation.create({ data: ds });
    desigRecords.push(desig);
  }

  // Helper designations
  const desigEngMgr = desigRecords.find(d => d.code === "ENG_MGR")!;
  const desigJrEng = desigRecords.find(d => d.code === "ENG_JR")!;
  const desigDataMgr = desigRecords.find(d => d.code === "DATA_MGR")!;
  const desigDataSci = desigRecords.find(d => d.code === "DATA_SCI")!;
  const desigQaMgr = desigRecords.find(d => d.code === "QA_MGR")!;
  const desigHrMgr = desigRecords.find(d => d.code === "HR_MGR")!;

  // 5. Create Credentials (BCrypt Hashes)
  const adminPass = await bcrypt.hash("Admin@2026", 12);
  const supportPass = await bcrypt.hash("Support@2026", 12);
  const managerPass = await bcrypt.hash("Manager@2026", 12);
  const employeePass = await bcrypt.hash("Employee@2026", 12);

  // 6. Create Users & Employees
  
  // A. Super Admin
  const userAdmin = await prisma.user.create({
    data: { email: "admin@skillsphere.local", passwordHash: adminPass, role: SystemRole.SUPER_ADMIN },
  });
  const empAdmin = await prisma.employee.create({
    data: {
      employeeCode: "EMP-001",
      firstName: "Alex",
      lastName: "Mercer",
      email: "admin@skillsphere.local",
      phone: "555-0100",
      departmentId: deptEng.id,
      designationId: desigRecords[0].id,
      dateOfJoining: new Date("2020-01-15"),
      yearsOfExperience: 12.5,
      workLocation: "New York Office",
      workMode: "ONSITE",
      userId: userAdmin.id,
      profileCompletion: 80,
    },
  });
  await prisma.notificationPreference.create({ data: { userId: userAdmin.id } });

  // B. Admin Support (2)
  const userSupport1 = await prisma.user.create({
    data: { email: "support@skillsphere.local", passwordHash: supportPass, role: SystemRole.ADMIN_SUPPORT },
  });
  await prisma.employee.create({
    data: {
      employeeCode: "EMP-002",
      firstName: "Sarah",
      lastName: "Connor",
      email: "support@skillsphere.local",
      phone: "555-0101",
      departmentId: deptHr.id,
      designationId: desigHrMgr.id,
      dateOfJoining: new Date("2021-03-10"),
      yearsOfExperience: 6.0,
      workLocation: "London Office",
      workMode: "HYBRID",
      userId: userSupport1.id,
      profileCompletion: 75,
    },
  });
  await prisma.notificationPreference.create({ data: { userId: userSupport1.id } });

  const userSupport2 = await prisma.user.create({
    data: { email: "support2@skillsphere.local", passwordHash: supportPass, role: SystemRole.ADMIN_SUPPORT },
  });
  await prisma.employee.create({
    data: {
      employeeCode: "EMP-003",
      firstName: "John",
      lastName: "Doe",
      email: "support2@skillsphere.local",
      phone: "555-0102",
      departmentId: deptHr.id,
      designationId: desigHrMgr.id,
      dateOfJoining: new Date("2022-07-22"),
      yearsOfExperience: 4.5,
      workLocation: "London Office",
      workMode: "HYBRID",
      userId: userSupport2.id,
      profileCompletion: 70,
    },
  });
  await prisma.notificationPreference.create({ data: { userId: userSupport2.id } });

  // C. Managers (4)
  const managersData = [
    { code: "EMP-004", email: "manager@skillsphere.local", first: "David", last: "Miller", desig: desigEngMgr, dept: deptEng, exp: 9.5 },
    { code: "EMP-005", email: "manager2@skillsphere.local", first: "Elena", last: "Rostova", desig: desigDataMgr, dept: deptData, exp: 8.0 },
    { code: "EMP-006", email: "manager3@skillsphere.local", first: "Marcus", last: "Aurelius", desig: desigQaMgr, dept: deptQa, exp: 10.0 },
    { code: "EMP-007", email: "manager4@skillsphere.local", first: "Julia", last: "Roberts", desig: desigHrMgr, dept: deptHr, exp: 7.5 },
  ];
  
  const managerRecords = [];
  for (const m of managersData) {
    const user = await prisma.user.create({
      data: { email: m.email, passwordHash: managerPass, role: SystemRole.MANAGER },
    });
    const emp = await prisma.employee.create({
      data: {
        employeeCode: m.code,
        firstName: m.first,
        lastName: m.last,
        email: m.email,
        phone: `555-01${m.code.split("-")[1]}`,
        departmentId: m.dept.id,
        designationId: m.desig.id,
        dateOfJoining: new Date("2021-06-01"),
        yearsOfExperience: m.exp,
        workLocation: m.dept.code === "ENG" ? "Seattle Office" : m.dept.code === "DATA" ? "Austin Office" : m.dept.code === "QA" ? "Boston Office" : "Remote",
        workMode: m.dept.code === "HR" ? "HYBRID" : "ONSITE",
        userId: user.id,
        profileCompletion: 85,
      },
    });
    await prisma.notificationPreference.create({ data: { userId: user.id } });
    managerRecords.push(emp);
  }

  // D. Employees (35)
  const employeeRecords = [];
  
  // Base Employee requested
  const userBaseEmp = await prisma.user.create({
    data: { email: "employee@skillsphere.local", passwordHash: employeePass, role: SystemRole.EMPLOYEE },
  });
  const empBase = await prisma.employee.create({
    data: {
      employeeCode: "EMP-008",
      firstName: "James",
      lastName: "Cole",
      email: "employee@skillsphere.local",
      phone: "555-0108",
      departmentId: deptEng.id,
      designationId: desigJrEng.id,
      managerId: managerRecords[0].id,
      dateOfJoining: new Date("2023-01-10"),
      yearsOfExperience: 2.5,
      workLocation: "Seattle Office",
      workMode: "HYBRID",
      userId: userBaseEmp.id,
      profileCompletion: 60,
    },
  });
  await prisma.notificationPreference.create({ data: { userId: userBaseEmp.id } });
  employeeRecords.push(empBase);

  // Load other 34 employees (evenly distributed)
  const randomFirstNames = ["Alice", "Bob", "Charlie", "Diana", "Ethan", "Fiona", "George", "Hannah", "Ian", "Jane", "Kevin", "Lisa", "Matthew", "Natalie", "Oliver", "Patricia", "Quincy", "Rachel", "Steven", "Teresa", "Victor", "Wendy", "Xavier", "Yolanda", "Zachary", "Liam", "Sophia", "Noah", "Emma", "Lucas", "Olivia", "Mason", "Ava", "Logan"];
  const randomLastNames = ["Smith", "Jones", "Brown", "Davis", "Wilson", "Taylor", "Thomas", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green", "Adams", "Nelson", "Baker"];

  for (let i = 0; i < 34; i++) {
    const code = `EMP-${String(i + 9).padStart(3, "0")}`;
    const email = `employee${i + 2}@skillsphere.local`;
    const firstName = randomFirstNames[i % randomFirstNames.length];
    const lastName = randomLastNames[i % randomLastNames.length];
    
    // Choose department and manager
    let dept = deptEng;
    let manager = managerRecords[0]; 
    let desig = desigJrEng;

    if (i % 4 === 1) {
      dept = deptData;
      manager = managerRecords[1];
      desig = desigDataSci;
    } else if (i % 4 === 2) {
      dept = deptQa;
      manager = managerRecords[2];
      desig = desigRecords.find(d => d.code === "QA_SR")!;
    } else if (i % 4 === 3) {
      dept = deptHr;
      manager = managerRecords[3];
      desig = desigHrMgr;
    }

    const user = await prisma.user.create({
      data: { email, passwordHash: employeePass, role: SystemRole.EMPLOYEE },
    });

    const emp = await prisma.employee.create({
      data: {
        employeeCode: code,
        firstName,
        lastName,
        email,
        phone: `555-01${code.split("-")[1]}`,
        departmentId: dept.id,
        designationId: desig.id,
        managerId: manager.id,
        dateOfJoining: new Date("2024-02-15"),
        yearsOfExperience: 3.2,
        workLocation: dept.code === "ENG" ? "Seattle Office" : dept.code === "DATA" ? "Austin Office" : dept.code === "QA" ? "Boston Office" : "Remote",
        workMode: i % 2 === 0 ? "HYBRID" : "REMOTE",
        userId: user.id,
        profileCompletion: 50,
      },
    });

    // Manager Assignments History log
    await prisma.managerAssignment.create({
      data: {
        employeeId: emp.id,
        managerId: manager.id,
        assignedById: empAdmin.id,
      },
    });

    await prisma.notificationPreference.create({ data: { userId: user.id } });
    employeeRecords.push(emp);
  }

  console.log(`Generated users. Staff Count: ${employeeRecords.length}`);

  // 6.5. Create Projects and Assign Employees
  const projectsData = [
    {
      code: "PRJ-001",
      name: "SkillSphere Resume Modernization",
      description: "Update resume workflows with branded templates, career readiness scoring, and export support.",
      clientName: "SkillSphere Internal",
      status: "ACTIVE",
      priority: "HIGH",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-10-01"),
      completionPercent: 42,
      technologies: "Angular, Node.js, PostgreSQL, Prisma",
      manager: managerRecords[0],
    },
    {
      code: "PRJ-002",
      name: "Employee Skill Mapping Portal",
      description: "Build the employee and manager dashboards for skills, certifications, trainings and reports.",
      clientName: "SkillSphere Client",
      status: "ACTIVE",
      priority: "CRITICAL",
      startDate: new Date("2026-04-05"),
      endDate: new Date("2026-09-30"),
      completionPercent: 55,
      technologies: "Angular, Express, Redis, Docker",
      manager: managerRecords[1],
    },
    {
      code: "PRJ-003",
      name: "HR Learning Path Automation",
      description: "Automate certification tracking, manager approvals, and training recommendations.",
      clientName: "Corporate HR",
      status: "PLANNING",
      priority: "MEDIUM",
      startDate: new Date("2026-08-01"),
      endDate: new Date("2027-01-15"),
      completionPercent: 12,
      technologies: "Python, PostgreSQL, React",
      manager: managerRecords[3],
    },
    {
      code: "PRJ-004",
      name: "Customer Success Analytics Dashboard",
      description: "Create analytics views for employee progress, ticket SLA performance, and manager utilisation.",
      clientName: "Customer Success",
      status: "ON_HOLD",
      priority: "LOW",
      startDate: new Date("2025-11-15"),
      endDate: new Date("2026-07-31"),
      completionPercent: 80,
      technologies: "Power BI, Node.js, SQL",
      manager: managerRecords[2],
    },
  ];

  const projectRecords = [];
  for (const proj of projectsData) {
    const existingProject = await prisma.project.findFirst({
      where: { projectCode: proj.code },
    });

    const project = existingProject || await prisma.project.create({
      data: {
        projectCode: proj.code,
        name: proj.name,
        description: proj.description,
        clientName: proj.clientName,
        status: proj.status as any,
        priority: proj.priority as any,
        startDate: proj.startDate,
        endDate: proj.endDate,
        completionPercent: proj.completionPercent,
        technologies: proj.technologies,
        managerId: proj.manager.id,
        createdById: userAdmin.id,
      },
    });
    projectRecords.push(project);
  }

  const assignmentRoles = ["Developer", "QA Engineer", "Data Analyst", "HR Lead"];
  let assignCount = 0;
  for (const project of projectRecords) {
    const assignedMembers = employeeRecords.slice(assignCount, assignCount + 5);
    for (let i = 0; i < assignedMembers.length; i++) {
      await prisma.projectAssignment.create({
        data: {
          projectId: project.id,
          employeeId: assignedMembers[i].id,
          role: assignmentRoles[i % assignmentRoles.length],
          responsibilities: `Own the ${assignmentRoles[i % assignmentRoles.length]} workstream and collaborate with cross-functional teams.`,
          contributionPercent: 80 - i * 10,
          status: i === 0 ? "ACTIVE" : "ACTIVE",
          joinedAt: new Date("2026-05-01"),
          assignedById: project.managerId || userAdmin.id,
        },
      });
    }
    assignCount += 3;
  }

  // Create resume download history to show report data
  for (let i = 0; i < 10; i++) {
    const downloadEmployee = employeeRecords[i % employeeRecords.length];
    await prisma.resumeDownload.create({
      data: {
        employeeId: downloadEmployee.id,
        downloadedById: userSupport1.id,
        template: i % 2 === 0 ? "compact" : "modern",
        format: i % 3 === 0 ? "PDF" : "DOCX",
      },
    });
  }

  // Create employee language skills for resume completeness
  for (let i = 0; i < 15; i++) {
    const emp = employeeRecords[i % employeeRecords.length];
    await prisma.employeeLanguage.create({
      data: {
        employeeId: emp.id,
        language: i % 3 === 0 ? "English" : i % 3 === 1 ? "Spanish" : "French",
        proficiency: i % 2 === 0 ? "FLUENT" : "CONVERSATIONAL",
      },
    });
  }

  console.log(`Created projects and assignments: ${projectRecords.length} projects`);

  // 7. Create Skill Categories (5)
  const categories = ["Programming", "Cloud & DevOps", "Databases", "Quality Assurance", "Soft Skills & Leadership"];
  const catRecords = [];
  for (const c of categories) {
    const cat = await prisma.skillCategory.create({ data: { name: c } });
    catRecords.push(cat);
  }

  const catProg = catRecords[0];
  const catCloud = catRecords[1];
  const catDb = catRecords[2];
  const catQa = catRecords[3];
  const catSoft = catRecords[4];

  // 8. Create Skills (30)
  const skillsData = [
    { code: "SK-001", name: "Angular Frontend Development", cat: catProg, type: SkillType.TECHNICAL, req: 4 },
    { code: "SK-002", name: "TypeScript & JavaScript ES6+", cat: catProg, type: SkillType.TECHNICAL, req: 3 },
    { code: "SK-003", name: "Node.js REST API Architecture", cat: catProg, type: SkillType.TECHNICAL, req: 4 },
    { code: "SK-004", name: "NestJS framework structure", cat: catProg, type: SkillType.TECHNICAL, req: 3 },
    { code: "SK-005", name: "Python scripting", cat: catProg, type: SkillType.TECHNICAL, req: 2 },
    
    { code: "SK-006", name: "Docker Containerization", cat: catCloud, type: SkillType.TECHNICAL, req: 3 },
    { code: "SK-007", name: "Kubernetes Orchestration", cat: catCloud, type: SkillType.TECHNICAL, req: 4 },
    { code: "SK-008", name: "CI/CD Pipeline Configurations", cat: catCloud, type: SkillType.TECHNICAL, req: 3 },
    { code: "SK-009", name: "AWS Cloud Infrastructure", cat: catCloud, type: SkillType.TECHNICAL, req: 4 },
    { code: "SK-010", name: "Terraform Infrastructure as Code", cat: catCloud, type: SkillType.TECHNICAL, req: 3 },
    
    { code: "SK-011", name: "PostgreSQL Database Admin", cat: catDb, type: SkillType.TECHNICAL, req: 3 },
    { code: "SK-012", name: "Redis Caching Layers", cat: catDb, type: SkillType.TECHNICAL, req: 3 },
    { code: "SK-013", name: "MongoDB NoSQL schemas", cat: catDb, type: SkillType.TECHNICAL, req: 2 },
    { code: "SK-014", name: "Prisma and Sequelize ORMs", cat: catDb, type: SkillType.TECHNICAL, req: 3 },
    { code: "SK-015", name: "Apache Kafka Event Streams", cat: catDb, type: SkillType.TECHNICAL, req: 4 },
    
    { code: "SK-016", name: "Playwright Automated Testing", cat: catQa, type: SkillType.TECHNICAL, req: 3 },
    { code: "SK-017", name: "Cypress Testing Suites", cat: catQa, type: SkillType.TECHNICAL, req: 3 },
    { code: "SK-018", name: "Jest Backend Mocking", cat: catQa, type: SkillType.TECHNICAL, req: 3 },
    { code: "SK-019", name: "Manual Exploratory Testing", cat: catQa, type: SkillType.FUNCTIONAL, req: 2 },
    { code: "SK-020", name: "Performance testing with k6", cat: catQa, type: SkillType.TECHNICAL, req: 4 },
    
    { code: "SK-021", name: "Team Leadership & Coordination", cat: catSoft, type: SkillType.LEADERSHIP, req: 4 },
    { code: "SK-022", name: "Conflict Resolution", cat: catSoft, type: SkillType.BEHAVIORAL, req: 3 },
    { code: "SK-023", name: "Effective Technical Writing", cat: catSoft, type: SkillType.FUNCTIONAL, req: 3 },
    { code: "SK-024", name: "Enterprise Customer Engagement", cat: catSoft, type: SkillType.BEHAVIORAL, req: 3 },
    { code: "SK-025", name: "Agile Scrum Master role", cat: catSoft, type: SkillType.LEADERSHIP, req: 4 },
    { code: "SK-026", name: "UI/UX Design Wireframing", cat: catProg, type: SkillType.TECHNICAL, req: 3 },
    { code: "SK-027", name: "Git Version Control Workflow", cat: catProg, type: SkillType.TECHNICAL, req: 3 },
    { code: "SK-028", name: "GraphQL API integrations", cat: catProg, type: SkillType.TECHNICAL, req: 3 },
    { code: "SK-029", name: "Linux Administration", cat: catCloud, type: SkillType.TECHNICAL, req: 3 },
    { code: "SK-030", name: "OAuth2 & JWT Web Security", cat: catProg, type: SkillType.TECHNICAL, req: 4 },
  ];

  const skillRecords = [];
  for (const sk of skillsData) {
    const skill = await prisma.skill.create({
      data: {
        skillCode: sk.code,
        skillName: sk.name,
        categoryId: sk.cat.id,
        skillType: sk.type,
        defaultRequiredLevel: sk.req,
      },
    });
    skillRecords.push(skill);
  }
  console.log(`Generated skills catalog: ${skillRecords.length}`);

  // Create Skill Dependencies
  const skAngular = skillRecords.find(s => s.skillCode === "SK-001")!;
  const skTypeScript = skillRecords.find(s => s.skillCode === "SK-002")!;
  await prisma.skillDependency.create({
    data: { skillId: skAngular.id, dependentSkillId: skTypeScript.id, dependencyType: "PREREQUISITE" },
  });

  // Role Skill requirements (Designation constraints)
  for (const desig of desigRecords) {
    if (desig.code === "ENG_JR" || desig.code === "ENG_SR") {
      await prisma.roleSkillRequirement.createMany({
        data: [
          { designationId: desig.id, skillId: skillRecords[0].id, requiredLevel: desig.code === "ENG_SR" ? 4 : 2 },
          { designationId: desig.id, skillId: skillRecords[1].id, requiredLevel: 3 },
          { designationId: desig.id, skillId: skillRecords[2].id, requiredLevel: desig.code === "ENG_SR" ? 4 : 2 },
        ],
      });
    }
  }

  // 9. Generate Employee Skills (70 records)
  let skillCount = 0;
  for (let i = 0; i < 20; i++) {
    const emp = employeeRecords[i];
    
    // Assign 3 to 4 skills each
    for (let sIdx = 0; sIdx < 4; sIdx++) {
      const sk = skillRecords[(i * 3 + sIdx) % skillRecords.length];
      
      const rating = 1 + (sIdx % 4); // self rating 1-4
      let finalRating = rating;
      let status: SkillRatingStatus = SkillRatingStatus.APPROVED;
      
      if (sIdx === 2) {
        status = SkillRatingStatus.SUBMITTED; 
        finalRating = 1;
      } else if (sIdx === 3) {
        status = SkillRatingStatus.REJECTED;
        finalRating = 1;
      }

      const empSk = await prisma.employeeSkill.create({
        data: {
          employeeId: emp.id,
          skillId: sk.id,
          selfRating: rating,
          finalRating,
          status,
          experienceMonths: 12 + sIdx * 6,
          employeeComments: "Familiar with this technology.",
          managerFeedback: status === SkillRatingStatus.REJECTED ? "Requires more proof of experience." : "Verified on team assignment.",
        },
      });

      // Rating history logs
      await prisma.skillRatingHistory.create({
        data: {
          employeeSkillId: empSk.id,
          rating,
          source: RatingSource.SELF,
          updatedById: emp.userId || empAdmin.userId!,
        },
      });

      if (status === SkillRatingStatus.APPROVED) {
        await prisma.skillRatingHistory.create({
          data: {
            employeeSkillId: empSk.id,
            rating: finalRating,
            source: RatingSource.MANAGER,
            updatedById: managerRecords[0].userId!,
          },
        });
      }

      skillCount++;
      if (skillCount >= 70) break;
    }
    if (skillCount >= 70) break;
  }
  console.log(`Generated employee skill levels: ${skillCount}`);

  // 10. Learning Paths
  const lPath = await prisma.learningPath.create({
    data: { pathName: "Frontend Engineering Path", description: "Path to master modern Angular frontend applications.", durationWeeks: 12 },
  });
  await prisma.learningPathItem.createMany({
    data: [
      { learningPathId: lPath.id, skillId: skTypeScript.id, sortOrder: 1, milestoneName: "TypeScript basics", durationWeeks: 4 },
      { learningPathId: lPath.id, skillId: skAngular.id, sortOrder: 2, milestoneName: "Angular CLI & Modules", durationWeeks: 8 },
    ],
  });

  // Assign learning path to base employee
  await prisma.employeeLearningPath.create({
    data: {
      employeeId: empBase.id,
      learningPathId: lPath.id,
      status: "IN_PROGRESS",
      progressPercentage: 50,
    },
  });

  // 11. Create Training Providers & Plans (35)
  const provider = await prisma.trainingProvider.create({
    data: { name: "Udemy Corporate", contactPerson: "John Tech", email: "corp@udemy.com" },
  });

  let planCount = 0;
  for (let i = 0; i < 15; i++) {
    const emp = employeeRecords[i % employeeRecords.length];
    
    // Overdue training plan (due in past)
    await prisma.trainingPlan.create({
      data: {
        trainingCode: `TR-${100 + planCount}`,
        trainingTitle: "Advanced Systems Operations",
        employeeId: emp.id,
        skillId: skillRecords[5].id,
        assignedById: managerRecords[0].id,
        providerId: provider.id,
        startDate: new Date("2026-05-01"),
        dueDate: new Date("2026-06-01"),
        progress: 40,
        status: TrainingStatus.OVERDUE,
        estimatedHours: 20,
      },
    });
    planCount++;

    // Completed verified training
    await prisma.trainingPlan.create({
      data: {
        trainingCode: `TR-${100 + planCount}`,
        trainingTitle: "CI/CD Orchestrations",
        employeeId: emp.id,
        skillId: skillRecords[7].id,
        assignedById: managerRecords[0].id,
        providerId: provider.id,
        startDate: new Date("2026-06-01"),
        dueDate: new Date("2026-07-01"),
        progress: 100,
        status: TrainingStatus.VERIFIED,
        estimatedHours: 15,
        completionDate: new Date("2026-06-25"),
      },
    });
    planCount++;

    // In Progress training
    await prisma.trainingPlan.create({
      data: {
        trainingCode: `TR-${100 + planCount}`,
        trainingTitle: "Effective Technical Writing Course",
        employeeId: emp.id,
        skillId: skillRecords[22].id,
        assignedById: managerRecords[0].id,
        providerId: provider.id,
        startDate: new Date("2026-07-10"),
        dueDate: new Date("2026-08-10"),
        progress: 10,
        status: TrainingStatus.IN_PROGRESS,
        estimatedHours: 8,
      },
    });
    planCount++;
    if (planCount >= 35) break;
  }
  console.log(`Generated training plans: ${planCount}`);

  // 12. Certificates (20 records)
  for (let i = 0; i < 20; i++) {
    const emp = employeeRecords[i % employeeRecords.length];
    
    let status: CertificateStatus = CertificateStatus.VERIFIED;
    if (i === 18) status = CertificateStatus.PENDING;
    else if (i === 19) status = CertificateStatus.REJECTED;

    await prisma.certificate.create({
      data: {
        employeeId: emp.id,
        certificateName: `AWS certified Solution Architect - Assoc-${i}`,
        issuingOrganization: "Amazon Web Services",
        issueDate: new Date("2025-05-15"),
        expiryDate: new Date("2028-05-15"),
        filePath: "uploads/certificates/mock_aws.pdf",
        verificationStatus: status,
        rejectionReason: status === CertificateStatus.REJECTED ? "Document upload is incomplete." : undefined,
      },
    });
  }
  console.log("Generated certificates: 20");

  // 13. Support Tickets (25 records)
  const ticketCategories = [
    TicketCategory.TRAINING, TicketCategory.SKILL, TicketCategory.ASSESSMENT,
    TicketCategory.CERTIFICATE, TicketCategory.MANAGER, TicketCategory.PROFILE,
    TicketCategory.LOGIN, TicketCategory.TECHNICAL, TicketCategory.ACCESS,
    TicketCategory.DEADLINE, TicketCategory.OTHER
  ];

  let tCount = 0;
  for (let i = 0; i < 25; i++) {
    const emp = employeeRecords[i % employeeRecords.length];
    const cat = ticketCategories[i % ticketCategories.length];
    
    let prio: TicketPriority = TicketPriority.MEDIUM;
    if (i % 4 === 0) prio = TicketPriority.CRITICAL;
    else if (i % 4 === 1) prio = TicketPriority.HIGH;
    else if (i % 4 === 3) prio = TicketPriority.LOW;

    let stat: TicketStatus = TicketStatus.OPEN;
    if (i % 3 === 1) stat = TicketStatus.IN_PROGRESS;
    else if (i % 3 === 2) stat = TicketStatus.RESOLVED;
    if (i === 24) stat = TicketStatus.CLOSED;

    let sla: SlaStatus = SlaStatus.WITHIN_SLA;
    let breachReason = undefined;
    if (i === 4 || i === 8) {
      sla = SlaStatus.BREACHED;
      breachReason = "First response took longer than priority window.";
    }

    const tNum = `TK-202607-000${String(i + 1).padStart(2, "0")}`;
    const slaDueDate = new Date();
    slaDueDate.setHours(slaDueDate.getHours() + (prio === TicketPriority.CRITICAL ? 1 : prio === TicketPriority.HIGH ? 4 : prio === TicketPriority.MEDIUM ? 8 : 24));

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber: tNum,
        subject: `Issue regarding ${cat.toLowerCase().replace(/_/g, " ")}`,
        description: `Employee profile details are not showing up correctly under settings for role allocations. Please help solve this bug in ${cat}.`,
        category: cat,
        priority: prio,
        status: stat,
        creatorId: emp.id,
        assignedAdminId: userSupport1.id,
        slaDueDate,
        slaStatus: sla,
        breachReason,
      },
    });

    // Add status history
    await prisma.ticketStatusHistory.create({
      data: { ticketId: ticket.id, status: stat, updatedById: userSupport1.id },
    });

    // Conversations / Messages
    await prisma.ticketMessage.create({
      data: { ticketId: ticket.id, senderId: emp.userId!, message: "I cannot update my profile skills properly. Can you review?", isInternal: false },
    });

    if (stat !== TicketStatus.OPEN) {
      await prisma.ticketMessage.create({
        data: { ticketId: ticket.id, senderId: userSupport1.id, message: "We are currently investigating. Standard SLA logs will be updated.", isInternal: false },
      });
      await prisma.ticketMessage.create({
        data: { ticketId: ticket.id, senderId: userSupport1.id, message: "Developer note: User profile completion needs database refresh.", isInternal: true }, 
      });
    }

    tCount++;
  }
  console.log(`Generated support tickets: ${tCount}`);

  // 14. Audit logs (20)
  for (let i = 0; i < 20; i++) {
    await prisma.auditLog.create({
      data: {
        userId: userAdmin.id,
        action: i % 2 === 0 ? "LOGIN" : "CREATE_EMPLOYEE",
        component: i % 2 === 0 ? "AUTH" : "EMPLOYEE",
        ipAddress: "127.0.0.1",
      },
    });
  }

  // 15. Create Notifications (15)
  for (let i = 0; i < 15; i++) {
    await prisma.notification.create({
      data: {
        userId: userBaseEmp.id,
        title: `Mock alert notification #${i}`,
        message: `This is a dashboard notification warning of category code ${i}`,
        isRead: i < 5,
        type: "SYSTEM",
      },
    });
  }

  // 16. Skill Assessments Seeding
  console.log("Seeding Skill Assessments...");
  const skJs = skillRecords.find(s => s.skillCode === "SK-002")!;
  const skSql = skillRecords.find(s => s.skillCode === "SK-011")!;

  const jsAssessment = await prisma.skillAssessment.create({
    data: {
      title: "TypeScript & JavaScript ES6+ Certification Exam",
      description: "Assess your competency in variables scope, closure, primitives, promises, and array maps.",
      skillId: skJs.id,
      passingScore: 66, // Needs 2/3 correct
      questions: {
        create: [
          {
            questionText: "Which of the following is not a valid way to declare a variable in ES6?",
            options: "var|let|const|def",
            correctOption: 3,
            points: 10
          },
          {
            questionText: "What is the output of console.log(typeof null)?",
            options: "null|undefined|object|string",
            correctOption: 2,
            points: 10
          },
          {
            questionText: "Which method is used to map items of an array into a new array in ES6?",
            options: "forEach|map|filter|reduce",
            correctOption: 1,
            points: 10
          }
        ]
      }
    }
  });

  const sqlAssessment = await prisma.skillAssessment.create({
    data: {
      title: "SQL Query Execution & Joins Quiz",
      description: "Validates your understanding of complex joins, aggregate filters, and B-Tree indexes.",
      skillId: skSql.id,
      passingScore: 66,
      questions: {
        create: [
          {
            questionText: "Which SQL join returns all records when there is a match in either left or right table?",
            options: "INNER JOIN|LEFT JOIN|RIGHT JOIN|FULL OUTER JOIN",
            correctOption: 3,
            points: 10
          },
          {
            questionText: "What index type is the default in PostgreSQL for most tables?",
            options: "Hash|B-Tree|GIN|GiST",
            correctOption: 1,
            points: 10
          },
          {
            questionText: "Which clause is used to filter groups in a SQL SELECT statement?",
            options: "WHERE|HAVING|GROUP BY|ORDER BY",
            correctOption: 1,
            points: 10
          }
        ]
      }
    }
  });

  // Seed a couple of mock submissions for initial charts
  const testEmployee = employeeRecords[0]; // James Cole
  await prisma.skillAssessmentSubmission.create({
    data: {
      assessmentId: jsAssessment.id,
      employeeId: testEmployee.id,
      score: 100,
      passed: true,
      answers: "[3, 2, 1]"
    }
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding database: ", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
