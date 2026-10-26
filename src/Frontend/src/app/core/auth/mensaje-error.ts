import { HttpErrorResponse } from '@angular/common/http';
import { SwaggerException } from '../../api-client';

export function mensajeError(error: unknown, alternativa: string): string {
  const detalle: unknown =
    error instanceof SwaggerException
      ? error.result
      : error instanceof HttpErrorResponse
        ? error.error
        : error;
  if (
    detalle &&
    typeof detalle === 'object' &&
    'mensaje' in detalle &&
    typeof detalle.mensaje === 'string'
  ) {
    return detalle.mensaje;
  }
  return alternativa;
}
