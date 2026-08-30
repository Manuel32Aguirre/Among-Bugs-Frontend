import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';
import { AuthService } from '../../services/auth';
import { RoomService } from '../../services/room.service';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { apiErrorMessage } from '../../utils/api-error';

@Component({
  selector: 'app-guest-join',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './guest-join.html',
  styleUrl: './guest-join.css'
})
export class GuestJoinComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private rooms = inject(RoomService);
  readonly lang = inject(LanguageService);

  code = '';
  username = '';
  submitting = false;

  ngOnInit(): void {
    this.code = (this.route.snapshot.paramMap.get('code') || '').toUpperCase();
    if (!this.code) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.auth.isLoggedIn() && !this.auth.isGuest()) {
      this.rooms.joinRoom(this.code).subscribe({
        next: () => this.router.navigate(['/room', this.code]),
        error: (err) => {
          Swal.fire(this.lang.t('common.error'), apiErrorMessage(err), 'error');
        }
      });
    }
  }

  join(): void {
    const name = this.username.trim();
    if (name.length < 2) {
      Swal.fire(this.lang.t('common.attention'), this.lang.t('guest.needName'), 'warning');
      return;
    }
    this.submitting = true;
    this.rooms.guestJoin(this.code, name).subscribe({
      next: (res) => {
        this.auth.saveToken(res.token);
        this.router.navigate(['/room', res.code || this.code]);
      },
      error: (err) => {
        this.submitting = false;
        Swal.fire(this.lang.t('common.error'), apiErrorMessage(err, this.lang.t('guest.error')), 'error');
      }
    });
  }
}
