import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';
import { TriviaService } from '../../services/trivia';
import { Router, RouterLink } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { TriviaRatingsComponent } from '../trivia-ratings/trivia-ratings';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, TriviaRatingsComponent],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private triviaService = inject(TriviaService);
  private router = inject(Router);

  user = signal<any>(null);
  publicTrivias = signal<any[]>([]);
  myTrivias = signal<any[]>([]);

  private pollSubscription?: Subscription;

  selectedTriviaId: number | null = null;
  showRatingsModal: boolean = false;

  ngOnInit() {
    const token = this.authService.getToken();
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    this.cargarDatosIniciales();

    // Polling cada 5 segundos para actualizar trivias públicas
    this.pollSubscription = interval(5000).subscribe(() => {
      this.cargarPublicTrivias();
    });
  }

  ngOnDestroy(): void {
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
    }
  }

  cargarDatosIniciales() {
    this.authService.getProfile().subscribe({
      next: (data) => this.user.set(data),
      error: () => this.logout()
    });

    this.cargarPublicTrivias();

    this.triviaService.getMyTrivias().subscribe({
      next: (data: any) => this.myTrivias.set(Array.from(data)),
      error: (err: any) => console.error("Error al cargar trivias:", err)
    });
  }

  cargarPublicTrivias() {
    this.triviaService.getPublicTrivias().subscribe({
      next: (data: any) => this.publicTrivias.set(Array.from(data)),
      error: (err: any) => console.error("Error al cargar trivias públicas:", err)
    });
  }

  playTrivia(triviaId: number) {
    // Navegar al componente de juego
    this.router.navigate(['/play-trivia', triviaId]);
  }

  viewRankings(triviaId: number) {
    // Navegar a la página de rankings globales
    this.router.navigate(['/rankings']);
  }

  viewRatings(triviaId: number, event: Event): void {
    event.stopPropagation();
    this.selectedTriviaId = triviaId;
    this.showRatingsModal = true;
  }

  closeRatingsModal(): void {
    this.showRatingsModal = false;
    this.selectedTriviaId = null;
  }

  editTrivia(triviaId: number): void {
    this.router.navigate(['/edit-trivia', triviaId]);
  }

  goToMyTrivias() {
    this.router.navigate(['/my-trivias']);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
