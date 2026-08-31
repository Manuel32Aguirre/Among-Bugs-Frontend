import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { AuthService } from './auth';

@Injectable({ providedIn: 'root' })
export class RoomService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private baseUrl = `${environment.apiBaseUrl}/rooms`;
  private client?: Client;

  listOpenRooms() {
    return this.http.get<any[]>(this.baseUrl);
  }

  createRoom(payload: {
    targetScore: number;
    trivia?: any;
    generate?: { prompt: string; questionCount: number; isPublic: boolean };
  }) {
    return this.http.post<any>(this.baseUrl, payload);
  }

  joinRoom(code: string) {
    return this.http.post<any>(`${this.baseUrl}/join`, { code });
  }

  guestJoin(code: string, username: string) {
    return this.http.post<any>(`${this.baseUrl}/guest-join`, { code, username });
  }

  destroyRoom(code: string) {
    return this.http.delete(`${this.baseUrl}/${code}`);
  }

  leaveRoom(code: string) {
    return this.http.post(`${this.baseUrl}/${code}/leave`, {});
  }

  getRoom(code: string) {
    return this.http.get<any>(`${this.baseUrl}/${code}`);
  }

  startRoom(code: string) {
    return this.http.post<any>(`${this.baseUrl}/${code}/start`, {});
  }

  beginPlaying(code: string) {
    return this.http.post<any>(`${this.baseUrl}/${code}/begin-playing`, {});
  }

  answer(code: string, optionIndex: number) {
    return this.http.post<any>(`${this.baseUrl}/${code}/answer`, { optionIndex });
  }

  ackAnswerReveal(code: string) {
    return this.http.post<any>(`${this.baseUrl}/${code}/ack-answer-reveal`, {});
  }

  tickRound(code: string) {
    return this.http.post<any>(`${this.baseUrl}/${code}/tick`, {});
  }

  applyTrick(code: string, trickType: string) {
    return this.http.post<any>(`${this.baseUrl}/${code}/trick`, { trickType });
  }

  vote(code: string, targetPlayerId: number | null, skip = false) {
    return this.http.post<any>(`${this.baseUrl}/${code}/vote`, {
      targetPlayerId,
      skip
    });
  }

  ackEjection(code: string) {
    return this.http.post<any>(`${this.baseUrl}/${code}/ack-ejection`, {});
  }

  connect(roomCode: string, playerId: string, handlers: {
    onRoomUpdate: (state: any) => void;
    onPersonalQuestion: (question: any) => void;
    onTrickApplied: (event: any) => void;
  }) {
    this.disconnect();

    this.client = new Client({
      webSocketFactory: () => new SockJS(`${environment.apiBaseUrl.replace('/api', '')}/ws`),
      connectHeaders: {
        Authorization: `Bearer ${this.auth.getToken()}`
      },
      onConnect: () => {
        this.client?.subscribe(`/topic/room/${roomCode}`, (msg: IMessage) => {
          handlers.onRoomUpdate(JSON.parse(msg.body));
        });
        this.client?.subscribe(`/topic/room/${roomCode}/player/${playerId}`, (msg: IMessage) => {
          handlers.onPersonalQuestion(JSON.parse(msg.body));
        });
        this.client?.subscribe(`/topic/room/${roomCode}/tricks`, (msg: IMessage) => {
          handlers.onTrickApplied(JSON.parse(msg.body));
        });
      }
    });

    this.client.activate();
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.client = undefined;
    }
  }
}
