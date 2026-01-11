import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Datos que pide tu API según la documentación
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
          title: '¡Tripulante registrado!',
          text: `Revisa tu correo: ${res.email}`,
          confirmButtonColor: '#111827'
        }).then(() => {
          this.router.navigate(['/login']);
        });
      },
      error: (err) => {
        // Muestra el mensaje de error de la API (ej: usuario ya existe)
        Swal.fire({
          icon: 'error',
          title: 'Error en el registro',
          text: err.error.message || 'No se pudo registrar',
          confirmButtonColor: '#111827'
        });
      }
    });
  }
}
