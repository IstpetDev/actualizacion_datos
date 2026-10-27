import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { SwaggerException } from '../../api-client';
import { extraerDetalleError, mensajeError } from './mensaje-error';

describe('mensajeError y extraerDetalleError', () => {
  it('debe extraer el mensaje cuando SwaggerException tiene result con mensaje', () => {
    const error = new SwaggerException(
      'Bad Request',
      400,
      '{"mensaje":"La fecha de fin no puede ser anterior a la fecha de inicio."}',
      {},
      { mensaje: 'La fecha de fin no puede ser anterior a la fecha de inicio.' },
    );

    const msg = mensajeError(error, 'Error alternativo');
    expect(msg).toBe('La fecha de fin no puede ser anterior a la fecha de inicio.');
  });

  it('debe descartar "Bad Request" y usar la alternativa cuando no hay mensaje en el cuerpo', () => {
    const error = new SwaggerException('Bad Request', 400, '', {}, null);

    const msg = mensajeError(error, 'No se pudo guardar la información.');
    expect(msg).toBe('No se pudo guardar la información.');
  });

  it('debe parsear response cuando result es nulo pero response tiene JSON', () => {
    const error = new SwaggerException(
      'Bad Request',
      400,
      '{"mensaje":"El documento ingresado ya se encuentra registrado."}',
      {},
      null,
    );

    const msg = mensajeError(error, 'Alternativa');
    expect(msg).toBe('El documento ingresado ya se encuentra registrado.');
  });

  it('debe informar desconexión cuando el estado es 0 (red caída)', () => {
    const error = new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' });

    const msg = mensajeError(error, 'Alternativa');
    expect(msg).toBe('No se pudo conectar con el servidor. Verifique su conexión a internet.');
  });

  it('debe incluir traceId cuando el error es 5xx con traceId', () => {
    const error = new SwaggerException(
      'Internal Server Error',
      500,
      '',
      {},
      {
        mensaje: 'Ha ocurrido un error inesperado en el servidor.',
        traceId: '00-abcdef-123',
      },
    );

    const detalle = extraerDetalleError(error);
    expect(detalle.mensaje).toContain('00-abcdef-123');
    expect(detalle.traceId).toBe('00-abcdef-123');
  });

  it('debe extraer errores por campo cuando vienen en el cuerpo', () => {
    const error = {
      mensaje: 'Parámetros inválidos.',
      codigo: 'PARAMETRO_INVALIDO',
      errores: {
        documento: ['El documento es obligatorio.'],
      },
    };

    const detalle = extraerDetalleError(error);
    expect(detalle.codigo).toBe('PARAMETRO_INVALIDO');
    expect(detalle.errores?.['documento']).toContain('El documento es obligatorio.');
  });
});
