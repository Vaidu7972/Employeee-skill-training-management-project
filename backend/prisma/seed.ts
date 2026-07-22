import { PrismaClient, SystemRole, SkillType, SkillRatingStatus, RatingSource, TrainingStatus, CertificateStatus, TicketCategory, TicketPriority, TicketStatus, SlaStatus, ProjectStatus, ProjectPriority, ProjectAssignmentStatus, LanguageProficiency } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seeding...");

  // Reset database before seeding (cascade delete where supported or sequential deletes)
  await prisma.errorLog.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.savedFilter.deleteMany({});
  await prisma.employeeAchievement.deleteMany({});
  await prisma.achievement.deleteMany({});
  await prisma.notificationPreference.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.ticketSlaHistory.deleteMany({});
  await prisma.ticketHistory.deleteMany({});
  await prisma.ticketAttachment.deleteMany({});
  await prisma.ticketComment.deleteMany({});
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
  await prisma.projectAssignment.deleteMany({});
  await prisma.projectSkillRequirement.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.employeeLanguage.deleteMany({});
  await prisma.resumeDownload.deleteMany({});
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
  await prisma.achievement.createMany({
    data: [
      { name: "Quick Learner", description: "Complete a training plan within 7 days of assignment", badgeCode: "ACH_QUICK_LEARNER", pointValue: 150 },
      { name: "Learning Streak", description: "Complete 3 training plans back-to-back", badgeCode: "ACH_STREAK", pointValue: 300 },
      { name: "Skill Expert", description: "Attain Level 5 rating in any technical skill", badgeCode: "ACH_SKILL_EXPERT", pointValue: 200 },
      { name: "Certified Professional", description: "Get a verified certificate approved", badgeCode: "ACH_CERTIFIED", pointValue: 100 },
    ],
  });

  // 3. Create Departments (8)
  const depts = [
    { code: "ENG", name: "Engineering", description: "Software development and infrastructure management" },
    { code: "DATA", name: "Data and Analytics", description: "Data science, database admin, and warehousing" },
    { code: "QA", name: "Quality Assurance", description: "Testing and automation standards checking" },
    { code: "HR", name: "Human Resources", description: "People management, onboarding, and learning support" },
    { code: "FIN", name: "Finance", description: "Company budgeting, accounts, and audits" },
    { code: "SAL", name: "Sales", description: "Enterprise client relationships and acquisitions" },
    { code: "PROD", name: "Product Management", description: "Product strategy, definitions, and roadmaps" },
    { code: "OPS", name: "Operations", description: "Business logistics, infrastructure, and customer success" },
  ];
  const deptRecords = [];
  for (const d of depts) {
    const dept = await prisma.department.create({ data: d });
    deptRecords.push(dept);
  }

  const deptEng = deptRecords.find(d => d.code === "ENG")!;
  const deptData = deptRecords.find(d => d.code === "DATA")!;
  const deptQa = deptRecords.find(d => d.code === "QA")!;
  const deptHr = deptRecords.find(d => d.code === "HR")!;
  const deptFin = deptRecords.find(d => d.code === "FIN")!;
  const deptSal = deptRecords.find(d => d.code === "SAL")!;
  const deptProd = deptRecords.find(d => d.code === "PROD")!;
  const deptOps = deptRecords.find(d => d.code === "OPS")!;

  // 4. Create Designations (15)
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
    
    { code: "OPS_MGR", name: "Operations Manager", departmentId: deptOps.id, level: 5 },
    { code: "OPS_ASSOC", name: "Operations Associate", departmentId: deptOps.id, level: 3 },
    { code: "OPS_ANALYST", name: "Operations Analyst", departmentId: deptOps.id, level: 3 },
  ];
  const desigRecords = [];
  for (const ds of designations) {
    const desig = await prisma.designation.create({ data: ds });
    desigRecords.push(desig);
  }

  const desigEngMgr = desigRecords.find(d => d.code === "ENG_MGR")!;
  const desigJrEng = desigRecords.find(d => d.code === "ENG_JR")!;
  const desigDataMgr = desigRecords.find(d => d.code === "DATA_MGR")!;
  const desigDataSci = desigRecords.find(d => d.code === "DATA_SCI")!;
  const desigQaMgr = desigRecords.find(d => d.code === "QA_MGR")!;
  const desigHrMgr = desigRecords.find(d => d.code === "HR_MGR")!;
  const desigOpsMgr = desigRecords.find(d => d.code === "OPS_MGR")!;
  const desigOpsAssoc = desigRecords.find(d => d.code === "OPS_ASSOC")!;

  // 5. Encrypted Credentials
  const adminPass = bcrypt.hashSync("Admin@2026", 10);
  const managerPass = bcrypt.hashSync("Manager@2026", 10);
  const employeePass = bcrypt.hashSync("Employee@2026", 10);

  // 6. Seed Users & Employees
  
  // A. Admin (1)
  const userAdmin = await prisma.user.create({
    data: { email: "admin@skillsphere.local", passwordHash: adminPass, role: SystemRole.ADMIN },
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
      education: "Ph.D. in Computer Science, Massachusetts Institute of Technology (2012 - 2016)",
    },
  });
  await prisma.notificationPreference.create({ data: { userId: userAdmin.id } });

  // B. Managers (6)
  // 1. manager@skillsphere.local (for E2E)
  // 2. manager1@skillsphere.local (for demo credentials)
  // 3-6. manager2..5
  const managersData = [
    { code: "EMP-002", email: "manager@skillsphere.local", first: "David", last: "Miller", desig: desigEngMgr, dept: deptEng, exp: 9.5, edu: "M.S. in Computer Science, Stanford University (2014 - 2016)" },
    { code: "EMP-003", email: "manager1@skillsphere.local", first: "Elena", last: "Rostova", desig: desigDataMgr, dept: deptData, exp: 8.0, edu: "Ph.D. in Data Science, UC Berkeley (2015 - 2019)" },
    { code: "EMP-004", email: "manager2@skillsphere.local", first: "Marcus", last: "Aurelius", desig: desigQaMgr, dept: deptQa, exp: 10.0, edu: "B.S. in Software Engineering, University of Rome (2010 - 2014)" },
    { code: "EMP-005", email: "manager3@skillsphere.local", first: "Julia", last: "Roberts", desig: desigHrMgr, dept: deptHr, exp: 7.5, edu: "MBA in Human Resources, NYU Stern (2017 - 2019)" },
    { code: "EMP-006", email: "manager4@skillsphere.local", first: "Thomas", last: "Anderson", desig: desigOpsMgr, dept: deptOps, exp: 8.5, edu: "B.S. in Cybernetics, Columbia University (2012 - 2016)" },
    { code: "EMP-060", email: "manager5@skillsphere.local", first: "Sophia", last: "Loren", desig: desigEngMgr, dept: deptEng, exp: 11.0, edu: "M.S. in Information Systems, Carnegie Mellon University (2013 - 2015)" },
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
        managerCapacity: 10,
        education: m.edu,
      },
    });
    await prisma.notificationPreference.create({ data: { userId: user.id } });
    managerRecords.push(emp);
  }

  // C. Employees (50 total: James Cole, Sarah Connor, plus 48 generated)
  const employeeRecords = [];
  
  // employee@skillsphere.local
  const userE2EEmp = await prisma.user.create({
    data: { email: "employee@skillsphere.local", passwordHash: employeePass, role: SystemRole.EMPLOYEE },
  });
  const empE2E = await prisma.employee.create({
    data: {
      employeeCode: "EMP-007",
      firstName: "James",
      lastName: "Cole",
      email: "employee@skillsphere.local",
      phone: "555-0107",
      departmentId: deptEng.id,
      designationId: desigJrEng.id,
      managerId: managerRecords[0].id,
      dateOfJoining: new Date("2023-01-10"),
      yearsOfExperience: 2.5,
      workLocation: "Seattle Office",
      workMode: "HYBRID",
      userId: userE2EEmp.id,
      profileCompletion: 60,
      education: "B.S. in Computer Science, University of Washington (2019 - 2023)",
    },
  });
  await prisma.notificationPreference.create({ data: { userId: userE2EEmp.id } });
  employeeRecords.push(empE2E);

  // employee1@skillsphere.local
  const userDemoEmp = await prisma.user.create({
    data: { email: "employee1@skillsphere.local", passwordHash: employeePass, role: SystemRole.EMPLOYEE },
  });
  const empDemo = await prisma.employee.create({
    data: {
      employeeCode: "EMP-008",
      firstName: "Sarah",
      lastName: "Connor",
      email: "employee1@skillsphere.local",
      phone: "555-0108",
      departmentId: deptEng.id,
      designationId: desigJrEng.id,
      managerId: managerRecords[0].id,
      dateOfJoining: new Date("2023-03-15"),
      yearsOfExperience: 4.2,
      workLocation: "Seattle Office",
      workMode: "REMOTE",
      userId: userDemoEmp.id,
      profileCompletion: 70,
      education: "B.S. in Information Systems, Seattle University (2017 - 2021)",
    },
  });
  await prisma.notificationPreference.create({ data: { userId: userDemoEmp.id } });
  employeeRecords.push(empDemo);

  const randomFirstNames = ["Alice", "Bob", "Charlie", "Diana", "Ethan", "Fiona", "George", "Hannah", "Ian", "Jane", "Kevin", "Lisa", "Matthew", "Natalie", "Oliver", "Patricia", "Quincy", "Rachel", "Steven", "Teresa", "Victor", "Wendy", "Xavier", "Yolanda", "Zachary", "Liam", "Sophia", "Noah", "Emma", "Lucas", "Olivia", "Mason", "Ava", "Logan", "Isabella", "Grace", "Jack", "Lily", "Leo", "Mia"];
  const randomLastNames = ["Smith", "Jones", "Brown", "Davis", "Wilson", "Taylor", "Thomas", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green", "Adams", "Nelson", "Baker", "Carter", "Mitchell", "Roberts", "Gomez", "Phillips"];
  const universities = ["UC Berkeley", "UT Austin", "Georgia Tech", "UIUC", "Carnegie Mellon", "Cornell", "Michigan", "Purdue", "Harvard", "Stanford"];

  // Seed another 48 employees to make 50 total
  for (let i = 0; i < 48; i++) {
    const codeNumber = i + 9;
    const code = `EMP-${String(codeNumber).padStart(3, "0")}`;
    const email = `employee${i + 2}@skillsphere.local`;
    const firstName = randomFirstNames[i % randomFirstNames.length];
    const lastName = randomLastNames[i % randomLastNames.length];
    
    // Distribute across departments and managers
    let dept = deptEng;
    let manager = managerRecords[0]; 
    let desig = desigJrEng;

    if (i % 5 === 1) {
      dept = deptData;
      manager = managerRecords[1];
      desig = desigDataSci;
    } else if (i % 5 === 2) {
      dept = deptQa;
      manager = managerRecords[2];
      desig = desigRecords.find(d => d.code === "QA_SR")!;
    } else if (i % 5 === 3) {
      dept = deptHr;
      manager = managerRecords[3];
      desig = desigHrMgr;
    } else if (i % 5 === 4) {
      dept = deptOps;
      manager = managerRecords[4];
      desig = desigOpsAssoc;
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
        education: `B.S. in Software Engineering, ${universities[i % universities.length]} (2020 - 2024)`,
      },
    });

    // Record initial Manager Assignment
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

  console.log(`Successfully generated ${employeeRecords.length} Employees and ${managerRecords.length} Managers.`);

  // 7. Create Projects (15)
  const projectTitles = [
    "SkillSphere Resume Modernization", "Employee Skill Mapping Portal", "HR Learning Path Automation",
    "Customer Success Analytics Dashboard", "Enterprise Cloud Sync System", "Single Sign-On Integration",
    "SLA Ticket Automation Engine", "Dynamic Charting Components", "Gamification System API",
    "Global Staff CSV Importer", "Multi-Tenant Database Scaling", "Security Auditing Framework",
    "Real-time Notification Broadcaster", "Training Provider Scheduler", "System Performance Profiler"
  ];

  const projectRecords = [];
  for (let i = 0; i < 15; i++) {
    const code = `PRJ-${String(i + 1).padStart(3, "0")}`;
    const statusVal = i % 5 === 0 ? ProjectStatus.COMPLETED : i % 5 === 1 ? ProjectStatus.PLANNING : i % 5 === 3 ? ProjectStatus.ON_HOLD : ProjectStatus.ACTIVE;
    const prioVal = i % 3 === 0 ? ProjectPriority.CRITICAL : i % 3 === 1 ? ProjectPriority.HIGH : ProjectPriority.MEDIUM;
    const completion = statusVal === ProjectStatus.COMPLETED ? 100 : i % 5 === 1 ? 0 : 20 + (i * 5);

    const project = await prisma.project.create({
      data: {
        projectCode: code,
        name: projectTitles[i],
        description: `Project focus: building the ${projectTitles[i].toLowerCase()} framework including design, specs, database schemas, and Angular components.`,
        clientName: i % 2 === 0 ? "SkillSphere Internal" : "Corporate Client " + i,
        status: statusVal,
        priority: prioVal,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
        completionPercent: completion,
        technologies: "Angular, Node.js, Express, Postgres, TypeScript",
        managerId: managerRecords[i % managerRecords.length].id,
        createdById: userAdmin.id,
      },
    });
    projectRecords.push(project);
  }
  console.log(`Generated ${projectRecords.length} Projects.`);

  // 8. Create Project Assignments
  const rolesList = ["Developer", "QA Engineer", "Database Engineer", "Business Analyst", "Architect"];
  for (let i = 0; i < employeeRecords.length; i++) {
    const employee = employeeRecords[i];
    const project = projectRecords[i % projectRecords.length];
    await prisma.projectAssignment.create({
      data: {
        projectId: project.id,
        employeeId: employee.id,
        role: rolesList[i % rolesList.length],
        responsibilities: "Responsible for core components, integration tests, and weekly status updates.",
        contributionPercent: 50 + (i % 6) * 10,
        status: ProjectAssignmentStatus.ACTIVE,
        joinedAt: new Date("2026-03-01"),
        assignedById: project.managerId || empAdmin.id,
      },
    });
  }
  console.log(`Assigned ${employeeRecords.length} Employees to Projects.`);

  // 9. Create Skill Categories (5)
  const categories = ["Programming", "Cloud & DevOps", "Databases", "Quality Assurance", "Soft Skills & Leadership"];
  const catRecords = [];
  for (const c of categories) {
    const cat = await prisma.skillCategory.create({ data: { name: c } });
    catRecords.push(cat);
  }

  // 10. Create Skills (30)
  const skillsData = [
    { code: "SK-001", name: "Angular Frontend Development", cat: catRecords[0], type: SkillType.TECHNICAL, req: 4 },
    { code: "SK-002", name: "TypeScript & JavaScript ES6+", cat: catRecords[0], type: SkillType.TECHNICAL, req: 3 },
    { code: "SK-003", name: "Node.js REST API Architecture", cat: catRecords[0], type: SkillType.TECHNICAL, req: 4 },
    { code: "SK-004", name: "NestJS framework structure", cat: catRecords[0], type: SkillType.TECHNICAL, req: 3 },
    { code: "SK-005", name: "Python scripting", cat: catRecords[0], type: SkillType.TECHNICAL, req: 2 },
    
    { code: "SK-006", name: "Docker Containerization", cat: catRecords[1], type: SkillType.TECHNICAL, req: 3 },
    { code: "SK-007", name: "Kubernetes Orchestration", cat: catRecords[1], type: SkillType.TECHNICAL, req: 4 },
    { code: "SK-008", name: "CI/CD Pipeline Configurations", cat: catRecords[1], type: SkillType.TECHNICAL, req: 3 },
    { code: "SK-009", name: "AWS Cloud Infrastructure", cat: catRecords[1], type: SkillType.TECHNICAL, req: 4 },
    { code: "SK-010", name: "Terraform Infrastructure as Code", cat: catRecords[1], type: SkillType.TECHNICAL, req: 3 },
    
    { code: "SK-011", name: "PostgreSQL Database Admin", cat: catRecords[2], type: SkillType.TECHNICAL, req: 3 },
    { code: "SK-012", name: "Redis Caching Layers", cat: catRecords[2], type: SkillType.TECHNICAL, req: 3 },
    { code: "SK-013", name: "MongoDB NoSQL schemas", cat: catRecords[2], type: SkillType.TECHNICAL, req: 2 },
    { code: "SK-014", name: "Prisma and Sequelize ORMs", cat: catRecords[2], type: SkillType.TECHNICAL, req: 3 },
    { code: "SK-015", name: "Apache Kafka Event Streams", cat: catRecords[2], type: SkillType.TECHNICAL, req: 4 },
    
    { code: "SK-016", name: "Playwright Automated Testing", cat: catRecords[3], type: SkillType.TECHNICAL, req: 3 },
    { code: "SK-017", name: "Cypress Testing Suites", cat: catRecords[3], type: SkillType.TECHNICAL, req: 3 },
    { code: "SK-018", name: "Jest Backend Mocking", cat: catRecords[3], type: SkillType.TECHNICAL, req: 3 },
    { code: "SK-019", name: "Manual Exploratory Testing", cat: catRecords[3], type: SkillType.FUNCTIONAL, req: 2 },
    { code: "SK-020", name: "Performance testing with k6", cat: catRecords[3], type: SkillType.TECHNICAL, req: 4 },
    
    { code: "SK-021", name: "Team Leadership & Coordination", cat: catRecords[4], type: SkillType.LEADERSHIP, req: 4 },
    { code: "SK-022", name: "Conflict Resolution", cat: catRecords[4], type: SkillType.BEHAVIORAL, req: 3 },
    { code: "SK-023", name: "Effective Technical Writing", cat: catRecords[4], type: SkillType.FUNCTIONAL, req: 3 },
    { code: "SK-024", name: "Enterprise Customer Engagement", cat: catRecords[4], type: SkillType.BEHAVIORAL, req: 3 },
    { code: "SK-025", name: "Agile Scrum Master role", cat: catRecords[4], type: SkillType.LEADERSHIP, req: 4 },
    { code: "SK-026", name: "UI/UX Design Wireframing", cat: catRecords[0], type: SkillType.TECHNICAL, req: 3 },
    { code: "SK-027", name: "Git Version Control Workflow", cat: catRecords[0], type: SkillType.TECHNICAL, req: 3 },
    { code: "SK-028", name: "GraphQL API integrations", cat: catRecords[0], type: SkillType.TECHNICAL, req: 3 },
    { code: "SK-029", name: "Linux Administration", cat: catRecords[1], type: SkillType.TECHNICAL, req: 3 },
    { code: "SK-030", name: "OAuth2 & JWT Web Security", cat: catRecords[0], type: SkillType.TECHNICAL, req: 4 },
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
  console.log(`Generated ${skillRecords.length} Skills.`);

  // 10.5. Seed Role Skill Requirements for Designations
  console.log("Seeding Role Skill Requirements for Designations...");
  const skillMap = new Map(skillRecords.map(s => [s.skillCode, s.id]));
  const desigMap = new Map(desigRecords.map(d => [d.code, d.id]));

  const requirementsToSeed = [
    // ENG_JR (Software Engineer)
    { desig: "ENG_JR", skill: "SK-001", lvl: 3 }, // Angular
    { desig: "ENG_JR", skill: "SK-002", lvl: 3 }, // TypeScript
    { desig: "ENG_JR", skill: "SK-003", lvl: 3 }, // Node.js
    { desig: "ENG_JR", skill: "SK-027", lvl: 3 }, // Git

    // ENG_SR (Senior Software Engineer)
    { desig: "ENG_SR", skill: "SK-001", lvl: 4 }, // Angular
    { desig: "ENG_SR", skill: "SK-002", lvl: 4 }, // TypeScript
    { desig: "ENG_SR", skill: "SK-003", lvl: 4 }, // Node.js
    { desig: "ENG_SR", skill: "SK-006", lvl: 3 }, // Docker
    { desig: "ENG_SR", skill: "SK-008", lvl: 3 }, // CI/CD
    { desig: "ENG_SR", skill: "SK-030", lvl: 4 }, // OAuth2

    // ENG_MGR (Engineering Manager)
    { desig: "ENG_MGR", skill: "SK-021", lvl: 4 }, // Team Leadership
    { desig: "ENG_MGR", skill: "SK-022", lvl: 4 }, // Conflict Resolution
    { desig: "ENG_MGR", skill: "SK-025", lvl: 4 }, // Scrum Master
    { desig: "ENG_MGR", skill: "SK-002", lvl: 3 }, // TypeScript

    // DATA_SCI (Data Scientist)
    { desig: "DATA_SCI", skill: "SK-005", lvl: 4 }, // Python
    { desig: "DATA_SCI", skill: "SK-011", lvl: 3 }, // Postgres
    { desig: "DATA_SCI", skill: "SK-012", lvl: 3 }, // Redis

    // QA_SR (Senior QA Automation Engineer)
    { desig: "QA_SR", skill: "SK-016", lvl: 4 }, // Playwright
    { desig: "QA_SR", skill: "SK-017", lvl: 4 }, // Cypress
    { desig: "QA_SR", skill: "SK-018", lvl: 4 }, // Jest

    // QA_JR (QA Tester)
    { desig: "QA_JR", skill: "SK-019", lvl: 3 }, // Manual Testing
    { desig: "QA_JR", skill: "SK-017", lvl: 2 }, // Cypress

    // HR_MGR (HR Manager)
    { desig: "HR_MGR", skill: "SK-021", lvl: 4 }, // Team Leadership
    { desig: "HR_MGR", skill: "SK-022", lvl: 4 }, // Conflict Resolution

    // OPS_ASSOC (Operations Associate)
    { desig: "OPS_ASSOC", skill: "SK-023", lvl: 3 }, // Technical Writing
    { desig: "OPS_ASSOC", skill: "SK-024", lvl: 3 }  // Customer Engagement
  ];

  for (const req of requirementsToSeed) {
    const designationId = desigMap.get(req.desig);
    const skillId = skillMap.get(req.skill);
    if (designationId && skillId) {
      await prisma.roleSkillRequirement.create({
        data: {
          designationId,
          skillId,
          requiredLevel: req.lvl
        }
      });
    }
  }
  console.log("Successfully seeded Role Skill Requirements.");

  // 11. Create Employee Skill Assignments (100) & Skill Rating History (50)
  let skillAssignmentsCount = 0;
  let historyLogsCount = 0;

  // We loop over employees and skills to assign them
  for (let eIdx = 0; eIdx < employeeRecords.length; eIdx++) {
    const emp = employeeRecords[eIdx];
    
    // Assign 3 to 4 skills per employee for realistic dataset
    const skillsToAssign = 3 + (eIdx % 2); // 3 or 4
    for (let sIdx = 0; sIdx < skillsToAssign; sIdx++) {
      if (skillAssignmentsCount >= 200) break;
      const sk = skillRecords[(eIdx * 3 + sIdx) % skillRecords.length];

      // Determine explicit finalRating to produce No, Low, Medium, and High Gaps
      // sIdx % 4 determines gap type: 0 -> No Gap, 1 -> Low Gap (1), 2 -> Medium Gap (2), 3 -> High Gap (3)
      const reqLevel = sk.defaultRequiredLevel || 4;
      let finalRatingVal = reqLevel;
      if (sIdx % 4 === 1) {
        finalRatingVal = Math.max(1, reqLevel - 1); // Low Gap (1)
      } else if (sIdx % 4 === 2) {
        finalRatingVal = Math.max(1, reqLevel - 2); // Medium Gap (2)
      } else if (sIdx % 4 === 3) {
        finalRatingVal = Math.max(1, reqLevel - 3); // High Gap (3+)
      }
      const selfRatingVal = Math.min(5, finalRatingVal + 1);
      const statusVal = sIdx % 2 === 0 ? SkillRatingStatus.APPROVED : SkillRatingStatus.SUBMITTED;

      const empSkill = await prisma.employeeSkill.create({
        data: {
          employeeId: emp.id,
          skillId: sk.id,
          selfRating: selfRatingVal,
          finalRating: finalRatingVal,
          status: statusVal,
          experienceMonths: 6 + (eIdx * 2),
          employeeComments: "Self-assessed based on project deliverables and technical experience.",
          managerFeedback: statusVal === SkillRatingStatus.APPROVED ? "Rating reviewed and validated." : undefined,
        },
      });
      skillAssignmentsCount++;

      // Create history entries
      if (historyLogsCount < 50) {
        await prisma.skillRatingHistory.create({
          data: {
            employeeSkillId: empSkill.id,
            rating: selfRatingVal,
            source: RatingSource.SELF,
            updatedById: emp.userId || userAdmin.id,
            comments: "Self assessment rating submitted.",
          },
        });
        historyLogsCount++;

        if (statusVal === SkillRatingStatus.APPROVED && historyLogsCount < 50) {
          await prisma.skillRatingHistory.create({
            data: {
              employeeSkillId: empSkill.id,
              rating: finalRatingVal,
              source: RatingSource.MANAGER,
              updatedById: managerRecords[0].userId!,
              comments: "Manager approved.",
            },
          });
          historyLogsCount++;
        }
      }
    }
  }

  // Ensure we reach exactly 50 history logs
  while (historyLogsCount < 50) {
    const firstEmpSkill = await prisma.employeeSkill.findFirst();
    if (firstEmpSkill) {
      await prisma.skillRatingHistory.create({
        data: {
          employeeSkillId: firstEmpSkill.id,
          rating: 3,
          source: RatingSource.SYSTEM,
          updatedById: userAdmin.id,
          comments: "System auto-check status updated.",
        },
      });
      historyLogsCount++;
    }
  }

  console.log(`Generated ${skillAssignmentsCount} Employee Skill Assignments and ${historyLogsCount} History Logs.`);

  // 12. Create Training Provider
  const provider = await prisma.trainingProvider.create({
    data: { name: "Udemy Corporate Portal", contactPerson: "John Doe", email: "corp@udemy.com", phone: "555-9000" },
  });

  // 13. Create Training Plans (40)
  const trainingStatuses = [
    TrainingStatus.ASSIGNED, TrainingStatus.NOT_STARTED, TrainingStatus.IN_PROGRESS,
    TrainingStatus.ON_HOLD, TrainingStatus.SUBMITTED_FOR_REVIEW, TrainingStatus.COMPLETED,
    TrainingStatus.VERIFIED, TrainingStatus.OVERDUE, TrainingStatus.CANCELLED
  ];
  for (let i = 0; i < 40; i++) {
    const emp = employeeRecords[i % employeeRecords.length];
    const sk = skillRecords[i % skillRecords.length];
    const statusVal = trainingStatuses[i % trainingStatuses.length];

    await prisma.trainingPlan.create({
      data: {
        trainingCode: `TRN-${100 + i}`,
        trainingTitle: `Upskilling Program for ${sk.skillName}`,
        description: "Official corporate training module designed to bridge competency gaps.",
        employeeId: emp.id,
        skillId: sk.id,
        assignedById: managerRecords[i % managerRecords.length].id,
        providerId: provider.id,
        startDate: new Date("2026-05-01"),
        dueDate: statusVal === TrainingStatus.OVERDUE ? new Date("2026-06-01") : new Date("2026-11-30"),
        progress: statusVal === TrainingStatus.VERIFIED || statusVal === TrainingStatus.COMPLETED ? 100 : i % 2 === 0 ? 40 : 0,
        status: statusVal,
        estimatedHours: 15,
        cancellationReason: statusVal === TrainingStatus.CANCELLED ? "Change of target role assignments" : undefined,
      },
    });
  }
  console.log("Generated 40 Training Plans.");

  // 14. Create Certificates (25)
  const certStatuses = [
    CertificateStatus.VERIFIED, CertificateStatus.PENDING,
    CertificateStatus.REJECTED, CertificateStatus.EXPIRED
  ];
  for (let i = 0; i < 25; i++) {
    const emp = employeeRecords[i % employeeRecords.length];
    const statusVal = certStatuses[i % certStatuses.length];
    await prisma.certificate.create({
      data: {
        employeeId: emp.id,
        certificateName: `Professional Certification level ${i + 1}`,
        issuingOrganization: "SkillSphere Global Accreditation",
        issueDate: new Date("2025-06-01"),
        expiryDate: statusVal === CertificateStatus.EXPIRED ? new Date("2026-01-01") : new Date("2028-06-01"),
        filePath: "uploads/certificates/mock_aws.pdf",
        verificationStatus: statusVal,
        rejectionReason: statusVal === CertificateStatus.REJECTED ? "Uploaded file path is unreadable." : undefined,
        verifiedById: statusVal === CertificateStatus.VERIFIED ? userAdmin.id : undefined,
        verifiedDate: statusVal === CertificateStatus.VERIFIED ? new Date() : undefined,
      },
    });
  }
  console.log("Generated 25 Certificates.");

  // 15. Create Employee Support Tickets (30) & comments, histories, attachments
  const ticketCategories = [
    TicketCategory.TRAINING, TicketCategory.SKILL, TicketCategory.ASSESSMENT,
    TicketCategory.CERTIFICATE, TicketCategory.MANAGER, TicketCategory.PROFILE,
    TicketCategory.LOGIN, TicketCategory.TECHNICAL, TicketCategory.ACCESS,
    TicketCategory.DEADLINE, TicketCategory.OTHER
  ];
  const ticketPriorities = [TicketPriority.LOW, TicketPriority.MEDIUM, TicketPriority.HIGH, TicketPriority.CRITICAL];
  const ticketStatuses = [
    TicketStatus.OPEN, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS,
    TicketStatus.WAITING_USER, TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.REOPENED, TicketStatus.ESCALATED
  ];

  for (let i = 0; i < 30; i++) {
    const emp = employeeRecords[i % employeeRecords.length];
    const categoryVal = ticketCategories[i % ticketCategories.length];
    const priorityVal = ticketPriorities[i % ticketPriorities.length];
    const statusVal = ticketStatuses[i % ticketStatuses.length];
    const numberStr = String(i + 1).padStart(6, "0");

    const slaDueDate = new Date();
    slaDueDate.setHours(slaDueDate.getHours() + (priorityVal === TicketPriority.CRITICAL ? 1 : priorityVal === TicketPriority.HIGH ? 4 : 8));

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber: `TKT-2026-${numberStr}`,
        createdByUserId: emp.userId!,
        createdByRole: SystemRole.EMPLOYEE,
        employeeId: emp.id,
        category: categoryVal,
        subject: `Unable to modify skill requirement or certificate #${i}`,
        description: `Encountered runtime database lock or upload constraints when attempting to update ${categoryVal.toLowerCase()}. Please help.`,
        priority: priorityVal,
        status: statusVal,
        slaDueDate,
        slaStatus: i === 5 ? SlaStatus.BREACHED : SlaStatus.WITHIN_SLA,
        assignedAdminId: userAdmin.id,
        resolution: statusVal === TicketStatus.RESOLVED || statusVal === TicketStatus.CLOSED ? "Reset cache and synchronized profiles" : undefined,
        resolvedAt: statusVal === TicketStatus.RESOLVED || statusVal === TicketStatus.CLOSED ? new Date() : undefined,
        closedAt: statusVal === TicketStatus.CLOSED ? new Date() : undefined,
      },
    });

    // Add Ticket Comments
    await prisma.ticketComment.create({
      data: {
        ticketId: ticket.id,
        senderUserId: emp.userId!,
        senderRole: SystemRole.EMPLOYEE,
        message: "Having issues submitting this from my browser console, please check.",
      },
    });

    if (statusVal !== TicketStatus.OPEN) {
      await prisma.ticketComment.create({
        data: {
          ticketId: ticket.id,
          senderUserId: userAdmin.id,
          senderRole: SystemRole.ADMIN,
          message: "Standard support investigation active on this ticket.",
        },
      });
      // Internal note
      await prisma.ticketComment.create({
        data: {
          ticketId: ticket.id,
          senderUserId: userAdmin.id,
          senderRole: SystemRole.ADMIN,
          message: "Internal log: check PostgreSQL index lock issues on table mapping.",
          isInternalNote: true,
        },
      });
    }

    // Add Ticket History
    await prisma.ticketHistory.create({
      data: {
        ticketId: ticket.id,
        action: "TICKET_CREATED",
        newStatus: TicketStatus.OPEN,
        newPriority: priorityVal,
        performedByUserId: emp.userId!,
        performedByRole: SystemRole.EMPLOYEE,
        comment: "Support ticket opened.",
      },
    });

    if (statusVal === TicketStatus.ASSIGNED || statusVal === TicketStatus.IN_PROGRESS) {
      await prisma.ticketHistory.create({
        data: {
          ticketId: ticket.id,
          action: "TICKET_ASSIGNED",
          oldStatus: TicketStatus.OPEN,
          newStatus: TicketStatus.ASSIGNED,
          performedByUserId: userAdmin.id,
          performedByRole: SystemRole.ADMIN,
          comment: "Assigned to administrator.",
        },
      });
    }
  }

  // 16. Create Manager Support Tickets (10)
  for (let i = 0; i < 10; i++) {
    const mgr = managerRecords[i % managerRecords.length];
    const categoryVal = ticketCategories[i % ticketCategories.length];
    const priorityVal = ticketPriorities[i % ticketPriorities.length];
    const statusVal = ticketStatuses[i % ticketStatuses.length];
    const numberStr = String(i + 31).padStart(6, "0");

    const slaDueDate = new Date();
    slaDueDate.setHours(slaDueDate.getHours() + 8);

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber: `TKT-2026-${numberStr}`,
        createdByUserId: mgr.userId!,
        createdByRole: SystemRole.MANAGER,
        managerId: mgr.id,
        category: categoryVal,
        subject: `Manager portal database sync issue #${i}`,
        description: `Team dashboard charts and capacity grids are not displaying correctly. Please investigate.`,
        priority: priorityVal,
        status: statusVal,
        slaDueDate,
        slaStatus: SlaStatus.WITHIN_SLA,
        assignedAdminId: userAdmin.id,
      },
    });

    await prisma.ticketComment.create({
      data: {
        ticketId: ticket.id,
        senderUserId: mgr.userId!,
        senderRole: SystemRole.MANAGER,
        message: "Charts on my direct dashboard are showing old team details.",
      },
    });

    await prisma.ticketHistory.create({
      data: {
        ticketId: ticket.id,
        action: "TICKET_CREATED",
        newStatus: TicketStatus.OPEN,
        performedByUserId: mgr.userId!,
        performedByRole: SystemRole.MANAGER,
      },
    });
  }

  console.log("Successfully generated Employee and Manager Support Tickets.");

  // 17. Seed Audit Logs (20) & Notifications (15)
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

  for (let i = 0; i < 15; i++) {
    await prisma.notification.create({
      data: {
        userId: employeeRecords[0].userId!,
        title: `Seeded notification alert #${i}`,
        message: `This is a mock training or ticket status alert of code #${i}`,
        isRead: i < 5,
        type: "SYSTEM",
      },
    });
  }

  // 18. Skill Assessments
  console.log("Seeding Skill Verification Assessments...");
  const skJs = skillRecords.find(s => s.skillCode === "SK-002")!;
  const skSql = skillRecords.find(s => s.skillCode === "SK-011")!;

  const jsAssessment = await prisma.skillAssessment.create({
    data: {
      title: "TypeScript & JavaScript ES6+ Certification Exam",
      description: "Assess your competency in variables scope, closure, primitives, promises, and array maps.",
      skillId: skJs.id,
      passingScore: 66,
      questions: {
        create: [
          { questionText: "Which of the following is not a valid way to declare a variable in ES6?", options: "var|let|const|def", correctOption: 3, points: 10 },
          { questionText: "What is the output of console.log(typeof null)?", options: "null|undefined|object|string", correctOption: 2, points: 10 },
          { questionText: "Which method is used to map items of an array into a new array in ES6?", options: "forEach|map|filter|reduce", correctOption: 1, points: 10 }
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
          { questionText: "Which SQL join returns all records when there is a match in either left or right table?", options: "INNER JOIN|LEFT JOIN|RIGHT JOIN|FULL OUTER JOIN", correctOption: 3, points: 10 },
          { questionText: "What index type is the default in PostgreSQL for most tables?", options: "Hash|B-Tree|GIN|GiST", correctOption: 1, points: 10 },
          { questionText: "Which clause is used to filter groups in a SQL SELECT statement?", options: "WHERE|HAVING|GROUP BY|ORDER BY", correctOption: 1, points: 10 }
        ]
      }
    }
  });

  // Seed a pass submission for James Cole
  await prisma.skillAssessmentSubmission.create({
    data: {
      assessmentId: jsAssessment.id,
      employeeId: employeeRecords[0].id,
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
