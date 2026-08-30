import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-trivia-ratings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trivia-ratings.html',
  styleUrl: './trivia-ratings.css'
})
export class TriviaRatingsComponent implements OnInit {
  @Input() triviaId!: number;

  private http = inject(HttpClient);
  private authService = inject(AuthService);

  ratings: any[] = [];
  averageRating: number = 0;
  totalRatings: number = 0;
  triviaTitle: string = '';

  // Formulario para nuevo rating
  newRating = {
    triviaId: 0,
    score: 0,
    comment: ''
  };

  hoveredStar: number = 0;

  ngOnInit(): void {
    this.loadRatings();
  }

  loadRatings(): void {
    this.http.get(`${environment.apiBaseUrl}/ratings/trivia/${this.triviaId}`)
      .subscribe({
        next: (response: any) => {
          this.ratings = response.ratings;
          this.averageRating = response.averageRating || 0;
          this.totalRatings = response.totalRatings || 0;
          this.triviaTitle = response.triviaTitle;
        },
        error: (err) => {
          console.error('Error al cargar ratings:', err);
        }
      });
  }

  selectStar(star: number): void {
    this.newRating.score = star;
  }

  hoverStar(star: number): void {
    this.hoveredStar = star;
  }

  resetHover(): void {
    this.hoveredStar = 0;
  }

  submitRating(): void {
    if (this.newRating.score === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Calificación requerida',
        text: 'Por favor selecciona al menos 1 estrella',
        confirmButtonColor: '#111827'
      });
      return;
    }
    this.newRating.triviaId = this.triviaId;
    this.http.post(`${environment.apiBaseUrl}/ratings/trivia`, this.newRating)
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: '¡Gracias por tu opinión!',
            text: 'Tu calificación ha sido guardada',
            timer: 2000,
            showConfirmButton: false
          });

          // Resetear formulario y recargar ratings
          this.newRating = { triviaId: 0, score: 0, comment: '' };
          this.loadRatings();
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err.error?.message || 'No se pudo guardar tu calificación',
            confirmButtonColor: '#111827'
          });
        }
      });
  }

  deleteRating(ratingId: number): void {
    Swal.fire({
      icon: 'question',
      title: '¿Eliminar calificación?',
      text: 'Esta acción no se puede deshacer',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280'
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.delete(`${environment.apiBaseUrl}/ratings/${ratingId}`)
          .subscribe({
            next: () => {
              Swal.fire({
                icon: 'success',
                title: 'Eliminado',
                text: 'Tu calificación ha sido eliminada',
                timer: 1500,
                showConfirmButton: false
              });
              this.loadRatings();
            },
            error: (err) => {
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.error?.message || 'No se pudo eliminar',
                confirmButtonColor: '#111827'
              });
            }
          });
      }
    });
  }

  getStarsArray(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => i + 1);
  }

  isStarFilled(star: number, rating: number): boolean {
    return star <= rating;
  }

  getStarClass(star: number): string {
    const displayRating = this.hoveredStar || this.newRating.score;
    return star <= displayRating ? 'bi-star-fill text-warning' : 'bi-star text-muted';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getCurrentPlayerId(): number {
    return Number(this.authService.getPlayerId() || '0');
  }
}

