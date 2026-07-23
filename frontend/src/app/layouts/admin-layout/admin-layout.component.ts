import { Component, OnInit, OnDestroy } from "@angular/core";
import { Router, NavigationEnd } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { DataService } from "../../core/services/data.service";
import { filter } from "rxjs/operators";
import { Subscription } from "rxjs";

@Component({
  selector: "app-admin-layout",
  template: `
    <div class="app-container">
      <!-- Fixed professional sidebar -->
      <aside class="sidebar">
        <div class="sidebar-wrapper">
          <div class="logo-area">
            <span class="material-icons logo-icon">insights</span>
            <span class="logo-text">SkillSphere</span>
          </div>
          <div class="user-meta">
            <div class="avatar">{{ avatarLetter }}</div>
            <div class="info">
              <span class="name">{{ currentUser?.firstName }} {{ currentUser?.lastName }}</span>
              <span class="role">Super Admin</span>
            </div>
          </div>
          <nav class="nav-menu">
            <a routerLink="/admin/dashboard" routerLinkActive="active" class="nav-item">
              <span class="material-icons">dashboard</span>
              Dashboard
            </a>
            <a routerLink="/admin/employees" routerLinkActive="active" class="nav-item">
              <span class="material-icons">people</span>
              Employees & Teams
            </a>
            <a routerLink="/admin/allocation" routerLinkActive="active" class="nav-item">
              <span class="material-icons">supervisor_account</span>
              Manager Allocation
            </a>
            <a routerLink="/admin/projects" routerLinkActive="active" class="nav-item">
              <span class="material-icons">work</span>
              Projects
            </a>
            <a routerLink="/admin/skills" routerLinkActive="active" class="nav-item">
              <span class="material-icons">workspace_premium</span>
              Skill Catalog
            </a>
            <a routerLink="/admin/training" routerLinkActive="active" class="nav-item">
              <span class="material-icons">school</span>
              Training & Certificates
            </a>
            <a routerLink="/admin/tickets" routerLinkActive="active" class="nav-item">
              <span class="material-icons">confirmation_number</span>
              Support Tickets
            </a>
            <a routerLink="/admin/reports" routerLinkActive="active" class="nav-item">
              <span class="material-icons">bar_chart</span>
              Reports
            </a>
            <a routerLink="/admin/logs" routerLinkActive="active" class="nav-item">
              <span class="material-icons">receipt_long</span>
              Audit & Error Logs
            </a>
            <a routerLink="/admin/profile" routerLinkActive="active" class="nav-item">
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

      <!-- Main viewport panel -->
      <div class="main-panel">
        <header class="top-nav">
          <div class="header-title-block">
            <h2 class="view-title">{{ pageTitle }}</h2>
            <div class="breadcrumb">
              <span>Admin</span>
              <span class="material-icons" style="font-size: 12px;">chevron_right</span>
              <span class="crumb-active">{{ pageTitle }}</span>
            </div>
          </div>
          <div class="header-actions">
            <!-- Theme Toggle -->
            <button class="nav-btn" (click)="toggleTheme()">
              <span class="material-icons">{{ isDark ? 'light_mode' : 'dark_mode' }}</span>
            </button>

            <!-- Notifications Bell -->
            <div class="notif-wrapper">
              <button class="nav-btn" (click)="toggleNotifDropdown()">
                <span class="material-icons">notifications</span>
                <span *ngIf="unreadCount > 0" class="badge-notif">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
              </button>
              
              <!-- Dropdown Box -->
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

        <!-- Route Outlet -->
        <main class="content-viewport">
          <router-outlet></router-outlet>
        </main>

        <footer class="app-layout-footer" style="padding: 16px 30px; text-align: center; font-size: 12px; color: var(--text-muted); border-top: 1px solid var(--border); background: var(--surface-card); margin-top: auto;">
          &copy; 2026 SkillSphere System. Project Author: <strong>Vaidehi Doke</strong> &nbsp;|&nbsp; Email: <a href="mailto:vaidehipdoke2206@gmail.com" style="color: var(--primary); font-weight: 600; text-decoration: none;">vaidehipdoke2206&#64;gmail.com</a>
        </footer>
      </div>
    </div>
  `,
  styles: [],
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  currentUser: any;
  avatarLetter = 'A';
  isDark = false;
  unreadCount = 0;
  notifications: any[] = [];
  showNotifDropdown = false;
  pageTitle = 'Admin Dashboard';

  private routeSub!: Subscription;

  private routeTitleMap: Record<string, string> = {
    '/admin/dashboard':  'Admin Dashboard',
    '/admin/employees':  'Employees & Teams',
    '/admin/allocation': 'Manager Allocation',
    '/admin/projects':   'Projects',
    '/admin/skills':     'Skill Catalog',
    '/admin/training':   'Training & Certificates',
    '/admin/tickets':    'Support Tickets',
    '/admin/reports':    'Reports & Analytics',
    '/admin/logs':       'Audit & Error Logs',
    '/admin/profile':    'My Profile',
  };

  constructor(
    private authService: AuthService,
    private dataService: DataService,
    private router: Router
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.currentUserValue;
    this.avatarLetter = this.currentUser?.firstName?.[0]?.toUpperCase() || 'A';
    this.isDark = localStorage.getItem('theme') === 'dark';
    if (this.isDark) document.body.classList.add('dark-theme');
    this.updateTitle(this.router.url);
    this.routeSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e: any) => this.updateTitle(e.urlAfterRedirects));
    this.loadNotifications();
  }

  ngOnDestroy() {
    if (this.routeSub) this.routeSub.unsubscribe();
  }

  updateTitle(url: string) {
    const base = url.split('?')[0];
    this.pageTitle = this.routeTitleMap[base] || 'Admin Portal';
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
    if (this.isDark) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
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
