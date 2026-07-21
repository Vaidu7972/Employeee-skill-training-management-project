import { Injectable } from "@angular/core";
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from "@angular/router";

@Injectable({
  providedIn: "root",
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const token = localStorage.getItem("accessToken");
    const userStr = localStorage.getItem("currentUser");

    if (!token || !userStr) {
      this.router.navigate(["/auth/select-portal"]);
      return false;
    }

    const user = JSON.parse(userStr);
    const expectedRoles = route.data["expectedRoles"] as string[];

    if (expectedRoles && !expectedRoles.includes(user.role)) {
      // User is logged in but doesn't have right role for this portal section
      if (user.role === "ADMIN") {
        this.router.navigate(["/admin/dashboard"]);
      } else if (user.role === "MANAGER") {
        this.router.navigate(["/manager/dashboard"]);
      } else {
        this.router.navigate(["/employee/dashboard"]);
      }
      return false;
    }

    return true;
  }
}
