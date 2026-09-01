import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class NavbarComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  readonly auth = this.authService;
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  readonly lang = inject(LanguageService);
  private routerSubscription?: Subscription;

  username: string = '';
  userEmail: string = '';
  isLoggedIn: boolean = false;

  ngOnInit(): void {
    this.checkAndLoadProfile();

    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.checkAndLoadProfile();
      });
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  checkAndLoadProfile(): void {
    this.isLoggedIn = this.authService.isLoggedIn();

    if (this.isLoggedIn && this.authService.isGuest()) {
      const token = this.authService.getToken();
      const payload = token ? this.decodeGuest(token) : null;
      this.username = payload?.username || 'Invitado';
      this.userEmail = '';
      this.cdr.detectChanges();
      return;
    }

    if (this.isLoggedIn) {
      this.loadUserProfile();
    } else {
      this.username = '';
      this.userEmail = '';
      this.cdr.detectChanges();
    }
  }

  private decodeGuest(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(decodeURIComponent(atob(base64).split('').map(c =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join('')));
    } catch {
      return null;
    }
  }

  loadUserProfile(): void {
    this.authService.getProfile().subscribe({
      next: (data: any) => {
        this.username = data.username || 'Usuario';
        this.userEmail = data.email || '';
        this.cdr.detectChanges();
      },
      error: () => {
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
}
