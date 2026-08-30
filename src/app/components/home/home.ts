import { Component, OnDestroy, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { RoomService } from '../../services/room.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  private roomService = inject(RoomService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  rooms: any[] = [];
  loading = true;
  joiningCode: string | null = null;
  private poll?: Subscription;

  ngOnInit(): void {
    this.refresh();
    this.poll = interval(4000).subscribe(() => this.refresh(false));
  }

  ngOnDestroy(): void {
    this.poll?.unsubscribe();
  }

  refresh(showLoader = true): void {
    if (showLoader) this.loading = true;
    this.roomService.listOpenRooms().subscribe({
      next: (rooms) => {
        this.rooms = rooms || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  join(code: string): void {
    this.joiningCode = code;
    this.roomService.joinRoom(code).subscribe({
      next: (state) => this.router.navigate(['/room', state.code]),
      error: (err) => {
        this.joiningCode = null;
        Swal.fire('No se pudo unir', err.error?.message || 'Sala no disponible', 'error');
      }
    });
  }
}
