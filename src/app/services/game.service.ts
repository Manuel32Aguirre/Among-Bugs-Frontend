import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PlayQuestion {
  questionId: number;
  questionNumber: number;
  totalQuestions: number;
  displayText: string;
  timeLimitSeconds: number;
  serverTimeMs: number;
  questionDeadlineMs: number;
  trickType: string | null;
  displayStyle: string;
  trickMessage: string | null;
  options: { text: string; index: number }[];
}

@Injectable({ providedIn: 'root' })
export class GameService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiBaseUrl}/game/solo`;

  startSession(triviaId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/start/${triviaId}`, {});
  }

  submitAnswer(sessionToken: string, optionIndex: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/${sessionToken}/answer`, { optionIndex });
  }
}
