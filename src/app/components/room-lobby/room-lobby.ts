import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { RoomService } from '../../services/room.service';
import { TriviaService } from '../../services/trivia';
import Swal from 'sweetalert2';

interface TriviaOption {
  id: number;
  title: string;
  totalQuestions: number;
  creatorUsername?: string;
  isMine: boolean;
}

@Component({
  selector: 'app-room-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './room-lobby.html',
  styleUrl: './room-lobby.css'
})
export class RoomLobbyComponent implements OnInit {
  private roomService = inject(RoomService);
  private triviaService = inject(TriviaService);
  private router = inject(Router);

  mode: 'SOLO' | 'TEAM' = 'TEAM';
  triviaId: number | null = null;
  targetScore = 10;
  maxPlayers = 12;
  joinCode = '';
  loadingTrivias = true;
  myTrivias: TriviaOption[] = [];
  publicTrivias: TriviaOption[] = [];

  ngOnInit(): void {
    forkJoin({
      mine: this.triviaService.getMyTrivias(),
      public: this.triviaService.getPublicTrivias()
    }).subscribe({
      next: ({ mine, public: pub }) => {
        const mineList = this.toOptions(Array.from(mine as any[]), true);
        const publicList = this.toOptions(Array.from(pub as any[]), false)
          .filter(p => !mineList.some(m => m.id === p.id));

        this.myTrivias = mineList;
        this.publicTrivias = publicList;

        const first = mineList[0] ?? publicList[0];
        this.triviaId = first?.id ?? null;
        this.loadingTrivias = false;
      },
      error: () => {
        this.loadingTrivias = false;
        Swal.fire('Error', 'No se pudieron cargar las trivias', 'error');
      }
    });
  }

  get hasTrivias(): boolean {
    return this.myTrivias.length + this.publicTrivias.length > 0;
  }

  createRoom(): void {
    if (!this.triviaId) {
      Swal.fire('Atención', 'Selecciona una trivia', 'warning');
      return;
    }

    this.roomService.createRoom({
      triviaId: this.triviaId,
      mode: this.mode,
      targetScore: this.targetScore,
      maxPlayers: this.maxPlayers
    }).subscribe({
      next: (res) => {
        this.router.navigate(['/room', res.code]);
      },
      error: (err) => Swal.fire('Error', err.error?.message || 'No se pudo crear la sala', 'error')
    });
  }

  joinRoom(): void {
    if (!this.joinCode.trim()) return;
    this.roomService.joinRoom(this.joinCode.trim().toUpperCase()).subscribe({
      next: (state) => this.router.navigate(['/room', state.code]),
      error: (err) => Swal.fire('Error', err.error?.message || 'No se pudo unir', 'error')
    });
  }

  private toOptions(items: any[], isMine: boolean): TriviaOption[] {
    return items
      .map(t => ({
        id: t.id,
        title: t.title,
        totalQuestions: t.totalQuestions ?? 0,
        creatorUsername: t.creatorUsername,
        isMine
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }
}
