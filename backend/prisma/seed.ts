import { PrismaClient, SystemRole, SkillType, SkillRatingStatus, RatingSource, TrainingStatus, CertificateStatus, TicketCategory, TicketPriority, TicketStatus, SlaStatus, ProjectStatus, ProjectPriority, ProjectAssignmentStatus, LanguageProficiency, AccountStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting comprehensive database seeding...");

  // Reset database before seeding (sequential deletes to respect foreign keys)
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
  const achievements = [
    { name: "Quick Learner", description: "Complete a training plan within 7 days of assignment", badgeCode: "ACH_QUICK_LEARNER", pointValue: 150 },
    { name: "Learning Streak", description: "Complete 3 training plans back-to-back", badgeCode: "ACH_STREAK", pointValue: 300 },
    { name: "Skill Expert", description: "Attain Level 5 rating in any technical skill", badgeCode: "ACH_SKILL_EXPERT", pointValue: 200 },
    { name: "Certified Professional", description: "Get a verified certificate approved", badgeCode: "ACH_CERTIFIED", pointValue: 100 },
  ];
  const achievementRecords = [];
  for (const ach of achievements) {
    const rec = await prisma.achievement.create({ data: ach });
    achievementRecords.push(rec);
  }

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
      profileCompletion: 90,
      education: "Ph.D. in Computer Science, MIT (2012 - 2016)",
      careerObjective: "Lead enterprise transformation and skill matrix architectures.",
    },
  });
  await prisma.notificationPreference.create({ data: { userId: userAdmin.id } });

  // B. 5 Managers with linked Employee records
  const managersData = [
    { code: "EMP-002", email: "manager@skillsphere.local", first: "David", last: "Miller", desig: desigEngMgr, dept: deptEng, exp: 9.5, edu: "M.S. Computer Science, Stanford (2014-2016)" },
    { code: "EMP-003", email: "manager1@skillsphere.local", first: "Elena", last: "Rostova", desig: desigDataMgr, dept: deptData, exp: 8.0, edu: "Ph.D. Data Science, UC Berkeley (2015-2019)" },
    { code: "EMP-004", email: "manager2@skillsphere.local", first: "Marcus", last: "Aurelius", desig: desigQaMgr, dept: deptQa, exp: 10.0, edu: "B.S. Software Eng, Univ of Rome (2010-2014)" },
    { code: "EMP-005", email: "manager3@skillsphere.local", first: "Julia", last: "Roberts", desig: desigHrMgr, dept: deptHr, exp: 7.5, edu: "MBA HR, NYU Stern (2017-2019)" },
    { code: "EMP-006", email: "manager4@skillsphere.local", first: "Thomas", last: "Anderson", desig: desigOpsMgr, dept: deptOps, exp: 8.5, edu: "B.S. Cybernetics, Columbia (2012-2016)" },
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
        workLocation: m.dept.code === "ENG" ? "Seattle Office" : m.dept.code === "DATA" ? "Austin Office" : "Boston Office",
        workMode: "HYBRID",
        userId: user.id,
        profileCompletion: 85,
        managerCapacity: 10,
        education: m.edu,
        careerObjective: "Optimize engineering delivery and develop senior technical talent.",
      },
    });
    await prisma.notificationPreference.create({ data: { userId: user.id } });
    managerRecords.push(emp);
  }

  // C. 40 Employees
  const employeeRecords = [];

  // Key explicit test employees
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
      yearsOfExperience: 3.5,
      workLocation: "Seattle Office",
      workMode: "HYBRID",
      userId: userE2EEmp.id,
      profileCompletion: 75,
      education: "B.S. Computer Science, Univ of Washington (2019-2023)",
      careerObjective: "Full-stack developer specializing in cloud applications and API architecture.",
    },
  });
  await prisma.notificationPreference.create({ data: { userId: userE2EEmp.id } });
  employeeRecords.push(empE2E);

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
      profileCompletion: 80,
      education: "B.S. Information Systems, Seattle Univ (2017-2021)",
      careerObjective: "Senior backend developer focusing on scalable database systems.",
    },
  });
  await prisma.notificationPreference.create({ data: { userId: userDemoEmp.id } });
  employeeRecords.push(empDemo);

  const firstNames = ["Alice", "Bob", "Charlie", "Diana", "Ethan", "Fiona", "George", "Hannah", "Ian", "Jane", "Kevin", "Lisa", "Matthew", "Natalie", "Oliver", "Patricia", "Quincy", "Rachel", "Steven", "Teresa", "Victor", "Wendy", "Xavier", "Yolanda", "Zachary", "Liam", "Sophia", "Noah", "Emma", "Lucas", "Olivia", "Mason", "Ava", "Logan", "Isabella", "Grace", "Jack", "Lily", "Leo", "Mia"];
  const lastNames = ["Smith", "Jones", "Brown", "Davis", "Wilson", "Taylor", "Thomas", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green", "Adams", "Nelson", "Baker", "Carter", "Mitchell", "Roberts", "Gomez", "Phillips"];
  const universities = ["UC Berkeley", "UT Austin", "Georgia Tech", "UIUC", "Carnegie Mellon", "Cornell", "Michigan", "Purdue", "Harvard", "Stanford"];

  for (let i = 0; i < 38; i++) {
    const codeNumber = i + 9;
    const code = `EMP-${String(codeNumber).padStart(3, "0")}`;
    const email = `employee${i + 2}@skillsphere.local`;
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[i % lastNames.length];
    
    const dept = deptRecords[i % deptRecords.length];
    const manager = managerRecords[i % managerRecords.length];
    const desig = desigRecords[i % desigRecords.length];

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
        yearsOfExperience: 2.0 + (i % 8) * 0.5,
        workLocation: dept.code === "ENG" ? "Seattle Office" : dept.code === "DATA" ? "Austin Office" : "Remote",
        workMode: i % 2 === 0 ? "HYBRID" : "REMOTE",
        userId: user.id,
        profileCompletion: 60 + (i % 35),
        education: `B.S. in Computer Science, ${universities[i % universities.length]} (2018 - 2022)`,
      },
    });

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

  console.log(`Generated ${employeeRecords.length} Employees and ${managerRecords.length} Managers.`);

  // 7. Create Skill Categories (5) & Skills (30)
  const categories = ["Programming", "Cloud & DevOps", "Databases", "Quality Assurance", "Soft Skills & Leadership"];
  const catRecords = [];
  for (const c of categories) {
    const cat = await prisma.skillCategory.create({ data: { name: c } });
    catRecords.push(cat);
  }

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

  // Role Skill Requirements
  const skillMap = new Map(skillRecords.map(s => [s.skillCode, s.id]));
  const desigMap = new Map(desigRecords.map(d => [d.code, d.id]));

  const requirementsToSeed = [
    { desig: "ENG_JR", skill: "SK-001", lvl: 3 },
    { desig: "ENG_JR", skill: "SK-002", lvl: 3 },
    { desig: "ENG_JR", skill: "SK-003", lvl: 3 },
    { desig: "ENG_JR", skill: "SK-027", lvl: 3 },
    { desig: "ENG_SR", skill: "SK-001", lvl: 4 },
    { desig: "ENG_SR", skill: "SK-002", lvl: 4 },
    { desig: "ENG_SR", skill: "SK-003", lvl: 4 },
    { desig: "ENG_SR", skill: "SK-006", lvl: 3 },
    { desig: "ENG_SR", skill: "SK-008", lvl: 3 },
    { desig: "ENG_SR", skill: "SK-030", lvl: 4 },
    { desig: "ENG_MGR", skill: "SK-021", lvl: 4 },
    { desig: "ENG_MGR", skill: "SK-022", lvl: 4 },
    { desig: "ENG_MGR", skill: "SK-025", lvl: 4 },
    { desig: "ENG_MGR", skill: "SK-002", lvl: 3 },
    { desig: "DATA_SCI", skill: "SK-005", lvl: 4 },
    { desig: "DATA_SCI", skill: "SK-011", lvl: 3 },
    { desig: "DATA_SCI", skill: "SK-012", lvl: 3 },
    { desig: "QA_SR", skill: "SK-016", lvl: 4 },
    { desig: "QA_SR", skill: "SK-017", lvl: 4 },
    { desig: "QA_SR", skill: "SK-018", lvl: 4 },
    { desig: "QA_JR", skill: "SK-019", lvl: 3 },
    { desig: "QA_JR", skill: "SK-017", lvl: 2 },
    { desig: "HR_MGR", skill: "SK-021", lvl: 4 },
    { desig: "HR_MGR", skill: "SK-022", lvl: 4 },
    { desig: "OPS_ASSOC", skill: "SK-023", lvl: 3 },
    { desig: "OPS_ASSOC", skill: "SK-024", lvl: 3 }
  ];

  for (const req of requirementsToSeed) {
    const designationId = desigMap.get(req.desig);
    const skillId = skillMap.get(req.skill);
    if (designationId && skillId) {
      await prisma.roleSkillRequirement.create({
        data: { designationId, skillId, requiredLevel: req.lvl }
      });
    }
  }

  // 8. Create Employee Skills (100+) & Manager Personal Skills
  const allPeople = [...managerRecords, ...employeeRecords];
  let totalSkillAssignments = 0;
  let totalReviewsCount = 0;

  for (let eIdx = 0; eIdx < allPeople.length; eIdx++) {
    const person = allPeople[eIdx];
    
    // Fetch role requirements for this person's designation
    const roleReqs = await prisma.roleSkillRequirement.findMany({
      where: { designationId: person.designationId },
      include: { skill: true }
    });

    const assignedSkillIds = new Set<string>();

    // 1. Assign role required skills as APPROVED with required level or higher
    for (const req of roleReqs) {
      assignedSkillIds.add(req.skillId);
      const lvl = Math.min(5, req.requiredLevel);
      const empSkill = await prisma.employeeSkill.create({
        data: {
          employeeId: person.id,
          skillId: req.skillId,
          selfRating: lvl,
          finalRating: lvl,
          status: SkillRatingStatus.APPROVED,
          experienceMonths: 24 + (eIdx * 2),
          employeeComments: "Demonstrated proficiency in project deliverables.",
          managerFeedback: "Validated and verified as per department benchmarks.",
          approvedAt: new Date("2026-05-10"),
        },
      });
      totalSkillAssignments++;
      totalReviewsCount++;

      await prisma.skillRatingHistory.create({
        data: {
          employeeSkillId: empSkill.id,
          rating: lvl,
          source: RatingSource.MANAGER,
          updatedById: managerRecords[0].userId!,
          comments: "Manager verified role capability.",
        },
      });
    }

    // 2. Assign 2-3 additional catalog skills
    const additionalSkills = skillRecords.filter(s => !assignedSkillIds.has(s.id)).slice(0, 3);
    for (let aIdx = 0; aIdx < additionalSkills.length; aIdx++) {
      const sk = additionalSkills[aIdx];
      const statusVal = aIdx === 0 ? SkillRatingStatus.APPROVED : aIdx === 1 ? SkillRatingStatus.SUBMITTED : SkillRatingStatus.APPROVED;
      const lvl = aIdx === 0 ? 5 : 3;

      const empSkill = await prisma.employeeSkill.create({
        data: {
          employeeId: person.id,
          skillId: sk.id,
          selfRating: lvl,
          finalRating: statusVal === SkillRatingStatus.APPROVED ? lvl : undefined,
          status: statusVal,
          experienceMonths: 18,
          employeeComments: "Pursuing self-learning module.",
          managerFeedback: statusVal === SkillRatingStatus.APPROVED ? "Approved elective skill." : undefined,
          approvedAt: statusVal === SkillRatingStatus.APPROVED ? new Date("2026-05-12") : undefined,
        },
      });
      totalSkillAssignments++;
      if (statusVal === SkillRatingStatus.APPROVED || statusVal === SkillRatingStatus.SUBMITTED) {
        totalReviewsCount++;
      }
    }
  }

  console.log(`Generated ${totalSkillAssignments} Skill Assignments & ${totalReviewsCount} Reviews.`);

  // 9. Projects (20) & Assignments (60+)
  const projectTitles = [
    "SkillSphere Resume Modernization", "Employee Skill Mapping Portal", "HR Learning Path Automation",
    "Customer Success Analytics Dashboard", "Enterprise Cloud Sync System", "Single Sign-On Integration",
    "SLA Ticket Automation Engine", "Dynamic Charting Components", "Gamification System API",
    "Global Staff CSV Importer", "Multi-Tenant Database Scaling", "Security Auditing Framework",
    "Real-time Notification Broadcaster", "Training Provider Scheduler", "System Performance Profiler",
    "AI Skill Recommendation Engine", "Automated Payroll Sync", "Mobile App API Gateway",
    "Zero-Trust Auth Protocol", "Compliance Audit Hub"
  ];

  const projectRecords = [];
  for (let i = 0; i < 20; i++) {
    const code = `PRJ-${String(i + 1).padStart(3, "0")}`;
    const statusVal = i % 4 === 0 ? ProjectStatus.COMPLETED : i % 4 === 1 ? ProjectStatus.PLANNING : i % 4 === 2 ? ProjectStatus.ACTIVE : ProjectStatus.ON_HOLD;
    const prioVal = i % 3 === 0 ? ProjectPriority.CRITICAL : i % 3 === 1 ? ProjectPriority.HIGH : ProjectPriority.MEDIUM;
    const completion = statusVal === ProjectStatus.COMPLETED ? 100 : statusVal === ProjectStatus.PLANNING ? 0 : 25 + (i * 3);

    const project = await prisma.project.create({
      data: {
        projectCode: code,
        name: projectTitles[i],
        description: `Deliverable module for ${projectTitles[i]} including REST endpoints, Prisma schemas, and Angular dashboard viewports.`,
        clientName: i % 2 === 0 ? "Internal Enterprise" : "Client Org " + (i + 1),
        status: statusVal,
        priority: prioVal,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
        completionPercent: completion,
        technologies: i % 2 === 0 ? "Angular, Node.js, PostgreSQL, TypeScript" : "Python, Docker, Redis, AWS",
        managerId: managerRecords[i % managerRecords.length].id,
        createdById: userAdmin.id,
      },
    });
    projectRecords.push(project);
  }

  // Project Assignments for Employees & Managers
  const rolesList = ["Tech Lead", "Senior Developer", "QA Automation Specialist", "Backend Engineer", "DevOps Engineer"];
  let totalAssignmentsCount = 0;
  for (let i = 0; i < allPeople.length; i++) {
    const person = allPeople[i];
    const proj = projectRecords[i % projectRecords.length];
    await prisma.projectAssignment.create({
      data: {
        projectId: proj.id,
        employeeId: person.id,
        role: rolesList[i % rolesList.length],
        responsibilities: "Lead component design, unit testing, and API integration.",
        contributionPercent: 40 + (i % 6) * 10,
        status: ProjectAssignmentStatus.ACTIVE,
        joinedAt: new Date("2026-02-01"),
        assignedById: proj.managerId || empAdmin.id,
      },
    });
    totalAssignmentsCount++;
  }
  console.log(`Generated ${projectRecords.length} Projects & ${totalAssignmentsCount} Assignments.`);

  // 10. Training Provider & Training Plans (50)
  const provider = await prisma.trainingProvider.create({
    data: { name: "Udemy Corporate & SkillSphere Academy", contactPerson: "John Doe", email: "corp@udemy.com", phone: "555-9000" },
  });

  const trainingStatuses = [
    TrainingStatus.ASSIGNED, TrainingStatus.NOT_STARTED, TrainingStatus.IN_PROGRESS,
    TrainingStatus.ON_HOLD, TrainingStatus.SUBMITTED_FOR_REVIEW, TrainingStatus.COMPLETED,
    TrainingStatus.VERIFIED, TrainingStatus.OVERDUE, TrainingStatus.CANCELLED
  ];

  for (let i = 0; i < 50; i++) {
    const person = allPeople[i % allPeople.length];
    const sk = skillRecords[i % skillRecords.length];
    const statusVal = trainingStatuses[i % trainingStatuses.length];

    await prisma.trainingPlan.create({
      data: {
        trainingCode: `TRN-${100 + i}`,
        trainingTitle: `Upskilling Program for ${sk.skillName}`,
        description: "Official corporate training module designed to bridge competency gaps.",
        employeeId: person.id,
        skillId: sk.id,
        assignedById: managerRecords[i % managerRecords.length].id,
        providerId: provider.id,
        startDate: new Date("2026-04-01"),
        dueDate: statusVal === TrainingStatus.OVERDUE ? new Date("2026-06-01") : new Date("2026-11-30"),
        progress: statusVal === TrainingStatus.VERIFIED || statusVal === TrainingStatus.COMPLETED ? 100 : i % 2 === 0 ? 45 : 10,
        status: statusVal,
        estimatedHours: 20,
        cancellationReason: statusVal === TrainingStatus.CANCELLED ? "Reassigned priority" : undefined,
      },
    });
  }
  console.log("Generated 50 Training Plans.");

  // 11. Certificates (35)
  const certStatuses = [
    CertificateStatus.VERIFIED, CertificateStatus.PENDING,
    CertificateStatus.REJECTED, CertificateStatus.EXPIRED
  ];

  for (let i = 0; i < 35; i++) {
    const person = allPeople[i % allPeople.length];
    const statusVal = certStatuses[i % certStatuses.length];

    await prisma.certificate.create({
      data: {
        employeeId: person.id,
        certificateName: `Professional Certification Level ${i + 1}`,
        certificateNumber: `CERT-2026-${1000 + i}`,
        issuingOrganization: i % 2 === 0 ? "AWS Certification Authority" : "Microsoft Learn",
        issueDate: new Date("2025-05-15"),
        expiryDate: statusVal === CertificateStatus.EXPIRED ? new Date("2026-01-01") : new Date("2028-05-15"),
        filePath: "uploads/certificates/mock_cert.pdf",
        verificationStatus: statusVal,
        rejectionReason: statusVal === CertificateStatus.REJECTED ? "Certificate image unclear or signature missing." : undefined,
        verifiedById: statusVal === CertificateStatus.VERIFIED ? userAdmin.id : undefined,
        verifiedDate: statusVal === CertificateStatus.VERIFIED ? new Date("2026-06-10") : undefined,
      },
    });
  }
  console.log("Generated 35 Certificates.");

  // 12. Support Tickets (40)
  const ticketCategories = [
    TicketCategory.TRAINING, TicketCategory.SKILL, TicketCategory.ASSESSMENT,
    TicketCategory.CERTIFICATE, TicketCategory.MANAGER, TicketCategory.PROFILE,
    TicketCategory.LOGIN, TicketCategory.TECHNICAL, TicketCategory.ACCESS
  ];
  const ticketPriorities = [TicketPriority.LOW, TicketPriority.MEDIUM, TicketPriority.HIGH, TicketPriority.CRITICAL];
  const ticketStatuses = [
    TicketStatus.OPEN, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS,
    TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.REOPENED
  ];

  for (let i = 0; i < 40; i++) {
    const person = allPeople[i % allPeople.length];
    const categoryVal = ticketCategories[i % ticketCategories.length];
    const priorityVal = ticketPriorities[i % ticketPriorities.length];
    const statusVal = ticketStatuses[i % ticketStatuses.length];

    const slaDueDate = new Date();
    slaDueDate.setHours(slaDueDate.getHours() + 12);

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber: `TKT-2026-${String(i + 1).padStart(6, "0")}`,
        createdByUserId: person.userId || userAdmin.id,
        createdByRole: SystemRole.EMPLOYEE,
        employeeId: person.id,
        category: categoryVal,
        subject: `Support query regarding ${categoryVal.toLowerCase()} #${i + 1}`,
        description: `Requesting assistance with profile updates, verification workflows, or API sync.`,
        priority: priorityVal,
        status: statusVal,
        slaDueDate,
        slaStatus: SlaStatus.WITHIN_SLA,
        assignedAdminId: userAdmin.id,
        resolution: statusVal === TicketStatus.RESOLVED || statusVal === TicketStatus.CLOSED ? "Resolved by administrative review." : undefined,
      },
    });

    await prisma.ticketComment.create({
      data: {
        ticketId: ticket.id,
        senderUserId: person.userId || userAdmin.id,
        senderRole: SystemRole.EMPLOYEE,
        message: "Initial ticket query submitted.",
      },
    });
  }

  // 13. Audit Logs (120+ entries covering all specified actions & categories)
  console.log("Seeding 120+ Audit Logs...");
  await prisma.auditLog.deleteMany({});

  const auditActionsList = [
    // AUTHENTICATION
    { action: "LOGIN_SUCCESS", comp: "AUTH", desc: "User authenticated successfully via credentials" },
    { action: "LOGIN_FAILED", comp: "AUTH", desc: "Failed authentication attempt: invalid credentials" },
    { action: "LOGOUT", comp: "AUTH", desc: "User logged out of active portal session" },
    { action: "PASSWORD_CHANGED", comp: "AUTH", desc: "User updated account password successfully" },
    { action: "PASSWORD_RESET", comp: "AUTH", desc: "Administrative password reset issued" },
    { action: "ACCOUNT_LOCKED", comp: "AUTH", desc: "Account temporarily locked due to excessive failed attempts" },
    { action: "ACCOUNT_ACTIVATED", comp: "AUTH", desc: "Account activated by Administrator" },
    { action: "ACCOUNT_DEACTIVATED", comp: "AUTH", desc: "Account deactivated by Administrator" },
    // EMPLOYEE MANAGEMENT
    { action: "EMPLOYEE_CREATED", comp: "EMPLOYEE", desc: "New employee record created in directory" },
    { action: "EMPLOYEE_UPDATED", comp: "EMPLOYEE", desc: "Employee profile details modified" },
    { action: "EMPLOYEE_ACTIVATED", comp: "EMPLOYEE", desc: "Employee account status set to ACTIVE" },
    { action: "EMPLOYEE_DEACTIVATED", comp: "EMPLOYEE", desc: "Employee account status set to INACTIVE" },
    { action: "EMPLOYEE_PROFILE_UPDATED", comp: "EMPLOYEE", desc: "Personal bio and objective information updated" },
    { action: "EMPLOYEE_CSV_EXPORTED", comp: "EMPLOYEE", desc: "Employee directory dataset exported to CSV" },
    { action: "EMPLOYEE_CSV_IMPORTED", comp: "EMPLOYEE", desc: "Bulk employee directory imported from CSV file" },
    // MANAGER MANAGEMENT
    { action: "MANAGER_CREATED", comp: "MANAGER", desc: "Manager role assigned to user account" },
    { action: "MANAGER_UPDATED", comp: "MANAGER", desc: "Manager profile and leadership settings modified" },
    { action: "MANAGER_ASSIGNED", comp: "MANAGER", desc: "Employee assigned to report to manager" },
    { action: "MANAGER_REASSIGNED", comp: "MANAGER", desc: "Employee reassigned to new manager" },
    { action: "MANAGER_CAPACITY_UPDATED", comp: "MANAGER", desc: "Manager team capacity threshold updated" },
    { action: "AUTO_MANAGER_ASSIGNMENT_COMPLETED", comp: "MANAGER", desc: "Automatic team load-balancing completed" },
    // DEPARTMENT AND DESIGNATION
    { action: "DEPARTMENT_CREATED", comp: "DEPARTMENT", desc: "New organizational department created" },
    { action: "DEPARTMENT_UPDATED", comp: "DEPARTMENT", desc: "Department details updated" },
    { action: "DEPARTMENT_DEACTIVATED", comp: "DEPARTMENT", desc: "Department deactivated from active hierarchy" },
    { action: "DESIGNATION_CREATED", comp: "DESIGNATION", desc: "New job title designation registered" },
    { action: "DESIGNATION_UPDATED", comp: "DESIGNATION", desc: "Designation skill matrix requirements modified" },
    // SKILLS
    { action: "SKILL_CREATED", comp: "SKILL", desc: "New skill entry added to master skill catalog" },
    { action: "SKILL_UPDATED", comp: "SKILL", desc: "Skill code and description updated" },
    { action: "SKILL_ASSIGNED", comp: "SKILL", desc: "Skill requirement assigned to employee" },
    { action: "SKILL_REMOVED", comp: "SKILL", desc: "Skill requirement removed from employee profile" },
    { action: "SKILL_REQUEST_SUBMITTED", comp: "SKILL", desc: "Employee submitted request to add new skill to catalog" },
    { action: "SKILL_REQUEST_APPROVED", comp: "SKILL", desc: "Manager approved pending skill request" },
    { action: "SKILL_REQUEST_REJECTED", comp: "SKILL", desc: "Manager rejected pending skill request" },
    { action: "SELF_ASSESSMENT_SUBMITTED", comp: "SKILL", desc: "Employee completed self-assessment rating evaluation" },
    { action: "SKILL_RATING_APPROVED", comp: "SKILL", desc: "Manager approved employee self-rating" },
    { action: "SKILL_RATING_REJECTED", comp: "SKILL", desc: "Manager rejected employee self-rating" },
    { action: "FINAL_RATING_UPDATED", comp: "SKILL", desc: "Manager verified final proficiency level for employee" },
    // TRAINING
    { action: "TRAINING_CREATED", comp: "TRAINING", desc: "New training plan added to system" },
    { action: "TRAINING_ASSIGNED", comp: "TRAINING", desc: "Training plan assigned to employee" },
    { action: "TRAINING_PROGRESS_UPDATED", comp: "TRAINING", desc: "Employee logged training hours progress" },
    { action: "TRAINING_SUBMITTED", comp: "TRAINING", desc: "Training plan submitted for manager verification" },
    { action: "TRAINING_COMPLETED", comp: "TRAINING", desc: "Training plan marked completed by manager" },
    { action: "TRAINING_VERIFIED", comp: "TRAINING", desc: "Training completion verified by reviewer" },
    { action: "TRAINING_CANCELLED", comp: "TRAINING", desc: "Assigned training cancelled" },
    { action: "TRAINING_MARKED_OVERDUE", comp: "TRAINING", desc: "Training flagged overdue past target due date" },
    // CERTIFICATES
    { action: "CERTIFICATE_UPLOADED", comp: "CERTIFICATE", desc: "Employee uploaded completion certificate document" },
    { action: "CERTIFICATE_VERIFIED", comp: "CERTIFICATE", desc: "Manager verified authenticity of certificate" },
    { action: "CERTIFICATE_REJECTED", comp: "CERTIFICATE", desc: "Certificate rejected due to invalid document format" },
    { action: "CERTIFICATE_REPLACED", comp: "CERTIFICATE", desc: "Updated certificate uploaded replacing previous file" },
    { action: "CERTIFICATE_DOWNLOADED", comp: "CERTIFICATE", desc: "Certificate attachment downloaded" },
    // PROJECTS AND RESUMES
    { action: "PROJECT_CREATED", comp: "PROJECT", desc: "New client project registered" },
    { action: "PROJECT_UPDATED", comp: "PROJECT", desc: "Project allocation and milestones updated" },
    { action: "EMPLOYEE_ASSIGNED_TO_PROJECT", comp: "PROJECT", desc: "Employee assigned to project team" },
    { action: "PROJECT_PROGRESS_UPDATED", comp: "PROJECT", desc: "Project completion percentage updated" },
    { action: "PROJECT_COMPLETED", comp: "PROJECT", desc: "Project marked completed and archived" },
    { action: "RESUME_GENERATED", comp: "RESUME", desc: "Dynamic PDF resume generated for employee" },
    { action: "RESUME_DOWNLOADED", comp: "RESUME", desc: "Employee resume downloaded" },
    { action: "TEAM_RESUME_DOWNLOADED", comp: "RESUME", desc: "Manager downloaded compiled team resume portfolio" },
    // SUPPORT TICKETS
    { action: "TICKET_CREATED", comp: "TICKET", desc: "Support ticket opened" },
    { action: "TICKET_ASSIGNED", comp: "TICKET", desc: "Support ticket assigned to admin agent" },
    { action: "TICKET_REPLY_ADDED", comp: "TICKET", desc: "Response message posted to support ticket thread" },
    { action: "TICKET_INTERNAL_NOTE_ADDED", comp: "TICKET", desc: "Internal note added to ticket history" },
    { action: "TICKET_PRIORITY_CHANGED", comp: "TICKET", desc: "Ticket priority escalated" },
    { action: "TICKET_STATUS_CHANGED", comp: "TICKET", desc: "Ticket status changed" },
    { action: "TICKET_RESOLVED", comp: "TICKET", desc: "Ticket marked resolved" },
    { action: "TICKET_CLOSED", comp: "TICKET", desc: "Ticket closed" },
    { action: "TICKET_REOPENED", comp: "TICKET", desc: "Ticket reopened by employee" },
    { action: "TICKET_ATTACHMENT_UPLOADED", comp: "TICKET", desc: "Attachment uploaded to support ticket" },
    // REPORTS
    { action: "REPORT_VIEWED", comp: "REPORT", desc: "Analytics report opened" },
    { action: "REPORT_FILTERED", comp: "REPORT", desc: "Applied custom criteria filters to report view" },
    { action: "REPORT_CSV_EXPORTED", comp: "REPORT", desc: "Exported report to CSV" },
    { action: "REPORT_EXCEL_EXPORTED", comp: "REPORT", desc: "Exported report to Excel" },
    { action: "REPORT_PDF_EXPORTED", comp: "REPORT", desc: "Exported report to PDF" },
    { action: "REPORT_PRINTED", comp: "REPORT", desc: "Report document sent to printer" }
  ];

  for (let i = 0; i < 125; i++) {
    const actObj = auditActionsList[i % auditActionsList.length];
    const userObj = allPeople[i % allPeople.length];
    const userId = userObj.userId || userAdmin.id;

    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: actObj.action,
        component: actObj.comp,
        description: `${actObj.desc} (Ref #${1000 + i})`,
        entityName: actObj.comp,
        entityId: `ENT-${2000 + i}`,
        oldValue: { status: "DRAFT", step: i, previousRole: "EMPLOYEE" },
        newValue: { status: "ACTIVE", step: i + 1, updatedRole: "MANAGER" },
        ipAddress: `192.168.1.${10 + (i % 50)}`,
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
        requestMethod: i % 2 === 0 ? "POST" : "GET",
        endpoint: `/api/${actObj.comp.toLowerCase()}/action`,
        createdAt: new Date(Date.now() - (125 - i) * 3600 * 1000 * 5),
      },
    });
  }

  // 14. Error Logs (85+ entries covering all specified error types & categories)
  console.log("Seeding 85+ Error Logs...");
  await prisma.errorLog.deleteMany({});

  const errorTypesList = [
    // VALIDATION ERRORS
    { type: "VALIDATION_ERROR", cat: "VALIDATION", msg: "Invalid input: email format is incorrect", code: 400, end: "/api/employees", errCode: "VAL-001", sev: "WARNING" },
    { type: "DUPLICATE_EMAIL_ERROR", cat: "VALIDATION", msg: "Employee email already exists in system", code: 409, end: "/api/employees", errCode: "VAL-002", sev: "ERROR" },
    { type: "DUPLICATE_SKILL_ERROR", cat: "VALIDATION", msg: "Skill code SK-001 already registered", code: 409, end: "/api/skills", errCode: "VAL-003", sev: "ERROR" },
    { type: "INVALID_RATING_ERROR", cat: "VALIDATION", msg: "Skill rating must be integer between 1 and 5", code: 400, end: "/api/skills/ratings", errCode: "VAL-004", sev: "WARNING" },
    { type: "PAST_DUE_DATE_ERROR", cat: "VALIDATION", msg: "Target completion due date cannot be in the past", code: 400, end: "/api/training", errCode: "VAL-005", sev: "WARNING" },
    { type: "FILE_SIZE_EXCEEDED", cat: "VALIDATION", msg: "File size exceeds maximum limit of 5MB", code: 400, end: "/api/certificates/upload", errCode: "VAL-006", sev: "WARNING" },
    { type: "MANAGER_CAPACITY_EXCEEDED", cat: "VALIDATION", msg: "Manager direct report capacity threshold exceeded", code: 400, end: "/api/manager/assign", errCode: "VAL-007", sev: "ERROR" },
    // AUTHENTICATION & AUTHORIZATION
    { type: "AUTHENTICATION_ERROR", cat: "SECURITY", msg: "Invalid JWT signature or access token expired", code: 401, end: "/api/auth/login", errCode: "AUTH-001", sev: "ERROR" },
    { type: "INACTIVE_ACCOUNT_ERROR", cat: "SECURITY", msg: "Attempted login on inactive or locked account", code: 403, end: "/api/auth/login", errCode: "AUTH-002", sev: "ERROR" },
    { type: "AUTHORIZATION_ERROR", cat: "SECURITY", msg: "Access forbidden: ADMIN role required for resource", code: 403, end: "/api/admin/reports", errCode: "AUTH-003", sev: "WARNING" },
    { type: "WRONG_PORTAL_ACCESS", cat: "SECURITY", msg: "User role mismatch for target portal endpoint", code: 403, end: "/api/manager/team", errCode: "AUTH-004", sev: "WARNING" },
    // DATABASE ERRORS
    { type: "POSTGRESQL_ERROR", cat: "DATABASE", msg: "Connection timeout while executing query on PostgreSQL pool", code: 500, end: "/api/org/departments", errCode: "DB-001", sev: "CRITICAL" },
    { type: "UNIQUE_CONSTRAINT_ERROR", cat: "DATABASE", msg: "Unique constraint violation on employee_code index", code: 409, end: "/api/employees", errCode: "DB-002", sev: "ERROR" },
    { type: "FOREIGN_KEY_ERROR", cat: "DATABASE", msg: "Foreign key constraint failure on manager_id reference", code: 400, end: "/api/manager/assign", errCode: "DB-003", sev: "ERROR" },
    { type: "QUERY_TIMEOUT_ERROR", cat: "DATABASE", msg: "Database query execution exceeded 10000ms threshold", code: 504, end: "/api/reports/skills", errCode: "DB-004", sev: "CRITICAL" },
    // FILE AND EXPORT ERRORS
    { type: "FILE_UPLOAD_ERROR", cat: "SYSTEM", msg: "Attachment MIME type unsupported: must be PDF, PNG, or JPG", code: 400, end: "/api/ticket/attachment", errCode: "SYS-001", sev: "WARNING" },
    { type: "RESUME_GENERATION_ERROR", cat: "SYSTEM", msg: "Failed to render PDF template for employee resume", code: 500, end: "/api/resume/download", errCode: "SYS-002", sev: "ERROR" },
    { type: "REPORT_EXPORT_ERROR", cat: "SYSTEM", msg: "Memory limit reached while rendering PDF document export", code: 500, end: "/api/reports/export", errCode: "SYS-003", sev: "ERROR" },
    // BUSINESS LOGIC ERRORS
    { type: "DUPLICATE_ASSIGNMENT_ERROR", cat: "BUSINESS", msg: "Active manager assignment already exists for employee", code: 409, end: "/api/manager/assign", errCode: "BUS-001", sev: "WARNING" },
    { type: "TRAINING_ALREADY_ASSIGNED", cat: "BUSINESS", msg: "Training plan already assigned to employee", code: 409, end: "/api/training/assign", errCode: "BUS-002", sev: "WARNING" },
    { type: "CLOSED_TICKET_REPLY_ERROR", cat: "BUSINESS", msg: "Cannot post reply on closed ticket", code: 400, end: "/api/tickets/reply", errCode: "BUS-003", sev: "WARNING" }
  ];

  const statuses = ["OPEN", "INVESTIGATING", "RESOLVED", "IGNORED"];

  for (let i = 0; i < 88; i++) {
    const errObj = errorTypesList[i % errorTypesList.length];
    const userObj = allPeople[i % allPeople.length];
    const userId = userObj.userId || userAdmin.id;
    const resStatus = statuses[i % statuses.length];

    await prisma.errorLog.create({
      data: {
        errorCode: `${errObj.errCode}-${100 + i}`,
        userId: userId,
        endpoint: errObj.end,
        method: i % 2 === 0 ? "POST" : "GET",
        errorType: errObj.type,
        category: errObj.cat,
        errorMessage: errObj.msg,
        technicalMessage: `Internal Stack Context: Exception raised at ${errObj.end} (code ${errObj.code}): ${errObj.msg}`,
        stackTrace: `Error: ${errObj.msg}\n    at Controller.handle (${errObj.end}:42:15)\n    at Layer.handle [as handle_request] (express/lib/router/layer.js:95:5)\n    at trim_prefix (express/lib/router/index.js:317:13)`,
        requestBody: JSON.stringify({ query: "test_payload", timestamp: Date.now() }),
        statusCode: errObj.code,
        severity: errObj.sev,
        resolutionStatus: resStatus,
        resolvedBy: resStatus === "RESOLVED" ? userAdmin.email : undefined,
        resolutionNote: resStatus === "RESOLVED" ? "Investigated stack trace and applied configuration patch." : undefined,
        resolvedAt: resStatus === "RESOLVED" ? new Date() : undefined,
        ipAddress: `10.0.0.${15 + (i % 30)}`,
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
        createdAt: new Date(Date.now() - (88 - i) * 3600 * 1000 * 6),
      },
    });
  }

  // 15. Manager Personal Development & Employee Learning Paths / Achievements
  console.log("Seeding Manager Personal Development & Learning Paths...");
  for (let mIdx = 0; mIdx < managerRecords.length; mIdx++) {
    const mgr = managerRecords[mIdx];
    
    // Add Employee Achievements
    await prisma.employeeAchievement.create({
      data: {
        employeeId: mgr.id,
        achievementId: achievementRecords[mIdx % achievementRecords.length].id,
        awardedDate: new Date("2026-03-15"),
      },
    });

    // Add Notifications
    for (let n = 0; n < 4; n++) {
      await prisma.notification.create({
        data: {
          userId: mgr.userId!,
          title: `Manager Alert #${n + 1}`,
          message: `Team member submitted skill review request #${n + 1}.`,
          isRead: n < 2,
          type: "SKILL",
        },
      });
    }
  }

  // 16. Seed Skill Assessments & Questions
  console.log("Seeding Skill Verification Assessments & Test Questions...");
  const dbSkills = await prisma.skill.findMany({ take: 6 });
  for (let i = 0; i < dbSkills.length; i++) {
    const skill = dbSkills[i];
    await prisma.skillAssessment.create({
      data: {
        title: `${skill.skillName} Verification & Competency Assessment`,
        description: `Comprehensive technical evaluation test for ${skill.skillName} core concepts, architecture, best practices, and practical problem solving.`,
        skillId: skill.id,
        passingScore: 75,
        status: "ACTIVE",
        questions: {
          create: [
            { questionText: `What is a core fundamental principle of ${skill.skillName}?`, options: "Modular Architecture|Monolithic State|Blocking I/O|Synchronous Threading", correctOption: 0, points: 10 },
            { questionText: `Which pattern is considered best practice when working with ${skill.skillName}?`, options: "Single Responsibility & Clean Code|Global State Mutability|Inline Code Injections|Uncaught Exceptions", correctOption: 0, points: 10 },
            { questionText: `How is memory management or performance optimized in ${skill.skillName}?`, options: "Efficient Caching & Lazy Loading|Disabling Garbage Collection|Infinite Polling Loops|Hardcoded Memory Allocations", correctOption: 0, points: 10 },
            { questionText: `Which tool or command is used for testing in ${skill.skillName}?`, options: "Standard Automated Unit Test Suite|Manual Browser Logs|Console Prints Only|No Verification Needed", correctOption: 0, points: 10 },
            { questionText: `In ${skill.skillName}, what is the recommended error handling strategy?`, options: "Structured Exceptions & Logging|Silent Swallowing|Terminating Application|Ignoring Errors", correctOption: 0, points: 10 }
          ]
        }
      }
    });
  }

  console.log("Comprehensive database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding database: ", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
