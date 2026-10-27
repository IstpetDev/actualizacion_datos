import { CanDeactivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../../../../core/auth';
import { HojaDeVidaComponent } from '../hoja-de-vida.component';

export const cambiosSinGuardarGuard: CanDeactivateFn<HojaDeVidaComponent> = (
  component,
  _ruta,
  _estado,
  siguiente,
) => {
  // No se guarda automáticamente un borrador cuando el servidor vuelve a restringir el acceso.
  if (
    siguiente?.url?.split('?')[0] === '/proteccion-datos' &&
    inject(AuthService).sesion()?.requiereAceptarProteccionDatos === true
  )
    return true;
  return component.puedeDesactivar ? component.puedeDesactivar() : true;
};
