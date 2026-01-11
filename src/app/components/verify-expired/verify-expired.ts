import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-verify-expired',
  standalone: true,
  template: '',
})
export class VerifyExpiredComponent implements OnInit {

  constructor(private router: Router) {}

  ngOnInit() {
    this.mostrarExpiracion();
  }

  mostrarExpiracion() {
    Swal.fire({
      title: 'Enlace Expirado',
      text: 'El enlace de verificación ha expirado. Por favor, solicita uno nuevo.',
      icon: 'warning',
      confirmButtonText: 'Ir al Inicio de Sesión',
      confirmButtonColor: '#764ba2',
      allowOutsideClick: false,
      background: '#ffffff',
      customClass: {
        popup: 'border-radius-20'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.router.navigate(['/login']);
      }
    });
  }
}
