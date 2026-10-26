import { HttpErrorResponse } from '@angular/common/http';
import { SwaggerException } from '../../api-client';

export interface DetalleError {
  mensaje: string;
  codigo?: string;
  errores?: Record<string, string[]>;
  traceId?: string;
  status?: number;
}

export function extraerDetalleError(
  error: unknown,
  alternativa = 'Ocurrió un error inesperado.',
): DetalleError {
  if (!error) {
    return { mensaje: alternativa };
  }

  // 1. Estado 0: sin conexión o fallo de red
  if (
    (error instanceof HttpErrorResponse && error.status === 0) ||
    (error instanceof SwaggerException && error.status === 0) ||
    (typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      (error as { status: number }).status === 0)
  ) {
    return {
      mensaje: 'No se pudo conectar con el servidor. Verifique su conexión a internet.',
      status: 0,
    };
  }

  let status: number | undefined;
  let rawBody: unknown;

  if (error instanceof SwaggerException) {
    status = error.status;
    rawBody = error.result;
    if (!rawBody && error.response) {
      try {
        rawBody = JSON.parse(error.response);
      } catch {
        rawBody = error.response;
      }
    }
  } else if (error instanceof HttpErrorResponse) {
    status = error.status;
    rawBody = error.error;
    if (typeof rawBody === 'string') {
      try {
        rawBody = JSON.parse(rawBody);
      } catch {
        // mantener como string
      }
    }
  } else if (typeof error === 'object' && error !== null) {
    if ('status' in error && typeof (error as { status: unknown }).status === 'number') {
      status = (error as { status: number }).status;
    }
    rawBody = error;
  }

  // 2. Extraer cuerpo estructurado
  if (rawBody && typeof rawBody === 'object') {
    const obj = rawBody as Record<string, unknown>;
    const mensajeProp =
      typeof obj['mensaje'] === 'string' && obj['mensaje'].trim()
        ? (obj['mensaje'] as string).trim()
        : undefined;
    const traceIdProp =
      typeof obj['traceId'] === 'string' && obj['traceId'].trim()
        ? (obj['traceId'] as string).trim()
        : undefined;
    const codigoProp =
      typeof obj['codigo'] === 'string' && obj['codigo'].trim()
        ? (obj['codigo'] as string).trim()
        : undefined;
    const erroresProp =
      typeof obj['errores'] === 'object' && obj['errores'] !== null
        ? (obj['errores'] as Record<string, string[]>)
        : undefined;

    if (mensajeProp && mensajeProp.toLowerCase() !== 'bad request') {
      const mensajeFinal =
        traceIdProp && status && status >= 500
          ? `${mensajeProp} (Código de referencia: ${traceIdProp})`
          : mensajeProp;

      return {
        mensaje: mensajeFinal,
        codigo: codigoProp,
        errores: erroresProp,
        traceId: traceIdProp,
        status,
      };
    }

    if (traceIdProp) {
      return {
        mensaje: `Error inesperado en el servidor. Código de referencia: ${traceIdProp}`,
        codigo: codigoProp,
        errores: erroresProp,
        traceId: traceIdProp,
        status,
      };
    }
  }

  // 3. Cadena simple devuelta por el servidor
  if (
    typeof rawBody === 'string' &&
    rawBody.trim() &&
    rawBody.trim().toLowerCase() !== 'bad request'
  ) {
    return { mensaje: rawBody.trim(), status };
  }

  // 4. Si es 5xx sin cuerpo útil
  if (status && status >= 500) {
    return {
      mensaje: 'Error interno en el servidor. Intente nuevamente más tarde.',
      status,
    };
  }

  return { mensaje: alternativa, status };
}

export function mensajeError(error: unknown, alternativa = 'Ocurrió un error inesperado.'): string {
  return extraerDetalleError(error, alternativa).mensaje;
}
