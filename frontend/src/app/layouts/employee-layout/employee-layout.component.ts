import { Component, OnInit, OnDestroy } from "@angular/core";
import { Router, NavigationEnd } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { DataService } from "../../core/services/data.service";
import { filter } from "rxjs/operators";
import { Subscription } from "rxjs";

@Component({
  selector: "app-employee-layout",
  template: `
    <div class="app-container">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-wrapper">
          <!-- Logo -->
          <div class="logo-area">
            <span class="material-icons logo-icon">insights</span>
            <span class="logo-text">SkillSphere</span>
          </div>

          <!-- User Card -->
          <div class="user-meta">
            <div class="avatar">{{ avatarLetter }}</div>
            <div class="info">
              <span class="name">{{ currentUser?.firstName }} {{ currentUser?.lastName }}</span>
              <span class="role">Employee Portal</span>
            </div>
          </div>

          <!-- Navigation -->
          <nav class="nav-menu">
            <a routerLink="/employee/dashboard" routerLinkActive="active" class="nav-item">
              <span class="material-icons">dashboard</span>
              Overview
            </a>
            <a routerLink="/employee/assessment" routerLinkActive="active" class="nav-item">
              <span class="material-icons">grade</span>
              Skills Matrix
            </a>
            <a routerLink="/employee/skills-test" routerLinkActive="active" class="nav-item">
              <span class="material-icons">quiz</span>
              Skill Assessments
            </a>
            <a routerLink="/employee/training" routerLinkActive="active" class="nav-item">
              <span class="material-icons">school</span>
              Training & Certs
            </a>
            <a routerLink="/employee/projects" routerLinkActive="active" class="nav-item">
              <span class="material-icons">folder_open</span>
              My Projects
            </a>
            <a routerLink="/employee/resume" routerLinkActive="active" class="nav-item">
              <span class="material-icons">description</span>
              My Resume
            </a>
            <a routerLink="/employee/career" routerLinkActive="active" class="nav-item">
              <span class="material-icons">trending_up</span>
              Career Readiness
            </a>
            <a routerLink="/employee/tickets" routerLinkActive="active" class="nav-item">
              <span class="material-icons">support_agent</span>
              Support Tickets
              <span *ngIf="openTicketCount > 0" class="nav-badge">{{ openTicketCount }}</span>
            </a>
            <a routerLink="/employee/profile" routerLinkActive="active" class="nav-item">
              <span class="material-icons">manage_accounts</span>
              Settings
            </a>
          </nav>

          <!-- Footer -->
          <div class="sidebar-footer">
            <button class="btn-logout" (click)="onLogout()">
              <span class="material-icons">logout</span>
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      <!-- Main Panel -->
      <div class="main-panel">
        <!-- Top Bar -->
        <header class="top-nav">
          <div class="header-title-block">
            <h2 class="view-title">{{ pageTitle }}</h2>
            <div class="breadcrumb">
              <span>Employee</span>
              <span class="material-icons" style="font-size: 12px;">chevron_right</span>
              <span class="crumb-active">{{ pageTitle }}</span>
            </div>
          </div>

          <div class="header-actions">
            <button class="nav-btn" (click)="toggleTheme()" title="Toggle theme">
              <span class="material-icons">{{ isDark ? 'light_mode' : 'dark_mode' }}</span>
            </button>

            <div class="notif-wrapper">
              <button class="nav-btn" (click)="toggleNotifDropdown()" title="Notifications">
                <span class="material-icons">notifications</span>
                <span *ngIf="unreadCount > 0" class="badge-notif">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
              </button>

              <div *ngIf="showNotifDropdown" class="notif-dropdown">
                <div class="dropdown-header">
                  <h4>Notifications ({{ unreadCount }} unread)</h4>
                  <button (click)="markAllAsRead()">Mark all read</button>
                </div>
                <div class="dropdown-body">
                  <div *ngIf="notifications.length === 0" class="empty-notif">
                    <span class="material-icons" style="font-size: 32px; color: var(--text-muted); display: block; margin-bottom: 8px;">notifications_none</span>
                    All caught up!
                  </div>
                  <div *ngFor="let n of notifications" class="notif-item" [class.unread]="!n.isRead" (click)="readNotification(n)">
                    <h5>{{ n.title }}</h5>
                    <p>{{ n.message }}</p>
                    <span>{{ n.createdAt | date: 'short' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- User avatar button -->
            <div class="user-chip">
              <div class="chip-avatar">{{ avatarLetter }}</div>
              <span>{{ currentUser?.firstName }}</span>
            </div>
          </div>
        </header>

        <!-- Page Content -->
        <main class="content-viewport">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    /* User Chip in topbar */
    .user-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: var(--surface-hover);
      border: 1px solid var(--border);
      border-radius: 50px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      transition: var(--transition);
      &:hover { border-color: var(--primary); }

      .chip-avatar {
        width: 26px; height: 26px;
        background: linear-gradient(135deg, var(--primary), var(--primary-dark));
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        color: #fff; font-size: 11px; font-weight: 700;
      }
    }

    /* Nav Badge (open ticket count) */
    .nav-badge {
      margin-left: auto;
      background: var(--error);
      color: #ffffff;
      font-size: 10px;
      min-width: 18px;
      height: 18px;
      border-radius: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      padding: 0 5px;
    }
  `],
})
export class EmployeeLayoutComponent implements OnInit, OnDestroy {
  currentUser: any;
  isDark = false;
  unreadCount = 0;
  openTicketCount = 0;
  notifications: any[] = [];
  showNotifDropdown = false;
  pageTitle = "Overview";
  avatarLetter = "E";

  private routeSub!: Subscription;

  private routeTitleMap: Record<string, string> = {
    "/employee/dashboard":   "Overview",
    "/employee/assessment":  "Skills Matrix",
    "/employee/skills-test": "Skill Assessments",
    "/employee/training":    "Training & Certificates",
    "/employee/career":      "Career Readiness",
    "/employee/tickets":     "Support Tickets",
    "/employee/profile":     "Settings & Profile",
    "/employee/projects":    "My Projects",
    "/employee/resume":      "My Resume",
  };

  constructor(
    private authService: AuthService,
    private dataService: DataService,
    private router: Router
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.currentUserValue;
    this.avatarLetter = this.currentUser?.firstName?.[0]?.toUpperCase() || "E";
    this.isDark = localStorage.getItem("theme") === "dark";
    if (this.isDark) document.body.classList.add("dark-theme");

    this.updatePageTitle(this.router.url);

    this.routeSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e: any) => this.updatePageTitle(e.urlAfterRedirects));

    this.loadNotifications();
  }

  ngOnDestroy() {
    if (this.routeSub) this.routeSub.unsubscribe();
  }

  updatePageTitle(url: string) {
    const base = url.split("?")[0];
    this.pageTitle = this.routeTitleMap[base] || "Employee Portal";
  }

  loadNotifications() {
    this.dataService.getNotifications().subscribe({
      next: (res) => {
        this.notifications = res.data?.notifications || [];
        this.unreadCount = res.data?.unreadCount || 0;
      },
    });

    this.dataService.getTickets({ limit: 50 }).subscribe({
      next: (res) => {
        const tickets = res.data || [];
        this.openTicketCount = tickets.filter(
          (t: any) => t.status !== "RESOLVED" && t.status !== "CLOSED"
        ).length;
      },
    });
  }

  toggleTheme() {
    this.isDark = !this.isDark;
    if (this.isDark) {
      document.body.classList.add("dark-theme");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark-theme");
      localStorage.setItem("theme", "light");
    }
  }

  toggleNotifDropdown() {
    this.showNotifDropdown = !this.showNotifDropdown;
  }

  readNotification(n: any) {
    if (!n.isRead) {
      this.dataService.markNotificationRead(n.id).subscribe(() => {
        n.isRead = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      });
    }
    if (n.deepLink) {
      this.showNotifDropdown = false;
      this.router.navigateByUrl(n.deepLink);
    }
  }

  markAllAsRead() {
    this.dataService.markAllNotificationsRead().subscribe(() => {
      this.notifications.forEach((n) => (n.isRead = true));
      this.unreadCount = 0;
    });
  }

  onLogout() {
    this.authService.logout().subscribe(() => {
      this.router.navigate(["/auth/select-portal"]);
    });
  }
}
