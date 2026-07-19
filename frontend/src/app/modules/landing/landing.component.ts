import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { Router } from "@angular/router";

@Component({
  selector: "app-landing",
  template: `
    <div class="landing-container">
      <!-- 1. STICKY GLASSMORPHIC NAVBAR -->
      <nav class="navbar">
        <div class="nav-brand" (click)="scrollTo('home')">
          <span class="material-icons brand-icon">insights</span>
          <span class="brand-name">SkillSphere</span>
        </div>
        <div class="nav-links">
          <a (click)="scrollTo('about')">About</a>
          <a (click)="scrollTo('features')">Features</a>
          <a (click)="scrollTo('workflows')">Workflows</a>
          <a (click)="scrollTo('faqs')">FAQs</a>
          <a (click)="scrollTo('contact')">Contact Us</a>
        </div>
        <div class="nav-actions">
          <button class="btn btn-primary" (click)="router.navigate(['/auth/select-portal'])">
            Access System
          </button>
        </div>
      </nav>

      <!-- 2. HERO SECTION -->
      <section id="home" class="hero-section">
        <div class="hero-overlay"></div>
        <div class="hero-content">
          <span class="badge-hero">ENTERPRISE SKILL & TRAINING PLATFORM</span>
          <h1>Empower Your Workforce, Bridge Skill Gaps</h1>
          <p>Align personnel competencies, automate course recommendations, track professional certificates, and resolve IT helpdesk queries on a single corporate system.</p>
          <div class="hero-buttons">
            <button class="btn btn-primary btn-lg" (click)="router.navigate(['/auth/select-portal'])">
              Explore Portal Gateway
            </button>
            <button class="btn btn-outline btn-lg" (click)="scrollTo('workflows')">
              Learn How It Works
            </button>
          </div>
        </div>
      </section>

      <!-- 3. STATISTICS SECTION -->
      <section class="stats-section">
        <div class="stats-grid">
          <div class="stat-card">
            <h3>98.2%</h3>
            <p>Skill Mapping Accuracy</p>
          </div>
          <div class="stat-card">
            <h3>1 Hour</h3>
            <p>Critical Ticket Response SLA</p>
          </div>
          <div class="stat-card">
            <h3>24/7</h3>
            <p>Competency Auditing</p>
          </div>
          <div class="stat-card">
            <h3>10,000+</h3>
            <p>Personnel Records Managed</p>
          </div>
        </div>
      </section>

      <!-- 4. ABOUT & FEATURES SECTION -->
      <section id="about" class="about-section">
        <div class="section-header">
          <h2>Continuous Competency Upskilling</h2>
          <p>SkillSphere acts as the central intelligence database for tracking designation criteria, skill ratings, training, and SLAs.</p>
        </div>

        <div id="features" class="features-grid">
          <div class="feature-card">
            <span class="material-icons icon-primary">workspace_premium</span>
            <h4>Skill Gap Analysis</h4>
            <p>Automatically calculates differences between target designation required levels and current verified employee ratings.</p>
          </div>
          <div class="feature-card">
            <span class="material-icons icon-secondary">model_training</span>
            <h4>Training Workflows</h4>
            <p>Managers assign training plans directly. Tracks completion rates, actual hours spent, and milestones progress.</p>
          </div>
          <div class="feature-card">
            <span class="material-icons icon-accent">fact_check</span>
            <h4>Certificate Tracking</h4>
            <p>Enables employees to upload credential PDFs and images. Requires manager review before marking as verified.</p>
          </div>
          <div class="feature-card">
            <span class="material-icons icon-primary">confirmation_number</span>
            <h4>Escalated Helpdesk</h4>
            <p>Enterprise support tickets route from Employee to Manager. Can be escalated to Admin queue with custom SLAs.</p>
          </div>
          <div class="feature-card">
            <span class="material-icons icon-secondary">receipt_long</span>
            <h4>Audit Logging</h4>
            <p>Logs all system actions (logins, creations, rating review decisions) to secure non-volatile database tables.</p>
          </div>
          <div class="feature-card">
            <span class="material-icons icon-accent">admin_panel_settings</span>
            <h4>Error Interceptors</h4>
            <p>Global backend middlewares capture stack traces, sanitize credentials, and log server events for administrators.</p>
          </div>
        </div>
      </section>

      <!-- 5. WORKFLOWS SECTION -->
      <section id="workflows" class="workflows-section">
        <div class="section-header">
          <h2>Interactive Portal Roles</h2>
          <p>Explore the specialized workflows configured for each organizational tier.</p>
        </div>

        <!-- Role tab switcher -->
        <div class="tab-controls">
          <button [class.active]="activeWorkflowTab === 'employee'" (click)="setWorkflowTab('employee')">
            Employee Gateway
          </button>
          <button [class.active]="activeWorkflowTab === 'manager'" (click)="setWorkflowTab('manager')">
            Manager Gateway
          </button>
          <button [class.active]="activeWorkflowTab === 'admin'" (click)="setWorkflowTab('admin')">
            Administrator Gateway
          </button>
        </div>

        <div class="workflow-card-details">
          <!-- Employee view -->
          <div *ngIf="activeWorkflowTab === 'employee'" class="workflow-detail-tab">
            <div class="wf-visual">
              <span class="material-icons visual-icon">badge</span>
            </div>
            <div class="wf-content">
              <h4>Upskill, Track Progress, Raise Issues</h4>
              <ul>
                <li>Submit skill self-assessments detailing experience and rating levels (1-5).</li>
                <li>Track training milestones, slide progress indicators, and upload earned certs.</li>
                <li>Raise support tickets with managers, review message timelines, and confirm fixes.</li>
              </ul>
              <button class="btn btn-outline" (click)="router.navigate(['/auth/employee-login'])">Access Employee Portal</button>
            </div>
          </div>

          <!-- Manager view -->
          <div *ngIf="activeWorkflowTab === 'manager'" class="workflow-detail-tab">
            <div class="wf-visual">
              <span class="material-icons visual-icon" style="color: var(--secondary)">supervisor_account</span>
            </div>
            <div class="wf-content">
              <h4>Review Profiles, Assign Tasks, Manage Tickets</h4>
              <ul>
                <li>Review team members' self-assessments. Accept or modify scores with comments.</li>
                <li>Check team skill gaps, assign target training plans, and approve certificate uploads.</li>
                <li>Receive team support tickets. Resolve them locally or escalate to Admin team.</li>
              </ul>
              <button class="btn btn-secondary" (click)="router.navigate(['/auth/manager-login'])">Access Manager Portal</button>
            </div>
          </div>

          <!-- Admin view -->
          <div *ngIf="activeWorkflowTab === 'admin'" class="workflow-detail-tab">
            <div class="wf-visual">
              <span class="material-icons visual-icon" style="color: var(--accent)">admin_panel_settings</span>
            </div>
            <div class="wf-content">
              <h4>System Settings, Bulk CSV Imports, Auditing</h4>
              <ul>
                <li>Manage departments, designations, skill categories, and system thresholds.</li>
                <li>Execute bulk CSV personnel imports and download comprehensive CSV rosters.</li>
                <li>Access non-deletable audit logs, error tables, and configure global SLA targets.</li>
              </ul>
              <button class="btn btn-primary" (click)="router.navigate(['/auth/admin-login'])">Access Admin Portal</button>
            </div>
          </div>
        </div>
      </section>

      <!-- 6. FAQS SECTION -->
      <section id="faqs" class="faqs-section">
        <div class="section-header">
          <h2>Frequently Asked Questions</h2>
          <p>Clear responses to technical queries about the platform.</p>
        </div>

        <div class="faqs-list">
          <div class="faq-item" *ngFor="let faq of faqs; let i = index">
            <div class="faq-question" (click)="toggleFaq(i)">
              <h4>{{ faq.q }}</h4>
              <span class="material-icons">{{ openFaqIndex === i ? 'expand_less' : 'expand_more' }}</span>
            </div>
            <div class="faq-answer" *ngIf="openFaqIndex === i">
              <p>{{ faq.a }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- 7. CONTACT US FORM & COMPANY INFORMATION -->
      <section id="contact" class="contact-section">
        <div class="section-header">
          <h2>Get in Touch</h2>
          <p>Send a message to our systems support office.</p>
        </div>

        <div class="contact-grid">
          <!-- Info Details -->
          <div class="contact-info">
            <h4>Company Information</h4>
            <div class="info-item">
              <span class="material-icons">business</span>
              <p><strong>SkillSphere Tech Inc.</strong><br/>100 Enterprise Way, Suite 400<br/>San Francisco, CA 94107</p>
            </div>
            <div class="info-item">
              <span class="material-icons">email</span>
              <p>support&#64;skillsphere.local</p>
            </div>
            <div class="info-item">
              <span class="material-icons">phone</span>
              <p>+1 (800) 555-0199</p>
            </div>
            <div class="info-item">
              <span class="material-icons">schedule</span>
              <p>Mon - Fri: 09:00 AM - 06:00 PM EST</p>
            </div>
            <div class="info-item">
              <span class="material-icons">language</span>
              <p><a href="http://localhost:4200">www.skillsphere.local</a></p>
            </div>
          </div>

          <!-- Message Form -->
          <div class="contact-form-card">
            <h4>Send Message</h4>
            <form [formGroup]="contactForm" (ngSubmit)="onSubmitContact()">
              <div class="form-group">
                <label>Your Name</label>
                <input type="text" class="form-control" formControlName="name" />
              </div>
              <div class="form-group">
                <label>Email Address</label>
                <input type="email" class="form-control" formControlName="email" />
              </div>
              <div class="form-group">
                <label>Subject</label>
                <input type="text" class="form-control" formControlName="subject" />
              </div>
              <div class="form-group">
                <label>Message Content</label>
                <textarea class="form-control" formControlName="message" rows="4"></textarea>
              </div>

              <div *ngIf="messageSent" class="success-banner">
                Your message has been sent successfully. Support ticket SLA is active!
              </div>

              <button type="submit" class="btn btn-primary w-full" [disabled]="contactForm.invalid">
                Submit Message
              </button>
            </form>
          </div>
        </div>
      </section>

      <!-- 8. FOOTER -->
      <footer class="footer">
        <div class="footer-bottom">
          <p>&copy; 2026 SkillSphere Corp. All rights reserved. Designed for multinational enterprise competency upskilling.</p>
          <div class="footer-socials">
            <a>LinkedIn</a>
            <a>GitHub</a>
            <a>Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .landing-container {
      background-color: var(--background-main);
      color: var(--text-primary);
      transition: var(--transition);
      overflow-x: hidden;
    }
    
    // Sticky Glassmorphic Navbar
    .navbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 70px;
      padding: 0 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      z-index: 1000;
      .nav-brand {
        display: flex;
        align-items: center;
        cursor: pointer;
        gap: 10px;
        .brand-icon { font-size: 28px; color: var(--primary); }
        .brand-name { font-size: 20px; font-weight: 700; color: var(--text-primary); }
      }
      .nav-links {
        display: flex;
        gap: 30px;
        a {
          font-weight: 600;
          font-size: 14px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: var(--transition);
          &:hover { color: var(--primary); }
        }
      }
    }

    // Hero Section
    .hero-section {
      position: relative;
      padding-top: 140px;
      padding-bottom: 100px;
      background: linear-gradient(135deg, rgba(94,114,228,0.1) 0%, rgba(73,184,168,0.05) 100%);
      text-align: center;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
      .hero-content {
        max-width: 800px;
        padding: 0 20px;
        h1 { font-size: 48px; font-weight: 800; line-height: 1.2; margin-bottom: 20px; color: var(--text-primary); }
        p { font-size: 18px; color: var(--text-secondary); margin-bottom: 40px; line-height: 1.6; }
      }
      .badge-hero {
        background-color: rgba(94,114,228,0.15);
        color: var(--primary);
        padding: 6px 16px;
        border-radius: 50px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.5px;
        display: inline-block;
        margin-bottom: 24px;
      }
      .hero-buttons {
        display: flex;
        justify-content: center;
        gap: 20px;
      }
    }

    // Stats Section
    .stats-section {
      padding: 60px 40px;
      background-color: var(--surface-card);
      border-bottom: 1px solid var(--border);
    }
    .stats-grid {
      max-width: 1200px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 30px;
      text-align: center;
    }
    .stat-card {
      padding: 20px;
      h3 { font-size: 36px; font-weight: 800; color: var(--primary); margin-bottom: 8px; }
      p { font-size: 14px; color: var(--text-secondary); font-weight: 500; }
    }

    // About & Features
    .about-section {
      padding: 100px 40px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .section-header {
      text-align: center;
      margin-bottom: 60px;
      h2 { font-size: 32px; font-weight: 700; margin-bottom: 12px; }
      p { color: var(--text-secondary); font-size: 16px; max-width: 600px; margin: 0 auto; }
    }
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 30px;
    }
    .feature-card {
      background-color: var(--surface-card);
      border: 1px solid var(--border);
      border-radius: var(--border-radius);
      padding: 40px 30px;
      transition: var(--transition);
      &:hover {
        transform: translateY(-5px);
        box-shadow: var(--shadow-hover);
      }
      span { font-size: 36px; margin-bottom: 20px; display: inline-block; }
      .icon-primary { color: var(--primary); }
      .icon-secondary { color: var(--secondary); }
      .icon-accent { color: var(--accent); }
      h4 { font-size: 18px; font-weight: 600; margin-bottom: 12px; }
      p { font-size: 13px; color: var(--text-secondary); line-height: 1.6; }
    }

    // Workflows
    .workflows-section {
      padding: 100px 40px;
      background-color: var(--surface-hover);
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
    }
    .tab-controls {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin-bottom: 40px;
      button {
        background: var(--surface-card);
        border: 1px solid var(--border);
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        color: var(--text-secondary);
        transition: var(--transition);
        &:hover { color: var(--primary); border-color: var(--primary); }
        &.active { background-color: var(--primary); color: #ffffff; border-color: var(--primary); }
      }
    }
    .workflow-card-details {
      max-width: 900px;
      margin: 0 auto;
      background: var(--surface-card);
      border: 1px solid var(--border);
      border-radius: var(--border-radius);
      padding: 40px;
      box-shadow: var(--shadow);
    }
    .workflow-detail-tab {
      display: flex;
      gap: 40px;
      align-items: center;
      .wf-visual {
        flex: 1;
        display: flex;
        justify-content: center;
        .visual-icon { font-size: 140px; color: var(--primary); }
      }
      .wf-content {
        flex: 2;
        h4 { font-size: 22px; font-weight: 700; margin-bottom: 20px; }
        ul {
          margin-bottom: 30px;
          padding-left: 20px;
          li { font-size: 14px; color: var(--text-secondary); margin-bottom: 12px; line-height: 1.6; }
        }
      }
    }

    // FAQs
    .faqs-section {
      padding: 100px 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .faq-item {
      background-color: var(--surface-card);
      border: 1px solid var(--border);
      border-radius: var(--border-radius);
      margin-bottom: 16px;
      overflow: hidden;
      .faq-question {
        padding: 20px 30px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        transition: var(--transition);
        &:hover { background-color: var(--surface-hover); }
        h4 { font-size: 15px; font-weight: 600; margin: 0; }
        span { color: var(--text-secondary); }
      }
      .faq-answer {
        padding: 20px 30px;
        border-top: 1px solid var(--border);
        p { font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin: 0; }
      }
    }

    // Contact Us & Company Info
    .contact-section {
      padding: 100px 40px;
      background-color: var(--surface-hover);
      border-top: 1px solid var(--border);
    }
    .contact-grid {
      max-width: 1200px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
      gap: 50px;
    }
    .contact-info {
      h4 { font-size: 20px; font-weight: 700; margin-bottom: 30px; }
      .info-item {
        display: flex;
        gap: 16px;
        margin-bottom: 24px;
        span { font-size: 24px; color: var(--primary); }
        p { font-size: 14px; margin: 0; line-height: 1.6; }
        a { color: var(--primary); font-weight: 600; }
      }
    }
    .contact-form-card {
      background-color: var(--surface-card);
      border: 1px solid var(--border);
      border-radius: var(--border-radius);
      padding: 40px 30px;
      box-shadow: var(--shadow);
      h4 { font-size: 20px; font-weight: 700; margin-bottom: 24px; }
      .success-banner { background-color: rgba(73,184,168,0.1); color: var(--secondary); padding: 12px; border-radius: 8px; font-size: 13px; margin-bottom: 20px; font-weight: 500; }
      .w-full { width: 100%; }
    }

    // Footer
    .footer {
      background-color: var(--surface-card);
      padding: 40px;
      border-top: 1px solid var(--border);
      .footer-bottom {
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        justify-content: space-between;
        align-items: center;
        p { font-size: 13px; color: var(--text-muted); margin: 0; }
        .footer-socials {
          display: flex;
          gap: 20px;
          a { font-size: 13px; font-weight: 600; color: var(--text-secondary); cursor: pointer; &:hover { color: var(--primary); } }
        }
      }
    }
  `],
})
export class LandingComponent implements OnInit {
  activeWorkflowTab: "employee" | "manager" | "admin" = "employee";
  openFaqIndex: number | null = 0;
  contactForm!: FormGroup;
  messageSent = false;

  faqs = [
    { q: "How is the skill gap analysis calculated?", a: "SkillSphere maps every designation requirement to a target proficiency rating (1 to 5). When an employee's verified self-assessment rating falls below that target, the system flags the difference as a skill gap and prompts training." },
    { q: "How does the helpdesk ticket escalation flow work?", a: "Any ticket created by an employee first routes to their reporting manager. The manager can converse and solve it. If escalation is required, the manager clicks Escalate, which routes it directly to the administrator queue with a reset SLA timer." },
    { q: "What are the priority SLAs on support tickets?", a: "SLAs are configured by ticket priority: Critical tickets have a 1-hour response SLA, High is 4 hours, Medium is 8 hours, and Low is 24 hours. The system checks SLA timers via cron schedules." },
    { q: "How secure is user authentication?", a: "We utilize dual-token JWT configurations. Access tokens expire in 15 minutes, while refresh tokens reside in local databases. Refresh token reuse triggers family revocation to safeguard logins." },
  ];

  constructor(private fb: FormBuilder, public router: Router) {}

  ngOnInit() {
    this.contactForm = this.fb.group({
      name: ["", Validators.required],
      email: ["", [Validators.required, Validators.email]],
      subject: ["", Validators.required],
      message: ["", Validators.required],
    });
  }

  setWorkflowTab(tab: "employee" | "manager" | "admin") {
    this.activeWorkflowTab = tab;
  }

  toggleFaq(index: number) {
    this.openFaqIndex = this.openFaqIndex === index ? null : index;
  }

  scrollTo(elementId: string) {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }

  onSubmitContact() {
    if (this.contactForm.invalid) return;
    this.messageSent = true;
    this.contactForm.reset();
    setTimeout(() => {
      this.messageSent = false;
    }, 5000);
  }
}
