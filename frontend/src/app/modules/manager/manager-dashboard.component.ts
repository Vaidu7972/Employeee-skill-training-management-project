import { Component, OnInit, AfterViewInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { DataService } from "../../core/services/data.service";
import { AuthService } from "../../core/services/auth.service";
import { exportToCsv, exportToExcel, printTable } from "../../core/utils/export.utils";
import { Chart } from "chart.js/auto";

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

        <!-- Team Members List (with Search, Multi-Filter, and Exports) -->
        <div class="dashboard-card">
          <div class="card-header border-b">
            <h4>My Direct Team Profiles</h4>
            <div class="export-actions">
              <button class="btn btn-outline-sm" (click)="exportTeam('csv')">CSV</button>
              <button class="btn btn-outline-sm" (click)="exportTeam('excel')">Excel</button>
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
                  <th (click)="toggleSort('employeeCode')">Code <span class="material-icons sort-icon">swap_vert</span></th>
                  <th (click)="toggleSort('firstName')">Name <span class="material-icons sort-icon">swap_vert</span></th>
                  <th>Email</th>
                  <th (click)="toggleSort('designationId')">Designation <span class="material-icons sort-icon">swap_vert</span></th>
                  <th (click)="toggleSort('yearsOfExperience')">Experience <span class="material-icons sort-icon">swap_vert</span></th>
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

        <!-- Pending Assessments reviews queue -->
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

        <!-- Pending Certificate Approvals queue -->
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

        <!-- Support Tickets Queue -->
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
                  <td>{{ t.creator?.firstName }} {{ t.creator?.lastName }}</td>
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
            <p><strong>Employee:</strong> {{ selectedTicket.creator?.firstName }} {{ selectedTicket.creator?.lastName }}</p>
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
            <div *ngFor="let m of selectedTicket.messages" class="msg-bubble" 
                 [ngClass]="{ 'self': m.senderId === currentUser.id, 'support': m.senderId !== currentUser.id }">
              <p>{{ m.message }}</p>
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

      <!-- ================================================== -->
      <!-- TAB 2: MY DEVELOPMENT (EMPLOYEE CAPABILITIES) -->
      <!-- ================================================== -->
      <div *ngIf="activeMasterTab === 'development'">
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

            <!-- Resume Preview / Feedback Modal -->
            <div *ngIf="activeModal === 'resumePreview'" class="resume-modal-body">
              <div *ngIf="resumePreviewData; else loadingResume">
                <div class="resume-header" style="display:flex; align-items:center; justify-content:space-between; gap:16px;">
                  <div>
                    <h3>{{ selectedResumeMember.firstName }} {{ selectedResumeMember.lastName }}</h3>
                    <p>{{ selectedResumeMember.designation?.name }} · {{ selectedResumeMember.department?.name }}</p>
                    <p>{{ selectedResumeMember.employeeCode }}</p>
                  </div>
                  <div style="text-align:right;">
                    <img *ngIf="resumePreviewData.employee.companyLogoUrl" [src]="resumePreviewData.employee.companyLogoUrl" alt="Company logo" style="max-height:60px; max-width:140px; object-fit:contain;" />
                    <div *ngIf="resumePreviewData.employee.qrCodeUrl" style="margin-top:10px;">
                      <img [src]="resumePreviewData.employee.qrCodeUrl" alt="QR Code" style="width:80px; height:80px;" />
                    </div>
                  </div>
                </div>
                <div style="margin-top:16px; display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:12px;">
                  <div><strong>Email</strong><br />{{ resumePreviewData.employee.email }}</div>
                  <div><strong>Phone</strong><br />{{ resumePreviewData.employee.phone || '—' }}</div>
                  <div><strong>Location</strong><br />{{ resumePreviewData.employee.workLocation || '—' }}</div>
                  <div><strong>Experience</strong><br />{{ resumePreviewData.employee.yearsOfExperience }} years</div>
                </div>
                <div style="margin-top:16px;">
                  <h4>Latest Feedback</h4>
                  <textarea class="form-control" [(ngModel)]="resumeFeedbackText" rows="4" placeholder="Provide improvement suggestions for this resume."></textarea>
                </div>
                <div *ngIf="actionError" class="error-banner">{{ actionError }}</div>
                <button class="btn btn-primary w-full" (click)="submitResumeFeedback()">Submit Resume Suggestions</button>
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
export class ManagerDashboardComponent implements OnInit, AfterViewInit {
  activeMasterTab: "team" | "development" = "team";
  currentUser: any;
  stats: any;

  // Tab 1 (My Team) Lists
  teamMembers: any[] = [];
  filteredTeam: any[] = [];
  paginatedTeam: any[] = [];
  pendingAssessments: any[] = [];
  pendingCertificates: any[] = [];
  teamTickets: any[] = [];
  skillsList: any[] = [];
  teamSubmissions: any[] = [];

  // Table advanced filters
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
  activeModal: "assignSkill" | "assignTraining" | "rejectAssess" | "rejectCert" | "resumePreview" | null = null;
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

  constructor(
    private fb: FormBuilder,
    private dataService: DataService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.currentUserValue;
    this.loadStats();
    this.loadTeamData();
    this.initializeForms();
    this.loadFormContexts();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.renderTeamCharts();
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
      },
    });
  }

  loadQueues(teamIds: string[]) {
    // 1. Fetch assessments matching team IDs
    this.dataService.getSkills({ status: "SUBMITTED", limit: 100 }).subscribe((res) => {
      this.pendingAssessments = res.data.filter((item: any) => teamIds.includes(item.employeeId));
    });

    // 2. Fetch pending certs matching team IDs
    this.dataService.getCertificates({ verificationStatus: "PENDING", limit: 100 }).subscribe((res) => {
      this.pendingCertificates = res.data.filter((item: any) => teamIds.includes(item.employeeId));
    });

    // 3. Fetch team tickets
    this.dataService.getTickets({ limit: 100 }).subscribe((res) => {
      this.teamTickets = res.data.filter((t: any) => teamIds.includes(t.creatorId));
    });

    // 4. Fetch team assessment attempts
    this.dataService.getAllSubmissions().subscribe((res) => {
      this.teamSubmissions = res.data;
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
  // CSV, Excel, Print Actions
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
    } else if (type === "print") {
      printTable(headers, rows, "My Team Competencies - SkillSphere");
    }
  }

  // ----------------------------------------------------
  // Modal Overlays Managers Handling
  // ----------------------------------------------------
  openModal(type: "assignSkill" | "assignTraining" | "rejectAssess" | "rejectCert") {
    this.activeModal = type;
    this.actionError = "";
    if (type === "assignSkill") this.modalTitle = "Assign Skill Requirement";
    else if (type === "assignTraining") this.modalTitle = "Assign Team Training Course";
    else if (type === "rejectAssess") this.modalTitle = "Reject Self-Assessment Rating";
    else if (type === "rejectCert") this.modalTitle = "Reject Uploaded Certificate Credentials";
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

  onSaveSkill() {
    if (this.skillForm.invalid) return;
    this.dataService.assignSkill(this.skillForm.value).subscribe({
      next: () => {
        this.closeModal();
        this.loadStats();
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
}
