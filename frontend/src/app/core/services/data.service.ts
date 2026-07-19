import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class DataService {
  private baseApi = "http://localhost:5000/api";

  constructor(private http: HttpClient) {}

  // Helper to build HttpParams from plain objects
  private buildParams(queryObj: any): HttpParams {
    let params = new HttpParams();
    if (queryObj) {
      Object.keys(queryObj).forEach((key) => {
        if (queryObj[key] !== undefined && queryObj[key] !== null && queryObj[key] !== "") {
          params = params.set(key, String(queryObj[key]));
        }
      });
    }
    return params;
  }

  // ----------------------------------------------------
  // 1. Employees APIs
  // ----------------------------------------------------
  getEmployees(query?: any): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/employees`, { params: this.buildParams(query) });
  }

  createEmployee(body: any): Observable<any> {
    return this.http.post<any>(`${this.baseApi}/employees`, body);
  }

  updateEmployee(id: string, body: any): Observable<any> {
    return this.http.put<any>(`${this.baseApi}/employees/${id}`, body);
  }

  toggleEmployeeStatus(id: string, status: string): Observable<any> {
    return this.http.put<any>(`${this.baseApi}/employees/${id}/status`, { status });
  }

  getManagerCapacities(): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/employees/managers/capacities`);
  }

  allocateManager(body: any): Observable<any> {
    return this.http.post<any>(`${this.baseApi}/employees/managers/allocate`, body);
  }

  importEmployeesCSV(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseApi}/employees/import/csv`, formData);
  }

  exportEmployeesCSV(): string {
    return `${this.baseApi}/employees/export/csv?accessToken=${localStorage.getItem("accessToken")}`;
  }

  // Departments & Designations
  getDepartments(query?: any): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/org/departments`, { params: this.buildParams(query) });
  }

  createDepartment(body: any): Observable<any> {
    return this.http.post<any>(`${this.baseApi}/org/departments`, body);
  }

  updateDepartment(id: string, body: any): Observable<any> {
    return this.http.put<any>(`${this.baseApi}/org/departments/${id}`, body);
  }

  getDesignations(query?: any): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/org/designations`, { params: this.buildParams(query) });
  }

  createDesignation(body: any): Observable<any> {
    return this.http.post<any>(`${this.baseApi}/org/designations`, body);
  }

  updateDesignation(id: string, body: any): Observable<any> {
    return this.http.put<any>(`${this.baseApi}/org/designations/${id}`, body);
  }

  // ----------------------------------------------------
  // 2. Skills APIs
  // ----------------------------------------------------
  getCategories(): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/skills/categories`);
  }

  createCategory(body: any): Observable<any> {
    return this.http.post<any>(`${this.baseApi}/skills/categories`, body);
  }

  getSkills(query?: any): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/skills`, { params: this.buildParams(query) });
  }

  createSkill(body: any): Observable<any> {
    return this.http.post<any>(`${this.baseApi}/skills`, body);
  }

  updateSkill(id: string, body: any): Observable<any> {
    return this.http.put<any>(`${this.baseApi}/skills/${id}`, body);
  }

  assignSkill(body: any): Observable<any> {
    return this.http.post<any>(`${this.baseApi}/skills/assign`, body);
  }

  submitSelfAssessment(id: string, body: any): Observable<any> {
    return this.http.put<any>(`${this.baseApi}/skills/assessment/${id}`, body);
  }

  reviewAssessment(id: string, body: any): Observable<any> {
    return this.http.put<any>(`${this.baseApi}/skills/review/${id}`, body);
  }

  getSkillGapAnalysis(query?: any): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/skills/gap-analysis`, { params: this.buildParams(query) });
  }

  // ----------------------------------------------------
  // 3. Training & Certificates APIs
  // ----------------------------------------------------
  getProviders(): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/training/providers`);
  }

  createProvider(body: any): Observable<any> {
    return this.http.post<any>(`${this.baseApi}/training/providers`, body);
  }

  getTrainingPlans(query?: any): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/training/plans`, { params: this.buildParams(query) });
  }

  createTrainingPlan(body: any): Observable<any> {
    return this.http.post<any>(`${this.baseApi}/training/plans`, body);
  }

  updateTrainingProgress(id: string, body: any): Observable<any> {
    return this.http.put<any>(`${this.baseApi}/training/plans/${id}/progress`, body);
  }

  verifyTraining(id: string, body: any): Observable<any> {
    return this.http.put<any>(`${this.baseApi}/training/plans/${id}/verify`, body);
  }

  getCertificates(query?: any): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/training/certificates`, { params: this.buildParams(query) });
  }

  uploadCertificate(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseApi}/training/certificates/upload`, formData);
  }

  verifyCertificate(id: string, body: any): Observable<any> {
    return this.http.put<any>(`${this.baseApi}/training/certificates/${id}/verify`, body);
  }

  // ----------------------------------------------------
  // 4. Support Tickets APIs
  // ----------------------------------------------------
  getTickets(query?: any): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/ticket`, { params: this.buildParams(query) });
  }

  getTicketById(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/ticket/${id}`);
  }

  createTicket(body: any): Observable<any> {
    return this.http.post<any>(`${this.baseApi}/ticket`, body);
  }

  assignTicket(id: string, body: any): Observable<any> {
    return this.http.put<any>(`${this.baseApi}/ticket/${id}/assign`, body);
  }

  addTicketMessage(id: string, formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseApi}/ticket/${id}/messages`, formData);
  }

  resolveTicket(id: string, body: any): Observable<any> {
    return this.http.put<any>(`${this.baseApi}/ticket/${id}/resolve`, body);
  }

  confirmResolution(id: string): Observable<any> {
    return this.http.put<any>(`${this.baseApi}/ticket/${id}/confirm`, {});
  }

  reopenTicket(id: string, body: any): Observable<any> {
    return this.http.put<any>(`${this.baseApi}/ticket/${id}/reopen`, body);
  }

  escalateTicket(id: string, reason: string): Observable<any> {
    return this.http.put<any>(`${this.baseApi}/ticket/${id}/escalate`, { reason });
  }

  // ----------------------------------------------------
  // 5. System Statistics & Logs
  // ----------------------------------------------------
  getAdminDashboard(): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/system/dashboard/admin`);
  }

  getManagerDashboard(): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/system/dashboard/manager`);
  }

  getEmployeeDashboard(): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/system/dashboard/employee`);
  }

  getAuditLogs(query?: any): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/system/audit-logs`, { params: this.buildParams(query) });
  }

  getErrorLogs(query?: any): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/system/error-logs`, { params: this.buildParams(query) });
  }

  getNotifications(): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/system/notifications`);
  }

  markNotificationRead(id: string): Observable<any> {
    return this.http.put<any>(`${this.baseApi}/system/notifications/${id}/read`, {});
  }

  markAllNotificationsRead(): Observable<any> {
    return this.http.put<any>(`${this.baseApi}/system/notifications/read-all`, {});
  }

  deleteNotification(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseApi}/system/notifications/${id}`);
  }

  getCareerReadiness(query?: any): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/system/career-readiness`, { params: this.buildParams(query) });
  }

  // ----------------------------------------------------
  // 6. Skill Assessments APIs
  // ----------------------------------------------------
  getAssessments(query?: any): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/assessments`, { params: this.buildParams(query) });
  }

  getAssessmentById(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/assessments/${id}`);
  }

  submitAssessment(id: string, answers: number[]): Observable<any> {
    return this.http.post<any>(`${this.baseApi}/assessments/${id}/submit`, { answers });
  }

  getMySubmissions(): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/assessments/submissions/my`);
  }

  getAllSubmissions(): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/assessments/submissions`);
  }

  // ----------------------------------------------------
  // 7. Projects APIs
  // ----------------------------------------------------
  getProjects(query?: any): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/projects`, { params: this.buildParams(query) });
  }

  getProjectById(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/projects/${id}`);
  }

  createProject(body: any): Observable<any> {
    return this.http.post<any>(`${this.baseApi}/projects`, body);
  }

  updateProject(id: string, body: any): Observable<any> {
    return this.http.put<any>(`${this.baseApi}/projects/${id}`, body);
  }

  archiveProject(id: string): Observable<any> {
    return this.http.put<any>(`${this.baseApi}/projects/${id}/archive`, {});
  }

  deleteProject(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseApi}/projects/${id}`);
  }

  assignEmployeeToProject(projectId: string, body: any): Observable<any> {
    return this.http.post<any>(`${this.baseApi}/projects/${projectId}/assign`, body);
  }

  unassignEmployeeFromProject(projectId: string, employeeId: string): Observable<any> {
    return this.http.put<any>(`${this.baseApi}/projects/${projectId}/unassign/${employeeId}`, {});
  }

  getEmployeeProjects(employeeId: string): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/projects/employee/${employeeId}`);
  }

  getManagerProjects(managerId: string): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/projects/manager/${managerId}`);
  }

  addProjectSkill(projectId: string, body: any): Observable<any> {
    return this.http.post<any>(`${this.baseApi}/projects/${projectId}/skills`, body);
  }

  // ----------------------------------------------------
  // 8. Resume APIs
  // ----------------------------------------------------
  getResumeData(employeeId: string): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/resume/${employeeId}`);
  }

  getTeamResumes(managerId: string): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/resume/team/${managerId}`);
  }

  updateResumeSettings(body: any): Observable<any> {
    return this.http.put<any>(`${this.baseApi}/resume/settings`, body);
  }

  suggestResumeImprovements(body: any): Observable<any> {
    return this.http.put<any>(`${this.baseApi}/resume/feedback`, body);
  }

  trackResumeDownload(body: any): Observable<any> {
    return this.http.post<any>(`${this.baseApi}/resume/download`, body);
  }

  // ----------------------------------------------------
  // 9. Reports APIs
  // ----------------------------------------------------
  getReportEmployees(query?: any): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/reports/employees`, { params: this.buildParams(query) });
  }

  getReportManagers(query?: any): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/reports/managers`, { params: this.buildParams(query) });
  }

  getReportProjects(query?: any): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/reports/projects`, { params: this.buildParams(query) });
  }

  getReportTraining(query?: any): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/reports/training`, { params: this.buildParams(query) });
  }

  getReportSkills(query?: any): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/reports/skills`, { params: this.buildParams(query) });
  }

  getReportCertificates(query?: any): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/reports/certificates`, { params: this.buildParams(query) });
  }

  getReportTickets(query?: any): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/reports/tickets`, { params: this.buildParams(query) });
  }

  getReportDownloads(): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/reports/downloads`);
  }

  globalSearch(q: string): Observable<any> {
    return this.http.get<any>(`${this.baseApi}/reports/search`, { params: this.buildParams({ q }) });
  }
}

