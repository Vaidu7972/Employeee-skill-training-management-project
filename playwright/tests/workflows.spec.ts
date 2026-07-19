import { test, expect } from "@playwright/test";

test.describe("SkillSphere Enterprise Upgraded E2E System Workflows", () => {
  
  test("1. Visit Landing Page and Verify Sections", async ({ page }) => {
    // Go to Landing Root Page
    await page.goto("/");

    // Verify Title and sticky header logo
    await expect(page.locator(".brand-name")).toContainText("SkillSphere");
    await expect(page.locator("h1")).toContainText("Empower Your Workforce, Bridge Skill Gaps");

    // Verify Modules/Portals are described
    const exploreBtn = page.locator("button:has-text('Explore Portal Gateway')");
    await expect(exploreBtn).toBeVisible();

    // Verify FAQs section exists
    await expect(page.locator("#faqs")).toBeVisible();
  });

  test("2. Verify Login Portal Separation Guard", async ({ page }) => {
    // Go to Employee Login portal
    await page.goto("/auth/employee-login");

    // Try logging in as Admin on the Employee portal
    await page.fill('input[formControlName="email"]', "admin@skillsphere.local");
    await page.fill('input[formControlName="password"]', "Admin@2026");
    await page.click('button[type="submit"]');

    // Should display unauthorized error
    const errorBanner = page.locator(".error-banner");
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText("This account is not authorized for this portal.");
  });

  test("3. Admin Portal - Log In & Dashboard KPIs check", async ({ page }) => {
    // Go to Admin Login
    await page.goto("/auth/admin-login");
    await page.fill('input[formControlName="email"]', "admin@skillsphere.local");
    await page.fill('input[formControlName="password"]', "Admin@2026");
    await page.click('button[type="submit"]');

    // Confirm dashboard redirects
    await expect(page).toHaveURL("/admin/dashboard");
    
    // Check key elements are loaded
    const staffKpi = page.locator(".kpi-card:has-text('Total Staff')");
    await expect(staffKpi).toBeVisible();
  });

  test("4. Manager Portal - Dual Tab Layout Verification", async ({ page }) => {
    // Go to Manager Login
    await page.goto("/auth/manager-login");
    await page.fill('input[formControlName="email"]', "manager@skillsphere.local");
    await page.fill('input[formControlName="password"]', "Manager@2026");
    await page.click('button[type="submit"]');

    // Confirm manager portal access
    await expect(page).toHaveURL("/manager/dashboard");

    // Check presence of "My Team" and "My Development" tabs
    const teamTab = page.locator("button:has-text('My Team')");
    const devTab = page.locator("button:has-text('My Development')");
    await expect(teamTab).toBeVisible();
    await expect(devTab).toBeVisible();

    // Click "My Development" tab and check personal stats are visible
    await devTab.click();
    await expect(page.locator("app-employee-dashboard")).toBeVisible();
  });

  test("5. Employee Portal - Access personal trackers & raise ticket", async ({ page }) => {
    // Go to Employee Login
    await page.goto("/auth/employee-login");
    await page.fill('input[formControlName="email"]', "employee@skillsphere.local");
    await page.fill('input[formControlName="password"]', "Employee@2026");
    await page.click('button[type="submit"]');

    // Redirect to dashboard
    await expect(page).toHaveURL("/employee/dashboard");

    // Verify self tabs
    await page.click("button:has-text('Support Ticket Hub')");
    await expect(page.locator("h4:has-text('My Support Tickets')")).toBeVisible();
  });

  test("6. Employee Portal - Take Skill Assessment & Verify Auto-Approval", async ({ page }) => {
    // Setup dialog listener for the alert
    let dialogMessage = "";
    page.on("dialog", async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Go to Employee Login
    await page.goto("/auth/employee-login");
    await page.fill('input[formControlName="email"]', "employee@skillsphere.local");
    await page.fill('input[formControlName="password"]', "Employee@2026");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL("/employee/dashboard");

    // Navigate to Assessments tab
    await page.click("button:has-text('Skill Assessments')");
    await expect(page.locator("h4:has-text('Available Skill Verification Assessments')")).toBeVisible();

    // Click 'Start Test' on the JavaScript assessment row specifically
    await page.locator("tr:has-text('TypeScript & JavaScript ES6+')").locator("button:has-text('Start Test')").click();
    await expect(page.locator("h3:has-text('Skill Assessment Quiz Tracker')")).toBeVisible();

    // Question 1: "def"
    await page.locator("label:has-text('def')").click();
    await page.locator("button:has-text('Next')").click();

    // Question 2: "object"
    await page.locator("label:has-text('object')").click();
    await page.locator("button:has-text('Next')").click();

    // Question 3: "map"
    await page.locator("label:has-text('map')").click();
    await page.locator("button:has-text('Submit Answers')").click();

    // Wait for dialog alert message
    await page.waitForTimeout(1000);
    expect(dialogMessage).toContain("PASSED");
  });
});
