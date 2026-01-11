import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-verify-error',
  standalone: true,
  template: '',
})
export class VerifyErrorComponent implements OnInit {

  constructor(private router: Router) {}

  ngOnInit() {
    this.mostrarError();
  }

  mostrarError() {
    Swal.fire({
      title: 'Error de Verificación',
      text: 'Ocurrió un error al verificar tu cuenta.',
      icon: 'error',
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
