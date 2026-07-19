import { Component, OnInit, OnDestroy, ChangeDetectorRef } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { Router, NavigationEnd } from "@angular/router";
import { DataService } from "../../core/services/data.service";
import { AuthService } from "../../core/services/auth.service";
import { filter } from "rxjs/operators";
import { Subscription, interval } from "rxjs";

type TabId = "home" | "skills" | "assessments" | "training" | "tickets" | "settings" | "projects" | "resume";

@Component({
  selector: "app-employee-dashboard",
  template: `
    <div class="dashboard-wrapper">

      <!-- ======================================================= -->
      <!-- WELCOME BANNER (only on home tab) -->
      <!-- ======================================================= -->
      <div *ngIf="activeTab === 'home'" class="dashboard-card welcome-card" style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px;">
        <div>
          <h3>👋 Welcome back, {{ currentUser?.firstName }}!</h3>
          <p style="margin-top:6px; margin-bottom:14px;">Your career journey at a glance. Keep growing!</p>
          <div class="progress-bar-bg" style="width:260px;">
            <div class="progress-bar-fill" [style.width.%]="stats?.profileCompletion || 30"></div>
          </div>
          <p style="font-size:11px; margin-top:6px; opacity:0.75;">Profile Completion: <strong>{{ stats?.profileCompletion || 30 }}%</strong></p>
        </div>
        <div style="display:flex; gap:12px; flex-wrap:wrap;">
          <div style="text-align:center; padding:12px 20px; background:rgba(255,255,255,0.15); border-radius:12px; border:1px solid rgba(255,255,255,0.2);">
            <div style="font-size:28px; font-weight:800;">{{ stats?.verifiedSkills || 0 }}</div>
            <div style="font-size:11px; opacity:0.8; margin-top:3px;">Verified Skills</div>
          </div>
          <div style="text-align:center; padding:12px 20px; background:rgba(255,255,255,0.15); border-radius:12px; border:1px solid rgba(255,255,255,0.2);">
            <div style="font-size:28px; font-weight:800;">{{ stats?.certificatesEarned || 0 }}</div>
            <div style="font-size:11px; opacity:0.8; margin-top:3px;">Certificates</div>
          </div>
        </div>
      </div>

      <!-- ======================================================= -->
      <!-- KPI CARDS (always visible) -->
      <!-- ======================================================= -->
      <div class="kpi-container">
        <div class="kpi-card" (click)="navigateTo('skills')" style="cursor:pointer;">
          <div class="kpi-icon"><span class="material-icons">workspace_premium</span></div>
          <div class="kpi-content">
            <div class="kpi-value">{{ stats?.verifiedSkills || 0 }}<small style="font-size:14px;font-weight:500;"> / {{ stats?.assignedSkills || 0 }}</small></div>
            <div class="kpi-label">Skills Verified</div>
          </div>
        </div>
        <div class="kpi-card" (click)="navigateTo('training')" style="cursor:pointer;">
          <div class="kpi-icon" style="color:var(--secondary)"><span class="material-icons">model_training</span></div>
          <div class="kpi-content">
            <div class="kpi-value">{{ stats?.activeTrainings || 0 }}</div>
            <div class="kpi-label">Active Trainings</div>
          </div>
        </div>
        <div class="kpi-card" (click)="navigateTo('training')" style="cursor:pointer;">
          <div class="kpi-icon" style="color:var(--accent)"><span class="material-icons">military_tech</span></div>
          <div class="kpi-content">
            <div class="kpi-value">{{ stats?.certificatesEarned || 0 }}</div>
            <div class="kpi-label">Certificates</div>
          </div>
        </div>
        <div class="kpi-card" (click)="navigateTo('tickets')" style="cursor:pointer;">
          <div class="kpi-icon" style="color:var(--error)"><span class="material-icons">support_agent</span></div>
          <div class="kpi-content">
            <div class="kpi-value">{{ stats?.openSupportTickets || 0 }}</div>
            <div class="kpi-label">Open Tickets</div>
          </div>
        </div>
      </div>

      <!-- ======================================================= -->
      <!-- HOME TAB -->
      <!-- ======================================================= -->
      <div *ngIf="activeTab === 'home'" class="tab-content">
        <div class="charts-grid">
          <!-- Career Readiness -->
          <div class="dashboard-card">
            <h4>Career Readiness Score</h4>
            <div *ngIf="readiness" style="text-align:center;">
              <div class="readiness-score">{{ readiness.readinessPercentage }}%</div>
              <p style="color:var(--text-secondary); font-size:13px;">Target: <strong>{{ readiness.targetDesignationName }}</strong></p>
              <div class="progress-bar-bg" style="margin:14px auto; max-width:200px;">
                <div class="progress-bar-fill" [style.width.%]="readiness.readinessPercentage"></div>
              </div>
              <div *ngIf="readiness.missingSkills?.length > 0" style="text-align:left; margin-top:14px;">
                <p style="font-size:12px; font-weight:700; color:var(--error); margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px;">Skill Gaps to Close</p>
                <div *ngFor="let ms of readiness.missingSkills" style="display:flex; align-items:center; gap:8px; padding:6px 10px; background:rgba(239,68,68,0.06); border-radius:8px; margin-bottom:6px; font-size:12px;">
                  <span class="material-icons" style="font-size:16px; color:var(--error);">error_outline</span>
                  {{ ms.skillName }} — Required: Level {{ ms.requiredLevel }}, Current: {{ ms.currentLevel || 0 }}
                </div>
              </div>
              <div *ngIf="readiness.missingSkills?.length === 0" style="margin-top:16px; color:var(--success); font-size:13px; font-weight:600;">
                <span class="material-icons" style="font-size:20px; vertical-align:middle; margin-right:4px;">verified</span>
                All role requirements met! Excellent work.
              </div>
            </div>
            <div *ngIf="!readiness" style="text-align:center; padding:20px; color:var(--text-muted); font-size:13px;">
              Loading career data...
            </div>
          </div>

          <!-- Achievement Badges -->
          <div class="dashboard-card">
            <h4>Achievement Badges</h4>
            <div class="badges-row">
              <div class="achievement-badge gold">
                <span class="material-icons">workspace_premium</span>
                <h5>Expert</h5>
                <p>Skill Level 5</p>
              </div>
              <div class="achievement-badge blue">
                <span class="material-icons">menu_book</span>
                <h5>Learner</h5>
                <p>Training Done</p>
              </div>
              <div class="achievement-badge green">
                <span class="material-icons">verified_user</span>
                <h5>Certified</h5>
                <p>Cert Approved</p>
              </div>
              <div class="achievement-badge" style="border-color:var(--secondary);">
                <span class="material-icons" style="color:var(--secondary)">bolt</span>
                <h5>Fast Track</h5>
                <p>Assessment Ace</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick action links -->
        <div class="dashboard-card">
          <h4>Quick Actions</h4>
          <div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:4px;">
            <button class="btn btn-primary" (click)="navigateTo('skills')">
              <span class="material-icons">workspace_premium</span> Rate My Skills
            </button>
            <button class="btn btn-secondary" (click)="navigateTo('assessments')">
              <span class="material-icons">quiz</span> Take a Test
            </button>
            <button class="btn btn-outline" (click)="navigateTo('training')">
              <span class="material-icons">military_tech</span> Upload Certificate
            </button>
            <button class="btn btn-outline" (click)="navigateTo('tickets')">
              <span class="material-icons">support_agent</span> Raise Support Ticket
            </button>
          </div>
        </div>
      </div>

      <!-- ======================================================= -->
      <!-- SKILLS MATRIX TAB -->
      <!-- ======================================================= -->
      <div *ngIf="activeTab === 'skills'" class="tab-content">
        <div class="dashboard-card">
          <div class="card-header">
            <h4>My Skills Portfolio</h4>
            <div style="display:flex; gap:8px;">
              <input type="text" class="filter-input" [(ngModel)]="skillSearch" placeholder="Search skills..." style="padding:7px 12px; border:1px solid var(--border); border-radius:8px; background:var(--bg-secondary); color:var(--text-primary); font-size:13px; font-family:inherit;">
              <button class="btn btn-outline btn-sm" (click)="loadSkills()">
                <span class="material-icons" style="font-size:16px;">refresh</span>
              </button>
            </div>
          </div>

          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Skill</th>
                  <th>Category</th>
                  <th>Self Rating</th>
                  <th>Verified</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngIf="filteredSkills.length === 0" class="empty-state-row">
                  <td colspan="7" class="text-center text-muted">
                    <span class="material-icons" style="font-size:36px; display:block; margin:0 auto 8px;">workspace_premium</span>
                    No skills assigned yet. Contact your manager to get started.
                  </td>
                </tr>
                <tr *ngFor="let item of filteredSkills">
                  <td><code style="font-size:11px; background:var(--bg-secondary); padding:2px 6px; border-radius:4px;">{{ item.skill?.skillCode }}</code></td>
                  <td><strong>{{ item.skill?.skillName }}</strong></td>
                  <td style="color:var(--text-secondary); font-size:12px;">{{ item.skill?.category?.name }}</td>
                  <td>
                    <div style="display:flex; align-items:center; gap:6px;">
                      <div style="display:flex; gap:2px;">
                        <span *ngFor="let s of [1,2,3,4,5]" class="material-icons"
                          style="font-size:14px;"
                          [style.color]="s <= item.selfRating ? 'var(--accent)' : 'var(--border)'">star</span>
                      </div>
                      <span style="font-size:12px; color:var(--text-muted);">{{ item.selfRating }}/5</span>
                    </div>
                  </td>
                  <td>
                    <span *ngIf="item.status === 'APPROVED'" style="font-weight:700; color:var(--success);">{{ item.finalRating }}/5</span>
                    <span *ngIf="item.status !== 'APPROVED'" class="text-muted">—</span>
                  </td>
                  <td>
                    <span class="badge" [ngClass]="{
                      'badge-success': item.status === 'APPROVED',
                      'badge-warning': item.status === 'SUBMITTED' || item.status === 'NEEDS_CHANGES',
                      'badge-error':   item.status === 'REJECTED',
                      'badge-info':    item.status === 'ASSIGNED' || item.status === 'DRAFT'
                    }">{{ item.status }}</span>
                  </td>
                  <td>
                    <div class="action-btn-group">
                      <button
                        *ngIf="['ASSIGNED','DRAFT','REJECTED','NEEDS_CHANGES'].includes(item.status)"
                        class="btn btn-primary btn-sm"
                        (click)="openSelfAssessModal(item)">
                        Assess
                      </button>
                      <button
                        *ngIf="assessmentsMap[item.skillId]"
                        class="btn btn-outline btn-sm"
                        (click)="startAssessment(assessmentsMap[item.skillId])">
                        <span class="material-icons" style="font-size:14px;">quiz</span> Test
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ======================================================= -->
      <!-- SKILL ASSESSMENTS TAB -->
      <!-- ======================================================= -->
      <div *ngIf="activeTab === 'assessments'" class="tab-content">
        <div class="charts-grid">
          <!-- Available Tests -->
          <div class="dashboard-card">
            <h4>Available Certification Tests</h4>
            <div *ngIf="availableAssessments.length === 0" style="text-align:center; padding:30px; color:var(--text-muted); font-size:13px;">
              <span class="material-icons" style="font-size:40px; display:block; margin-bottom:8px;">quiz</span>
              No assessments currently active.
            </div>
            <div *ngFor="let ass of availableAssessments" style="display:flex; align-items:center; justify-content:space-between; padding:14px; background:var(--bg-secondary); border-radius:10px; margin-bottom:10px; border:1px solid var(--border); transition:var(--transition);"
              [style.border-color]="'var(--border)'"
              onmouseenter="this.style.borderColor='var(--primary)'"
              onmouseleave="this.style.borderColor='var(--border)'"
            >
              <div>
                <div style="font-weight:700; font-size:13.5px; margin-bottom:3px;">{{ ass.title }}</div>
                <div style="font-size:12px; color:var(--text-muted);">
                  <span class="material-icons" style="font-size:13px; vertical-align:middle;">workspace_premium</span>
                  {{ ass.skill?.skillName }} · Passing: <strong>{{ ass.passingScore }}%</strong>
                </div>
              </div>
              <button class="btn btn-primary btn-sm" (click)="startAssessment(ass.id)">
                <span class="material-icons" style="font-size:14px;">play_arrow</span> Start
              </button>
            </div>
          </div>

          <!-- Score History -->
          <div class="dashboard-card">
            <h4>My Test Attempts & Scores</h4>
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Assessment</th>
                    <th>Date</th>
                    <th>Score</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngIf="mySubmissions.length === 0" class="empty-state-row">
                    <td colspan="4" class="text-center text-muted">No test attempts yet.</td>
                  </tr>
                  <tr *ngFor="let sub of mySubmissions">
                    <td style="font-weight:600; font-size:12px;">{{ sub.assessment?.title }}</td>
                    <td style="color:var(--text-muted); font-size:12px;">{{ sub.createdAt | date:'mediumDate' }}</td>
                    <td>
                      <strong [style.color]="sub.passed ? 'var(--success)' : 'var(--error)'">{{ sub.score }}%</strong>
                      <span style="color:var(--text-muted); font-size:11px;"> / {{ sub.assessment?.passingScore }}% needed</span>
                    </td>
                    <td>
                      <span class="badge" [ngClass]="sub.passed ? 'badge-success' : 'badge-error'">
                        {{ sub.passed ? '✓ PASSED' : '✗ FAILED' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- ======================================================= -->
      <!-- TRAINING & CERTS TAB -->
      <!-- ======================================================= -->
      <div *ngIf="activeTab === 'training'" class="tab-content">
        <div class="dashboard-card">
          <div class="card-header">
            <h4>My Training Programs</h4>
            <select class="filter-input" [(ngModel)]="trainingStatusFilter" (change)="filterTraining()"
              style="padding:7px 12px; border:1px solid var(--border); border-radius:8px; background:var(--bg-secondary); font-size:13px; font-family:inherit;">
              <option value="">All Statuses</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Training</th>
                  <th>Due Date</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngIf="filteredTraining.length === 0" class="empty-state-row">
                  <td colspan="5" class="text-center text-muted">No training programs assigned.</td>
                </tr>
                <tr *ngFor="let plan of filteredTraining">
                  <td>
                    <strong style="display:block; font-size:13px;">{{ plan.trainingTitle }}</strong>
                    <span style="font-size:11px; color:var(--text-muted);">{{ plan.provider?.name }}</span>
                  </td>
                  <td style="font-size:12px;">{{ plan.dueDate | date:'mediumDate' }}</td>
                  <td style="min-width:120px;">
                    <div class="progress-bar-bg">
                      <div class="progress-bar-fill" [style.width.%]="plan.progress || 0"></div>
                    </div>
                    <span style="font-size:11px; color:var(--text-muted); margin-top:3px; display:block;">{{ plan.progress || 0 }}%</span>
                  </td>
                  <td>
                    <span class="badge" [ngClass]="{
                      'badge-success': plan.status === 'VERIFIED' || plan.status === 'COMPLETED',
                      'badge-warning': plan.status === 'IN_PROGRESS' || plan.status === 'SUBMITTED_FOR_REVIEW',
                      'badge-error':   plan.status === 'OVERDUE' || plan.status === 'CANCELLED',
                      'badge-info':    plan.status === 'ASSIGNED'
                    }">{{ plan.status }}</span>
                  </td>
                  <td>
                    <button
                      *ngIf="!['VERIFIED','COMPLETED','SUBMITTED_FOR_REVIEW'].includes(plan.status)"
                      class="btn btn-outline btn-sm"
                      (click)="openProgressModal(plan)">
                      Update
                    </button>
                    <span *ngIf="plan.status === 'SUBMITTED_FOR_REVIEW'" style="font-size:11px; color:var(--info);">Under Review</span>
                    <span *ngIf="plan.status === 'VERIFIED' || plan.status === 'COMPLETED'" class="material-icons" style="color:var(--success); font-size:20px; vertical-align:middle;">check_circle</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Certificates -->
        <div class="dashboard-card">
          <div class="card-header">
            <h4>Professional Certificates</h4>
            <button class="btn btn-primary" (click)="openCertModal()">
              <span class="material-icons" style="font-size:16px;">upload</span> Upload Certificate
            </button>
          </div>
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Certificate</th>
                  <th>Issuer</th>
                  <th>Issue Date</th>
                  <th>Expiry</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngIf="myCertificates.length === 0" class="empty-state-row">
                  <td colspan="5" class="text-center text-muted">No certificates uploaded yet.</td>
                </tr>
                <tr *ngFor="let cert of myCertificates">
                  <td><strong>{{ cert.certificateName }}</strong></td>
                  <td style="font-size:12px;">{{ cert.issuingOrganization }}</td>
                  <td style="font-size:12px;">{{ cert.issueDate | date:'mediumDate' }}</td>
                  <td style="font-size:12px;">{{ cert.expiryDate ? (cert.expiryDate | date:'mediumDate') : '—' }}</td>
                  <td>
                    <span class="badge" [ngClass]="{
                      'badge-success': cert.verificationStatus === 'VERIFIED',
                      'badge-warning': cert.verificationStatus === 'PENDING',
                      'badge-error':   cert.verificationStatus === 'REJECTED' || cert.verificationStatus === 'EXPIRED'
                    }">{{ cert.verificationStatus }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ======================================================= -->
      <!-- SUPPORT TICKETS TAB — FULLY WORKABLE -->
      <!-- ======================================================= -->
      <div *ngIf="activeTab === 'tickets'" class="tab-content">
        <div [ngClass]="selectedTicket ? 'charts-grid' : ''">
          <!-- Ticket List Panel -->
          <div class="dashboard-card" [style.margin-bottom]="selectedTicket ? '0' : '22px'">
            <div class="card-header">
              <h4>My Support Tickets</h4>
              <button class="btn btn-primary" (click)="openTicketModal()">
                <span class="material-icons" style="font-size:16px;">add</span> Raise Ticket
              </button>
            </div>

            <!-- Status Filter Tabs -->
            <div style="display:flex; gap:4px; margin-bottom:14px; flex-wrap:wrap;">
              <button *ngFor="let f of ['ALL','OPEN','IN_PROGRESS','RESOLVED','CLOSED']"
                [class]="ticketFilter === f ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'"
                (click)="setTicketFilter(f)">
                {{ f }}
                <span *ngIf="f !== 'ALL' && getTicketCount(f) > 0" style="margin-left:4px; background:rgba(255,255,255,0.25); padding:1px 5px; border-radius:50px; font-size:10px;">{{ getTicketCount(f) }}</span>
              </button>
            </div>

            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Subject</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Raised</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngIf="filteredTickets.length === 0" class="empty-state-row">
                    <td colspan="7" class="text-center text-muted">
                      <span class="material-icons" style="font-size:36px; display:block; margin:0 auto 8px;">support_agent</span>
                      No tickets found. Click "Raise Ticket" to open one.
                    </td>
                  </tr>
                  <tr *ngFor="let t of filteredTickets"
                    [class.selected-row]="selectedTicket?.id === t.id"
                    style="cursor:pointer;"
                    (click)="viewTicketDetails(t)">
                    <td><code style="font-size:11px;">{{ t.ticketNumber }}</code></td>
                    <td><strong style="font-size:13px;">{{ t.subject }}</strong></td>
                    <td style="font-size:12px; color:var(--text-muted);">{{ t.category | titlecase }}</td>
                    <td>
                      <span class="badge" [ngClass]="{
                        'badge-error':   t.priority === 'CRITICAL' || t.priority === 'HIGH',
                        'badge-warning': t.priority === 'MEDIUM',
                        'badge-info':    t.priority === 'LOW'
                      }">{{ t.priority }}</span>
                    </td>
                    <td>
                      <span class="badge" [ngClass]="{
                        'badge-success': t.status === 'RESOLVED' || t.status === 'CLOSED',
                        'badge-warning': t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED' || t.status === 'WAITING_USER',
                        'badge-info':    t.status === 'OPEN'
                      }">{{ t.status }}</span>
                    </td>
                    <td style="font-size:12px; color:var(--text-muted);">{{ t.createdAt | date:'mediumDate' }}</td>
                    <td>
                      <button class="btn btn-outline btn-sm" (click)="viewTicketDetails(t); $event.stopPropagation()">
                        <span class="material-icons" style="font-size:14px;">open_in_new</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Ticket Conversation Panel -->
          <div *ngIf="selectedTicket" class="dashboard-card" style="display:flex; flex-direction:column;">
            <!-- Header -->
            <div class="card-header">
              <div>
                <h4 style="margin-bottom:0;">{{ selectedTicket.ticketNumber }}</h4>
                <p style="font-size:12px; color:var(--text-muted); margin-top:3px;">{{ selectedTicket.subject }}</p>
              </div>
              <div style="display:flex; gap:8px; align-items:center;">
                <span class="badge" [ngClass]="{
                  'badge-success': selectedTicket.status === 'RESOLVED' || selectedTicket.status === 'CLOSED',
                  'badge-warning': selectedTicket.status === 'IN_PROGRESS' || selectedTicket.status === 'ASSIGNED',
                  'badge-info':    selectedTicket.status === 'OPEN'
                }">{{ selectedTicket.status }}</span>
                <button class="btn btn-outline btn-sm" (click)="closeTicketPanel()">
                  <span class="material-icons" style="font-size:16px;">close</span>
                </button>
              </div>
            </div>

            <!-- Meta Info -->
            <div class="ticket-meta-box">
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:12px;">
                <p><strong>Priority:</strong>
                  <span class="badge" style="margin-left:6px;" [ngClass]="{'badge-error': selectedTicket.priority === 'CRITICAL' || selectedTicket.priority === 'HIGH', 'badge-warning': selectedTicket.priority === 'MEDIUM', 'badge-info': selectedTicket.priority === 'LOW'}">
                    {{ selectedTicket.priority }}
                  </span>
                </p>
                <p><strong>Category:</strong> {{ selectedTicket.category }}</p>
                <p><strong>SLA Due:</strong> {{ selectedTicket.slaDueDate | date:'short' }}</p>
                <p><strong>SLA:</strong>
                  <span [style.color]="selectedTicket.slaStatus === 'BREACHED' ? 'var(--error)' : 'var(--success)'">
                    {{ selectedTicket.slaStatus }}
                  </span>
                </p>
              </div>
            </div>

            <!-- Loading state -->
            <div *ngIf="ticketLoading" style="text-align:center; padding:20px; color:var(--text-muted);">
              <span class="material-icons" style="animation:spin 1s linear infinite; font-size:28px;">refresh</span>
            </div>

            <!-- Conversation Log -->
            <div class="messages-log" #messageLog>
              <div class="msg-bubble system-msg">
                <strong>Issue Opened:</strong> {{ selectedTicket.description }}
                <span class="msg-time">{{ selectedTicket.createdAt | date:'short' }}</span>
              </div>
              <ng-container *ngFor="let m of selectedTicket.messages">
                <div *ngIf="!m.isInternal || canSeeInternal"
                  class="msg-bubble"
                  [ngClass]="{
                    'self':         m.senderId === currentUser?.id,
                    'support':      m.senderId !== currentUser?.id && !m.isInternal,
                    'internal-msg': m.isInternal
                  }">
                  {{ m.message }}
                  <span class="msg-time">{{ m.createdAt | date:'short' }}</span>
                </div>
              </ng-container>
            </div>

            <!-- Reply Box (if not closed) -->
            <div *ngIf="!['CLOSED','RESOLVED'].includes(selectedTicket.status)" class="reply-box" style="margin-top:12px;">
              <textarea
                class="form-control"
                [(ngModel)]="replyMessage"
                rows="3"
                placeholder="Write your reply..."
                (keydown.control.enter)="sendTicketReply()">
              </textarea>
              <div class="reply-actions">
                <span style="font-size:11px; color:var(--text-muted); align-self:center;">Ctrl+Enter to send</span>
                <button class="btn btn-outline btn-sm" (click)="sendTicketReply()" [disabled]="!replyMessage.trim() || replyLoading">
                  <span class="material-icons" style="font-size:14px;">send</span>
                  {{ replyLoading ? 'Sending...' : 'Send Reply' }}
                </button>
              </div>
            </div>

            <!-- Action Buttons for RESOLVED state -->
            <div *ngIf="selectedTicket.status === 'RESOLVED'" style="margin-top:14px; display:flex; gap:10px; flex-wrap:wrap;">
              <button class="btn btn-success" (click)="confirmTicketResolved()">
                <span class="material-icons" style="font-size:16px;">check_circle</span> Confirm & Close
              </button>
              <button class="btn btn-error" (click)="openReopenModal()">
                <span class="material-icons" style="font-size:16px;">replay</span> Reopen
              </button>
            </div>

            <!-- Closed notice -->
            <div *ngIf="selectedTicket.status === 'CLOSED'" style="margin-top:14px; background:var(--bg-secondary); border-radius:8px; padding:12px 16px; font-size:13px; color:var(--text-muted); text-align:center;">
              <span class="material-icons" style="font-size:18px; vertical-align:middle; margin-right:6px; color:var(--success);">lock</span>
              This ticket has been closed. Open a new ticket if you need further help.
            </div>
          </div>
        </div>
      </div>

      <!-- ======================================================= -->
      <!-- SETTINGS TAB -->
      <!-- ======================================================= -->
      <div *ngIf="activeTab === 'settings'" class="tab-content">
        <div class="charts-grid">
          <!-- Change Password -->
          <div class="dashboard-card">
            <h4>Security — Change Password</h4>
            <form [formGroup]="changePasswordForm" (ngSubmit)="onChangePasswordSubmit()">
              <div class="form-group">
                <label>Current Password</label>
                <input type="password" class="form-control" formControlName="currentPassword" />
              </div>
              <div class="form-group">
                <label>New Password</label>
                <input type="password" class="form-control" formControlName="newPassword" />
              </div>
              <div class="form-group">
                <label>Confirm New Password</label>
                <input type="password" class="form-control" formControlName="confirmPassword" />
              </div>
              <div *ngIf="settingsError" class="error-banner">
                <span class="material-icons" style="font-size:16px;">error_outline</span> {{ settingsError }}
              </div>
              <div *ngIf="settingsSuccess" class="success-banner">
                <span class="material-icons" style="font-size:16px;">check_circle</span> Password updated! Logging out...
              </div>
              <button type="submit" class="btn btn-primary w-full" [disabled]="changePasswordForm.invalid">
                Update Password
              </button>
            </form>
          </div>

          <!-- Notification Preferences -->
          <div class="dashboard-card">
            <h4>Platform Feedback</h4>
            <form [formGroup]="feedbackForm" (ngSubmit)="onFeedbackSubmit()">
              <div class="form-group">
                <label>Feedback Category</label>
                <select class="form-control" formControlName="category">
                  <option value="INTERFACE">User Interface & Design</option>
                  <option value="ASSESSMENTS">Skill Assessment Flow</option>
                  <option value="TRAINING">Training & Certificates</option>
                  <option value="SUPPORT">Support Helpdesk</option>
                  <option value="OTHER">General Suggestions</option>
                </select>
              </div>
              <div class="form-group">
                <label>Detailed Feedback</label>
                <textarea class="form-control" formControlName="comments" rows="5" placeholder="Share your suggestions..."></textarea>
              </div>
              <div *ngIf="feedbackSuccess" class="success-banner">
                <span class="material-icons" style="font-size:16px;">check_circle</span> Thank you for your feedback!
              </div>
              <button type="submit" class="btn btn-secondary w-full" [disabled]="feedbackForm.invalid">
                <span class="material-icons" style="font-size:16px;">send</span> Submit Feedback
              </button>
            </form>
          </div>
        </div>
      </div>

      <!-- ======================================================= -->
      <!-- MODAL OVERLAY -->
      <!-- ======================================================= -->
      <div *ngIf="activeModal" class="modal-overlay" (click)="onOverlayClick($event)">
        <div class="modal-content" [class.modal-lg]="activeModal === 'quiz'" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ modalTitle }}</h3>
            <button class="btn-close" (click)="closeModal()">
              <span class="material-icons">close</span>
            </button>
          </div>
          <div class="modal-body">

            <!-- Self-Assess Modal -->
            <form *ngIf="activeModal === 'selfAssess'" [formGroup]="selfAssessForm" (ngSubmit)="onSaveSelfAssess()">
              <div class="form-group">
                <label>Self Rating</label>
                <div style="display:flex; gap:8px; margin-top:4px;">
                  <button *ngFor="let r of [1,2,3,4,5]" type="button"
                    [class]="selfAssessForm.value.selfRating == r ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'"
                    (click)="selfAssessForm.patchValue({selfRating: r})">
                    <span class="material-icons" style="font-size:14px;">star</span> {{ r }}
                  </button>
                </div>
                <p style="font-size:11px; color:var(--text-muted); margin-top:6px;">{{ getRatingLabel(selfAssessForm.value.selfRating) }}</p>
              </div>
              <div class="form-group">
                <label>Experience (Months)</label>
                <input type="number" class="form-control" formControlName="experienceMonths" min="0" max="600" />
              </div>
              <div class="form-group">
                <label>Supporting Comments</label>
                <textarea class="form-control" formControlName="employeeComments" rows="3" placeholder="Describe your experience with this skill..."></textarea>
              </div>
              <div *ngIf="actionError" class="error-banner">{{ actionError }}</div>
              <div style="display:flex; gap:10px;">
                <button type="button" class="btn btn-outline" style="flex:1;" (click)="onSaveSelfAssess(true)">Save as Draft</button>
                <button type="submit" class="btn btn-primary" style="flex:2;" [disabled]="selfAssessForm.invalid">Submit for Review</button>
              </div>
            </form>

            <!-- Quiz Modal -->
            <div *ngIf="activeModal === 'quiz' && activeAssessment">
              <!-- Progress indicator -->
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <span class="badge badge-primary">Question {{ currentQuestionIndex + 1 }} of {{ activeAssessment.questions.length }}</span>
                <span style="font-size:12px; color:var(--text-muted);">{{ activeAssessment.skill?.skillName }}</span>
              </div>

              <!-- Progress bar -->
              <div class="progress-bar-bg" style="margin-bottom:20px;">
                <div class="progress-bar-fill" [style.width.%]="((currentQuestionIndex + 1) / activeAssessment.questions.length) * 100"></div>
              </div>

              <!-- Question -->
              <h4 style="font-size:16px; font-weight:600; color:var(--text-primary); margin-bottom:16px; line-height:1.5; white-space:normal;">
                {{ activeAssessment.questions[currentQuestionIndex].questionText }}
              </h4>

              <!-- Options -->
              <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:24px;">
                <label *ngFor="let opt of getOptionsList(activeAssessment.questions[currentQuestionIndex].options); let idx = index"
                  style="display:flex; align-items:center; gap:12px; padding:13px 16px; border-radius:10px; border:2px solid; cursor:pointer; transition:var(--transition); font-weight:500; font-size:14px;"
                  [style.border-color]="selectedAnswers[currentQuestionIndex] === idx ? 'var(--primary)' : 'var(--border)'"
                  [style.background]="selectedAnswers[currentQuestionIndex] === idx ? 'rgba(91,94,244,0.06)' : 'var(--bg-secondary)'"
                  (click)="selectOption(idx)">
                  <div style="width:22px; height:22px; border-radius:50%; border:2px solid; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; transition:var(--transition);"
                    [style.border-color]="selectedAnswers[currentQuestionIndex] === idx ? 'var(--primary)' : 'var(--border)'"
                    [style.background]="selectedAnswers[currentQuestionIndex] === idx ? 'var(--primary)' : 'transparent'"
                    [style.color]="selectedAnswers[currentQuestionIndex] === idx ? '#ffffff' : 'var(--text-muted)'">
                    {{ 'ABCD'[idx] }}
                  </div>
                  {{ opt }}
                </label>
              </div>

              <!-- Navigation -->
              <div style="display:flex; justify-content:space-between; border-top:1px solid var(--border); padding-top:16px;">
                <button class="btn btn-outline" [disabled]="currentQuestionIndex === 0" (click)="prevQuestion()">
                  <span class="material-icons" style="font-size:16px;">arrow_back</span> Previous
                </button>
                <button class="btn btn-primary" *ngIf="currentQuestionIndex < activeAssessment.questions.length - 1" (click)="nextQuestion()"
                  [disabled]="selectedAnswers[currentQuestionIndex] === undefined">
                  Next <span class="material-icons" style="font-size:16px;">arrow_forward</span>
                </button>
                <button class="btn btn-success" *ngIf="currentQuestionIndex === activeAssessment.questions.length - 1" (click)="submitQuiz()">
                  <span class="material-icons" style="font-size:16px;">check</span> Submit Answers
                </button>
              </div>
            </div>

            <!-- Quiz Result Modal -->
            <div *ngIf="activeModal === 'quizResult'" style="text-align:center; padding:10px 0;">
              <div style="font-size:64px; margin-bottom:12px;">{{ quizResult?.passed ? '🎉' : '😟' }}</div>
              <h3 style="font-size:24px; font-weight:800; font-family:'Plus Jakarta Sans',sans-serif; margin-bottom:8px;"
                [style.color]="quizResult?.passed ? 'var(--success)' : 'var(--error)'">
                {{ quizResult?.passed ? 'You Passed!' : 'Try Again!' }}
              </h3>
              <p style="color:var(--text-secondary); font-size:14px; margin-bottom:20px;">
                {{ quizResult?.passed ? 'Excellent! Your skill has been auto-verified.' : 'You did not meet the passing score. Keep practicing!' }}
              </p>
              <div style="display:flex; justify-content:center; gap:20px; margin-bottom:24px;">
                <div style="text-align:center; padding:16px 24px; background:var(--bg-secondary); border-radius:12px; border:1px solid var(--border);">
                  <div style="font-size:32px; font-weight:800;"
                    [style.color]="quizResult?.passed ? 'var(--success)' : 'var(--error)'">{{ quizResult?.score }}%</div>
                  <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">Your Score</div>
                </div>
                <div style="text-align:center; padding:16px 24px; background:var(--bg-secondary); border-radius:12px; border:1px solid var(--border);">
                  <div style="font-size:32px; font-weight:800; color:var(--primary);">{{ quizResult?.passingScore }}%</div>
                  <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">Passing Score</div>
                </div>
              </div>
              <button class="btn btn-primary w-full" (click)="closeModal()">
                {{ quizResult?.passed ? 'View Updated Skills' : 'Back to Assessments' }}
              </button>
            </div>

            <!-- Update Progress Modal -->
            <form *ngIf="activeModal === 'progress'" [formGroup]="progressForm" (ngSubmit)="onSaveProgress()">
              <div class="form-group">
                <label>Progress: {{ progressForm.value.progress }}%</label>
                <input type="range" class="form-control" formControlName="progress" min="0" max="100" step="5" />
                <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-muted); margin-top:4px;">
                  <span>0%</span><span>50%</span><span>100%</span>
                </div>
              </div>
              <div class="form-group">
                <label>Comments</label>
                <textarea class="form-control" formControlName="employeeComments" rows="3"></textarea>
              </div>
              <div *ngIf="actionError" class="error-banner">{{ actionError }}</div>
              <button type="submit" class="btn btn-primary w-full">Update Progress</button>
            </form>

            <!-- Certificate Upload Modal -->
            <form *ngIf="activeModal === 'cert'" [formGroup]="certForm" (ngSubmit)="onSaveCert()">
              <div class="form-group">
                <label>Certificate Name *</label>
                <input type="text" class="form-control" formControlName="certificateName" placeholder="e.g. AWS Solutions Architect" />
              </div>
              <div class="form-group">
                <label>Issuing Organization *</label>
                <input type="text" class="form-control" formControlName="issuingOrganization" placeholder="e.g. Amazon Web Services" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Issue Date *</label>
                  <input type="date" class="form-control" formControlName="issueDate" />
                </div>
                <div class="form-group">
                  <label>Expiry Date</label>
                  <input type="date" class="form-control" formControlName="expiryDate" />
                </div>
              </div>
              <div class="form-group">
                <label>Certificate File (PDF / JPG / PNG) *</label>
                <input type="file" (change)="onFileChange($event)" accept=".pdf,.jpg,.jpeg,.png"
                  style="padding:8px; border:1px solid var(--border); border-radius:8px; background:var(--bg-secondary); width:100%; font-size:13px; cursor:pointer;" />
              </div>
              <div *ngIf="actionError" class="error-banner">{{ actionError }}</div>
              <button type="submit" class="btn btn-primary w-full" [disabled]="certForm.invalid">
                <span class="material-icons" style="font-size:16px;">upload</span> Upload & Submit
              </button>
            </form>

            <!-- Raise Ticket Modal -->
            <form *ngIf="activeModal === 'ticket'" [formGroup]="ticketForm" (ngSubmit)="onSaveTicket()">
              <div class="form-group">
                <label>Subject *</label>
                <input type="text" class="form-control" formControlName="subject" placeholder="Brief description of the issue" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Category</label>
                  <select class="form-control" formControlName="category">
                    <option value="TRAINING">Training</option>
                    <option value="SKILL">Skill</option>
                    <option value="ASSESSMENT">Assessment</option>
                    <option value="CERTIFICATE">Certificate</option>
                    <option value="MANAGER">Manager</option>
                    <option value="PROFILE">Profile</option>
                    <option value="LOGIN">Login</option>
                    <option value="TECHNICAL">Technical</option>
                    <option value="ACCESS">Access</option>
                    <option value="DEADLINE">Deadline</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Priority</label>
                  <select class="form-control" formControlName="priority">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label>Detailed Description *</label>
                <textarea class="form-control" formControlName="description" rows="4" placeholder="Provide all relevant details..."></textarea>
              </div>
              <div *ngIf="actionError" class="error-banner">{{ actionError }}</div>
              <button type="submit" class="btn btn-primary w-full" [disabled]="ticketForm.invalid">
                <span class="material-icons" style="font-size:16px;">send</span> Submit Ticket
              </button>
            </form>

            <!-- Reopen Ticket Modal -->
            <div *ngIf="activeModal === 'reopen'">
              <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">
                Please explain why the resolution was not satisfactory. Your ticket will be reopened and escalated.
              </p>
              <div class="form-group">
                <label>Reopen Reason *</label>
                <textarea class="form-control" [(ngModel)]="reopenReason" rows="4" placeholder="The issue was not fully resolved because..."></textarea>
              </div>
              <div *ngIf="actionError" class="error-banner">{{ actionError }}</div>
              <button class="btn btn-primary w-full" (click)="submitReopen()" [disabled]="!reopenReason.trim()">
                <span class="material-icons" style="font-size:16px;">replay</span> Reopen Ticket
              </button>
            </div>

          </div>
        </div>
      </div>

      <!-- ======================================================= -->
      <!-- PROJECTS TAB -->
      <!-- ======================================================= -->
      <div *ngIf="activeTab === 'projects'" class="tab-content">
        <div class="dashboard-card">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
            <h4 style="margin:0;">My Projects ({{ myProjects.length }})</h4>
          </div>
          <div *ngIf="myProjects.length === 0" style="text-align:center; padding:40px 20px; color:var(--text-muted);">
            <span class="material-icons" style="font-size:48px; display:block; margin-bottom:12px; opacity:0.4;">folder_open</span>
            <p>You haven't been assigned to any projects yet.</p>
          </div>
          <div style="display:grid; gap:16px;">
            <div *ngFor="let a of myProjects" class="dashboard-card" style="border:1px solid var(--border); border-radius:12px; padding:20px; margin:0; transition:var(--transition);" onmouseenter="this.style.borderColor='var(--primary)'" onmouseleave="this.style.borderColor='var(--border)'">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;">
                <div>
                  <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:6px;">
                    <h5 style="margin:0; font-size:16px;">{{ a.project.name }}</h5>
                    <span style="font-size:11px; padding:2px 10px; border-radius:50px; font-weight:700; background:var(--primary-soft); color:var(--primary);">{{ a.project.status }}</span>
                    <span *ngIf="a.status === 'ACTIVE'" style="font-size:11px; padding:2px 8px; border-radius:50px; background:rgba(34,197,94,0.12); color:var(--success); font-weight:700;">● Active</span>
                    <span *ngIf="a.status === 'COMPLETED'" style="font-size:11px; padding:2px 8px; border-radius:50px; background:rgba(99,102,241,0.1); color:var(--primary); font-weight:700;">✓ Completed</span>
                    <span *ngIf="a.status === 'REMOVED'" style="font-size:11px; padding:2px 8px; border-radius:50px; background:rgba(239,68,68,0.1); color:var(--error); font-weight:700;">✕ Removed</span>
                  </div>
                  <p style="font-size:12px; color:var(--text-muted); margin:0 0 8px;">
                    {{ a.project.projectCode }}
                    <span *ngIf="a.project.clientName"> · Client: <strong>{{ a.project.clientName }}</strong></span>
                    <span *ngIf="a.project.manager"> · Manager: <strong>{{ a.project.manager.firstName }} {{ a.project.manager.lastName }}</strong></span>
                  </p>
                  <p style="font-size:13px; color:var(--text-secondary); margin:0 0 10px;">
                    <strong>Role:</strong> {{ a.role || 'Developer' }}
                    <span *ngIf="a.contributionPercent"> · <strong>Contribution:</strong> {{ a.contributionPercent }}%</span>
                  </p>
                  <p *ngIf="a.responsibilities" style="font-size:12px; color:var(--text-secondary); margin:0 0 10px;">{{ a.responsibilities }}</p>
                  <div *ngIf="a.project.technologies" style="display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;">
                    <span *ngFor="let t of a.project.technologies.split(',')" style="font-size:11px; padding:2px 10px; border-radius:50px; background:var(--surface-hover); border:1px solid var(--border); color:var(--text-secondary);">{{ t.trim() }}</span>
                  </div>
                </div>
                <div style="min-width:120px; text-align:right;">
                  <div style="font-size:28px; font-weight:800; color:var(--primary);">{{ a.project.completionPercent || 0 }}%</div>
                  <div style="font-size:11px; color:var(--text-muted);">Completion</div>
                  <div class="progress-bar-bg" style="margin-top:8px; width:100px; margin-left:auto;">
                    <div class="progress-bar-fill" [style.width.%]="a.project.completionPercent || 0"></div>
                  </div>
                </div>
              </div>
              <div style="display:flex; gap:24px; margin-top:14px; padding-top:14px; border-top:1px solid var(--border); font-size:12px; color:var(--text-muted); flex-wrap:wrap;">
                <span><strong>Start:</strong> {{ a.project.startDate | date:'mediumDate' }}</span>
                <span *ngIf="a.project.endDate"><strong>End:</strong> {{ a.project.endDate | date:'mediumDate' }}</span>
                <span><strong>Joined:</strong> {{ a.joinedAt | date:'mediumDate' }}</span>
                <span *ngIf="a.leftAt"><strong>Left:</strong> {{ a.leftAt | date:'mediumDate' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ======================================================= -->
      <!-- RESUME TAB -->
      <!-- ======================================================= -->
      <div *ngIf="activeTab === 'resume'" class="tab-content">
        <!-- Controls Row -->
        <div class="dashboard-card" style="margin-bottom:20px;">
          <div style="display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:20px;">
            <div style="flex:1; min-width:260px;">
              <h4 style="margin:0 0 16px;">Resume Settings</h4>
              <div class="form-group">
                <label>Career Objective</label>
                <textarea class="form-control" [(ngModel)]="resumeSettings.careerObjective" rows="3" placeholder="A motivated software engineer with a passion for..."></textarea>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Template Style</label>
                  <select class="form-control" [(ngModel)]="resumeSettings.resumeTemplate">
                    <option value="minimalist">Minimalist</option>
                    <option value="modern">Modern</option>
                    <option value="classic">Classic</option>
                    <option value="executive">Executive</option>
                  </select>
                </div>
              </div>
              <div style="display:flex; gap:20px; flex-wrap:wrap; margin-bottom:16px;">
                <label style="display:flex; align-items:center; gap:8px; font-size:13px; cursor:pointer;">
                  <input type="checkbox" [(ngModel)]="resumeSettings.resumeHideContact" style="width:16px;height:16px;" />
                  Hide contact info
                </label>
                <label style="display:flex; align-items:center; gap:8px; font-size:13px; cursor:pointer;">
                  <input type="checkbox" [(ngModel)]="resumeSettings.resumeHideRatings" style="width:16px;height:16px;" />
                  Hide skill ratings
                </label>
              </div>
              <div style="display:flex; gap:10px; flex-wrap:wrap;">
                <button class="btn btn-primary" (click)="saveResumeSettings()" [disabled]="resumeSaving">
                  <span class="material-icons" style="font-size:16px;">save</span>
                  {{ resumeSaving ? 'Saving...' : 'Save Settings' }}
                </button>
                <span *ngIf="resumeSaved" style="color:var(--success); font-size:13px; align-self:center; font-weight:600;">✓ Saved!</span>
              </div>
            </div>
            <div>
              <h4 style="margin:0 0 16px;">Download Resume</h4>
              <div style="display:flex; flex-direction:column; gap:10px;">
                <button class="btn btn-primary" (click)="downloadResume('PDF')" style="width:180px; justify-content:center;">
                  <span class="material-icons" style="font-size:16px;">picture_as_pdf</span>
                  Download PDF
                </button>
                <button class="btn" style="width:180px; justify-content:center; border:1px solid var(--border);" (click)="downloadResume('PRINT')">
                  <span class="material-icons" style="font-size:16px;">print</span>
                  Print Resume
                </button>
              </div>
              <div *ngIf="resumeData?.employee?.resumeFeedback" style="margin-top:16px; padding:12px 16px; background:rgba(251,191,36,0.08); border:1px solid rgba(251,191,36,0.3); border-radius:10px; max-width:240px;">
                <p style="font-size:11px; font-weight:700; color:#f59e0b; margin:0 0 6px; text-transform:uppercase; letter-spacing:0.5px;">Manager Feedback</p>
                <p style="font-size:12px; color:var(--text-secondary); margin:0;">{{ resumeData.employee.resumeFeedback }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Resume Preview -->
        <div *ngIf="resumeData" class="dashboard-card resume-preview" id="resumePreview" style="padding:40px;">
          <!-- Header -->
          <div style="display:flex; align-items:flex-start; gap:20px; margin-bottom:28px; padding-bottom:24px; border-bottom:2px solid var(--primary);">
            <div *ngIf="resumeData.employee.profileImage" style="flex-shrink:0;">
              <img [src]="resumeData.employee.profileImage" style="width:80px; height:80px; border-radius:50%; object-fit:cover; border:3px solid var(--primary);" alt="Profile" />
            </div>
            <div *ngIf="!resumeData.employee.profileImage" style="flex-shrink:0; width:80px; height:80px; border-radius:50%; background:linear-gradient(135deg,var(--primary),var(--primary-dark)); display:flex; align-items:center; justify-content:center; font-size:32px; font-weight:800; color:#fff;">
              {{ resumeData.employee.firstName[0] }}
            </div>
            <div style="flex:1;">
              <h2 style="margin:0 0 4px; font-size:26px; letter-spacing:-0.5px;">{{ resumeData.employee.firstName }} {{ resumeData.employee.lastName }}</h2>
              <p style="margin:0 0 2px; font-size:15px; color:var(--primary); font-weight:600;">{{ resumeData.employee.designation }}</p>
              <p style="margin:0; font-size:13px; color:var(--text-muted);">{{ resumeData.employee.department }} · {{ resumeData.employee.employeeCode }}</p>
            </div>
            <div *ngIf="!resumeSettings.resumeHideContact" style="text-align:right; font-size:12px; color:var(--text-secondary); line-height:1.8;">
              <div>{{ resumeData.employee.email }}</div>
              <div *ngIf="resumeData.employee.phone">{{ resumeData.employee.phone }}</div>
              <div>{{ resumeData.employee.workLocation }} · {{ resumeData.employee.workMode }}</div>
              <div>{{ resumeData.employee.employmentType }}</div>
            </div>
          </div>

          <!-- Career Objective -->
<div *ngIf="resumeData.employee.companyLogoUrl || resumeData.employee.qrCodeUrl" style="display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:24px;">
              <div *ngIf="resumeData.employee.companyLogoUrl" style="max-width:180px;">
                <img [src]="resumeData.employee.companyLogoUrl" alt="Company logo" style="max-width:100%; height:auto; object-fit:contain;" />
              </div>
              <div *ngIf="resumeData.employee.qrCodeUrl" style="min-width:100px;">
                <img [src]="resumeData.employee.qrCodeUrl" alt="QR code" style="width:100px; height:100px; object-fit:contain;" />
              </div>
            </div>
            <div *ngIf="resumeData.employee.careerObjective" style="margin-bottom:24px;">
            <h4 style="margin:0 0 8px; color:var(--primary); text-transform:uppercase; font-size:12px; letter-spacing:1.5px;">Career Objective</h4>
            <p style="font-size:13px; color:var(--text-secondary); line-height:1.8; margin:0;">{{ resumeData.employee.careerObjective }}</p>
          </div>

          <!-- Summary Stats -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:12px; margin-bottom:24px; padding:16px; background:var(--surface-hover); border-radius:10px;">
            <div style="text-align:center;">
              <div style="font-size:22px; font-weight:800; color:var(--primary);">{{ resumeData.summary.approvedSkills }}</div>
              <div style="font-size:11px; color:var(--text-muted);">Verified Skills</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:22px; font-weight:800; color:var(--secondary);">{{ resumeData.summary.completedTrainings }}</div>
              <div style="font-size:11px; color:var(--text-muted);">Trainings Done</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:22px; font-weight:800; color:var(--accent);">{{ resumeData.summary.verifiedCerts }}</div>
              <div style="font-size:11px; color:var(--text-muted);">Certificates</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:22px; font-weight:800; color:var(--success);">{{ resumeData.summary.totalProjects }}</div>
              <div style="font-size:11px; color:var(--text-muted);">Projects</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:22px; font-weight:800; color:var(--warning);">{{ resumeData.summary.careerReadiness }}%</div>
              <div style="font-size:11px; color:var(--text-muted);">Career Ready</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:22px; font-weight:800; color:var(--text-secondary);">{{ resumeData.employee.yearsOfExperience || 0 }}y</div>
              <div style="font-size:11px; color:var(--text-muted);">Experience</div>
            </div>
          </div>

          <!-- Skills -->
          <div *ngIf="resumeData.skills?.length > 0" style="margin-bottom:24px;">
            <h4 style="margin:0 0 12px; color:var(--primary); text-transform:uppercase; font-size:12px; letter-spacing:1.5px; border-bottom:1px solid var(--border); padding-bottom:8px;">Technical Skills</h4>
            <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:8px;">
              <div *ngFor="let s of resumeData.skills" style="display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background:var(--surface-hover); border-radius:8px; border:1px solid var(--border);">
                <div>
                  <span style="font-size:13px; font-weight:600;">{{ s.name }}</span>
                  <span style="font-size:11px; color:var(--text-muted); display:block;">{{ s.category }}</span>
                </div>
                <div *ngIf="!resumeSettings.resumeHideRatings" style="display:flex; gap:2px;">
                  <span *ngFor="let i of [1,2,3,4,5]" class="material-icons" style="font-size:12px;" [style.color]="(s.finalRating || s.selfRating) >= i ? 'var(--primary)' : 'var(--border)'">star</span>
                </div>
                <span *ngIf="s.verified" style="font-size:10px; background:rgba(34,197,94,0.12); color:var(--success); padding:2px 6px; border-radius:50px; font-weight:700;">✓</span>
              </div>
            </div>
          </div>

          <!-- Projects -->
          <div *ngIf="resumeData.projects?.length > 0" style="margin-bottom:24px;">
            <h4 style="margin:0 0 12px; color:var(--primary); text-transform:uppercase; font-size:12px; letter-spacing:1.5px; border-bottom:1px solid var(--border); padding-bottom:8px;">Project Experience</h4>
            <div style="display:grid; gap:12px;">
              <div *ngFor="let p of resumeData.projects" style="padding:14px 16px; border:1px solid var(--border); border-radius:10px; border-left:3px solid var(--primary);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px; margin-bottom:6px;">
                  <div>
                    <strong style="font-size:14px;">{{ p.name }}</strong>
                    <span *ngIf="p.client" style="font-size:12px; color:var(--text-muted);"> · {{ p.client }}</span>
                  </div>
                  <div style="font-size:12px; color:var(--text-muted);">{{ p.startDate | date:'MMM y' }} – {{ p.endDate ? (p.endDate | date:'MMM y') : 'Present' }}</div>
                </div>
                <p style="font-size:13px; color:var(--primary); font-weight:600; margin:0 0 4px;">{{ p.role }}</p>
                <p *ngIf="p.responsibilities" style="font-size:12px; color:var(--text-secondary); margin:0 0 8px;">{{ p.responsibilities }}</p>
                <div *ngIf="p.technologies" style="display:flex; flex-wrap:wrap; gap:4px;">
                  <span *ngFor="let t of p.technologies.split(',')" style="font-size:10px; padding:2px 8px; background:var(--surface-hover); border:1px solid var(--border); border-radius:50px;">{{ t.trim() }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Trainings & Certifications -->
          <div *ngIf="resumeData.trainings?.length > 0 || resumeData.certificates?.length > 0" style="margin-bottom:24px;">
            <h4 style="margin:0 0 12px; color:var(--primary); text-transform:uppercase; font-size:12px; letter-spacing:1.5px; border-bottom:1px solid var(--border); padding-bottom:8px;">Training & Certifications</h4>
            <div *ngFor="let t of resumeData.trainings" style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid rgba(0,0,0,0.04); font-size:13px;">
              <div>
                <strong>{{ t.title }}</strong>
                <span style="color:var(--text-muted);"> · {{ t.provider }} · {{ t.skill }}</span>
              </div>
              <span style="color:var(--text-muted); white-space:nowrap;">{{ t.completionDate | date:'MMM y' }}</span>
            </div>
            <div *ngFor="let c of resumeData.certificates" style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid rgba(0,0,0,0.04); font-size:13px;">
              <div>
                <span class="material-icons" style="font-size:14px; color:var(--accent); vertical-align:middle; margin-right:4px;">verified</span>
                <strong>{{ c.name }}</strong>
                <span style="color:var(--text-muted);"> · {{ c.issuer }}</span>
              </div>
              <span style="color:var(--text-muted); white-space:nowrap;">{{ c.issueDate | date:'MMM y' }}</span>
            </div>
          </div>

          <!-- Achievements -->
          <div *ngIf="resumeData.achievements?.length > 0" style="margin-bottom:24px;">
            <h4 style="margin:0 0 12px; color:var(--primary); text-transform:uppercase; font-size:12px; letter-spacing:1.5px; border-bottom:1px solid var(--border); padding-bottom:8px;">Awards & Achievements</h4>
            <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:8px;">
              <div *ngFor="let a of resumeData.achievements" style="display:flex; align-items:flex-start; gap:10px; padding:10px; background:rgba(251,191,36,0.05); border:1px solid rgba(251,191,36,0.2); border-radius:8px;">
                <span class="material-icons" style="font-size:20px; color:#f59e0b; flex-shrink:0;">military_tech</span>
                <div>
                  <strong style="font-size:13px; display:block;">{{ a.name }}</strong>
                  <span style="font-size:11px; color:var(--text-muted);">{{ a.awardedDate | date:'MMM y' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Languages -->
          <div *ngIf="resumeData.languages?.length > 0" style="margin-bottom:0;">
            <h4 style="margin:0 0 10px; color:var(--primary); text-transform:uppercase; font-size:12px; letter-spacing:1.5px; border-bottom:1px solid var(--border); padding-bottom:8px;">Languages</h4>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">
              <span *ngFor="let l of resumeData.languages" style="padding:4px 14px; background:var(--surface-hover); border:1px solid var(--border); border-radius:50px; font-size:12px;">
                {{ l.language }} <span style="color:var(--text-muted);">({{ l.proficiency }})</span>
              </span>
            </div>
          </div>
        </div>

        <div *ngIf="!resumeData" style="text-align:center; padding:60px 20px; color:var(--text-muted);">
          <span class="material-icons" style="font-size:48px; display:block; margin-bottom:12px; opacity:0.4;">description</span>
          <p>Loading your resume data...</p>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .selected-row { background: rgba(91,94,244,0.05) !important; }
    .selected-row td:first-child { border-left: 3px solid var(--primary) !important; padding-left: 11px !important; }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
  `],
})
export class EmployeeDashboardComponent implements OnInit, OnDestroy {
  currentUser: any;
  stats: any;
  readiness: any;
  activeTab: TabId = "home";

  // Route-to-tab mapping
  private routeTabMap: Record<string, TabId> = {
    "/employee/dashboard":   "home",
    "/employee/assessment":  "skills",
    "/employee/skills-test": "assessments",
    "/employee/training":    "training",
    "/employee/career":      "home",
    "/employee/tickets":     "tickets",
    "/employee/profile":     "settings",
    "/employee/projects":    "projects",
    "/employee/resume":      "resume",
  };

  // Data
  mySkills: any[] = [];
  filteredSkills: any[] = [];
  myTraining: any[] = [];
  filteredTraining: any[] = [];
  myCertificates: any[] = [];
  myTickets: any[] = [];
  filteredTickets: any[] = [];
  availableAssessments: any[] = [];
  mySubmissions: any[] = [];
  assessmentsMap: Record<string, string> = {};
  myProjects: any[] = [];
  resumeData: any = null;
  resumeSettings = { careerObjective: '', resumeTemplate: 'minimalist', resumeHideContact: false, resumeHideRatings: false };
  resumeSaving = false;
  resumeSaved = false;

  // Filters
  skillSearch = "";
  trainingStatusFilter = "";
  ticketFilter = "ALL";

  // Quiz state
  activeAssessment: any = null;
  currentQuestionIndex = 0;
  selectedAnswers: number[] = [];
  quizResult: any = null;

  // Ticket state
  selectedTicket: any = null;
  replyMessage = "";
  reopenReason = "";
  replyLoading = false;
  ticketLoading = false;
  canSeeInternal = false;
  private ticketPollSub?: Subscription;

  // Modal
  activeModal: string | null = null;
  modalTitle = "";
  actionError = "";
  settingsError = "";
  settingsSuccess = false;
  feedbackSuccess = false;
  selectedFile: File | null = null;
  selectedSkillForAssess: any = null;
  selectedPlanForProgress: any = null;

  // Forms
  selfAssessForm!: FormGroup;
  progressForm!: FormGroup;
  certForm!: FormGroup;
  ticketForm!: FormGroup;
  changePasswordForm!: FormGroup;
  feedbackForm!: FormGroup;

  private routeSub!: Subscription;

  constructor(
    private fb: FormBuilder,
    private dataService: DataService,
    public authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.currentUserValue;
    this.initForms();

    // Set initial tab from URL
    this.setTabFromUrl(this.router.url);

    // React to subsequent navigation
    this.routeSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e: any) => this.setTabFromUrl(e.urlAfterRedirects));

    this.loadAll();
  }

  ngOnDestroy() {
    if (this.routeSub) this.routeSub.unsubscribe();
    this.stopTicketPoll();
  }

  setTabFromUrl(url: string) {
    const base = url.split("?")[0];
    const tab = this.routeTabMap[base] || "home";
    this.activeTab = tab;
    if (tab === "assessments") this.loadSubmissions();
    if (tab === "tickets")     this.loadTickets();
    this.cdr.detectChanges();
  }

  navigateTo(tab: TabId) {
    const tabRouteMap: Record<TabId, string> = {
      home:        "/employee/dashboard",
      skills:      "/employee/assessment",
      assessments: "/employee/skills-test",
      training:    "/employee/training",
      tickets:     "/employee/tickets",
      settings:    "/employee/profile",
      projects:    "/employee/projects",
      resume:      "/employee/resume",
    };
    this.router.navigate([tabRouteMap[tab]]);
  }

  loadAll() {
    this.loadStats();
    this.loadCareerReadiness();
    this.loadSkills();
    this.loadTraining();
    this.loadCertificates();
    this.loadTickets();
    this.loadAssessments();
    this.loadSubmissions();
    this.loadProjects();
    this.loadResumeData();
  }

  loadStats() {
    this.dataService.getEmployeeDashboard().subscribe({ next: (r) => (this.stats = r.data) });
  }

  loadCareerReadiness() {
    this.dataService.getCareerReadiness().subscribe({ next: (r) => (this.readiness = r.data) });
  }

  loadSkills() {
    const employeeId = this.currentUser?.employeeId;
    if (!employeeId) return;
    this.dataService.getSkills({ employeeId, limit: 100 }).subscribe({
      next: (r) => {
        this.mySkills = r.data || [];
        this.filterSkills();
      },
    });
  }

  filterSkills() {
    const q = this.skillSearch.toLowerCase();
    this.filteredSkills = q
      ? this.mySkills.filter((s: any) =>
          s.skill?.skillName?.toLowerCase().includes(q) ||
          s.skill?.skillCode?.toLowerCase().includes(q)
        )
      : [...this.mySkills];
  }

  loadTraining() {
    const employeeId = this.currentUser?.employeeId;
    if (!employeeId) return;
    this.dataService.getTrainingPlans({ employeeId, limit: 100 }).subscribe({
      next: (r) => {
        this.myTraining = r.data || [];
        this.filterTraining();
      },
    });
  }

  filterTraining() {
    this.filteredTraining = this.trainingStatusFilter
      ? this.myTraining.filter((t: any) => t.status === this.trainingStatusFilter)
      : [...this.myTraining];
  }

  loadCertificates() {
    const employeeId = this.currentUser?.employeeId;
    if (!employeeId) return;
    this.dataService.getCertificates({ employeeId, limit: 100 }).subscribe({
      next: (r) => (this.myCertificates = r.data || []),
    });
  }

  loadTickets() {
    this.dataService.getTickets({ limit: 100 }).subscribe({
      next: (r) => {
        this.myTickets = r.data || [];
        this.applyTicketFilter();
      },
    });
  }

  setTicketFilter(f: string) {
    this.ticketFilter = f;
    this.applyTicketFilter();
  }

  applyTicketFilter() {
    this.filteredTickets = this.ticketFilter === "ALL"
      ? [...this.myTickets]
      : this.myTickets.filter((t: any) => t.status === this.ticketFilter);
  }

  getTicketCount(status: string): number {
    return this.myTickets.filter((t: any) => t.status === status).length;
  }

  loadAssessments() {
    this.dataService.getAssessments().subscribe({
      next: (r) => {
        this.availableAssessments = r.data || [];
        const map: Record<string, string> = {};
        for (const a of r.data || []) map[a.skillId] = a.id;
        this.assessmentsMap = map;
      },
    });
  }

  loadSubmissions() {
    this.dataService.getMySubmissions().subscribe({ next: (r) => (this.mySubmissions = r.data || []) });
  }

  loadProjects() {
    const employeeId = this.currentUser?.employeeId;
    if (!employeeId) return;
    this.dataService.getEmployeeProjects(employeeId).subscribe({
      next: (r) => (this.myProjects = r.data || []),
    });
  }

  loadResumeData() {
    const employeeId = this.currentUser?.employeeId;
    if (!employeeId) return;
    this.dataService.getResumeData(employeeId).subscribe({
      next: (r) => {
        this.resumeData = r.data;
        const e = r.data?.employee;
        if (e) {
          this.resumeSettings.careerObjective = e.careerObjective || '';
          this.resumeSettings.resumeTemplate  = e.resumeTemplate  || 'minimalist';
          this.resumeSettings.resumeHideContact = e.resumeHideContact || false;
          this.resumeSettings.resumeHideRatings = e.resumeHideRatings || false;
        }
      },
    });
  }

  saveResumeSettings() {
    this.resumeSaving = true;
    this.dataService.updateResumeSettings(this.resumeSettings).subscribe({
      next: () => {
        this.resumeSaving = false;
        this.resumeSaved = true;
        setTimeout(() => (this.resumeSaved = false), 3000);
        this.loadResumeData();
      },
      error: () => (this.resumeSaving = false),
    });
  }

  downloadResume(format: string) {
    const employeeId = this.currentUser?.employeeId;
    if (!employeeId || !this.resumeData) return;
    this.dataService.trackResumeDownload({ employeeId, template: this.resumeSettings.resumeTemplate, format }).subscribe();

    if (format === 'PRINT') {
      window.print();
      return;
    }

    const htmlContent = this.buildResumeExportHTML();
    const blob = new Blob([htmlContent], {
      type: format === 'DOCX'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'text/html',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `resume_${employeeId}_${format.toLowerCase()}.${format === 'DOCX' ? 'docx' : 'html'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  buildResumeExportHTML() {
    const r = this.resumeData;
    const employee = r.employee;
    const sections = [];
    sections.push(`<h1>${employee.firstName} ${employee.lastName}</h1>`);
    sections.push(`<p>${employee.designation} · ${employee.department} · ${employee.employeeCode}</p>`);
    if (!this.resumeSettings.resumeHideContact) {
      sections.push(`<p>${employee.email}${employee.phone ? ' | ' + employee.phone : ''}</p>`);
      sections.push(`<p>${employee.workLocation || ''} ${employee.workMode ? ' | ' + employee.workMode : ''}</p>`);
    }
    if (employee.careerObjective) {
      sections.push(`<h2>Career Objective</h2><p>${employee.careerObjective}</p>`);
    }
    if (r.skills?.length) {
      sections.push('<h2>Skills</h2><ul>' + r.skills.map((s: any) => `<li>${s.name} (${s.category})${this.resumeSettings.resumeHideRatings ? '' : ` - Rating: ${s.finalRating || s.selfRating}`}</li>`).join('') + '</ul>');
    }
    if (r.projects?.length) {
      sections.push('<h2>Projects</h2><ul>' + r.projects.map((p: any) => `<li>${p.name} (${p.projectCode}) - ${p.role || 'Contributor'} | ${p.status} | ${p.technologies || 'Tech N/A'} | ${p.completion}% complete</li>`).join('') + '</ul>');
    }
    if (r.trainings?.length) {
      sections.push('<h2>Trainings</h2><ul>' + r.trainings.map((t: any) => `<li>${t.title} (${t.skill}) - ${t.provider}</li>`).join('') + '</ul>');
    }
    if (r.certificates?.length) {
      sections.push('<h2>Certificates</h2><ul>' + r.certificates.map((c: any) => `<li>${c.name} - ${c.issuer} (${new Date(c.issueDate).toLocaleDateString()})</li>`).join('') + '</ul>');
    }
    if (r.achievements?.length) {
      sections.push('<h2>Achievements</h2><ul>' + r.achievements.map((a: any) => `<li>${a.name} - ${a.description || ''}</li>`).join('') + '</ul>');
    }
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Resume</title></head><body>${sections.join('')}</body></html>`;
  }

  // ----------------------------------------------------------------
  // TICKET OPERATIONS
  // ----------------------------------------------------------------
  viewTicketDetails(t: any) {
    this.ticketLoading = true;
    this.dataService.getTicketById(t.id).subscribe({
      next: (r) => {
        this.selectedTicket = r.data;
        this.ticketLoading = false;
        this.startTicketPoll();
      },
      error: () => (this.ticketLoading = false),
    });
  }

  closeTicketPanel() {
    this.selectedTicket = null;
    this.replyMessage = "";
    this.stopTicketPoll();
  }

  startTicketPoll() {
    this.stopTicketPoll();
    if (!this.selectedTicket || ["CLOSED", "RESOLVED"].includes(this.selectedTicket.status)) return;
    this.ticketPollSub = interval(10000).subscribe(() => {
      if (this.selectedTicket) {
        this.dataService.getTicketById(this.selectedTicket.id).subscribe({
          next: (r) => (this.selectedTicket = r.data),
        });
      }
    });
  }

  stopTicketPoll() {
    if (this.ticketPollSub) {
      this.ticketPollSub.unsubscribe();
      this.ticketPollSub = undefined;
    }
  }

  sendTicketReply() {
    if (!this.replyMessage.trim() || !this.selectedTicket) return;
    this.replyLoading = true;

    // Use FormData since backend expects multipart (for optional attachment support)
    const fd = new FormData();
    fd.append("message", this.replyMessage.trim());

    this.dataService.addTicketMessage(this.selectedTicket.id, fd).subscribe({
      next: () => {
        this.replyMessage = "";
        this.replyLoading = false;
        // Reload conversation
        this.dataService.getTicketById(this.selectedTicket.id).subscribe({
          next: (r) => (this.selectedTicket = r.data),
        });
      },
      error: (err) => {
        this.replyLoading = false;
        alert(err?.error?.message || "Failed to send reply. Please try again.");
      },
    });
  }

  confirmTicketResolved() {
    this.dataService.confirmResolution(this.selectedTicket.id).subscribe({
      next: () => {
        this.selectedTicket = null;
        this.stopTicketPoll();
        this.loadTickets();
      },
      error: (err) => alert(err?.error?.message || "Failed to close ticket."),
    });
  }

  openReopenModal() {
    this.reopenReason = "";
    this.actionError = "";
    this.openModal("reopen", "Reopen This Ticket");
  }

  submitReopen() {
    if (!this.reopenReason.trim()) {
      this.actionError = "Reopen reason is required.";
      return;
    }
    this.dataService.reopenTicket(this.selectedTicket.id, { reason: this.reopenReason }).subscribe({
      next: () => {
        this.closeModal();
        this.dataService.getTicketById(this.selectedTicket.id).subscribe({ next: (r) => (this.selectedTicket = r.data) });
        this.loadTickets();
      },
      error: (err) => (this.actionError = err?.error?.message || "Failed to reopen."),
    });
  }

  // ----------------------------------------------------------------
  // SELF-ASSESSMENT
  // ----------------------------------------------------------------
  openSelfAssessModal(item: any) {
    this.selectedSkillForAssess = item;
    this.selfAssessForm.patchValue({
      selfRating: item.selfRating || 1,
      experienceMonths: item.experienceMonths || 0,
      employeeComments: item.employeeComments || "",
    });
    this.openModal("selfAssess", "Skill Self-Assessment: " + item.skill?.skillName);
  }

  onSaveSelfAssess(isDraft = false) {
    if (this.selfAssessForm.invalid) return;
    const body = { ...this.selfAssessForm.value, isDraft };
    this.dataService.submitSelfAssessment(this.selectedSkillForAssess.id, body).subscribe({
      next: () => { this.closeModal(); this.loadSkills(); },
      error: (err) => (this.actionError = err?.error?.message || "Failed to submit."),
    });
  }

  getRatingLabel(r: number): string {
    return ["", "Beginner", "Basic", "Intermediate", "Advanced", "Expert"][r] || "";
  }

  // ----------------------------------------------------------------
  // QUIZ / ASSESSMENT
  // ----------------------------------------------------------------
  startAssessment(id: string) {
    this.dataService.getAssessmentById(id).subscribe({
      next: (r) => {
        this.activeAssessment = r.data;
        this.currentQuestionIndex = 0;
        this.selectedAnswers = [];
        this.openModal("quiz", "Skill Assessment Quiz");
      },
      error: (err) => alert(err?.error?.message || "Failed to load assessment."),
    });
  }

  getOptionsList(opts: string): string[] {
    return opts ? opts.split("|") : [];
  }

  selectOption(idx: number) { this.selectedAnswers[this.currentQuestionIndex] = idx; }
  prevQuestion() { if (this.currentQuestionIndex > 0) this.currentQuestionIndex--; }
  nextQuestion() {
    if (this.currentQuestionIndex < this.activeAssessment.questions.length - 1)
      this.currentQuestionIndex++;
  }

  submitQuiz() {
    const total = this.activeAssessment.questions.length;
    const answered = this.selectedAnswers.filter((a) => a !== undefined).length;
    if (answered < total) {
      if (!confirm(`You have ${total - answered} unanswered question(s). Submit anyway?`)) return;
    }
    const finalAnswers: number[] = [];
    for (let i = 0; i < total; i++) {
      finalAnswers[i] = this.selectedAnswers[i] !== undefined ? this.selectedAnswers[i] : -1;
    }
    this.dataService.submitAssessment(this.activeAssessment.id, finalAnswers).subscribe({
      next: (r) => {
        this.quizResult = r.data;
        this.activeModal = "quizResult";
        this.modalTitle = "Assessment Result";
        this.loadSkills();
        this.loadSubmissions();
        this.loadStats();
      },
      error: (err) => alert(err?.error?.message || "Failed to submit quiz."),
    });
  }

  // ----------------------------------------------------------------
  // TRAINING PROGRESS
  // ----------------------------------------------------------------
  openProgressModal(plan: any) {
    this.selectedPlanForProgress = plan;
    this.progressForm.patchValue({ progress: plan.progress || 0, employeeComments: plan.employeeComments || "" });
    this.openModal("progress", "Update Training Progress");
  }

  onSaveProgress() {
    if (this.progressForm.invalid) return;
    this.dataService.updateTrainingProgress(this.selectedPlanForProgress.id, this.progressForm.value).subscribe({
      next: () => { this.closeModal(); this.loadTraining(); },
      error: (err) => (this.actionError = err?.error?.message || "Failed to update."),
    });
  }

  // ----------------------------------------------------------------
  // CERTIFICATE UPLOAD
  // ----------------------------------------------------------------
  openCertModal() {
    this.certForm.reset();
    this.selectedFile = null;
    this.actionError = "";
    this.openModal("cert", "Upload Certificate");
  }

  onFileChange(e: any) {
    if (e.target.files.length > 0) this.selectedFile = e.target.files[0];
  }

  onSaveCert() {
    if (this.certForm.invalid) { this.actionError = "Please fill all required fields."; return; }
    if (!this.selectedFile)    { this.actionError = "Please select a certificate file."; return; }

    const fd = new FormData();
    fd.append("file", this.selectedFile);
    Object.entries(this.certForm.value).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== "") fd.append(k, String(v));
    });

    this.dataService.uploadCertificate(fd).subscribe({
      next: () => { this.closeModal(); this.loadCertificates(); },
      error: (err) => (this.actionError = err?.error?.message || "Failed to upload."),
    });
  }

  // ----------------------------------------------------------------
  // TICKET CREATION
  // ----------------------------------------------------------------
  openTicketModal() {
    this.ticketForm.reset({ category: "OTHER", priority: "MEDIUM" });
    this.actionError = "";
    this.openModal("ticket", "Raise Support Ticket");
  }

  onSaveTicket() {
    if (this.ticketForm.invalid) return;
    this.dataService.createTicket(this.ticketForm.value).subscribe({
      next: () => { this.closeModal(); this.loadTickets(); },
      error: (err) => (this.actionError = err?.error?.message || "Failed to create ticket."),
    });
  }

  // ----------------------------------------------------------------
  // SETTINGS
  // ----------------------------------------------------------------
  onChangePasswordSubmit() {
    if (this.changePasswordForm.invalid) return;
    const { currentPassword, newPassword, confirmPassword } = this.changePasswordForm.value;
    if (newPassword !== confirmPassword) { this.settingsError = "Passwords do not match."; return; }
    this.settingsError = "";
    this.authService.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.settingsSuccess = true;
        // auth service's changePassword already calls clearSession() + redirect
      },
      error: (err) => (this.settingsError = err?.error?.message || "Failed to update password."),
    });
  }

  onFeedbackSubmit() {
    if (this.feedbackForm.invalid) return;
    this.feedbackSuccess = true;
    this.feedbackForm.reset({ category: "INTERFACE" });
    setTimeout(() => (this.feedbackSuccess = false), 4000);
  }

  // ----------------------------------------------------------------
  // MODAL HELPERS
  // ----------------------------------------------------------------
  openModal(type: string, title: string) {
    this.activeModal = type;
    this.modalTitle = title;
    this.actionError = "";
  }

  closeModal() {
    this.activeModal = null;
    this.actionError = "";
    this.selectedFile = null;
    this.activeAssessment = null;
    this.quizResult = null;
    this.selectedAnswers = [];
    this.currentQuestionIndex = 0;
  }

  onOverlayClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains("modal-overlay")) {
      this.closeModal();
    }
  }

  // ----------------------------------------------------------------
  // FORMS INIT
  // ----------------------------------------------------------------
  initForms() {
    this.selfAssessForm = this.fb.group({
      selfRating:       [1, Validators.required],
      experienceMonths: [0, Validators.required],
      employeeComments: [""],
    });
    this.progressForm = this.fb.group({
      progress:         [0, Validators.required],
      employeeComments: [""],
    });
    this.certForm = this.fb.group({
      certificateName:      ["", Validators.required],
      issuingOrganization:  ["", Validators.required],
      issueDate:            ["", Validators.required],
      expiryDate:           [""],
    });
    this.ticketForm = this.fb.group({
      subject:     ["", Validators.required],
      category:    ["OTHER", Validators.required],
      priority:    ["MEDIUM", Validators.required],
      description: ["", Validators.required],
    });
    this.changePasswordForm = this.fb.group({
      currentPassword: ["", [Validators.required, Validators.minLength(6)]],
      newPassword:     ["", [Validators.required, Validators.minLength(6)]],
      confirmPassword: ["", [Validators.required, Validators.minLength(6)]],
    });
    this.feedbackForm = this.fb.group({
      category: ["INTERFACE", Validators.required],
      comments: ["", [Validators.required, Validators.minLength(10)]],
    });
  }
}
