import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { type Mock, vi } from 'vitest';
import {
  CampanaDto,
  CampanasClient,
  ConfiguracionClient,
  PersonaDto,
  PersonasClient,
  RevisionClient,
  ResultadoCargaPersonasDto,
} from '../../api-client';
import { AuthService } from '../../core/auth';
import { AdminDashboardComponent } from './admin-dashboard.component';

describe('AdminDashboardComponent', () => {
  let component: AdminDashboardComponent;
  let fixture: ComponentFixture<AdminDashboardComponent>;
  let httpMock: HttpTestingController;
  let campanasClientMock: {
    obtenerCampanaActiva: Mock;
    listarCampanas: Mock;
    crearCampana: Mock;
  };
  let personasClientMock: {
    listarPersonas: Mock;
    cargarPersonas: Mock;
    cambiarAccesoPersonas: Mock;
  };
  let authServiceMock: {
    sesion: Mock;
    rolActual?: Mock;
  };

  const campanaActivaMock: CampanaDto = {
    id: '33333333-3333-3333-3333-333333333333',
    institucionId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    nombre: 'Campaña 2026 Vigente',
    fechaInicioUtc: new Date('2026-10-01T00:00:00Z'),
    fechaFinUtc: new Date('2026-11-01T00:00:00Z'),
    activa: true,
    estaAbierta: true,
  };

  const personasMock: PersonaDto[] = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      institucionId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      documento: '1700000001',
      rol: 'usuario',
      nombre: 'Usuario Prueba',
      correo: 'usuario@ejemplo.test',
      accesoHabilitado: true,
      debeCambiarContrasena: false,
      estadoActualizacion: 'Borrador',
      fechaCreacionUtc: new Date('2026-10-01T00:00:00Z'),
    },
  ];

  const resultadoCargaMock: ResultadoCargaPersonasDto = {
    totalRecibidos: 2,
    totalCargados: 2,
    totalRechazados: 0,
    totalDuplicadosOmitidos: 0,
    advertencias: [],
    rechazos: [],
    documentosCargados: ['1700000002', '1700000003'],
  };

  beforeEach(async () => {
    campanasClientMock = {
      obtenerCampanaActiva: vi.fn().mockReturnValue(of(campanaActivaMock)),
      listarCampanas: vi.fn().mockReturnValue(of([campanaActivaMock])),
      crearCampana: vi.fn().mockReturnValue(
        of({
          ...campanaActivaMock,
          nombre: 'Nueva Campaña Test',
        }),
      ),
    };

    personasClientMock = {
      listarPersonas: vi.fn().mockReturnValue(of(personasMock)),
      cargarPersonas: vi.fn().mockReturnValue(of(resultadoCargaMock)),
      cambiarAccesoPersonas: vi.fn().mockReturnValue(of({ cambiadas: 1, yaEnEstado: 0 })),
    };

    authServiceMock = {
      sesion: vi.fn().mockReturnValue({
        documento: '1700000008',
        nombre: 'Admin Test',
        rol: 'admin',
        institucionId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      }),
      rolActual: vi.fn().mockReturnValue('admin'),
    };

    await TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CampanasClient, useValue: campanasClientMock },
        { provide: PersonasClient, useValue: personasClientMock },
        {
          provide: ConfiguracionClient,
          useValue: {
            listarTiposFuncionario: () => of([]),
            listarTiposDocumento: () => of([]),
            listarRequisitosDocumento: () => of([]),
          },
        },
        { provide: RevisionClient, useValue: { listarEstadosCuentasBancarias: () => of([]) } },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe_crearse_y_cargar_campana_activa_y_personas_al_iniciar', () => {
    expect(component).toBeTruthy();
    expect(campanasClientMock.obtenerCampanaActiva).toHaveBeenCalled();
    expect(campanasClientMock.listarCampanas).toHaveBeenCalled();
    expect(personasClientMock.listarPersonas).toHaveBeenCalled();
    expect(component.campanaActiva()?.nombre).toBe('Campaña 2026 Vigente');
  });

  it('permite_crear_una_nueva_campana_con_rango_de_fechas', () => {
    component.nuevoNombreCampana = 'Nueva Campaña 2027';
    component.nuevaFechaInicio = '2027-01-01T08:00';
    component.nuevaFechaFin = '2027-02-01T18:00';

    expect(component.formularioCampanaValido()).toBe(true);

    component.crearCampana();
    fixture.detectChanges();

    expect(campanasClientMock.crearCampana).toHaveBeenCalledWith({
      nombre: 'Nueva Campaña 2027',
      fechaInicioUtc: new Date('2027-01-01T08:00'),
      fechaFinUtc: new Date('2027-02-01T18:00'),
    });
    expect(component.mensajeExito()).toContain('creada exitosamente');
  });

  it('la_tabla_de_personas_indica_si_el_acceso_esta_habilitado_o_pendiente', () => {
    personasMock.push({
      ...personasMock[0],
      id: '22222222-2222-2222-2222-222222222222',
      accesoHabilitado: false,
    });
    component.cambiarTab('personas');
    fixture.detectChanges();
    component.personas.set([...personasMock]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('[data-testid="acceso-habilitado"]').length).toBe(1);
    expect(compiled.querySelectorAll('[data-testid="acceso-pendiente"]').length).toBe(1);
    personasMock.pop();
  });

  it('la_tabla_de_personas_permite_filtrar_por_estado_de_acceso', () => {
    const listaTest: PersonaDto[] = [
      {
        ...personasMock[0],
        id: '11111111-1111-1111-1111-111111111111',
        documento: '1700000001',
        accesoHabilitado: true,
      },
      {
        ...personasMock[0],
        id: '22222222-2222-2222-2222-222222222222',
        documento: '1700000002',
        accesoHabilitado: false,
      },
    ];
    component.cambiarTab('personas');
    component.personas.set(listaTest);
    fixture.detectChanges();

    expect(component.personasFiltradas().length).toBe(2);
    expect(component.totalHabilitadas()).toBe(1);
    expect(component.totalPendientes()).toBe(1);

    component.cambiarFiltroAcceso('habilitados');
    fixture.detectChanges();
    expect(component.personasFiltradas().length).toBe(1);
    expect(component.personasFiltradas()[0].id).toBe('11111111-1111-1111-1111-111111111111');

    component.cambiarFiltroAcceso('pendientes');
    fixture.detectChanges();
    expect(component.personasFiltradas().length).toBe(1);
    expect(component.personasFiltradas()[0].id).toBe('22222222-2222-2222-2222-222222222222');
  });

  it('permite_seleccionar_individualmente_y_masivamente_personas_rol_usuario', () => {
    const listaTest: PersonaDto[] = [
      {
        ...personasMock[0],
        id: '11111111-1111-1111-1111-111111111111',
        rol: 'usuario',
      },
      {
        ...personasMock[0],
        id: '22222222-2222-2222-2222-222222222222',
        rol: 'usuario',
      },
      {
        ...personasMock[0],
        id: '33333333-3333-3333-3333-333333333333',
        rol: 'admin',
      },
    ];
    component.cambiarTab('personas');
    component.personas.set(listaTest);
    fixture.detectChanges();

    expect(component.personasFiltradasSeleccionables().length).toBe(2);

    // Seleccionar individual
    component.toggleSeleccion('11111111-1111-1111-1111-111111111111');
    expect(component.estaSeleccionada('11111111-1111-1111-1111-111111111111')).toBe(true);
    expect(component.todasSeleccionadas()).toBe(false);

    // Seleccionar todas
    component.toggleSeleccionarTodas();
    expect(component.todasSeleccionadas()).toBe(true);
    expect(component.personasSeleccionadas().size).toBe(2);

    // Deseleccionar todas
    component.toggleSeleccionarTodas();
    expect(component.personasSeleccionadas().size).toBe(0);
  });

  it('permite_cambiar_acceso_individual_con_confirmacion', () => {
    const spyConfirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const persona = personasMock[0];
    component.personas.set([persona]);
    fixture.detectChanges();

    component.cambiarAccesoIndividual(persona);
    fixture.detectChanges();

    expect(spyConfirm).toHaveBeenCalled();
    expect(personasClientMock.cambiarAccesoPersonas).toHaveBeenCalledWith({
      habilitar: false,
      personaIds: [persona.id],
    });
    expect(component.mensajeExito()).toContain('deshabilitado exitosamente');
    spyConfirm.mockRestore();
  });

  it('permite_cambiar_acceso_masivo_a_personas_seleccionadas', () => {
    const spyConfirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    personasClientMock.cambiarAccesoPersonas.mockReturnValue(of({ cambiadas: 2, yaEnEstado: 0 }));

    component.personasSeleccionadas.set(new Set(['id-1', 'id-2']));
    component.cambiarAccesoSeleccionadas(true);
    fixture.detectChanges();

    expect(spyConfirm).toHaveBeenCalled();
    expect(personasClientMock.cambiarAccesoPersonas).toHaveBeenCalledWith({
      habilitar: true,
      personaIds: ['id-1', 'id-2'],
    });
    expect(component.mensajeExito()).toContain('2 persona(s) habilitada(s)');
    expect(component.personasSeleccionadas().size).toBe(0);
    spyConfirm.mockRestore();
  });

  it('permite_cargar_nomina_de_personas_y_muestra_resultados', () => {
    component.cambiarTab('personas');
    fixture.detectChanges();

    component.filaDoc = '1700000002';
    component.filaNom = 'Segundo Usuario';
    component.filaCor = 'segundo@ejemplo.test';
    component.agregarFilaPersona();

    expect(component.listaParaCargar().length).toBe(1);

    component.enviarCargaPersonas();
    fixture.detectChanges();

    expect(personasClientMock.cargarPersonas).toHaveBeenCalledWith({
      personas: [
        {
          documento: '1700000002',
          nombre: 'Segundo Usuario',
          correo: 'segundo@ejemplo.test',
        },
      ],
    });
    expect(component.resultadoCarga()?.totalCargados).toBe(2);
    expect(component.listaParaCargar().length).toBe(0);
  });

  it('el_admin_si_tiene_habilitada_la_opcion_y_seccion_de_exportacion', () => {
    component.cambiarTab('exportacion');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="tab-exportacion"]')).not.toBeNull();
    expect(compiled.querySelector('[data-testid="btn-exportar-admin"]')).not.toBeNull();
    expect(compiled.querySelector('[data-testid="btn-exportar-excel"]')).not.toBeNull();
  });

  it('el_admin_puede_descargar_paquete_zip_exitosamente', () => {
    component.cambiarTab('exportacion');
    fixture.detectChanges();

    // Mock createObjectURL y revokeObjectURL
    const createObjectUrlSpy = vi
      .spyOn(window.URL, 'createObjectURL')
      .mockReturnValue('blob:test-zip');
    const revokeObjectUrlSpy = vi
      .spyOn(window.URL, 'revokeObjectURL')
      .mockImplementation(() => undefined);
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    component.exportarZip();
    expect(component.exportandoZip()).toBe(true);

    const req = httpMock.expectOne('/api/exportaciones/zip');
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');

    const mockBlob = new Blob(['contenido-zip-ficticio'], { type: 'application/zip' });
    req.flush(mockBlob, {
      headers: { 'content-disposition': 'attachment; filename="institucion_20261022_datos.zip"' },
    });

    fixture.detectChanges();
    expect(component.exportandoZip()).toBe(false);
    expect(component.mensajeExito()).toContain('descargado exitosamente');
    expect(createObjectUrlSpy).toHaveBeenCalledWith(mockBlob);

    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
    clickSpy.mockRestore();
  });

  it('el_admin_puede_descargar_reporte_excel_exitosamente', () => {
    component.cambiarTab('exportacion');
    fixture.detectChanges();

    const createObjectUrlSpy = vi
      .spyOn(window.URL, 'createObjectURL')
      .mockReturnValue('blob:test-excel');
    const revokeObjectUrlSpy = vi
      .spyOn(window.URL, 'revokeObjectURL')
      .mockImplementation(() => undefined);
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    component.exportarExcel();
    expect(component.exportandoExcel()).toBe(true);

    const req = httpMock.expectOne('/api/exportaciones/excel');
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');

    const mockBlob = new Blob(['contenido-excel-ficticio'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    req.flush(mockBlob, {
      headers: { 'content-disposition': 'attachment; filename="institucion_20261022_datos.xlsx"' },
    });

    fixture.detectChanges();
    expect(component.exportandoExcel()).toBe(false);
    expect(component.mensajeExito()).toContain('Reporte Excel descargado');

    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
    clickSpy.mockRestore();
  });

  it('muestra_error_cuando_falla_la_exportacion', async () => {
    component.exportarZip();
    expect(component.exportandoZip()).toBe(true);

    const req = httpMock.expectOne('/api/exportaciones/zip');
    const errorBlob = new Blob(
      [JSON.stringify({ mensaje: 'No tiene permisos para exportar datos.' })],
      { type: 'application/json' },
    );
    req.flush(errorBlob, { status: 403, statusText: 'Forbidden' });

    // Esperar resolución de promesa interna de err.error.text()
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(component.exportandoZip()).toBe(false);
    expect(component.error()).toContain('No tiene permisos para exportar datos.');
  });

  it('debe_permitir_navegar_a_la_pestana_de_configuracion_de_requisitos', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const tabBtn = compiled.querySelector('[data-testid="tab-configuracion"]') as HTMLButtonElement;
    expect(tabBtn).toBeTruthy();

    tabBtn.click();
    fixture.detectChanges();

    expect(component.tabActiva()).toBe('configuracion');
    expect(compiled.querySelector('[data-testid="contenido-configuracion"]')).toBeTruthy();
  });
});
