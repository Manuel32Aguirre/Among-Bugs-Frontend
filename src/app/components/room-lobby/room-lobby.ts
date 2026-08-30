import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

/** Compat: redirige al nuevo flujo de salas. */
@Component({
  selector: 'app-room-lobby',
  standalone: true,
  template: '',
})
export class RoomLobbyComponent implements OnInit {
  private router = inject(Router);
  ngOnInit(): void {
    this.router.navigate(['/home']);
  }
}
