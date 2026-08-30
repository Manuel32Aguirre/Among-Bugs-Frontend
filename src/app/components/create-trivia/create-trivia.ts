import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TriviaService } from '../../services/trivia';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-create-trivia',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './create-trivia.html',
  styleUrl: './create-trivia.css'
})
export class CreateTriviaComponent {
  private triviaService = inject(TriviaService);
  private router = inject(Router);

  creationMode: 'manual' | 'ai' = 'manual';
  aiPrompt = '';
  aiQuestionCount = 5;
  aiIsPublic = true;
  generating = false;

  trivia = {
    title: '',
    description: '',
    isPublic: true,
    questions: [
      {
        questionText: '',
        timeLimit: 30,
        trickType: null,
        options: [
          { text: '', isCorrect: true },
          { text: '', isCorrect: false }
        ]
      }
    ]
  };

  // Opciones de tiempo límite (en segundos)
  timeLimitOptions = [10, 15, 20, 30, 45, 60, 90, 120];

  // Opciones de trampas disponibles
  trickOptions = [
    { value: null, label: 'Sin trampa' },
    { value: 'REDUCE_TIME', label: 'Reducir tiempo a la mitad' },
    { value: 'UPSIDE_DOWN', label: 'Texto al revés (de cabeza)' },
    { value: 'REVERSE_TEXT', label: 'Texto invertido (espejo)' },
    { value: 'SHUFFLE_WORDS', label: 'Mezclar palabras' }
  ];

  addQuestion() {
    this.trivia.questions.push({
      questionText: '',
      timeLimit: 30,
      trickType: null,
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false }
      ]
    });
  }

  removeQuestion(index: number) {
    if (this.trivia.questions.length <= 1) {
      Swal.fire({
        icon: 'warning',
        title: 'No se puede eliminar',
        text: 'Debe haber al menos una pregunta',
        confirmButtonColor: '#111827'
      });
      return;
    }

    Swal.fire({
      icon: 'question',
      title: '¿Eliminar pregunta?',
      text: 'Esta acción no se puede deshacer',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280'
    }).then((result) => {
      if (result.isConfirmed) {
        this.trivia.questions.splice(index, 1);
      }
    });
  }

  addOption(qIndex: number) {
    const optionsCount = this.trivia.questions[qIndex].options.length;

    if (optionsCount < 4) {
      this.trivia.questions[qIndex].options.push({ text: '', isCorrect: false });
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Límite alcanzado',
        text: 'Una pregunta no puede tener más de 4 opciones.',
        confirmButtonColor: '#111827'
      });
    }
  }

  removeOption(qIndex: number, optIndex: number) {
    if (this.trivia.questions[qIndex].options.length <= 2) {
      Swal.fire({
        icon: 'warning',
        title: 'No se puede eliminar',
        text: 'Debe haber al menos 2 opciones',
        confirmButtonColor: '#111827'
      });
      return;
    }
    this.trivia.questions[qIndex].options.splice(optIndex, 1);
  }

  // Método para marcar una opción como correcta
  markAsCorrect(qIndex: number, optIndex: number) {
    this.trivia.questions[qIndex].options.forEach((opt: any, idx: number) => {
      opt.isCorrect = (idx === optIndex);
    });
  }

  onGenerateWithAi(): void {
    const prompt = this.aiPrompt.trim();
    if (prompt.length < 5) {
      Swal.fire({
        icon: 'warning',
        title: 'Atención',
        text: 'Describe el tema de la trivia (mínimo 5 caracteres).',
        confirmButtonColor: '#111827'
      });
      return;
    }

    if (this.aiQuestionCount < 1 || this.aiQuestionCount > 20) {
      Swal.fire({
        icon: 'warning',
        title: 'Atención',
        text: 'El número de preguntas debe estar entre 1 y 20.',
        confirmButtonColor: '#111827'
      });
      return;
    }

    this.generating = true;
    this.triviaService.generateTriviaFromPrompt({
      prompt,
      questionCount: this.aiQuestionCount,
      isPublic: this.aiIsPublic
    }).subscribe({
      next: () => {
        this.generating = false;
        Swal.fire({
          icon: 'success',
          title: '¡Trivia generada!',
          text: 'La IA creó tu trivia correctamente.',
          timer: 1800,
          showConfirmButton: false
        });
        setTimeout(() => this.router.navigate(['/home']), 1800);
      },
      error: (err: any) => {
        this.generating = false;
        Swal.fire({
          icon: 'error',
          title: 'Error al generar',
          text: err.error?.message || 'No se pudo generar la trivia con IA.',
          confirmButtonColor: '#111827'
        });
      }
    });
  }

  onCreate() {
    // Validaciones
    if (!this.trivia.title.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Atención',
        text: 'La trivia necesita un título.',
        confirmButtonColor: '#111827'
      });
      return;
    }

    if (!this.trivia.description.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Atención',
        text: 'La trivia necesita una descripción.',
        confirmButtonColor: '#111827'
      });
      return;
    }

    if (this.trivia.questions.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Atención',
        text: 'Debes agregar al menos una pregunta.',
        confirmButtonColor: '#111827'
      });
      return;
    }

    // Validar cada pregunta
    for (let i = 0; i < this.trivia.questions.length; i++) {
      const q = this.trivia.questions[i];

      if (!q.questionText.trim()) {
        Swal.fire({
          icon: 'warning',
          title: 'Atención',
          text: `La pregunta #${i + 1} no tiene texto.`,
          confirmButtonColor: '#111827'
        });
        return;
      }

      if (q.options.length < 2) {
        Swal.fire({
          icon: 'warning',
          title: 'Atención',
          text: `La pregunta #${i + 1} debe tener al menos 2 opciones.`,
          confirmButtonColor: '#111827'
        });
        return;
      }

      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].text.trim()) {
          Swal.fire({
            icon: 'warning',
            title: 'Atención',
            text: `La pregunta #${i + 1}, opción #${j + 1} está vacía.`,
            confirmButtonColor: '#111827'
          });
          return;
        }
      }

      const hasCorrect = q.options.some((opt: any) => opt.isCorrect);
      if (!hasCorrect) {
        Swal.fire({
          icon: 'warning',
          title: 'Atención',
          text: `La pregunta #${i + 1} debe tener al menos una respuesta correcta.`,
          confirmButtonColor: '#111827'
        });
        return;
      }
    }

    // Enviar al backend
    this.triviaService.createTrivia(this.trivia).subscribe({
      next: (res) => {
        Swal.fire({
          icon: 'success',
          title: '¡Trivia creada!',
          text: 'Tu trivia ha sido creada exitosamente',
          timer: 1500,
          showConfirmButton: false
        });
        setTimeout(() => {
          this.router.navigate(['/home']);
        }, 1500);
      },
      error: (err: any) => {
        Swal.fire({
          icon: 'error',
          title: 'Error al crear',
          text: err.error?.message || 'Error desconocido',
          confirmButtonColor: '#111827'
        });
      }
    });
  }
}
