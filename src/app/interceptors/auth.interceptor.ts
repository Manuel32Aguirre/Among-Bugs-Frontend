import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';
import { LanguageService } from '../services/language.service';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const language = inject(LanguageService);
  const token = auth.getToken();
  const acceptLanguage = language.acceptLanguage();

  const cloned = req.clone({
    withCredentials: true,
    setHeaders: token
      ? {
          Authorization: `Bearer ${token}`,
          'Accept-Language': acceptLanguage
        }
      : { 'Accept-Language': acceptLanguage }
  });

  return next(cloned).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && auth.isLoggedIn()) {
        auth.clearSession();
      }
      return throwError(() => error);
    })
  );
};
