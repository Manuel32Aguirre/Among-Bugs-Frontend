import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { GameService, PlayQuestion } from '../../services/game.service';

@Component({
  selector: 'app-play-trivia',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './play-trivia.html',
  styleUrls: ['./play-trivia.css']
})
export class PlayTriviaComponent implements OnInit, OnDestroy {
  private gameService = inject(GameService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  sessionToken = '';
  triviaTitle = '';
  currentQuestion: PlayQuestion | null = null;
  selectedAnswer: number | null = null;
  correctAnswers = 0;
  totalQuestions = 0;
  questionTime = 0;
  totalTime = 0;
  gameStarted = false;
  gameFinished = false;
  loading = true;
  finishedStats: any = null;

  private timerSub?: Subscription;
  private globalTimerSub?: Subscription;

  ngOnInit(): void {
    const triviaId = this.route.snapshot.paramMap.get('id');
    if (!triviaId) {
      this.router.navigate(['/home']);
      return;
    }
    this.startServerSession(parseInt(triviaId, 10));
  }

  ngOnDestroy(): void {
    this.timerSub?.unsubscribe();
    this.globalTimerSub?.unsubscribe();
  }

  startServerSession(triviaId: number): void {
    this.gameService.startSession(triviaId).subscribe({
      next: (res) => {
        this.sessionToken = res.sessionToken;
        this.triviaTitle = res.triviaTitle;
        this.totalQuestions = res.totalQuestions;
        this.loading = false;
        this.cdr.detectChanges();
        this.showStartDialog(res.firstQuestion);
      },
      error: () => {
        this.loading = false;
        Swal.fire('Error', 'No se pudo iniciar la partida', 'error').then(() => this.router.navigate(['/home']));
      }
    });
  }

  showStartDialog(firstQuestion: PlayQuestion): void {
    Swal.fire({
      title: this.triviaTitle,
      html: `<p>Modo individual con validación en servidor</p><p><strong>Preguntas:</strong> ${this.totalQuestions}</p>`,
      icon: 'info',
      confirmButtonText: '¡Comenzar!',
      confirmButtonColor: '#3b82f6'
    }).then(() => {
      this.gameStarted = true;
      this.globalTimerSub = interval(1000).subscribe(() => {
        this.totalTime++;
        this.cdr.markForCheck();
      });
      this.loadQuestion(firstQuestion);
    });
  }

  loadQuestion(question: PlayQuestion): void {
    this.currentQuestion = question;
    this.selectedAnswer = null;
    this.syncTimer();
    if (question.trickMessage) {
      Swal.fire({
        title: '¡Trampa Activada!',
        text: question.trickMessage,
        icon: 'warning',
        timer: 1500,
        showConfirmButton: false
      });
    }
    this.cdr.detectChanges();
  }

  syncTimer(): void {
    this.timerSub?.unsubscribe();
    if (!this.currentQuestion) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((this.currentQuestion!.questionDeadlineMs - Date.now()) / 1000));
      this.questionTime = remaining;
      this.cdr.markForCheck();
      if (remaining <= 0) {
        this.timerSub?.unsubscribe();
        this.submitAnswer(-1);
      }
    };

    tick();
    this.timerSub = interval(250).subscribe(tick);
  }

  selectAnswer(index: number): void {
    this.selectedAnswer = index;
    this.cdr.detectChanges();
  }

  submitAnswer(forcedIndex?: number): void {
    if (!this.currentQuestion || this.gameFinished) return;
    const optionIndex = forcedIndex ?? this.selectedAnswer;
    if (optionIndex === null || optionIndex === undefined || optionIndex < 0) {
      if (forcedIndex === undefined) {
        Swal.fire('Atención', 'Selecciona una respuesta', 'warning');
        return;
      }
    }

    this.timerSub?.unsubscribe();
    this.gameService.submitAnswer(this.sessionToken, optionIndex ?? -1).subscribe({
      next: (res) => {
        this.correctAnswers = res.correctAnswers;
        if (res.finished) {
          this.finishGame(res);
          return;
        }
        Swal.fire({
          title: res.correct ? '✅ Correcto' : res.timedOut ? '⏰ Tiempo agotado' : '❌ Incorrecto',
          icon: res.correct ? 'success' : 'error',
          timer: 1200,
          showConfirmButton: false
        }).then(() => this.loadQuestion(res.nextQuestion));
      },
      error: () => Swal.fire('Error', 'No se pudo validar la respuesta', 'error')
    });
  }

  finishGame(res: any): void {
    this.gameFinished = true;
    this.timerSub?.unsubscribe();
    this.globalTimerSub?.unsubscribe();
    this.finishedStats = res;
    this.cdr.detectChanges();
  }

  getQuestionTextDisplay(): string {
    return this.currentQuestion?.displayText ?? '';
  }

  getDisplayClass(): string {
    const style = this.currentQuestion?.displayStyle ?? 'NORMAL';
    if (style === 'UPSIDE_DOWN') return 'upside-down';
    if (style === 'REVERSED') return 'reversed';
    return '';
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  exitGame(): void {
    this.router.navigate(['/home']);
  }

  navigateToRankings(): void {
    this.router.navigate(['/rankings']);
  }

  navigateToHome(): void {
    this.router.navigate(['/home']);
  }
}
