import { observacionesFicticias } from '../../revision-compartida/observaciones-revision.fixture';
import politicaPrueba from './servicios/politica-validacion.fixture.json';
import { ConfiguracionClient } from '../../../api-client';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
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
  EstadoCapacitacionObligatoriaPersonaDto,
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
import { SeccionConCambios } from './servicios/seccion-con-cambios';
import { HojaDeVidaStateService } from './servicios/hoja-de-vida-state.service';
import { AuthService } from '../../../core/auth/auth.service';
import { HojaDeVidaComponent } from './hoja-de-vida.component';

describe('HojaDeVidaComponent', () => {
  let component: HojaDeVidaComponent;
  let fixture: ComponentFixture<HojaDeVidaComponent>;
  let httpTestingController: HttpTestingController;
  let authServiceMock: {
    tieneRol: Mock;
    rolActual: WritableSignal<string>;
  };

  let stateMock: {
    cargarTodo: Mock;
    cargando: WritableSignal<boolean>;
    guardando: WritableSignal<boolean>;
    error: WritableSignal<string>;
    mensajeExito: WritableSignal<string>;
    hojaDeVida: WritableSignal<HojaDeVidaDto | null>;
    ficha: WritableSignal<FichaPersonalDto | null>;
    estadoEdicion: WritableSignal<EstadoEdicionDto | null>;
    puedeEditar: WritableSignal<boolean>;
    esDevuelto: WritableSignal<boolean>;
    observacionGeneralDevolucion: WritableSignal<string | undefined>;
    marcasObservacion: WritableSignal<MarcaObservacionDto[]>;
    observaciones: WritableSignal<import('../../../api-client').ObservacionDto[]>;
    faltantes: WritableSignal<FaltanteEnvioDto[]>;
    titulos: WritableSignal<TituloAcademicoDto[]>;
    titulosEnCurso: WritableSignal<TituloEnCursoDto[]>;
    capacitaciones: WritableSignal<CapacitacionDto[]>;
    capacitacionesObligatorias?: WritableSignal<EstadoCapacitacionObligatoriaPersonaDto[]>;
    experiencias: WritableSignal<ExperienciaLaboralDto[]>;
    referencias: WritableSignal<ReferenciaDto[]>;
    documentosRequeridos: WritableSignal<DocumentoRequeridoDto[]>;
    obtenerFaltantes: Mock;
    enviarRevision: Mock;
    obtenerMarcaParaItem: Mock;
    tieneCambiosSinGuardarSignal: WritableSignal<boolean>;
    tieneCambiosSinGuardar: Mock;
    seccionActiva: WritableSignal<SeccionConCambios | null>;
    registrarSeccion: Mock;
    desregistrarSeccion: Mock;
    actualizarEstadoCambios: Mock;
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
      mensajeExito: signal(''),
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
      observaciones: signal([]),
      faltantes: signal([]),
      titulos: signal([]),
      titulosEnCurso: signal([]),
      capacitaciones: signal([]),
      capacitacionesObligatorias: signal([]),
      experiencias: signal([]),
      referencias: signal([]),
      documentosRequeridos: signal([]),
      obtenerFaltantes: vi.fn().mockReturnValue(of([])),
      enviarRevision: vi.fn().mockReturnValue(of({})),
      obtenerMarcaParaItem: vi.fn().mockReturnValue(undefined),
      tieneCambiosSinGuardarSignal: signal(false),
      tieneCambiosSinGuardar: vi.fn().mockReturnValue(false),
      seccionActiva: signal<SeccionConCambios | null>(null),
      registrarSeccion: vi.fn(),
      desregistrarSeccion: vi.fn(),
      actualizarEstadoCambios: vi.fn(),
    };

    const rolActualSignal = signal('usuario');
    authServiceMock = {
      tieneRol: vi.fn().mockImplementation((roles: string | string[]) => {
        const rol = rolActualSignal();
        const lista = Array.isArray(roles) ? roles : [roles];
        return lista.includes(rol);
      }),
      rolActual: rolActualSignal,
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
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ConfiguracionClient,
          useValue: { obtenerPoliticaValidacion: () => of(politicaPrueba) },
        },
        { provide: AuthService, useValue: authServiceMock },
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

    httpTestingController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(HojaDeVidaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('mantiene el historial visible al pasar de Devuelto a Enviado', () => {
    stateMock.observaciones.set(observacionesFicticias);
    stateMock.esDevuelto.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Indicación general ficticia 2');
    stateMock.esDevuelto.set(false);
    stateMock.hojaDeVida.set({ ...mockHdv, estadoActualizacion: 'Enviado', puedeEditar: false });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Corregir ficha ficticia 1');
    expect(fixture.nativeElement.textContent).toContain('Estado del expediente: Enviado');
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

  it('hayErrores_no_bloquea_envio_si_los_errores_pertenecen_a_modulos_deshabilitados', () => {
    stateMock.hojaDeVida.set({
      ...mockHdv,
      seccionesAbiertas: ['ficha'],
    });
    fixture.detectChanges();

    const destruccionMock = { onDestroy: vi.fn() } as unknown as import('@angular/core').DestroyRef;

    // Registrar formulario de módulo deshabilitado con errores (ej. formación)
    component.validacion.registrarFormulario('formacion-academica', () => true, destruccionMock);
    fixture.detectChanges();

    // Como formación está deshabilitada, hayErrores debe ser false y el botón debe permitir enviar
    expect(component.hayErrores()).toBe(false);

    stateMock.obtenerFaltantes.mockReturnValue(of([]));
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    component.validarYEnviar();
    expect(stateMock.obtenerFaltantes).toHaveBeenCalled();
  });

  it('hayErrores_bloquea_envio_si_el_modulo_abierto_tiene_errores', () => {
    stateMock.hojaDeVida.set({
      ...mockHdv,
      seccionesAbiertas: ['ficha'],
    });
    fixture.detectChanges();

    const destruccionMock = { onDestroy: vi.fn() } as unknown as import('@angular/core').DestroyRef;

    // Registrar formulario de módulo habilitado con error (ficha-personal)
    component.validacion.registrarFormulario('ficha-personal', () => true, destruccionMock);
    fixture.detectChanges();

    expect(component.hayErrores()).toBe(true);

    component.validarYEnviar();
    expect(stateMock.obtenerFaltantes).not.toHaveBeenCalled();
  });
  it('bloquea_cambio_de_pestana_si_hay_cambios_sin_guardar_y_muestra_modal', () => {
    stateMock.tieneCambiosSinGuardar.mockReturnValue(true);
    stateMock.tieneCambiosSinGuardarSignal.set(true);

    component.intentarCambiarTab('formacion');
    fixture.detectChanges();

    expect(component.tabActiva()).toBe('ficha');
    expect(component.mostrarModalCambios()).toBe(true);
  });

  it('opcion_quedarme_aqui_cancela_cambio_y_oculta_modal', () => {
    stateMock.tieneCambiosSinGuardar.mockReturnValue(true);
    component.intentarCambiarTab('formacion');
    expect(component.mostrarModalCambios()).toBe(true);

    component.onQuedarmeAqui();

    expect(component.mostrarModalCambios()).toBe(false);
    expect(component.tabActiva()).toBe('ficha');
  });

  it('opcion_descartar_cambios_descarta_y_cambia_de_pestana', () => {
    const seccionMock: SeccionConCambios = {
      tieneCambios: vi.fn().mockReturnValue(true),
      guardarCambios: vi.fn().mockReturnValue(of(true)),
      descartarCambios: vi.fn(),
    };
    stateMock.seccionActiva.set(seccionMock);
    stateMock.tieneCambiosSinGuardar.mockReturnValue(true);

    component.intentarCambiarTab('formacion');
    expect(component.mostrarModalCambios()).toBe(true);

    component.onDescartarYContinuar();

    expect(seccionMock.descartarCambios).toHaveBeenCalledTimes(1);
    expect(component.mostrarModalCambios()).toBe(false);
    expect(component.tabActiva()).toBe('formacion');
  });

  it('opcion_guardar_y_continuar_guarda_y_cambia_de_pestana_si_exito', () => {
    const seccionMock: SeccionConCambios = {
      tieneCambios: vi.fn().mockReturnValue(true),
      guardarCambios: vi.fn().mockReturnValue(of(true)),
      descartarCambios: vi.fn(),
    };
    stateMock.seccionActiva.set(seccionMock);
    stateMock.tieneCambiosSinGuardar.mockReturnValue(true);

    component.intentarCambiarTab('formacion');
    expect(component.mostrarModalCambios()).toBe(true);

    component.onGuardarYContinuar();

    expect(seccionMock.guardarCambios).toHaveBeenCalledTimes(1);
    expect(component.mostrarModalCambios()).toBe(false);
    expect(component.tabActiva()).toBe('formacion');
  });

  it('opcion_guardar_y_continuar_muestra_error_si_guardado_falla', () => {
    const seccionMock: SeccionConCambios = {
      tieneCambios: vi.fn().mockReturnValue(true),
      guardarCambios: vi.fn().mockReturnValue(of(false)),
      descartarCambios: vi.fn(),
    };
    stateMock.seccionActiva.set(seccionMock);
    stateMock.tieneCambiosSinGuardar.mockReturnValue(true);

    component.intentarCambiarTab('formacion');
    expect(component.mostrarModalCambios()).toBe(true);

    component.onGuardarYContinuar();

    expect(seccionMock.guardarCambios).toHaveBeenCalledTimes(1);
    expect(component.mostrarModalCambios()).toBe(true);
    expect(component.tabActiva()).toBe('ficha');
    expect(component.errorCambios()).toContain('No fue posible guardar los cambios');
  });

  it('muestra_punto_indicador_cuando_hay_cambios_sin_guardar', () => {
    stateMock.tieneCambiosSinGuardarSignal.set(true);
    fixture.detectChanges();

    const punto = (fixture.nativeElement as HTMLElement).querySelector('.tab-punto-cambios');
    expect(punto).toBeTruthy();
    expect(punto?.textContent).toBe('•');
  });

  it('beforeunload_previene_cierre_si_hay_cambios_sin_guardar', () => {
    stateMock.tieneCambiosSinGuardar.mockReturnValue(true);
    const event = new Event('beforeunload') as BeforeUnloadEvent;
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    component.onBeforeUnload(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(event.returnValue).toBe(true);
  });

  it('puedeDesactivar_permite_si_no_hay_cambios_y_muestra_modal_si_hay_cambios', () => {
    stateMock.tieneCambiosSinGuardar.mockReturnValue(false);
    expect(component.puedeDesactivar()).toBe(true);

    stateMock.tieneCambiosSinGuardar.mockReturnValue(true);
    const resultado = component.puedeDesactivar();
    expect(resultado).not.toBe(true);
    expect(component.mostrarModalCambios()).toBe(true);
  });

  it('muestra_solo_pestanas_de_secciones_abiertas_y_numeracion_correlativa', () => {
    stateMock.hojaDeVida.set({
      ...mockHdv,
      seccionesAbiertas: ['ficha', 'referencias'],
    });
    fixture.detectChanges();

    const tabs = (fixture.nativeElement as HTMLElement).querySelectorAll('.seccion-tab-btn');
    expect(tabs.length).toBe(2);

    expect(tabs[0].querySelector('.tab-num')?.textContent?.trim()).toBe('1');
    expect(tabs[0].querySelector('.tab-texto')?.textContent?.trim()).toBe('Ficha Personal');

    expect(tabs[1].querySelector('.tab-num')?.textContent?.trim()).toBe('2');
    expect(tabs[1].querySelector('.tab-texto')?.textContent?.trim()).toBe('Referencias');

    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="tab-formacion-academica"]',
      ),
    ).toBeNull();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[data-testid="tab-capacitaciones"]'),
    ).toBeNull();
  });

  it('con_una_sola_pestana_abierta_se_muestra_correctamente_y_bloquea_cambio_a_cerradas', () => {
    stateMock.hojaDeVida.set({
      ...mockHdv,
      seccionesAbiertas: ['ficha'],
    });
    fixture.detectChanges();

    const tabs = (fixture.nativeElement as HTMLElement).querySelectorAll('.seccion-tab-btn');
    expect(tabs.length).toBe(1);
    expect(tabs[0].querySelector('.tab-num')?.textContent?.trim()).toBe('1');

    component.intentarCambiarTab('formacion');
    expect(component.tabActiva()).toBe('ficha');
  });

  it('cuenta_bancaria_se_muestra_u_oculta_segun_seccionesAbiertas', () => {
    // 1. Con cuenta-bancaria abierta
    stateMock.hojaDeVida.set({
      ...mockHdv,
      seccionesAbiertas: ['ficha', 'cuenta-bancaria'],
    });
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-mi-cuenta-bancaria'),
    ).toBeTruthy();

    // 2. Con cuenta-bancaria cerrada
    stateMock.hojaDeVida.set({
      ...mockHdv,
      seccionesAbiertas: ['ficha'],
    });
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-mi-cuenta-bancaria'),
    ).toBeNull();
  });

  it('no_se_pierde_aviso_de_cambios_sin_guardar_con_pestanas_filtradas', () => {
    stateMock.hojaDeVida.set({
      ...mockHdv,
      seccionesAbiertas: ['ficha', 'referencias'],
    });
    stateMock.tieneCambiosSinGuardarSignal.set(true);
    fixture.detectChanges();

    const punto = (fixture.nativeElement as HTMLElement).querySelector('.tab-punto-cambios');
    expect(punto).toBeTruthy();
    expect(punto?.textContent).toBe('•');
  });

  it('usuario_final_no_ve_el_boton_de_descarga_vista_previa_pdf_y_no_puede_descargar', () => {
    fixture.detectChanges();

    expect(component.puedeDescargarPdf()).toBe(false);

    const btn = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="btn-descargar-vista-previa-pdf"]',
    );
    expect(btn).toBeNull();

    component.descargarVistaPreviaPdf();

    expect(component.errorDescargaPdf()).toContain('No tiene permisos');
    httpTestingController.expectNone('/api/mis-datos/documento-hoja-de-vida');
  });

  it('supervisor_o_admin_ve_el_boton_y_puede_descargar_vista_previa_pdf', () => {
    authServiceMock.rolActual.set('supervisor');
    fixture.detectChanges();

    expect(component.puedeDescargarPdf()).toBe(true);

    const btn = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="btn-descargar-vista-previa-pdf"]',
    );
    expect(btn).not.toBeNull();

    component.descargarVistaPreviaPdf();
    expect(component.descargandoPdf()).toBe(true);

    const req = httpTestingController.expectOne('/api/mis-datos/documento-hoja-de-vida');
    expect(req.request.method).toBe('GET');
    req.flush(new Blob(['%PDF-1.4...']), {
      headers: { 'content-disposition': 'attachment; filename="hoja-de-vida.pdf"' },
    });

    expect(component.descargandoPdf()).toBe(false);
    expect(component.errorDescargaPdf()).toBeNull();
  });
});
