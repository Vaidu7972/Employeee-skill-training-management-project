# Manual Demo Walkthrough – SkillSphere

This walkthrough demonstrates the capabilities of **SkillSphere** from installation to end-to-end user workflows.

---

## Preparation
1. Ensure both dev servers are running (`npm run dev` at the root).
2. Open a web browser to: [http://localhost:4200](http://localhost:4200)

---

## Phase 1: Portal Guards & Logins
1. Click **Admin Portal** card and continue.
2. Try logging in using the Employee credentials (`employee@skillsphere.local` / `Employee@2026`).
   - *Result*: The login will be blocked, displaying: *"This account is not authorized for this portal."*
3. Now log in using the Admin credentials (`admin@skillsphere.local` / `Admin@2026`).
   - *Result*: Successful login redirects to `/admin/dashboard`.

---

## Phase 2: Administrator Operations
1. Click **Add Employee** quick action button.
   - Enter mock details (e.g. Code `EMP-040`, Name `Jack Ryan`, email `jack@skillsphere.local`). Choose engineering department and save.
2. Click **Create Department** quick action button.
   - Create a department (e.g. Code `INFRA`, Name `Cloud Infrastructure`).
3. Click **Assign Training** quick action button.
   - Assign training `TR-200` to employee `Jack Ryan` for the skill `Docker Containerization` and submit.
4. Log out using the sidebar exit button.

---

## Phase 3: Employee Self-Assessment
1. Navigate back to the Portal selector and choose the **Employee Portal**.
2. Log in using `employee@skillsphere.local` / `Employee@2026`.
3. Select the **My Skills Matrix** tab.
4. Locate the assigned skill (e.g. `Angular Frontend Development`) and click **Assess Self**.
5. Set Rating to `3 - Intermediate`, enter `12` experience months, write comments, and click **Submit for Review**.
6. Note the skill status transitions to `SUBMITTED`.
7. Log out.

---

## Phase 4: Manager Approval
1. Select the **Manager Portal** and log in using `manager@skillsphere.local` / `Manager@2026`.
2. Locate the **Pending Team Skill Self-Assessments** queue card.
3. Observe the assessment submitted by `James Cole` in the list.
4. Click **Approve**. The status updates, and the final rating is confirmed.
5. Log out.

---

## Phase 5: Ticketing System & SLA response
1. Log in as an Employee (`employee@skillsphere.local`).
2. Go to the **Support Ticket Hub** tab.
3. Click **Raise Ticket**.
   - Category: `LOGIN_ISSUE`, Priority: `HIGH`, Subject: `Deactivation warning`, Description: `I am seeing a notification warning about session deactivation.` and submit.
4. Log out.
5. Log in as Admin (`admin@skillsphere.local`).
6. Click the sidebar **Support Tickets** link.
7. Click the **View** button next to the newly raised ticket.
8. Enter a response message in the reply box (e.g. *"We are checking the user accounts directory. Please verify now."*) and send it.
9. Note that `firstResponseDate` is captured, completing the initial response SLA.
