import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { BehaviorSubject, Observable } from "rxjs";
import { map } from "rxjs/operators";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private apiUrl = "http://localhost:5000/api/auth";
  private currentUserSubject: BehaviorSubject<any>;
  public currentUser: Observable<any>;

  constructor(private http: HttpClient, private router: Router) {
    const cachedUser = localStorage.getItem("currentUser");
    this.currentUserSubject = new BehaviorSubject<any>(cachedUser ? JSON.parse(cachedUser) : null);
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue() {
    return this.currentUserSubject.value;
  }

  login(email: string, password: string, portal: string): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/login`, { email, password, portal })
      .pipe(
        map((res) => {
          if (res && res.success && res.data) {
            localStorage.setItem("accessToken", res.data.accessToken);
            localStorage.setItem("refreshToken", res.data.refreshToken);
            localStorage.setItem("currentUser", JSON.stringify(res.data.user));
            this.currentUserSubject.next(res.data.user);
          }
          return res;
        })
      );
  }

  logout(): Observable<any> {
    const refreshToken = localStorage.getItem("refreshToken");
    return this.http.post<any>(`${this.apiUrl}/logout`, { refreshToken }).pipe(
      map((res) => {
        this.clearSession();
        return res;
      })
    );
  }

  changePassword(body: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/change-password`, body).pipe(
      map((res) => {
        // Log out immediately on password update for security refresh
        this.clearSession();
        return res;
      })
    );
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(body: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reset-password`, body);
  }

  clearSession() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("currentUser");
    this.currentUserSubject.next(null);
    this.router.navigate(["/auth/select-portal"]);
  }

  // Theme Management Helper
  setDarkTheme(isDark: boolean) {
    if (isDark) {
      document.body.classList.add("dark-theme");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark-theme");
      localStorage.setItem("theme", "light");
    }
  }

  initTheme() {
    const theme = localStorage.getItem("theme");
    if (theme === "dark") {
      this.setDarkTheme(true);
    } else {
      this.setDarkTheme(false);
    }
  }
}
