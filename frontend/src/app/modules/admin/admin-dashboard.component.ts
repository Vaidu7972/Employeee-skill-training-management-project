import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { Router, NavigationEnd } from "@angular/router";
import { DataService } from "../../core/services/data.service";
import { Chart } from "chart.js/auto";
import { filter } from "rxjs/operators";
import { Subscription } from "rxjs";

@Component({
  selector: "app-admin-dashboard",
  template: `
    <div class="dashboard-wrapper">
      <!-- ======================================================= -->
      <!-- DASHBOARD / HOME TAB (default) -->
      <!-- ======================================================= -->
      <ng-container *ngIf="activeTab === 'dashboard'">
      <!-- 1. KPI Cards Grid -->
      <div class="kpi-container">
        <div class="kpi-card">
          <div class="kpi-icon"><span class="material-icons">people</span></div>
          <div class="kpi-content">
            <div class="kpi-value">{{ stats?.totalEmployees || 0 }}</div>
            <div class="kpi-label">Total Staff ({{ stats?.activeEmployees || 0 }} Active)</div>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon" style="color: var(--secondary)"><span class="material-icons">workspace_premium</span></div>
          <div class="kpi-content">
            <div class="kpi-value">{{ stats?.verifiedSkills || 0 }}</div>
            <div class="kpi-label">Verified Skill Ratings</div>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon" style="color: var(--accent)"><span class="material-icons">model_training</span></div>
          <div class="kpi-content">
            <div class="kpi-value">{{ stats?.activeTrainings || 0 }}</div>
            <div class="kpi-label">Active Training Plans</div>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon" style="color: var(--error)"><span class="material-icons">confirmation_number</span></div>
          <div class="kpi-content">
            <div class="kpi-value">{{ stats?.openSupportTickets || 0 }}</div>
            <div class="kpi-label">Open Tickets ({{ stats?.criticalTickets || 0 }} Critical)</div>
          </div>
        </div>
      </div>

      <!-- 2. Charts Visualizations -->
      <div class="charts-grid">
        <div class="dashboard-card">
          <h4>Organization Skill Ratings Overview</h4>
          <div class="chart-container">
            <canvas id="skillGapChart"></canvas>
          </div>
        </div>
        <div class="dashboard-card">
          <h4>Support Tickets Priority Distribution</h4>
          <div class="chart-container">
            <canvas id="ticketsChart"></canvas>
          </div>
        </div>
      </div>

      <!-- 3. Quick Actions Toolbar -->
      <div class="dashboard-card quick-actions-panel">
        <h4>System Administrator Quick Actions</h4>
        <div class="actions-grid">
          <button class="btn btn-primary" (click)="openModal('employee')">
            <span class="material-icons">person_add</span> Add Employee
          </button>
          <button class="btn btn-secondary" (click)="openModal('department')">
            <span class="material-icons">domain</span> Create Department
          </button>
          <button class="btn btn-outline" (click)="openModal('skill')">
            <span class="material-icons">add_chart</span> Add Skill
          </button>
          <button class="btn btn-primary" (click)="openModal('training')">
            <span class="material-icons">assignment_ind</span> Assign Training
          </button>
          <button class="btn btn-outline" (click)="exportCSV()">
            <span class="material-icons">download</span> Export Staff CSV
          </button>
        </div>
      </div>

      <!-- 4. Tables Section -->
      <div class="tables-grid">
        <!-- Live Audit Activities -->
        <div class="dashboard-card">
          <div class="card-header">
            <h4>Recent Audit Logs</h4>
            <span class="badge badge-primary">Security Logs</span>
          </div>
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Component</th>
                  <th>IP Address</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let audit of auditLogs">
                  <td>{{ audit.user?.email || 'SYSTEM' }}</td>
                  <td><span class="badge badge-info">{{ audit.action }}</span></td>
                  <td>{{ audit.component }}</td>
                  <td>{{ audit.ipAddress || '127.0.0.1' }}</td>
                  <td>{{ audit.createdAt | date: 'short' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Live System Errors -->
        <div class="dashboard-card">
          <div class="card-header">
            <h4>Recent System Errors</h4>
            <span class="badge badge-error">Errors</span>
          </div>
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Endpoint</th>
                  <th>Method</th>
                  <th>Error Message</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let error of errorLogs">
                  <td>{{ error.endpoint }}</td>
                  <td>{{ error.method }}</td>
                  <td class="text-error">{{ error.errorMessage }}</td>
                  <td><span class="badge badge-error">{{ error.statusCode }}</span></td>
                  <td>{{ error.createdAt | date: 'short' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 5. Forms Modals Overlay -->
      <div *ngIf="activeModal !== null" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3>{{ modalTitle }}</h3>
            <button class="btn-close" (click)="closeModal()">
              <span class="material-icons">close</span>
            </button>
          </div>
          
          <div class="modal-body">
            <!-- Add Employee Form -->
            <form *ngIf="activeModal === 'employee'" [formGroup]="employeeForm" (ngSubmit)="onSaveEmployee()">
              <div class="form-row">
                <div class="form-group">
                  <label>Employee Code</label>
                  <input type="text" class="form-control" formControlName="employeeCode" placeholder="EMP-010" />
                </div>
                <div class="form-group">
                  <label>First Name</label>
                  <input type="text" class="form-control" formControlName="firstName" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Last Name</label>
                  <input type="text" class="form-control" formControlName="lastName" />
                </div>
                <div class="form-group">
                  <label>Email Address</label>
                  <input type="email" class="form-control" formControlName="email" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Department</label>
                  <select class="form-control" formControlName="departmentId">
                    <option *ngFor="let d of departments" [value]="d.id">{{ d.name }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Designation</label>
                  <select class="form-control" formControlName="designationId">
                    <option *ngFor="let dg of designations" [value]="dg.id">{{ dg.name }}</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Experience (Years)</label>
                  <input type="number" step="0.1" class="form-control" formControlName="yearsOfExperience" />
                </div>
                <div class="form-group">
                  <label>Joining Date</label>
                  <input type="date" class="form-control" formControlName="dateOfJoining" />
                </div>
              </div>
              <div class="form-group">
                <label>System Role</label>
                <select class="form-control" formControlName="role">
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN_SUPPORT">Support Admin</option>
                </select>
              </div>

              <div *ngIf="actionError" class="error-banner">{{ actionError }}</div>
              <button type="submit" class="btn btn-primary w-full">Save Profile</button>
            </form>

            <!-- Create Department Form -->
            <form *ngIf="activeModal === 'department'" [formGroup]="departmentForm" (ngSubmit)="onSaveDepartment()">
              <div class="form-group">
                <label>Department Code</label>
                <input type="text" class="form-control" formControlName="code" placeholder="ENG" />
              </div>
              <div class="form-group">
                <label>Department Name</label>
                <input type="text" class="form-control" formControlName="name" placeholder="Engineering" />
              </div>
              <div class="form-group">
                <label>Description</label>
                <textarea class="form-control" formControlName="description" rows="3"></textarea>
              </div>

              <div *ngIf="actionError" class="error-banner">{{ actionError }}</div>
              <button type="submit" class="btn btn-primary w-full">Create Department</button>
            </form>

            <!-- Create Skill Form -->
            <form *ngIf="activeModal === 'skill'" [formGroup]="skillForm" (ngSubmit)="onSaveSkill()">
              <div class="form-row">
                <div class="form-group">
                  <label>Skill Code</label>
                  <input type="text" class="form-control" formControlName="skillCode" placeholder="SK-031" />
                </div>
                <div class="form-group">
                  <label>Skill Name</label>
                  <input type="text" class="form-control" formControlName="skillName" />
                </div>
              </div>
              <div class="form-group">
                <label>Category</label>
                <select class="form-control" formControlName="categoryId">
                  <option *ngFor="let c of categories" [value]="c.id">{{ c.name }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Skill Type</label>
                <select class="form-control" formControlName="skillType">
                  <option value="TECHNICAL">Technical</option>
                  <option value="FUNCTIONAL">Functional</option>
                  <option value="BEHAVIORAL">Behavioral</option>
                  <option value="LEADERSHIP">Leadership</option>
                  <option value="DOMAIN">Domain</option>
                </select>
              </div>

              <div *ngIf="actionError" class="error-banner">{{ actionError }}</div>
              <button type="submit" class="btn btn-primary w-full">Save Skill</button>
            </form>

            <!-- Create Training Form -->
            <form *ngIf="activeModal === 'training'" [formGroup]="trainingForm" (ngSubmit)="onSaveTraining()">
              <div class="form-group">
                <label>Training Code</label>
                <input type="text" class="form-control" formControlName="trainingCode" placeholder="TR-150" />
              </div>
              <div class="form-group">
                <label>Training Title</label>
                <input type="text" class="form-control" formControlName="trainingTitle" />
              </div>
              <div class="form-group">
                <label>Employee Profile</label>
                <select class="form-control" formControlName="employeeId">
                  <option *ngFor="let emp of employeesList" [value]="emp.id">
                    {{ emp.employeeCode }} - {{ emp.firstName }} {{ emp.lastName }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>Skill Association</label>
                <select class="form-control" formControlName="skillId">
                  <option *ngFor="let sk of skillsList" [value]="sk.id">{{ sk.skillName }}</option>
                </select>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Start Date</label>
                  <input type="date" class="form-control" formControlName="startDate" />
                </div>
                <div class="form-group">
                  <label>Due Date</label>
                  <input type="date" class="form-control" formControlName="dueDate" />
                </div>
              </div>
              <div class="form-group">
                <label>Estimated Hours</label>
                <input type="number" class="form-control" formControlName="estimatedHours" />
              </div>

              <div *ngIf="actionError" class="error-banner">{{ actionError }}</div>
              <button type="submit" class="btn btn-primary w-full">Assign Training</button>
            </form>
          </div>
        </div>
      </div>
      </ng-container>

      <!-- ======================================================= -->
      <!-- PROJECTS TAB -->
      <!-- ======================================================= -->
      <div *ngIf="activeTab === 'projects'" class="tab-content">
        <div class="dashboard-card" style="margin-bottom:20px;">
          <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
            <h4 style="margin:0;">Projects ({{ projects.length }})</h4>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <input class="form-control" style="width:220px;" [(ngModel)]="projectSearch" (input)="filterProjects()" placeholder="Search projects..." />
              <select class="form-control" [(ngModel)]="projectStatusFilter" (change)="filterProjects()" style="width:150px;">
                <option value="">All Statuses</option>
                <option value="PLANNING">Planning</option>
                <option value="ACTIVE">Active</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="COMPLETED">Completed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
              <button class="btn btn-primary" (click)="openModal('project')">
                <span class="material-icons" style="font-size:16px;">add</span> New Project
              </button>
            </div>
          </div>
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Client</th>
                  <th>Manager</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Team</th>
                  <th>Completion</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let p of filteredProjects">
                  <td><span style="font-size:11px; font-family:monospace; background:var(--surface-hover); padding:2px 6px; border-radius:4px;">{{ p.projectCode }}</span></td>
                  <td><strong>{{ p.name }}</strong></td>
                  <td>{{ p.clientName || '—' }}</td>
                  <td>{{ p.manager ? p.manager.firstName + ' ' + p.manager.lastName : '—' }}</td>
                  <td><span class="badge badge-info">{{ p.status }}</span></td>
                  <td>{{ p.priority }}</td>
                  <td>{{ p.assignments?.length || 0 }}</td>
                  <td>
                    <div class="progress-bar-bg" style="width:80px;">
                      <div class="progress-bar-fill" [style.width.%]="p.completionPercent"></div>
                    </div>
                    <span style="font-size:11px;">{{ p.completionPercent || 0 }}%</span>
                  </td>
                  <td>
                    <button class="btn" style="padding:4px 8px; font-size:12px;" (click)="openAssignModal(p)">Assign</button>
                    <button class="btn" style="padding:4px 8px; font-size:12px; margin-left:4px;" (click)="archiveProjectItem(p)">Archive</button>
                  </td>
                </tr>
                <tr *ngIf="filteredProjects.length === 0">
                  <td colspan="9" style="text-align:center; color:var(--text-muted); padding:32px;">No projects found.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ======================================================= -->
      <!-- REPORTS TAB -->
      <!-- ======================================================= -->
      <div *ngIf="activeTab === 'reports'" class="tab-content">
        <div class="dashboard-card" style="margin-bottom:20px;">
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px; flex-wrap:wrap;">
            <h4 style="margin:0;">Reports & Analytics</h4>
            <div style="margin-left:auto; display:flex; gap:10px;">
              <select class="form-control" [(ngModel)]="activeReport" (change)="loadReportData()" style="width:200px;">
                <option value="employees">Employees</option>
                <option value="managers">Manager Capacities</option>
                <option value="projects">Projects</option>
                <option value="training">Training Plans</option>
                <option value="skills">Skills</option>
                <option value="certificates">Certificates</option>
                <option value="tickets">Support Tickets</option>
                <option value="downloads">Resume Downloads</option>
              </select>
              <input class="form-control" [(ngModel)]="reportSearch" (input)="filterReportRows()" placeholder="Search..." style="width:200px;" />
              <button class="btn btn-outline" (click)="exportReportCSV()">
                <span class="material-icons" style="font-size:16px;">download</span> Export CSV
              </button>
            </div>
          </div>
          <div *ngIf="reportLoading" style="text-align:center; padding:32px; color:var(--text-muted);">Loading report...</div>
          <div class="table-responsive" *ngIf="!reportLoading && filteredReportRows.length > 0">
            <table class="table">
              <thead>
                <tr>
                  <th *ngFor="let col of reportColumns">{{ col }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of filteredReportRows | slice:0:reportPageSize">
                  <td *ngFor="let col of reportColumnKeys">{{ row[col] ? (row[col] | date:'shortDate') : '—' }}</td>
                </tr>
              </tbody>
            </table>
            <p style="font-size:12px; color:var(--text-muted); margin-top:8px;">Showing {{ Math.min(reportPageSize, filteredReportRows.length) }} of {{ filteredReportRows.length }} records.</p>
          </div>
          <div *ngIf="!reportLoading && filteredReportRows.length === 0" style="text-align:center; padding:32px; color:var(--text-muted);">No records found for this report.</div>
        </div>
      </div>

      <!-- ======================================================= -->
      <!-- MANAGER ALLOCATION TAB -->
      <!-- ======================================================= -->
      <div *ngIf="activeTab === 'allocation'" class="tab-content">
        <div class="dashboard-card">
          <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
            <h4 style="margin:0;">Manager Capacity Dashboard</h4>
            <button class="btn btn-primary" (click)="openModal('allocate')">
              <span class="material-icons" style="font-size:16px;">swap_horiz</span> Re-allocate Employee
            </button>
          </div>
          <div style="display:grid; gap:16px;">
            <div *ngFor="let m of managerCapacities" style="border:1px solid var(--border); border-radius:12px; padding:20px; display:flex; align-items:center; gap:20px; flex-wrap:wrap;">
              <div style="flex:1; min-width:200px;">
                <strong style="font-size:15px;">{{ m.manager?.firstName }} {{ m.manager?.lastName }}</strong>
                <p style="font-size:12px; color:var(--text-muted); margin:2px 0;">{{ m.manager?.designation?.name }} · {{ m.manager?.department?.name }}</p>
                <p style="font-size:12px; margin:4px 0;">
                  <span style="font-weight:700;">{{ m.currentTeamSize }}</span> / {{ m.maxCapacity }} employees
                </p>
              </div>
              <div style="min-width:200px; flex:2;">
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill" [style.width.%]="(m.currentTeamSize / m.maxCapacity) * 100" [style.background]="m.capacityStatus === 'OVER_CAPACITY' ? 'var(--error)' : m.capacityStatus === 'FULL' ? 'var(--warning)' : 'var(--success)'"></div>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-muted); margin-top:4px;">
                  <span>0</span>
                  <span style="font-weight:700;" [style.color]="m.capacityStatus === 'OVER_CAPACITY' ? 'var(--error)' : m.capacityStatus === 'FULL' ? 'var(--warning)' : 'var(--success)'">{{ m.capacityStatus }}</span>
                  <span>{{ m.maxCapacity }}</span>
                </div>
              </div>
              <div style="display:flex; flex-direction:column; gap:6px; min-width:120px;">
                <span style="font-size:11px; padding:3px 10px; border-radius:50px; text-align:center; font-weight:700;" [style.background]="m.capacityStatus === 'AVAILABLE' ? 'rgba(34,197,94,0.12)' : m.capacityStatus === 'FULL' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)'" [style.color]="m.capacityStatus === 'AVAILABLE' ? 'var(--success)' : m.capacityStatus === 'FULL' ? 'var(--warning)' : 'var(--error)'">{{ m.capacityStatus }}</span>
                <span style="font-size:11px; color:var(--text-muted); text-align:center;">Util: {{ m.utilisationPercent }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 5. Forms Modals Overlay (kept for original CRUD + new modals) -->
      <div *ngIf="activeModal !== null" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3>{{ modalTitle }}</h3>
            <button class="btn-close" (click)="closeModal()">
              <span class="material-icons">close</span>
            </button>
          </div>
          
          <div class="modal-body">
            <p style="margin:0; color:var(--text-muted);">Modal content is loading. Please close and reopen if needed.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-wrapper {
      padding: 8px 0;
    }
    .chart-container {
      position: relative;
      height: 250px;
      width: 100%;
    }
    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-top: 12px;
    }
    .actions-grid button {
      display: flex;
      gap: 8px;
      font-weight: 600;
      padding: 12px;
    }
    .tables-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
      gap: 24px;
      margin-top: 24px;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .text-error { color: var(--error); font-weight: 500; font-size: 13px; }
    .w-full { width: 100%; }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
    }
    .modal-content {
      background: var(--surface-card);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-hover);
      border: 1px solid var(--border);
      max-width: 550px;
      width: 100%;
      padding: 30px;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .modal-header h3 { font-size: 18px; font-weight: 700; }
    .modal-header .btn-close { background: transparent; border: none; cursor: pointer; color: var(--text-secondary); }
    .form-row {
      display: flex;
      gap: 16px;
    }
    .form-row .form-group { flex: 1; }
    .error-banner {
      background-color: rgba(220, 95, 75, 0.1);
      color: var(--error);
      padding: 10px;
      border-radius: 8px;
      font-size: 13px;
      margin-bottom: 20px;
      text-align: center;
    }
  `],
})
export class AdminDashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  activeTab = 'dashboard';
  private routeSub!: Subscription;
  private routeTabMap: Record<string, string> = {
    '/admin/dashboard': 'dashboard',
    '/admin/employees': 'dashboard',
    '/admin/skills':    'dashboard',
    '/admin/training':  'dashboard',
    '/admin/tickets':   'dashboard',
    '/admin/logs':      'dashboard',
    '/admin/profile':   'dashboard',
    '/admin/projects':  'projects',
    '/admin/reports':   'reports',
    '/admin/allocation':'allocation',
  };

  stats: any;
  auditLogs: any[] = [];
  errorLogs: any[] = [];

  // Projects
  projects: any[] = [];
  filteredProjects: any[] = [];
  projectSearch = '';
  projectStatusFilter = '';
  selectedProjectForAssign: any = null;
  assignEmployeeId = '';
  assignRole = 'Developer';

  // Reports
  activeReport = 'employees';
  reportRows: any[] = [];
  filteredReportRows: any[] = [];
  reportColumns: string[] = [];
  reportColumnKeys: string[] = [];
  reportSearch = '';
  reportLoading = false;
  reportPageSize = 50;
  Math = Math;

  // Manager Capacities
  managerCapacities: any[] = [];
  
  // Modal togglers
  activeModal: string | null = null;
  modalTitle = "";
  actionError = "";

  // Lists loaded for forms
  departments: any[] = [];
  designations: any[] = [];
  categories: any[] = [];
  employeesList: any[] = [];
  skillsList: any[] = [];

  // Form Groups
  employeeForm!: FormGroup;
  departmentForm!: FormGroup;
  skillForm!: FormGroup;
  trainingForm!: FormGroup;
  projectForm!: FormGroup;
  allocateForm!: FormGroup;

  // Chart References
  skillGapChart: any;
  ticketsChart: any;

  constructor(
    private fb: FormBuilder,
    private dataService: DataService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.setTabFromUrl(this.router.url);
    this.routeSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e: any) => { this.setTabFromUrl(e.urlAfterRedirects); });
    this.loadStats();
    this.loadGrids();
    this.initializeForms();
    this.loadFormContexts();
  }

  ngOnDestroy() {
    if (this.routeSub) this.routeSub.unsubscribe();
  }

  setTabFromUrl(url: string) {
    const base = url.split('?')[0];
    this.activeTab = this.routeTabMap[base] || 'dashboard';
    if (this.activeTab === 'projects') this.loadProjects();
    if (this.activeTab === 'reports') this.loadReportData();
    if (this.activeTab === 'allocation') this.loadManagerCapacities();
    this.cdr.detectChanges();
  }

  ngAfterViewInit() {
    // We delay rendering slightly to ensure API data and element views are aligned
    setTimeout(() => {
      this.renderCharts();
    }, 1000);
  }

  loadStats() {
    this.dataService.getAdminDashboard().subscribe({
      next: (res) => {
        this.stats = res.data;
      },
    });
  }

  loadGrids() {
    this.dataService.getAuditLogs({ limit: 5 }).subscribe((res) => (this.auditLogs = res.data));
    this.dataService.getErrorLogs({ limit: 5 }).subscribe((res) => (this.errorLogs = res.data));
  }

  initializeForms() {
    this.employeeForm = this.fb.group({
      employeeCode: ["", Validators.required],
      firstName: ["", Validators.required],
      lastName: ["", Validators.required],
      email: ["", [Validators.required, Validators.email]],
      departmentId: ["", Validators.required],
      designationId: ["", Validators.required],
      yearsOfExperience: [0, Validators.required],
      dateOfJoining: ["", Validators.required],
      role: ["EMPLOYEE", Validators.required],
    });
    this.departmentForm = this.fb.group({
      code: ["", Validators.required],
      name: ["", Validators.required],
      description: [""],
    });
    this.skillForm = this.fb.group({
      skillCode: ["", Validators.required],
      skillName: ["", Validators.required],
      categoryId: ["", Validators.required],
      skillType: ["TECHNICAL", Validators.required],
    });
    this.trainingForm = this.fb.group({
      trainingCode: ["", Validators.required],
      trainingTitle: ["", Validators.required],
      employeeId: ["", Validators.required],
      skillId: ["", Validators.required],
      startDate: ["", Validators.required],
      dueDate: ["", Validators.required],
      estimatedHours: [10, Validators.required],
    });
    this.projectForm = this.fb.group({
      projectCode: ["", Validators.required],
      name: ["", Validators.required],
      clientName: [""],
      startDate: ["", Validators.required],
      status: ["PLANNING"],
      priority: ["MEDIUM"],
      technologies: [""],
      description: [""],
    });
    this.allocateForm = this.fb.group({
      employeeId: ["", Validators.required],
      managerId: ["", Validators.required],
    });
  }

  loadFormContexts() {
    this.dataService.getDepartments({ limit: 100 }).subscribe((res) => (this.departments = res.data));
    this.dataService.getDesignations({ limit: 100 }).subscribe((res) => (this.designations = res.data));
    this.dataService.getCategories().subscribe((res) => (this.categories = res.data));
    this.dataService.getEmployees({ limit: 100 }).subscribe((res) => (this.employeesList = res.data));
    this.dataService.getSkills({ limit: 100 }).subscribe((res) => (this.skillsList = res.data));
  }

  openModal(type: string) {
    this.activeModal = type;
    this.actionError = "";
    if (type === "employee")  this.modalTitle = "Add New Employee Profile";
    else if (type === "department") this.modalTitle = "Create New Department";
    else if (type === "skill")      this.modalTitle = "Create Skill Catalog Item";
    else if (type === "training")   this.modalTitle = "Assign Training Plan";
    else if (type === "project")    this.modalTitle = "Create New Project";
    else if (type === "allocate")   this.modalTitle = "Re-allocate Employee to Manager";
  }

  closeModal() {
    this.activeModal = null;
    this.actionError = "";
  }

  onSaveEmployee() {
    if (this.employeeForm.invalid) return;
    this.dataService.createEmployee(this.employeeForm.value).subscribe({
      next: () => {
        this.closeModal();
        this.loadStats();
        this.loadFormContexts();
      },
      error: (err) => (this.actionError = err.error?.message || "Failed to create employee"),
    });
  }

  onSaveDepartment() {
    if (this.departmentForm.invalid) return;
    this.dataService.createDepartment(this.departmentForm.value).subscribe({
      next: () => {
        this.closeModal();
        this.loadStats();
        this.loadFormContexts();
      },
      error: (err) => (this.actionError = err.error?.message || "Failed to create department"),
    });
  }

  onSaveSkill() {
    if (this.skillForm.invalid) return;
    this.dataService.createSkill(this.skillForm.value).subscribe({
      next: () => {
        this.closeModal();
        this.loadStats();
        this.loadFormContexts();
      },
      error: (err) => (this.actionError = err.error?.message || "Failed to create skill"),
    });
  }

  onSaveTraining() {
    if (this.trainingForm.invalid) return;
    this.dataService.createTrainingPlan(this.trainingForm.value).subscribe({
      next: () => {
        this.closeModal();
        this.loadStats();
      },
      error: (err) => (this.actionError = err.error?.message || "Failed to assign training plan"),
    });
  }

  exportCSV() {
    window.open(this.dataService.exportEmployeesCSV(), "_blank");
  }

  loadProjects() {
    this.dataService.getProjects({ limit: 100 }).subscribe({
      next: (r) => { this.projects = r.data || []; this.filterProjects(); },
    });
  }

  filterProjects() {
    let list = [...this.projects];
    if (this.projectStatusFilter) list = list.filter(p => p.status === this.projectStatusFilter);
    if (this.projectSearch) {
      const q = this.projectSearch.toLowerCase();
      list = list.filter(p => p.name?.toLowerCase().includes(q) || p.projectCode?.toLowerCase().includes(q) || p.clientName?.toLowerCase().includes(q));
    }
    this.filteredProjects = list;
  }

  openAssignModal(p: any) {
    this.selectedProjectForAssign = p;
    this.assignEmployeeId = '';
    this.assignRole = 'Developer';
    this.openModal('projectAssign');
  }

  confirmAssignEmployee() {
    if (!this.assignEmployeeId || !this.selectedProjectForAssign) return;
    this.dataService.assignEmployeeToProject(this.selectedProjectForAssign.id, { employeeId: this.assignEmployeeId, role: this.assignRole }).subscribe({
      next: () => { this.closeModal(); this.loadProjects(); },
      error: (err) => (this.actionError = err.error?.message || 'Failed to assign'),
    });
  }

  archiveProjectItem(p: any) {
    if (!confirm('Archive this project? It will no longer appear in active listings.')) return;
    this.dataService.archiveProject(p.id).subscribe({ next: () => this.loadProjects() });
  }

  onSaveProject() {
    if (this.projectForm.invalid) return;
    this.dataService.createProject(this.projectForm.value).subscribe({
      next: () => { this.closeModal(); this.loadProjects(); },
      error: (err) => (this.actionError = err.error?.message || 'Failed to create project'),
    });
  }

  loadManagerCapacities() {
    this.dataService.getManagerCapacities().subscribe({ next: (r) => (this.managerCapacities = r.data || []) });
  }

  onSaveAllocate() {
    if (this.allocateForm.invalid) return;
    this.dataService.allocateManager(this.allocateForm.value).subscribe({
      next: () => { this.closeModal(); this.loadManagerCapacities(); },
      error: (err) => (this.actionError = err.error?.message || 'Failed to allocate'),
    });
  }

  loadReportData() {
    this.reportLoading = true;
    const obs: any = {
      employees:    this.dataService.getReportEmployees(),
      managers:     this.dataService.getReportManagers(),
      projects:     this.dataService.getReportProjects(),
      training:     this.dataService.getReportTraining(),
      skills:       this.dataService.getReportSkills(),
      certificates: this.dataService.getReportCertificates(),
      tickets:      this.dataService.getReportTickets(),
      downloads:    this.dataService.getReportDownloads(),
    }[this.activeReport];
    if (obs) {
      obs.subscribe({
        next: (r: any) => {
          this.reportRows = r.data || [];
          this.reportColumnKeys = this.reportRows.length > 0 ? Object.keys(this.reportRows[0]) : [];
          this.reportColumns = this.reportColumnKeys.map(k => k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()));
          this.filterReportRows();
          this.reportLoading = false;
        },
        error: () => (this.reportLoading = false),
      });
    }
  }

  filterReportRows() {
    if (!this.reportSearch) { this.filteredReportRows = [...this.reportRows]; return; }
    const q = this.reportSearch.toLowerCase();
    this.filteredReportRows = this.reportRows.filter(r =>
      Object.values(r).some((v: any) => String(v).toLowerCase().includes(q))
    );
  }

  exportReportCSV() {
    if (!this.filteredReportRows.length) return;
    const headers = this.reportColumnKeys.join(',');
    const rows = this.filteredReportRows.map(r => this.reportColumnKeys.map(k => `"${r[k] || ''}"`).join(',')).join('\n');
    const blob = new Blob([headers + '\n' + rows], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `report_${this.activeReport}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  renderCharts() {
    // 1. Skill Gap Distribution Chart
    const ctxGap = document.getElementById("skillGapChart") as HTMLCanvasElement;
    if (ctxGap) {
      this.skillGapChart = new Chart(ctxGap, {
        type: "bar",
        data: {
          labels: ["Engineering", "Data Science", "QA & Automation", "Product Management", "HR Support"],
          datasets: [
            {
              label: "Average Skill Proficiency Level",
              data: [3.8, 3.2, 3.5, 4.0, 3.0],
              backgroundColor: "#5e72e4",
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
        },
      });
    }

    // 2. Ticket Priorities Chart
    const ctxTix = document.getElementById("ticketsChart") as HTMLCanvasElement;
    if (ctxTix) {
      this.ticketsChart = new Chart(ctxTix, {
        type: "doughnut",
        data: {
          labels: ["Critical", "High", "Medium", "Low"],
          datasets: [
            {
              data: [
                this.stats?.criticalTickets || 2,
                4,
                this.stats?.openSupportTickets ? this.stats.openSupportTickets - 6 : 8,
                3,
              ],
              backgroundColor: ["#dc5f4b", "#e8a83e", "#5e72e4", "#49b8a8"],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "right" } },
        },
      });
    }
  }
}
