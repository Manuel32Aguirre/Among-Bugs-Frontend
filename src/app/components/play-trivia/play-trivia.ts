import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import Swal from 'sweetalert2';

interface QuestionOption {
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: number;
  questionText: string;
  options: QuestionOption[];
  timeLimit: number;
  trickType: string | null;
}

interface TriviaData {
  id: number;
  title: string;
  description: string;
  creatorUsername?: string;
  questions: Question[];
}

@Component({
  selector: 'app-play-trivia',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './play-trivia.html',
  styleUrls: ['./play-trivia.css']
})
export class PlayTriviaComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private baseUrl = 'https://among-bugs-backend-a4ececdtf8dqceha.westus3-01.azurewebsites.net/api';

  trivia: TriviaData | null = null;
  currentQuestionIndex = 0;
  selectedAnswer: number | null = null;
  correctAnswers = 0;
  totalTime = 0;
  questionTime = 0;
  gameStarted = false;
  gameFinished = false;
  loading = true;

  private timerSubscription?: Subscription;
  private questionTimerSubscription?: Subscription;

  ngOnInit(): void {
    const triviaId = this.route.snapshot.paramMap.get('id');
    if (triviaId) {
      this.loadTrivia(parseInt(triviaId));
    } else {
      this.router.navigate(['/home']);
    }
  }

  ngOnDestroy(): void {
    this.stopTimers();
  }

  private getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return new HttpHeaders({
      'Accept-Language': 'es-MX',
      'Authorization': `Bearer ${token}`
    });
  }

  loadTrivia(triviaId: number): void {
    this.http.get<TriviaData>(`${this.baseUrl}/trivia/${triviaId}`, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (data) => {
        this.trivia = data;
        this.loading = false;
        this.cdr.detectChanges();
        this.showStartDialog();
      },
      error: (err) => {
        console.error('Error loading trivia:', err);
        this.loading = false;
        this.cdr.detectChanges();
        Swal.fire({
          title: 'Error',
          text: 'No se pudo cargar la trivia',
          icon: 'error',
          confirmButtonText: 'Volver al inicio'
        }).then(() => {
          this.router.navigate(['/home']);
        });
      }
    });
  }

  showStartDialog(): void {
    if (!this.trivia) return;

    Swal.fire({
      title: `${this.trivia.title}`,
      html: `
        <p>${this.trivia.description}</p>
        <p><strong>Total de preguntas:</strong> ${this.trivia.questions.length}</p>
        <p>¡Prepárate para demostrar tus conocimientos!</p>
      `,
      icon: 'info',
      confirmButtonText: '¡Comenzar!',
      confirmButtonColor: '#3b82f6',
      allowOutsideClick: false
    }).then(() => {
      this.startGame();
    });
  }

  startGame(): void {
    this.gameStarted = true;
    this.startGlobalTimer();
    this.cdr.detectChanges();
    // Primero iniciar el timer de la pregunta, luego verificar trampas
    this.startQuestionTimer();
    this.checkForTrick();
  }

  startGlobalTimer(): void {
    // Asegurar que el timer global siempre esté corriendo
    this.timerSubscription = interval(1000).subscribe(() => {
      this.totalTime++;
      this.cdr.markForCheck();
    });
  }

  startQuestionTimer(): void {
    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion) return;

    // Detener el timer anterior si existe
    if (this.questionTimerSubscription) {
      this.questionTimerSubscription.unsubscribe();
    }

    this.questionTime = currentQuestion.timeLimit;
    this.cdr.markForCheck();

    this.questionTimerSubscription = interval(1000).subscribe(() => {
      this.questionTime--;
      this.cdr.markForCheck();

      if (this.questionTime <= 0) {
        this.timeExpired();
      }
    });
  }

  stopTimers(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
    if (this.questionTimerSubscription) {
      this.questionTimerSubscription.unsubscribe();
    }
  }

  checkForTrick(): void {
    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion || !currentQuestion.trickType) {
      // No hay trampa, el timer ya está corriendo
      return;
    }

    const trickMessages: { [key: string]: string } = {
      'REDUCE_TIME': 'El tiempo se ha reducido a la mitad',
      'UPSIDE_DOWN': 'El texto está al revés',
      'REVERSE_TEXT': 'El texto está invertido',
      'SHUFFLE_WORDS': 'Las palabras están mezcladas'
    };

    const message = trickMessages[currentQuestion.trickType] || 'Cuidado con esta pregunta';

    if (currentQuestion.trickType === 'REDUCE_TIME') {
      const newTimeLimit = Math.floor(currentQuestion.timeLimit / 2);
      this.questionTime = newTimeLimit;
      currentQuestion.timeLimit = newTimeLimit;
      this.cdr.markForCheck();
    }

    // Mostrar mensaje de trampa activada sin pausar el timer y sin botones
    Swal.fire({
      title: '¡Trampa Activada!',
      text: message,
      icon: 'warning',
      showConfirmButton: false,
      timer: 1500,
      timerProgressBar: true,
      allowOutsideClick: false
    });
  }

  getCurrentQuestion(): Question | null {
    if (!this.trivia || this.currentQuestionIndex >= this.trivia.questions.length) {
      return null;
    }
    return this.trivia.questions[this.currentQuestionIndex];
  }

  selectAnswer(index: number): void {
    this.selectedAnswer = index;
    this.cdr.detectChanges();
  }

  submitAnswer(): void {
    if (this.selectedAnswer === null) {
      Swal.fire({
        title: 'Atención',
        text: 'Debes seleccionar una respuesta',
        icon: 'warning',
        confirmButtonText: 'OK',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion) return;

    const isCorrect = currentQuestion.options[this.selectedAnswer].isCorrect;

    if (isCorrect) {
      this.correctAnswers++;
    }

    if (this.questionTimerSubscription) {
      this.questionTimerSubscription.unsubscribe();
    }

    this.showAnswerFeedback(isCorrect);
  }

  showAnswerFeedback(isCorrect: boolean): void {
    Swal.fire({
      title: isCorrect ? '✅ ¡Correcto!' : '❌ Incorrecto',
      text: isCorrect ? 'Sigue así, vas muy bien' : 'No te desanimes, continúa intentando',
      icon: isCorrect ? 'success' : 'error',
      confirmButtonText: 'Siguiente',
      confirmButtonColor: isCorrect ? '#10b981' : '#ef4444',
      timer: 2000,
      timerProgressBar: true
    }).then(() => {
      this.nextQuestion();
    });
  }

  timeExpired(): void {
    if (this.questionTimerSubscription) {
      this.questionTimerSubscription.unsubscribe();
    }

    Swal.fire({
      title: '⏰ Tiempo agotado',
      text: 'Se acabó el tiempo para esta pregunta',
      icon: 'warning',
      showConfirmButton: false,
      timer: 1500,
      timerProgressBar: true,
      allowOutsideClick: false
    }).then(() => {
      this.nextQuestion();
    });
  }

  nextQuestion(): void {
    this.selectedAnswer = null;
    this.currentQuestionIndex++;
    this.cdr.detectChanges();

    if (this.currentQuestionIndex >= (this.trivia?.questions.length || 0)) {
      this.finishGame();
    } else {
      // Iniciar el timer de la nueva pregunta y luego verificar si hay trampas
      this.startQuestionTimer();
      this.checkForTrick();
    }
  }

  finishGame(): void {
    this.stopTimers();
    this.gameFinished = true;

    // Guardar automáticamente el intento en segundo plano sin mostrar diálogo
    this.saveAttemptSilently();

    // Forzar detección de cambios para mostrar la pantalla de resultados
    this.cdr.detectChanges();
  }

  saveAttemptSilently(): void {
    if (!this.trivia) return;

    const attemptData = {
      triviaId: this.trivia.id,
      correctAnswers: this.correctAnswers,
      totalQuestions: this.trivia.questions.length,
      completionTimeSeconds: this.totalTime
    };

    this.http.post(`${this.baseUrl}/trivia/attempt`, attemptData, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: () => {
        console.log('Resultado guardado exitosamente');
      },
      error: (err) => {
        console.error('Error saving attempt:', err);
      }
    });
  }

  saveAttempt(): void {
    // Este método ya no se usa, pero lo mantenemos por compatibilidad
    this.saveAttemptSilently();
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  getQuestionTextDisplay(question: Question): string {
    if (!question.trickType) return question.questionText;

    switch (question.trickType) {
      case 'UPSIDE_DOWN':
        return this.upsideDownText(question.questionText);
      case 'REVERSE_TEXT':
        return question.questionText.split('').reverse().join('');
      case 'SHUFFLE_WORDS':
        return this.shuffleWords(question.questionText);
      default:
        return question.questionText;
    }
  }

  private upsideDownText(text: string): string {
    const flipped: { [key: string]: string } = {
      'a': 'ɐ', 'b': 'q', 'c': 'ɔ', 'd': 'p', 'e': 'ǝ', 'f': 'ɟ', 'g': 'ƃ', 'h': 'ɥ',
      'i': 'ᴉ', 'j': 'ɾ', 'k': 'ʞ', 'l': 'ן', 'm': 'ɯ', 'n': 'u', 'o': 'o', 'p': 'd',
      'q': 'b', 'r': 'ɹ', 's': 's', 't': 'ʇ', 'u': 'n', 'v': 'ʌ', 'w': 'ʍ', 'x': 'x',
      'y': 'ʎ', 'z': 'z', '?': '¿', '!': '¡', '.': '˙', ',': '\'', '\'': ',',
      'A': '∀', 'B': 'q', 'C': 'Ɔ', 'D': 'p', 'E': 'Ǝ', 'F': 'Ⅎ', 'G': 'פ', 'H': 'H',
      'I': 'I', 'J': 'ſ', 'K': 'ʞ', 'L': '˥', 'M': 'W', 'N': 'N', 'O': 'O', 'P': 'Ԁ',
      'Q': 'Ό', 'R': 'ɹ', 'S': 'S', 'T': '┴', 'U': '∩', 'V': 'Λ', 'W': 'M', 'X': 'X',
      'Y': '⅄', 'Z': 'Z'
    };

    return text.split('').map(char => flipped[char] || char).reverse().join('');
  }

  private shuffleWords(text: string): string {
    const words = text.split(' ');
    for (let i = words.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [words[i], words[j]] = [words[j], words[i]];
    }
    return words.join(' ');
  }

  exitGame(): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Si sales ahora, perderás tu progreso',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, salir',
      cancelButtonText: 'Continuar jugando',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280'
    }).then((result) => {
      if (result.isConfirmed) {
        this.stopTimers();
        this.router.navigate(['/home']);
      }
    });
  }

  navigateToRankings(): void {
    this.router.navigate(['/rankings']);
  }

  navigateToHome(): void {
    this.router.navigate(['/home']);
  }
}
