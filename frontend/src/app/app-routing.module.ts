import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";

import { LandingComponent } from "./modules/landing/landing.component";
import { AuthComponent } from "./modules/auth/auth.component";
import { AdminLayoutComponent } from "./layouts/admin-layout/admin-layout.component";
import { ManagerLayoutComponent } from "./layouts/manager-layout/manager-layout.component";
import { EmployeeLayoutComponent } from "./layouts/employee-layout/employee-layout.component";

import { AdminDashboardComponent } from "./modules/admin/admin-dashboard.component";
import { ManagerDashboardComponent } from "./modules/manager/manager-dashboard.component";
import { EmployeeDashboardComponent } from "./modules/employee/employee-dashboard.component";

import { AuthGuard } from "./core/guards/auth.guard";

const routes: Routes = [
  // Landing Page Gateway
  { path: "", component: LandingComponent },

  // Auth Portals
  { path: "auth/select-portal", component: AuthComponent },
  { path: "auth/admin-login", component: AuthComponent },
  { path: "auth/manager-login", component: AuthComponent },
  { path: "auth/employee-login", component: AuthComponent },

  // Admin Gateway Layout
  {
    path: "admin",
    component: AdminLayoutComponent,
    canActivate: [AuthGuard],
    data: { expectedRoles: ["SUPER_ADMIN", "ADMIN_SUPPORT"] },
    children: [
      { path: "dashboard",   component: AdminDashboardComponent },
      { path: "employees",   component: AdminDashboardComponent },
      { path: "skills",      component: AdminDashboardComponent },
      { path: "training",    component: AdminDashboardComponent },
      { path: "tickets",     component: AdminDashboardComponent },
      { path: "logs",        component: AdminDashboardComponent },
      { path: "profile",     component: AdminDashboardComponent },
      { path: "projects",    component: AdminDashboardComponent },
      { path: "reports",     component: AdminDashboardComponent },
      { path: "allocation",  component: AdminDashboardComponent },
      { path: "", redirectTo: "dashboard", pathMatch: "full" },
    ],
  },

  // Manager Gateway Layout
  {
    path: "manager",
    component: ManagerLayoutComponent,
    canActivate: [AuthGuard],
    data: { expectedRoles: ["MANAGER"] },
    children: [
      { path: "dashboard",  component: ManagerDashboardComponent },
      { path: "team",       component: ManagerDashboardComponent },
      { path: "reviews",    component: ManagerDashboardComponent },
      { path: "training",   component: ManagerDashboardComponent },
      { path: "projects",   component: ManagerDashboardComponent },
      { path: "resumes",    component: ManagerDashboardComponent },
      { path: "profile",    component: ManagerDashboardComponent },
      { path: "", redirectTo: "dashboard", pathMatch: "full" },
    ],
  },

  // Employee Gateway Layout
  {
    path: "employee",
    component: EmployeeLayoutComponent,
    canActivate: [AuthGuard],
    data: { expectedRoles: ["EMPLOYEE"] },
    children: [
      { path: "dashboard",    component: EmployeeDashboardComponent },
      { path: "assessment",   component: EmployeeDashboardComponent },
      { path: "skills-test",  component: EmployeeDashboardComponent },
      { path: "training",     component: EmployeeDashboardComponent },
      { path: "career",       component: EmployeeDashboardComponent },
      { path: "tickets",      component: EmployeeDashboardComponent },
      { path: "profile",      component: EmployeeDashboardComponent },
      { path: "projects",     component: EmployeeDashboardComponent },
      { path: "resume",       component: EmployeeDashboardComponent },
      { path: "",             redirectTo: "dashboard", pathMatch: "full" },
    ],
  },

  // Fallbacks
  { path: "**", redirectTo: "" },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
