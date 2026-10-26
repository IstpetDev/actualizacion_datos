import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import {
  ArchivosClient,
  CapacitacionDto,
  CatalogosClient,
  CuentaBancariaClient,
  DocumentoRequeridoDto,
  EstadoEdicionDto,
  ExperienciaLaboralDto,
  FaltanteEnvioDto,
  FichaPersonalDto,
  HojaDeVidaDto,
  MarcaObservacionDto,
  ReferenciaDto,
  TituloAcademicoDto,
  TituloEnCursoDto,
} from '../../../api-client';
import { CatalogosCacheService } from './servicios/catalogos-cache.service';
import { HojaDeVidaStateService } from './servicios/hoja-de-vida-state.service';
import { HojaDeVidaComponent } from './hoja-de-vida.component';

describe('HojaDeVidaComponent', () => {
  let component: HojaDeVidaComponent;
  let fixture: ComponentFixture<HojaDeVidaComponent>;

  let stateMock: {
    cargarTodo: Mock;
    cargando: WritableSignal<boolean>;
    guardando: WritableSignal<boolean>;
    error: WritableSignal<string>;
    hojaDeVida: WritableSignal<HojaDeVidaDto | null>;
    ficha: WritableSignal<FichaPersonalDto | null>;
    estadoEdicion: WritableSignal<EstadoEdicionDto | null>;
    puedeEditar: WritableSignal<boolean>;
    esDevuelto: WritableSignal<boolean>;
    observacionGeneralDevolucion: WritableSignal<string | undefined>;
    marcasObservacion: WritableSignal<MarcaObservacionDto[]>;
    faltantes: WritableSignal<FaltanteEnvioDto[]>;
    titulos: WritableSignal<TituloAcademicoDto[]>;
    titulosEnCurso: WritableSignal<TituloEnCursoDto[]>;
    capacitaciones: WritableSignal<CapacitacionDto[]>;
    experiencias: WritableSignal<ExperienciaLaboralDto[]>;
    referencias: WritableSignal<ReferenciaDto[]>;
    documentosRequeridos: WritableSignal<DocumentoRequeridoDto[]>;
    obtenerFaltantes: Mock;
    enviarRevision: Mock;
    obtenerMarcaParaItem: Mock;
  };

  const mockHdv: HojaDeVidaDto = {
    personaId: 'per-1',
    documento: '1799999999',
    estadoActualizacion: 'Borrador',
    puedeEditar: true,
    ficha: undefined,
    titulos: [],
    titulosEnCurso: [],
    capacitaciones: [],
    experiencias: [],
    referencias: [],
  };

  beforeEach(async () => {
    stateMock = {
      cargarTodo: vi.fn().mockReturnValue(of({})),
      cargando: signal(false),
      guardando: signal(false),
      error: signal(''),
      hojaDeVida: signal(mockHdv),
      ficha: signal(null),
      estadoEdicion: signal<EstadoEdicionDto | null>({
        puedeEditar: true,
        estadoActualizacion: 'Borrador',
        mensaje: 'Campaña abierta',
        campanaActiva: undefined,
        puedeIniciarNuevaActualizacion: false,
      }),
      puedeEditar: signal(true),
      esDevuelto: signal(false),
      observacionGeneralDevolucion: signal(undefined),
      marcasObservacion: signal([]),
      faltantes: signal([]),
      titulos: signal([]),
      titulosEnCurso: signal([]),
      capacitaciones: signal([]),
      experiencias: signal([]),
      referencias: signal([]),
      documentosRequeridos: signal([]),
      obtenerFaltantes: vi.fn().mockReturnValue(of([])),
      enviarRevision: vi.fn().mockReturnValue(of({})),
      obtenerMarcaParaItem: vi.fn().mockReturnValue(undefined),
    };

    const catalogosCacheMock = {
      paises: vi.fn().mockReturnValue(of([])),
      provincias: vi.fn().mockReturnValue(of([])),
      cantones: vi.fn().mockReturnValue(of([])),
      parroquias: vi.fn().mockReturnValue(of([])),
      estadosCiviles: vi.fn().mockReturnValue(of([])),
      tiposSangre: vi.fn().mockReturnValue(of([])),
      etnias: vi.fn().mockReturnValue(of([])),
      discapacidades: vi.fn().mockReturnValue(of([])),
      nivelesAcademicos: vi.fn().mockReturnValue(of([])),
      gradosAcademicos: vi.fn().mockReturnValue(of([])),
      universidades: vi.fn().mockReturnValue(of([])),
      tiposCapacitacion: vi.fn().mockReturnValue(of([])),
      obtener: vi.fn().mockReturnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [HojaDeVidaComponent],
      providers: [
        { provide: HojaDeVidaStateService, useValue: stateMock },
        { provide: CatalogosCacheService, useValue: catalogosCacheMock },
        {
          provide: CuentaBancariaClient,
          useValue: { obtenerMiCuentaBancaria: vi.fn().mockReturnValue(of(null)) },
        },
        { provide: ArchivosClient, useValue: { subirArchivo: vi.fn() } },
        {
          provide: CatalogosClient,
          useValue: { consultarCatalogo: vi.fn().mockReturnValue(of([])) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HojaDeVidaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe_crearse_y_llamar_a_cargarTodo', () => {
    expect(component).toBeTruthy();
    expect(stateMock.cargarTodo).toHaveBeenCalledTimes(1);
    expect(component.tabActiva()).toBe('ficha');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-mi-cuenta-bancaria'),
    ).toBeTruthy();
  });

  it('permite_cambiar_entre_secciones_pestanas', () => {
    component.tabActiva.set('capacitaciones');
    fixture.detectChanges();
    expect(component.tabActiva()).toBe('capacitaciones');

    component.tabActiva.set('documentos');
    fixture.detectChanges();
    expect(component.tabActiva()).toBe('documentos');
  });

  it('muestra_banner_devuelto_cuando_estado_es_Devuelto', () => {
    stateMock.esDevuelto.set(true);
    stateMock.observacionGeneralDevolucion.set('Faltan certificados de experiencia.');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="banner-devuelto"]')).toBeTruthy();
    expect(compiled.textContent).toContain('Faltan certificados de experiencia.');
  });

  it('muestra_banner_de_solo_lectura_cuando_puedeEditar_es_false', () => {
    stateMock.puedeEditar.set(false);
    stateMock.esDevuelto.set(false);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="banner-solo-lectura"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="btn-enviar-revision"]')).toBeNull();
  });

  it('validarYEnviar_abre_modal_de_faltantes_si_existen_incompletos', () => {
    const mockFaltantes: FaltanteEnvioDto[] = [
      { seccion: 'Titulos', codigo: 'SIN_TITULO', mensaje: 'Debe registrar al menos un título.' },
    ];
    stateMock.obtenerFaltantes.mockReturnValue(of(mockFaltantes));

    component.validarYEnviar();

    expect(stateMock.obtenerFaltantes).toHaveBeenCalled();
    expect(component.mostrarModalFaltantes()).toBe(true);
    expect(stateMock.enviarRevision).not.toHaveBeenCalled();
  });

  it('validarYEnviar_invoca_enviarRevision_cuando_no_hay_faltantes_y_se_confirma', () => {
    stateMock.obtenerFaltantes.mockReturnValue(of([]));
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    component.validarYEnviar();

    expect(stateMock.obtenerFaltantes).toHaveBeenCalled();
    expect(stateMock.enviarRevision).toHaveBeenCalledTimes(1);
    expect(component.mostrarModalFaltantes()).toBe(false);
  });
});
