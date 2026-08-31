import { Component, OnDestroy, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { AuthService } from '../../services/auth';
import { RoomService } from '../../services/room.service';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { apiErrorMessage } from '../../utils/api-error';
import { copyToClipboard } from '../../utils/clipboard';
import { environment } from '../../../environments/environment';

const MIN_PLAYERS = 3;

@Component({
  selector: 'app-team-game',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
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
  private lang = inject(LanguageService);

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
  joinUrl = '';
  qrUrl = '';
  private roleTimer?: any;
  private ejectionTimer?: any;
  private answerRevealTimer?: any;
  private beginPlayingSent = false;
  private ackEjectionSent = false;
  private ackAnswerRevealSent = false;
  private answerRevealFetched = false;
  private timerSub?: Subscription;
  private tickSentForDeadline = 0;

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
      this.router.navigate(['/join', this.code]);
      return;
    }

    this.joinUrl = `${window.location.origin}/join/${this.code}`;
    this.qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(this.joinUrl)}`;

    this.roomService.connect(this.code, playerId, {
      onRoomUpdate: (state) => this.applyState(state),
      onPersonalQuestion: (question) => {
        this.myQuestion = question;
        if (this.state?.status !== 'ANSWER_REVEAL') {
          this.selectedAnswer = null;
          this.answerLocked = false;
        }
        this.syncTimer();
        this.cdr.detectChanges();
      },
      onTrickApplied: (event) => {
        if (Number(playerId) === event.targetPlayerId) {
          this.myQuestion = event.updatedQuestion;
          this.syncTimer();
          this.cdr.detectChanges();
        }
      }
    });

    this.roomService.getRoom(this.code).subscribe({
      next: (state) => this.applyState(state),
      error: () => this.router.navigate([this.auth.isGuest() ? '/login' : '/home'])
    });
  }

  ngOnDestroy(): void {
    this.timerSub?.unsubscribe();
    clearTimeout(this.roleTimer);
    clearTimeout(this.ejectionTimer);
    clearTimeout(this.answerRevealTimer);
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
    if (this.isCrewWaitingRound) {
      this.myQuestion = null;
    }
    if (state.status === 'ANSWER_REVEAL' && !state.myQuestion && this.myQuestion) {
      this.myQuestion = {
        ...this.myQuestion,
        correctOptionIndex: state.correctOptionIndex,
        displayStyle: 'NORMAL'
      };
    }
    if (state.status === 'PLAYING' && prevStatus === 'ANSWER_REVEAL') {
      this.selectedAnswer = null;
      this.answerLocked = false;
      this.myQuestion = state.myQuestion || null;
    }
    this.syncAnswerLock();
    this.syncTimer();
    this.handleRoleReveal(prevStatus);
    this.handleAnswerReveal(prevStatus);
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

  private handleAnswerReveal(prevStatus: string): void {
    if (this.state?.status === 'ANSWER_REVEAL') {
      this.answerLocked = true;
      this.ackAnswerRevealSent = false;
      clearTimeout(this.answerRevealTimer);
      const wait = Math.max(0, (this.state.answerRevealEndsAtMs || Date.now() + 5000) - Date.now());
      this.answerRevealTimer = setTimeout(() => this.finishAnswerReveal(), wait || 5000);
      if (!this.isHost && !this.isTraitor && !this.myQuestion && !this.answerRevealFetched) {
        this.answerRevealFetched = true;
        this.roomService.getRoom(this.code).subscribe({
          next: (personal) => this.applyState(personal)
        });
      }
    } else if (prevStatus === 'ANSWER_REVEAL') {
      clearTimeout(this.answerRevealTimer);
      this.answerRevealFetched = false;
    }
  }

  private finishAnswerReveal(): void {
    if (!this.ackAnswerRevealSent && this.state?.status === 'ANSWER_REVEAL') {
      this.ackAnswerRevealSent = true;
      this.roomService.ackAnswerReveal(this.code).subscribe({
        next: (state) => this.applyState(state),
        error: () => { this.ackAnswerRevealSent = false; }
      });
    }
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

  get isGuest() {
    return this.auth.isGuest() || !!this.myRole?.guest;
  }

  get isTraitor() {
    return this.myRole?.role === 'TRAITOR';
  }

  get isDead() {
    return this.myRole && !this.myRole.alive;
  }

  get canApplyTrick() {
    return this.isTraitor && this.myRole?.alive && this.state?.status === 'PLAYING';
  }

  get canStartGame() {
    return (this.state?.players?.length ?? 0) >= MIN_PLAYERS;
  }

  get isAnswerReveal() {
    return this.state?.status === 'ANSWER_REVEAL';
  }

  get isCrewWaitingRound() {
    return !this.isHost && !this.isTraitor && !this.isDead
      && (this.state?.status === 'PLAYING' || this.state?.status === 'ANSWER_REVEAL')
      && !!this.myRole?.answeredThisRound;
  }

  get teamScorePercent(): number {
    if (this.state?.teamScorePercent != null) {
      return this.state.teamScorePercent;
    }
    const target = this.state?.targetScore || 1;
    return Math.min(100, Math.floor((this.state?.teamScore || 0) * 100 / target));
  }

  get scoreBarWidth(): string {
    return `${Math.min(100, this.teamScorePercent)}%`;
  }

  get contributionPerCorrect(): number {
    return this.state?.contributionPerCorrect ?? 0;
  }

  get correctOptionIndex(): number | null {
    return this.state?.correctOptionIndex
      ?? this.myQuestion?.correctOptionIndex
      ?? this.projectionQuestion?.correctOptionIndex
      ?? null;
  }

  private syncAnswerLock(): void {
    if (this.myRole?.answeredThisRound || this.isAnswerReveal) this.answerLocked = true;
    if (this.state?.status === 'VOTING' && this.state.currentRound !== this.lastVoteRound) {
      this.voteLocked = false;
      this.lastVoteRound = this.state.currentRound;
    }
    if (this.state?.status === 'PLAYING' && !this.myRole?.answeredThisRound && !this.isTraitor) {
      this.answerLocked = false;
    }
  }

  copyCode(): void {
    copyToClipboard(this.state?.code || this.code).then(() => {
      Swal.fire({ icon: 'success', title: this.lang.t('game.copied'), timer: 1000, showConfirmButton: false });
    }).catch(() => {
      Swal.fire(this.lang.t('common.error'), this.lang.t('game.copyFailed'), 'error');
    });
  }

  copyJoinLink(): void {
    copyToClipboard(this.joinUrl).then(() => {
      Swal.fire({ icon: 'success', title: this.lang.t('game.linkCopied'), timer: 1000, showConfirmButton: false });
    }).catch(() => {
      Swal.fire(this.lang.t('common.error'), this.lang.t('game.copyFailed'), 'error');
    });
  }

  startGame(): void {
    this.roomService.startRoom(this.code).subscribe({
      error: (err) => Swal.fire('Error', apiErrorMessage(err), 'error')
    });
  }

  cancelRoom(): void {
    Swal.fire({
      icon: 'warning',
      title: this.lang.t('game.cancelRoom'),
      text: this.lang.t('game.cancelRoomHint'),
      showCancelButton: true,
      confirmButtonText: this.lang.t('game.cancelConfirm'),
      cancelButtonText: this.lang.t('game.cancelKeep'),
      confirmButtonColor: '#ef4444'
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.roomService.destroyRoom(this.code).subscribe({
        next: () => this.router.navigate(['/home']),
        error: (err) => Swal.fire('Error', apiErrorMessage(err), 'error')
      });
    });
  }

  selectAnswer(optionIndex: number): void {
    if (this.answerLocked || this.selectedAnswer !== null || this.isAnswerReveal) return;
    this.selectedAnswer = optionIndex;
    this.answerLocked = true;
    this.myQuestion = null;
    this.roomService.answer(this.code, optionIndex).subscribe({
      next: (state) => this.applyState(state),
      error: (err) => {
        this.answerLocked = false;
        this.selectedAnswer = null;
        Swal.fire('Error', apiErrorMessage(err), 'error');
        this.cdr.detectChanges();
      }
    });
  }

  openTrickModal(): void {
    if (!this.canApplyTrick) return;
    this.showTrickModal = true;
    this.cdr.detectChanges();
  }

  closeTrickModal(): void {
    this.showTrickModal = false;
    this.cdr.detectChanges();
  }

  applyGlobalTrick(trickType: string): void {
    if (!this.canApplyTrick) return;
    this.roomService.applyTrick(this.code, trickType).subscribe({
      next: () => {
        this.showTrickModal = false;
        this.cdr.detectChanges();
      },
      error: (err) => Swal.fire('Error', apiErrorMessage(err), 'error')
    });
  }

  vote(targetPlayerId: number): void {
    if (this.voteLocked) return;
    this.voteLocked = true;
    this.roomService.vote(this.code, targetPlayerId, false).subscribe({
      error: (err) => {
        this.voteLocked = false;
        Swal.fire('Error', apiErrorMessage(err), 'error');
      }
    });
  }

  skipVote(): void {
    if (this.voteLocked) return;
    this.voteLocked = true;
    this.roomService.vote(this.code, null, true).subscribe({
      error: (err) => {
        this.voteLocked = false;
        Swal.fire('Error', apiErrorMessage(err), 'error');
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
      if (this.state?.status === 'PLAYING' && this.state.roundDeadlineMs) {
        const left = this.state.roundDeadlineMs - Date.now();
        if (left <= 0 && this.tickSentForDeadline !== this.state.roundDeadlineMs) {
          this.tickSentForDeadline = this.state.roundDeadlineMs;
          this.roomService.tickRound(this.code).subscribe({
            next: (state) => this.applyState(state)
          });
        }
      }
      this.cdr.markForCheck();
    };
    if (!this.myQuestion && !this.projectionQuestion && this.state?.status !== 'PLAYING') return;
    tick();
    this.timerSub = interval(250).subscribe(tick);
  }

  getProjectionClass(): string {
    if (this.isAnswerReveal) return '';
    const style = this.projectionQuestion?.displayStyle ?? 'NORMAL';
    if (style === 'UPSIDE_DOWN') return 'upside-down';
    if (style === 'REVERSED') return 'reversed';
    return '';
  }

  getDisplayClass(): string {
    if (this.isAnswerReveal) return '';
    const style = this.myQuestion?.displayStyle ?? 'NORMAL';
    if (style === 'UPSIDE_DOWN') return 'upside-down';
    if (style === 'REVERSED') return 'reversed';
    return '';
  }

  optionClass(optIndex: number, selected: number | null): Record<string, boolean> {
    const correct = this.correctOptionIndex;
    return {
      selected: selected === optIndex && !this.isAnswerReveal,
      correct: this.isAnswerReveal && correct === optIndex,
      dimmed: this.isAnswerReveal && correct !== null && correct !== optIndex
    };
  }

  submitRating(score: number): void {
    if (this.rated || !this.state?.triviaId || this.isGuest) return;
    this.ratingScore = score;
    this.http.post(`${environment.apiBaseUrl}/ratings/trivia/${this.state.triviaId}`, { score }).subscribe({
      next: () => {
        this.rated = true;
        Swal.fire({ icon: 'success', title: this.lang.t('game.thanks'), timer: 1200, showConfirmButton: false });
        this.cdr.detectChanges();
      },
      error: (err) => Swal.fire('Error', apiErrorMessage(err, 'No se pudo calificar'), 'error')
    });
  }

  leaveRoom(): void {
    const exit = () => {
      this.roomService.disconnect();
      if (this.isGuest) {
        this.auth.clearSession();
        this.router.navigate(['/login']);
        return;
      }
      this.router.navigate(['/home']);
    };

    const inGame = this.state
      && this.state.status !== 'LOBBY'
      && this.state.status !== 'FINISHED'
      && !this.isHost;

    if (!inGame) {
      exit();
      return;
    }

    this.roomService.leaveRoom(this.code).subscribe({
      next: () => exit(),
      error: () => exit()
    });
  }
}
