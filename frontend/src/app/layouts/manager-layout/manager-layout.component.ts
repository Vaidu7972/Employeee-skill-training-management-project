import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { DataService } from "../../core/services/data.service";

@Component({
  selector: "app-manager-layout",
  template: `
    <div class="app-container">
      <aside class="sidebar">
        <div class="sidebar-wrapper">
          <div class="logo-area">
            <span class="material-icons logo-icon">insights</span>
            <span class="logo-text">SkillSphere</span>
          </div>
          <div class="user-meta">
            <div class="avatar">M</div>
            <div class="info">
              <span class="name">{{ currentUser?.firstName }} {{ currentUser?.lastName }}</span>
              <span class="role">Manager Portal</span>
            </div>
          </div>
          <nav class="nav-menu">
            <a routerLink="/manager/dashboard" routerLinkActive="active" class="nav-item">
              <span class="material-icons">dashboard</span>
              Dashboard
            </a>
            <a routerLink="/manager/team" routerLinkActive="active" class="nav-item">
              <span class="material-icons">groups</span>
              My Team
            </a>
            <a routerLink="/manager/reviews" routerLinkActive="active" class="nav-item">
              <span class="material-icons">fact_check</span>
              Skill Reviews
            </a>
            <a routerLink="/manager/training" routerLinkActive="active" class="nav-item">
              <span class="material-icons">model_training</span>
              Training & Certificates
            </a>
            <a routerLink="/manager/projects" routerLinkActive="active" class="nav-item">
              <span class="material-icons">work</span>
              Projects
            </a>
            <a routerLink="/manager/resumes" routerLinkActive="active" class="nav-item">
              <span class="material-icons">description</span>
              Team Resumes
            </a>
            <a routerLink="/manager/profile" routerLinkActive="active" class="nav-item">
              <span class="material-icons">person</span>
              My Profile
            </a>
          </nav>
          <div class="sidebar-footer">
            <button class="btn-logout" (click)="onLogout()">
              <span class="material-icons">logout</span>
              Logout
            </button>
          </div>
        </div>
      </aside>

      <div class="main-panel">
        <header class="top-nav">
          <h2 class="view-title">Manager Workspace</h2>
          <div class="header-actions">
            <button class="nav-btn" (click)="toggleTheme()">
              <span class="material-icons">{{ isDark ? 'light_mode' : 'dark_mode' }}</span>
            </button>

            <div class="notif-wrapper">
              <button class="nav-btn" (click)="toggleNotifDropdown()">
                <span class="material-icons">notifications</span>
                <span *ngIf="unreadCount > 0" class="badge-notif">{{ unreadCount }}</span>
              </button>
              
              <div *ngIf="showNotifDropdown" class="notif-dropdown">
                <div class="dropdown-header">
                  <h4>Notifications</h4>
                  <button (click)="markAllAsRead()">Mark all as read</button>
                </div>
                <div class="dropdown-body">
                  <div *ngIf="notifications.length === 0" class="empty-notif">No notifications</div>
                  <div *ngFor="let n of notifications" class="notif-item" [ngClass]="{ unread: !n.isRead }" (click)="readNotification(n)">
                    <h5>{{ n.title }}</h5>
                    <p>{{ n.message }}</p>
                    <span>{{ n.createdAt | date: 'short' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main class="content-viewport">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .sidebar-wrapper {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 24px 16px;
    }
    .logo-area {
      display: flex;
      align-items: center;
      margin-bottom: 30px;
      padding: 0 10px;
      .logo-icon { font-size: 28px; color: #ffffff; margin-right: 10px; }
      .logo-text { font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; }
    }
    .user-meta {
      display: flex;
      align-items: center;
      padding: 16px 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      margin-bottom: 24px;
      .avatar {
        width: 40px;
        height: 40px;
        background-color: rgba(255, 255, 255, 0.2);
        border-radius: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        margin-right: 12px;
        color: #ffffff;
      }
      .info {
        display: flex;
        flex-direction: column;
        .name { font-size: 14px; font-weight: 600; }
        .role { font-size: 11px; opacity: 0.7; font-weight: 500; }
      }
    }
    .nav-menu {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .nav-item {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      color: rgba(255, 255, 255, 0.85);
      text-decoration: none;
      border-radius: 8px;
      font-weight: 500;
      transition: var(--transition);
      span { margin-right: 12px; font-size: 20px; }
      &:hover, &.active {
        background-color: rgba(255, 255, 255, 0.15);
        color: #ffffff;
      }
    }
    .sidebar-footer {
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    .btn-logout {
      width: 100%;
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.8);
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-radius: 8px;
      font-weight: 500;
      font-size: 14px;
      transition: var(--transition);
      &:hover {
        background-color: rgba(220, 95, 75, 0.15);
        color: #ff9e9e;
      }
      span { margin-right: 12px; font-size: 20px; }
    }
    .top-nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
      .view-title { font-size: 20px; font-weight: 600; color: var(--text-primary); }
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .nav-btn {
      background: var(--surface-card);
      border: 1px solid var(--border);
      width: 40px;
      height: 40px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--text-primary);
      position: relative;
      transition: var(--transition);
      &:hover { background: var(--surface-hover); }
      .badge-notif {
        position: absolute;
        top: -4px;
        right: -4px;
        background: var(--error);
        color: #ffffff;
        font-size: 10px;
        width: 18px;
        height: 18px;
        border-radius: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
      }
    }
    .notif-wrapper {
      position: relative;
    }
    .notif-dropdown {
      position: absolute;
      right: 0;
      top: 48px;
      background: var(--surface-card);
      border: 1px solid var(--border);
      border-radius: var(--border-radius);
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
      width: 320px;
      z-index: 10000;
      .dropdown-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid var(--border);
        h4 { font-weight: 600; font-size: 14px; }
        button { background: transparent; border: none; color: var(--primary); font-size: 12px; cursor: pointer; }
      }
      .dropdown-body {
        max-height: 250px;
        overflow-y: auto;
      }
      .empty-notif { text-align: center; color: var(--text-muted); padding: 20px; }
      .notif-item {
        padding: 12px 16px;
        border-bottom: 1px solid var(--border);
        cursor: pointer;
        transition: var(--transition);
        &:hover { background: var(--surface-hover); }
        &.unread { background-color: rgba(94, 114, 228, 0.03); }
        h5 { font-size: 13px; font-weight: 600; margin-bottom: 2px; }
        p { font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; }
        span { font-size: 10px; color: var(--text-muted); }
      }
    }
  `],
})
export class ManagerLayoutComponent implements OnInit {
  currentUser: any;
  isDark = false;
  unreadCount = 0;
  notifications: any[] = [];
  showNotifDropdown = false;

  constructor(
    private authService: AuthService,
    private dataService: DataService,
    private router: Router
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.currentUserValue;
    this.isDark = localStorage.getItem("theme") === "dark";
    this.loadNotifications();
  }

  loadNotifications() {
    this.dataService.getNotifications().subscribe({
      next: (res) => {
        this.notifications = res.data.notifications;
        this.unreadCount = res.data.unreadCount;
      },
    });
  }

  toggleTheme() {
    this.isDark = !this.isDark;
    this.authService.setDarkTheme(this.isDark);
  }

  toggleNotifDropdown() {
    this.showNotifDropdown = !this.showNotifDropdown;
  }

  readNotification(n: any) {
    if (!n.isRead) {
      this.dataService.markNotificationRead(n.id).subscribe(() => {
        n.isRead = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        if (n.deepLink) {
          this.showNotifDropdown = false;
          this.router.navigateByUrl(n.deepLink);
        }
      });
    } else if (n.deepLink) {
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
