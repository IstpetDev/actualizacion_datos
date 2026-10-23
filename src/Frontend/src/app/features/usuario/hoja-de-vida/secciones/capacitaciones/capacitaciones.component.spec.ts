import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
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
});
