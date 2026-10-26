import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';

// La cookie del servidor es la autoridad, también al recargar o cambiar de módulo.
export const authGuard: CanActivateFn = (_ruta, estado) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.verificarSesion().pipe(
    map((sesion) =>
      sesion.debeCambiarContrasena && estado.url !== '/cambiar-clave'
        ? router.createUrlTree(['/cambiar-clave'])
        : true,
    ),
    catchError(() => {
      auth.cerrarSesion();
      return of(router.createUrlTree(['/login']));
    }),
  );
};

export const publicGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.verificarSesion().pipe(
    map((sesion) =>
      router.createUrlTree([sesion.debeCambiarContrasena ? '/cambiar-clave' : `/${sesion.rol}`]),
    ),
    catchError(() => {
      auth.cerrarSesion();
      return of(true);
    }),
  );
};
