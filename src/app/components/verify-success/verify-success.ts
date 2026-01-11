import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-verify-success',
  standalone: true,
  template: '', // No necesitamos HTML, Swal se encarga de todo
})
export class VerifySuccessComponent implements OnInit {

  constructor(private router: Router) {}

  ngOnInit() {
    this.mostrarAlerta();
  }

  mostrarAlerta() {
    Swal.fire({
      title: '¡Cuenta Activada!',
      text: 'Tu correo ha sido verificado con éxito.',
      icon: 'success',
      confirmButtonText: 'Ir al Inicio de Sesión',
      confirmButtonColor: '#764ba2', // El color moradito de tu gradiente
      allowOutsideClick: false,
      background: '#ffffff',
      // Esto simula un poco el estilo de tu card
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
