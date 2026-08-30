import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';
import { RoomService } from '../../services/room.service';

@Component({
  selector: 'app-room-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './room-create.html',
  styleUrl: './room-create.css'
})
export class RoomCreateComponent {
  private roomService = inject(RoomService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  mode: 'manual' | 'ai' = 'ai';
  targetScore = 10;
  submitting = false;

  aiPrompt = '';
  aiCount = 8;

  trivia = {
    title: '',
    description: '',
    isPublic: false,
    questions: [
      {
        questionText: '',
        timeLimit: 30,
        trickType: null as string | null,
        options: [
          { text: '', isCorrect: true },
          { text: '', isCorrect: false }
        ]
      }
    ]
  };

  setMode(mode: 'manual' | 'ai') {
    this.mode = mode;
  }

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

  removeQuestion(i: number) {
    if (this.trivia.questions.length > 1) {
      this.trivia.questions.splice(i, 1);
    }
  }

  addOption(qi: number) {
    const opts = this.trivia.questions[qi].options;
    if (opts.length < 4) {
      opts.push({ text: '', isCorrect: false });
    }
  }

  markCorrect(qi: number, oi: number) {
    this.trivia.questions[qi].options.forEach((o, idx) => (o.isCorrect = idx === oi));
  }

  create() {
    if (this.submitting) return;

    const payload: any = { targetScore: this.targetScore };

    if (this.mode === 'ai') {
      if (!this.aiPrompt.trim()) {
        Swal.fire('Atención', 'Escribe un prompt para la IA', 'warning');
        return;
      }
      payload.generate = {
        prompt: this.aiPrompt.trim(),
        questionCount: this.aiCount,
        isPublic: false
      };
    } else {
      if (!this.trivia.title.trim() || !this.trivia.description.trim()) {
        Swal.fire('Atención', 'Completa título y descripción', 'warning');
        return;
      }
      for (const q of this.trivia.questions) {
        if (!q.questionText.trim() || q.options.some(o => !o.text.trim())) {
          Swal.fire('Atención', 'Completa todas las preguntas y opciones', 'warning');
          return;
        }
      }
      payload.trivia = this.trivia;
    }

    this.submitting = true;
    this.roomService.createRoom(payload).subscribe({
      next: (res) => this.router.navigate(['/room', res.code]),
      error: (err) => {
        this.submitting = false;
        this.cdr.detectChanges();
        Swal.fire('Error', err.error?.message || 'No se pudo crear la sala', 'error');
      }
    });
  }
}
