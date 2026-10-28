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
    retirarArchivoSupervisor: Mock;
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
      retirarArchivoSupervisor: vi.fn().mockReturnValue(of({ mensaje: 'Archivo retirado' })),
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

  it('el_expediente_muestra_metadatos_completos_de_archivos_adjuntos_incluyendo_fecha_y_area', () => {
    component.verExpediente('1700000001');
    fixture.detectChanges();

    const archivoEl = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="archivo-22222222-2222-2222-2222-222222222222"]',
    );
    expect(archivoEl).not.toBeNull();
    const texto = archivoEl?.textContent || '';
    expect(texto).toContain('cedula.pdf');
    expect(texto).toContain('cedula_frontal');
    expect(texto).toContain('application/pdf');
    expect(texto).toContain('Subido:');
  });

  it('descargarArchivo_soporta_FileResponse_sin_danar_bytes', () => {
    archivosClientMock.descargarArchivo.mockReturnValue(
      of({ data: new Blob(['test-binary']), fileName: 'cedula.pdf' }),
    );

    component.descargarArchivo('22222222-2222-2222-2222-222222222222', 'cedula.pdf');

    expect(archivosClientMock.descargarArchivo).toHaveBeenCalledWith(
      '22222222-2222-2222-2222-222222222222',
    );
    expect(component.error()).toBeNull();
  });

  describe('Issue #139: retiro auditado de adjuntos por supervisor', () => {
    it('muestra_boton_retirar_en_cada_archivo_del_expediente', () => {
      component.verExpediente('1700000001');
      fixture.detectChanges();

      const btnRetirar = (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="btn-retirar-22222222-2222-2222-2222-222222222222"]',
      );
      expect(btnRetirar).not.toBeNull();
    });

    it('iniciar_retiro_abre_modal_y_deshabilita_confirmar_sin_motivo', () => {
      component.verExpediente('1700000001');
      fixture.detectChanges();

      component.iniciarRetiroArchivo(archivosMock[0]);
      fixture.detectChanges();

      const modal = (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="modal-retiro-archivo"]',
      );
      expect(modal).not.toBeNull();
      expect(component.archivoParaRetirar()).toEqual(archivosMock[0]);

      const btnConfirmar = (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="btn-confirmar-retiro"]',
      ) as HTMLButtonElement;
      expect(btnConfirmar).not.toBeNull();
      expect(btnConfirmar.disabled).toBe(true);

      component.cancelarRetiroArchivo();
      fixture.detectChanges();
      expect(component.archivoParaRetirar()).toBeNull();
    });

    it('confirmar_retiro_con_motivo_llama_a_api_y_recarga_archivos', () => {
      component.verExpediente('1700000001');
      fixture.detectChanges();

      component.iniciarRetiroArchivo(archivosMock[0]);
      component.motivoRetiro = 'Documento con firmas borrosas e ilegibles.';
      fixture.detectChanges();

      const btnConfirmar = (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="btn-confirmar-retiro"]',
      ) as HTMLButtonElement;
      expect(btnConfirmar.disabled).toBe(false);

      revisionClientMock.listarArchivosExpediente.mockClear();
      component.confirmarRetiroArchivo();

      expect(archivosClientMock.retirarArchivoSupervisor).toHaveBeenCalledWith(
        '22222222-2222-2222-2222-222222222222',
        { motivo: 'Documento con firmas borrosas e ilegibles.' },
      );
      expect(revisionClientMock.listarArchivosExpediente).toHaveBeenCalledWith('1700000001');
      expect(component.archivoParaRetirar()).toBeNull();
      expect(component.mensajeExito()).toContain('El adjunto ha sido retirado');
    });
  });
});
