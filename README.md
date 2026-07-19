# SkillSphere – Employee Skill & Training Management System

SkillSphere is an advanced, professional, and fully functional enterprise application designed to catalog employee skills, facilitate self-assessments, run skill-gap analyses, automate training allocations, manage certificates, track career pathways, push notifications, and administer helpdesk support tickets with SLA checking.

## Monorepo Directory Layout

```text
employee-skill-training-system/
├── backend/       # Express, Node, TypeScript, Prisma, Winston, Swagger, pgDB
├── frontend/      # Angular 18, SCSS, RxJS, Forms, Chart.js, HTML5
├── playwright/    # Playwright E2E automation tests
├── docs/          # Architecture, workflows, APIs, ER diagrams, demo scripts
├── package.json   # Root workspace manager scripts
└── .gitignore     # Local settings ignored
```

## System Requirements

- **Node.js**: v24.x or v22.x
- **PostgreSQL**: Local database running on localhost:5432

---

## Getting Started (Local Setup)

### 1. Install Workspace Packages
From the root monorepo directory, run:
```bash
npm run install:all
```

### 2. Configure Database Environment
Edit the backend configuration parameters inside `backend/.env`. Change the credentials matching your PostgreSQL database:
```env
DATABASE_URL="postgresql://postgres:root@localhost:5432/employee_skill_management?schema=public"
```

### 3. Run Database Migrations
Create the PostgreSQL database tables structure in your PG server:
```bash
npm run db:migrate
```

### 4. Seed Mock Data
Insert 35+ Employee profiles, Manager assignments, SLA support tickets, Audit Logs, and Skills details:
```bash
npm run db:seed
```

### 5. Launch Development Servers
Run the Angular frontend (port 4200) and Express API (port 5000) concurrently:
```bash
npm run dev
```

Visit the application in your browser: [http://localhost:4200](http://localhost:4200)  
View API documentation (Swagger UI): [http://localhost:5000/api-docs](http://localhost:5000/api-docs)

---

## E2E Automation Testing
To run the automated Playwright E2E suite, make sure both frontend and backend development servers are running, then run:
```bash
npm run test:e2e
```

---

## Mock Login Credentials

### 🔑 Admin Portal Logins
* **Super Admin**:
  * Email: `admin@skillsphere.local`
  * Password: `Admin@2026`
* **Support Admin**:
  * Email: `support@skillsphere.local`
  * Password: `Support@2026`

### 🔑 Manager Portal Login
* **Manager**:
  * Email: `manager@skillsphere.local`
  * Password: `Manager@2026`

### 🔑 Employee Portal Login
* **Employee**:
  * Email: `employee@skillsphere.local`
  * Password: `Employee@2026`
