import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import {
  ArchivosClient,
  ElementoCatalogoDto,
  ExperienciaLaboralDto,
} from '../../../../../api-client';
import { CatalogosCacheService } from '../../servicios/catalogos-cache.service';
import { HojaDeVidaStateService } from '../../servicios/hoja-de-vida-state.service';
import { ExperienciaLaboralComponent } from './experiencia-laboral.component';

describe('ExperienciaLaboralComponent', () => {
  let component: ExperienciaLaboralComponent;
  let fixture: ComponentFixture<ExperienciaLaboralComponent>;

  let stateMock: {
    puedeEditar: WritableSignal<boolean>;
    guardando: WritableSignal<boolean>;
    experiencias: WritableSignal<ExperienciaLaboralDto[]>;
    guardarExperiencia: Mock;
    eliminarExperiencia: Mock;
    obtenerMarcaParaItem: Mock;
  };

  let catalogosMock: {
    paises: Mock;
  };

  const mockPaises: ElementoCatalogoDto[] = [
    {
      id: 601,
      tipo: 1,
      codigo: 'EC',
      nombre: 'Ecuador',
      padreId: undefined,
      codigoExterno: undefined,
      orden: 1,
    },
  ];

  const mockExperiencia: ExperienciaLaboralDto = {
    id: 'exp-1',
    empleador: 'Tecnológico Central',
    cargo: 'Docente Investigador',
    fechaInicio: new Date('2022-03-01'),
    fechaFin: undefined,
    trabajaActualmente: true,
    ciudad: 'Quito',
    paisId: 601,
    funciones: 'Dictar cátedra y coordinar proyectos',
    archivoId: 'arch-mecanizado',
    fechaActualizacionUtc: new Date(),
  };

  beforeEach(async () => {
    stateMock = {
      puedeEditar: signal(true),
      guardando: signal(false),
      experiencias: signal([mockExperiencia]),
      guardarExperiencia: vi.fn().mockReturnValue(of({})),
      eliminarExperiencia: vi.fn().mockReturnValue(of({})),
      obtenerMarcaParaItem: vi.fn().mockReturnValue(undefined),
    };

    catalogosMock = {
      paises: vi.fn().mockReturnValue(of(mockPaises)),
    };

    await TestBed.configureTestingModule({
      imports: [ExperienciaLaboralComponent],
      providers: [
        { provide: HojaDeVidaStateService, useValue: stateMock },
        { provide: CatalogosCacheService, useValue: catalogosMock },
        { provide: ArchivosClient, useValue: { subirArchivo: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExperienciaLaboralComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe_crearse_correctamente_y_cargar_paises', () => {
    expect(component).toBeTruthy();
    expect(component.paises()).toEqual(mockPaises);
  });

  it('trabaja_actualmente_limpia_y_anula_fecha_fin', () => {
    component.abrirFormulario();
    component.fechaFinStr = '2023-12-31';
    component.modelo.fechaFin = new Date('2023-12-31');

    component.onTrabajaActualmenteChange(true);

    expect(component.fechaFinStr).toBe('');
    expect(component.modelo.fechaFin).toBeUndefined();
  });

  it('valida_campos_obligatorios_al_guardar', () => {
    component.abrirFormulario();
    component.guardar();
    expect(component.errorFormulario()).toContain('El nombre de la empresa');

    component.modelo.empleador = 'Empresa XYZ';
    component.guardar();
    expect(component.errorFormulario()).toContain('El cargo desempeñado');

    component.modelo.cargo = 'Analista';
    component.guardar();
    expect(component.errorFormulario()).toContain('La fecha de inicio');
  });

  it('guarda_experiencia_exitosamente_cuando_datos_son_validos', () => {
    component.abrirFormulario();
    component.modelo = {
      empleador: 'Empresa XYZ',
      cargo: 'Analista de Sistemas',
      fechaInicio: new Date('2021-01-01'),
      fechaFin: new Date('2022-12-31'),
      trabajaActualmente: false,
      ciudad: 'Guayaquil',
      paisId: 601,
      funciones: 'Mantenimiento de bases de datos',
      archivoId: 'arch-cert',
    };
    component.fechaInicioStr = '2021-01-01';

    component.guardar();

    expect(stateMock.guardarExperiencia).toHaveBeenCalledWith(
      expect.objectContaining({
        empleador: 'Empresa XYZ',
        cargo: 'Analista de Sistemas',
      }),
      undefined,
    );
    expect(component.mostrarFormulario()).toBe(false);
  });

  it('editar_experiencia_carga_datos_en_formulario', () => {
    component.editar(mockExperiencia);

    expect(component.mostrarFormulario()).toBe(true);
    expect(component.idEdicion()).toBe('exp-1');
    expect(component.modelo.empleador).toBe('Tecnológico Central');
    expect(component.modelo.trabajaActualmente).toBe(true);
    expect(component.fechaInicioStr).toBe('2022-03-01');
  });

  it('eliminar_experiencia_invoca_state_al_confirmar', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    component.eliminar('exp-1');
    expect(stateMock.eliminarExperiencia).toHaveBeenCalledWith('exp-1');
  });

  it('oculta_acciones_en_modo_solo_lectura', () => {
    stateMock.puedeEditar.set(false);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="btn-nueva-experiencia"]')).toBeNull();
    expect(compiled.querySelector('[data-testid="btn-editar-experiencia"]')).toBeNull();
    expect(compiled.querySelector('[data-testid="btn-eliminar-experiencia"]')).toBeNull();
  });
});
