import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';
import { rutaDeAcceso } from './auth.models';

// La cookie del servidor es la autoridad, también al recargar o cambiar de módulo.
export const authGuard: CanActivateFn = (_ruta, estado) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.verificarSesion().pipe(
    map((sesion) => {
      const destino = rutaDeAcceso(sesion);
      const rutaActual = estado.url.split('?')[0];
      if (destino === '/cambiar-clave' || destino === '/proteccion-datos')
        return rutaActual === destino ? true : router.createUrlTree([destino]);
      return rutaActual === '/proteccion-datos' || rutaActual === '/cambiar-clave'
        ? router.createUrlTree([destino])
        : true;
    }),
    catchError((error: { status?: number }) => {
      if (error?.status && error.status !== 401) {
        return of(
          estado.url.split('?')[0] === '/proteccion-datos'
            ? true
            : router.createUrlTree(['/proteccion-datos']),
        );
      }
      auth.cerrarSesion();
      return of(router.createUrlTree(['/login']));
    }),
  );
};

export const publicGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.verificarSesion().pipe(
    map((sesion) => router.createUrlTree([rutaDeAcceso(sesion)])),
    catchError(() => {
      auth.cerrarSesion();
      return of(true);
    }),
  );
};
