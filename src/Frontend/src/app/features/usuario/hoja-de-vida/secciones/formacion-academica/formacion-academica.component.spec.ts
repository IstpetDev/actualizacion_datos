import politicaPrueba from '../../servicios/politica-validacion.fixture.json';
import {
  ConfiguracionClient,
  EstadoSubindiceSeccionPersonaDto,
  TituloAcademicoDto,
  TituloEnCursoDto,
} from '../../../../../api-client';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { ArchivosClient, ElementoCatalogoDto } from '../../../../../api-client';
import { CatalogosCacheService } from '../../servicios/catalogos-cache.service';
import { HojaDeVidaStateService } from '../../servicios/hoja-de-vida-state.service';
import { FormacionAcademicaComponent } from './formacion-academica.component';

describe('FormacionAcademicaComponent', () => {
  let component: FormacionAcademicaComponent;
  let fixture: ComponentFixture<FormacionAcademicaComponent>;
  let subindicesSignal: WritableSignal<EstadoSubindiceSeccionPersonaDto[]>;
  let titulosSignal: WritableSignal<TituloAcademicoDto[]>;
  let titulosEnCursoSignal: WritableSignal<TituloEnCursoDto[]>;

  let stateMock: {
    puedeEditar: ReturnType<typeof vi.fn>;
    guardando: ReturnType<typeof vi.fn>;
    titulos: WritableSignal<TituloAcademicoDto[]>;
    titulosEnCurso: WritableSignal<TituloEnCursoDto[]>;
    subindicesSeccion: WritableSignal<EstadoSubindiceSeccionPersonaDto[]>;
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
    subindicesSignal = signal<EstadoSubindiceSeccionPersonaDto[]>([]);
    titulosSignal = signal<TituloAcademicoDto[]>([]);
    titulosEnCursoSignal = signal<TituloEnCursoDto[]>([]);
    stateMock = {
      puedeEditar: vi.fn().mockReturnValue(true),
      guardando: vi.fn().mockReturnValue(false),
      titulos: titulosSignal,
      titulosEnCurso: titulosEnCursoSignal,
      subindicesSeccion: subindicesSignal,
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
        {
          provide: ConfiguracionClient,
          useValue: { obtenerPoliticaValidacion: () => of(politicaPrueba) },
        },
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
  it('filtra campos UNESCO por padre y limpia el detalle al cambiar la selección', () => {
    component.camposEspecificos.set([
      {
        id: 20,
        tipo: 13,
        codigo: 'A.1',
        nombre: 'Específico ficticio A',
        padreId: 10,
        codigoExterno: undefined,
        orden: 1,
      },
      {
        id: 21,
        tipo: 13,
        codigo: 'B.1',
        nombre: 'Específico ficticio B',
        padreId: 11,
        codigoExterno: undefined,
        orden: 2,
      },
    ]);
    component.camposDetallados.set([
      {
        id: 30,
        tipo: 14,
        codigo: 'A.1.1',
        nombre: 'Detalle ficticio',
        padreId: 20,
        codigoExterno: undefined,
        orden: 1,
      },
    ]);
    component.cambiarCampoAmplio(10);
    expect(component.especificosDisponibles().map((campo) => campo.id)).toEqual([20]);
    component.cambiarCampoEspecifico(20);
    expect(component.detalladosDisponibles().map((campo) => campo.id)).toEqual([30]);
    component.modeloTitulo.campoDetalladoUnescoId = 30;
    component.cambiarCampoAmplio(11);
    expect(component.modeloTitulo.campoDetalladoUnescoId).toBeUndefined();
    expect(component.campoEspecificoId).toBeUndefined();
  });

  it('conserva beca y financiamiento al editar y los limpia al desmarcar', () => {
    component.subtabActiva.set('en-curso');
    component.editarEnCurso({
      id: 'estudio-ficticio',
      universidadId: undefined,
      campoDetalladoUnescoId: undefined,
      fechaInicio: undefined,
      fechaFinEstimada: undefined,
      montoBeca: undefined,
      archivoId: undefined,
      nombrePrograma: 'Programa ficticio',
      gradoAcademicoId: 1,
      nombreInstitucionOtra: 'Institución ficticia',
      tieneBeca: true,
      tipoBecaId: 40,
      financiamientoBecaId: 50,
      porcentajeBeca: 50,
      fechaActualizacionUtc: new Date(),
    });
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[data-testid="select-tipo-beca"]'),
    ).toBeTruthy();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="select-financiamiento-beca"]',
      ),
    ).toBeTruthy();
    expect(component.modeloEnCurso.tipoBecaId).toBe(40);
    expect(component.modeloEnCurso.financiamientoBecaId).toBe(50);
    expect(component.modeloEnCurso.tieneBeca).toBe(true);
    component.onBecaToggle(false);
    expect(component.modeloEnCurso.tieneBeca).toBe(false);
    expect(component.modeloEnCurso.tipoBecaId).toBeUndefined();
    expect(component.modeloEnCurso.financiamientoBecaId).toBeUndefined();
  });
  it('bloquea_cambio_de_subpestana_si_hay_datos_sin_guardar_en_formulario', () => {
    component.abrirFormTitulo();
    component.modeloTitulo.nombreTitulo = 'Maestría en Computación';
    fixture.detectChanges();

    expect(component.tieneCambios()).toBe(true);

    component.intentarCambiarSubtab('en-curso');
    fixture.detectChanges();

    expect(component.subtabActiva()).toBe('obtenidos');
    expect(component.mostrarModalSubtab()).toBe(true);
  });

  it('descartar_cambios_de_subpestana_limpia_formulario_y_cambia_de_subpestana', () => {
    component.abrirFormTitulo();
    component.modeloTitulo.nombreTitulo = 'Maestría en Computación';
    component.intentarCambiarSubtab('en-curso');
    expect(component.mostrarModalSubtab()).toBe(true);

    component.descartarYCambiarSubtab();
    fixture.detectChanges();

    expect(component.mostrarModalSubtab()).toBe(false);
    expect(component.mostrarFormTitulo()).toBe(false);
    expect(component.subtabActiva()).toBe('en-curso');
  });

  it('abre_formulario_modo_senescyt_y_permite_guardar_solo_con_documento', () => {
    // Configurar subíndices de la institución con Registro SENESCYT
    const subSenescyt: EstadoSubindiceSeccionPersonaDto = {
      id: 'sub-senescyt-1',
      seccion: 'formacion',
      nombre: 'Registro SENESCYT',
      descripcion: 'Subir certificado SENESCYT',
      tipoFuncionarioId: undefined,
      esObligatorio: true,
      orden: 1,
      activo: true,
      estado: 'pendiente',
    };
    subindicesSignal.set([subSenescyt]);

    // Abrir específicamente para SENESCYT
    component.abrirParaSubindice(subSenescyt);
    fixture.detectChanges();

    expect(component.mostrarFormTitulo()).toBe(true);
    expect(component.esSubindiceSenescyt()).toBe(true);
    expect(component.modeloTitulo.nombreTitulo).toBe('Certificado de Registro SENESCYT');
    expect(component.modeloTitulo.nombreInstitucionOtra).toBe('SENESCYT');
    expect(component.modeloTitulo.gradoAcademicoId).toBeGreaterThan(0);

    // Si no tiene archivoId, debe rechazar el guardado
    component.guardarTitulo();
    expect(component.errorFormulario()).toContain('Debe adjuntar el archivo PDF');

    // Con archivoId cargado, se guarda exitosamente
    component.modeloTitulo.archivoId = 'arch-senescyt-pdf-uuid';
    component.guardarTitulo();

    expect(stateMock.guardarTitulo).toHaveBeenCalledWith(
      expect.objectContaining({
        nombreTitulo: 'Certificado de Registro SENESCYT',
        nombreInstitucionOtra: 'SENESCYT',
        archivoId: 'arch-senescyt-pdf-uuid',
        subindiceSeccionId: 'sub-senescyt-1',
      }),
      undefined,
    );
    expect(component.mostrarFormTitulo()).toBe(false);
  });

  it('abrirParaSubindice_autoselecciona_modo_segun_nombre_de_subindice', () => {
    const sub3er: EstadoSubindiceSeccionPersonaDto = {
      id: 'sub-3er-nivel',
      seccion: 'formacion',
      nombre: 'Título 3er nivel',
      descripcion: undefined,
      tipoFuncionarioId: undefined,
      esObligatorio: false,
      orden: 1,
      activo: true,
      estado: 'pendiente',
    };
    subindicesSignal.set([sub3er]);

    component.abrirParaSubindice(sub3er);
    fixture.detectChanges();

    expect(component.mostrarFormTitulo()).toBe(true);
    expect(component.esSubindiceSenescyt()).toBe(false);
    expect(component.modeloTitulo.subindiceSeccionId).toBe('sub-3er-nivel');
    // Verifica que intentó autoseleccionar Tercer Nivel (id 1)
    expect(catalogosMock.gradosAcademicos).toHaveBeenCalledWith(1);
  });

  it('permite_registrar_y_contabilizar_multiples_titulos_de_tercer_nivel', () => {
    const sub3erId = 'sub-3er-nivel-id';
    titulosSignal.set([
      {
        id: 't-1',
        nombreTitulo: 'Licenciado en Educación',
        gradoAcademicoId: 10,
        universidadId: 100,
        nombreInstitucionOtra: undefined,
        campoDetalladoUnescoId: undefined,
        numeroRegistroSenescyt: undefined,
        fechaObtencion: undefined,
        fechaRegistroSenescyt: undefined,
        archivoId: 'arch-1',
        subindiceSeccionId: sub3erId,
        fechaActualizacionUtc: new Date(),
      },
      {
        id: 't-2',
        nombreTitulo: 'Ingeniero en Computación',
        gradoAcademicoId: 10,
        universidadId: 100,
        nombreInstitucionOtra: undefined,
        campoDetalladoUnescoId: undefined,
        numeroRegistroSenescyt: undefined,
        fechaObtencion: undefined,
        fechaRegistroSenescyt: undefined,
        archivoId: 'arch-2',
        subindiceSeccionId: sub3erId,
        fechaActualizacionUtc: new Date(),
      },
    ]);
    fixture.detectChanges();

    const conteos = component.conteosPorSubindice();
    expect(conteos[sub3erId]).toBe(2);
    expect(component.idsSubindicesCumplidos().has(sub3erId)).toBe(true);
  });

  it('actualiza_y_restaura_fechaRegistroSenescyt', () => {
    component.abrirFormTitulo();
    component.onFechaRegistroSenescytChange('2022-08-15');
    expect(component.fechaRegistroSenescytStr).toBe('2022-08-15');
    expect(component.modeloTitulo.fechaRegistroSenescyt).toBeDefined();

    // Al editar un título con fechaRegistroSenescyt
    const tituloConFecha = {
      id: 't-edit',
      nombreTitulo: 'Abogado',
      gradoAcademicoId: 10,
      universidadId: 100,
      nombreInstitucionOtra: undefined,
      campoDetalladoUnescoId: undefined,
      numeroRegistroSenescyt: '1005-2022-888888',
      fechaObtencion: undefined,
      fechaRegistroSenescyt: new Date('2022-08-15T00:00:00Z'),
      archivoId: 'arch-edit',
      fechaActualizacionUtc: new Date(),
    };

    component.editarTitulo(tituloConFecha);
    expect(component.fechaRegistroSenescytStr).toBe('2022-08-15');
    expect(component.modeloTitulo.numeroRegistroSenescyt).toBe('1005-2022-888888');
  });

  it('muestra_aviso_informativo_diferenciando_copia_de_titulo_de_certificado_senescyt', () => {
    component.abrirFormTitulo();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const avisoTitulo = compiled.querySelector('[data-testid="aviso-respaldo-titulo"]');
    expect(avisoTitulo).toBeTruthy();
    expect(avisoTitulo?.textContent).toContain('Copia del Título Académico o Acta de Grado');
    expect(avisoTitulo?.textContent).toContain(
      'No adjunte aquí el Certificado de Registro de la SENESCYT',
    );
  });
});
