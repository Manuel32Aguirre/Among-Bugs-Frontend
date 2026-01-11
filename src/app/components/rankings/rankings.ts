import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface RankingResponse {
  attemptId: number;
  playerUsername: string;
  triviaTitle: string;
  correctAnswers: number;
  totalQuestions: number;
  percentage: number;
  completionTimeSeconds: number;
  attemptDate: string;
}

@Component({
  selector: 'app-rankings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rankings.html',
  styleUrls: ['./rankings.css']
})
export class RankingsComponent implements OnInit {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  rankings: RankingResponse[] = [];
  loading = false;
  error = '';
  private baseUrl = 'http://localhost:8080/api';

  ngOnInit(): void {
    this.loadRankings();
  }

  private getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return new HttpHeaders({
      'Accept-Language': 'es-MX',
      'Authorization': `Bearer ${token}`
    });
  }

  loadRankings(): void {
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    this.http.get<RankingResponse[]>(`${this.baseUrl}/rankings`, {
      headers: this.getAuthHeaders()
    }).subscribe({
      next: (data) => {
        this.rankings = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading rankings:', err);
        this.error = 'Error al cargar los rankings';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
