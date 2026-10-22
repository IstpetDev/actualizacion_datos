import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { ArchivosClient, ElementoCatalogoDto } from '../../../../../api-client';
import { CatalogosCacheService } from '../../servicios/catalogos-cache.service';
import { HojaDeVidaStateService } from '../../servicios/hoja-de-vida-state.service';
import { FormacionAcademicaComponent } from './formacion-academica.component';

describe('FormacionAcademicaComponent', () => {
  let component: FormacionAcademicaComponent;
  let fixture: ComponentFixture<FormacionAcademicaComponent>;

  let stateMock: {
    puedeEditar: ReturnType<typeof vi.fn>;
    guardando: ReturnType<typeof vi.fn>;
    titulos: ReturnType<typeof vi.fn>;
    titulosEnCurso: ReturnType<typeof vi.fn>;
    guardarTitulo: Mock;
    eliminarTitulo: Mock;
    guardarTituloEnCurso: Mock;
    eliminarTituloEnCurso: Mock;
    obtenerMarcaParaItem: Mock;
  };

  let catalogosMock: {
    nivelesAcademicos: Mock;
    gradosAcademicos: Mock;
    universidades: Mock;
    obtener: Mock;
  };

  const mockNiveles: ElementoCatalogoDto[] = [
    {
      id: 1,
      tipo: 1,
      codigo: 'TER',
      nombre: 'Tercer Nivel',
      padreId: undefined,
      codigoExterno: undefined,
      orden: 1,
    },
  ];

  const mockGrados: ElementoCatalogoDto[] = [
    {
      id: 10,
      tipo: 2,
      codigo: 'LIC',
      nombre: 'Licenciatura',
      padreId: 1,
      codigoExterno: undefined,
      orden: 1,
    },
  ];

  const mockUniversidades: ElementoCatalogoDto[] = [
    {
      id: 100,
      tipo: 5,
      codigo: 'UCE',
      nombre: 'Universidad Central del Ecuador',
      padreId: undefined,
      codigoExterno: undefined,
      orden: 1,
    },
  ];

  beforeEach(async () => {
    stateMock = {
      puedeEditar: vi.fn().mockReturnValue(true),
      guardando: vi.fn().mockReturnValue(false),
      titulos: vi.fn().mockReturnValue([]),
      titulosEnCurso: vi.fn().mockReturnValue([]),
      guardarTitulo: vi.fn().mockReturnValue(of({})),
      eliminarTitulo: vi.fn().mockReturnValue(of({})),
      guardarTituloEnCurso: vi.fn().mockReturnValue(of({})),
      eliminarTituloEnCurso: vi.fn().mockReturnValue(of({})),
      obtenerMarcaParaItem: vi.fn().mockReturnValue(undefined),
    };

    catalogosMock = {
      nivelesAcademicos: vi.fn().mockReturnValue(of(mockNiveles)),
      gradosAcademicos: vi.fn().mockReturnValue(of(mockGrados)),
      universidades: vi.fn().mockReturnValue(of(mockUniversidades)),
      obtener: vi.fn().mockReturnValue(of(mockGrados)),
    };

    await TestBed.configureTestingModule({
      imports: [FormacionAcademicaComponent],
      providers: [
        { provide: HojaDeVidaStateService, useValue: stateMock },
        { provide: CatalogosCacheService, useValue: catalogosMock },
        { provide: ArchivosClient, useValue: { subirArchivo: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FormacionAcademicaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe_crearse_correctamente', () => {
    expect(component).toBeTruthy();
    expect(component.nivelesAcademicos()).toEqual(mockNiveles);
    expect(component.universidades()).toEqual(mockUniversidades);
  });

  it('cascada_academica_cambiar_nivel_carga_grados', () => {
    component.onNivelChange(1);

    expect(catalogosMock.gradosAcademicos).toHaveBeenCalledWith(1);
    expect(component.gradosAcademicos()).toEqual(mockGrados);
    expect(component.modeloTitulo.gradoAcademicoId).toBe(0);
  });

  it('valida_campos_obligatorios_al_guardar_titulo', () => {
    component.abrirFormTitulo();
    component.guardarTitulo();
    expect(component.errorFormulario()).toContain('El nombre del título es obligatorio');

    component.modeloTitulo.nombreTitulo = 'Licenciado en Sistemas';
    component.guardarTitulo();
    expect(component.errorFormulario()).toContain('Debe seleccionar el grado académico');

    component.modeloTitulo.gradoAcademicoId = 10;
    component.guardarTitulo();
    expect(component.errorFormulario()).toContain(
      'Debe indicar la universidad del catálogo o el nombre de otra institución',
    );
  });

  it('guarda_titulo_exitosamente_cuando_datos_son_validos', () => {
    component.abrirFormTitulo();
    component.modeloTitulo = {
      nombreTitulo: 'Ingeniero en Software',
      gradoAcademicoId: 10,
      universidadId: 100,
      nombreInstitucionOtra: undefined,
      numeroRegistroSenescyt: '1005-2020-999999',
      fechaObtencion: new Date('2020-05-15'),
      archivoId: 'arch-123',
    };

    component.guardarTitulo();

    expect(stateMock.guardarTitulo).toHaveBeenCalledWith(
      expect.objectContaining({
        nombreTitulo: 'Ingeniero en Software',
        gradoAcademicoId: 10,
      }),
      undefined,
    );
    expect(component.mostrarFormTitulo()).toBe(false);
  });

  it('toggle_beca_limpia_porcentaje_y_monto_al_desactivarse', () => {
    component.abrirFormEnCurso();
    component.tieneBeca = true;
    component.modeloEnCurso.porcentajeBeca = 50;
    component.modeloEnCurso.montoBeca = 2500;

    component.onBecaToggle(false);

    expect(component.tieneBeca).toBe(false);
    expect(component.modeloEnCurso.porcentajeBeca).toBeUndefined();
    expect(component.modeloEnCurso.montoBeca).toBeUndefined();
  });

  it('guarda_estudio_en_curso_exitosamente', () => {
    component.abrirFormEnCurso();
    component.modeloEnCurso = {
      nombrePrograma: 'Maestría en Ciberseguridad',
      gradoAcademicoId: 10,
      nombreInstitucionOtra: 'Universidad Politécnica',
      porcentajeBeca: 100,
      montoBeca: 5000,
      archivoId: 'arch-456',
    };

    component.guardarEnCurso();

    expect(stateMock.guardarTituloEnCurso).toHaveBeenCalledWith(
      expect.objectContaining({
        nombrePrograma: 'Maestría en Ciberseguridad',
        gradoAcademicoId: 10,
      }),
      undefined,
    );
    expect(component.mostrarFormEnCurso()).toBe(false);
  });

  it('eliminar_titulo_y_estudio_en_curso_confirmados', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    component.eliminarTitulo('tit-1');
    expect(stateMock.eliminarTitulo).toHaveBeenCalledWith('tit-1');

    component.eliminarEnCurso('enc-1');
    expect(stateMock.eliminarTituloEnCurso).toHaveBeenCalledWith('enc-1');
  });
});
