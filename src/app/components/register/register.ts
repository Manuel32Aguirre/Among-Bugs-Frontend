import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';
import { apiErrorMessage } from '../../utils/api-error';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  readonly lang = inject(LanguageService);

  showPassword = false;

  registerData = {
    username: '',
    email: '',
    password: ''
  };

  onRegister() {
    this.authService.register(this.registerData).subscribe({
      next: (res: any) => {
        Swal.fire({
          icon: 'success',
          title: this.lang.t('register.okTitle'),
          text: this.lang.t('register.okText', res.email),
          confirmButtonColor: '#111827'
        }).then(() => {
          this.router.navigate(['/login']);
        });
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: this.lang.t('register.error'),
          text: apiErrorMessage(err, this.lang.t('register.error')),
          confirmButtonColor: '#111827'
        });
      }
    });
  }
}
