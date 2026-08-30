import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TriviaService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private baseUrl = `${environment.apiBaseUrl}/trivia`;

  /**
   * Genera los headers con el Token JWT y el idioma
   */
  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Accept-Language': 'es-MX',
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
  }

  /**
   * Obtiene todas las trivias públicas para el Home.
   */
  getPublicTrivias() {
    return this.http.get<any[]>(`${this.baseUrl}/public`, { headers: this.getHeaders() });
  }

  /**
   * Obtiene las trivias creadas por el jugador actual.
   */
  getMyTrivias() {
    return this.http.get<any[]>(this.baseUrl, { headers: this.getHeaders() });
  }

  /**
   * Obtener una trivia por ID (para jugar o editar)
   */
  getTriviaById(id: number) {
    return this.http.get(`${this.baseUrl}/${id}`, { headers: this.getHeaders() });
  }

  /**
   * Crear una trivia
   */
  createTrivia(triviaData: any) {
    return this.http.post(this.baseUrl, triviaData, { headers: this.getHeaders() });
  }

  /**
   * Generar y crear una trivia con IA (Groq) a partir de un prompt.
   */
  generateTriviaFromPrompt(data: { prompt: string; questionCount: number; isPublic: boolean }) {
    return this.http.post(`${this.baseUrl}/generate`, data, { headers: this.getHeaders() });
  }

  /**
   * Actualizar una trivia
   */
  updateTrivia(triviaData: any) {
    return this.http.put(this.baseUrl, triviaData, { headers: this.getHeaders() });
  }

  /**
   * Eliminar una trivia
   */
  deleteTrivia(triviaId: number) {
    return this.http.delete(`${this.baseUrl}/${triviaId}`, { headers: this.getHeaders() });
  }

  /**
   * Generar reporte PDF
   */
  getReportPDF() {
    return this.http.get(`${this.baseUrl}/report`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    });
  }

  /**
   * Enviar intento de trivia completada
   */
  submitAttempt(attemptData: any) {
    return this.http.post(`${this.baseUrl}/attempt`, attemptData, { headers: this.getHeaders() });
  }

  /**
   * Obtener rankings de una trivia
   */
  getTriviaRankings(triviaId: number) {
    return this.http.get(`${this.baseUrl}/${triviaId}/rankings`, { headers: this.getHeaders() });
  }
}
