import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  readonly lang = inject(LanguageService);

  showPassword = false;

  loginData = {
    email: '',
    password: ''
  };

  onLogin() {
    this.authService.login(this.loginData).subscribe({
      next: (res: any) => {
        this.authService.saveToken(res.token);

        Swal.fire({
          icon: 'success',
          title: this.lang.t('login.welcome'),
          text: this.lang.t('login.success'),
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
          title: this.lang.t('common.error'),
          text: err.error?.message || 'Error',
          confirmButtonColor: '#111827'
        });
      }
    });
  }
}
