import politicaPrueba from '../../servicios/politica-validacion.fixture.json';
import { ConfiguracionClient } from '../../../../../api-client';
import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { ArchivosClient, CapacitacionDto, ElementoCatalogoDto } from '../../../../../api-client';
import { CatalogosCacheService } from '../../servicios/catalogos-cache.service';
import { HojaDeVidaStateService } from '../../servicios/hoja-de-vida-state.service';
import { CapacitacionesComponent } from './capacitaciones.component';

describe('CapacitacionesComponent', () => {
  let component: CapacitacionesComponent;
  let fixture: ComponentFixture<CapacitacionesComponent>;

  let stateMock: {
    puedeEditar: WritableSignal<boolean>;
    guardando: WritableSignal<boolean>;
    capacitaciones: WritableSignal<CapacitacionDto[]>;
    guardarCapacitacion: Mock;
    eliminarCapacitacion: Mock;
    obtenerMarcaParaItem: Mock;
  };

  let catalogosMock: {
    tiposCapacitacion: Mock;
  };

  const mockTipos: ElementoCatalogoDto[] = [
    {
      id: 1,
      tipo: 10,
      codigo: 'CUR',
      nombre: 'Curso',
      padreId: undefined,
      codigoExterno: undefined,
      orden: 1,
    },
  ];

  const mockCapacitacion: CapacitacionDto = {
    id: 'cap-1',
    nombreEvento: 'Curso de Ciberseguridad',
    institucionOrganizadora: 'MinTel',
    tipoCapacitacionId: 1,
    tipoParticipacion: 'Aprobado',
    fechaInicio: new Date('2024-01-10'),
    fechaFin: new Date('2024-01-20'),
    numeroHoras: 40,
    lugar: 'Quito',
    financiadaPorInstitucion: false,
    archivoId: 'arch-10',
    fechaActualizacionUtc: new Date(),
  };

  beforeEach(async () => {
    stateMock = {
      puedeEditar: signal(true),
      guardando: signal(false),
      capacitaciones: signal([mockCapacitacion]),
      guardarCapacitacion: vi.fn().mockReturnValue(of({})),
      eliminarCapacitacion: vi.fn().mockReturnValue(of({})),
      obtenerMarcaParaItem: vi.fn().mockReturnValue(undefined),
    };

    catalogosMock = {
      tiposCapacitacion: vi.fn().mockReturnValue(of(mockTipos)),
    };

    await TestBed.configureTestingModule({
      imports: [CapacitacionesComponent],
      providers: [
        {
          provide: ConfiguracionClient,
          useValue: { obtenerPoliticaValidacion: () => of(politicaPrueba) },
        },
        { provide: HojaDeVidaStateService, useValue: stateMock },
        { provide: CatalogosCacheService, useValue: catalogosMock },
        { provide: ArchivosClient, useValue: { subirArchivo: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CapacitacionesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe_crearse_correctamente_y_cargar_catalogo', () => {
    expect(component).toBeTruthy();
    expect(component.tiposCapacitacion()).toEqual(mockTipos);
  });

  it('valida_campos_obligatorios_al_guardar', () => {
    component.abrirFormulario();
    component.guardar();
    expect(component.errorFormulario()).toContain('El nombre del evento');

    component.modelo.nombreEvento = 'Taller de Innovación';
    component.guardar();
    expect(component.errorFormulario()).toContain('La institución organizadora');
  });

  it('guarda_capacitacion_exitosamente_cuando_datos_son_validos', () => {
    component.abrirFormulario();
    component.modelo = {
      nombreEvento: 'Taller de Innovación',
      institucionOrganizadora: 'ISTPET',
      tipoCapacitacionId: 1,
      tipoParticipacion: 'Asistente',
      fechaInicio: undefined,
      fechaFin: undefined,
      numeroHoras: 20,
      lugar: 'Virtual',
      financiadaPorInstitucion: false,
      archivoId: 'arch-99',
    };

    component.guardar();

    expect(stateMock.guardarCapacitacion).toHaveBeenCalledWith(
      expect.objectContaining({
        nombreEvento: 'Taller de Innovación',
        institucionOrganizadora: 'ISTPET',
      }),
      undefined,
    );
    expect(component.mostrarFormulario()).toBe(false);
  });

  it('editar_capacitacion_inicializa_formulario_con_datos_existentes', () => {
    component.editar(mockCapacitacion);

    expect(component.mostrarFormulario()).toBe(true);
    expect(component.idEdicion()).toBe('cap-1');
    expect(component.modelo.nombreEvento).toBe('Curso de Ciberseguridad');
    expect(component.modelo.institucionOrganizadora).toBe('MinTel');
    expect(component.fechaInicioStr).toBe('2024-01-10');
  });

  it('eliminar_capacitacion_invoca_state_al_confirmar', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    component.eliminar('cap-1');
    expect(stateMock.eliminarCapacitacion).toHaveBeenCalledWith('cap-1');
  });

  it('oculta_botones_de_accion_en_modo_solo_lectura', () => {
    stateMock.puedeEditar.set(false);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="btn-nueva-capacitacion"]')).toBeNull();
    expect(compiled.querySelector('[data-testid="btn-editar-capacitacion"]')).toBeNull();
    expect(compiled.querySelector('[data-testid="btn-eliminar-capacitacion"]')).toBeNull();
  });
  it('rechaza_guardado_si_fecha_fin_es_anterior_a_fecha_inicio', () => {
    component.abrirFormulario();
    component.modelo.nombreEvento = 'Taller de Liderazgo';
    component.modelo.institucionOrganizadora = 'ISTPET';
    component.onFechaInicioChange('2024-05-10');
    component.onFechaFinChange('2024-05-01');

    component.guardar();

    expect(component.errorFormulario()).toBe(
      'La fecha de fin no puede ser anterior a la fecha de inicio.',
    );
    expect(stateMock.guardarCapacitacion).not.toHaveBeenCalled();
  });

  it('muestra_mensaje_del_servidor_cuando_falla_guardado', () => {
    stateMock.guardarCapacitacion.mockReturnValue(
      throwError(() => ({
        mensaje: 'La fecha de fin no puede ser anterior a la fecha de inicio.',
        codigo: 'REGLA_NEGOCIO',
      })),
    );

    component.abrirFormulario();
    component.modelo.nombreEvento = 'Taller de Liderazgo';
    component.modelo.institucionOrganizadora = 'ISTPET';
    component.guardar();
    fixture.detectChanges();

    expect(component.errorFormulario()).toBe(
      'La fecha de fin no puede ser anterior a la fecha de inicio.',
    );
    const alerta = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alerta).toBeTruthy();
    expect(alerta.textContent).toContain(
      'La fecha de fin no puede ser anterior a la fecha de inicio.',
    );
  });

  it('muestra_error_de_formato_y_bloquea_guardar_hasta_corregir', async () => {
    component.abrirFormulario();
    component.modelo.numeroHoras = 0;
    fixture.detectChanges();
    const boton = fixture.nativeElement.querySelector(
      '[data-testid="btn-guardar-capacitacion"]',
    ) as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelector('#error-modelo-numeroHoras').textContent.trim().length,
    ).toBeGreaterThan(5);
    component.modelo.numeroHoras = 24;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(boton.disabled).toBe(false);
  });
});
