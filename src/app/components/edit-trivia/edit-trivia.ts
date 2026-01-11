import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TriviaService } from '../../services/trivia';
import { Router, ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-edit-trivia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-trivia.html',
  styleUrl: './edit-trivia.css'
})
export class EditTriviaComponent implements OnInit {
  private triviaService = inject(TriviaService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  triviaId!: number;
  isLoading = true;

  // Objeto para editar la trivia
  trivia: any = {
    id: null,
    title: '',
    description: '',
    isPublic: true,
    questions: []
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

  ngOnInit(): void {
    this.triviaId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadTrivia();
  }

  loadTrivia(): void {
    this.triviaService.getTriviaById(this.triviaId).subscribe({
      next: (data: any) => {
        this.trivia = {
          id: data.id,
          title: data.title,
          description: data.description,
          isPublic: data.isPublic,
          questions: data.questions.map((q: any) => ({
            id: q.id,
            questionText: q.questionText,
            timeLimit: q.timeLimit || 30,
            trickType: q.trickType || null,
            options: q.options || []
          }))
        };
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error al cargar trivia:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo cargar la trivia. Verifica que seas el creador.',
          confirmButtonColor: '#111827'
        }).then(() => {
          this.router.navigate(['/home']);
        });
      }
    });
  }

  addQuestion() {
    this.trivia.questions.push({
      id: null,
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
        title: '¡Límite alcanzado!',
        text: 'Una tarea no puede tener más de 4 cables (opciones).',
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

  onUpdate() {
    // Validaciones (igual que en create)
    if (!this.trivia.title.trim()) {
      Swal.fire({
        icon: 'warning',
        title: '¡Atención!',
        text: 'La trivia necesita un título.',
        confirmButtonColor: '#111827'
      });
      return;
    }

    if (!this.trivia.description.trim()) {
      Swal.fire({
        icon: 'warning',
        title: '¡Atención!',
        text: 'La trivia necesita una descripción.',
        confirmButtonColor: '#111827'
      });
      return;
    }

    if (this.trivia.questions.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: '¡Atención!',
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
          title: '¡Atención!',
          text: `La pregunta #${i + 1} no tiene texto.`,
          confirmButtonColor: '#111827'
        });
        return;
      }

      if (q.options.length < 2) {
        Swal.fire({
          icon: 'warning',
          title: '¡Atención!',
          text: `La pregunta #${i + 1} debe tener al menos 2 opciones.`,
          confirmButtonColor: '#111827'
        });
        return;
      }

      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].text.trim()) {
          Swal.fire({
            icon: 'warning',
            title: '¡Atención!',
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
          title: '¡Atención!',
          text: `La pregunta #${i + 1} debe tener al menos una respuesta correcta.`,
          confirmButtonColor: '#111827'
        });
        return;
      }
    }

    // Enviar actualización
    this.triviaService.updateTrivia(this.trivia).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: '¡Trivia actualizada!',
          text: 'Los cambios se guardaron exitosamente',
          timer: 1500,
          showConfirmButton: false
        });
        setTimeout(() => {
          this.router.navigate(['/home']);
        }, 1500);
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error al actualizar',
          text: err.error?.message || 'Error desconocido',
          confirmButtonColor: '#111827'
        });
      }
    });
  }
}
