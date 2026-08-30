import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiBaseUrl;

  private tokenSubject = new BehaviorSubject<string | null>(null);
  private playerIdSubject = new BehaviorSubject<string | null>(null);
  private initialized = false;

  register(userData: any) {
    return this.http.post(`${this.baseUrl}/auth/register`, userData);
  }

  verifyEmail(token: string) {
    return this.http.get(`${this.baseUrl}/auth/verify?token=${token}`);
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/login`, credentials).pipe(
      tap((res: any) => this.saveToken(res.token))
    );
  }

  restoreSession(): Observable<any> {
    return this.http.get(`${this.baseUrl}/auth/me`).pipe(
      tap((profile: any) => {
        this.initialized = true;
        if (profile?.id) {
          this.playerIdSubject.next(String(profile.id));
        }
      })
    );
  }

  getProfile() {
    return this.http.get(`${this.baseUrl}/player`);
  }

  logout() {
    this.http.post(`${this.baseUrl}/auth/logout`, {}).subscribe({
      complete: () => this.clearSession()
    });
    this.clearSession();
  }

  saveToken(token: string) {
    this.tokenSubject.next(token);
    sessionStorage.setItem('authToken', token);
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

  getPlayerId(): string | null {
    return this.playerIdSubject.value ?? sessionStorage.getItem('playerId');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  clearSession() {
    this.tokenSubject.next(null);
    this.playerIdSubject.next(null);
    sessionStorage.removeItem('authToken');
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
