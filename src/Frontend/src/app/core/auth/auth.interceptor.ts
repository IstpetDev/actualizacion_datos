import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, map, mergeMap, of, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/** Gestiona la expiración de la cookie sin fabricar credenciales en el navegador. */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401) {
          auth.cerrarSesion();
          if (!req.url.endsWith('/auth/login') && !req.url.endsWith('/auth/sesion')) {
            void router.navigate(['/login']);
          }
        } else if (error.status === 403) {
          const cuerpo =
            error.error instanceof Blob ? from(error.error.text()) : of(error.error as unknown);
          return cuerpo.pipe(
            map((valor: unknown) => {
              try {
                const objeto =
                  typeof valor === 'string'
                    ? (JSON.parse(valor) as { codigo?: string })
                    : (valor as { codigo?: string } | null);
                return objeto?.codigo;
              } catch {
                return undefined;
              }
            }),
            mergeMap((codigo) => {
              if (codigo === 'ACEPTACION_PROTECCION_DATOS_PENDIENTE') {
                auth.marcarProteccionPendiente();
                void router.navigate(['/proteccion-datos']);
              } else if (auth.sesion()?.debeCambiarContrasena) {
                void router.navigate(['/cambiar-clave']);
              } else if (!(
                req.method !== 'GET' && /\/api\/(mis-datos|archivos)(\/|$)/.test(req.url)
              )) {
                void router.navigate(['/no-autorizado']);
              }
              return throwError(() => error);
            }),
          );
        }
      }
      return throwError(() => error);
    }),
  );
};
