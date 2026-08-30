import { Component, OnDestroy, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { AuthService } from '../../services/auth';
import { RoomService } from '../../services/room.service';

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

  code = '';
  state: any = null;
  myQuestion: any = null;
  projectionQuestion: any = null;
  selectedAnswer: number | null = null;
  questionTime = 0;
  projectionTime = 0;
  traitorPanelOpen = true;
  trickTargets: any[] = [];
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
        this.state = state;
        if (state.myQuestion) {
          this.myQuestion = state.myQuestion;
        }
        if (state.projectionQuestion) {
          this.projectionQuestion = state.projectionQuestion;
        }
        this.trickTargets = (state.players || []).filter((p: any) => p.alive && p.playerId !== Number(playerId));
        this.syncTimer();
        this.cdr.detectChanges();
      },
      onPersonalQuestion: (question) => {
        this.myQuestion = question;
        this.selectedAnswer = null;
        this.syncTimer();
        this.cdr.detectChanges();
      },
      onTrickApplied: (event) => {
        if (Number(playerId) === event.targetPlayerId) {
          this.myQuestion = event.updatedQuestion;
          this.syncTimer();
          Swal.fire('¡Trampa!', event.message, 'warning');
          this.cdr.detectChanges();
        }
      }
    });

    this.roomService.getRoom(this.code).subscribe({
      next: (state) => {
        this.state = state;
        this.myQuestion = state.myQuestion;
        this.projectionQuestion = state.projectionQuestion;
        this.syncTimer();
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

  submitAnswer(): void {
    if (this.selectedAnswer === null) return;
    this.roomService.answer(this.code, this.selectedAnswer).subscribe({
      next: (state) => {
        this.state = state;
        this.selectedAnswer = null;
        this.cdr.detectChanges();
      },
      error: (err) => Swal.fire('Error', err.error?.message, 'error')
    });
  }

  applyTrick(targetPlayerId: number, trickType: string): void {
    this.roomService.applyTrick(this.code, targetPlayerId, trickType).subscribe({
      error: (err) => Swal.fire('Error', err.error?.message, 'error')
    });
  }

  toggleTraitorUi(traitorUiMode: boolean): void {
    this.roomService.toggleTraitorUi(this.code, traitorUiMode).subscribe();
  }

  vote(targetPlayerId: number): void {
    this.roomService.vote(this.code, targetPlayerId).subscribe({
      error: (err) => Swal.fire('Error', err.error?.message, 'error')
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
