import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { type Mock, vi } from 'vitest';
import {
  ArchivosClient,
  ArchivoDto,
  ExpedienteRevisionDto,
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

  beforeEach(async () => {
    revisionClientMock = {
      listarPendientesRevision: vi.fn().mockReturnValue(of(listaPendientesMock)),
      obtenerExpedienteParaRevision: vi.fn().mockReturnValue(of(expedienteMock)),
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
        { provide: RevisionClient, useValue: revisionClientMock },
        { provide: ArchivosClient, useValue: archivosClientMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();

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
});
