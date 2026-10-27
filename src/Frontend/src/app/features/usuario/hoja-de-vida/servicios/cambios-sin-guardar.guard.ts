import { CanDeactivateFn } from '@angular/router';
import { HojaDeVidaComponent } from '../hoja-de-vida.component';

export const cambiosSinGuardarGuard: CanDeactivateFn<HojaDeVidaComponent> = (component) => {
  return component.puedeDesactivar ? component.puedeDesactivar() : true;
};
