import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { Router, NavigationEnd } from "@angular/router";
import { DataService } from "../../core/services/data.service";
import { Chart } from "chart.js/auto";
import { filter } from "rxjs/operators";
import { Subscription } from "rxjs";
import { exportToCsv, exportToExcel, printTable, exportToPdf, exportHtmlToPdf } from "../../core/utils/export.utils";

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
            <button class="btn btn-outline-sm" (click)="activeTab = 'logs'">View All Audit Logs</button>
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
                <tr *ngFor="let audit of auditLogs" (click)="openAuditDetailModal(audit)" style="cursor:pointer;" title="Click to view details">
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
            <button class="btn btn-outline-sm" (click)="activeTab = 'logs'">View All Error Logs</button>
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
                <tr *ngFor="let error of errorLogs" (click)="openErrorDetailModal(error)" style="cursor:pointer;" title="Click to view details">
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
          <div style="display:flex; flex-direction:column; gap:16px; margin-bottom:20px;">
            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
              <h4 style="margin:0;">Reports & Analytics Catalog</h4>
              
              <!-- Report Selector -->
              <select class="form-control" [(ngModel)]="activeReport" (change)="loadReportData()" style="width:250px; font-weight:700;">
                <option value="employees">Employee Directory Report</option>
                <option value="managers">Manager Capacity Overview</option>
                <option value="departments">Department Structure Report</option>
                <option value="teams">Team Performance Analytics</option>
                <option value="skills">Employee Skills Matrix</option>
                <option value="skillgaps">Skill Gap Analysis Report</option>
                <option value="training">Training Progress Report</option>
                <option value="certificates">Verified Credentials Report</option>
                <option value="projects">Projects Portfolio Report</option>
                <option value="tickets">Support Tickets Helpdesk Report</option>
                <option value="audit">Security Audit Action Logs</option>
                <option value="downloads">Resume Download Audit Trail</option>
              </select>
            </div>

            <!-- Multi-Filters and Export Bar -->
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px; background:var(--surface-hover); padding:16px; border-radius:8px; border:1px solid var(--border);">
              <!-- Global Search -->
              <div class="form-group" style="margin:0;">
                <label style="font-size:11px; font-weight:700; margin-bottom:4px; display:block;">Search Query</label>
                <input class="form-control" [(ngModel)]="reportSearch" (input)="filterReportRows()" placeholder="Type to filter..." style="width:100%;" />
              </div>

              <!-- Department Filter (if column exists) -->
              <div class="form-group" style="margin:0;" *ngIf="hasReportColumn('department')">
                <label style="font-size:11px; font-weight:700; margin-bottom:4px; display:block;">Department</label>
                <select class="form-control" [(ngModel)]="reportDeptFilter" (change)="filterReportRows()" style="width:100%;">
                  <option value="">All Departments</option>
                  <option *ngFor="let d of departments" [value]="d.name">{{ d.name }}</option>
                </select>
              </div>

              <!-- Status Filter (if column exists) -->
              <div class="form-group" style="margin:0;" *ngIf="hasReportColumn('status') || hasReportColumn('verificationStatus')">
                <label style="font-size:11px; font-weight:700; margin-bottom:4px; display:block;">Status</label>
                <select class="form-control" [(ngModel)]="reportStatusFilter" (change)="filterReportRows()" style="width:100%;">
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="OPEN">Open</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="OVERDUE">Overdue</option>
                </select>
              </div>

              <!-- Manager Filter (if column exists) -->
              <div class="form-group" style="margin:0;" *ngIf="hasReportColumn('manager')">
                <label style="font-size:11px; font-weight:700; margin-bottom:4px; display:block;">Manager</label>
                <select class="form-control" [(ngModel)]="reportManagerFilter" (change)="filterReportRows()" style="width:100%;">
                  <option value="">All Managers</option>
                  <option *ngFor="let emp of getUniqueManagers()" [value]="emp">{{ emp }}</option>
                </select>
              </div>

              <!-- Page Size Selector -->
              <div class="form-group" style="margin:0;">
                <label style="font-size:11px; font-weight:700; margin-bottom:4px; display:block;">Page Entries</label>
                <select class="form-control" [(ngModel)]="reportPageSize" (change)="resetReportPagination()" style="width:100%;">
                  <option [value]="5">5 Entries</option>
                  <option [value]="10">10 Entries</option>
                  <option [value]="20">20 Entries</option>
                  <option [value]="50">50 Entries</option>
                  <option [value]="100">100 Entries</option>
                </select>
              </div>
            </div>

            <!-- Export Actions Toolbar -->
            <div style="display:flex; justify-content:flex-end; gap:8px;">
              <button class="btn btn-outline" style="padding: 6px 12px; font-size:12px;" (click)="downloadReport('csv')" [disabled]="!filteredReportRows.length">
                <span class="material-icons" style="font-size:14px; margin-right:4px;">download</span> CSV
              </button>
              <button class="btn btn-outline" style="padding: 6px 12px; font-size:12px;" (click)="downloadReport('excel')" [disabled]="!filteredReportRows.length">
                <span class="material-icons" style="font-size:14px; margin-right:4px;">grid_on</span> Excel
              </button>
              <button class="btn btn-outline" style="padding: 6px 12px; font-size:12px;" (click)="downloadReport('pdf')" [disabled]="!filteredReportRows.length">
                <span class="material-icons" style="font-size:14px; margin-right:4px;">picture_as_pdf</span> PDF
              </button>
              <button class="btn btn-outline" style="padding: 6px 12px; font-size:12px;" (click)="downloadReport('print')" [disabled]="!filteredReportRows.length">
                <span class="material-icons" style="font-size:14px; margin-right:4px;">print</span> Print
              </button>
            </div>
          </div>

          <!-- Loading Indicator -->
          <div *ngIf="reportLoading" style="text-align:center; padding:64px 32px; color:var(--text-muted);">
            <span class="material-icons" style="animation:spin 1s linear infinite; font-size:32px; color:var(--primary); margin-bottom:8px;">refresh</span>
            <p>Gathering and sorting database metrics...</p>
          </div>

          <!-- Tabular Data -->
          <div class="table-responsive" *ngIf="!reportLoading && filteredReportRows.length > 0">
            <table class="table">
              <thead>
                <tr>
                  <th *ngFor="let col of reportColumns; let i = index" (click)="toggleReportSort(reportColumnKeys[i])" style="cursor:pointer; user-select:none;">
                    {{ col }}
                    <span class="material-icons sort-icon" style="font-size: 14px; vertical-align: middle; margin-left: 2px;">
                      {{ reportSortField === reportColumnKeys[i] ? (reportSortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'swap_vert' }}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of paginatedReportRows">
                  <td *ngFor="let col of reportColumnKeys">
                    <!-- Special treatment for Skill Gap Analysis Report -->
                    <ng-container *ngIf="activeReport === 'skillgaps'; else standardRowCell">
                      <!-- Required Level -->
                      <div *ngIf="col === 'requiredLevel'" style="display:flex; gap:2px;">
                        <span *ngFor="let star of [1,2,3,4,5]" class="material-icons" style="font-size:14px;" [style.color]="row[col] >= star ? 'var(--primary)' : 'var(--border)'">star</span>
                      </div>
                      <!-- Current Level -->
                      <div *ngIf="col === 'currentLevel'" style="display:flex; gap:2px;">
                        <span *ngFor="let star of [1,2,3,4,5]" class="material-icons" style="font-size:14px;" [style.color]="row[col] >= star ? 'var(--secondary)' : 'var(--border)'">star</span>
                      </div>
                      <!-- Gap Level with Badge -->
                      <span *ngIf="col === 'gap'" class="badge" [ngClass]="row[col] > 0 ? 'badge-error' : 'badge-success'" style="font-weight:700;">
                        {{ row[col] > 0 ? '+' + row[col] : row[col] }}
                      </span>
                      <!-- Priority Badge -->
                      <span *ngIf="col === 'priority'" class="badge" [ngClass]="{
                        'badge-error': row[col] === 'CRITICAL' || row[col] === 'HIGH',
                        'badge-warning': row[col] === 'MEDIUM',
                        'badge-info': row[col] === 'LOW'
                      }">{{ row[col] }}</span>
                      <!-- Other fields -->
                      <span *ngIf="col !== 'requiredLevel' && col !== 'currentLevel' && col !== 'gap' && col !== 'priority'">
                        {{ row[col] !== null && row[col] !== undefined ? row[col] : '—' }}
                      </span>
                    </ng-container>
                    
                    <!-- Standard Table Cells -->
                    <ng-template #standardRowCell>
                      <span *ngIf="isDateValue(row[col])">{{ row[col] | date:'mediumDate' }}</span>
                      <span *ngIf="!isDateValue(row[col])">{{ row[col] !== null && row[col] !== undefined ? row[col] : '—' }}</span>
                    </ng-template>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Pagination Footer -->
            <div class="pagination-footer" style="display:flex; justify-content:space-between; align-items:center; margin-top:20px; padding-top:10px; border-top:1px solid var(--border);">
              <span>Showing {{ (reportCurrentPage - 1) * reportPageSize + 1 }} to {{ Math.min(reportCurrentPage * reportPageSize, filteredReportRows.length) }} of {{ filteredReportRows.length }} records</span>
              <div class="pag-buttons" style="display:flex; gap:8px;">
                <button class="btn btn-outline btn-sm" [disabled]="reportCurrentPage === 1" (click)="setReportPage(reportCurrentPage - 1)">Previous</button>
                <button class="btn btn-outline btn-sm" [disabled]="reportCurrentPage === totalReportPages" (click)="setReportPage(reportCurrentPage + 1)">Next</button>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div *ngIf="!reportLoading && filteredReportRows.length === 0" style="text-align:center; padding:64px 32px; color:var(--text-muted);">
            <span class="material-icons" style="font-size:48px; color:var(--text-secondary); margin-bottom:12px;">search_off</span>
            <p>No matching report rows found. Adjust your search or filters.</p>
          </div>
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

      <!-- ======================================================= -->
      <!-- EMPLOYEES & TEAMS TAB -->
      <!-- ======================================================= -->
      <div *ngIf="activeTab === 'employees'" class="tab-content">
        <div class="dashboard-card" style="margin-bottom:20px;">
          <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
            <h4 style="margin:0;">Employees Directory ({{ filteredEmployees.length }})</h4>
            <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
              <input class="form-control" style="width:200px;" [(ngModel)]="employeeSearchText" (input)="filterEmployeesList()" placeholder="Search staff..." />
              <select class="form-control" [(ngModel)]="selectedDeptFilter" (change)="filterEmployeesList()" style="width:150px;">
                <option value="">All Departments</option>
                <option *ngFor="let d of departments" [value]="d.id">{{ d.name }}</option>
              </select>
              <button class="btn btn-primary" (click)="openModal('employee')">
                <span class="material-icons" style="font-size:16px;">person_add</span> Add Employee
              </button>
              <button class="btn btn-outline" (click)="exportCSV()">
                <span class="material-icons" style="font-size:16px;">download</span> Export CSV
              </button>
              <div style="position:relative;">
                <button class="btn btn-outline" (click)="fileInput.click()">
                  <span class="material-icons" style="font-size:16px;">upload</span> Import CSV
                </button>
                <input #fileInput type="file" (change)="onCSVFileSelected($event)" accept=".csv" style="display:none;" />
              </div>
            </div>
          </div>

          <!-- Department Toggle Chips -->
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:20px;">
            <button class="btn" [class.btn-primary]="selectedDeptFilter === ''" [class.btn-outline]="selectedDeptFilter !== ''" (click)="selectDeptFilter('')" style="padding:4px 12px; font-size:12px; border-radius:50px;">All</button>
            <button *ngFor="let d of departments" class="btn" [class.btn-primary]="selectedDeptFilter === d.id" [class.btn-outline]="selectedDeptFilter !== d.id" (click)="selectDeptFilter(d.id)" style="padding:4px 12px; font-size:12px; border-radius:50px;">{{ d.code }}</button>
          </div>

          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Exp (Yrs)</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let emp of filteredEmployees">
                  <td><span style="font-family:monospace; background:var(--surface-hover); padding:2px 6px; border-radius:4px; font-size:11px;">{{ emp.employeeCode }}</span></td>
                  <td><strong>{{ emp.firstName }} {{ emp.lastName }}</strong></td>
                  <td>{{ emp.email }}</td>
                  <td>{{ emp.department?.name || '—' }}</td>
                  <td>{{ emp.designation?.name || '—' }}</td>
                  <td>{{ emp.yearsOfExperience }}</td>
                  <td>
                    <span style="font-size:11px; padding:3px 8px; border-radius:50px; font-weight:700;" [style.background]="emp.accountStatus === 'ACTIVE' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)'" [style.color]="emp.accountStatus === 'ACTIVE' ? 'var(--success)' : 'var(--error)'">{{ emp.accountStatus }}</span>
                  </td>
                  <td>
                    <button class="btn btn-outline" style="padding:4px 8px; font-size:12px;" (click)="toggleEmployee(emp)">
                      {{ emp.accountStatus === 'ACTIVE' ? 'Deactivate' : 'Activate' }}
                    </button>
                    <button class="btn btn-primary" style="padding:4px 8px; font-size:12px; margin-left:4px;" (click)="viewEmployeeResume(emp)">
                      View Resume
                    </button>
                  </td>
                </tr>
                <tr *ngIf="filteredEmployees.length === 0">
                  <td colspan="8" style="text-align:center; color:var(--text-muted); padding:32px;">No employees found.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ======================================================= -->
      <!-- SKILL CATALOG TAB -->
      <!-- ======================================================= -->
      <div *ngIf="activeTab === 'skills'" class="tab-content">
        <div class="responsive-grid-2col">
          <!-- Catalog List -->
          <div class="dashboard-card">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
              <h4 style="margin:0;">Skill Catalog ({{ filteredSkills.length }})</h4>
              <div style="display:flex; gap:10px;">
                <input class="form-control" style="width:180px;" [(ngModel)]="skillSearchText" (input)="filterSkillsList()" placeholder="Search skills..." />
                <select class="form-control" [(ngModel)]="selectedSkillCatFilter" (change)="filterSkillsList()" style="width:140px;">
                  <option value="">All Categories</option>
                  <option *ngFor="let c of categories" [value]="c.id">{{ c.name }}</option>
                </select>
                <button class="btn btn-primary" (click)="openModal('skill')">
                  <span class="material-icons" style="font-size:16px;">add</span> Add Skill
                </button>
              </div>
            </div>
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Required Level</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let sk of filteredSkills">
                    <td><span style="font-family:monospace; background:var(--surface-hover); padding:2px 6px; border-radius:4px; font-size:11px;">{{ sk.skillCode }}</span></td>
                    <td><strong>{{ sk.skillName }}</strong></td>
                    <td>{{ sk.category?.name || '—' }}</td>
                    <td><span class="badge badge-info">{{ sk.skillType }}</span></td>
                    <td>Lvl {{ sk.defaultRequiredLevel }}</td>
                  </tr>
                  <tr *ngIf="filteredSkills.length === 0">
                    <td colspan="5" style="text-align:center; color:var(--text-muted); padding:32px;">No skills found.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Suggestion Requests -->
          <div class="dashboard-card">
            <h4>Suggested Skill Requests ({{ skillSuggestions.length }})</h4>
            <p style="font-size:12px; color:var(--text-muted); margin-bottom:16px;">Requests submitted by employees for new skill entries.</p>
            <div style="display:flex; flex-direction:column; gap:12px; max-height: 500px; overflow-y: auto; padding-right:4px;">
              <div *ngFor="let sug of skillSuggestions" style="border:1px solid var(--border); border-radius:8px; padding:12px; background:var(--surface-hover);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
                  <strong style="font-size:13px; color:var(--text-primary);">{{ sug.subject.replace('Suggested Skill Request:', '') }}</strong>
                  <span class="badge" [class.badge-info]="sug.status === 'OPEN'" [class.badge-success]="sug.status === 'RESOLVED'">{{ sug.status }}</span>
                </div>
                <p style="font-size:11px; color:var(--text-muted); margin:4px 0;">Reason: {{ sug.description?.split('|')[3] || sug.description }}</p>
                <p style="font-size:11px; color:var(--text-muted); margin:2px 0;">By: {{ sug.employee?.firstName }} {{ sug.employee?.lastName }} ({{ sug.employee?.employeeCode }})</p>
                <div style="display:flex; gap:8px; margin-top:12px;" *ngIf="sug.status === 'OPEN'">
                  <button class="btn btn-primary" style="padding:4px 10px; font-size:11px;" (click)="approveSkillSuggestion(sug)">Approve</button>
                  <button class="btn btn-outline" style="padding:4px 10px; font-size:11px;" (click)="rejectSkillSuggestion(sug)">Reject</button>
                </div>
              </div>
              <div *ngIf="skillSuggestions.length === 0" style="text-align:center; color:var(--text-muted); padding:32px 0; font-size:13px;">No suggestions requests pending.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ======================================================= -->
      <!-- TRAINING & CERTIFICATES TAB -->
      <!-- ======================================================= -->
      <div *ngIf="activeTab === 'training'" class="tab-content">
        <div class="responsive-grid-2col">
          <!-- Allocations -->
          <div class="dashboard-card">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
              <h4 style="margin:0;">Active Training Plans ({{ filteredTrainingPlans.length }})</h4>
              <div style="display:flex; gap:10px;">
                <input class="form-control" style="width:200px;" [(ngModel)]="trainingSearchText" (input)="filterTrainingList()" placeholder="Search programs..." />
                <button class="btn btn-primary" (click)="openModal('training')">
                  <span class="material-icons" style="font-size:16px;">assignment_ind</span> Assign Training
                </button>
              </div>
            </div>
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Title</th>
                    <th>Employee</th>
                    <th>Progress</th>
                    <th>Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let tp of filteredTrainingPlans">
                    <td><span style="font-family:monospace; background:var(--surface-hover); padding:2px 6px; border-radius:4px; font-size:11px;">{{ tp.trainingCode }}</span></td>
                    <td><strong>{{ tp.trainingTitle }}</strong></td>
                    <td>{{ tp.employee?.firstName }} {{ tp.employee?.lastName }}</td>
                    <td>
                      <div class="progress-bar-bg" style="width:70px; margin-bottom:4px;">
                        <div class="progress-bar-fill" [style.width.%]="tp.progress"></div>
                      </div>
                      <span style="font-size:10px; color:var(--text-secondary);">{{ tp.progress }}%</span>
                    </td>
                    <td>{{ tp.dueDate | date:'shortDate' }}</td>
                    <td>
                      <span style="font-size:10px; padding:3px 8px; border-radius:50px; font-weight:700;" [style.background]="tp.status === 'VERIFIED' ? 'rgba(34,197,94,0.12)' : tp.status === 'OVERDUE' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)'" [style.color]="tp.status === 'VERIFIED' ? 'var(--success)' : tp.status === 'OVERDUE' ? 'var(--error)' : 'var(--warning)'">{{ tp.status }}</span>
                    </td>
                  </tr>
                  <tr *ngIf="filteredTrainingPlans.length === 0">
                    <td colspan="6" style="text-align:center; color:var(--text-muted); padding:32px;">No training plans assigned.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Certificates -->
          <div class="dashboard-card">
            <h4>Certifications Verification ({{ certificatesList.length }})</h4>
            <p style="font-size:12px; color:var(--text-muted); margin-bottom:16px;">Approve or reject credentials uploaded by employee staff.</p>
            <div style="display:flex; flex-direction:column; gap:12px; max-height:550px; overflow-y:auto; padding-right:4px;">
              <div *ngFor="let cert of certificatesList" style="border:1px solid var(--border); border-radius:8px; padding:12px; background:var(--surface-hover);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
                  <strong style="font-size:13px; color:var(--text-primary);">{{ cert.certificateName }}</strong>
                  <span class="badge" [class.badge-success]="cert.verificationStatus === 'VERIFIED'" [class.badge-info]="cert.verificationStatus === 'PENDING'" [class.badge-error]="cert.verificationStatus === 'REJECTED'">{{ cert.verificationStatus }}</span>
                </div>
                <p style="font-size:11px; color:var(--text-secondary); margin:2px 0;">Org: {{ cert.issuingOrganization }}</p>
                <p style="font-size:11px; color:var(--text-secondary); margin:2px 0;">By: {{ cert.employee?.firstName }} {{ cert.employee?.lastName }} ({{ cert.employee?.employeeCode }})</p>
                <p style="font-size:11px; margin:4px 0;"><a [href]="'http://localhost:5000/' + cert.filePath" target="_blank" style="display:flex; align-items:center; gap:4px; color:var(--primary); font-weight:600;"><span class="material-icons" style="font-size:14px;">cloud_download</span> Download Attachment</a></p>
                <div style="display:flex; gap:8px; margin-top:12px;" *ngIf="cert.verificationStatus === 'PENDING'">
                  <button class="btn btn-primary" style="padding:4px 10px; font-size:11px;" (click)="verifyCertificate(cert, 'VERIFIED')">Verify & Approve</button>
                  <button class="btn btn-outline" style="padding:4px 10px; font-size:11px;" (click)="verifyCertificate(cert, 'REJECTED')">Reject</button>
                </div>
              </div>
              <div *ngIf="certificatesList.length === 0" style="text-align:center; color:var(--text-muted); padding:32px 0; font-size:13px;">No certifications uploaded.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ======================================================= -->
      <!-- SUPPORT TICKETS TAB -->
      <!-- ======================================================= -->
      <div *ngIf="activeTab === 'tickets'" class="tab-content">
        <div class="responsive-grid-2col">
          <!-- Tickets List -->
          <div class="dashboard-card">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
              <h4 style="margin:0;">Support Helpdesk ({{ filteredTicketsList.length }})</h4>
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <input class="form-control" style="width:160px;" [(ngModel)]="ticketSearchText" (input)="filterTicketsList()" placeholder="Search tix..." />
                <select class="form-control" [(ngModel)]="ticketStatusFilter" (change)="filterTicketsList()" style="width:120px;">
                  <option value="">All Statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="WAITING_USER">Waiting User</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
            </div>
            <div style="display:flex; flex-direction:column; gap:10px; max-height:600px; overflow-y:auto; padding-right:4px;">
              <div *ngFor="let t of filteredTicketsList" class="ticket-item-card" [class.active]="selectedTicket?.id === t.id" (click)="selectTicket(t)" style="border:1px solid var(--border); border-radius:10px; padding:15px; cursor:pointer; background:var(--surface-card); transition:var(--transition);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
                  <span style="font-family:monospace; font-size:11px; background:var(--surface-hover); padding:2px 6px; border-radius:4px; font-weight:700;">{{ t.ticketNumber }}</span>
                  <span class="badge" [class.badge-error]="t.priority === 'CRITICAL' || t.priority === 'HIGH'" [class.badge-info]="t.priority === 'MEDIUM'" [class.badge-primary]="t.priority === 'LOW'">{{ t.priority }}</span>
                </div>
                <strong style="font-size:13px; display:block; margin:6px 0; color:var(--text-primary);">{{ t.subject }}</strong>
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; color:var(--text-muted); margin-top:8px;">
                  <span>Category: {{ t.category }}</span>
                  <span class="badge" [class.badge-success]="t.status === 'RESOLVED' || t.status === 'CLOSED'" [class.badge-info]="t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS'" [class.badge-warning]="t.status === 'OPEN'">{{ t.status }}</span>
                </div>
              </div>
              <div *ngIf="filteredTicketsList.length === 0" style="text-align:center; color:var(--text-muted); padding:32px;">No support tickets found.</div>
            </div>
          </div>

          <!-- Ticket Conversation Detail -->
          <div class="dashboard-card" style="display:flex; flex-direction:column;">
            <div *ngIf="!selectedTicket" style="text-align:center; color:var(--text-muted); padding:64px 20px; flex:1;">
              <span class="material-icons" style="font-size:48px; color:var(--text-secondary); margin-bottom:12px;">chat_bubble_outline</span>
              <p style="margin:0;">Select a ticket from the left panel to open details, timeline, and view or add replies.</p>
            </div>

            <div *ngIf="selectedTicket" style="display:flex; flex-direction:column; flex:1;">
              <!-- Ticket Header Info -->
              <div style="border-bottom:1px solid var(--border); padding-bottom:16px; margin-bottom:20px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
                  <div>
                    <h4 style="margin:0; font-size:16px;">{{ selectedTicket.subject }}</h4>
                    <p style="font-size:12px; color:var(--text-muted); margin:4px 0;">Number: {{ selectedTicket.ticketNumber }} | Category: {{ selectedTicket.category }} | Priority: {{ selectedTicket.priority }}</p>
                    <p style="font-size:12px; color:var(--text-muted); margin:2px 0;">
                      Raised By: 
                      <span *ngIf="selectedTicket.employee">Employee - {{ selectedTicket.employee.firstName }} {{ selectedTicket.employee.lastName }} ({{ selectedTicket.employee.employeeCode }})</span>
                      <span *ngIf="selectedTicket.manager">Manager - {{ selectedTicket.manager.firstName }} {{ selectedTicket.manager.lastName }} ({{ selectedTicket.manager.employeeCode }})</span>
                    </p>
                  </div>
                  <div style="text-align:right;">
                    <span class="badge" [class.badge-success]="selectedTicket.status === 'CLOSED'" [class.badge-info]="selectedTicket.status === 'RESOLVED' || selectedTicket.status === 'IN_PROGRESS'" [class.badge-warning]="selectedTicket.status === 'OPEN'">Status: {{ selectedTicket.status }}</span>
                    <p style="font-size:10px; color:var(--text-muted); margin:6px 0 0 0;" *ngIf="selectedTicket.slaStatus === 'BREACHED'" class="text-error">SLA BREACHED</p>
                    <p style="font-size:10px; color:var(--text-muted); margin:4px 0 0 0;" *ngIf="selectedTicket.assignedAdminId">Assigned: Admin ID {{ selectedTicket.assignedAdminId.substring(0,8) }}</p>
                    <button *ngIf="!selectedTicket.assignedAdminId" class="btn btn-outline" style="padding:4px 10px; font-size:11px; margin-top:8px;" (click)="assignTicketToMe(selectedTicket)">Assign to Me</button>
                  </div>
                </div>
                <div style="background:var(--surface-hover); border-radius:8px; padding:12px; margin-top:12px; font-size:12.5px; color:var(--text-primary); border-left:4px solid var(--primary);">
                  <strong>Description:</strong> {{ selectedTicket.description }}
                </div>
              </div>

              <!-- Timeline Thread -->
              <div style="flex:1; max-height:300px; overflow-y:auto; display:flex; flex-direction:column; gap:12px; padding-right:4px; margin-bottom:20px; border-bottom:1px solid var(--border); padding-bottom:20px;">
                <div *ngFor="let comment of selectedTicket.comments" style="border-radius:10px; padding:12px; max-width:80%;" [style.align-self]="comment.senderRole === 'ADMIN' ? 'flex-end' : 'flex-start'" [style.background]="comment.isInternalNote ? 'rgba(245,158,11,0.08)' : comment.senderRole === 'ADMIN' ? 'rgba(94,114,228,0.08)' : 'var(--surface-hover)'" [style.border]="comment.isInternalNote ? '1px dashed var(--warning)' : '1px solid var(--border)'">
                  <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--text-muted); margin-bottom:4px; gap:8px;">
                    <span style="font-weight:700;">{{ comment.senderRole }} <span *ngIf="comment.isInternalNote" style="color:var(--warning); font-weight:700;">(INTERNAL NOTE)</span></span>
                    <span>{{ comment.createdAt | date:'short' }}</span>
                  </div>
                  <p style="font-size:12px; margin:0; line-height:1.4; white-space:pre-line;">{{ comment.message }}</p>
                  <div *ngFor="let att of comment.attachments" style="margin-top:6px; font-size:11px;">
                    <a [href]="'http://localhost:5000/' + att.filePath" target="_blank" style="color:var(--primary); font-weight:600;"><span class="material-icons" style="font-size:12px;">attachment</span> {{ att.originalFileName }} ({{ (att.fileSize/1024) | number:'1.0-0' }} KB)</a>
                  </div>
                </div>
              </div>

              <!-- Actions Panel: Reply, Internal Note, Resolve -->
              <div style="display:flex; flex-direction:column; gap:12px;" *ngIf="selectedTicket.status !== 'CLOSED'">
                <!-- Resolve Form -->
                <div style="display:flex; gap:10px; margin-bottom:10px; align-items:flex-end; border-top:1px solid var(--border); padding-top:15px;" *ngIf="selectedTicket.status !== 'RESOLVED'">
                  <div style="flex:1;">
                    <label style="font-size:11px; font-weight:700; margin-bottom:4px; display:block;">Resolve Ticket</label>
                    <textarea class="form-control" style="height:38px; resize:none;" [(ngModel)]="resolutionText" placeholder="Enter resolution details..."></textarea>
                  </div>
                  <button class="btn btn-primary" (click)="submitTicketResolution()" [disabled]="!resolutionText" style="height:38px; padding:0 16px;">Resolve</button>
                </div>

                <!-- Reply Form -->
                <div class="form-group">
                  <label style="font-size:11px; font-weight:700; margin-bottom:4px; display:block;">Post Comment / Update Thread</label>
                  <textarea class="form-control" style="height:60px;" [(ngModel)]="newReplyMessage" placeholder="Type message..."></textarea>
                </div>
                
                <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
                  <div style="display:flex; gap:12px; align-items:center;">
                    <label style="display:flex; align-items:center; gap:6px; font-size:12px; cursor:pointer;">
                      <input type="checkbox" [(ngModel)]="replyIsInternal" /> Internal Note (Hidden from sender)
                    </label>
                    <input type="file" (change)="onReplyFileSelected($event)" style="display:none;" #replyFileInput />
                    <button class="btn btn-outline" style="padding:4px 10px; font-size:11px;" (click)="replyFileInput.click()">
                      <span class="material-icons" style="font-size:14px; margin-right:4px;">attach_file</span>
                      {{ replyFile ? replyFile.name.substring(0,12) + '...' : 'Add Attachment' }}
                    </button>
                  </div>
                  <button class="btn btn-secondary" [disabled]="!newReplyMessage && !replyFile" (click)="postReply()">Submit Message</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ======================================================= -->
      <!-- AUDIT & ERROR LOGS TAB -->
      <!-- ======================================================= -->
      <div *ngIf="activeTab === 'logs'" class="tab-content">
        <div class="dashboard-card" style="margin-bottom:20px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
            <h4 style="margin:0;">System Logs Monitor</h4>
            <input class="form-control" style="width:250px;" [(ngModel)]="logsSearchText" (input)="filterLogsList()" placeholder="Filter logs..." />
          </div>
          <div class="responsive-grid-2col">
            <!-- Audit Logs -->
            <div>
              <h5 style="margin-bottom:12px;">Security Audit Logs ({{ filteredAuditLogs.length }})</h5>
              <div class="table-responsive" style="max-height: 500px; overflow-y: auto;">
                <table class="table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Action</th>
                      <th>Component</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let a of filteredAuditLogs">
                      <td>{{ a.user?.email || 'SYSTEM' }}</td>
                      <td><span class="badge badge-info">{{ a.action }}</span></td>
                      <td>{{ a.component }}</td>
                      <td>{{ a.createdAt | date:'short' }}</td>
                    </tr>
                    <tr *ngIf="filteredAuditLogs.length === 0">
                      <td colspan="4" style="text-align:center; color:var(--text-muted); padding:32px;">No audit records.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Error Logs -->
            <div>
              <h5 style="margin-bottom:12px;">Runtime Exception Logs ({{ filteredErrorLogs.length }})</h5>
              <div class="table-responsive" style="max-height: 500px; overflow-y: auto;">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Endpoint</th>
                      <th>Method</th>
                      <th>Message</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let err of filteredErrorLogs">
                      <td><span style="font-family:monospace; font-size:11px; background:var(--surface-hover); padding:2px 6px; border-radius:4px;">{{ err.endpoint }}</span></td>
                      <td><strong>{{ err.method }}</strong></td>
                      <td class="text-error" style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" [title]="err.errorMessage">{{ err.errorMessage }}</td>
                      <td>{{ err.createdAt | date:'short' }}</td>
                    </tr>
                    <tr *ngIf="filteredErrorLogs.length === 0">
                      <td colspan="4" style="text-align:center; color:var(--text-muted); padding:32px;">No error logs.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ======================================================= -->
      <!-- MY PROFILE TAB -->
      <!-- ======================================================= -->
      <div *ngIf="activeTab === 'profile'" class="tab-content">
        <div class="dashboard-card" style="max-width:600px; margin:0 auto; padding:32px; border-radius:12px;">
          <div style="text-align:center; margin-bottom:28px;">
            <div style="width:100px; height:100px; border-radius:50%; background:linear-gradient(135deg, var(--primary), var(--primary-dark)); display:flex; align-items:center; justify-content:center; font-size:42px; font-weight:800; color:#fff; margin:0 auto 16px; box-shadow:0 8px 16px rgba(0,0,0,0.1);">
              {{ currentUser?.firstName ? currentUser.firstName[0] : 'A' }}
            </div>
            <h3 style="margin:0 0 4px; font-size:24px;">{{ currentUser?.firstName }} {{ currentUser?.lastName }}</h3>
            <p style="margin:0; color:var(--primary); font-weight:600; font-size:14px; text-transform:uppercase; letter-spacing:1px;">{{ currentUser?.role }}</p>
          </div>

          <div style="display:flex; flex-direction:column; gap:20px; border-top:1px solid var(--border); padding-top:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:12px; border-bottom:1px solid rgba(0,0,0,0.02);">
              <span style="font-weight:600; color:var(--text-secondary);">Employee Code</span>
              <span style="font-family:monospace; background:var(--surface-hover); padding:2px 8px; border-radius:4px; font-weight:600;">{{ currentUser?.employeeId || 'N/A' }}</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:12px; border-bottom:1px solid rgba(0,0,0,0.02);">
              <span style="font-weight:600; color:var(--text-secondary);">Email Address</span>
              <span style="color:var(--text-muted);">{{ currentUser?.email }}</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:12px; border-bottom:1px solid rgba(0,0,0,0.02);">
              <span style="font-weight:600; color:var(--text-secondary);">Access Level</span>
              <span class="badge badge-success">{{ currentUser?.role }}</span>
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
                  <option value="ADMIN">System Administrator</option>
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

            <!-- Create Project Form -->
            <form *ngIf="activeModal === 'project'" [formGroup]="projectForm" (ngSubmit)="onSaveProject()">
              <div class="form-group">
                <label>Project Code</label>
                <input type="text" class="form-control" formControlName="projectCode" placeholder="PRJ-001" />
              </div>
              <div class="form-group">
                <label>Project Name</label>
                <input type="text" class="form-control" formControlName="name" />
              </div>
              <div class="form-group">
                <label>Client Name</label>
                <input type="text" class="form-control" formControlName="clientName" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Start Date</label>
                  <input type="date" class="form-control" formControlName="startDate" />
                </div>
                <div class="form-group">
                  <label>Status</label>
                  <select class="form-control" formControlName="status">
                    <option value="PLANNING">Planning</option>
                    <option value="ACTIVE">Active</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Priority</label>
                  <select class="form-control" formControlName="priority">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Technologies</label>
                  <input type="text" class="form-control" formControlName="technologies" placeholder="e.g. Angular, Node.js" />
                </div>
              </div>
              <div class="form-group">
                <label>Description</label>
                <textarea class="form-control" formControlName="description"></textarea>
              </div>
              <div *ngIf="actionError" class="error-banner">{{ actionError }}</div>
              <button type="submit" class="btn btn-primary w-full">Create Project</button>
            </form>

            <!-- Project Assignment Form -->
            <div *ngIf="activeModal === 'projectAssign'">
              <p style="margin-bottom:12px; color:var(--text-muted);">Assign employee to <strong>{{ selectedProjectForAssign?.name }}</strong></p>
              <div class="form-group">
                <label>Select Employee</label>
                <select class="form-control" [(ngModel)]="assignEmployeeId">
                  <option value="" disabled>-- Choose Employee --</option>
                  <option *ngFor="let emp of employeesList" [value]="emp.id">
                    {{ emp.employeeCode }} - {{ emp.firstName }} {{ emp.lastName }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>Project Role</label>
                <select class="form-control" [(ngModel)]="assignRole">
                  <option value="Developer">Developer</option>
                  <option value="QA Engineer">QA Engineer</option>
                  <option value="Database Engineer">Database Engineer</option>
                  <option value="Business Analyst">Business Analyst</option>
                  <option value="Architect">Architect</option>
                  <option value="Project Manager">Project Manager</option>
                </select>
              </div>
              <div *ngIf="actionError" class="error-banner">{{ actionError }}</div>
              <button class="btn btn-primary w-full" (click)="confirmAssignEmployee()">Confirm Assignment</button>
            </div>

            <!-- Resume Preview modal -->
            <div *ngIf="activeModal === 'resumePreview'" class="resume-modal-body" style="max-height:80vh; overflow-y:auto; padding:10px;">
              <div *ngIf="resumePreviewData; else loadingResume" style="display:flex; flex-direction:column; gap:24px;">
                <!-- Template Selection & Action toolbar -->
                <div style="background:var(--surface-hover); border:1px solid var(--border); border-radius:10px; padding:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <label style="font-weight:600; font-size:13px; color:var(--text-secondary);">Template:</label>
                    <select class="form-control" [(ngModel)]="resumeSettings.resumeTemplate" style="width:140px; padding:4px 8px;">
                      <option value="minimalist">Minimalist</option>
                      <option value="modern">Modern</option>
                      <option value="classic">Classic</option>
                      <option value="executive">Executive</option>
                    </select>
                    <label style="display:flex; align-items:center; gap:4px; font-size:12px; cursor:pointer; margin-left:8px;">
                      <input type="checkbox" [(ngModel)]="resumeSettings.resumeHideContact" /> Hide contact
                    </label>
                    <label style="display:flex; align-items:center; gap:4px; font-size:12px; cursor:pointer;">
                      <input type="checkbox" [(ngModel)]="resumeSettings.resumeHideRatings" /> Hide ratings
                    </label>
                  </div>
                  <div style="display:flex; gap:8px;">
                    <button class="btn btn-primary btn-sm" (click)="downloadMemberResumePDF()">
                      <span class="material-icons" style="font-size:14px; margin-right:4px;">picture_as_pdf</span> PDF
                    </button>
                    <button class="btn btn-outline-sm" (click)="printMemberResume()">
                      <span class="material-icons" style="font-size:14px; margin-right:4px;">print</span> Print
                    </button>
                  </div>
                </div>

                <!-- Printable Resume Area -->
                <div class="resume-preview-card" [ngClass]="resumeSettings.resumeTemplate" id="resumePreviewWindow" style="background:#fff; border:1px solid var(--border); padding:32px; border-radius:8px; color:#1e293b;">
                  <!-- Modern style (2 column) -->
                  <div *ngIf="resumeSettings.resumeTemplate === 'modern'" style="display: grid; grid-template-columns: 240px 1fr; gap: 24px; margin: -32px; border-radius: 8px; overflow: hidden; min-height: 800px; text-align: left;">
                    <div style="background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); color: #ffffff; padding: 32px 20px; display: flex; flex-direction: column; gap: 20px;">
                      <div style="text-align: center;">
                        <div *ngIf="resumePreviewData.employee.profileImage" style="margin-bottom:12px;">
                          <img [src]="resumePreviewData.employee.profileImage" style="width:80px; height:80px; border-radius:50%; object-fit:cover; border:3px solid var(--primary);" alt="Profile" />
                        </div>
                        <h3 style="color:#fff; margin:0 0 4px; font-size:18px;">{{ resumePreviewData.employee.firstName }} {{ resumePreviewData.employee.lastName }}</h3>
                        <p style="color:#a5b4fc; margin:0; font-size:12px; font-weight:600;">{{ resumePreviewData.employee.designation }}</p>
                      </div>

                      <div *ngIf="!resumeSettings.resumeHideContact" style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px;">
                        <h5 style="color:#818cf8; text-transform:uppercase; font-size:10px; letter-spacing:1px; margin:0 0 8px;">Contact</h5>
                        <div style="font-size:11px; color:#cbd5e1; display:flex; flex-direction:column; gap:6px;">
                          <div>{{ resumePreviewData.employee.email }}</div>
                          <div *ngIf="resumePreviewData.employee.phone">{{ resumePreviewData.employee.phone }}</div>
                          <div>{{ resumePreviewData.employee.workLocation }}</div>
                        </div>
                      </div>
                    </div>

                    <div style="padding: 32px 24px; display:flex; flex-direction:column; gap:20px;">
                      <!-- Professional Summary -->
                      <div *ngIf="resumePreviewData.employee.autoSummary">
                        <h4 style="margin:0 0 8px; color:var(--primary); text-transform:uppercase; font-size:11px; border-bottom:2px solid var(--primary); padding-bottom:4px;">Professional Summary</h4>
                        <p style="font-size:12px; color:#475569; line-height:1.6; font-style:italic;">{{ resumePreviewData.employee.autoSummary }}</p>
                      </div>
                      
                      <!-- Education -->
                      <div *ngIf="resumePreviewData.employee.education">
                        <h4 style="margin:0 0 8px; color:var(--primary); text-transform:uppercase; font-size:11px; border-bottom:2px solid var(--primary); padding-bottom:4px;">Education</h4>
                        <p style="font-size:12px; color:#475569;">{{ resumePreviewData.employee.education }}</p>
                      </div>

                      <!-- Skills -->
                      <div *ngIf="resumePreviewData.skills?.length">
                        <h4 style="margin:0 0 8px; color:var(--primary); text-transform:uppercase; font-size:11px; border-bottom:2px solid var(--primary); padding-bottom:4px;">Skills</h4>
                        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:6px;">
                          <div *ngFor="let s of resumePreviewData.skills" style="font-size:11px; font-weight:600; background:#f1f5f9; padding:4px 8px; border-radius:4px; display:flex; justify-content:space-between; align-items:center;">
                            <span>{{ s.name }}</span>
                            <span *ngIf="!resumeSettings.resumeHideRatings" style="color:var(--primary);">★{{ s.finalRating || s.selfRating }}</span>
                          </div>
                        </div>
                      </div>

                      <!-- Projects -->
                      <div *ngIf="resumePreviewData.projects?.length">
                        <h4 style="margin:0 0 8px; color:var(--primary); text-transform:uppercase; font-size:11px; border-bottom:2px solid var(--primary); padding-bottom:4px;">Projects</h4>
                        <div *ngFor="let p of resumePreviewData.projects" style="font-size:12px; margin-bottom:8px;">
                          <strong>{{ p.name }}</strong> ({{ p.role }})
                          <p style="font-size:11px; color:#64748b; margin:2px 0 0;">{{ p.responsibilities }}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Standard Styles (Minimalist, Classic, Executive) -->
                  <div *ngIf="resumeSettings.resumeTemplate !== 'modern'" style="text-align: left;">
                    <div style="display:flex; justify-content:space-between; border-bottom:2px solid var(--primary); padding-bottom:16px; margin-bottom:16px;">
                      <div>
                        <h2 style="margin:0; font-size:22px; color:#0f172a;">{{ resumePreviewData.employee.firstName }} {{ resumePreviewData.employee.lastName }}</h2>
                        <p style="margin:4px 0 0; color:var(--primary); font-weight:600;">{{ resumePreviewData.employee.designation }} · {{ resumePreviewData.employee.department }}</p>
                      </div>
                      <div *ngIf="!resumeSettings.resumeHideContact" style="text-align:right; font-size:11px; color:#475569;">
                        <div>{{ resumePreviewData.employee.email }}</div>
                        <div>{{ resumePreviewData.employee.phone }}</div>
                        <div>{{ resumePreviewData.employee.workLocation }}</div>
                      </div>
                    </div>

                    <!-- Auto-Summary -->
                    <div *ngIf="resumePreviewData.employee.autoSummary" style="margin-bottom:16px;">
                      <h4 style="margin:0 0 4px; color:var(--primary); text-transform:uppercase; font-size:11px; letter-spacing:1px;">Professional Summary</h4>
                      <p style="font-size:12px; color:#334155; line-height:1.6; font-style:italic;">{{ resumePreviewData.employee.autoSummary }}</p>
                    </div>

                    <!-- Skills -->
                    <div *ngIf="resumePreviewData.skills?.length" style="margin-bottom:16px;">
                      <h4 style="margin:0 0 6px; color:var(--primary); text-transform:uppercase; font-size:11px; letter-spacing:1px; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">Skills</h4>
                      <div style="display:flex; flex-wrap:wrap; gap:6px;">
                        <span *ngFor="let s of resumePreviewData.skills" style="font-size:11px; padding:4px 10px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:4px;">
                          {{ s.name }} <span *ngIf="!resumeSettings.resumeHideRatings" style="color:var(--primary);">★{{ s.finalRating || s.selfRating }}</span>
                        </span>
                      </div>
                    </div>

                    <!-- Projects -->
                    <div *ngIf="resumePreviewData.projects?.length" style="margin-bottom:16px;">
                      <h4 style="margin:0 0 6px; color:var(--primary); text-transform:uppercase; font-size:11px; letter-spacing:1px; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">Projects</h4>
                      <div *ngFor="let p of resumePreviewData.projects" style="margin-bottom:10px; font-size:12px;">
                        <div style="display:flex; justify-content:space-between; font-weight:600;">
                          <span>{{ p.name }} - {{ p.role }}</span>
                          <span style="color:#64748b;">{{ p.startDate | date:'MMM y' }} - {{ p.endDate ? (p.endDate | date:'MMM y') : 'Present' }}</span>
                        </div>
                        <p style="margin:2px 0 0; color:#475569; font-size:11px;">{{ p.responsibilities }}</p>
                      </div>
                    </div>

                    <!-- Education -->
                    <div *ngIf="resumePreviewData.employee.education" style="margin-bottom:16px;">
                      <h4 style="margin:0 0 6px; color:var(--primary); text-transform:uppercase; font-size:11px; letter-spacing:1px; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">Education</h4>
                      <p style="font-size:12px; color:#334155; margin:0;">{{ resumePreviewData.employee.education }}</p>
                    </div>

                    <!-- Trainings & Certificates -->
                    <div *ngIf="resumePreviewData.trainings?.length || resumePreviewData.certificates?.length" style="margin-bottom:16px;">
                      <h4 style="margin:0 0 6px; color:var(--primary); text-transform:uppercase; font-size:11px; letter-spacing:1px; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">Trainings & Certifications</h4>
                      <div *ngFor="let t of resumePreviewData.trainings" style="font-size:11px; margin-bottom:4px; display:flex; justify-content:space-between;">
                        <span><strong>{{ t.title }}</strong> - {{ t.provider }}</span>
                        <span style="color:#64748b;">{{ t.completionDate | date:'MMM y' }}</span>
                      </div>
                      <div *ngFor="let c of resumePreviewData.certificates" style="font-size:11px; margin-bottom:4px; display:flex; justify-content:space-between;">
                        <span><strong>{{ c.name }}</strong> - {{ c.issuer }}</span>
                        <span style="color:#64748b;">{{ c.issueDate | date:'MMM y' }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <ng-template #loadingResume>
                <p>Loading resume preview...</p>
              </ng-template>
            </div>

            <!-- Allocate / Re-allocate Manager Form -->
            <form *ngIf="activeModal === 'allocate'" [formGroup]="allocateForm" (ngSubmit)="onSaveAllocate()">
              <div class="form-group">
                <label>Select Employee</label>
                <select class="form-control" formControlName="employeeId">
                  <option value="" disabled>-- Choose Employee --</option>
                  <option *ngFor="let emp of employeesList" [value]="emp.id">
                    {{ emp.employeeCode }} - {{ emp.firstName }} {{ emp.lastName }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>Select Target Manager</label>
                <select class="form-control" formControlName="managerId">
                  <option value="" disabled>-- Choose Manager --</option>
                  <option *ngFor="let m of managerCapacities" [value]="m.manager?.id">
                    {{ m.manager?.firstName }} {{ m.manager?.lastName }} ({{ m.currentTeamSize }}/{{ m.maxCapacity }} allocated)
                  </option>
                </select>
              </div>
              <div *ngIf="actionError" class="error-banner">{{ actionError }}</div>
              <button type="submit" class="btn btn-primary w-full">Re-allocate Employee</button>
            </form>

            <!-- Audit Log Detail Modal -->
            <div *ngIf="activeModal === 'auditDetail'" style="font-size:13px; max-height:70vh; overflow-y:auto;">
              <div style="margin-bottom:12px;"><strong>User:</strong> {{ selectedAuditLog?.userName }} ({{ selectedAuditLog?.userRole }})</div>
              <div style="margin-bottom:12px;"><strong>Action:</strong> <span class="badge badge-info">{{ selectedAuditLog?.action }}</span></div>
              <div style="margin-bottom:12px;"><strong>Component:</strong> {{ selectedAuditLog?.component }}</div>
              <div style="margin-bottom:12px;"><strong>IP Address:</strong> {{ selectedAuditLog?.ipAddress }}</div>
              <div style="margin-bottom:12px;"><strong>Date:</strong> {{ selectedAuditLog?.createdAt | date:'medium' }}</div>
              <div style="margin-top:16px;" *ngIf="selectedAuditLog?.oldValue">
                <strong>Previous State (Old Value):</strong>
                <pre style="background:var(--bg-secondary); padding:10px; border-radius:6px; font-size:11px; overflow-x:auto; max-height:150px;">{{ selectedAuditLog.oldValue | json }}</pre>
              </div>
              <div style="margin-top:16px;" *ngIf="selectedAuditLog?.newValue">
                <strong>Updated State (New Value):</strong>
                <pre style="background:var(--bg-secondary); padding:10px; border-radius:6px; font-size:11px; overflow-x:auto; max-height:150px;">{{ selectedAuditLog.newValue | json }}</pre>
              </div>
            </div>

            <!-- Error Log Detail Modal -->
            <div *ngIf="activeModal === 'errorDetail'" style="font-size:13px; max-height:70vh; overflow-y:auto;">
              <div style="margin-bottom:12px;"><strong>User / Source:</strong> {{ selectedErrorLog?.user }}</div>
              <div style="margin-bottom:12px;"><strong>Error Type:</strong> <span class="badge badge-error">{{ selectedErrorLog?.errorType }}</span></div>
              <div style="margin-bottom:12px;"><strong>Endpoint & Method:</strong> <code>{{ selectedErrorLog?.method }} {{ selectedErrorLog?.endpoint }}</code></div>
              <div style="margin-bottom:12px;"><strong>HTTP Status Code:</strong> <span class="badge badge-warning">{{ selectedErrorLog?.statusCode }}</span></div>
              <div style="margin-bottom:12px;"><strong>Error Message:</strong> <div class="text-error" style="background:rgba(239,68,68,0.06); padding:8px 12px; border-radius:6px; margin-top:4px;">{{ selectedErrorLog?.message }}</div></div>
              <div style="margin-bottom:12px;"><strong>Timestamp:</strong> {{ selectedErrorLog?.createdAt | date:'medium' }}</div>
              <div style="margin-top:16px;" *ngIf="selectedErrorLog?.stackTrace">
                <strong>Stack Trace:</strong>
                <pre style="background:#1e293b; color:#f8fafc; padding:12px; border-radius:6px; font-size:11px; overflow-x:auto; max-height:200px;">{{ selectedErrorLog.stackTrace }}</pre>
              </div>
            </div>
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
  currentUser: any;
  private routeSub!: Subscription;
  private routeTabMap: Record<string, string> = {
    '/admin/dashboard': 'dashboard',
    '/admin/employees': 'employees',
    '/admin/skills':    'skills',
    '/admin/training':  'training',
    '/admin/tickets':   'tickets',
    '/admin/logs':      'logs',
    '/admin/profile':   'profile',
    '/admin/projects':  'projects',
    '/admin/reports':   'reports',
    '/admin/allocation':'allocation',
  };

  // Employees Directory
  employeeSearchText = '';
  selectedDeptFilter = '';
  filteredEmployees: any[] = [];

  // Skill catalog
  skillSearchText = '';
  selectedSkillCatFilter = '';
  filteredSkills: any[] = [];
  skillSuggestions: any[] = [];
  activeSuggestionTicket: any = null;

  // Training & certificates
  trainingSearchText = '';
  filteredTrainingPlans: any[] = [];
  trainingPlansList: any[] = [];
  certificatesList: any[] = [];

  // Support Tickets Helpdesk
  tickets: any[] = [];
  selectedTicket: any = null;
  newReplyMessage = '';
  selectedResumeMember: any;
  resumePreviewData: any;
  resumeSettings = { resumeTemplate: 'minimalist', resumeHideContact: false, resumeHideRatings: false };
  replyIsInternal = false;
  replyFile: File | null = null;
  resolutionText = '';
  ticketStatusFilter = '';
  ticketSearchText = '';
  filteredTicketsList: any[] = [];

  // System Logs
  allAuditLogs: any[] = [];
  allErrorLogs: any[] = [];
  logsSearchText = '';
  filteredAuditLogs: any[] = [];
  filteredErrorLogs: any[] = [];
  selectedAuditLog: any = null;
  selectedErrorLog: any = null;

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
  paginatedReportRows: any[] = [];
  reportColumns: string[] = [];
  reportColumnKeys: string[] = [];
  reportSearch = '';
  reportDeptFilter = '';
  reportStatusFilter = '';
  reportManagerFilter = '';
  reportLoading = false;
  reportPageSize = 10;
  reportCurrentPage = 1;
  totalReportPages = 1;
  reportSortField = '';
  reportSortOrder: 'asc' | 'desc' = 'asc';
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
    this.currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
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
    this.actionError = "";
    if (this.activeTab === 'dashboard') {
      this.loadStats();
      this.loadGrids();
    }
    if (this.activeTab === 'employees') {
      this.loadEmployees();
    }
    if (this.activeTab === 'skills') {
      this.loadSkills();
      this.loadSkillSuggestions();
    }
    if (this.activeTab === 'training') {
      this.loadTrainingPlans();
      this.loadCertificates();
    }
    if (this.activeTab === 'tickets') {
      this.loadTickets();
    }
    if (this.activeTab === 'logs') {
      this.loadAllLogs();
    }
    if (this.activeTab === 'projects') {
      this.loadProjects();
    }
    if (this.activeTab === 'reports') {
      this.loadReportData();
    }
    if (this.activeTab === 'allocation') {
      this.loadManagerCapacities();
    }
    this.cdr.detectChanges();
  }

  loadEmployees() {
    this.dataService.getEmployees({ limit: 100 }).subscribe((res) => {
      this.employeesList = res.data || [];
      this.filterEmployeesList();
    });
  }

  filterEmployeesList() {
    let list = [...this.employeesList];
    if (this.selectedDeptFilter) {
      list = list.filter(e => e.departmentId === this.selectedDeptFilter);
    }
    if (this.employeeSearchText) {
      const q = this.employeeSearchText.toLowerCase();
      list = list.filter(e =>
        e.firstName?.toLowerCase().includes(q) ||
        e.lastName?.toLowerCase().includes(q) ||
        e.employeeCode?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q)
      );
    }
    this.filteredEmployees = list;
  }

  selectDeptFilter(deptId: string) {
    this.selectedDeptFilter = deptId;
    this.filterEmployeesList();
  }

  toggleEmployee(emp: any) {
    const newStatus = emp.accountStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.dataService.toggleEmployeeStatus(emp.id, newStatus).subscribe({
      next: () => { this.loadEmployees(); },
      error: (err) => alert(err.error?.message || "Failed to update employee status")
    });
  }

  onCSVFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      this.dataService.importEmployeesCSV(formData).subscribe({
        next: (res) => {
          alert(`Import complete! Created: ${res.data.createdCount}, Failed: ${res.data.failedCount}`);
          this.loadEmployees();
        },
        error: (err) => alert(err.error?.message || "Failed to import CSV file.")
      });
    }
  }

  loadSkills() {
    this.dataService.getSkills({ limit: 200 }).subscribe((res) => {
      this.skillsList = res.data || [];
      this.filterSkillsList();
    });
  }

  filterSkillsList() {
    let list = [...this.skillsList];
    if (this.selectedSkillCatFilter) {
      list = list.filter(s => s.categoryId === this.selectedSkillCatFilter);
    }
    if (this.skillSearchText) {
      const q = this.skillSearchText.toLowerCase();
      list = list.filter(s => s.skillName?.toLowerCase().includes(q) || s.skillCode?.toLowerCase().includes(q));
    }
    this.filteredSkills = list;
  }

  loadSkillSuggestions() {
    this.dataService.getTickets({ category: 'SKILL' }).subscribe((res) => {
      const tix = res.data || [];
      this.skillSuggestions = tix.filter((t: any) => t.subject?.startsWith("Suggested Skill Request:"));
    });
  }

  approveSkillSuggestion(ticket: any) {
    const skillName = ticket.subject.replace("Suggested Skill Request:", "").trim();
    this.openModal('skill');
    this.skillForm.patchValue({
      skillName,
      skillCode: `SK-${Math.floor(100 + Math.random() * 900)}`,
      categoryId: ticket.description ? ticket.description.split("|")[1]?.trim() : "",
      skillType: ticket.description ? ticket.description.split("|")[2]?.trim() || "TECHNICAL" : "TECHNICAL"
    });
    this.activeSuggestionTicket = ticket;
  }

  rejectSkillSuggestion(ticket: any) {
    const reason = prompt("Enter rejection reason:");
    if (reason === null) return;
    if (!reason) { alert("Rejection reason is required."); return; }
    this.dataService.resolveTicket(ticket.id, { resolutionDetails: `Rejected. Reason: ${reason}` }).subscribe({
      next: () => {
        alert("Rejection recorded.");
        this.loadSkillSuggestions();
      },
      error: (err) => alert(err.error?.message || "Failed to reject suggestion.")
    });
  }

  loadTrainingPlans() {
    this.dataService.getTrainingPlans({ limit: 200 }).subscribe((res) => {
      this.trainingPlansList = res.data || [];
      this.filterTrainingList();
    });
  }

  filterTrainingList() {
    let list = [...this.trainingPlansList];
    if (this.trainingSearchText) {
      const q = this.trainingSearchText.toLowerCase();
      list = list.filter(tp =>
        tp.trainingTitle?.toLowerCase().includes(q) ||
        tp.trainingCode?.toLowerCase().includes(q) ||
        tp.employee?.firstName?.toLowerCase().includes(q) ||
        tp.employee?.lastName?.toLowerCase().includes(q)
      );
    }
    this.filteredTrainingPlans = list;
  }

  loadCertificates() {
    this.dataService.getCertificates({ limit: 100 }).subscribe((res) => {
      this.certificatesList = res.data || [];
    });
  }

  verifyCertificate(cert: any, decision: 'VERIFIED' | 'REJECTED') {
    let reason = '';
    if (decision === 'REJECTED') {
      reason = prompt("Enter rejection reason:") || '';
      if (reason === '') {
        alert("Rejection reason is required.");
        return;
      }
    }
    this.dataService.verifyCertificate(cert.id, { decision, rejectionReason: reason }).subscribe({
      next: () => {
        alert(`Certificate marked as ${decision.toLowerCase()}!`);
        this.loadCertificates();
      },
      error: (err) => alert(err.error?.message || "Failed to update certificate verification status.")
    });
  }

  loadTickets() {
    this.dataService.getTickets({ limit: 100 }).subscribe((res) => {
      this.tickets = res.data || [];
      this.filterTicketsList();
    });
  }

  filterTicketsList() {
    let list = [...this.tickets];
    if (this.ticketStatusFilter) {
      list = list.filter(t => t.status === this.ticketStatusFilter);
    }
    if (this.ticketSearchText) {
      const q = this.ticketSearchText.toLowerCase();
      list = list.filter(t =>
        t.ticketNumber?.toLowerCase().includes(q) ||
        t.subject?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q) ||
        t.employee?.firstName?.toLowerCase().includes(q) ||
        t.employee?.lastName?.toLowerCase().includes(q) ||
        t.manager?.firstName?.toLowerCase().includes(q) ||
        t.manager?.lastName?.toLowerCase().includes(q)
      );
    }
    this.filteredTicketsList = list;
  }

  selectTicket(ticket: any) {
    this.dataService.getTicketById(ticket.id).subscribe((res) => {
      this.selectedTicket = res.data;
      this.newReplyMessage = '';
      this.replyIsInternal = false;
      this.replyFile = null;
      this.resolutionText = '';
    });
  }

  onReplyFileSelected(event: any) {
    this.replyFile = event.target.files[0];
  }

  postReply() {
    if (!this.newReplyMessage && !this.replyFile) return;
    const formData = new FormData();
    formData.append("message", this.newReplyMessage);
    formData.append("isInternal", String(this.replyIsInternal));
    if (this.replyFile) {
      formData.append("file", this.replyFile);
    }
    this.dataService.addTicketMessage(this.selectedTicket.id, formData).subscribe({
      next: () => {
        this.selectTicket(this.selectedTicket);
      },
      error: (err) => alert(err.error?.message || "Failed to post reply.")
    });
  }

  submitTicketResolution() {
    if (!this.resolutionText) return;
    this.dataService.resolveTicket(this.selectedTicket.id, { resolutionDetails: this.resolutionText }).subscribe({
      next: () => {
        alert("Ticket resolved successfully!");
        this.selectTicket(this.selectedTicket);
        this.loadTickets();
      },
      error: (err) => alert(err.error?.message || "Failed to resolve ticket.")
    });
  }

  assignTicketToMe(ticket: any) {
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    this.dataService.assignTicket(ticket.id, { assignedAdminId: currentUser.id }).subscribe({
      next: () => {
        alert("Ticket assigned to you.");
        this.loadTickets();
        if (this.selectedTicket?.id === ticket.id) this.selectTicket(ticket);
      },
      error: (err) => alert(err.error?.message || "Failed to assign ticket.")
    });
  }

  loadAllLogs() {
    this.dataService.getAuditLogs({ limit: 100 }).subscribe((res) => {
      this.allAuditLogs = res.data || [];
      this.filterLogsList();
    });
    this.dataService.getErrorLogs({ limit: 100 }).subscribe((res) => {
      this.allErrorLogs = res.data || [];
      this.filterLogsList();
    });
  }

  filterLogsList() {
    if (!this.logsSearchText) {
      this.filteredAuditLogs = [...this.allAuditLogs];
      this.filteredErrorLogs = [...this.allErrorLogs];
      return;
    }
    const q = this.logsSearchText.toLowerCase();
    this.filteredAuditLogs = this.allAuditLogs.filter(log =>
      log.action?.toLowerCase().includes(q) ||
      log.component?.toLowerCase().includes(q) ||
      log.userName?.toLowerCase().includes(q) ||
      log.userEmail?.toLowerCase().includes(q)
    );
    this.filteredErrorLogs = this.allErrorLogs.filter(log =>
      log.message?.toLowerCase().includes(q) ||
      log.endpoint?.toLowerCase().includes(q) ||
      log.method?.toLowerCase().includes(q) ||
      log.user?.toLowerCase().includes(q)
    );
  }

  openAuditDetailModal(audit: any) {
    this.selectedAuditLog = audit;
    this.activeModal = 'auditDetail';
    this.modalTitle = `Audit Record Details: ${audit.action}`;
  }

  openErrorDetailModal(error: any) {
    this.selectedErrorLog = error;
    this.activeModal = 'errorDetail';
    this.modalTitle = `Exception Log Details: ${error.errorType || 'Error'}`;
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
    this.resumePreviewData = null;
    this.selectedResumeMember = null;
  }

  viewEmployeeResume(member: any) {
    this.selectedResumeMember = member;
    this.activeModal = 'resumePreview';
    this.modalTitle = `Resume Preview: ${member.firstName} ${member.lastName}`;
    this.resumePreviewData = null;
    this.dataService.getResumeData(member.id).subscribe({
      next: (res) => (this.resumePreviewData = res.data),
      error: (err) => (this.actionError = err.error?.message || 'Failed to load resume'),
    });
  }

  downloadMemberResumePDF() {
    if (this.resumePreviewData) {
      exportHtmlToPdf('resumePreviewWindow', `Resume_${this.resumePreviewData.employee.firstName}_${this.resumePreviewData.employee.lastName}`);
    }
  }

  printMemberResume() {
    window.print();
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
        if (this.activeSuggestionTicket) {
          this.dataService.resolveTicket(this.activeSuggestionTicket.id, { resolutionDetails: `Approved! Skill "${this.skillForm.value.skillName}" created in catalog.` }).subscribe(() => {
            this.activeSuggestionTicket = null;
            this.loadSkillSuggestions();
          });
        }
        this.closeModal();
        this.loadStats();
        this.loadFormContexts();
        this.loadSkills();
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
      departments:  this.dataService.getReportDepartments(),
      teams:        this.dataService.getReportTeams(),
      projects:     this.dataService.getReportProjects(),
      training:     this.dataService.getReportTraining(),
      skills:       this.dataService.getReportSkills(),
      skillgaps:    this.dataService.getReportSkillGaps(),
      certificates: this.dataService.getReportCertificates(),
      tickets:      this.dataService.getReportTickets(),
      audit:        this.dataService.getReportAudit(),
      downloads:    this.dataService.getReportDownloads(),
    }[this.activeReport];
    
    if (obs) {
      obs.subscribe({
        next: (r: any) => {
          this.reportRows = r.data || [];
          this.reportColumnKeys = this.reportRows.length > 0 ? Object.keys(this.reportRows[0]) : [];
          this.reportColumns = this.reportColumnKeys.map(k => k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()));
          this.reportDeptFilter = '';
          this.reportStatusFilter = '';
          this.reportManagerFilter = '';
          this.filterReportRows();
          this.reportLoading = false;
        },
        error: () => (this.reportLoading = false),
      });
    } else {
      this.reportLoading = false;
    }
  }

  filterReportRows() {
    let list = [...this.reportRows];

    // Global Search
    if (this.reportSearch.trim()) {
      const q = this.reportSearch.toLowerCase();
      list = list.filter(row =>
        Object.values(row).some((val: any) => String(val ?? '').toLowerCase().includes(q))
      );
    }

    // Department Filter
    if (this.reportDeptFilter && this.hasReportColumn('department')) {
      list = list.filter(row => row.department === this.reportDeptFilter);
    }

    // Status Filter
    if (this.reportStatusFilter) {
      if (this.hasReportColumn('status')) {
        list = list.filter(row => row.status === this.reportStatusFilter);
      } else if (this.hasReportColumn('verificationStatus')) {
        list = list.filter(row => row.verificationStatus === this.reportStatusFilter);
      }
    }

    // Manager Filter
    if (this.reportManagerFilter && this.hasReportColumn('manager')) {
      list = list.filter(row => row.manager === this.reportManagerFilter);
    }

    // Sort
    if (this.reportSortField) {
      list.sort((a, b) => {
        let valA = a[this.reportSortField];
        let valB = b[this.reportSortField];

        if (valA === undefined || valA === null) valA = '';
        if (valB === undefined || valB === null) valB = '';

        if (typeof valA === 'string') {
          return this.reportSortOrder === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        } else {
          return this.reportSortOrder === 'asc'
            ? valA - valB
            : valB - valA;
        }
      });
    }

    this.filteredReportRows = list;
    this.resetReportPagination();
  }

  hasReportColumn(colKey: string): boolean {
    return this.reportColumnKeys.includes(colKey);
  }

  getUniqueManagers(): string[] {
    const managers = this.reportRows
      .map(r => r.manager)
      .filter((m): m is string => !!m && m !== '—');
    return Array.from(new Set(managers));
  }

  isDateValue(val: any): boolean {
    if (!val || typeof val !== 'string') return false;
    return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/.test(val);
  }

  resetReportPagination() {
    this.reportCurrentPage = 1;
    this.calculateReportPagination();
  }

  calculateReportPagination() {
    this.totalReportPages = Math.ceil(this.filteredReportRows.length / Number(this.reportPageSize)) || 1;
    const startIdx = (this.reportCurrentPage - 1) * Number(this.reportPageSize);
    this.paginatedReportRows = this.filteredReportRows.slice(startIdx, startIdx + Number(this.reportPageSize));
  }

  setReportPage(page: number) {
    this.reportCurrentPage = page;
    this.calculateReportPagination();
  }

  toggleReportSort(field: string) {
    if (this.reportSortField === field) {
      this.reportSortOrder = this.reportSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.reportSortField = field;
      this.reportSortOrder = 'asc';
    }
    this.filterReportRows();
  }

  downloadReport(type: 'csv' | 'excel' | 'pdf' | 'print') {
    if (!this.filteredReportRows.length) return;
    const title = `Report_${this.activeReport}_${new Date().toISOString().split('T')[0]}`;
    
    const rowsData = this.filteredReportRows.map(r =>
      this.reportColumnKeys.map(k => r[k] !== null && r[k] !== undefined ? String(r[k]) : '')
    );

    if (type === 'csv') {
      exportToCsv(this.reportColumns, rowsData, title);
    } else if (type === 'excel') {
      exportToExcel(this.reportColumns, rowsData, title);
    } else if (type === 'pdf') {
      exportToPdf(this.reportColumns, rowsData, title);
    } else if (type === 'print') {
      printTable(this.reportColumns, rowsData, title.replace(/_/g, ' '));
    }
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
