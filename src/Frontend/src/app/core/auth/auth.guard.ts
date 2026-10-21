import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Guarda funcional que exige sesión activa para acceder a la ruta.
 * Si el usuario no está autenticado, redirige atómicamente a /login.
 */
export const authGuard: CanActivateFn = (): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.estaAutenticado()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

/**
 * Guarda funcional para rutas públicas (ej. /login).
 * Si el usuario ya cuenta con sesión activa, impide el reingreso al login
 * y lo redirige a la raíz de la aplicación.
 */
export const publicGuard: CanActivateFn = (): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.estaAutenticado()) {
    return true;
  }

  return router.createUrlTree(['/']);
};
