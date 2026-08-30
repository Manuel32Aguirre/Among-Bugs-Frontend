import { Component, OnDestroy, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { AuthService } from '../../services/auth';
import { RoomService } from '../../services/room.service';
import { environment } from '../../../environments/environment';

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
  private http = inject(HttpClient);
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
  showRoleOverlay = false;
  showEjectionOverlay = false;
  ratingScore = 0;
  rated = false;
  private roleTimer?: any;
  private ejectionTimer?: any;
  private beginPlayingSent = false;
  private ackEjectionSent = false;
  private timerSub?: Subscription;

  trickOptions = [
    { type: 'REDUCE_TIME', icon: '⏱️', label: 'Reducir tiempo', hint: 'Mitad de tiempo para todos' },
    { type: 'UPSIDE_DOWN', icon: '🔄', label: 'Texto al revés', hint: 'Pregunta de cabeza' },
    { type: 'REVERSE_TEXT', icon: '🪞', label: 'Texto espejo', hint: 'Letras invertidas' },
    { type: 'SHUFFLE_WORDS', icon: '🔀', label: 'Mezclar palabras', hint: 'Orden caótico' }
  ];

  ngOnInit(): void {
    this.code = (this.route.snapshot.paramMap.get('code') || '').toUpperCase();
    const playerId = this.auth.getPlayerId();
    if (!playerId) {
      this.router.navigate(['/login']);
      return;
    }

    this.roomService.connect(this.code, playerId, {
      onRoomUpdate: (state) => this.applyState(state),
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
          Swal.fire({ icon: 'warning', title: '¡Trampa!', text: event.message, confirmButtonColor: '#7c3aed' });
          this.cdr.detectChanges();
        }
      }
    });

    this.roomService.getRoom(this.code).subscribe({
      next: (state) => this.applyState(state),
      error: () => this.router.navigate(['/home'])
    });
  }

  ngOnDestroy(): void {
    this.timerSub?.unsubscribe();
    clearTimeout(this.roleTimer);
    clearTimeout(this.ejectionTimer);
    this.roomService.disconnect();
  }

  private roleFetched = false;

  private applyState(state: any): void {
    const prevStatus = this.state?.status;
    const myId = Number(this.auth.getPlayerId());
    const prevRole = this.state?.players?.find((p: any) => p.playerId === myId)?.role;

    if (prevRole && state.players) {
      const me = state.players.find((p: any) => p.playerId === myId);
      if (me && !me.role) {
        me.role = prevRole;
      }
    }

    this.state = state;
    if (state.myQuestion) this.myQuestion = state.myQuestion;
    if (state.projectionQuestion) this.projectionQuestion = state.projectionQuestion;
    this.syncAnswerLock();
    this.syncTimer();
    this.handleRoleReveal(prevStatus);
    this.handleEjectionReveal(prevStatus);
    if (state.status === 'PLAYING' && this.isTraitor && this.canApplyTrick && prevStatus === 'ROLE_REVEAL') {
      this.showTrickModal = true;
    }
    this.cdr.detectChanges();

    const myRoleNow = state.players?.find((p: any) => p.playerId === myId)?.role;
    if (state.status === 'ROLE_REVEAL' && !myRoleNow && !this.isHost && !this.roleFetched) {
      this.roleFetched = true;
      this.roomService.getRoom(this.code).subscribe({
        next: (personal) => this.applyState(personal)
      });
    }
    if (state.status !== 'ROLE_REVEAL') {
      this.roleFetched = false;
    }
  }

  private handleRoleReveal(prevStatus: string): void {
    if (this.state?.status === 'ROLE_REVEAL') {
      this.showRoleOverlay = true;
      this.beginPlayingSent = false;
      clearTimeout(this.roleTimer);
      const wait = Math.max(0, (this.state.roleRevealEndsAtMs || Date.now() + 5000) - Date.now());
      this.roleTimer = setTimeout(() => this.finishRoleReveal(), wait || 5000);
    } else if (prevStatus === 'ROLE_REVEAL') {
      this.showRoleOverlay = false;
    }
  }

  private finishRoleReveal(): void {
    this.showRoleOverlay = false;
    if (!this.beginPlayingSent && this.state?.status === 'ROLE_REVEAL') {
      this.beginPlayingSent = true;
      this.roomService.beginPlaying(this.code).subscribe({
        error: () => { this.beginPlayingSent = false; }
      });
    }
    this.cdr.detectChanges();
  }

  private handleEjectionReveal(prevStatus: string): void {
    if (this.state?.status === 'EJECTION_REVEAL') {
      this.showEjectionOverlay = true;
      this.ackEjectionSent = false;
      clearTimeout(this.ejectionTimer);
      const wait = Math.max(0, (this.state.ejectionReveal?.revealEndsAtMs || Date.now() + 5000) - Date.now());
      this.ejectionTimer = setTimeout(() => this.finishEjectionReveal(), wait || 5000);
    } else if (prevStatus === 'EJECTION_REVEAL') {
      this.showEjectionOverlay = false;
    }
  }

  private finishEjectionReveal(): void {
    this.showEjectionOverlay = false;
    if (!this.ackEjectionSent && this.state?.status === 'EJECTION_REVEAL') {
      this.ackEjectionSent = true;
      this.roomService.ackEjection(this.code).subscribe({
        error: () => { this.ackEjectionSent = false; }
      });
    }
    this.cdr.detectChanges();
  }

  get myRole() {
    const playerId = Number(this.auth.getPlayerId());
    return this.state?.players?.find((p: any) => p.playerId === playerId);
  }

  get isHost() {
    const playerId = Number(this.auth.getPlayerId());
    return this.state?.hostPlayerId != null && this.state.hostPlayerId === playerId;
  }

  get isTraitor() {
    return this.myRole?.role === 'TRAITOR';
  }

  get isDead() {
    return this.myRole && !this.myRole.alive;
  }

  get canApplyTrick() {
    return this.isTraitor && this.myRole?.alive && this.state?.status === 'PLAYING'
      && (this.myRole?.tricksUsedThisRound ?? 0) < 3;
  }

  get tricksRemaining() {
    return Math.max(0, 3 - (this.myRole?.tricksUsedThisRound ?? 0));
  }

  get canStartGame() {
    return (this.state?.players?.length ?? 0) >= MIN_PLAYERS;
  }

  get aliveCrew() {
    return (this.state?.players || []).filter((p: any) => p.alive && p.role !== 'TRAITOR');
  }

  get deadPlayers() {
    return (this.state?.players || []).filter((p: any) => !p.alive);
  }

  get traitorPlayer() {
    return (this.state?.players || []).find((p: any) => p.role === 'TRAITOR');
  }

  private syncAnswerLock(): void {
    if (this.myRole?.answeredThisRound) this.answerLocked = true;
    if (this.state?.status === 'VOTING' && this.state.currentRound !== this.lastVoteRound) {
      this.voteLocked = false;
      this.lastVoteRound = this.state.currentRound;
    }
    if (this.state?.status === 'PLAYING' && !this.myRole?.answeredThisRound) {
      this.answerLocked = false;
    }
  }

  copyCode(): void {
    navigator.clipboard.writeText(this.state?.code || this.code).then(() => {
      Swal.fire({ icon: 'success', title: 'Copiado', timer: 1000, showConfirmButton: false });
    });
  }

  startGame(): void {
    this.roomService.startRoom(this.code).subscribe({
      error: (err) => Swal.fire('Error', err.error?.message, 'error')
    });
  }

  selectAnswer(optionIndex: number): void {
    if (this.answerLocked || this.selectedAnswer !== null) return;
    this.selectedAnswer = optionIndex;
    this.answerLocked = true;
    this.roomService.answer(this.code, optionIndex).subscribe({
      next: (state) => this.applyState(state),
      error: (err) => {
        this.answerLocked = false;
        this.selectedAnswer = null;
        Swal.fire('Error', err.error?.message, 'error');
        this.cdr.detectChanges();
      }
    });
  }

  openTrickModal(): void {
    if (this.canApplyTrick) this.showTrickModal = true;
  }

  closeTrickModal(): void {
    this.showTrickModal = false;
  }

  applyGlobalTrick(trickType: string): void {
    if (!this.canApplyTrick) return;
    this.roomService.applyTrick(this.code, trickType).subscribe({
      next: () => {
        this.showTrickModal = false;
        Swal.fire({ icon: 'success', title: 'Trampa activada', timer: 1200, showConfirmButton: false });
      },
      error: (err) => Swal.fire('Error', err.error?.message, 'error')
    });
  }

  vote(targetPlayerId: number): void {
    if (this.voteLocked) return;
    this.voteLocked = true;
    this.roomService.vote(this.code, targetPlayerId, false).subscribe({
      error: (err) => {
        this.voteLocked = false;
        Swal.fire('Error', err.error?.message, 'error');
      }
    });
  }

  skipVote(): void {
    if (this.voteLocked) return;
    this.voteLocked = true;
    this.roomService.vote(this.code, null, true).subscribe({
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
    if (!this.myQuestion && !this.projectionQuestion) return;
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

  submitRating(score: number): void {
    if (this.rated || !this.state?.triviaId) return;
    this.ratingScore = score;
    this.http.post(`${environment.apiBaseUrl}/ratings/trivia/${this.state.triviaId}`, { score }).subscribe({
      next: () => {
        this.rated = true;
        Swal.fire({ icon: 'success', title: '¡Gracias!', timer: 1200, showConfirmButton: false });
        this.cdr.detectChanges();
      },
      error: (err) => Swal.fire('Error', err.error?.message || 'No se pudo calificar', 'error')
    });
  }

  leaveRoom(): void {
    this.router.navigate(['/home']);
  }
}
