import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiBaseUrl;

  private tokenSubject = new BehaviorSubject<string | null>(null);
  private playerIdSubject = new BehaviorSubject<string | null>(null);
  private refreshInFlight: Observable<{ token: string; refreshToken?: string }> | null = null;

  register(userData: any) {
    return this.http.post(`${this.baseUrl}/auth/register`, userData);
  }

  verifyEmail(token: string) {
    return this.http.get(`${this.baseUrl}/auth/verify?token=${token}`);
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/login`, credentials, { withCredentials: true }).pipe(
      tap((res: any) => this.saveTokens(res.token, res.refreshToken))
    );
  }

  refreshSession(): Observable<{ token: string; refreshToken?: string }> {
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    const body = this.getRefreshToken() ? { refreshToken: this.getRefreshToken() } : {};

    this.refreshInFlight = this.http.post<any>(`${this.baseUrl}/auth/refresh`, body, { withCredentials: true }).pipe(
      tap((res) => this.saveTokens(res.token, res.refreshToken)),
      map((res) => ({ token: res.token as string, refreshToken: res.refreshToken as string | undefined })),
      finalize(() => {
        this.refreshInFlight = null;
      }),
      shareReplay(1)
    );

    return this.refreshInFlight;
  }

  ensureFreshSession(): Observable<boolean> {
    if (!this.isLoggedIn() || this.isGuest()) {
      return of(true);
    }

    if (!this.isAccessTokenExpiringSoon()) {
      return of(true);
    }

    return this.refreshSession().pipe(
      map(() => true),
      catchError(() => {
        this.clearSession();
        return of(false);
      })
    );
  }

  getProfile() {
    return this.http.get(`${this.baseUrl}/player`);
  }

  logout() {
    this.http.post(`${this.baseUrl}/auth/logout`, {}, { withCredentials: true }).subscribe({
      complete: () => this.clearSession()
    });
    this.clearSession();
  }

  saveToken(token: string) {
    this.saveTokens(token);
  }

  saveTokens(token: string, refreshToken?: string | null) {
    this.tokenSubject.next(token);
    sessionStorage.setItem('authToken', token);
    if (refreshToken) {
      sessionStorage.setItem('refreshToken', refreshToken);
    }
    const payload = this.decodeJWT(token);
    if (payload?.sub) {
      this.playerIdSubject.next(payload.sub);
      sessionStorage.setItem('playerId', payload.sub);
    }
    const guest = payload?.guest === true || (payload?.sub != null && Number(payload.sub) < 0);
    sessionStorage.setItem('isGuest', guest ? '1' : '0');
  }

  isGuest(): boolean {
    if (sessionStorage.getItem('isGuest') === '1') return true;
    const id = this.getPlayerId();
    return !!id && Number(id) < 0;
  }

  getToken(): string | null {
    return this.tokenSubject.value ?? sessionStorage.getItem('authToken');
  }

  getRefreshToken(): string | null {
    return sessionStorage.getItem('refreshToken');
  }

  getPlayerId(): string | null {
    return this.playerIdSubject.value ?? sessionStorage.getItem('playerId');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  isAccessTokenExpiringSoon(thresholdMs = 5 * 60 * 1000): boolean {
    const payload = this.decodeJWT(this.getToken() || '');
    if (!payload?.exp) return false;
    return payload.exp * 1000 - Date.now() <= thresholdMs;
  }

  clearSession() {
    this.tokenSubject.next(null);
    this.playerIdSubject.next(null);
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('playerId');
    sessionStorage.removeItem('isGuest');
  }

  private decodeJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }
}
