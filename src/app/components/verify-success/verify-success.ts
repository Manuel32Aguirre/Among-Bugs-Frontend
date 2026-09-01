import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-verify-success',
  standalone: true,
  template: '',
})
export class VerifySuccessComponent implements OnInit {

  constructor(private router: Router) {}

  ngOnInit() {
    this.showAlert();
  }

  showAlert() {
    Swal.fire({
      title: '¡Cuenta activada!',
      text: 'Tu correo ha sido verificado con éxito.',
      icon: 'success',
      confirmButtonText: 'Ir al inicio de sesión',
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
