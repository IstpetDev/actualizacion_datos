import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Interceptor funcional que enriquece las peticiones salientes con el token de sesión
 * y gestiona de forma centralizada respuestas 401 (No autorizado) y 403 (Prohibido).
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.sesion()?.token;
  const esUrlExterna = req.url.startsWith('http://') || req.url.startsWith('https://');

  let peticion = req;
  if (token && !esUrlExterna && !req.headers.has('Authorization')) {
    peticion = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(peticion).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401) {
          authService.cerrarSesion();
          router.navigate(['/login']);
        } else if (error.status === 403) {
          router.navigate(['/no-autorizado']);
        }
      }

      return throwError(() => error);
    }),
  );
};
