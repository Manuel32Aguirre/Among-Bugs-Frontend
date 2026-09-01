import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { map } from 'rxjs';

export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  return authService.ensureFreshSession().pipe(
    map((ok) => {
      if (!ok || !authService.isLoggedIn()) {
        router.navigate(['/login']);
        return false;
      }
      return true;
    })
  );
};
