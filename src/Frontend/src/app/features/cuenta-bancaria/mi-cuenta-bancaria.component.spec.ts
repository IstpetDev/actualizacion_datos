import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import {
  CatalogosClient,
  CuentaBancariaClient,
  CuentaBancariaDto,
  SwaggerException,
} from '../../api-client';
import { MiCuentaBancariaComponent } from './mi-cuenta-bancaria.component';

// Solo cuentas ficticias evidentes (ADR-0013 dec. 8).
const propuesta: CuentaBancariaDto = {
  id: 'cuenta-ficticia',
  tipoCuentaId: 51,
  tipoCuenta: 'Ahorros',
  bancoId: undefined,
  banco: 'Banco ficticio',
  numeroEnmascarado: '******1234',
  ultimosDigitos: '1234',
  estado: 'sin-confirmar',
  fechaActualizacionUtc: new Date('2026-10-22T10:00:00Z'),
};
const sinContenido = () => throwError(() => new SwaggerException('No Content', 204, '', {}, null));

describe('mi cuenta bancaria', () => {
  const cuentas = {
    obtenerMiCuentaBancaria: vi.fn(),
    guardarMiCuentaBancaria: vi.fn(),
    confirmarMiCuentaBancaria: vi.fn(),
    leerMiNumeroCuentaBancaria: vi.fn(),
  };
  const catalogos = { listarCatalogo: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    cuentas.obtenerMiCuentaBancaria.mockReturnValue(sinContenido());
    // Mientras T-01 no implemente los catálogos, la API responde 501.
    catalogos.listarCatalogo.mockReturnValue(
      throwError(() => new SwaggerException('Not Implemented', 501, '', {}, null)),
    );
    TestBed.configureTestingModule({
      imports: [MiCuentaBancariaComponent],
      providers: [
        { provide: CuentaBancariaClient, useValue: cuentas },
        { provide: CatalogosClient, useValue: catalogos },
      ],
    });
  });

  function preparar(editable: boolean) {
    const fixture = TestBed.createComponent(MiCuentaBancariaComponent);
    fixture.componentRef.setInput('editable', editable);
    fixture.detectChanges();
    return fixture;
  }

  const texto = (fixture: { nativeElement: HTMLElement }) =>
    fixture.nativeElement.textContent ?? '';

  it('sin_cuenta_muestra_el_aviso_y_usa_los_tipos_sembrados_si_el_catalogo_falla', () => {
    const fixture = preparar(true);
    expect(fixture.nativeElement.querySelector('[data-testid=sin-cuenta]')).not.toBeNull();
    const opciones = [...fixture.nativeElement.querySelectorAll('#tipo-cuenta option')].map(
      (opcion) => (opcion as HTMLOptionElement).textContent?.trim(),
    );
    expect(opciones).toEqual(['Ahorros', 'Corriente']);
    expect(fixture.nativeElement.querySelector('#banco')).toBeNull();
    expect(fixture.nativeElement.querySelector('#banco-otro')).not.toBeNull();
  });

  it('fuera_de_edicion_no_muestra_formulario_ni_confirmacion', () => {
    cuentas.obtenerMiCuentaBancaria.mockReturnValue(of(propuesta));
    const fixture = preparar(false);
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid=confirmar-cuenta]')).toBeNull();
    expect(texto(fixture)).toContain('******1234');
  });

  it('confirma_la_propuesta_de_la_nomina', () => {
    cuentas.obtenerMiCuentaBancaria.mockReturnValue(of(propuesta));
    cuentas.confirmarMiCuentaBancaria.mockReturnValue(of({ ...propuesta, estado: 'coincide' }));
    const fixture = preparar(true);
    expect(texto(fixture)).toContain('sin confirmar');
    fixture.nativeElement.querySelector('[data-testid=confirmar-cuenta]').click();
    fixture.detectChanges();
    expect(cuentas.confirmarMiCuentaBancaria).toHaveBeenCalledWith();
    expect(
      fixture.nativeElement.querySelector('[data-testid=estado-cuenta]').textContent,
    ).toContain('Coincide con la nómina');
    expect(fixture.nativeElement.querySelector('[data-testid=confirmar-cuenta]')).toBeNull();
  });

  it('muestra_el_numero_completo_solo_a_pedido_y_lo_oculta', () => {
    cuentas.obtenerMiCuentaBancaria.mockReturnValue(of(propuesta));
    cuentas.leerMiNumeroCuentaBancaria.mockReturnValue(of({ numero: '0000001234' }));
    const fixture = preparar(true);
    const numero = () =>
      fixture.nativeElement.querySelector('[data-testid=numero-cuenta]').textContent;
    expect(numero()).toContain('******1234');
    expect(cuentas.leerMiNumeroCuentaBancaria).not.toHaveBeenCalled();
    fixture.componentInstance.verNumero();
    fixture.detectChanges();
    expect(numero()).toContain('0000001234');
    fixture.componentInstance.numeroCompleto.set('');
    fixture.detectChanges();
    expect(numero()).toContain('******1234');
  });

  it('guarda_con_banco_escrito_y_muestra_el_resultado', () => {
    cuentas.guardarMiCuentaBancaria.mockReturnValue(
      of({
        ...propuesta,
        estado: 'sin-nomina',
        ultimosDigitos: '5678',
        numeroEnmascarado: '******5678',
      }),
    );
    const fixture = preparar(true);
    const componente = fixture.componentInstance;
    componente.tipoCuentaId = 52;
    componente.nombreBancoOtro = 'Banco ficticio';
    componente.numero = '0000-005 678';
    componente.guardar();
    fixture.detectChanges();
    expect(cuentas.guardarMiCuentaBancaria).toHaveBeenCalledWith({
      tipoCuentaId: 52,
      numero: '0000-005 678',
      bancoId: undefined,
      nombreBancoOtro: 'Banco ficticio',
    });
    expect(componente.numero).toBe('');
    expect(texto(fixture)).toContain('******5678');
    expect(texto(fixture)).toContain('Cuenta guardada.');
  });

  it('con_bancos_del_catalogo_envia_el_banco_elegido_sin_nombre_escrito', () => {
    catalogos.listarCatalogo.mockImplementation((tipo: string) =>
      of(
        tipo === 'Banco'
          ? [
              {
                id: 1500,
                tipo: 'Banco',
                codigo: 'BANCO_FICTICIO',
                nombre: 'Banco Ficticio S.A.',
                orden: 1,
              },
            ]
          : [
              {
                id: 51,
                tipo: 'TipoCuentaBancaria',
                codigo: 'AHORROS',
                nombre: 'Ahorros',
                orden: 1,
              },
            ],
      ),
    );
    cuentas.guardarMiCuentaBancaria.mockReturnValue(of(propuesta));
    const fixture = preparar(true);
    expect(fixture.nativeElement.querySelector('#banco')).not.toBeNull();
    const componente = fixture.componentInstance;
    componente.bancoId = 1500;
    componente.numero = '0000001234';
    componente.guardar();
    expect(cuentas.guardarMiCuentaBancaria).toHaveBeenCalledWith({
      tipoCuentaId: 51,
      numero: '0000001234',
      bancoId: 1500,
      nombreBancoOtro: undefined,
    });
  });

  it('si_la_api_rechaza_muestra_el_motivo_y_conserva_lo_escrito', () => {
    cuentas.guardarMiCuentaBancaria.mockReturnValue(
      throwError(() => ({ mensaje: 'El número de cuenta debe tener entre 6 y 20 dígitos.' })),
    );
    const fixture = preparar(true);
    const componente = fixture.componentInstance;
    componente.nombreBancoOtro = 'Banco ficticio';
    componente.numero = '123';
    componente.guardar();
    fixture.detectChanges();
    expect(componente.error()).toContain('entre 6 y 20');
    expect(componente.numero).toBe('123');
    expect(componente.ocupado()).toBe(false);
  });

  it('sin_claves_en_el_servidor_muestra_el_motivo_del_503', () => {
    cuentas.obtenerMiCuentaBancaria.mockReturnValue(
      throwError(() => ({ mensaje: 'La cuenta bancaria no está disponible.' })),
    );
    const fixture = preparar(true);
    expect(texto(fixture)).toContain('no está disponible');
  });
});
