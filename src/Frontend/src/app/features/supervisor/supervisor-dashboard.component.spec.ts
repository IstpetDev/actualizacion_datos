import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { type Mock, vi } from 'vitest';
import {
  ArchivosClient,
  ArchivoDto,
  ExpedienteRevisionDto,
  HojaDeVidaDto,
  ResumenRevisionPendienteDto,
  RevisionClient,
} from '../../api-client';
import { AuthService } from '../../core/auth';
import { SupervisorDashboardComponent } from './supervisor-dashboard.component';

describe('SupervisorDashboardComponent', () => {
  let component: SupervisorDashboardComponent;
  let fixture: ComponentFixture<SupervisorDashboardComponent>;
  let revisionClientMock: {
    listarPendientesRevision: Mock;
    obtenerExpedienteParaRevision: Mock;
    obtenerHojaDeVidaParaRevision: Mock;
    listarArchivosExpediente: Mock;
    aprobarActualizacion: Mock;
    devolverActualizacion: Mock;
    obtenerCuentaBancariaParaRevision: Mock;
  };
  let archivosClientMock: {
    descargarArchivo: Mock;
  };
  let authServiceMock: {
    sesion: Mock;
  };

  const listaPendientesMock: ResumenRevisionPendienteDto[] = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      documento: '1700000001',
      nombre: 'Usuario Prueba Uno',
      correo: 'usuario1@ejemplo.test',
      estadoActualizacion: 'Enviado',
      fechaCreacionUtc: new Date('2026-10-22T10:00:00Z'),
    },
  ];

  const expedienteMock: ExpedienteRevisionDto = {
    id: '11111111-1111-1111-1111-111111111111',
    institucionId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    documento: '1700000001',
    nombre: 'Usuario Prueba Uno',
    correo: 'usuario1@ejemplo.test',
    estadoActualizacion: 'Enviado',
    datosPersonalesJson: JSON.stringify({
      nombres: 'Usuario',
      apellidos: 'Prueba Uno',
      telefono: '0999999999',
    }),
    tratamientoDatosAceptado: true,
    fechaAceptacionTratamientoDatosUtc: new Date('2026-10-22T09:30:00Z'),
    observaciones: [],
  };

  const archivosMock: ArchivoDto[] = [
    {
      id: '22222222-2222-2222-2222-222222222222',
      institucionId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      personaId: '11111111-1111-1111-1111-111111111111',
      nombreOriginal: 'cedula.pdf',
      tipoContenido: 'application/pdf',
      tamanoBytes: 15420,
      hashSha256: 'abcdef123456',
      claveDestino: 'cedula_frontal',
      fechaSubidaUtc: new Date('2026-10-22T09:35:00Z'),
    },
  ];

  const mockHojaDeVida: HojaDeVidaDto = {
    personaId: '11111111-1111-1111-1111-111111111111',
    documento: '1700000001',
    estadoActualizacion: 'Enviado',
    puedeEditar: false,
    ficha: {
      personaId: '11111111-1111-1111-1111-111111111111',
      primerNombre: 'Usuario',
      primerApellido: 'Prueba',
      fechaActualizacionUtc: new Date(),
    } as unknown as HojaDeVidaDto['ficha'],
    titulos: [
      {
        id: 'tit-100',
        nombreTitulo: 'Ingeniero de Software',
        nombreInstitucionOtra: 'Universidad Test',
        gradoAcademicoId: 3,
        archivoId: 'arc-respaldo-1',
        fechaActualizacionUtc: new Date(),
      } as unknown as HojaDeVidaDto['titulos'][0],
    ],
    titulosEnCurso: [],
    capacitaciones: [],
    experiencias: [],
    referencias: [],
  };

  let httpTestingController: HttpTestingController;

  beforeEach(async () => {
    revisionClientMock = {
      listarPendientesRevision: vi.fn().mockReturnValue(of(listaPendientesMock)),
      obtenerExpedienteParaRevision: vi.fn().mockReturnValue(of(expedienteMock)),
      obtenerHojaDeVidaParaRevision: vi.fn().mockReturnValue(of(mockHojaDeVida)),
      listarArchivosExpediente: vi.fn().mockReturnValue(of(archivosMock)),
      aprobarActualizacion: vi.fn().mockReturnValue(of({ mensaje: 'Actualización aprobada' })),
      devolverActualizacion: vi.fn().mockReturnValue(of({ mensaje: 'Actualización devuelta' })),
      obtenerCuentaBancariaParaRevision: vi.fn().mockReturnValue(
        of({
          banco: 'Banco ficticio',
          tipoCuenta: 'Ahorros',
          numeroEnmascarado: '******1234',
          estado: 'coincide',
        }),
      ),
    };

    archivosClientMock = {
      descargarArchivo: vi.fn().mockReturnValue(of(new Blob(['test']))),
    };

    authServiceMock = {
      sesion: vi.fn().mockReturnValue({
        documento: '1700000009',
        nombre: 'Supervisor Test',
        rol: 'supervisor',
        institucionId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      }),
    };

    await TestBed.configureTestingModule({
      imports: [SupervisorDashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: RevisionClient, useValue: revisionClientMock },
        { provide: ArchivosClient, useValue: archivosClientMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SupervisorDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe_crearse_correctamente_y_cargar_pendientes_en_ngOnInit', () => {
    expect(component).toBeTruthy();
    expect(revisionClientMock.listarPendientesRevision).toHaveBeenCalled();
    expect(component.pendientes().length).toBe(1);
    expect(component.pendientes()[0].documento).toBe('1700000001');
  });

  it('el_supervisor_NO_debe_tener_ninguna_opcion_ni_boton_de_exportar', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const textoCompleto = compiled.textContent?.toLowerCase() || '';

    // No debe contener mención alguna a exportar o descargar zip masivo
    expect(textoCompleto).not.toContain('exportar');
    expect(textoCompleto).not.toContain('exportación');
    expect(compiled.querySelector('[data-testid="btn-exportar"]')).toBeNull();
    expect(compiled.querySelector('button[aria-label*="exportar"]')).toBeNull();
  });

  it('verExpediente_debe_cargar_los_datos_personales_y_archivos_adjuntos', () => {
    component.verExpediente('1700000001');
    fixture.detectChanges();

    expect(revisionClientMock.obtenerExpedienteParaRevision).toHaveBeenCalledWith('1700000001');
    expect(revisionClientMock.listarArchivosExpediente).toHaveBeenCalledWith('1700000001');
    expect(component.expedienteSeleccionado()).toBeTruthy();
    expect(component.archivosExpediente().length).toBe(1);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="panel-expediente"]')).not.toBeNull();
    expect(compiled.querySelector('[data-testid="expediente-doc"]')?.textContent).toContain(
      '1700000001',
    );
  });

  it('el_expediente_muestra_la_cuenta_bancaria_enmascarada_ADR_0013', () => {
    component.verExpediente('1700000001');
    fixture.detectChanges();

    const cuenta = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="cuenta-revision"]',
    );
    expect(revisionClientMock.obtenerCuentaBancariaParaRevision).toHaveBeenCalledWith('1700000001');
    expect(cuenta?.textContent).toContain('******1234');
    expect(cuenta?.textContent).toContain('Coincide con la nómina');
  });

  it('aprobar_debe_llamar_a_aprobarActualizacion_y_refrescar_la_bandeja', () => {
    component.verExpediente('1700000001');
    fixture.detectChanges();

    component.aprobar();
    fixture.detectChanges();

    expect(revisionClientMock.aprobarActualizacion).toHaveBeenCalledWith('1700000001');
    expect(component.mensajeExito()).toContain('Actualización aprobada');
    expect(component.expedienteSeleccionado()).toBeNull();
  });

  it('devolver_con_marcas_debe_enviar_observacion_general_y_marcas_segun_ADR_0008', () => {
    component.verExpediente('1700000001');
    fixture.detectChanges();

    component.abrirModalDevolver();
    expect(component.mostrarModalDevolver()).toBe(true);

    component.observacionGeneral.set('Se requiere corregir datos erróneos');
    component.nuevaMarcaTipo.set('Campo');
    component.nuevaMarcaClave.set('telefono');
    component.nuevaMarcaTexto.set('El teléfono debe tener 10 dígitos');
    component.agregarMarca();

    expect(component.marcas().length).toBe(1);
    expect(component.marcas()[0].claveDestino).toBe('telefono');

    component.confirmarDevolucion();
    fixture.detectChanges();

    expect(revisionClientMock.devolverActualizacion).toHaveBeenCalledWith('1700000001', {
      observacionGeneral: 'Se requiere corregir datos erróneos',
      marcas: [
        {
          tipoDestino: 'Campo',
          claveDestino: 'telefono',
          texto: 'El teléfono debe tener 10 dígitos',
        },
      ],
    });
    expect(component.mostrarModalDevolver()).toBe(false);
  });

  it('iniciarMarcaItem_debe_abrir_el_modal_con_tipo_Item_y_clave_de_item_RF_HDV_011', () => {
    component.verExpediente('1700000001');
    fixture.detectChanges();

    expect(revisionClientMock.obtenerHojaDeVidaParaRevision).toHaveBeenCalledWith('1700000001');
    expect(component.hojaDeVida()).toEqual(mockHojaDeVida);

    component.iniciarMarcaItem({
      tipo: 'Item',
      clave: 'titulo:tit-100',
      label: 'Ingeniero de Software',
    });

    expect(component.mostrarModalDevolver()).toBe(true);
    expect(component.nuevaMarcaTipo()).toBe('Item');
    expect(component.nuevaMarcaClave()).toBe('titulo:tit-100');

    component.observacionGeneral.set('Título con respaldo ilegible');
    component.nuevaMarcaTexto.set('Por favor volver a escanear el certificado');
    component.agregarMarca();

    expect(component.marcas()).toEqual([
      {
        tipoDestino: 'Item',
        claveDestino: 'titulo:tit-100',
        texto: 'Por favor volver a escanear el certificado',
      },
    ]);

    component.confirmarDevolucion();
    fixture.detectChanges();

    expect(revisionClientMock.devolverActualizacion).toHaveBeenCalledWith('1700000001', {
      observacionGeneral: 'Título con respaldo ilegible',
      marcas: [
        {
          tipoDestino: 'Item',
          claveDestino: 'titulo:tit-100',
          texto: 'Por favor volver a escanear el certificado',
        },
      ],
    });
  });

  it('permite_descargar_el_documento_pdf_de_la_persona_en_revision', () => {
    component.verExpediente('1700000001');
    fixture.detectChanges();

    component.descargarDocumentoPdf();
    const req = httpTestingController.expectOne(
      '/api/personas/11111111-1111-1111-1111-111111111111/documento-hoja-de-vida',
    );
    expect(req.request.method).toBe('GET');
    req.flush(new Blob(['%PDF-1.4...']), {
      headers: { 'content-disposition': 'attachment; filename="hoja-de-vida-1700000001.pdf"' },
    });
    expect(component.descargandoPdf()).toBe(false);
  });

  it('debe_mostrar_estados_y_avance_por_seccion_para_todas_las_personas_RF_REV_001_002', () => {
    const listaCompleta: ResumenRevisionPendienteDto[] = [
      {
        id: 'p-1',
        documento: '1700000001',
        nombre: 'Usuario Sin Iniciar',
        correo: 'sin.iniciar@ejemplo.test',
        estadoActualizacion: 'Sin Iniciar',
        fechaCreacionUtc: new Date(),
        totalSecciones: 7,
        seccionesConDatos: 0,
        porcentajeAvance: 0,
        seccionesCompletadas: [],
      },
      {
        id: 'p-2',
        documento: '1700000002',
        nombre: 'Usuario Con Borrador',
        correo: 'borrador@ejemplo.test',
        estadoActualizacion: 'Borrador',
        fechaCreacionUtc: new Date(),
        totalSecciones: 7,
        seccionesConDatos: 3,
        porcentajeAvance: 42,
        seccionesCompletadas: ['FichaPersonal', 'FormacionAcademica', 'CuentaBancaria'],
      },
    ];

    component.pendientes.set(listaCompleta);
    fixture.detectChanges();

    const badgeSinIniciar = fixture.nativeElement.querySelector(
      '[data-testid="badge-estado-1700000001"]',
    );
    expect(badgeSinIniciar).toBeTruthy();
    expect(badgeSinIniciar.textContent.trim()).toBe('Sin Iniciar');
    expect(badgeSinIniciar.classList.contains('badge-secondary')).toBe(true);

    const avanceSinIniciar = fixture.nativeElement.querySelector(
      '[data-testid="avance-1700000001"]',
    );
    expect(avanceSinIniciar.textContent).toContain('0/7 secciones (0%)');

    const badgeBorrador = fixture.nativeElement.querySelector(
      '[data-testid="badge-estado-1700000002"]',
    );
    expect(badgeBorrador).toBeTruthy();
    expect(badgeBorrador.textContent.trim()).toBe('Borrador');
    expect(badgeBorrador.classList.contains('badge-warning')).toBe(true);

    const avanceBorrador = fixture.nativeElement.querySelector('[data-testid="avance-1700000002"]');
    expect(avanceBorrador.textContent).toContain('3/7 secciones (42%)');
  });

  it('debe_filtrar_la_lista_de_personas_por_texto_o_cedula', () => {
    const listaCompleta: ResumenRevisionPendienteDto[] = [
      {
        id: 'p-1',
        documento: '1700000001',
        nombre: 'Ana Docente',
        correo: 'ana@ejemplo.test',
        estadoActualizacion: 'Sin Iniciar',
        fechaCreacionUtc: new Date(),
      },
      {
        id: 'p-2',
        documento: '1700000002',
        nombre: 'Carlos Perez',
        correo: 'carlos@ejemplo.test',
        estadoActualizacion: 'Borrador',
        fechaCreacionUtc: new Date(),
      },
    ];

    component.pendientes.set(listaCompleta);
    fixture.detectChanges();

    expect(component.pendientesFiltrados().length).toBe(2);

    component.filtroTexto.set('Carlos');
    fixture.detectChanges();
    expect(component.pendientesFiltrados().length).toBe(1);
    expect(component.pendientesFiltrados()[0].documento).toBe('1700000002');

    component.filtroTexto.set('1700000001');
    fixture.detectChanges();
    expect(component.pendientesFiltrados().length).toBe(1);
    expect(component.pendientesFiltrados()[0].nombre).toBe('Ana Docente');
  });

  it('cuando_el_expediente_esta_en_borrador_oculta_aprobar_y_devolver_y_muestra_aviso_RF_REV_003_004', () => {
    revisionClientMock.obtenerExpedienteParaRevision.mockReturnValue(
      of({
        ...expedienteMock,
        estadoActualizacion: 'Borrador',
      }),
    );

    component.verExpediente('1700000001');
    fixture.detectChanges();

    const avisoModoLectura = fixture.nativeElement.querySelector(
      '[data-testid="aviso-modo-lectura"]',
    );
    expect(avisoModoLectura).toBeTruthy();
    expect(avisoModoLectura.textContent).toContain('Modo solo lectura');
    expect(avisoModoLectura.textContent).toContain('Borrador');

    const btnAprobar = fixture.nativeElement.querySelector('[data-testid="btn-aprobar"]');
    expect(btnAprobar).toBeNull();

    const btnDevolver = fixture.nativeElement.querySelector('[data-testid="btn-abrir-devolver"]');
    expect(btnDevolver).toBeNull();
  });
});
