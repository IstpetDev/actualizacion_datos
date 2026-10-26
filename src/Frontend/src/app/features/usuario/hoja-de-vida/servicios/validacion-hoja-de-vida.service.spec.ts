import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ConfiguracionClient } from '../../../../api-client';
import { validarCampos, ValidacionHojaDeVidaService } from './validacion-hoja-de-vida.service';

import { casosFicha, politicaFicticia } from './casos-validacion.fixture';

describe('Validación de hoja de vida', () => {
  it.each(casosFicha)('valida %s con %s (válido: %s)', (campo, valor, valido) => {
    expect(
      Object.keys(validarCampos({ [campo]: valor }, 'ficha', politicaFicticia)).length === 0,
    ).toBe(valido);
  });
  it('revisa todos los límites de texto y los controles', () => {
    for (const [seccion, reglas] of Object.entries(politicaFicticia.reglas))
      for (const [campo, regla] of Object.entries(reglas)) {
        if (!regla.maximoCaracteres) continue;
        const exceso = {
          [campo]: 'a'.repeat(regla.maximoCaracteres + 1),
          trabajaActualmente: true,
        };
        expect(validarCampos(exceso, seccion, politicaFicticia)[campo]).toBeDefined();
        expect(
          validarCampos({ [campo]: 'a\0', trabajaActualmente: true }, seccion, politicaFicticia)[
            campo
          ],
        ).toEqual(['No se permiten caracteres de control.']);
      }
  });
  it.each([
    ['0900000000', true],
    ['020000000', true],
    ['080000000', false],
    ['texto', false],
  ])('valida teléfono de referencia %s', (telefono, valido) => {
    expect(
      Object.keys(validarCampos({ telefono }, 'referencia', politicaFicticia)).length === 0,
    ).toBe(valido);
  });
  it.each([
    [1, true],
    [24, true],
    [0, false],
    [-1, false],
    [1.5, false],
    ['texto', false],
  ])('valida horas %s', (numeroHoras, valido) => {
    expect(
      Object.keys(validarCampos({ numeroHoras }, 'capacitacion', politicaFicticia)).length === 0,
    ).toBe(valido);
  });
  it('no exige dominios sin configuración, pero siempre exige formato', () => {
    const politica = { ...politicaFicticia, dominiosCorreoPermitidos: [] };
    expect(
      validarCampos({ correoInstitucional: 'persona@otra-ficticia.example' }, 'ficha', politica),
    ).toEqual({});
    expect(
      validarCampos({ correoInstitucional: 'a@b@c.example' }, 'ficha', politica)[
        'correoInstitucional'
      ],
    ).toBeDefined();
    expect(
      validarCampos({ correoInstitucional: 'persona@otra-ficticia.example' }, 'ficha', {
        ...politica,
        dominiosCorreoPermitidos: ['otra-ficticia.example'],
      }),
    ).toEqual({});
  });
  it('conserva coherencia de fechas, porcentajes, becas y números de cuenta', () => {
    expect(
      validarCampos(
        { fechaInicio: '2026-10-26', fechaFin: '2026-10-25' },
        'capacitacion',
        politicaFicticia,
      )['fechaFin'],
    ).toBeDefined();
    expect(
      validarCampos({ trabajaActualmente: false }, 'experiencia', politicaFicticia)['fechaFin'],
    ).toBeDefined();
    expect(
      validarCampos({ porcentajeBeca: 101, montoBeca: -1 }, 'tituloEnCurso', politicaFicticia),
    ).toHaveProperty('porcentajeBeca');
    expect(validarCampos({ numero: '000-000 0000' }, 'cuenta', politicaFicticia)).toEqual({});
    expect(validarCampos({ numero: '00a000' }, 'cuenta', politicaFicticia)['numero']).toBeDefined();
  });
  it('bloquea si no se cargó la política y permite reintentar', () => {
    const cliente = {
      obtenerPoliticaValidacion: vi
        .fn()
        .mockReturnValue(throwError(() => new Error('fallo ficticio'))),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: ConfiguracionClient, useValue: cliente }],
    });
    const servicio = TestBed.inject(ValidacionHojaDeVidaService);
    expect(servicio.invalido({}, 'ficha')).toBe(true);
    expect(servicio.errorCarga()).toContain('Vuelva a intentar');
    cliente.obtenerPoliticaValidacion.mockReturnValue(of(politicaFicticia));
    servicio.cargar();
    expect(servicio.invalido({}, 'ficha')).toBe(false);
  });
  it('presenta errores del backend y los retira después de corregir', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ConfiguracionClient,
          useValue: { obtenerPoliticaValidacion: () => of(politicaFicticia) },
        },
      ],
    });
    const servicio = TestBed.inject(ValidacionHojaDeVidaService);
    servicio.registrarError(
      { errores: { celular: ['Mensaje ficticio del servidor.'] } },
      { celular: '0900000000' },
    );
    expect(servicio.mensaje({ celular: '0900000000' }, 'ficha', 'celular')).toContain(
      'Mensaje ficticio',
    );
    expect(servicio.mensaje({ celular: '0900000001' }, 'ficha', 'celular')).toBe('');
  });

  it.each([['Texto\nFicticio', true], ['Texto\r\nFicticio', true], ['Texto\rFicticio', false], ['Texto\tFicticio', false]])('valida controles de funciones %s', (funciones, valido) => {
    expect(Object.keys(validarCampos({ funciones, trabajaActualmente: true }, 'experiencia', politicaFicticia)).length === 0).toBe(valido);
  });
});
