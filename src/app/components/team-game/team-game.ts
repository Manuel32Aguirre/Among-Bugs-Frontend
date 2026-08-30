import { Component, OnDestroy, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { AuthService } from '../../services/auth';
import { RoomService } from '../../services/room.service';

const MIN_PLAYERS = 3;

@Component({
  selector: 'app-team-game',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './team-game.html',
  styleUrl: './team-game.css'
})
export class TeamGameComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private roomService = inject(RoomService);
  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  readonly minPlayers = MIN_PLAYERS;

  code = '';
  state: any = null;
  myQuestion: any = null;
  projectionQuestion: any = null;
  selectedAnswer: number | null = null;
  answerLocked = false;
  voteLocked = false;
  private lastVoteRound = 0;
  questionTime = 0;
  projectionTime = 0;
  showTrickModal = false;
  trickOptions = [
    { type: 'REDUCE_TIME', icon: '⏱️', label: 'Reducir tiempo', hint: 'La mitad del tiempo para todos' },
    { type: 'UPSIDE_DOWN', icon: '🔄', label: 'Texto al revés', hint: 'Pregunta de cabeza para todos' },
    { type: 'REVERSE_TEXT', icon: '🪞', label: 'Texto espejo', hint: 'Letras invertidas para todos' },
    { type: 'SHUFFLE_WORDS', icon: '🔀', label: 'Mezclar palabras', hint: 'Orden caótico para todos' }
  ];
  private timerSub?: Subscription;

  ngOnInit(): void {
    this.code = (this.route.snapshot.paramMap.get('code') || '').toUpperCase();
    const playerId = this.auth.getPlayerId();
    if (!playerId) {
      this.router.navigate(['/login']);
      return;
    }

    this.roomService.connect(this.code, playerId, {
      onRoomUpdate: (state) => {
        const prevRound = this.state?.currentRound;
        this.state = state;
        if (state.myQuestion) {
          this.myQuestion = state.myQuestion;
        }
        if (state.projectionQuestion) {
          this.projectionQuestion = state.projectionQuestion;
        }
        this.syncAnswerLock();
        this.syncTimer();
        if (state.status === 'PLAYING' && state.currentRound !== prevRound) {
          this.maybeOpenTraitorModal();
        }
        this.cdr.detectChanges();
      },
      onPersonalQuestion: (question) => {
        this.myQuestion = question;
        this.selectedAnswer = null;
        this.answerLocked = false;
        this.syncTimer();
        this.cdr.detectChanges();
      },
      onTrickApplied: (event) => {
        if (Number(playerId) === event.targetPlayerId) {
          this.myQuestion = event.updatedQuestion;
          this.syncTimer();
          Swal.fire({
            icon: 'warning',
            title: '¡Trampa!',
            text: event.message,
            confirmButtonColor: '#7c3aed'
          });
          this.cdr.detectChanges();
        }
      }
    });

    this.roomService.getRoom(this.code).subscribe({
      next: (state) => {
        this.state = state;
        this.myQuestion = state.myQuestion;
        this.projectionQuestion = state.projectionQuestion;
        this.syncAnswerLock();
        this.syncTimer();
        this.maybeOpenTraitorModal();
        this.cdr.detectChanges();
      },
      error: () => this.router.navigate(['/rooms'])
    });
  }

  ngOnDestroy(): void {
    this.timerSub?.unsubscribe();
    this.roomService.disconnect();
  }

  get myRole() {
    const playerId = Number(this.auth.getPlayerId());
    return this.state?.players?.find((p: any) => p.playerId === playerId);
  }

  get isHost() {
    const playerId = Number(this.auth.getPlayerId());
    return this.state?.hostPlayerId != null && this.state.hostPlayerId === playerId;
  }

  get canApplyTrick() {
    return this.isTraitor
      && this.myRole?.alive
      && this.state?.status === 'PLAYING'
      && (this.myRole?.tricksUsedThisRound ?? 0) < 3;
  }

  get tricksRemaining() {
    return Math.max(0, 3 - (this.myRole?.tricksUsedThisRound ?? 0));
  }

  get isTraitor() {
    return this.myRole?.role === 'TRAITOR';
  }

  get canStartGame() {
    return (this.state?.players?.length ?? 0) >= MIN_PLAYERS;
  }

  private syncAnswerLock(): void {
    if (this.myRole?.answeredThisRound) {
      this.answerLocked = true;
    }
    if (this.state?.status === 'VOTING' && this.state.currentRound !== this.lastVoteRound) {
      this.voteLocked = false;
      this.lastVoteRound = this.state.currentRound;
    }
    if (this.state?.status === 'PLAYING' && !this.myRole?.answeredThisRound) {
      this.answerLocked = false;
    }
  }

  private maybeOpenTraitorModal(): void {
    if (this.state?.status === 'PLAYING' && this.isTraitor && this.canApplyTrick) {
      this.showTrickModal = true;
    }
  }

  copyCode(): void {
    navigator.clipboard.writeText(this.state?.code || this.code).then(() => {
      Swal.fire({
        icon: 'success',
        title: 'Copiado',
        text: 'Código copiado al portapapeles',
        timer: 1200,
        showConfirmButton: false
      });
    });
  }

  startGame(): void {
    this.roomService.startRoom(this.code).subscribe({
      error: (err) => Swal.fire('Error', err.error?.message, 'error')
    });
  }

  selectAnswer(optionIndex: number): void {
    if (this.answerLocked || this.selectedAnswer !== null) {
      return;
    }
    this.selectedAnswer = optionIndex;
    this.answerLocked = true;
    this.roomService.answer(this.code, optionIndex).subscribe({
      next: (state) => {
        this.state = state;
        this.syncAnswerLock();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.answerLocked = false;
        this.selectedAnswer = null;
        Swal.fire('Error', err.error?.message, 'error');
        this.cdr.detectChanges();
      }
    });
  }

  openTrickModal(): void {
    if (this.canApplyTrick) {
      this.showTrickModal = true;
    }
  }

  closeTrickModal(): void {
    this.showTrickModal = false;
  }

  applyGlobalTrick(trickType: string): void {
    if (!this.canApplyTrick) {
      return;
    }
    this.roomService.applyTrick(this.code, trickType).subscribe({
      next: () => {
        this.showTrickModal = false;
        Swal.fire({
          icon: 'success',
          title: 'Trampa activada',
          text: 'Se aplicó a todos los tripulantes',
          timer: 1400,
          showConfirmButton: false
        });
        this.cdr.detectChanges();
      },
      error: (err) => Swal.fire('Error', err.error?.message, 'error')
    });
  }

  vote(targetPlayerId: number): void {
    if (this.voteLocked) {
      return;
    }
    this.voteLocked = true;
    this.roomService.vote(this.code, targetPlayerId).subscribe({
      error: (err) => {
        this.voteLocked = false;
        Swal.fire('Error', err.error?.message, 'error');
      }
    });
  }

  syncTimer(): void {
    this.timerSub?.unsubscribe();

    const tick = () => {
      if (this.myQuestion) {
        this.questionTime = Math.max(0, Math.ceil((this.myQuestion.questionDeadlineMs - Date.now()) / 1000));
      }
      if (this.projectionQuestion) {
        this.projectionTime = Math.max(0, Math.ceil((this.projectionQuestion.questionDeadlineMs - Date.now()) / 1000));
      }
      this.cdr.markForCheck();
    };

    if (!this.myQuestion && !this.projectionQuestion) {
      return;
    }

    tick();
    this.timerSub = interval(250).subscribe(tick);
  }

  getProjectionClass(): string {
    const style = this.projectionQuestion?.displayStyle ?? 'NORMAL';
    if (style === 'UPSIDE_DOWN') return 'upside-down';
    if (style === 'REVERSED') return 'reversed';
    return '';
  }

  getDisplayClass(): string {
    const style = this.myQuestion?.displayStyle ?? 'NORMAL';
    if (style === 'UPSIDE_DOWN') return 'upside-down';
    if (style === 'REVERSED') return 'reversed';
    return '';
  }

  leaveRoom(): void {
    this.router.navigate(['/home']);
  }
}
