import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { RevisionClient, SwaggerException } from '../../api-client';
import {
  CuentaBancariaRevisionComponent,
  EstadoCuentasBancariasComponent,
} from './estado-cuentas-bancarias.component';

describe('revisión de cuentas bancarias', () => {
  const revision = {
    listarEstadosCuentasBancarias: vi.fn(),
    obtenerCuentaBancariaParaRevision: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [{ provide: RevisionClient, useValue: revision }],
    });
  });

  it('lista_el_estado_de_cada_persona_con_resumen_y_sin_numero_completo', () => {
    revision.listarEstadosCuentasBancarias.mockReturnValue(
      of([
        {
          personaId: 'a',
          documento: '0000000030',
          nombre: 'Persona Uno',
          estado: 'difiere',
          banco: 'Banco ficticio',
          tipoCuenta: 'Ahorros',
          ultimosDigitos: '5678',
        },
        {
          personaId: 'b',
          documento: '0000000031',
          nombre: 'Persona Dos',
          estado: 'sin-registrar',
          banco: undefined,
          tipoCuenta: undefined,
          ultimosDigitos: undefined,
        },
        {
          personaId: 'c',
          documento: '0000000032',
          nombre: 'Persona Tres',
          estado: 'sin-confirmar',
          banco: 'Banco ficticio',
          tipoCuenta: 'Ahorros',
          ultimosDigitos: '1234',
        },
      ]),
    );
    const fixture = TestBed.createComponent(EstadoCuentasBancariasComponent);
    fixture.detectChanges();
    const html: HTMLElement = fixture.nativeElement;
    expect(html.querySelector('[data-testid=resumen-cuentas]')?.textContent).toContain(
      '1 difieren · 1 sin confirmar · 1 sin registrar',
    );
    expect(html.querySelectorAll('tbody tr').length).toBe(3);
    expect(html.querySelector('[data-estado=difiere]')?.textContent).toContain('******5678');
    expect(html.querySelector('[data-estado=difiere]')?.textContent).toContain(
      'Difiere de la nómina',
    );
    expect(html.querySelector('[data-estado=sin-registrar]')?.textContent).toContain(
      'Sin registrar',
    );
  });

  it('muestra_mensaje_cuando_no_hay_personas_o_nomina_cargada', () => {
    revision.listarEstadosCuentasBancarias.mockReturnValue(of([]));
    const fixture = TestBed.createComponent(EstadoCuentasBancariasComponent);
    fixture.detectChanges();
    const html: HTMLElement = fixture.nativeElement;
    expect(html.querySelector('[data-testid="estado-cuentas-vacio"]')?.textContent).toContain(
      'No hay personas registradas en la institución o la nómina aún no ha sido cargada.',
    );
  });

  it('permite_refrescar_la_lista_manualmente_con_el_boton', () => {
    revision.listarEstadosCuentasBancarias.mockReturnValue(of([]));
    const fixture = TestBed.createComponent(EstadoCuentasBancariasComponent);
    fixture.detectChanges();

    expect(revision.listarEstadosCuentasBancarias).toHaveBeenCalledTimes(1);

    const botonRefrescar = fixture.nativeElement.querySelector(
      '[data-testid="btn-refrescar-cuentas"]',
    ) as HTMLButtonElement;
    expect(botonRefrescar).toBeTruthy();

    botonRefrescar.click();
    fixture.detectChanges();

    expect(revision.listarEstadosCuentasBancarias).toHaveBeenCalledTimes(2);
  });

  it('si_la_api_rechaza_muestra_el_motivo', () => {
    revision.listarEstadosCuentasBancarias.mockReturnValue(
      throwError(() => ({
        mensaje: 'Solo el supervisor o el admin pueden revisar cuentas bancarias.',
      })),
    );
    const fixture = TestBed.createComponent(EstadoCuentasBancariasComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Solo el supervisor o el admin');
  });

  it('en_el_expediente_muestra_la_cuenta_enmascarada_o_sin_registrar', () => {
    revision.obtenerCuentaBancariaParaRevision.mockReturnValueOnce(
      of({
        id: 'x',
        tipoCuentaId: 71,
        tipoCuenta: 'Ahorros',
        banco: 'Banco ficticio',
        numeroEnmascarado: '******1234',
        ultimosDigitos: '1234',
        estado: 'coincide',
      }),
    );
    const conCuenta = TestBed.createComponent(CuentaBancariaRevisionComponent);
    conCuenta.componentRef.setInput('documento', '0000000030');
    conCuenta.detectChanges();
    expect(revision.obtenerCuentaBancariaParaRevision).toHaveBeenCalledWith('0000000030');
    expect(conCuenta.nativeElement.textContent).toContain('******1234');
    expect(conCuenta.nativeElement.textContent).toContain('Coincide con la nómina');

    revision.obtenerCuentaBancariaParaRevision.mockReturnValueOnce(
      throwError(() => new SwaggerException('No Content', 204, '', {}, null)),
    );
    const sinCuenta = TestBed.createComponent(CuentaBancariaRevisionComponent);
    sinCuenta.componentRef.setInput('documento', '0000000031');
    sinCuenta.detectChanges();
    expect(sinCuenta.nativeElement.textContent).toContain('Sin registrar');
  });
});
