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

export function extraerErroresCampos(error: unknown): Record<string, string[]> {
  const detalle: unknown =
    error instanceof SwaggerException
      ? error.result
      : error instanceof HttpErrorResponse
        ? error.error
        : error;
  if (
    !detalle ||
    typeof detalle !== 'object' ||
    !('errores' in detalle) ||
    !detalle.errores ||
    typeof detalle.errores !== 'object'
  )
    return {};
  return Object.fromEntries(
    Object.entries(detalle.errores).filter(
      (entrada): entrada is [string, string[]] =>
        Array.isArray(entrada[1]) &&
        entrada[1].every((valor: unknown) => typeof valor === 'string'),
    ),
  );
}
