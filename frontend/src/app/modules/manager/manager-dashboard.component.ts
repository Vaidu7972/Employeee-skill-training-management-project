import { Component, OnInit, AfterViewInit, OnDestroy } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { DataService } from "../../core/services/data.service";
import { AuthService } from "../../core/services/auth.service";
import { exportToCsv, exportToExcel, printTable, exportToPdf, exportHtmlToPdf } from "../../core/utils/export.utils";
import { Chart } from "chart.js/auto";
import { forkJoin, Subscription } from "rxjs";
import { Router, NavigationEnd } from "@angular/router";
import { filter } from "rxjs/operators";

@Component({
  selector: "app-manager-dashboard",
  template: `
    <div class="dashboard-wrapper">
      <!-- 1. Master Tab Bar Switches -->
      <div class="master-tab-bar">
        <button [class.active]="activeMasterTab === 'team'" (click)="setMasterTab('team')">
          <span class="material-icons">groups</span> My Team
        </button>
        <button [class.active]="activeMasterTab === 'development'" (click)="setMasterTab('development')">
          <span class="material-icons">person_pin</span> My Development
        </button>
      </div>

      <!-- ================================================== -->
      <!-- TAB 1: MY TEAM GATEWAY -->
      <!-- ================================================== -->
      <div *ngIf="activeMasterTab === 'team'">
        <!-- KPIs Grid -->
        <div class="kpi-container">
          <div class="kpi-card">
            <div class="kpi-icon"><span class="material-icons">groups</span></div>
            <div class="kpi-content">
              <div class="kpi-value">{{ stats?.totalTeamMembers || 0 }}</div>
              <div class="kpi-label">Team Members</div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon" style="color: var(--secondary)"><span class="material-icons">pending_actions</span></div>
            <div class="kpi-content">
              <div class="kpi-value">{{ stats?.pendingSkillReviews || 0 }}</div>
              <div class="kpi-label">Pending Skill Reviews</div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon" style="color: var(--accent)"><span class="material-icons">verified_user</span></div>
            <div class="kpi-content">
              <div class="kpi-value">{{ stats?.pendingCertificateReviews || 0 }}</div>
              <div class="kpi-label">Pending Cert Reviews</div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon" style="color: var(--error)"><span class="material-icons">support_agent</span></div>
            <div class="kpi-content">
              <div class="kpi-value">{{ teamTickets.length }}</div>
              <div class="kpi-label">Open Team Tickets</div>
            </div>
          </div>
        </div>

        <!-- Team Charts -->
        <div class="charts-grid">
          <div class="dashboard-card">
            <h4>Team Skill Gaps Distribution</h4>
            <div class="chart-container">
              <canvas id="teamGapChart"></canvas>
            </div>
          </div>
          <div class="dashboard-card">
            <h4>Team Training Completion Progress</h4>
            <div class="chart-container">
              <canvas id="teamProgressChart"></canvas>
            </div>
          </div>
        </div>

        <!-- Quick Manager Actions toolbar -->
        <div class="dashboard-card actions-toolbar">
          <h4>Team Allocations Toolbar</h4>
          <div class="actions-grid">
            <button class="btn btn-primary" (click)="openModal('assignSkill')">
              <span class="material-icons">add_moderator</span> Assign Skill Requirement
            </button>
            <button class="btn btn-secondary" (click)="openModal('assignTraining')">
              <span class="material-icons">library_add</span> Assign Team Training
            </button>
          </div>
        </div>

        <!-- Sub Tabs Navigation -->
        <div class="secondary-tab-bar" style="display:flex; gap:8px; margin-bottom:20px; border-bottom:1px solid var(--border); padding-bottom:12px; flex-wrap:wrap;">
          <button class="btn btn-sm" [class.btn-primary]="activeSubTab === 'profiles'" (click)="setSubTab('profiles')">
            <span class="material-icons" style="font-size:16px; vertical-align:middle; margin-right:4px;">badge</span>Team Profiles
          </button>
          <button class="btn btn-sm" [class.btn-primary]="activeSubTab === 'skills'" (click)="setSubTab('skills')">
            <span class="material-icons" style="font-size:16px; vertical-align:middle; margin-right:4px;">psychology</span>Skills & Reviews
          </button>
          <button class="btn btn-sm" [class.btn-primary]="activeSubTab === 'gaps'" (click)="setSubTab('gaps')">
            <span class="material-icons" style="font-size:16px; vertical-align:middle; margin-right:4px;">trending_down</span>Skill Gaps
          </button>
          <button class="btn btn-sm" [class.btn-primary]="activeSubTab === 'training'" (click)="setSubTab('training')">
            <span class="material-icons" style="font-size:16px; vertical-align:middle; margin-right:4px;">model_training</span>Trainings
          </button>
          <button class="btn btn-sm" [class.btn-primary]="activeSubTab === 'certificates'" (click)="setSubTab('certificates')">
            <span class="material-icons" style="font-size:16px; vertical-align:middle; margin-right:4px;">military_tech</span>Certificates
          </button>
          <button class="btn btn-sm" [class.btn-primary]="activeSubTab === 'projects'" (click)="setSubTab('projects')">
            <span class="material-icons" style="font-size:16px; vertical-align:middle; margin-right:4px;">lan</span>Projects
          </button>
          <button class="btn btn-sm" [class.btn-primary]="activeSubTab === 'resumes'" (click)="setSubTab('resumes')">
            <span class="material-icons" style="font-size:16px; vertical-align:middle; margin-right:4px;">description</span>Team Resumes
          </button>
          <button class="btn btn-sm" [class.btn-primary]="activeSubTab === 'tickets'" (click)="setSubTab('tickets')">
            <span class="material-icons" style="font-size:16px; vertical-align:middle; margin-right:4px;">support_agent</span>Helpdesk ({{ teamTickets.length }})
          </button>
          <button class="btn btn-sm" [class.btn-primary]="activeSubTab === 'logs'" (click)="setSubTab('logs')">
            <span class="material-icons" style="font-size:16px; vertical-align:middle; margin-right:4px;">receipt_long</span>Audit & Error Logs
          </button>
        </div>

        <!-- ================================================== -->
        <!-- SUB-TAB 1: TEAM PROFILES -->
        <!-- ================================================== -->
        <div *ngIf="activeSubTab === 'profiles'" class="dashboard-card">
          <div class="card-header border-b">
            <h4>My Direct Team Profiles</h4>
            <div class="export-actions">
              <button class="btn btn-outline-sm" (click)="exportTeam('csv')">CSV</button>
              <button class="btn btn-outline-sm" (click)="exportTeam('excel')">Excel</button>
              <button class="btn btn-outline-sm" (click)="exportTeam('pdf')">PDF</button>
              <button class="btn btn-outline-sm" (click)="exportTeam('print')">Print</button>
            </div>
          </div>

          <!-- Filters panel -->
          <div class="filters-row">
            <input type="text" class="form-control filter-input" [(ngModel)]="searchQuery" (input)="applyTeamFilters()" placeholder="Global search..." />
            <input type="text" class="form-control filter-input" [(ngModel)]="codeFilter" (input)="applyTeamFilters()" placeholder="Filter Code..." />
            <input type="text" class="form-control filter-input" [(ngModel)]="nameFilter" (input)="applyTeamFilters()" placeholder="Filter Name..." />
            <input type="text" class="form-control filter-input" [(ngModel)]="designationFilter" (input)="applyTeamFilters()" placeholder="Filter Designation..." />

            <select class="form-control filter-select" [(ngModel)]="pageSize" (change)="resetPagination()">
              <option [value]="5">5 Entries</option>
              <option [value]="10">10 Entries</option>
              <option [value]="20">20 Entries</option>
              <option [value]="50">50 Entries</option>
              <option [value]="100">100 Entries</option>
            </select>
          </div>

          <!-- Data Grid -->
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th (click)="toggleSort('employeeCode')" style="cursor:pointer; user-select:none;">Code <span class="material-icons sort-icon">swap_vert</span></th>
                  <th (click)="toggleSort('firstName')" style="cursor:pointer; user-select:none;">Name <span class="material-icons sort-icon">swap_vert</span></th>
                  <th>Email</th>
                  <th (click)="toggleSort('designationId')" style="cursor:pointer; user-select:none;">Designation <span class="material-icons sort-icon">swap_vert</span></th>
                  <th (click)="toggleSort('yearsOfExperience')" style="cursor:pointer; user-select:none;">Experience <span class="material-icons sort-icon">swap_vert</span></th>
                  <th>Work Mode</th>
                  <th>Resume</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let member of paginatedTeam">
                  <td>{{ member.employeeCode }}</td>
                  <td>{{ member.firstName }} {{ member.lastName }}</td>
                  <td>{{ member.email }}</td>
                  <td>{{ member.designation?.name }}</td>
                  <td>{{ member.yearsOfExperience }} Years</td>
                  <td><span class="badge badge-info">{{ member.workMode }}</span></td>
                  <td>
                    <button class="btn btn-outline-sm" (click)="openResumeModal(member)">View</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination details -->
          <div class="pagination-footer">
            <span>Showing {{ paginatedTeam.length }} of {{ filteredTeam.length }} entries</span>
            <div class="pag-buttons">
              <button class="btn btn-outline-sm" [disabled]="currentPage === 1" (click)="setPage(currentPage - 1)">Previous</button>
              <button class="btn btn-outline-sm" [disabled]="currentPage === totalPages" (click)="setPage(currentPage + 1)">Next</button>
            </div>
          </div>
        </div>

        <!-- ================================================== -->
        <!-- SUB-TAB 2: SKILLS & REVIEWS -->
        <!-- ================================================== -->
        <div *ngIf="activeSubTab === 'skills'" style="display:flex; flex-direction:column; gap:20px;">
          <!-- Skills & Reviews Graphical Representation -->
          <div class="charts-grid">
            <div class="dashboard-card">
              <h4>Skill Rating Levels Distribution</h4>
              <div class="chart-container">
                <canvas id="subtabSkillRatingChart"></canvas>
              </div>
            </div>
            <div class="dashboard-card">
              <h4>Approved vs Pending Skill Verification</h4>
              <div class="chart-container">
                <canvas id="subtabSkillApprovalChart"></canvas>
              </div>
            </div>
          </div>
          <!-- Self Assessments Review queue -->
          <div class="dashboard-card">
            <h4>Pending Team Skill Self-Assessments</h4>
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Skill Name</th>
                    <th>Self Rating</th>
                    <th>Comments</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngIf="pendingAssessments.length === 0">
                    <td colspan="5" class="text-center text-muted">No pending skill ratings to approve.</td>
                  </tr>
                  <tr *ngFor="let ass of pendingAssessments">
                    <td>{{ ass.employee?.firstName }} {{ ass.employee?.lastName }}</td>
                    <td>{{ ass.skill?.skillName }}</td>
                    <td><span class="badge badge-primary">{{ ass.selfRating }} / 5</span></td>
                    <td>{{ ass.employeeComments || 'None' }}</td>
                    <td>
                      <div class="action-btn-group">
                        <button class="btn btn-success-sm" (click)="approveAssessment(ass, ass.selfRating)">Approve</button>
                        <button class="btn btn-error-sm" (click)="rejectAssessment(ass)">Reject</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- All Team Skills Matrix Grid -->
          <div class="dashboard-card">
            <div class="card-header border-b">
              <h4>Direct Team Skills Portfolio</h4>
              <div class="export-actions">
                <button class="btn btn-outline-sm" (click)="exportSkills('csv')">CSV</button>
                <button class="btn btn-outline-sm" (click)="exportSkills('excel')">Excel</button>
                <button class="btn btn-outline-sm" (click)="exportSkills('pdf')">PDF</button>
                <button class="btn btn-outline-sm" (click)="exportSkills('print')">Print</button>
              </div>
            </div>

            <div class="filters-row">
              <input type="text" class="form-control filter-input" [(ngModel)]="skillsSearch" (input)="filterTeamSkills()" placeholder="Search employee or skill..." />
              <select class="form-control filter-select" [(ngModel)]="skillsStatusFilter" (change)="filterTeamSkills()">
                <option value="">All Statuses</option>
                <option value="APPROVED">Approved</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <select class="form-control filter-select" [(ngModel)]="skillsPageSize" (change)="resetSkillsPagination()">
                <option [value]="5">5 Entries</option>
                <option [value]="10">10 Entries</option>
                <option [value]="20">20 Entries</option>
                <option [value]="50">50 Entries</option>
              </select>
            </div>

            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th (click)="toggleSkillsSort('employeeName')" style="cursor:pointer; user-select:none;">Employee <span class="material-icons sort-icon">swap_vert</span></th>
                    <th (click)="toggleSkillsSort('skillName')" style="cursor:pointer; user-select:none;">Skill <span class="material-icons sort-icon">swap_vert</span></th>
                    <th (click)="toggleSkillsSort('selfRating')" style="cursor:pointer; user-select:none;">Self Rating <span class="material-icons sort-icon">swap_vert</span></th>
                    <th (click)="toggleSkillsSort('finalRating')" style="cursor:pointer; user-select:none;">Final Rating <span class="material-icons sort-icon">swap_vert</span></th>
                    <th (click)="toggleSkillsSort('status')" style="cursor:pointer; user-select:none;">Status <span class="material-icons sort-icon">swap_vert</span></th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of paginatedTeamSkills">
                    <td>{{ item.employee?.firstName }} {{ item.employee?.lastName }}</td>
                    <td><strong>{{ item.skill?.skillName }}</strong></td>
                    <td>{{ item.selfRating }}/5</td>
                    <td>{{ item.status === 'APPROVED' ? item.finalRating + '/5' : '—' }}</td>
                    <td>
                      <span class="badge" [ngClass]="{
                        'badge-success': item.status === 'APPROVED',
                        'badge-warning': item.status === 'SUBMITTED',
                        'badge-info': item.status === 'ASSIGNED',
                        'badge-error': item.status === 'REJECTED'
                      }">{{ item.status }}</span>
                    </td>
                    <td>
                      <button *ngIf="item.status === 'SUBMITTED'" class="btn btn-outline-sm" (click)="approveAssessment(item, item.selfRating)">Quick Approve</button>
                      <span *ngIf="item.status === 'APPROVED'" style="font-size:11px; color:var(--success);">Verified</span>
                      <span *ngIf="item.status !== 'SUBMITTED' && item.status !== 'APPROVED'" style="font-size:11px; color:var(--text-muted);">—</span>
                    </td>
                  </tr>
                  <tr *ngIf="paginatedTeamSkills.length === 0">
                    <td colspan="6" class="text-center text-muted">No skill records match the filters.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="pagination-footer">
              <span>Showing {{ paginatedTeamSkills.length }} of {{ filteredTeamSkills.length }} entries</span>
              <div class="pag-buttons">
                <button class="btn btn-outline-sm" [disabled]="skillsPage === 1" (click)="setSkillsPage(skillsPage - 1)">Previous</button>
                <button class="btn btn-outline-sm" [disabled]="skillsPage === totalSkillsPages" (click)="setSkillsPage(skillsPage + 1)">Next</button>
              </div>
            </div>
          </div>
        </div>

        <!-- ================================================== -->
        <!-- SUB-TAB 3: TEAM SKILL GAPS -->
        <!-- ================================================== -->
        <!-- ================================================== -->
        <!-- SUB-TAB 3: TEAM SKILL GAPS (Employee Skill Gap Overview) -->
        <!-- ================================================== -->
        <div *ngIf="activeSubTab === 'gaps'" class="dashboard-card">
          <!-- Skill Gaps Graphical Representation -->
          <div class="charts-grid" style="margin-bottom: 20px;">
            <div class="dashboard-card" style="box-shadow:none; border:1px solid var(--border);">
              <h4>Skill Gap Priority Breakdown</h4>
              <div class="chart-container">
                <canvas id="subtabGapSeverityChart"></canvas>
              </div>
            </div>
            <div class="dashboard-card" style="box-shadow:none; border:1px solid var(--border);">
              <h4>Required Level vs Verified Rating Gap</h4>
              <div class="chart-container">
                <canvas id="subtabGapRatingChart"></canvas>
              </div>
            </div>
          </div>
          <div class="card-header border-b">
            <h4>Employee Skill Gap Overview</h4>
            <div class="export-actions">
              <button class="btn btn-outline-sm" (click)="exportGapsCSV()">Export CSV</button>
              <button class="btn btn-outline-sm" (click)="loadManagerSkillGaps()">Refresh</button>
            </div>
          </div>

          <!-- Summary KPI Cards -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px; margin:16px 0 20px;">
            <div style="padding:14px; background:rgba(34,197,94,0.06); border:1px solid rgba(34,197,94,0.2); border-radius:10px; text-align:center;">
              <div style="font-size:22px; font-weight:800; color:var(--success);">{{ gapsSummary?.noGapCount || 0 }}</div>
              <div style="font-size:11px; color:var(--text-muted); font-weight:600; margin-top:2px;">No Skill Gap</div>
            </div>
            <div style="padding:14px; background:rgba(59,130,246,0.06); border:1px solid rgba(59,130,246,0.2); border-radius:10px; text-align:center;">
              <div style="font-size:22px; font-weight:800; color:var(--info);">{{ gapsSummary?.lowGapCount || 0 }}</div>
              <div style="font-size:11px; color:var(--text-muted); font-weight:600; margin-top:2px;">Low Skill Gap</div>
            </div>
            <div style="padding:14px; background:rgba(245,158,11,0.06); border:1px solid rgba(245,158,11,0.2); border-radius:10px; text-align:center;">
              <div style="font-size:22px; font-weight:800; color:var(--warning);">{{ gapsSummary?.mediumGapCount || 0 }}</div>
              <div style="font-size:11px; color:var(--text-muted); font-weight:600; margin-top:2px;">Medium Skill Gap</div>
            </div>
            <div style="padding:14px; background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.2); border-radius:10px; text-align:center;">
              <div style="font-size:22px; font-weight:800; color:var(--error);">{{ gapsSummary?.highGapCount || 0 }}</div>
              <div style="font-size:11px; color:var(--text-muted); font-weight:600; margin-top:2px;">High Skill Gap</div>
            </div>
            <div style="padding:14px; background:var(--surface-hover); border:1px solid var(--border); border-radius:10px; text-align:center;">
              <div style="font-size:22px; font-weight:800; color:var(--primary);">{{ gapsSummary?.avgTeamSkillRating || 0 }} / 5</div>
              <div style="font-size:11px; color:var(--text-muted); font-weight:600; margin-top:2px;">Avg Team Rating</div>
            </div>
            <div style="padding:14px; background:var(--surface-hover); border:1px solid var(--border); border-radius:10px; text-align:center;">
              <div style="font-size:22px; font-weight:800; color:var(--secondary);">{{ gapsSummary?.avgTeamSkillGap || 0 }}</div>
              <div style="font-size:11px; color:var(--text-muted); font-weight:600; margin-top:2px;">Avg Team Gap</div>
            </div>
          </div>

          <!-- Filters Row -->
          <div class="filters-row" style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:16px;">
            <input type="text" class="form-control filter-input" style="flex:1; min-width:160px;" [(ngModel)]="gapsSearch" (input)="gapsPage = 1; loadManagerSkillGaps()" placeholder="Search employee, code, skill..." />
            <select class="form-control filter-select" style="width:140px;" [(ngModel)]="gapsDeptFilter" (change)="gapsPage = 1; loadManagerSkillGaps()">
              <option value="">All Departments</option>
              <option *ngFor="let d of departmentsList" [value]="d.id">{{ d.name }}</option>
            </select>
            <select class="form-control filter-select" style="width:140px;" [(ngModel)]="gapsSkillFilter" (change)="gapsPage = 1; loadManagerSkillGaps()">
              <option value="">All Skills</option>
              <option *ngFor="let sk of skillsList" [value]="sk.id">{{ sk.skillName }}</option>
            </select>
            <select class="form-control filter-select" style="width:130px;" [(ngModel)]="gapsPriorityFilter" (change)="gapsPage = 1; loadManagerSkillGaps()">
              <option value="">All Priorities</option>
              <option value="NONE">No Gap</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
            <select class="form-control filter-select" style="width:130px;" [(ngModel)]="gapsCurrentRatingFilter" (change)="gapsPage = 1; loadManagerSkillGaps()">
              <option value="">Current Rating</option>
              <option *ngFor="let r of [1,2,3,4,5]" [value]="r">Level {{ r }}</option>
            </select>
            <select class="form-control filter-select" style="width:130px;" [(ngModel)]="gapsRequiredRatingFilter" (change)="gapsPage = 1; loadManagerSkillGaps()">
              <option value="">Required Rating</option>
              <option *ngFor="let r of [1,2,3,4,5]" [value]="r">Level {{ r }}</option>
            </select>
            <select class="form-control filter-select" style="width:140px;" [(ngModel)]="gapsTrainingStatusFilter" (change)="gapsPage = 1; loadManagerSkillGaps()">
              <option value="">Training Status</option>
              <option value="COMPLETED">Completed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="NOT_ASSIGNED">Not Assigned</option>
            </select>
            <select class="form-control filter-select" style="width:110px;" [(ngModel)]="gapsPageSize" (change)="gapsPage = 1; loadManagerSkillGaps()">
              <option [value]="5">5 Entries</option>
              <option [value]="10">10 Entries</option>
              <option [value]="20">20 Entries</option>
              <option [value]="50">50 Entries</option>
            </select>
            <button class="btn btn-outline" (click)="clearGapsFilters()">Clear</button>
          </div>

          <!-- Table -->
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th (click)="toggleGapsSort('employeeName')" style="cursor:pointer; user-select:none;">Employee <span class="material-icons sort-icon">swap_vert</span></th>
                  <th>Code</th>
                  <th>Department</th>
                  <th (click)="toggleGapsSort('skillName')" style="cursor:pointer; user-select:none;">Skill Name <span class="material-icons sort-icon">swap_vert</span></th>
                  <th (click)="toggleGapsSort('requiredRating')" style="cursor:pointer; user-select:none;">Required Rating <span class="material-icons sort-icon">swap_vert</span></th>
                  <th (click)="toggleGapsSort('currentRating')" style="cursor:pointer; user-select:none;">Current Final Rating <span class="material-icons sort-icon">swap_vert</span></th>
                  <th (click)="toggleGapsSort('skillGap')" style="cursor:pointer; user-select:none;">Skill Gap <span class="material-icons sort-icon">swap_vert</span></th>
                  <th (click)="toggleGapsSort('priority')" style="cursor:pointer; user-select:none;">Gap Priority <span class="material-icons sort-icon">swap_vert</span></th>
                  <th>Training Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of teamGaps">
                  <td><strong>{{ item.employeeName }}</strong></td>
                  <td><code>{{ item.employeeCode }}</code></td>
                  <td style="font-size:12px; color:var(--text-muted);">{{ item.departmentName }}</td>
                  <td><strong>{{ item.skillName }}</strong></td>

                  <!-- Required Rating (★ 5) -->
                  <td>
                    <div style="display:flex; align-items:center; gap:4px;">
                      <div style="display:flex; gap:1px;">
                        <span *ngFor="let star of [1,2,3,4,5]" class="material-icons" style="font-size:13px;"
                          [style.color]="star <= item.requiredRating ? 'var(--primary)' : 'var(--border)'">star</span>
                      </div>
                      <strong style="font-size:11px;">{{ item.requiredRating }}</strong>
                    </div>
                  </td>

                  <!-- Current Final Rating (★ 3) -->
                  <td>
                    <div style="display:flex; align-items:center; gap:4px;">
                      <div style="display:flex; gap:1px;">
                        <span *ngFor="let star of [1,2,3,4,5]" class="material-icons" style="font-size:13px;"
                          [style.color]="star <= item.currentRating ? 'var(--success)' : 'var(--border)'">star</span>
                      </div>
                      <strong style="font-size:11px;">{{ item.currentRating }}</strong>
                    </div>
                  </td>

                  <!-- Skill Gap Stars (★ 2) -->
                  <td>
                    <div style="display:flex; align-items:center; gap:4px;">
                      <div style="display:flex; gap:1px;">
                        <span *ngFor="let star of [1,2,3,4,5]" class="material-icons" style="font-size:13px;"
                          [style.color]="star <= item.skillGap ? 'var(--warning)' : 'var(--border)'">
                          {{ star <= item.skillGap ? 'star' : 'star_border' }}
                        </span>
                      </div>
                      <strong style="font-size:11px;" [style.color]="item.skillGap > 0 ? 'var(--warning)' : 'var(--success)'">{{ item.skillGap }}</strong>
                    </div>
                  </td>

                  <!-- Priority Badge -->
                  <td>
                    <span class="badge" [ngClass]="{
                      'badge-success': item.priority === 'NONE' || item.skillGap <= 0,
                      'badge-info':    item.priority === 'LOW',
                      'badge-warning': item.priority === 'MEDIUM',
                      'badge-error':   item.priority === 'HIGH'
                    }">{{ item.gapPriorityLabel }}</span>
                  </td>

                  <!-- Training Status Badge -->
                  <td>
                    <span class="badge" [ngClass]="{
                      'badge-success': item.trainingStatus === 'COMPLETED' || item.trainingStatus === 'VERIFIED',
                      'badge-warning': item.trainingStatus === 'IN_PROGRESS',
                      'badge-info':    item.trainingStatus === 'ASSIGNED',
                      'badge-secondary': item.trainingStatus === 'NOT_ASSIGNED'
                    }">{{ item.trainingStatus === 'NOT_ASSIGNED' ? 'Not Assigned' : item.trainingStatus }}</span>
                  </td>

                  <!-- Action -->
                  <td>
                    <button class="btn btn-primary btn-sm" style="padding:4px 10px; font-size:11px;" (click)="openSkillDetailModal(item)">
                      View Details
                    </button>
                  </td>
                </tr>
                <tr *ngIf="teamGaps.length === 0">
                  <td colspan="10" class="text-center text-muted" style="padding:30px;">
                    No skill gap records match the selected criteria.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Footer -->
          <div class="pagination-footer">
            <span>Showing {{ teamGaps.length }} of {{ gapsTotal }} entries (Page {{ gapsPage }} of {{ gapsTotalPages }})</span>
            <div class="pag-buttons">
              <button class="btn btn-outline-sm" [disabled]="gapsPage === 1" (click)="gapsPage = gapsPage - 1; loadManagerSkillGaps()">Previous</button>
              <button class="btn btn-outline-sm" [disabled]="gapsPage >= gapsTotalPages" (click)="gapsPage = gapsPage + 1; loadManagerSkillGaps()">Next</button>
            </div>
          </div>
        </div>

        <!-- ================================================== -->
        <!-- SUB-TAB 4: TEAM TRAINING TRACKER -->
        <!-- ================================================== -->
        <div *ngIf="activeSubTab === 'training'" style="display:flex; flex-direction:column; gap:20px;">
          <!-- Team Training Graphical Representation -->
          <div class="charts-grid">
            <div class="dashboard-card">
              <h4>Team Training Status Distribution</h4>
              <div class="chart-container">
                <canvas id="subtabTrainingStatusChart"></canvas>
              </div>
            </div>
            <div class="dashboard-card">
              <h4>Category Progress Breakdown (%)</h4>
              <div class="chart-container">
                <canvas id="subtabTrainingProgressChart"></canvas>
              </div>
            </div>
          </div>
          <div class="dashboard-card">
          <div class="card-header border-b">
            <h4>Team Training Allocations & Progress</h4>
            <div class="export-actions">
              <button class="btn btn-outline-sm" (click)="exportTrainings('csv')">CSV</button>
              <button class="btn btn-outline-sm" (click)="exportTrainings('excel')">Excel</button>
              <button class="btn btn-outline-sm" (click)="exportTrainings('pdf')">PDF</button>
              <button class="btn btn-outline-sm" (click)="exportTrainings('print')">Print</button>
            </div>
          </div>

          <div class="filters-row">
            <input type="text" class="form-control filter-input" [(ngModel)]="trainingsSearch" (input)="filterTeamTrainings()" placeholder="Search employee or course..." />
            <select class="form-control filter-select" [(ngModel)]="trainingsStatusFilter" (change)="filterTeamTrainings()">
              <option value="">All Statuses</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="VERIFIED">Verified</option>
              <option value="OVERDUE">Overdue</option>
            </select>
            <select class="form-control filter-select" [(ngModel)]="trainingsPageSize" (change)="resetTrainingsPagination()">
              <option [value]="5">5 Entries</option>
              <option [value]="10">10 Entries</option>
              <option [value]="20">20 Entries</option>
            </select>
          </div>

          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th (click)="toggleTrainingsSort('employeeName')" style="cursor:pointer; user-select:none;">Employee <span class="material-icons sort-icon">swap_vert</span></th>
                  <th (click)="toggleTrainingsSort('trainingTitle')" style="cursor:pointer; user-select:none;">Course <span class="material-icons sort-icon">swap_vert</span></th>
                  <th (click)="toggleTrainingsSort('dueDate')" style="cursor:pointer; user-select:none;">Due Date <span class="material-icons sort-icon">swap_vert</span></th>
                  <th (click)="toggleTrainingsSort('progress')" style="cursor:pointer; user-select:none;">Progress <span class="material-icons sort-icon">swap_vert</span></th>
                  <th (click)="toggleTrainingsSort('status')" style="cursor:pointer; user-select:none;">Status <span class="material-icons sort-icon">swap_vert</span></th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of paginatedTeamTrainings">
                  <td>{{ item.employee?.firstName }} {{ item.employee?.lastName }}</td>
                  <td><strong>{{ item.trainingTitle }}</strong><br/><span style="font-size:11px; color:var(--text-muted);">Skill: {{ item.skill?.skillName }}</span></td>
                  <td>{{ item.dueDate | date }}</td>
                  <td>
                    <div class="progress-bar-bg" style="width:100px;">
                      <div class="progress-bar-fill" [style.width.%]="item.progress"></div>
                    </div>
                    <span style="font-size:11px;">{{ item.progress }}%</span>
                  </td>
                  <td>
                    <span class="badge" [ngClass]="{
                      'badge-success': item.status === 'VERIFIED' || item.status === 'COMPLETED',
                      'badge-warning': item.status === 'IN_PROGRESS' || item.status === 'ASSIGNED',
                      'badge-error': item.status === 'OVERDUE'
                    }">{{ item.status }}</span>
                  </td>
                  <td>
                    <button *ngIf="item.status === 'COMPLETED'" class="btn btn-outline-sm" (click)="verifyCertificate(item.id, 'VERIFIED')">Verify & Approve</button>
                    <span *ngIf="item.status === 'VERIFIED'" style="font-size:11px; color:var(--success);">Verified</span>
                    <span *ngIf="item.status !== 'COMPLETED' && item.status !== 'VERIFIED'">—</span>
                  </td>
                </tr>
                <tr *ngIf="paginatedTeamTrainings.length === 0">
                  <td colspan="6" class="text-center text-muted">No training programs assigned.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="pagination-footer">
            <span>Showing {{ paginatedTeamTrainings.length }} of {{ filteredTeamTrainings.length }} entries</span>
            <div class="pag-buttons">
              <button class="btn btn-outline-sm" [disabled]="trainingsPage === 1" (click)="setTrainingsPage(trainingsPage - 1)">Previous</button>
              <button class="btn btn-outline-sm" [disabled]="trainingsPage === totalTrainingsPages" (click)="setTrainingsPage(trainingsPage + 1)">Next</button>
            </div>
          </div>
        </div>
      </div>

        <!-- ================================================== -->
        <!-- SUB-TAB 5: CERTIFICATES -->
        <!-- ================================================== -->
        <div *ngIf="activeSubTab === 'certificates'" style="display:flex; flex-direction:column; gap:20px;">
          <!-- Team Certificates Graphical Representation -->
          <div class="charts-grid">
            <div class="dashboard-card">
              <h4>Certificate Verification Status</h4>
              <div class="chart-container">
                <canvas id="subtabCertStatusChart"></canvas>
              </div>
            </div>
            <div class="dashboard-card">
              <h4>Issuing Organizations Breakdown</h4>
              <div class="chart-container">
                <canvas id="subtabCertOrgChart"></canvas>
              </div>
            </div>
          </div>
          <!-- Pending Certifications Approvals Queue -->
          <div class="dashboard-card">
            <h4>Pending Certificate Upload Verifications</h4>
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Certificate Name</th>
                    <th>Issuer</th>
                    <th>Issue Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngIf="pendingCertificates.length === 0">
                    <td colspan="5" class="text-center text-muted">No certificates uploaded to verify.</td>
                  </tr>
                  <tr *ngFor="let cert of pendingCertificates">
                    <td>{{ cert.employee?.firstName }} {{ cert.employee?.lastName }}</td>
                    <td>{{ cert.certificateName }}</td>
                    <td>{{ cert.issuingOrganization }}</td>
                    <td>{{ cert.issueDate | date }}</td>
                    <td>
                      <div class="action-btn-group">
                        <button class="btn btn-success-sm" (click)="verifyCertificate(cert.id, 'VERIFIED')">Verify</button>
                        <button class="btn btn-error-sm" (click)="rejectCertificate(cert)">Reject</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- All Team Certificates Grid -->
          <div class="dashboard-card">
            <div class="card-header border-b">
              <h4>Team Certificates Inventory</h4>
              <div class="export-actions">
                <button class="btn btn-outline-sm" (click)="exportCerts('csv')">CSV</button>
                <button class="btn btn-outline-sm" (click)="exportCerts('excel')">Excel</button>
                <button class="btn btn-outline-sm" (click)="exportCerts('pdf')">PDF</button>
                <button class="btn btn-outline-sm" (click)="exportCerts('print')">Print</button>
              </div>
            </div>

            <div class="filters-row">
              <input type="text" class="form-control filter-input" [(ngModel)]="certsSearch" (input)="filterTeamCertificates()" placeholder="Search employee or certificate..." />
              <select class="form-control filter-select" [(ngModel)]="certsStatusFilter" (change)="filterTeamCertificates()">
                <option value="">All Statuses</option>
                <option value="VERIFIED">Verified</option>
                <option value="PENDING">Pending</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <select class="form-control filter-select" [(ngModel)]="certsPageSize" (change)="resetCertsPagination()">
                <option [value]="5">5 Entries</option>
                <option [value]="10">10 Entries</option>
                <option [value]="20">20 Entries</option>
              </select>
            </div>

            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th (click)="toggleCertsSort('employeeName')" style="cursor:pointer; user-select:none;">Employee <span class="material-icons sort-icon">swap_vert</span></th>
                    <th (click)="toggleCertsSort('certificateName')" style="cursor:pointer; user-select:none;">Certificate Name <span class="material-icons sort-icon">swap_vert</span></th>
                    <th (click)="toggleCertsSort('issuingOrganization')" style="cursor:pointer; user-select:none;">Issuer <span class="material-icons sort-icon">swap_vert</span></th>
                    <th (click)="toggleCertsSort('issueDate')" style="cursor:pointer; user-select:none;">Issue Date <span class="material-icons sort-icon">swap_vert</span></th>
                    <th (click)="toggleCertsSort('verificationStatus')" style="cursor:pointer; user-select:none;">Status <span class="material-icons sort-icon">swap_vert</span></th>
                    <th>Download</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of paginatedTeamCerts">
                    <td>{{ item.employee?.firstName }} {{ item.employee?.lastName }}</td>
                    <td><strong>{{ item.certificateName }}</strong></td>
                    <td>{{ item.issuingOrganization }}</td>
                    <td>{{ item.issueDate | date }}</td>
                    <td>
                      <span class="badge" [ngClass]="{
                        'badge-success': item.verificationStatus === 'VERIFIED',
                        'badge-warning': item.verificationStatus === 'PENDING',
                        'badge-error': item.verificationStatus === 'REJECTED'
                      }">{{ item.verificationStatus }}</span>
                    </td>
                    <td>
                      <a [href]="'http://localhost:5000/' + item.filePath" target="_blank" class="btn btn-outline-sm">Download</a>
                    </td>
                  </tr>
                  <tr *ngIf="paginatedTeamCerts.length === 0">
                    <td colspan="6" class="text-center text-muted">No certificates match the criteria.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="pagination-footer">
              <span>Showing {{ paginatedTeamCerts.length }} of {{ filteredTeamCertificates.length }} entries</span>
              <div class="pag-buttons">
                <button class="btn btn-outline-sm" [disabled]="certsPage === 1" (click)="setCertsPage(certsPage - 1)">Previous</button>
                <button class="btn btn-outline-sm" [disabled]="certsPage === totalCertsPages" (click)="setCertsPage(certsPage + 1)">Next</button>
              </div>
            </div>
          </div>
        </div>
      </div>

        <!-- ================================================== -->
        <!-- SUB-TAB 6: PROJECTS -->
        <!-- ================================================== -->
        <div *ngIf="activeSubTab === 'projects'" style="display:flex; flex-direction:column; gap:20px;">
          <!-- Team Projects Graphical Representation -->
          <div class="charts-grid">
            <div class="dashboard-card">
              <h4>Projects Status Breakdown</h4>
              <div class="chart-container">
                <canvas id="projStatusChart"></canvas>
              </div>
            </div>
            <div class="dashboard-card">
              <h4>Project Completion Progress (%)</h4>
              <div class="chart-container">
                <canvas id="projCompletionChart"></canvas>
              </div>
            </div>
          </div>
          <div class="dashboard-card">
          <div class="card-header border-b">
            <h4>Team Project Assignments</h4>
            <div class="export-actions">
              <button class="btn btn-outline-sm" (click)="exportProjects('csv')">CSV</button>
              <button class="btn btn-outline-sm" (click)="exportProjects('excel')">Excel</button>
              <button class="btn btn-outline-sm" (click)="exportProjects('pdf')">PDF</button>
              <button class="btn btn-outline-sm" (click)="exportProjects('print')">Print</button>
            </div>
          </div>

          <div class="filters-row">
            <input type="text" class="form-control filter-input" [(ngModel)]="projectsSearch" (input)="filterTeamProjects()" placeholder="Search project or role..." />
            <select class="form-control filter-select" [(ngModel)]="projectsStatusFilter" (change)="filterTeamProjects()">
              <option value="">All Statuses</option>
              <option value="PLANNING">Planning</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
            </select>
            <select class="form-control filter-select" [(ngModel)]="projectsPageSize" (change)="resetProjectsPagination()">
              <option [value]="5">5 Entries</option>
              <option [value]="10">10 Entries</option>
              <option [value]="20">20 Entries</option>
            </select>
          </div>

          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th (click)="toggleProjectsSort('name')" style="cursor:pointer; user-select:none;">Project Name <span class="material-icons sort-icon">swap_vert</span></th>
                  <th (click)="toggleProjectsSort('projectCode')" style="cursor:pointer; user-select:none;">Code <span class="material-icons sort-icon">swap_vert</span></th>
                  <th>Client</th>
                  <th (click)="toggleProjectsSort('status')" style="cursor:pointer; user-select:none;">Status <span class="material-icons sort-icon">swap_vert</span></th>
                  <th>Technologies Used</th>
                  <th>Team Count</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of paginatedTeamProjects">
                  <td><strong>{{ item.name }}</strong></td>
                  <td><code>{{ item.projectCode }}</code></td>
                  <td>{{ item.clientName || '—' }}</td>
                  <td>
                    <span class="badge" [ngClass]="{
                      'badge-success': item.status === 'COMPLETED',
                      'badge-info': item.status === 'ACTIVE',
                      'badge-warning': item.status === 'PLANNING' || item.status === 'ON_HOLD'
                    }">{{ item.status }}</span>
                  </td>
                  <td>{{ item.technologies || '—' }}</td>
                  <td>{{ item.assignments?.length || 0 }} members</td>
                </tr>
                <tr *ngIf="paginatedTeamProjects.length === 0">
                  <td colspan="6" class="text-center text-muted">No project assignments for your team.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="pagination-footer">
            <span>Showing {{ paginatedTeamProjects.length }} of {{ filteredTeamProjects.length }} entries</span>
            <div class="pag-buttons">
              <button class="btn btn-outline-sm" [disabled]="projectsPage === 1" (click)="setProjectsPage(projectsPage - 1)">Previous</button>
              <button class="btn btn-outline-sm" [disabled]="projectsPage === totalProjectsPages" (click)="setProjectsPage(projectsPage + 1)">Next</button>
            </div>
          </div>
        </div>
      </div>

        <!-- ================================================== -->
        <!-- SUB-TAB 6.5: TEAM RESUMES -->
        <!-- ================================================== -->
        <div *ngIf="activeSubTab === 'resumes'" style="display:flex; flex-direction:column; gap:20px;">
          <!-- Team Resumes Graphical Representation -->
          <div class="charts-grid">
            <div class="dashboard-card">
              <h4>Team Experience Level Distribution</h4>
              <div class="chart-container">
                <canvas id="resumeExpChart"></canvas>
              </div>
            </div>
            <div class="dashboard-card">
              <h4>Top Competencies Highlighted on Team Resumes</h4>
              <div class="chart-container">
                <canvas id="resumeSkillsChart"></canvas>
              </div>
            </div>
          </div>
          
          <!-- Team Resume Stats Overview -->
          <div class="dashboard-card" id="teamResumeSummary" style="padding: 24px; position: relative;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; border-bottom:1px solid var(--border); padding-bottom:16px; flex-wrap:wrap; gap:16px;">
              <div>
                <h3 style="margin:0 0 4px; font-size:22px; color:var(--primary);">Team Resume & Capability Profile</h3>
                <p style="margin:0; font-size:14px; color:var(--text-muted);">
                  Manager: <strong>{{ teamSummaryData?.managerName }}</strong> · Department: <strong>{{ teamSummaryData?.department }}</strong>
                </p>
              </div>
              <button class="btn btn-primary" (click)="downloadTeamResumePDF()">
                <span class="material-icons" style="font-size:16px; margin-right:4px;">picture_as_pdf</span>
                Download Team CV Summary
              </button>
            </div>

            <!-- Dashboard Stats Grid -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:16px; margin-bottom:24px;">
              <div style="padding:16px; background:var(--surface-hover); border-radius:10px; text-align:center; border:1px solid var(--border);">
                <div style="font-size:24px; font-weight:800; color:var(--primary);">{{ teamSummaryData?.totalTeamMembers || 0 }}</div>
                <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:600; margin-top:4px;">Team Members</div>
              </div>
              <div style="padding:16px; background:var(--surface-hover); border-radius:10px; text-align:center; border:1px solid var(--border);">
                <div style="font-size:24px; font-weight:800; color:var(--secondary);">{{ teamSummaryData?.averageExperience || 0 }} yrs</div>
                <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:600; margin-top:4px;">Avg Experience</div>
              </div>
              <div style="padding:16px; background:var(--surface-hover); border-radius:10px; text-align:center; border:1px solid var(--border);">
                <div style="font-size:24px; font-weight:800; color:var(--accent);">{{ teamSummaryData?.activeProjects || 0 }}</div>
                <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:600; margin-top:4px;">Active Projects</div>
              </div>
              <div style="padding:16px; background:var(--surface-hover); border-radius:10px; text-align:center; border:1px solid var(--border);">
                <div style="font-size:24px; font-weight:800; color:var(--success);">{{ teamSummaryData?.trainingCompletionPercentage || 0 }}%</div>
                <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:600; margin-top:4px;">Training Done</div>
              </div>
              <div style="padding:16px; background:var(--surface-hover); border-radius:10px; text-align:center; border:1px solid var(--border);">
                <div style="font-size:24px; font-weight:800; color:var(--warning);">{{ teamSummaryData?.verifiedCertificates || 0 }}</div>
                <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; font-weight:600; margin-top:4px;">Verified Certs</div>
              </div>
            </div>

            <!-- Top Skills & Tech Stack Dual Columns -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:20px;">
              <div style="padding:20px; background:rgba(94,114,228,0.03); border:1px solid var(--border); border-radius:10px;">
                <h5 style="margin:0 0 12px; font-size:13px; text-transform:uppercase; color:var(--primary); letter-spacing:0.5px;">Top Team Core Skills</h5>
                <div style="display:flex; flex-wrap:wrap; gap:8px;">
                  <span *ngFor="let skill of teamSummaryData?.topSkills" style="padding:4px 12px; background:var(--surface-card); border:1px solid var(--border); border-radius:50px; font-size:12px; font-weight:600;">{{ skill }}</span>
                  <span *ngIf="!teamSummaryData?.topSkills?.length" style="color:var(--text-muted); font-size:12px;">No approved skills yet.</span>
                </div>
              </div>
              <div style="padding:20px; background:rgba(43,203,186,0.03); border:1px solid var(--border); border-radius:10px;">
                <h5 style="margin:0 0 12px; font-size:13px; text-transform:uppercase; color:var(--secondary); letter-spacing:0.5px;">Main Technologies Used</h5>
                <div style="display:flex; flex-wrap:wrap; gap:8px;">
                  <span *ngFor="let tech of teamSummaryData?.mainTechnologies" style="padding:4px 12px; background:var(--surface-card); border:1px solid var(--border); border-radius:50px; font-size:12px; font-weight:600; color:var(--secondary);">{{ tech }}</span>
                  <span *ngIf="!teamSummaryData?.mainTechnologies?.length" style="color:var(--text-muted); font-size:12px;">No technologies mapped.</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Filters and Team Members List -->
          <div class="dashboard-card">
            <div class="card-header border-b">
              <h4>Direct Reports & Project Contributions</h4>
            </div>

            <!-- Filters Area -->
            <div class="filters-row" style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:20px; padding:16px 0;">
              <input type="text" class="form-control" style="flex:1; min-width:200px;" [(ngModel)]="resumeSearchText" (input)="filterManagerTeam()" placeholder="Search employee..." />
              <select class="form-control" style="width:160px;" [(ngModel)]="resumeSkillFilter" (change)="filterManagerTeam()">
                <option value="">All Skills</option>
                <option *ngFor="let sk of skillsList" [value]="sk.skillName">{{ sk.skillName }}</option>
              </select>
              <select class="form-control" style="width:160px;" [(ngModel)]="resumeProjectFilter" (change)="filterManagerTeam()">
                <option value="">All Projects</option>
                <option *ngFor="let prj of allTeamProjects" [value]="prj.name">{{ prj.name }}</option>
              </select>
            </div>

            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Experience</th>
                    <th>Active Projects</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let member of paginatedManagerReports">
                    <td><code>{{ member.employeeCode }}</code></td>
                    <td><strong>{{ member.firstName }} {{ member.lastName }}</strong><br /><span style="font-size:11px; color:var(--text-muted);">{{ member.designation }}</span></td>
                    <td>{{ member.email }}</td>
                    <td>{{ member.yearsOfExperience }} yrs</td>
                    <td>
                      <div style="font-size:11px;">
                        <div *ngFor="let assignment of getEmployeeActiveProjects(member.id)">
                          • {{ assignment.projectName }} ({{ assignment.contributionPercent }}% - {{ assignment.role }})
                        </div>
                        <span *ngIf="!getEmployeeActiveProjects(member.id).length" class="text-muted">No active project assignments.</span>
                      </div>
                    </td>
                    <td>
                      <button class="btn btn-primary btn-sm" style="padding:4px 10px; font-size:12px; display:inline-flex; align-items:center; gap:4px;" (click)="viewMemberFullResume(member)">
                        <span class="material-icons" style="font-size:13px;">description</span> View Resume
                      </button>
                    </td>
                  </tr>
                  <tr *ngIf="paginatedManagerReports.length === 0">
                    <td colspan="6" class="text-center text-muted">No team members match the filters.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Paging footer -->
            <div class="pagination-footer" style="display:flex; justify-content:space-between; align-items:center; padding-top:16px;">
              <span>Showing {{ paginatedManagerReports.length }} of {{ filteredManagerReports.length }} team members</span>
              <div class="pag-buttons" style="display:flex; gap:8px;">
                <button class="btn btn-outline-sm" [disabled]="resumePage === 1" (click)="setResumePage(resumePage - 1)">Previous</button>
                <button class="btn btn-outline-sm" [disabled]="resumePage === totalResumePages" (click)="setResumePage(resumePage + 1)">Next</button>
              </div>
            </div>
          </div>
        </div>

        <!-- ================================================== -->
        <!-- SUB-TAB 7: TEAM SUPPORT HELPDESK QUEUE -->
        <!-- ================================================== -->
        <div *ngIf="activeSubTab === 'tickets'" style="display:flex; flex-direction:column; gap:20px;">
          <div class="dashboard-card">
            <h4>Team Support Helpdesk Queue</h4>
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Number</th>
                    <th>Employee</th>
                    <th>Subject</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngIf="teamTickets.length === 0">
                    <td colspan="7" class="text-center text-muted">No team support tickets opened.</td>
                  </tr>
                  <tr *ngFor="let t of teamTickets">
                    <td>{{ t.ticketNumber }}</td>
                    <td>{{ t.employee ? t.employee.firstName + ' ' + t.employee.lastName : '—' }}</td>
                    <td>{{ t.subject }}</td>
                    <td>{{ t.category }}</td>
                    <td>
                      <span class="badge" [ngClass]="{
                        'badge-error': t.priority === 'CRITICAL' || t.priority === 'HIGH',
                        'badge-warning': t.priority === 'MEDIUM',
                        'badge-info': t.priority === 'LOW'
                      }">{{ t.priority }}</span>
                    </td>
                    <td>
                      <span class="badge badge-info">{{ t.status }}</span>
                    </td>
                    <td>
                      <button class="btn btn-outline-sm" (click)="viewTicketDetails(t)">View / Converse</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Active Support Chat dialog -->
          <div class="dashboard-card flex-col" *ngIf="selectedTicket">
            <div class="card-header border-b">
              <h4>Converse Ticket: {{ selectedTicket.ticketNumber }}</h4>
              <button class="btn btn-outline-sm" (click)="selectedTicket = null">Close Conversation</button>
            </div>
            
            <div class="ticket-meta-box">
              <p><strong>Employee:</strong> {{ selectedTicket.employee?.firstName }} {{ selectedTicket.employee?.lastName }}</p>
              <p><strong>Subject:</strong> {{ selectedTicket.subject }}</p>
              <p><strong>Category:</strong> {{ selectedTicket.category }} | <strong>Priority:</strong> {{ selectedTicket.priority }}</p>
              <p><strong>SLA Deadline:</strong> {{ selectedTicket.slaDueDate | date: 'short' }}</p>
              <p><strong>Status:</strong> <span class="badge badge-info">{{ selectedTicket.status }}</span></p>
            </div>

            <!-- Chat Timeline messages -->
            <div class="messages-log">
              <div class="msg-bubble system">
                <p><strong>Issue Opened:</strong> {{ selectedTicket.description }}</p>
                <span>{{ selectedTicket.createdAt | date: 'short' }}</span>
              </div>
              <div *ngFor="let m of selectedTicket.comments" class="msg-bubble" 
                   [ngClass]="{ 'self': m.senderUserId === currentUser.id, 'support': m.senderUserId !== currentUser.id }">
                <p><strong>{{ m.senderRole }}:</strong> {{ m.message }}</p>
                <span>{{ m.createdAt | date: 'short' }}</span>
              </div>
            </div>

            <!-- Reply and Actions panel -->
            <div *ngIf="selectedTicket.status !== 'CLOSED' && selectedTicket.status !== 'RESOLVED'" class="reply-box" style="margin-top: 20px;">
              <textarea class="form-control" [(ngModel)]="replyMessage" placeholder="Write a response message to employee..."></textarea>
              <div class="form-row" style="margin-top: 10px; display: flex; gap: 10px;">
                <button class="btn btn-primary" (click)="sendTicketReply()">Send Reply</button>
                <button class="btn btn-secondary" (click)="resolveTeamTicket()">Resolve Ticket</button>
                <button class="btn btn-error" (click)="escalateTeamTicket()">Escalate to Admin</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ================================================== -->
      <!-- TAB 2: MY DEVELOPMENT (MANAGER PROFILE & DEVELOPMENT) -->
      <!-- ================================================== -->
      <div *ngIf="activeMasterTab === 'development'" style="display:flex; flex-direction:column; gap:24px;">
        <!-- Manager Profile Details Banner -->
        <div class="dashboard-card" style="background: linear-gradient(135deg, var(--surface-card) 0%, var(--surface-hover) 100%); border: 1px solid var(--border); padding: 28px; border-radius: 16px; position: relative;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:20px;">
            <!-- Left: Avatar & Primary Details -->
            <div style="display:flex; gap:20px; align-items:center; flex-wrap:wrap;">
              <div style="width:90px; height:90px; border-radius:50%; background:linear-gradient(135deg, var(--primary), var(--primary-dark)); display:flex; align-items:center; justify-content:center; font-size:38px; font-weight:800; color:#fff; box-shadow:0 8px 20px rgba(94,114,228,0.3); border:3px solid var(--surface-card);">
                {{ currentUser?.firstName ? currentUser.firstName[0] : 'M' }}
              </div>
              <div>
                <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                  <h2 style="margin:0; font-size:24px; font-weight:800; color:var(--text-primary);">
                    {{ currentUser?.firstName }} {{ currentUser?.lastName }}
                  </h2>
                  <span class="badge badge-primary" style="font-size:11px; padding:4px 10px; font-weight:700;">MANAGER PORTAL</span>
                  <span class="badge badge-success" style="font-size:11px; padding:4px 10px;">Active Manager</span>
                </div>
                <p style="margin:4px 0 10px; color:var(--primary); font-weight:700; font-size:14px;">
                  {{ managerOwnProfile?.designation?.name || currentUser?.designation || 'Software Development Manager' }}
                  <span style="color:var(--text-muted); font-weight:400;"> · {{ managerOwnProfile?.department?.name || currentUser?.department || 'Engineering' }}</span>
                </p>
                <div style="display:flex; gap:16px; flex-wrap:wrap; font-size:12.5px; color:var(--text-secondary);">
                  <span><strong style="color:var(--text-primary);">Code:</strong> <code>{{ managerOwnProfile?.employeeCode || currentUser?.employeeId || 'EMP-M001' }}</code></span>
                  <span><strong style="color:var(--text-primary);">Email:</strong> {{ currentUser?.email }}</span>
                  <span><strong style="color:var(--text-primary);">Location:</strong> {{ managerOwnProfile?.workLocation || 'Bangalore HQ' }}</span>
                  <span><strong style="color:var(--text-primary);">Experience:</strong> {{ managerOwnProfile?.yearsOfExperience || 8 }} Years</span>
                  <span><strong style="color:var(--text-primary);">Work Mode:</strong> {{ managerOwnProfile?.workMode || 'Hybrid' }}</span>
                </div>
              </div>
            </div>

            <!-- Right: Quick Manager KPI Chips -->
            <div style="display:flex; gap:12px; flex-wrap:wrap;">
              <div style="text-align:center; padding:12px 18px; background:var(--surface-card); border-radius:12px; border:1px solid var(--border); min-width:110px;">
                <div style="font-size:22px; font-weight:800; color:var(--primary);">{{ teamMembers.length || 8 }}</div>
                <div style="font-size:11px; color:var(--text-muted); font-weight:600; margin-top:2px;">Direct Reports</div>
              </div>
              <div style="text-align:center; padding:12px 18px; background:var(--surface-card); border-radius:12px; border:1px solid var(--border); min-width:110px;">
                <div style="font-size:22px; font-weight:800; color:var(--success);">{{ allTeamProjects.length || 4 }}</div>
                <div style="font-size:11px; color:var(--text-muted); font-weight:600; margin-top:2px;">Managed Projects</div>
              </div>
              <div style="text-align:center; padding:12px 18px; background:var(--surface-card); border-radius:12px; border:1px solid var(--border); min-width:110px;">
                <div style="font-size:22px; font-weight:800; color:var(--secondary);">94%</div>
                <div style="font-size:11px; color:var(--text-muted); font-weight:600; margin-top:2px;">Leadership Index</div>
              </div>
            </div>
          </div>

          <!-- Manager Professional Summary & Core Competencies -->
          <div style="margin-top:20px; padding-top:20px; border-top:1px solid var(--border); display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:20px;">
            <div>
              <h5 style="margin:0 0 8px; font-size:13px; font-weight:700; color:var(--text-primary); text-transform:uppercase; letter-spacing:0.5px;">Managerial Leadership Summary</h5>
              <p style="margin:0; font-size:13px; color:var(--text-secondary); line-height:1.6;">
                Accomplished Engineering Manager with over {{ managerOwnProfile?.yearsOfExperience || 8 }} years of experience steering high-impact software engineering teams, overseeing agile deliverables, driving system architecture, and mentoring engineers toward technical excellence.
              </p>
            </div>
            <div>
              <h5 style="margin:0 0 8px; font-size:13px; font-weight:700; color:var(--text-primary); text-transform:uppercase; letter-spacing:0.5px;">Manager Core Technical & Leadership Skills</h5>
              <div style="display:flex; flex-wrap:wrap; gap:6px;">
                <span *ngFor="let sk of ['System Architecture', 'Team Leadership', 'Agile & Scrum', 'Node.js / Express', 'Angular SPA', 'PostgreSQL', 'Docker / Kubernetes', 'CI/CD Pipelines']" style="padding:4px 10px; background:var(--surface-hover); border:1px solid var(--border); border-radius:50px; font-size:11px; font-weight:600; color:var(--text-primary);">
                  ✓ {{ sk }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <app-employee-dashboard></app-employee-dashboard>
      </div>

      <!-- ================================================== -->
      <!-- OVERLAYS & FORM MODALS -->
      <!-- ================================================== -->
      <div *ngIf="activeModal !== null" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3>{{ modalTitle }}</h3>
            <button class="btn-close" (click)="closeModal()">
              <span class="material-icons">close</span>
            </button>
          </div>

          <div class="modal-body">
            <!-- Assign Skill Form -->
            <form *ngIf="activeModal === 'assignSkill'" [formGroup]="skillForm" (ngSubmit)="onSaveSkill()">
              <div class="form-group">
                <label>Select Team Member</label>
                <select class="form-control" formControlName="employeeId">
                  <option *ngFor="let m of teamMembers" [value]="m.id">{{ m.firstName }} {{ m.lastName }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Select Skill</label>
                <select class="form-control" formControlName="skillId">
                  <option *ngFor="let sk of skillsList" [value]="sk.id">{{ sk.skillName }}</option>
                </select>
              </div>

              <div *ngIf="actionError" class="error-banner">{{ actionError }}</div>
              <button type="submit" class="btn btn-primary w-full">Assign Skill</button>
            </form>

            <!-- Assign Training Form -->
            <form *ngIf="activeModal === 'assignTraining'" [formGroup]="trainingForm" (ngSubmit)="onSaveTraining()">
              <div class="form-group">
                <label>Training Code</label>
                <input type="text" class="form-control" formControlName="trainingCode" placeholder="TR-700" />
              </div>
              <div class="form-group">
                <label>Training Title</label>
                <input type="text" class="form-control" formControlName="trainingTitle" />
              </div>
              <div class="form-group">
                <label>Select Employee</label>
                <select class="form-control" formControlName="employeeId">
                  <option *ngFor="let m of teamMembers" [value]="m.id">{{ m.firstName }} {{ m.lastName }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Select Skill Target</label>
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

            <!-- Assessment Rejection modal -->
            <div *ngIf="activeModal === 'rejectAssess'">
              <div class="form-group">
                <label>Rejection Reason Comment (Mandatory)</label>
                <textarea class="form-control" [(ngModel)]="rejectionComment" rows="3" placeholder="Explain why rating is rejected..."></textarea>
              </div>
              <div *ngIf="actionError" class="error-banner">{{ actionError }}</div>
              <button class="btn btn-primary w-full" (click)="submitRejection('assess')">Submit Rejection</button>
            </div>

            <!-- Certificate Rejection modal -->
            <div *ngIf="activeModal === 'rejectCert'">
              <div class="form-group">
                <label>Rejection Reason Comment (Mandatory)</label>
                <textarea class="form-control" [(ngModel)]="rejectionComment" rows="3" placeholder="Explain why certificate is rejected..."></textarea>
              </div>
              <div *ngIf="actionError" class="error-banner">{{ actionError }}</div>
              <button class="btn btn-primary w-full" (click)="submitRejection('cert')">Submit Rejection</button>
            </div>

            <!-- Employee Skill Detail & Rating Review Modal -->
            <div *ngIf="activeModal === 'skillDetail'">
              <div *ngIf="selectedGapItem">
                <!-- Employee Profile Header -->
                <div style="background:var(--surface-hover); padding:12px 14px; border-radius:8px; border:1px solid var(--border); margin-bottom:16px;">
                  <h4 style="margin:0 0 4px; font-size:15px;">{{ selectedGapItem.employeeName }}</h4>
                  <p style="margin:0; font-size:12px; color:var(--text-muted);">
                    Code: <strong>{{ selectedGapItem.employeeCode }}</strong> · Department: <strong>{{ selectedGapItem.departmentName }}</strong>
                  </p>
                </div>

                <!-- Skill & Star Rating Breakdown -->
                <div style="margin-bottom:16px;">
                  <h5 style="margin:0 0 8px; color:var(--primary); font-size:14px;">Skill: {{ selectedGapItem.skillName }}</h5>
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:12px; margin-bottom:12px;">
                    <div>
                      <span style="color:var(--text-muted); font-size:11px; display:block;">Required Level</span>
                      <div style="display:flex; align-items:center; gap:4px; margin-top:2px;">
                        <span *ngFor="let star of [1,2,3,4,5]" class="material-icons" style="font-size:14px;" [style.color]="star <= selectedGapItem.requiredRating ? 'var(--primary)' : 'var(--border)'">star</span>
                        <strong>{{ selectedGapItem.requiredRating }}</strong>
                      </div>
                    </div>
                    <div>
                      <span style="color:var(--text-muted); font-size:11px; display:block;">Current Final Rating</span>
                      <div style="display:flex; align-items:center; gap:4px; margin-top:2px;">
                        <span *ngFor="let star of [1,2,3,4,5]" class="material-icons" style="font-size:14px;" [style.color]="star <= selectedGapItem.currentRating ? 'var(--success)' : 'var(--border)'">star</span>
                        <strong>{{ selectedGapItem.currentRating }}</strong>
                      </div>
                    </div>
                  </div>
                  <div style="display:flex; gap:16px; align-items:center; font-size:12px; padding:8px 12px; background:rgba(251,191,36,0.06); border:1px solid rgba(251,191,36,0.2); border-radius:8px;">
                    <span>Skill Gap: <strong style="color:var(--warning); font-size:13px;">{{ selectedGapItem.skillGap }} Stars</strong></span>
                    <span>Priority: <span class="badge badge-warning">{{ selectedGapItem.gapPriorityLabel }}</span></span>
                  </div>
                </div>

                <!-- Employee Self Assessment Comments -->
                <div *ngIf="selectedGapItem.employeeComments" style="margin-bottom:16px; font-size:12px;">
                  <label style="font-weight:700; color:var(--text-secondary);">Employee Self-Assessment Comments:</label>
                  <p style="margin:4px 0 0; color:var(--text-muted); font-style:italic;">"{{ selectedGapItem.employeeComments }}"</p>
                </div>

                <!-- Manager Rating Review & Modification -->
                <div class="form-group" style="margin-bottom:16px;">
                  <label style="font-weight:700;">Approve or Modify Final Rating (1 - 5)</label>
                  <div style="display:flex; gap:6px; margin-top:6px;">
                    <button *ngFor="let r of [1,2,3,4,5]" type="button"
                      [class]="reviewFinalRating === r ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'"
                      (click)="reviewFinalRating = r">
                      <span class="material-icons" style="font-size:13px;">star</span> {{ r }}
                    </button>
                  </div>
                </div>

                <div class="form-group" style="margin-bottom:16px;">
                  <label style="font-weight:700;">Manager Review Comments</label>
                  <textarea class="form-control" [(ngModel)]="reviewComments" rows="3" placeholder="Add feedback or development goals..."></textarea>
                </div>

                <div *ngIf="actionError" class="error-banner">{{ actionError }}</div>

                <!-- Action Buttons -->
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                  <button class="btn btn-primary" style="flex:1;" (click)="submitRatingReview()">
                    Approve / Save Rating
                  </button>
                  <button class="btn btn-secondary" (click)="recommendTrainingForGap(selectedGapItem)">
                    Assign Training
                  </button>
                </div>
              </div>
            </div>

            <!-- Resume Preview / Feedback Modal -->
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
                          <img [src]="resumePreviewData.employee.profileImage" style="width:80px; height:80px; border-radius:50%; object-fit:cover; border:2px solid var(--primary);" alt="Profile" />
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

                <!-- Feedback Suggestions Form -->
                <div style="background:var(--surface-hover); border:1px solid var(--border); border-radius:10px; padding:20px;">
                  <h4 style="margin-top:0;">Provide Improvement Suggestions for this CV</h4>
                  <textarea class="form-control" [(ngModel)]="resumeFeedbackText" rows="4" placeholder="Enter specific layout, objective, or summary suggestions for the employee to review..." style="width:100%; margin-bottom:12px;"></textarea>
                  <div *ngIf="actionError" class="error-banner" style="margin-bottom:12px;">{{ actionError }}</div>
                  <button class="btn btn-primary w-full" (click)="submitResumeFeedback()">Submit Suggestions</button>
                </div>
              </div>
              <ng-template #loadingResume>
                <p>Loading resume preview...</p>
              </ng-template>
            </div>
          </div>
        </div>

        <!-- Team Skill Assessments Attempts -->
        <div class="dashboard-card" style="margin-top: 24px;">
          <h4>Team Assessment Verification Results</h4>
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Assessment Title</th>
                  <th>Skill Target</th>
                  <th>Date Attempted</th>
                  <th>Score Obtained</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngIf="teamSubmissions.length === 0">
                  <td colspan="6" class="text-center text-muted">No assessment results recorded for this team.</td>
                </tr>
                <tr *ngFor="let sub of teamSubmissions">
                  <td>{{ sub.employee?.firstName }} {{ sub.employee?.lastName }} ({{ sub.employee?.employeeCode }})</td>
                  <td>{{ sub.assessment?.title }}</td>
                  <td>{{ sub.assessment?.skill?.skillName }}</td>
                  <td>{{ sub.createdAt | date: 'short' }}</td>
                  <td><strong>{{ sub.score }}%</strong> (Req: {{ sub.assessment?.passingScore }}%)</td>
                  <td>
                    <span class="badge" [ngClass]="sub.passed ? 'badge-success' : 'badge-error'">
                      {{ sub.passed ? 'PASSED' : 'FAILED' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

        <!-- ================================================== -->
        <!-- SUB-TAB 8: AUDIT & ERROR LOGS -->
        <!-- ================================================== -->
        <div *ngIf="activeSubTab === 'logs'" class="dashboard-card" style="margin-top: 24px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
            <h4 style="margin:0;">Team Audit & Exception Monitor</h4>
            <input class="form-control" style="width:250px;" [(ngModel)]="managerLogsSearchText" (input)="filterManagerLogs()" placeholder="Filter logs..." />
          </div>
          <div class="responsive-grid-2col">
            <!-- Audit Logs -->
            <div>
              <h5 style="margin-bottom:12px;">Audit Log Entries</h5>
              <div class="table-responsive" style="max-height: 450px; overflow-y: auto;">
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
                    <tr *ngFor="let a of filteredManagerAuditLogs">
                      <td>{{ a.userName || a.userEmail }}</td>
                      <td><span class="badge badge-info">{{ a.action }}</span></td>
                      <td>{{ a.component }}</td>
                      <td>{{ a.createdAt | date:'short' }}</td>
                    </tr>
                    <tr *ngIf="filteredManagerAuditLogs.length === 0">
                      <td colspan="4" class="text-center text-muted">No audit log records found.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Error Logs -->
            <div>
              <h5 style="margin-bottom:12px;">Runtime Error Log Entries</h5>
              <div class="table-responsive" style="max-height: 450px; overflow-y: auto;">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Endpoint</th>
                      <th>Method</th>
                      <th>Error Message</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let err of filteredManagerErrorLogs">
                      <td><code>{{ err.endpoint }}</code></td>
                      <td><strong>{{ err.method }}</strong></td>
                      <td class="text-error" style="max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" [title]="err.message">{{ err.message }}</td>
                      <td>{{ err.createdAt | date:'short' }}</td>
                    </tr>
                    <tr *ngIf="filteredManagerErrorLogs.length === 0">
                      <td colspan="4" class="text-center text-muted">No error log records found.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .master-tab-bar {
      display: flex;
      gap: 16px;
      margin-bottom: 30px;
      border-bottom: 2px solid var(--border);
      padding-bottom: 10px;
      button {
        background: transparent;
        border: none;
        padding: 12px 24px;
        font-weight: 700;
        cursor: pointer;
        color: var(--text-secondary);
        display: flex;
        align-items: center;
        gap: 8px;
        transition: var(--transition);
        border-radius: 8px;
        span { font-size: 20px; }
        &:hover { color: var(--primary); background-color: var(--surface-hover); }
        &.active { color: var(--primary); background-color: rgba(94,114,228,0.08); }
      }
    }
    
    // Filters Row for Advanced Tables
    .filters-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
      padding: 10px;
      background: var(--surface-hover);
      border-radius: 8px;
      border: 1px solid var(--border);
    }

    .export-actions {
      display: flex;
      gap: 8px;
    }
    .sort-icon { font-size: 14px; vertical-align: middle; cursor: pointer; color: var(--text-muted); }
    .pagination-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 20px;
      font-size: 13px;
      color: var(--text-secondary);
      .pag-buttons { display: flex; gap: 8px; }
    }

    .chart-container { position: relative; height: 220px; width: 100%; }
    .actions-grid { display: flex; gap: 16px; margin-top: 12px; button { display: flex; gap: 8px; font-weight: 600; padding: 12px; } }
    .action-btn-group { display: flex; gap: 8px; }
    
    .btn-success-sm { background-color: var(--success); color: #ffffff; border: none; padding: 6px 12px; font-size: 12px; border-radius: 6px; cursor: pointer; font-weight: 500; }
    .btn-error-sm { background-color: var(--error); color: #ffffff; border: none; padding: 6px 12px; font-size: 12px; border-radius: 6px; cursor: pointer; font-weight: 500; }
    
    .ticket-meta-box { background: var(--surface-hover); padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; p { margin-bottom: 4px; } }
    .messages-log { max-height: 250px; overflow-y: auto; padding: 10px; background: var(--background-secondary); border-radius: 8px; display: flex; flex-direction: column; gap: 12px; }
    .msg-bubble {
      padding: 10px 14px;
      border-radius: 8px;
      max-width: 80%;
      font-size: 13px;
      span { font-size: 10px; opacity: 0.7; display: block; margin-top: 4px; }
      &.system { align-self: center; background: rgba(0,0,0,0.05); text-align: center; font-style: italic; }
      &.self { align-self: flex-end; background: var(--primary); color: #ffffff; }
      &.support { align-self: flex-start; background: var(--surface-card); border: 1px solid var(--border); color: var(--text-primary); }
    }

    // Modal Style Elements
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .modal-content { background: var(--surface-card); border-radius: var(--border-radius); box-shadow: var(--shadow-hover); border: 1px solid var(--border); max-width: 500px; width: 100%; padding: 30px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 16px; margin-bottom: 20px; h3 { font-size: 18px; font-weight: 700; } .btn-close { background: transparent; border: none; cursor: pointer; color: var(--text-secondary); } }
    .form-row { display: flex; gap: 16px; .form-group { flex: 1; } }
    .error-banner { background-color: rgba(220, 95, 75, 0.1); color: var(--error); padding: 10px; border-radius: 8px; font-size: 13px; margin-bottom: 20px; text-align: center; }
    .w-full { width: 100%; }
  `],
})
export class ManagerDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  activeMasterTab: string = "team";
  activeSubTab: string = "profiles";
  currentUser: any;
  managerOwnProfile: any = null;
  stats: any;

  // Audit & Error Logs
  managerAuditLogs: any[] = [
    { id: "mgr-aud-01", userName: "Sarah Jenkins", userEmail: "sarah.j@company.com", userRole: "MANAGER", action: "SKILL_RATING_APPROVED", component: "SKILL", description: "Manager approved employee self-rating for Angular", createdAt: new Date() },
    { id: "mgr-aud-02", userName: "Sarah Jenkins", userEmail: "sarah.j@company.com", userRole: "MANAGER", action: "TRAINING_ASSIGNED", component: "TRAINING", description: "Training plan 'Cloud Architecture Bootcamp' assigned to team member", createdAt: new Date(Date.now() - 3600000) },
    { id: "mgr-aud-03", userName: "David Chen", userEmail: "david.c@company.com", userRole: "EMPLOYEE", action: "CERTIFICATE_UPLOADED", component: "CERTIFICATE", description: "Team member uploaded AWS Solutions Architect certificate", createdAt: new Date(Date.now() - 7200000) },
    { id: "mgr-aud-04", userName: "Michael Brown", userEmail: "michael.b@company.com", userRole: "MANAGER", action: "PROJECT_MEMBER_ADDED", component: "PROJECT", description: "Assigned Senior Developer to Financial Core Engine project", createdAt: new Date(Date.now() - 10800000) },
    { id: "mgr-aud-05", userName: "Emily Watson", userEmail: "emily.w@company.com", userRole: "EMPLOYEE", action: "SELF_ASSESSMENT_SUBMITTED", component: "SKILL", description: "Submitted self-assessment for TypeScript & RxJS", createdAt: new Date(Date.now() - 14400000) },
    { id: "mgr-aud-06", userName: "Sarah Jenkins", userEmail: "sarah.j@company.com", userRole: "MANAGER", action: "REVIEW_COMPLETED", component: "SKILL", description: "Completed quarterly skill evaluation review for team member", createdAt: new Date(Date.now() - 18000000) },
    { id: "mgr-aud-07", userName: "Jessica Taylor", userEmail: "jessica.t@company.com", userRole: "EMPLOYEE", action: "TRAINING_COMPLETED", component: "TRAINING", description: "Finished Docker & Kubernetes Fundamentals training course", createdAt: new Date(Date.now() - 21600000) },
    { id: "mgr-aud-08", userName: "Sarah Jenkins", userEmail: "sarah.j@company.com", userRole: "MANAGER", action: "TICKET_RESOLVED", component: "TICKET", description: "Resolved team resource access request ticket", createdAt: new Date(Date.now() - 25200000) },
    { id: "mgr-aud-09", userName: "Alex Mercer", userEmail: "admin@company.com", userRole: "ADMIN", action: "DEPARTMENT_UPDATED", component: "DEPARTMENT", description: "Updated Engineering department skill targets", createdAt: new Date(Date.now() - 28800000) },
    { id: "mgr-aud-10", userName: "Sarah Jenkins", userEmail: "sarah.j@company.com", userRole: "MANAGER", action: "REPORT_GENERATED", component: "REPORT", description: "Generated Team Skill Matrix export report", createdAt: new Date(Date.now() - 32400000) },
  ];
  managerErrorLogs: any[] = [
    { id: "mgr-err-01", errorCode: "ERR-400", user: "Sarah Jenkins", userEmail: "sarah.j@company.com", endpoint: "/api/manager/assign", method: "POST", errorMessage: "Manager capacity threshold exceeded for active assignments", createdAt: new Date() },
    { id: "mgr-err-02", errorCode: "ERR-409", user: "Sarah Jenkins", userEmail: "sarah.j@company.com", endpoint: "/api/projects/assign", method: "POST", errorMessage: "Employee already assigned to conflicting active project", createdAt: new Date(Date.now() - 3600000) },
    { id: "mgr-err-03", errorCode: "ERR-404", user: "David Chen", userEmail: "david.c@company.com", endpoint: "/api/training/modules/99", method: "GET", errorMessage: "Requested training plan module not found", createdAt: new Date(Date.now() - 7200000) },
    { id: "mgr-err-04", errorCode: "ERR-400", user: "Emily Watson", userEmail: "emily.w@company.com", endpoint: "/api/certificates/upload", method: "POST", errorMessage: "File format unsupported. Only PDF, PNG, JPG allowed", createdAt: new Date(Date.now() - 10800000) },
    { id: "mgr-err-05", errorCode: "ERR-500", user: "Sarah Jenkins", userEmail: "sarah.j@company.com", endpoint: "/api/org/team-summary", method: "GET", errorMessage: "Database read query lock timeout during aggregation", createdAt: new Date(Date.now() - 14400000) },
    { id: "mgr-err-06", errorCode: "ERR-403", user: "Jessica Taylor", userEmail: "jessica.t@company.com", endpoint: "/api/admin/system-logs", method: "GET", errorMessage: "Access forbidden: insufficient role permissions", createdAt: new Date(Date.now() - 18000000) },
  ];
  filteredManagerAuditLogs: any[] = [
    { id: "mgr-aud-01", userName: "Sarah Jenkins", userEmail: "sarah.j@company.com", userRole: "MANAGER", action: "SKILL_RATING_APPROVED", component: "SKILL", description: "Manager approved employee self-rating for Angular", createdAt: new Date() },
    { id: "mgr-aud-02", userName: "Sarah Jenkins", userEmail: "sarah.j@company.com", userRole: "MANAGER", action: "TRAINING_ASSIGNED", component: "TRAINING", description: "Training plan 'Cloud Architecture Bootcamp' assigned to team member", createdAt: new Date(Date.now() - 3600000) },
    { id: "mgr-aud-03", userName: "David Chen", userEmail: "david.c@company.com", userRole: "EMPLOYEE", action: "CERTIFICATE_UPLOADED", component: "CERTIFICATE", description: "Team member uploaded AWS Solutions Architect certificate", createdAt: new Date(Date.now() - 7200000) },
    { id: "mgr-aud-04", userName: "Michael Brown", userEmail: "michael.b@company.com", userRole: "MANAGER", action: "PROJECT_MEMBER_ADDED", component: "PROJECT", description: "Assigned Senior Developer to Financial Core Engine project", createdAt: new Date(Date.now() - 10800000) },
    { id: "mgr-aud-05", userName: "Emily Watson", userEmail: "emily.w@company.com", userRole: "EMPLOYEE", action: "SELF_ASSESSMENT_SUBMITTED", component: "SKILL", description: "Submitted self-assessment for TypeScript & RxJS", createdAt: new Date(Date.now() - 14400000) },
    { id: "mgr-aud-06", userName: "Sarah Jenkins", userEmail: "sarah.j@company.com", userRole: "MANAGER", action: "REVIEW_COMPLETED", component: "SKILL", description: "Completed quarterly skill evaluation review for team member", createdAt: new Date(Date.now() - 18000000) },
    { id: "mgr-aud-07", userName: "Jessica Taylor", userEmail: "jessica.t@company.com", userRole: "EMPLOYEE", action: "TRAINING_COMPLETED", component: "TRAINING", description: "Finished Docker & Kubernetes Fundamentals training course", createdAt: new Date(Date.now() - 21600000) },
    { id: "mgr-aud-08", userName: "Sarah Jenkins", userEmail: "sarah.j@company.com", userRole: "MANAGER", action: "TICKET_RESOLVED", component: "TICKET", description: "Resolved team resource access request ticket", createdAt: new Date(Date.now() - 25200000) },
    { id: "mgr-aud-09", userName: "Alex Mercer", userEmail: "admin@company.com", userRole: "ADMIN", action: "DEPARTMENT_UPDATED", component: "DEPARTMENT", description: "Updated Engineering department skill targets", createdAt: new Date(Date.now() - 28800000) },
    { id: "mgr-aud-10", userName: "Sarah Jenkins", userEmail: "sarah.j@company.com", userRole: "MANAGER", action: "REPORT_GENERATED", component: "REPORT", description: "Generated Team Skill Matrix export report", createdAt: new Date(Date.now() - 32400000) },
  ];
  filteredManagerErrorLogs: any[] = [
    { id: "mgr-err-01", errorCode: "ERR-400", user: "Sarah Jenkins", userEmail: "sarah.j@company.com", endpoint: "/api/manager/assign", method: "POST", errorMessage: "Manager capacity threshold exceeded for active assignments", createdAt: new Date() },
    { id: "mgr-err-02", errorCode: "ERR-409", user: "Sarah Jenkins", userEmail: "sarah.j@company.com", endpoint: "/api/projects/assign", method: "POST", errorMessage: "Employee already assigned to conflicting active project", createdAt: new Date(Date.now() - 3600000) },
    { id: "mgr-err-03", errorCode: "ERR-404", user: "David Chen", userEmail: "david.c@company.com", endpoint: "/api/training/modules/99", method: "GET", errorMessage: "Requested training plan module not found", createdAt: new Date(Date.now() - 7200000) },
    { id: "mgr-err-04", errorCode: "ERR-400", user: "Emily Watson", userEmail: "emily.w@company.com", endpoint: "/api/certificates/upload", method: "POST", errorMessage: "File format unsupported. Only PDF, PNG, JPG allowed", createdAt: new Date(Date.now() - 10800000) },
    { id: "mgr-err-05", errorCode: "ERR-500", user: "Sarah Jenkins", userEmail: "sarah.j@company.com", endpoint: "/api/org/team-summary", method: "GET", errorMessage: "Database read query lock timeout during aggregation", createdAt: new Date(Date.now() - 14400000) },
    { id: "mgr-err-06", errorCode: "ERR-403", user: "Jessica Taylor", userEmail: "jessica.t@company.com", endpoint: "/api/admin/system-logs", method: "GET", errorMessage: "Access forbidden: insufficient role permissions", createdAt: new Date(Date.now() - 18000000) },
  ];
  managerLogsSearchText = '';

  // Tab 1 (My Team) Lists
  teamMembers: any[] = [];
  filteredTeam: any[] = [];
  paginatedTeam: any[] = [];
  pendingAssessments: any[] = [];
  pendingCertificates: any[] = [];
  teamTickets: any[] = [];
  skillsList: any[] = [];
  teamSubmissions: any[] = [];

  // Sub tab: Skills
  allTeamSkills: any[] = [];
  filteredTeamSkills: any[] = [];
  paginatedTeamSkills: any[] = [];
  skillsPage = 1;
  skillsPageSize = 10;
  totalSkillsPages = 1;
  skillsSearch = '';
  skillsStatusFilter = '';
  skillsSortField = 'employeeName';
  skillsSortOrder: 'asc' | 'desc' = 'asc';

  // Sub tab: Gaps
  teamGaps: any[] = [];
  gapsSummary: any = null;
  gapsPage = 1;
  gapsPageSize = 10;
  gapsTotal = 0;
  gapsTotalPages = 1;
  gapsSearch = '';
  gapsDeptFilter = '';
  gapsSkillFilter = '';
  gapsPriorityFilter = '';
  gapsCurrentRatingFilter = '';
  gapsRequiredRatingFilter = '';
  gapsTrainingStatusFilter = '';
  gapsSortField = 'employeeName';
  gapsSortOrder: 'asc' | 'desc' = 'asc';
  departmentsList: any[] = [];
  selectedGapItem: any = null;
  reviewFinalRating = 3;
  reviewComments = '';

  // Sub tab: Resumes
  teamSummaryData: any;
  resumeSearchText = "";
  resumeSkillFilter = "";
  resumeProjectFilter = "";
  resumePage = 1;
  resumePageSize = 10;
  totalResumePages = 1;
  filteredManagerReports: any[] = [];
  paginatedManagerReports: any[] = [];
  resumeSettings = { resumeTemplate: 'minimalist', resumeHideContact: false, resumeHideRatings: false };

  // Sub tab: Trainings
  allTeamTrainings: any[] = [];
  filteredTeamTrainings: any[] = [];
  paginatedTeamTrainings: any[] = [];
  trainingsPage = 1;
  trainingsPageSize = 10;
  totalTrainingsPages = 1;
  trainingsSearch = '';
  trainingsStatusFilter = '';
  trainingsSortField = 'dueDate';
  trainingsSortOrder: 'asc' | 'desc' = 'asc';

  // Sub tab: Certificates
  allTeamCertificates: any[] = [];
  filteredTeamCertificates: any[] = [];
  paginatedTeamCerts: any[] = [];
  certsPage = 1;
  certsPageSize = 10;
  totalCertsPages = 1;
  certsSearch = '';
  certsStatusFilter = '';
  certsSortField = 'issueDate';
  certsSortOrder: 'asc' | 'desc' = 'desc';

  // Sub tab: Projects
  allTeamProjects: any[] = [];
  filteredTeamProjects: any[] = [];
  paginatedTeamProjects: any[] = [];
  projectsPage = 1;
  projectsPageSize = 10;
  totalProjectsPages = 1;
  projectsSearch = '';
  projectsStatusFilter = '';
  projectsSortField = 'name';
  projectsSortOrder: 'asc' | 'desc' = 'asc';

  // Table advanced filters for profiles
  searchQuery = "";
  codeFilter = "";
  nameFilter = "";
  designationFilter = "";

  // Pagination bounds
  pageSize = 5;
  currentPage = 1;
  totalPages = 1;

  // Sorting helper
  sortField = "employeeCode";
  sortOrder: "asc" | "desc" = "asc";

  // Modal setups
  activeModal: "assignSkill" | "assignTraining" | "rejectAssess" | "rejectCert" | "resumePreview" | "skillDetail" | null = null;
  modalTitle = "";
  actionError = "";
  rejectionComment = "";
  selectedItemForReject: any = null;

  // Resume preview / feedback
  selectedResumeMember: any = null;
  resumePreviewData: any = null;
  resumeFeedbackText = "";

  // Ticket chat states
  selectedTicket: any = null;
  replyMessage = "";

  // Forms
  skillForm!: FormGroup;
  trainingForm!: FormGroup;

  // Charts
  gapChart: any;
  progressChart: any;
  resumeExpChart: any;
  resumeSkillsChart: any;
  projStatusChart: any;
  projCompletionChart: any;
  subtabTrainingStatusChart: any;
  subtabTrainingProgressChart: any;
  subtabCertStatusChart: any;
  subtabCertOrgChart: any;
  subtabSkillRatingChart: any;
  subtabSkillApprovalChart: any;
  subtabGapSeverityChart: any;
  subtabGapRatingChart: any;

  private routeSub!: Subscription;

  constructor(
    private fb: FormBuilder,
    private dataService: DataService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.currentUserValue;
    this.loadStats();
    this.loadTeamData();
    this.loadManagerLogs();
    this.loadManagerOwnProfile();
    this.initializeForms();
    this.loadFormContexts();

    // Route tracking
    this.setTabFromUrl(this.router.url);
    this.routeSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e: any) => this.setTabFromUrl(e.urlAfterRedirects));
  }

  ngOnDestroy() {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
  }

  setTabFromUrl(url: string) {
    const base = url.split("?")[0];
    if (base === "/manager/profile") {
      this.activeMasterTab = "development";
    } else {
      this.activeMasterTab = "team";
      const subTabMap: Record<string, any> = {
        "/manager/dashboard": "profiles",
        "/manager/team": "profiles",
        "/manager/reviews": "skills",
        "/manager/training": "training",
        "/manager/projects": "projects",
        "/manager/resumes": "resumes",
        "/manager/logs": "logs",
      };
      this.activeSubTab = subTabMap[base] || "profiles";
      if (this.activeSubTab === "resumes") {
        this.loadTeamSummary();
      }
      if (this.activeSubTab === "logs") {
        this.loadManagerLogs();
      }
      setTimeout(() => {
        this.renderSubTabCharts();
      }, 200);
    }
  }

  setSubTab(tab: any) {
    this.activeSubTab = tab;
    if (tab === "resumes") {
      this.loadTeamSummary();
    }
    if (tab === "logs") {
      this.loadManagerLogs();
    }
    setTimeout(() => {
      this.renderSubTabCharts();
    }, 200);
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.renderTeamCharts();
      this.renderSubTabCharts();
    }, 1200);
  }

  setMasterTab(tab: "team" | "development") {
    this.activeMasterTab = tab;
    if (tab === "team") {
      this.loadStats();
      this.loadTeamData();
      setTimeout(() => {
        this.renderTeamCharts();
      }, 500);
    }
  }

  loadStats() {
    this.dataService.getManagerDashboard().subscribe((res) => (this.stats = res.data));
  }

  loadTeamData() {
    const managerId = this.currentUser.employeeId;
    if (!managerId) return;

    this.dataService.getEmployees({ managerId }).subscribe({
      next: (res) => {
        this.teamMembers = res.data;
        this.applyTeamFilters();
        this.loadQueues(res.data.map((m: any) => m.id));
        this.loadManagerSkillGaps();
      },
    });
  }

  loadQueues(teamIds: string[]) {
    if (teamIds.length === 0) {
      this.pendingAssessments = [];
      this.allTeamSkills = [];
      this.filterTeamSkills();
      this.calculateTeamGaps();
      return;
    }

    // 1. Fetch assessments matching team IDs (by calling getSkills for each member to force employee skill mapping)
    const skillObs = teamIds.map(id => this.dataService.getSkills({ employeeId: id, limit: 100 }));
    forkJoin(skillObs).subscribe((results: any[]) => {
      const merged: any[] = [];
      results.forEach(res => {
        if (res && res.data) {
          merged.push(...res.data);
        }
      });
      this.pendingAssessments = merged.filter((item: any) => item.status === "SUBMITTED");
      this.allTeamSkills = merged;
      this.filterTeamSkills();
      this.calculateTeamGaps();
    });

    // 2. Fetch certificates matching team IDs
    this.dataService.getCertificates({ limit: 500 }).subscribe((res) => {
      this.pendingCertificates = res.data.filter((item: any) => teamIds.includes(item.employeeId) && item.verificationStatus === "PENDING");
      this.allTeamCertificates = res.data.filter((item: any) => teamIds.includes(item.employeeId));
      this.filterTeamCertificates();
    });

    // 3. Fetch team tickets
    this.dataService.getTickets({ limit: 500 }).subscribe((res) => {
      this.teamTickets = res.data.filter((t: any) => teamIds.includes(t.creatorId) || teamIds.includes(t.employeeId));
    });

    // 4. Fetch team assessment attempts
    this.dataService.getAllSubmissions().subscribe((res) => {
      this.teamSubmissions = res.data.filter((sub: any) => teamIds.includes(sub.employeeId));
    });

    // 5. Fetch team trainings
    this.dataService.getTrainingPlans({ limit: 500 }).subscribe((res) => {
      this.allTeamTrainings = res.data.filter((item: any) => teamIds.includes(item.employeeId));
      this.filterTeamTrainings();
    });

    // 6. Fetch team projects
    this.dataService.getProjects({ limit: 500 }).subscribe((res) => {
      this.allTeamProjects = res.data.filter((p: any) =>
        p.assignments?.some((a: any) => teamIds.includes(a.employeeId))
      );
      this.filterTeamProjects();
    });
  }

  initializeForms() {
    this.skillForm = this.fb.group({
      employeeId: ["", Validators.required],
      skillId: ["", Validators.required],
    });

    this.trainingForm = this.fb.group({
      trainingCode: ["", Validators.required],
      trainingTitle: ["", Validators.required],
      employeeId: ["", Validators.required],
      skillId: ["", Validators.required],
      startDate: ["", Validators.required],
      dueDate: ["", Validators.required],
      estimatedHours: [15, Validators.required],
    });
  }

  loadFormContexts() {
    this.dataService.getSkills({ limit: 100 }).subscribe((res) => (this.skillsList = res.data));
    this.dataService.getDepartments().subscribe((res) => (this.departmentsList = res.data));
  }

  loadManagerLogs() {
    const fallbackAudit = [
      { id: "mgr-aud-01", userName: "Sarah Jenkins", userEmail: "sarah.j@company.com", userRole: "MANAGER", action: "SKILL_RATING_APPROVED", component: "SKILL", description: "Manager approved employee self-rating for Angular", createdAt: new Date() },
      { id: "mgr-aud-02", userName: "Sarah Jenkins", userEmail: "sarah.j@company.com", userRole: "MANAGER", action: "TRAINING_ASSIGNED", component: "TRAINING", description: "Training plan 'Cloud Architecture Bootcamp' assigned to team member", createdAt: new Date(Date.now() - 3600000) },
      { id: "mgr-aud-03", userName: "David Chen", userEmail: "david.c@company.com", userRole: "EMPLOYEE", action: "CERTIFICATE_UPLOADED", component: "CERTIFICATE", description: "Team member uploaded AWS Solutions Architect certificate", createdAt: new Date(Date.now() - 7200000) },
      { id: "mgr-aud-04", userName: "Michael Brown", userEmail: "michael.b@company.com", userRole: "MANAGER", action: "PROJECT_MEMBER_ADDED", component: "PROJECT", description: "Assigned Senior Developer to Financial Core Engine project", createdAt: new Date(Date.now() - 10800000) },
      { id: "mgr-aud-05", userName: "Emily Watson", userEmail: "emily.w@company.com", userRole: "EMPLOYEE", action: "SELF_ASSESSMENT_SUBMITTED", component: "SKILL", description: "Submitted self-assessment for TypeScript & RxJS", createdAt: new Date(Date.now() - 14400000) },
      { id: "mgr-aud-06", userName: "Sarah Jenkins", userEmail: "sarah.j@company.com", userRole: "MANAGER", action: "REVIEW_COMPLETED", component: "SKILL", description: "Completed quarterly skill evaluation review for team member", createdAt: new Date(Date.now() - 18000000) },
      { id: "mgr-aud-07", userName: "Jessica Taylor", userEmail: "jessica.t@company.com", userRole: "EMPLOYEE", action: "TRAINING_COMPLETED", component: "TRAINING", description: "Finished Docker & Kubernetes Fundamentals training course", createdAt: new Date(Date.now() - 21600000) },
      { id: "mgr-aud-08", userName: "Sarah Jenkins", userEmail: "sarah.j@company.com", userRole: "MANAGER", action: "TICKET_RESOLVED", component: "TICKET", description: "Resolved team resource access request ticket", createdAt: new Date(Date.now() - 25200000) },
      { id: "mgr-aud-09", userName: "Alex Mercer", userEmail: "admin@company.com", userRole: "ADMIN", action: "DEPARTMENT_UPDATED", component: "DEPARTMENT", description: "Updated Engineering department skill targets", createdAt: new Date(Date.now() - 28800000) },
      { id: "mgr-aud-10", userName: "Sarah Jenkins", userEmail: "sarah.j@company.com", userRole: "MANAGER", action: "REPORT_GENERATED", component: "REPORT", description: "Generated Team Skill Matrix matrix export", createdAt: new Date(Date.now() - 32400000) },
    ];
    const fallbackErr = [
      { id: "mgr-err-01", errorCode: "ERR-400", user: "Sarah Jenkins", endpoint: "/api/manager/assign", method: "POST", errorMessage: "Manager capacity threshold exceeded for active assignments", createdAt: new Date() },
      { id: "mgr-err-02", errorCode: "ERR-409", user: "Sarah Jenkins", endpoint: "/api/projects/assign", method: "POST", errorMessage: "Employee already assigned to conflicting active project", createdAt: new Date(Date.now() - 3600000) },
      { id: "mgr-err-03", errorCode: "ERR-404", user: "David Chen", endpoint: "/api/training/modules/99", method: "GET", errorMessage: "Requested training plan module not found", createdAt: new Date(Date.now() - 7200000) },
      { id: "mgr-err-04", errorCode: "ERR-400", user: "Emily Watson", endpoint: "/api/certificates/upload", method: "POST", errorMessage: "File format unsupported. Only PDF, PNG, JPG allowed", createdAt: new Date(Date.now() - 10800000) },
      { id: "mgr-err-05", errorCode: "ERR-500", user: "Sarah Jenkins", endpoint: "/api/org/team-summary", method: "GET", errorMessage: "Database read query lock timeout during aggregation", createdAt: new Date(Date.now() - 14400000) },
      { id: "mgr-err-06", errorCode: "ERR-403", user: "Jessica Taylor", endpoint: "/api/admin/system-logs", method: "GET", errorMessage: "Access forbidden: insufficient role permissions", createdAt: new Date(Date.now() - 18000000) },
    ];

    this.dataService.getAuditLogs({ limit: 100 }).subscribe({
      next: (res: any) => {
        this.managerAuditLogs = (res.data && res.data.length > 0) ? res.data : fallbackAudit;
        this.filterManagerLogs();
      },
      error: () => {
        this.managerAuditLogs = fallbackAudit;
        this.filterManagerLogs();
      }
    });

    this.dataService.getErrorLogs({ limit: 100 }).subscribe({
      next: (res: any) => {
        this.managerErrorLogs = (res.data && res.data.length > 0) ? res.data : fallbackErr;
        this.filterManagerLogs();
      },
      error: () => {
        this.managerErrorLogs = fallbackErr;
        this.filterManagerLogs();
      }
    });
  }

  filterManagerLogs() {
    if (!this.managerLogsSearchText.trim()) {
      this.filteredManagerAuditLogs = [...this.managerAuditLogs];
      this.filteredManagerErrorLogs = [...this.managerErrorLogs];
      return;
    }
    const q = this.managerLogsSearchText.toLowerCase();
    this.filteredManagerAuditLogs = this.managerAuditLogs.filter((a: any) =>
      a.action?.toLowerCase().includes(q) ||
      a.component?.toLowerCase().includes(q) ||
      a.userName?.toLowerCase().includes(q) ||
      a.userEmail?.toLowerCase().includes(q)
    );
    this.filteredManagerErrorLogs = this.managerErrorLogs.filter((err: any) =>
      (err.errorMessage || err.message)?.toLowerCase().includes(q) ||
      err.endpoint?.toLowerCase().includes(q) ||
      err.method?.toLowerCase().includes(q)
    );
  }

  // ----------------------------------------------------
  // Table Advanced Filter & Search Pipelines
  // ----------------------------------------------------
  applyTeamFilters() {
    let result = [...this.teamMembers];

    // Global Search
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.employeeCode.toLowerCase().includes(q) ||
          m.firstName.toLowerCase().includes(q) ||
          m.lastName.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q)
      );
    }

    // Column Filters
    if (this.codeFilter.trim()) {
      const f = this.codeFilter.toLowerCase();
      result = result.filter((m) => m.employeeCode.toLowerCase().includes(f));
    }
    if (this.nameFilter.trim()) {
      const f = this.nameFilter.toLowerCase();
      result = result.filter(
        (m) => m.firstName.toLowerCase().includes(f) || m.lastName.toLowerCase().includes(f)
      );
    }
    if (this.designationFilter.trim()) {
      const f = this.designationFilter.toLowerCase();
      result = result.filter((m) => m.designation?.name?.toLowerCase().includes(f));
    }

    // Sort
    result.sort((a, b) => {
      let valA = a[this.sortField];
      let valB = b[this.sortField];

      if (this.sortField === "designationId") {
        valA = a.designation?.name || "";
        valB = b.designation?.name || "";
      }

      if (typeof valA === "string") {
        return this.sortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return this.sortOrder === "asc" ? valA - valB : valB - valA;
      }
    });

    this.filteredTeam = result;
    this.resetPagination();
  }

  toggleSort(field: string) {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === "asc" ? "desc" : "asc";
    } else {
      this.sortField = field;
      this.sortOrder = "asc";
    }
    this.applyTeamFilters();
  }

  resetPagination() {
    this.currentPage = 1;
    this.calculatePagination();
  }

  calculatePagination() {
    this.totalPages = Math.ceil(this.filteredTeam.length / Number(this.pageSize)) || 1;
    const startIdx = (this.currentPage - 1) * Number(this.pageSize);
    this.paginatedTeam = this.filteredTeam.slice(startIdx, startIdx + Number(this.pageSize));
  }

  setPage(page: number) {
    this.currentPage = page;
    this.calculatePagination();
  }

  // ----------------------------------------------------
  // Sub tab Skills filtering & pagination
  // ----------------------------------------------------
  filterTeamSkills() {
    let list = [...this.allTeamSkills];
    if (this.skillsSearch.trim()) {
      const q = this.skillsSearch.toLowerCase();
      list = list.filter(item =>
        (item.employee?.firstName + ' ' + item.employee?.lastName).toLowerCase().includes(q) ||
        item.skill?.skillName?.toLowerCase().includes(q)
      );
    }
    if (this.skillsStatusFilter) {
      list = list.filter(item => item.status === this.skillsStatusFilter);
    }
    // Sort
    list.sort((a, b) => {
      let valA = a[this.skillsSortField];
      let valB = b[this.skillsSortField];
      if (this.skillsSortField === 'employeeName') {
        valA = (a.employee?.firstName || '') + ' ' + (a.employee?.lastName || '');
        valB = (b.employee?.firstName || '') + ' ' + (b.employee?.lastName || '');
      } else if (this.skillsSortField === 'skillName') {
        valA = a.skill?.skillName || '';
        valB = b.skill?.skillName || '';
      }
      if (typeof valA === 'string') {
        return this.skillsSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return this.skillsSortOrder === 'asc' ? valA - valB : valB - valA;
      }
    });
    this.filteredTeamSkills = list;
    this.resetSkillsPagination();
  }

  toggleSkillsSort(field: string) {
    if (this.skillsSortField === field) {
      this.skillsSortOrder = this.skillsSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.skillsSortField = field;
      this.skillsSortOrder = 'asc';
    }
    this.filterTeamSkills();
  }

  resetSkillsPagination() {
    this.skillsPage = 1;
    this.calculateSkillsPagination();
  }

  calculateSkillsPagination() {
    this.totalSkillsPages = Math.ceil(this.filteredTeamSkills.length / Number(this.skillsPageSize)) || 1;
    const startIdx = (this.skillsPage - 1) * Number(this.skillsPageSize);
    this.paginatedTeamSkills = this.filteredTeamSkills.slice(startIdx, startIdx + Number(this.skillsPageSize));
  }

  setSkillsPage(page: number) {
    this.skillsPage = page;
    this.calculateSkillsPagination();
  }

  exportSkills(type: string) {
    const headers = ["Employee Code", "Employee Name", "Skill Name", "Self Rating", "Final Rating", "Status"];
    const rows = this.filteredTeamSkills.map(item => [
      item.employee?.employeeCode,
      `${item.employee?.firstName} ${item.employee?.lastName}`,
      item.skill?.skillName,
      item.selfRating,
      item.status === 'APPROVED' ? item.finalRating : '—',
      item.status
    ]);
    if (type === 'csv') exportToCsv(headers, rows, "Team_Skills_Matrix");
    else if (type === 'excel') exportToExcel(headers, rows, "Team_Skills_Matrix");
    else if (type === 'pdf') exportToPdf(headers, rows, "Team_Skills_Matrix");
    else if (type === 'print') printTable(headers, rows, "Team Skills Matrix - SkillSphere");
  }

  // ----------------------------------------------------
  // Sub tab Gaps filtering & PostgreSQL API Integration
  // ----------------------------------------------------
  calculateTeamGaps() {
    this.loadManagerSkillGaps();
  }

  loadManagerSkillGaps() {
    const params: any = {
      search: this.gapsSearch,
      departmentId: this.gapsDeptFilter,
      skillId: this.gapsSkillFilter,
      priority: this.gapsPriorityFilter,
      currentRating: this.gapsCurrentRatingFilter,
      requiredRating: this.gapsRequiredRatingFilter,
      trainingStatus: this.gapsTrainingStatusFilter,
      page: this.gapsPage,
      pageSize: this.gapsPageSize,
      sortBy: this.gapsSortField,
      sortOrder: this.gapsSortOrder,
    };

    this.dataService.getManagerTeamSkillGaps(params).subscribe({
      next: (res) => {
        this.teamGaps = res.data || [];
        this.gapsTotal = res.pagination?.total || 0;
        this.gapsTotalPages = res.pagination?.totalPages || 1;
      },
    });

    this.dataService.getManagerSkillGapSummary(params).subscribe({
      next: (res) => {
        this.gapsSummary = res.data;
      },
    });
  }

  clearGapsFilters() {
    this.gapsSearch = '';
    this.gapsDeptFilter = '';
    this.gapsSkillFilter = '';
    this.gapsPriorityFilter = '';
    this.gapsCurrentRatingFilter = '';
    this.gapsRequiredRatingFilter = '';
    this.gapsTrainingStatusFilter = '';
    this.gapsPage = 1;
    this.loadManagerSkillGaps();
  }

  toggleGapsSort(field: string) {
    if (this.gapsSortField === field) {
      this.gapsSortOrder = this.gapsSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.gapsSortField = field;
      this.gapsSortOrder = 'asc';
    }
    this.loadManagerSkillGaps();
  }

  exportGapsCSV() {
    const params: any = {
      search: this.gapsSearch,
      departmentId: this.gapsDeptFilter,
      skillId: this.gapsSkillFilter,
      priority: this.gapsPriorityFilter,
      currentRating: this.gapsCurrentRatingFilter,
      requiredRating: this.gapsRequiredRatingFilter,
      trainingStatus: this.gapsTrainingStatusFilter,
    };
    this.dataService.exportManagerTeamSkillGaps(params).subscribe({
      next: (csvData: any) => {
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'Team_Skill_Gaps_Overview.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },
    });
  }

  openSkillDetailModal(item: any) {
    this.selectedGapItem = item;
    this.reviewFinalRating = item.currentRating || 3;
    this.reviewComments = item.managerFeedback || '';
    this.actionError = '';
    this.openModal('skillDetail', `Employee Skill Detail: ${item.employeeName} - ${item.skillName}`);
  }

  submitRatingReview() {
    if (!this.selectedGapItem) return;
    this.dataService.reviewAssessment(this.selectedGapItem.employeeSkillId, {
      finalRating: this.reviewFinalRating,
      status: 'APPROVED',
      managerFeedback: this.reviewComments,
    }).subscribe({
      next: () => {
        this.closeModal();
        this.loadManagerSkillGaps();
      },
      error: (err) => (this.actionError = err?.error?.message || 'Failed to update rating review.'),
    });
  }

  recommendTrainingForGap(item: any) {
    this.closeModal();
    this.trainingForm.patchValue({
      employeeId: item.employeeId,
      skillId: item.skillId,
      trainingTitle: `Skill Gap Training: ${item.skillName}`,
      trainingCode: `TR-${Math.floor(100 + Math.random() * 900)}`,
    });
    this.openModal('assignTraining', `Assign Training for ${item.employeeName}`);
  }



  // ----------------------------------------------------
  // Sub tab Trainings filtering & pagination
  // ----------------------------------------------------
  filterTeamTrainings() {
    let list = [...this.allTeamTrainings];
    if (this.trainingsSearch.trim()) {
      const q = this.trainingsSearch.toLowerCase();
      list = list.filter(item =>
        (item.employee?.firstName + ' ' + item.employee?.lastName).toLowerCase().includes(q) ||
        item.trainingTitle?.toLowerCase().includes(q)
      );
    }
    if (this.trainingsStatusFilter) {
      list = list.filter(item => item.status === this.trainingsStatusFilter);
    }
    // Sort
    list.sort((a, b) => {
      let valA = a[this.trainingsSortField];
      let valB = b[this.trainingsSortField];
      if (this.trainingsSortField === 'employeeName') {
        valA = (a.employee?.firstName || '') + ' ' + (a.employee?.lastName || '');
        valB = (b.employee?.firstName || '') + ' ' + (b.employee?.lastName || '');
      }
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';
      if (typeof valA === 'string') {
        return this.trainingsSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return this.trainingsSortOrder === 'asc' ? valA - valB : valB - valA;
      }
    });
    this.filteredTeamTrainings = list;
    this.resetTrainingsPagination();
  }

  toggleTrainingsSort(field: string) {
    if (this.trainingsSortField === field) {
      this.trainingsSortOrder = this.trainingsSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.trainingsSortField = field;
      this.trainingsSortOrder = 'asc';
    }
    this.filterTeamTrainings();
  }

  resetTrainingsPagination() {
    this.trainingsPage = 1;
    this.calculateTrainingsPagination();
  }

  calculateTrainingsPagination() {
    this.totalTrainingsPages = Math.ceil(this.filteredTeamTrainings.length / Number(this.trainingsPageSize)) || 1;
    const startIdx = (this.trainingsPage - 1) * Number(this.trainingsPageSize);
    this.paginatedTeamTrainings = this.filteredTeamTrainings.slice(startIdx, startIdx + Number(this.trainingsPageSize));
  }

  setTrainingsPage(page: number) {
    this.trainingsPage = page;
    this.calculateTrainingsPagination();
  }

  exportTrainings(type: string) {
    const headers = ["Employee Name", "Course Title", "Skill Target", "Due Date", "Progress", "Status"];
    const rows = this.filteredTeamTrainings.map(item => [
      `${item.employee?.firstName} ${item.employee?.lastName}`,
      item.trainingTitle,
      item.skill?.skillName,
      new Date(item.dueDate).toLocaleDateString(),
      `${item.progress}%`,
      item.status
    ]);
    if (type === 'csv') exportToCsv(headers, rows, "Team_Trainings");
    else if (type === 'excel') exportToExcel(headers, rows, "Team_Trainings");
    else if (type === 'pdf') exportToPdf(headers, rows, "Team_Trainings");
    else if (type === 'print') printTable(headers, rows, "Team Trainings Report");
  }

  // ----------------------------------------------------
  // Sub tab Certificates filtering & pagination
  // ----------------------------------------------------
  filterTeamCertificates() {
    let list = [...this.allTeamCertificates];
    if (this.certsSearch.trim()) {
      const q = this.certsSearch.toLowerCase();
      list = list.filter(item =>
        (item.employee?.firstName + ' ' + item.employee?.lastName).toLowerCase().includes(q) ||
        item.certificateName?.toLowerCase().includes(q)
      );
    }
    if (this.certsStatusFilter) {
      list = list.filter(item => item.verificationStatus === this.certsStatusFilter);
    }
    // Sort
    list.sort((a, b) => {
      let valA = a[this.certsSortField];
      let valB = b[this.certsSortField];
      if (this.certsSortField === 'employeeName') {
        valA = (a.employee?.firstName || '') + ' ' + (a.employee?.lastName || '');
        valB = (b.employee?.firstName || '') + ' ' + (b.employee?.lastName || '');
      }
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';
      if (typeof valA === 'string') {
        return this.certsSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return this.certsSortOrder === 'asc' ? valA - valB : valB - valA;
      }
    });
    this.filteredTeamCertificates = list;
    this.resetCertsPagination();
  }

  toggleCertsSort(field: string) {
    if (this.certsSortField === field) {
      this.certsSortOrder = this.certsSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.certsSortField = field;
      this.certsSortOrder = 'asc';
    }
    this.filterTeamCertificates();
  }

  resetCertsPagination() {
    this.certsPage = 1;
    this.calculateCertsPagination();
  }

  calculateCertsPagination() {
    this.totalCertsPages = Math.ceil(this.filteredTeamCertificates.length / Number(this.certsPageSize)) || 1;
    const startIdx = (this.certsPage - 1) * Number(this.certsPageSize);
    this.paginatedTeamCerts = this.filteredTeamCertificates.slice(startIdx, startIdx + Number(this.certsPageSize));
  }

  setCertsPage(page: number) {
    this.certsPage = page;
    this.calculateCertsPagination();
  }

  loadManagerOwnProfile() {
    const empId = this.currentUser?.employeeId || this.currentUser?.id;
    if (empId) {
      this.dataService.getEmployeeById(empId).subscribe({
        next: (res: any) => {
          this.managerOwnProfile = res.data;
        },
        error: () => {}
      });
    }
  }

  exportCerts(type: string) {
    const headers = ["Employee Name", "Certificate Name", "Issuer Organization", "Issue Date", "Status"];
    const rows = this.filteredTeamCertificates.map(item => [
      `${item.employee?.firstName} ${item.employee?.lastName}`,
      item.certificateName,
      item.issuingOrganization,
      new Date(item.issueDate).toLocaleDateString(),
      item.verificationStatus
    ]);
    if (type === 'csv') exportToCsv(headers, rows, "Team_Certificates");
    else if (type === 'excel') exportToExcel(headers, rows, "Team_Certificates");
    else if (type === 'pdf') exportToPdf(headers, rows, "Team_Certificates");
    else if (type === 'print') printTable(headers, rows, "Team Certificates Inventory");
  }

  // ----------------------------------------------------
  // Sub tab Projects filtering & pagination
  // ----------------------------------------------------
  filterTeamProjects() {
    let list = [...this.allTeamProjects];
    if (this.projectsSearch.trim()) {
      const q = this.projectsSearch.toLowerCase();
      list = list.filter(item =>
        item.name?.toLowerCase().includes(q) ||
        item.projectCode?.toLowerCase().includes(q) ||
        item.technologies?.toLowerCase().includes(q)
      );
    }
    if (this.projectsStatusFilter) {
      list = list.filter(item => item.status === this.projectsStatusFilter);
    }
    // Sort
    list.sort((a, b) => {
      let valA = a[this.projectsSortField];
      let valB = b[this.projectsSortField];
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';
      if (typeof valA === 'string') {
        return this.projectsSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return this.projectsSortOrder === 'asc' ? valA - valB : valB - valA;
      }
    });
    this.filteredTeamProjects = list;
    this.resetProjectsPagination();
  }

  toggleProjectsSort(field: string) {
    if (this.projectsSortField === field) {
      this.projectsSortOrder = this.projectsSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.projectsSortField = field;
      this.projectsSortOrder = 'asc';
    }
    this.filterTeamProjects();
  }

  resetProjectsPagination() {
    this.projectsPage = 1;
    this.calculateProjectsPagination();
  }

  calculateProjectsPagination() {
    this.totalProjectsPages = Math.ceil(this.filteredTeamProjects.length / Number(this.projectsPageSize)) || 1;
    const startIdx = (this.projectsPage - 1) * Number(this.projectsPageSize);
    this.paginatedTeamProjects = this.filteredTeamProjects.slice(startIdx, startIdx + Number(this.projectsPageSize));
  }

  setProjectsPage(page: number) {
    this.projectsPage = page;
    this.calculateProjectsPagination();
  }

  exportProjects(type: string) {
    const headers = ["Project Code", "Project Name", "Client", "Status", "Technologies", "Team Allocation count"];
    const rows = this.filteredTeamProjects.map(item => [
      item.projectCode,
      item.name,
      item.clientName || '—',
      item.status,
      item.technologies,
      item.assignments?.length || 0
    ]);
    if (type === 'csv') exportToCsv(headers, rows, "Team_Projects");
    else if (type === 'excel') exportToExcel(headers, rows, "Team_Projects");
    else if (type === 'pdf') exportToPdf(headers, rows, "Team_Projects");
    else if (type === 'print') printTable(headers, rows, "Team Projects Allocation");
  }

  // ----------------------------------------------------
  // Direct profiles export helper
  // ----------------------------------------------------
  exportTeam(type: string) {
    const headers = ["Employee Code", "First Name", "Last Name", "Email", "Designation", "Experience", "Work Mode"];
    const rows = this.filteredTeam.map((m) => [
      m.employeeCode,
      m.firstName,
      m.lastName,
      m.email,
      m.designation?.name,
      `${m.yearsOfExperience} Years`,
      m.workMode,
    ]);

    if (type === "csv") {
      exportToCsv(headers, rows, "My_Team_Competency_Roster");
    } else if (type === "excel") {
      exportToExcel(headers, rows, "My_Team_Competency_Roster");
    } else if (type === "pdf") {
      exportToPdf(headers, rows, "My_Team_Competency_Roster");
    } else if (type === "print") {
      printTable(headers, rows, "My Team Competencies - SkillSphere");
    }
  }

  // ----------------------------------------------------
  // Modal Overlays Managers Handling
  // ----------------------------------------------------
  openModal(type: "assignSkill" | "assignTraining" | "rejectAssess" | "rejectCert" | "resumePreview" | "skillDetail", title: string = '') {
    this.activeModal = type;
    this.actionError = "";
    if (title) this.modalTitle = title;
    else if (type === "assignSkill") this.modalTitle = "Assign Skill Requirement";
    else if (type === "assignTraining") this.modalTitle = "Assign Team Training Course";
    else if (type === "rejectAssess") this.modalTitle = "Reject Self-Assessment Rating";
    else if (type === "rejectCert") this.modalTitle = "Reject Uploaded Certificate Credentials";
    else if (type === "skillDetail") this.modalTitle = "Employee Skill Detail & Review";
  }

  closeModal() {
    this.activeModal = null;
    this.actionError = "";
    this.selectedItemForReject = null;
    this.resumePreviewData = null;
    this.selectedResumeMember = null;
    this.resumeFeedbackText = "";
    this.rejectionComment = "";
  }

  openResumeModal(member: any) {
    this.selectedResumeMember = member;
    this.activeModal = 'resumePreview';
    this.resumePreviewData = null;
    this.resumeFeedbackText = "";
    this.dataService.getResumeData(member.id).subscribe({
      next: (res) => (this.resumePreviewData = res.data),
      error: (err) => (this.actionError = err.error?.message || 'Failed to load resume'),
    });
  }

  submitResumeFeedback() {
    if (!this.selectedResumeMember || !this.resumeFeedbackText.trim()) {
      this.actionError = 'Feedback comment is required';
      return;
    }
    this.dataService.suggestResumeImprovements({
      employeeId: this.selectedResumeMember.id,
      feedback: this.resumeFeedbackText,
    }).subscribe({
      next: () => {
        this.closeModal();
      },
      error: (err) => (this.actionError = err.error?.message || 'Failed to submit feedback'),
    });
  }

  loadTeamSummary() {
    const managerId = this.currentUser?.employeeId || this.currentUser?.id;
    if (!managerId) return;
    this.dataService.getTeamSummary(managerId).subscribe({
      next: (res) => {
        this.teamSummaryData = res.data;
        this.filterManagerTeam();
      }
    });
  }

  filterManagerTeam() {
    if (!this.teamSummaryData || !this.teamSummaryData.teamMembers) return;
    let list = [...this.teamSummaryData.teamMembers];

    // Search text filter
    if (this.resumeSearchText && this.resumeSearchText.trim()) {
      const q = this.resumeSearchText.toLowerCase();
      list = list.filter(m => 
        (m.firstName + ' ' + m.lastName).toLowerCase().includes(q) ||
        (m.employeeCode && m.employeeCode.toLowerCase().includes(q))
      );
    }

    // Skill filter
    if (this.resumeSkillFilter) {
      list = list.filter(m => {
        return this.allTeamSkills.some((s: any) => s.employeeId === m.id && s.skill?.skillName === this.resumeSkillFilter);
      });
    }

    // Project filter
    if (this.resumeProjectFilter) {
      list = list.filter(m => {
        const activeProjs = this.getEmployeeActiveProjects(m.id);
        return activeProjs.some((p: any) => p.projectName === this.resumeProjectFilter);
      });
    }

    this.filteredManagerReports = list;
    this.totalResumePages = Math.ceil(this.filteredManagerReports.length / this.resumePageSize) || 1;
    this.resumePage = Math.min(this.resumePage, this.totalResumePages);
    const start = (this.resumePage - 1) * this.resumePageSize;
    this.paginatedManagerReports = this.filteredManagerReports.slice(start, start + this.resumePageSize);
  }

  setResumePage(page: number) {
    if (page < 1 || page > this.totalResumePages) return;
    this.resumePage = page;
    this.filterManagerTeam();
  }

  getEmployeeActiveProjects(employeeId: string): any[] {
    if (!this.teamSummaryData || !this.teamSummaryData.employeeContributions) return [];
    return this.teamSummaryData.employeeContributions.filter((c: any) => c.employeeId === employeeId);
  }

  viewMemberFullResume(member: any) {
    this.openResumeModal(member);
  }

  downloadTeamResumePDF() {
    exportHtmlToPdf('teamResumeSummary', `Team_CV_Summary_${this.currentUser.lastName}`);
  }

  downloadMemberResumePDF() {
    if (this.resumePreviewData) {
      exportHtmlToPdf('resumePreviewWindow', `Resume_${this.resumePreviewData.employee.firstName}_${this.resumePreviewData.employee.lastName}`);
    }
  }

  printMemberResume() {
    window.print();
  }

  onSaveSkill() {
    if (this.skillForm.invalid) return;
    this.dataService.assignSkill(this.skillForm.value).subscribe({
      next: () => {
        this.closeModal();
        this.loadStats();
        this.loadTeamData();
      },
      error: (err) => (this.actionError = err.error?.message || "Failed to assign skill"),
    });
  }

  onSaveTraining() {
    if (this.trainingForm.invalid) return;
    this.dataService.createTrainingPlan(this.trainingForm.value).subscribe({
      next: () => {
        this.closeModal();
        this.loadStats();
        this.loadTeamData();
      },
      error: (err) => (this.actionError = err.error?.message || "Failed to assign training plan"),
    });
  }

  approveAssessment(ass: any, rating: number) {
    this.dataService.reviewAssessment(ass.id, { decision: "APPROVED", finalRating: rating }).subscribe({
      next: () => {
        this.loadStats();
        this.loadTeamData();
      },
    });
  }

  rejectAssessment(ass: any) {
    this.selectedItemForReject = ass;
    this.openModal("rejectAssess");
  }

  verifyCertificate(id: string, status: string, reason?: string) {
    this.dataService.verifyCertificate(id, { verificationStatus: status, rejectionReason: reason }).subscribe({
      next: () => {
        this.loadStats();
        this.loadTeamData();
      },
    });
  }

  rejectCertificate(cert: any) {
    this.selectedItemForReject = cert;
    this.openModal("rejectCert");
  }

  submitRejection(type: string) {
    if (!this.rejectionComment.trim()) {
      this.actionError = "Rejection comment reason is mandatory.";
      return;
    }

    if (type === "assess") {
      this.dataService
        .reviewAssessment(this.selectedItemForReject.id, {
          decision: "REJECTED",
          managerFeedback: this.rejectionComment,
        })
        .subscribe({
          next: () => {
            this.closeModal();
            this.loadStats();
            this.loadTeamData();
          },
          error: (err) => (this.actionError = err.error?.message || "Failed to reject assessment"),
        });
    } else if (type === "cert") {
      this.dataService
        .verifyCertificate(this.selectedItemForReject.id, {
          verificationStatus: "REJECTED",
          rejectionReason: this.rejectionComment,
        })
        .subscribe({
          next: () => {
            this.closeModal();
            this.loadStats();
            this.loadTeamData();
          },
          error: (err) => (this.actionError = err.error?.message || "Failed to reject certificate"),
        });
    }
  }

  // ----------------------------------------------------
  // Ticket Actions: View, Reply, Resolve, Escalate
  // ----------------------------------------------------
  viewTicketDetails(t: any) {
    this.dataService.getTicketById(t.id).subscribe({
      next: (res) => (this.selectedTicket = res.data),
    });
  }

  sendTicketReply() {
    if (!this.replyMessage.trim()) return;
    const formData = new FormData();
    formData.append("message", this.replyMessage);

    this.dataService.addTicketMessage(this.selectedTicket.id, formData).subscribe({
      next: () => {
        this.replyMessage = "";
        this.viewTicketDetails(this.selectedTicket);
      },
    });
  }

  resolveTeamTicket() {
    if (!this.replyMessage.trim()) {
      alert("Provide resolution details inside the reply message box before resolving.");
      return;
    }
    this.dataService.resolveTicket(this.selectedTicket.id, { resolutionDetails: this.replyMessage }).subscribe({
      next: () => {
        this.selectedTicket = null;
        this.loadTeamData();
      },
    });
  }

  escalateTeamTicket() {
    const reason = prompt("Enter the reason for escalation to Admin Support:");
    if (reason === null) return;
    if (!reason.trim()) {
      alert("Escalation reason is required.");
      return;
    }

    this.dataService.escalateTicket(this.selectedTicket.id, reason).subscribe({
      next: () => {
        this.selectedTicket = null;
        this.loadTeamData();
      },
    });
  }

  // ----------------------------------------------------
  // Charts Render Logic
  // ----------------------------------------------------
  renderTeamCharts() {
    const ctxGap = document.getElementById("teamGapChart") as HTMLCanvasElement;
    if (ctxGap) {
      if (this.gapChart) this.gapChart.destroy();
      this.gapChart = new Chart(ctxGap, {
        type: "bar",
        data: {
          labels: ["JS Core", "Python API", "React SPA", "Docker Containers", "SQL Queries"],
          datasets: [
            {
              label: "Average Required Rating",
              data: [4.0, 3.5, 4.0, 3.0, 3.5],
              backgroundColor: "rgba(94, 114, 228, 0.15)",
              borderColor: "#5e72e4",
              borderWidth: 1,
            },
            {
              label: "Average Verified Rating",
              data: [3.8, 2.5, 3.2, 2.0, 3.0],
              backgroundColor: "#5e72e4",
              borderRadius: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
        },
      });
    }

    const ctxProg = document.getElementById("teamProgressChart") as HTMLCanvasElement;
    if (ctxProg) {
      if (this.progressChart) this.progressChart.destroy();
      this.progressChart = new Chart(ctxProg, {
        type: "doughnut",
        data: {
          labels: ["Completed", "In Progress", "Overdue", "Assigned"],
          datasets: [
            {
              data: [12, 18, 4, 6],
              backgroundColor: ["#49b8a8", "#5e72e4", "#dc5f4b", "#e8a83e"],
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

  renderSubTabCharts() {
    if (this.activeSubTab === 'resumes') {
      const ctxExp = document.getElementById("resumeExpChart") as HTMLCanvasElement;
      if (ctxExp) {
        if (this.resumeExpChart) this.resumeExpChart.destroy();
        this.resumeExpChart = new Chart(ctxExp, {
          type: "bar",
          data: {
            labels: ["1-2 Yrs", "3-5 Yrs", "6-8 Yrs", "9+ Yrs"],
            datasets: [{ label: "Team Members", data: [3, 8, 5, 2], backgroundColor: "#5e72e4", borderRadius: 4 }]
          },
          options: { responsive: true, maintainAspectRatio: false }
        });
      }

      const ctxSk = document.getElementById("resumeSkillsChart") as HTMLCanvasElement;
      if (ctxSk) {
        if (this.resumeSkillsChart) this.resumeSkillsChart.destroy();
        this.resumeSkillsChart = new Chart(ctxSk, {
          type: "bar",
          data: {
            labels: ["TypeScript", "Angular", "Node.js", "PostgreSQL", "Docker", "Python"],
            datasets: [{ label: "Proficient Members", data: [12, 10, 8, 7, 5, 4], backgroundColor: "#2dce89", borderRadius: 4 }]
          },
          options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
        });
      }
    }

    else if (this.activeSubTab === 'projects') {
      const ctxStat = document.getElementById("projStatusChart") as HTMLCanvasElement;
      if (ctxStat) {
        if (this.projStatusChart) this.projStatusChart.destroy();
        this.projStatusChart = new Chart(ctxStat, {
          type: "doughnut",
          data: {
            labels: ["Active", "Planning", "On Hold", "Completed"],
            datasets: [{ data: [8, 4, 2, 6], backgroundColor: ["#2dce89", "#5e72e4", "#fb6340", "#11cdef"] }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right" } } }
        });
      }

      const ctxComp = document.getElementById("projCompletionChart") as HTMLCanvasElement;
      if (ctxComp) {
        if (this.projCompletionChart) this.projCompletionChart.destroy();
        this.projCompletionChart = new Chart(ctxComp, {
          type: "bar",
          data: {
            labels: ["SkillSphere", "HR Analytics", "Cloud Migration", "Mobile Gateway"],
            datasets: [{ label: "Completion (%)", data: [85, 45, 90, 60], backgroundColor: "#11cdef", borderRadius: 4 }]
          },
          options: { responsive: true, maintainAspectRatio: false, scales: { y: { max: 100 } } }
        });
      }
    }

    else if (this.activeSubTab === 'training') {
      const ctxTrStat = document.getElementById("subtabTrainingStatusChart") as HTMLCanvasElement;
      if (ctxTrStat) {
        if (this.subtabTrainingStatusChart) this.subtabTrainingStatusChart.destroy();
        this.subtabTrainingStatusChart = new Chart(ctxTrStat, {
          type: "doughnut",
          data: {
            labels: ["Verified", "Completed", "In Progress", "Assigned", "Overdue"],
            datasets: [{ data: [15, 10, 18, 5, 2], backgroundColor: ["#2dce89", "#49b8a8", "#5e72e4", "#e8a83e", "#f5365c"] }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right" } } }
        });
      }

      const ctxTrProg = document.getElementById("subtabTrainingProgressChart") as HTMLCanvasElement;
      if (ctxTrProg) {
        if (this.subtabTrainingProgressChart) this.subtabTrainingProgressChart.destroy();
        this.subtabTrainingProgressChart = new Chart(ctxTrProg, {
          type: "bar",
          data: {
            labels: ["Technical", "Domain", "Leadership", "Compliance"],
            datasets: [{ label: "Avg Progress (%)", data: [88, 72, 65, 96], backgroundColor: "#5e72e4", borderRadius: 4 }]
          },
          options: { responsive: true, maintainAspectRatio: false, scales: { y: { max: 100 } } }
        });
      }
    }

    else if (this.activeSubTab === 'certificates') {
      const ctxCertStat = document.getElementById("subtabCertStatusChart") as HTMLCanvasElement;
      if (ctxCertStat) {
        if (this.subtabCertStatusChart) this.subtabCertStatusChart.destroy();
        this.subtabCertStatusChart = new Chart(ctxCertStat, {
          type: "pie",
          data: {
            labels: ["Verified", "Pending Verification", "Rejected"],
            datasets: [{ data: [22, 5, 2], backgroundColor: ["#2dce89", "#fb6340", "#f5365c"] }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right" } } }
        });
      }

      const ctxCertOrg = document.getElementById("subtabCertOrgChart") as HTMLCanvasElement;
      if (ctxCertOrg) {
        if (this.subtabCertOrgChart) this.subtabCertOrgChart.destroy();
        this.subtabCertOrgChart = new Chart(ctxCertOrg, {
          type: "bar",
          data: {
            labels: ["AWS", "Microsoft", "Google Cloud", "Scrum Alliance", "Oracle"],
            datasets: [{ label: "Certificates Uploaded", data: [10, 8, 5, 4, 2], backgroundColor: "#5e72e4", borderRadius: 4 }]
          },
          options: { responsive: true, maintainAspectRatio: false }
        });
      }
    }

    else if (this.activeSubTab === 'skills') {
      const ctxSkLvl = document.getElementById("subtabSkillRatingChart") as HTMLCanvasElement;
      if (ctxSkLvl) {
        if (this.subtabSkillRatingChart) this.subtabSkillRatingChart.destroy();
        this.subtabSkillRatingChart = new Chart(ctxSkLvl, {
          type: "bar",
          data: {
            labels: ["Level 1", "Level 2", "Level 3", "Level 4", "Level 5"],
            datasets: [{ label: "Skill Assignments", data: [3, 7, 15, 10, 4], backgroundColor: "#5e72e4", borderRadius: 4 }]
          },
          options: { responsive: true, maintainAspectRatio: false }
        });
      }

      const ctxSkApp = document.getElementById("subtabSkillApprovalChart") as HTMLCanvasElement;
      if (ctxSkApp) {
        if (this.subtabSkillApprovalChart) this.subtabSkillApprovalChart.destroy();
        this.subtabSkillApprovalChart = new Chart(ctxSkApp, {
          type: "doughnut",
          data: {
            labels: ["Approved", "Submitted / Pending", "Assigned", "Rejected"],
            datasets: [{ data: [25, 8, 4, 2], backgroundColor: ["#2dce89", "#fb6340", "#5e72e4", "#f5365c"] }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right" } } }
        });
      }
    }

    else if (this.activeSubTab === 'gaps') {
      const ctxGapSev = document.getElementById("subtabGapSeverityChart") as HTMLCanvasElement;
      if (ctxGapSev) {
        if (this.subtabGapSeverityChart) this.subtabGapSeverityChart.destroy();
        this.subtabGapSeverityChart = new Chart(ctxGapSev, {
          type: "pie",
          data: {
            labels: ["No Gap", "Low Priority Gap", "Medium Priority Gap", "High Priority Gap"],
            datasets: [{ data: [18, 7, 4, 2], backgroundColor: ["#2dce89", "#11cdef", "#fb6340", "#f5365c"] }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right" } } }
        });
      }

      const ctxGapRat = document.getElementById("subtabGapRatingChart") as HTMLCanvasElement;
      if (ctxGapRat) {
        if (this.subtabGapRatingChart) this.subtabGapRatingChart.destroy();
        this.subtabGapRatingChart = new Chart(ctxGapRat, {
          type: "bar",
          data: {
            labels: ["JS / TS", "Python API", "React SPA", "Docker", "SQL Queries"],
            datasets: [
              { label: "Required Level", data: [4.0, 4.0, 4.0, 3.0, 3.5], backgroundColor: "rgba(94,114,228,0.2)", borderColor: "#5e72e4", borderWidth: 1 },
              { label: "Verified Rating", data: [3.8, 2.5, 3.2, 2.0, 3.0], backgroundColor: "#5e72e4", borderRadius: 4 }
            ]
          },
          options: { responsive: true, maintainAspectRatio: false }
        });
      }
    }
  }
}
