import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import {
  CapacitacionObligatoriaDto,
  ConfiguracionClient,
  CumplimientoCapacitacionObligatoriaDto,
  TipoFuncionarioDto,
} from '../../../api-client';
import { CapacitacionesObligatoriasConfigComponent } from './capacitaciones-obligatorias-config.component';

describe('CapacitacionesObligatoriasConfigComponent', () => {
  let component: CapacitacionesObligatoriasConfigComponent;
  let fixture: ComponentFixture<CapacitacionesObligatoriasConfigComponent>;

  let configClientMock: {
    listarCapacitacionesObligatorias: Mock;
    crearCapacitacionObligatoria: Mock;
    actualizarCapacitacionObligatoria: Mock;
    eliminarCapacitacionObligatoria: Mock;
    obtenerCumplimientoCapacitacionesObligatorias: Mock;
    listarTiposFuncionario: Mock;
  };

  const mockTipos: TipoFuncionarioDto[] = [
    { id: 'tipo-1', codigo: 'DOC', nombre: 'Docente', esDocente: true, activo: true, orden: 1 },
    {
      id: 'tipo-2',
      codigo: 'ADM',
      nombre: 'Administrativo',
      esDocente: false,
      activo: true,
      orden: 2,
    },
  ];

  const mockObligatorias: CapacitacionObligatoriaDto[] = [
    {
      id: 'ob-1',
      nombre: 'Seguridad en el Trabajo',
      institucionOrganizadora: 'ISTPET',
      horasEsperadas: 20,
      fechaRealizacion: undefined,
      tipoFuncionarioId: undefined,
      tipoFuncionarioNombre: undefined,
      activo: true,
      orden: 1,
    },
    {
      id: 'ob-2',
      nombre: 'Didáctica Superior',
      institucionOrganizadora: 'ISTPET',
      horasEsperadas: 40,
      fechaRealizacion: undefined,
      tipoFuncionarioId: 'tipo-1',
      tipoFuncionarioNombre: 'Docente',
      activo: true,
      orden: 2,
    },
  ];

  const mockCumplimiento: CumplimientoCapacitacionObligatoriaDto[] = [
    {
      capacitacionObligatoriaId: 'ob-1',
      nombre: 'Seguridad en el Trabajo',
      totalAplica: 10,
      totalCumplida: 8,
      totalExentaOJustificada: 1,
      totalPendiente: 1,
      personasPendientes: [
        {
          personaId: 'p-1',
          documento: '1700000010',
          nombre: 'Docente Pendiente',
          tipoFuncionarioNombre: 'Docente',
          fechaIngresoInstitucion: undefined,
        },
      ],
    },
  ];

  beforeEach(async () => {
    configClientMock = {
      listarCapacitacionesObligatorias: vi.fn().mockReturnValue(of(mockObligatorias)),
      crearCapacitacionObligatoria: vi.fn().mockReturnValue(of(mockObligatorias[0])),
      actualizarCapacitacionObligatoria: vi.fn().mockReturnValue(of(mockObligatorias[0])),
      eliminarCapacitacionObligatoria: vi.fn().mockReturnValue(of(undefined)),
      obtenerCumplimientoCapacitacionesObligatorias: vi.fn().mockReturnValue(of(mockCumplimiento)),
      listarTiposFuncionario: vi.fn().mockReturnValue(of(mockTipos)),
    };

    await TestBed.configureTestingModule({
      imports: [CapacitacionesObligatoriasConfigComponent],
      providers: [{ provide: ConfiguracionClient, useValue: configClientMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(CapacitacionesObligatoriasConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe_crearse_y_cargar_datos_iniciales', () => {
    expect(component).toBeTruthy();
    expect(component.obligatorias()).toEqual(mockObligatorias);
    expect(component.tiposFuncionario()).toEqual(mockTipos);
    expect(component.cumplimiento()).toEqual(mockCumplimiento);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(
      compiled.querySelector('[data-testid="tabla-capacitaciones-obligatorias"]'),
    ).toBeTruthy();
    expect(compiled.textContent).toContain('Seguridad en el Trabajo');
    expect(compiled.textContent).toContain('Didáctica Superior');
  });

  it('permite_crear_capacitacion_obligatoria_con_alcance_todas_y_por_tipo_RF_CAP_001_002', () => {
    component.abrirFormulario();
    expect(component.mostrarFormulario()).toBe(true);

    // 1. Alcance todas
    component.modelo.nombre = 'Curso General de Ética';
    component.modelo.institucionOrganizadora = 'ISTPET';
    component.modelo.tipoFuncionarioId = undefined;
    component.guardar();

    expect(configClientMock.crearCapacitacionObligatoria).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: 'Curso General de Ética',
        tipoFuncionarioId: undefined,
      }),
    );

    // 2. Alcance por tipo
    component.abrirFormulario();
    component.modelo.nombre = 'Pedagogía Digital';
    component.modelo.tipoFuncionarioId = 'tipo-1';
    component.guardar();

    expect(configClientMock.crearCapacitacionObligatoria).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: 'Pedagogía Digital',
        tipoFuncionarioId: 'tipo-1',
      }),
    );
  });

  it('muestra_error_cuando_servidor_rechaza_nombre_repetido_RF_CAP_001', () => {
    configClientMock.crearCapacitacionObligatoria.mockReturnValue(
      throwError(() => ({
        mensaje: "Ya existe una capacitación obligatoria con el nombre 'Seguridad en el Trabajo'.",
        status: 409,
      })),
    );

    component.abrirFormulario();
    component.modelo.nombre = 'Seguridad en el Trabajo';
    component.guardar();
    fixture.detectChanges();

    expect(component.error()).toContain('Ya existe una capacitación obligatoria');
    const alert = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="mensaje-error-obligatoria"]',
    );
    expect(alert).toBeTruthy();
    expect(alert?.textContent).toContain('Ya existe una capacitación obligatoria');
  });

  it('permite_desactivar_capacitacion_obligatoria_RF_CAP_003', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.desactivar('ob-1');

    expect(configClientMock.eliminarCapacitacionObligatoria).toHaveBeenCalledWith('ob-1');
  });

  it('resumen_de_cumplimiento_muestra_cifras_y_abre_modal_de_pendientes_RF_CAP_010', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const tablaCumplimiento = compiled.querySelector('[data-testid="tabla-cumplimiento"]');
    expect(tablaCumplimiento).toBeTruthy();
    expect(tablaCumplimiento?.textContent).toContain('Seguridad en el Trabajo');
    expect(tablaCumplimiento?.textContent).toContain('10'); // Total Aplica
    expect(tablaCumplimiento?.textContent).toContain('8'); // Cumplidas

    // Abrir modal de pendientes
    const btnVer = compiled.querySelector(
      '[data-testid="btn-ver-pendientes-ob-1"]',
    ) as HTMLButtonElement;
    expect(btnVer).toBeTruthy();
    btnVer.click();
    fixture.detectChanges();

    const modal = compiled.querySelector('[data-testid="modal-detalle-pendientes"]');
    expect(modal).toBeTruthy();
    expect(modal?.textContent).toContain('Docente Pendiente');
    expect(modal?.textContent).toContain('1700000010');

    // Cerrar modal
    component.cerrarModalPendientes();
    fixture.detectChanges();
    expect(compiled.querySelector('[data-testid="modal-detalle-pendientes"]')).toBeFalsy();
  });
});
