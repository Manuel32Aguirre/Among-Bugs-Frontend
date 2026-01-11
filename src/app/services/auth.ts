import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  // Base URL general de tu API
  private baseUrl = 'http://localhost:8080/api';

  // Header para recibir mensajes en español
  private getHeaders() {
    return new HttpHeaders({
      'Accept-Language': 'es-MX'
    });
  }

  // Header con Token para endpoints protegidos
  private getAuthHeaders() {
    const token = this.getToken();
    return new HttpHeaders({
      'Accept-Language': 'es-MX',
      'Authorization': `Bearer ${token}`
    });
  }

  // 1. Registro de nuevo tripulante
  register(userData: any) {
    return this.http.post(`${this.baseUrl}/auth/register`, userData, { headers: this.getHeaders() });
  }

  // 2. Verificación de correo
  verifyEmail(token: string) {
    return this.http.get(`${this.baseUrl}/auth/verify?token=${token}`, { headers: this.getHeaders() });
  }

  // 3. Inicio de sesión
  login(credentials: any) {
    return this.http.post(`${this.baseUrl}/auth/login`, credentials, { headers: this.getHeaders() });
  }

  // 4. Obtener perfil del jugador (Para tu Dashboard/Home)
  getProfile() {
    return this.http.get(`${this.baseUrl}/player`, { headers: this.getAuthHeaders() });
  }

  // --- Gestión del Token JWT ---
  saveToken(token: string) {
    localStorage.setItem('authToken', token);

    // Decodificar el JWT para extraer el playerId
    try {
      const payload = this.decodeJWT(token);
      if (payload && payload.sub) {
        localStorage.setItem('playerId', payload.sub);
      }
    } catch (error) {
      console.error('Error al decodificar el token:', error);
    }
  }

  getToken() {
    return localStorage.getItem('authToken');
  }

  getPlayerId(): string | null {
    return localStorage.getItem('playerId');
  }

  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('playerId');
  }

  // Verifica si hay una sesión activa
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // Método para decodificar JWT (sin verificar firma, solo para leer datos)
  private decodeJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error al decodificar JWT:', error);
      return null;
    }
  }
}
