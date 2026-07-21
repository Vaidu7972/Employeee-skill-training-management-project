import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";

@Component({
  selector: "app-auth",
  template: `
    <div class="auth-wrapper">
      <div class="auth-nav">
        <span class="logo">SkillSphere</span>
        <button class="theme-toggle" (click)="toggleTheme()">
          <span class="material-icons">{{ isDark ? 'light_mode' : 'dark_mode' }}</span>
        </button>
      </div>

      <div class="auth-content">
        <!-- 1. PORTAL SELECTION CARD LAYOUT -->
        <div *ngIf="view === 'select'" class="portal-selection">
          <h2 class="title">Welcome to SkillSphere</h2>
          <p class="subtitle">Select your authorization gateway to continue</p>

          <div class="portal-grid">
            <!-- Admin card -->
            <div class="portal-card" (click)="goToLogin('admin')">
              <div class="portal-icon admin">
                <span class="material-icons">admin_panel_settings</span>
              </div>
              <h3>Admin Portal</h3>
              <p>For administrative logs, employee lists, designations, allocation matrix, and SLA settings.</p>
              <button class="btn btn-primary">Enter Admin Portal</button>
            </div>

            <!-- Manager card -->
            <div class="portal-card" (click)="goToLogin('manager')">
              <div class="portal-icon manager">
                <span class="material-icons">supervisor_account</span>
              </div>
              <h3>Manager Portal</h3>
              <p>For team profile skills review, self-assessments approval, and training recommendations.</p>
              <button class="btn btn-secondary">Enter Manager Portal</button>
            </div>

            <!-- Employee card -->
            <div class="portal-card" (click)="goToLogin('employee')">
              <div class="portal-icon employee">
                <span class="material-icons">badge</span>
              </div>
              <h3>Employee Portal</h3>
              <p>For skill gap reviews, completing self-assessments, training paths, and support tickets.</p>
              <button class="btn btn-outline">Enter Employee Portal</button>
            </div>
          </div>

          <!-- Demo credentials grid -->
          <div style="margin-top:40px; padding:20px; background:var(--surface-card); border:1px solid var(--border); border-radius:12px; max-width:800px; margin-left:auto; margin-right:auto; text-align:left; box-shadow:var(--shadow);">
            <h4 style="margin:0 0 12px; font-size:14px; color:var(--primary); font-weight:700; text-transform:uppercase; letter-spacing:0.5px; display:flex; align-items:center; gap:8px;">
              <span class="material-icons" style="font-size:18px;">key</span> Development Test Logins & Credentials
            </h4>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:16px; font-size:13px;">
              <div>
                <h5 style="margin:0 0 4px; color:var(--text-primary); font-weight:600;">Super Administrator</h5>
                <p style="margin:2px 0; color:var(--text-secondary);"><strong>User:</strong> admin&#64;skillsphere.local</p>
                <p style="margin:2px 0; color:var(--text-secondary);"><strong>Pass:</strong> Admin&#64;2026</p>
              </div>
              <div style="border-left:1px solid var(--border); padding-left:16px;">
                <h5 style="margin:0 0 4px; color:var(--text-primary); font-weight:600;">Manager (David Miller)</h5>
                <p style="margin:2px 0; color:var(--text-secondary);"><strong>User:</strong> manager&#64;skillsphere.local</p>
                <p style="margin:2px 0; color:var(--text-secondary);"><strong>Pass:</strong> Manager&#64;2026</p>
              </div>
              <div style="border-left:1px solid var(--border); padding-left:16px;">
                <h5 style="margin:0 0 4px; color:var(--text-primary); font-weight:600;">Employee (James Cole)</h5>
                <p style="margin:2px 0; color:var(--text-secondary);"><strong>User:</strong> employee&#64;skillsphere.local</p>
                <p style="margin:2px 0; color:var(--text-secondary);"><strong>Pass:</strong> Employee&#64;2026</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. LOGIN FORM LAYOUT -->
        <div *ngIf="view !== 'select'" class="login-container">
          <div class="back-link" (click)="setView('select')">
            <span class="material-icons">arrow_back</span> Back to Portals
          </div>

          <div class="login-card">
            <div class="login-header">
              <div class="portal-badge" [ngClass]="view">
                {{ view | uppercase }} PORTAL
              </div>
              <h2>Sign In</h2>
              <p>Provide credentials to access your dashboard</p>
            </div>

            <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
              <div class="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  class="form-control"
                  formControlName="email"
                  placeholder="Enter email address"
                />
                <div *ngIf="submitted && f['email'].errors" class="error-text">
                  Please enter a valid email address.
                </div>
              </div>

              <div class="form-group">
                <label>Password</label>
                <input
                  type="password"
                  class="form-control"
                  formControlName="password"
                  placeholder="Enter password"
                />
                <div *ngIf="submitted && f['password'].errors" class="error-text">
                  Password must be at least 6 characters.
                </div>
              </div>

              <div *ngIf="errorMessage" class="error-banner">
                {{ errorMessage }}
              </div>

              <button type="submit" class="btn btn-primary w-full" [disabled]="loading">
                {{ loading ? 'Authenticating...' : 'Log In' }}
              </button>
            </form>

            <!-- Demo credentials showcase -->
            <div class="demo-box">
              <h4>Demo Credentials (Development Mode)</h4>
              <div *ngIf="view === 'admin'">
                <p><strong>Super Admin:</strong> admin&#64;skillsphere.local / Admin&#64;2026</p>
                <p><strong>Support Admin:</strong> support&#64;skillsphere.local / Support&#64;2026</p>
              </div>
              <div *ngIf="view === 'manager'">
                <p><strong>Manager:</strong> manager&#64;skillsphere.local / Manager&#64;2026</p>
              </div>
              <div *ngIf="view === 'employee'">
                <p><strong>Employee:</strong> employee&#64;skillsphere.local / Employee&#64;2026</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-wrapper {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background-color: var(--background-main);
      color: var(--text-primary);
      transition: var(--transition);
    }
    .auth-nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 40px;
      .logo {
        font-size: 24px;
        font-weight: 700;
        letter-spacing: -0.5px;
        color: var(--primary);
      }
      .theme-toggle {
        background: transparent;
        border: none;
        color: var(--text-primary);
        cursor: pointer;
        outline: none;
        span { font-size: 24px; }
      }
    }
    .auth-content {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
    }
    .portal-selection {
      max-width: 1000px;
      width: 100%;
      text-align: center;
      .title {
        font-size: 32px;
        font-weight: 700;
        margin-bottom: 8px;
      }
      .subtitle {
        color: var(--text-secondary);
        margin-bottom: 48px;
        font-size: 16px;
      }
    }
    .portal-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 30px;
    }
    .portal-card {
      background-color: var(--surface-card);
      border-radius: var(--border-radius);
      padding: 40px 30px;
      box-shadow: var(--shadow);
      border: 1px solid var(--border);
      transition: var(--transition);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      &:hover {
        box-shadow: var(--shadow-hover);
        transform: translateY(-5px);
      }
      .portal-icon {
        width: 64px;
        height: 64px;
        border-radius: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 24px;
        span { font-size: 32px; color: #ffffff; }
        &.admin { background-color: var(--primary); }
        &.manager { background-color: var(--secondary); }
        &.employee { background-color: var(--accent); }
      }
      h3 {
        font-size: 18px;
        margin-bottom: 12px;
        font-weight: 600;
      }
      p {
        font-size: 13px;
        color: var(--text-secondary);
        margin-bottom: 24px;
        line-height: 1.6;
        flex-grow: 1;
      }
      .btn {
        width: 100%;
      }
    }
    .login-container {
      max-width: 420px;
      width: 100%;
      .back-link {
        display: inline-flex;
        align-items: center;
        color: var(--text-secondary);
        cursor: pointer;
        margin-bottom: 20px;
        font-weight: 500;
        transition: var(--transition);
        &:hover { color: var(--primary); }
        span { font-size: 18px; margin-right: 6px; }
      }
    }
    .login-card {
      background-color: var(--surface-card);
      border-radius: var(--border-radius);
      padding: 40px 30px;
      box-shadow: var(--shadow);
      border: 1px solid var(--border);
    }
    .login-header {
      text-align: center;
      margin-bottom: 30px;
      .portal-badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 50px;
        font-size: 11px;
        font-weight: 700;
        margin-bottom: 16px;
        &.admin { background-color: rgba(94, 114, 228, 0.1); color: var(--primary); }
        &.manager { background-color: rgba(73, 184, 168, 0.1); color: var(--secondary); }
        &.employee { background-color: rgba(232, 168, 62, 0.1); color: var(--accent); }
      }
      h2 { font-size: 24px; font-weight: 700; }
      p { color: var(--text-secondary); font-size: 13px; margin-top: 4px; }
    }
    .error-text {
      color: var(--error);
      font-size: 12px;
      margin-top: 4px;
    }
    .error-banner {
      background-color: rgba(220, 95, 75, 0.1);
      color: var(--error);
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      margin-bottom: 20px;
      text-align: center;
      font-weight: 500;
    }
    .w-full { width: 100%; }
    .demo-box {
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px dashed var(--border);
      font-size: 12px;
      color: var(--text-secondary);
      h4 { font-weight: 600; margin-bottom: 8px; color: var(--text-primary); }
      p { margin-bottom: 4px; }
    }
  `],
})
export class AuthComponent implements OnInit {
  view: "select" | "admin" | "manager" | "employee" = "select";
  loginForm!: FormGroup;
  loading = false;
  submitted = false;
  errorMessage = "";
  isDark = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.authService.initTheme();
    this.isDark = localStorage.getItem("theme") === "dark";

    // Build Form
    this.loginForm = this.fb.group({
      email: ["", [Validators.required, Validators.email]],
      password: ["", [Validators.required, Validators.minLength(6)]],
    });

    const url = this.router.url;
    if (url.includes("admin-login")) this.setView("admin");
    else if (url.includes("manager-login")) this.setView("manager");
    else if (url.includes("employee-login")) this.setView("employee");
    else this.setView("select");
  }

  get f() {
    return this.loginForm.controls;
  }

  setView(view: "select" | "admin" | "manager" | "employee") {
    this.view = view;
    this.errorMessage = "";
    this.submitted = false;
    this.loginForm.reset();
  }

  goToLogin(role: "admin" | "manager" | "employee") {
    this.router.navigate([`/auth/${role}-login`]);
  }

  toggleTheme() {
    this.isDark = !this.isDark;
    this.authService.setDarkTheme(this.isDark);
  }

  onSubmit() {
    this.submitted = true;
    this.errorMessage = "";

    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    const { email, password } = this.loginForm.value;
    
    // Map view to portal parameter for backend checking
    let portal = "EMPLOYEE_PORTAL";
    if (this.view === "admin") portal = "ADMIN_PORTAL";
    else if (this.view === "manager") portal = "MANAGER_PORTAL";

    this.authService.login(email, password, portal).subscribe({
      next: (res) => {
        this.loading = false;
        const role = res.data.user.role;
        if (role === "ADMIN") {
          this.router.navigate(["/admin/dashboard"]);
        } else if (role === "MANAGER") {
          this.router.navigate(["/manager/dashboard"]);
        } else {
          this.router.navigate(["/employee/dashboard"]);
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || "Invalid credentials or unauthorized portal access.";
      },
    });
  }
}
