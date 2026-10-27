import { Observable } from 'rxjs';

export interface SeccionConCambios {
  /**
   * Indica si la sección o su formulario visible tiene modificaciones no persistidas.
   */
  tieneCambios(): boolean;

  /**
   * Intenta persistir los cambios pendientes en el servidor.
   * Emite true si la operación tuvo éxito y puede continuarse la navegación,
   * o false si hubo un error de validación o fallo HTTP.
   */
  guardarCambios(): Observable<boolean>;

  /**
   * Descarta las modificaciones locales y restaura el estado original previo.
   */
  descartarCambios(): void;
}
