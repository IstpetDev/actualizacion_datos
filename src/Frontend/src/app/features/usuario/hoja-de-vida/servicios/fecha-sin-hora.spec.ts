import { describe, expect, it } from 'vitest';
import { fechaSinHora } from './fecha-sin-hora';

describe('fechaSinHora', () => {
  it('serializa DateOnly sin hora y conserva DateTime sin modificarlo', () => {
    expect(
      JSON.parse(
        JSON.stringify({
          fecha: fechaSinHora('1990-01-01'),
          instante: new Date('2026-10-26T12:30:00Z'),
        }),
      ),
    ).toEqual({ fecha: '1990-01-01', instante: '2026-10-26T12:30:00.000Z' });
    expect(fechaSinHora('')).toBeUndefined();
  });
});
