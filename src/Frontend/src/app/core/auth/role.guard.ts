import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Rol } from './auth.models';
import { AuthService } from './auth.service';

/**
 * Función de fábrica que genera una guarda funcional CanActivateFn
 * para proteger rutas restringidas a uno o más roles específicos.
 *
 * Comportamiento:
 * 1. Si el usuario no tiene sesión iniciada, redirige a /login.
 * 2. Si el usuario está autenticado pero no posee ninguno de los roles requeridos,
 *    redirige a /no-autorizado (HTTP 403 visual).
 * 3. Si posee uno de los roles permitidos, concede el acceso (true).
 */
export function roleGuard(rolesPermitidos: readonly Rol[] | Rol): CanActivateFn {
  return (): boolean | UrlTree => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.estaAutenticado()) {
      return router.createUrlTree(['/login']);
    }

    if (authService.tieneRol(rolesPermitidos)) {
      return true;
    }

    return router.createUrlTree(['/no-autorizado']);
  };
}
