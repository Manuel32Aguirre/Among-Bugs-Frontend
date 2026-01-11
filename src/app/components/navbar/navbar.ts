import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth';
import { Subscription, filter } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class NavbarComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8080/api';

  username: string = '';
  userEmail: string = '';
  isLoggedIn: boolean = false;
  private routerSubscription?: Subscription;

  ngOnInit(): void {
    // Cargar el perfil inmediatamente al inicializar
    this.checkAndLoadProfile();

    // Suscribirse a cambios de ruta para actualizar el perfil
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.checkAndLoadProfile();
      });
  }

  ngOnDestroy(): void {
    // Limpiar suscripción
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  checkAndLoadProfile(): void {
    this.isLoggedIn = this.authService.isLoggedIn();

    if (this.isLoggedIn) {
      this.loadUserProfile();
    } else {
      this.username = '';
      this.userEmail = '';
      this.cdr.detectChanges();
    }
  }

  loadUserProfile(): void {
    this.authService.getProfile().subscribe({
      next: (data: any) => {
        console.log('Perfil de usuario cargado:', data);
        this.username = data.username || 'Usuario';
        this.userEmail = data.email || '';
        // Forzar detección de cambios
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar perfil:', err);
        this.username = 'Usuario';
        this.userEmail = '';
        this.cdr.detectChanges();
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  downloadStats(): void {
    const token = localStorage.getItem('authToken');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    Swal.fire({
      title: 'Descargando...',
      text: 'Generando tu reporte de estadísticas',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.http.get(`${this.baseUrl}/trivia/stats/report`, {
      headers: headers,
      responseType: 'blob',
      observe: 'response'
    }).subscribe({
      next: (response: any) => {
        Swal.close();

        // Validar que la respuesta contenga datos
        if (!response.body || response.body.size === 0) {
          Swal.fire({
            icon: 'info',
            title: 'Sin estadísticas',
            text: 'Aún no has completado ninguna trivia. ¡Juega para generar tu reporte!',
            confirmButtonColor: '#3b82f6'
          });
          return;
        }

        // Crear un enlace temporal para descargar el archivo
        const blob = response.body;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Generar nombre de archivo con fecha
        const now = new Date();
        link.download = `estadisticas_${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}.pdf`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        Swal.fire({
          icon: 'success',
          title: '¡Descarga exitosa!',
          text: 'Tu reporte de estadísticas se ha descargado correctamente',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (err) => {
        Swal.close();
        console.error('Error al descargar estadísticas:', err);

        // Validar el tipo de error
        if (err.status === 204 || err.status === 404) {
          Swal.fire({
            icon: 'info',
            title: 'Sin estadísticas',
            text: 'Aún no has completado ninguna trivia. ¡Juega para generar tu reporte!',
            confirmButtonColor: '#3b82f6'
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Hubo un problema al generar el reporte. Por favor, intenta nuevamente.',
            confirmButtonColor: '#ef4444'
          });
        }
      }
    });
  }
}
