import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';
import { LanguageService } from '../services/language.service';
import { catchError, switchMap, throwError } from 'rxjs';

function isAuthEndpoint(url: string): boolean {
  return url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh');
}

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
      if (
        error.status === 401
        && auth.isLoggedIn()
        && !auth.isGuest()
        && !isAuthEndpoint(req.url)
      ) {
        return auth.refreshSession().pipe(
          switchMap(({ token: newToken }) => {
            const retry = req.clone({
              withCredentials: true,
              setHeaders: {
                Authorization: `Bearer ${newToken}`,
                'Accept-Language': acceptLanguage
              }
            });
            return next(retry);
          }),
          catchError((refreshError) => {
            auth.clearSession();
            return throwError(() => refreshError);
          })
        );
      }

      if (error.status === 401 && auth.isLoggedIn()) {
        auth.clearSession();
      }
      return throwError(() => error);
    })
  );
};
