import { Component, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('among-bugs-frontend');
  showNavbar = false;

  constructor(private router: Router) {
    // Verificar la ruta inicial inmediatamente
    this.checkRoute(this.router.url);

    // Suscribirse a cambios de ruta
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.checkRoute(event.url);
      });
  }

  private checkRoute(url: string): void {
    // No mostrar navbar en login, registro y páginas de verificación
    const hideNavbarRoutes = ['/login', '/register', '/verify/success', '/verify/expired', '/verify/error'];
    this.showNavbar = !hideNavbarRoutes.includes(url);
  }
}
