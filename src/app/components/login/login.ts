import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

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
          title: 'Bienvenido',
          text: 'Inicio de sesión exitoso',
          timer: 1500,
          showConfirmButton: false
        });

        setTimeout(() => {
          this.router.navigate(['/home']);
        }, 1500);
      },
      error: (err) => {
        const errorMsg = err.error.message || 'Credenciales incorrectas';
        Swal.fire({
          icon: 'error',
          title: 'Error de autenticación',
          text: errorMsg,
          confirmButtonColor: '#111827'
        });
      }
    });
  }
}
