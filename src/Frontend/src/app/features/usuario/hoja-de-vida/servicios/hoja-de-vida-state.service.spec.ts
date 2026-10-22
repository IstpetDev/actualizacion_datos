import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import {
  DocumentosPersonalesClient,
  HojaDeVidaClient,
  HojaDeVidaDto,
  MisDatosClient,
  ResultadoValidacionEnvioDto,
  TituloAcademicoDto,
} from '../../../../api-client';
import { HojaDeVidaStateService } from './hoja-de-vida-state.service';

describe('HojaDeVidaStateService', () => {
  let service: HojaDeVidaStateService;
  let hdvClientMock: {
    obtenerMiHojaDeVida: Mock;
    obtenerFaltantesEnvio: Mock;
    guardarMiFichaPersonal: Mock;
    agregarTituloAcademico: Mock;
    actualizarTituloAcademico: Mock;
    eliminarTituloAcademico: Mock;
  };
  let docsClientMock: {
    listarMisDocumentosPersonales: Mock;
    guardarMiDocumentoPersonal: Mock;
  };
  let misDatosClientMock: {
    obtenerEstadoEdicion: Mock;
    obtenerObservacionesMisDatos: Mock;
    enviarMisDatosARevision: Mock;
  };

  const mockHdvBorrador: HojaDeVidaDto = {
    personaId: '11111111-1111-1111-1111-111111111111',
    documento: '1700000003',
    estadoActualizacion: 'Borrador',
    puedeEditar: true,
    ficha: undefined,
    titulos: [],
    titulosEnCurso: [],
    capacitaciones: [],
    experiencias: [],
    referencias: [
      {
        id: 'ref-1',
        tipo: 'Personal',
        nombresApellidos: 'Carlos Gomez',
        telefono: '099111222',
        titulo: undefined,
        cargoActual: undefined,
        empresa: undefined,
        fechaActualizacionUtc: new Date(),
      },
      {
        id: 'ref-2',
        tipo: 'Familiar',
        nombresApellidos: 'Ana Gomez',
        telefono: '099333444',
        titulo: undefined,
        cargoActual: undefined,
        empresa: undefined,
        fechaActualizacionUtc: new Date(),
      },
    ],
  };

  beforeEach(() => {
    hdvClientMock = {
      obtenerMiHojaDeVida: vi.fn(),
      obtenerFaltantesEnvio: vi.fn(),
      guardarMiFichaPersonal: vi.fn(),
      agregarTituloAcademico: vi.fn(),
      actualizarTituloAcademico: vi.fn(),
      eliminarTituloAcademico: vi.fn(),
    };

    docsClientMock = {
      listarMisDocumentosPersonales: vi.fn(),
      guardarMiDocumentoPersonal: vi.fn(),
    };

    misDatosClientMock = {
      obtenerEstadoEdicion: vi
        .fn()
        .mockReturnValue(of({ puedeEditar: true, campanaActiva: undefined })),
      obtenerObservacionesMisDatos: vi.fn().mockReturnValue(of([])),
      enviarMisDatosARevision: vi.fn().mockReturnValue(of({})),
    };

    TestBed.configureTestingModule({
      providers: [
        HojaDeVidaStateService,
        { provide: HojaDeVidaClient, useValue: hdvClientMock },
        { provide: DocumentosPersonalesClient, useValue: docsClientMock },
        { provide: MisDatosClient, useValue: misDatosClientMock },
      ],
    });

    service = TestBed.inject(HojaDeVidaStateService);
  });

  it('debe_crearse_correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('RF-HDV-010: puedeEditar solo lectura fuera de Borrador o Devuelto', () => {
    it('permite_edicion_cuando_estado_es_Borrador_y_puedeEditar_es_true', () => {
      service.hojaDeVida.set({
        ...mockHdvBorrador,
        estadoActualizacion: 'Borrador',
        puedeEditar: true,
      });
      expect(service.puedeEditar()).toBe(true);
    });

    it('permite_edicion_cuando_estado_es_Devuelto_y_puedeEditar_es_true', () => {
      service.hojaDeVida.set({
        ...mockHdvBorrador,
        estadoActualizacion: 'Devuelto',
        puedeEditar: true,
      });
      expect(service.puedeEditar()).toBe(true);
    });

    it('bloquea_edicion_cuando_estado_es_Enviado', () => {
      service.hojaDeVida.set({
        ...mockHdvBorrador,
        estadoActualizacion: 'Enviado',
        puedeEditar: false,
      });
      expect(service.puedeEditar()).toBe(false);
    });

    it('bloquea_edicion_cuando_estado_es_Aprobado', () => {
      service.hojaDeVida.set({
        ...mockHdvBorrador,
        estadoActualizacion: 'Aprobado',
        puedeEditar: false,
      });
      expect(service.puedeEditar()).toBe(false);
    });
  });

  it('filtra_referencias_personales_y_familiares_correctamente', () => {
    service.hojaDeVida.set(mockHdvBorrador);
    expect(service.referenciasPersonales().length).toBe(1);
    expect(service.referenciasFamiliares().length).toBe(1);
  });

  it('cargarHojaDeVida_actualiza_los_signals_de_estado', () => {
    hdvClientMock.obtenerMiHojaDeVida.mockReturnValue(of(mockHdvBorrador));
    docsClientMock.listarMisDocumentosPersonales.mockReturnValue(of([]));

    service.cargarHojaDeVida().subscribe();

    expect(service.hojaDeVida()).toEqual(mockHdvBorrador);
    expect(service.cargando()).toBe(false);
  });

  it('consultarFaltantes_actualiza_el_signal_de_faltantes', () => {
    const mockFaltantes: ResultadoValidacionEnvioDto = {
      completo: false,
      faltantes: [
        {
          seccion: 'FormacionAcademica',
          codigo: 'SIN_ESTUDIOS',
          mensaje: 'Debe registrar al menos un estudio',
        },
      ],
    };
    hdvClientMock.obtenerFaltantesEnvio.mockReturnValue(of(mockFaltantes));

    service.consultarFaltantes().subscribe();

    expect(service.faltantes().length).toBe(1);
    expect(service.faltantes()[0].codigo).toBe('SIN_ESTUDIOS');
  });

  it('guardarTitulo_agrega_un_nuevo_titulo_al_signal', () => {
    service.hojaDeVida.set({ ...mockHdvBorrador, titulos: [] });
    const nuevoTitulo: TituloAcademicoDto = {
      id: 'tit-1',
      nombreTitulo: 'Ingeniero en Sistemas',
      gradoAcademicoId: 3,
      universidadId: undefined,
      nombreInstitucionOtra: undefined,
      campoDetalladoUnescoId: undefined,
      numeroRegistroSenescyt: undefined,
      fechaObtencion: undefined,
      fechaRegistroSenescyt: undefined,
      archivoId: undefined,
      fechaActualizacionUtc: new Date(),
    };
    hdvClientMock.agregarTituloAcademico.mockReturnValue(of(nuevoTitulo));

    service
      .guardarTitulo({ nombreTitulo: 'Ingeniero en Sistemas', gradoAcademicoId: 3 })
      .subscribe();

    expect(service.titulos().length).toBe(1);
    expect(service.titulos()[0].nombreTitulo).toBe('Ingeniero en Sistemas');
  });

  it('eliminarTitulo_remueve_el_titulo_del_signal', () => {
    const tituloExistente: TituloAcademicoDto = {
      id: 'tit-1',
      nombreTitulo: 'Ingeniero en Sistemas',
      gradoAcademicoId: 3,
      universidadId: undefined,
      nombreInstitucionOtra: undefined,
      campoDetalladoUnescoId: undefined,
      numeroRegistroSenescyt: undefined,
      fechaObtencion: undefined,
      fechaRegistroSenescyt: undefined,
      archivoId: undefined,
      fechaActualizacionUtc: new Date(),
    };
    service.hojaDeVida.set({ ...mockHdvBorrador, titulos: [tituloExistente] });
    hdvClientMock.eliminarTituloAcademico.mockReturnValue(of(undefined));

    service.eliminarTitulo('tit-1').subscribe();

    expect(service.titulos().length).toBe(0);
  });

  it('cargarTodo_consulta_hdv_documentos_estado_y_observaciones', () => {
    hdvClientMock.obtenerMiHojaDeVida.mockReturnValue(of(mockHdvBorrador));
    docsClientMock.listarMisDocumentosPersonales.mockReturnValue(of([]));
    misDatosClientMock.obtenerEstadoEdicion.mockReturnValue(of({ puedeEditar: true }));
    misDatosClientMock.obtenerObservacionesMisDatos.mockReturnValue(of([]));

    service.cargarTodo().subscribe();

    expect(hdvClientMock.obtenerMiHojaDeVida).toHaveBeenCalled();
    expect(docsClientMock.listarMisDocumentosPersonales).toHaveBeenCalled();
    expect(misDatosClientMock.obtenerEstadoEdicion).toHaveBeenCalled();
    expect(misDatosClientMock.obtenerObservacionesMisDatos).toHaveBeenCalled();
    expect(service.hojaDeVida()).toEqual(mockHdvBorrador);
  });

  it('enviarRevision_actualiza_estado_a_Enviado', () => {
    service.hojaDeVida.set({
      ...mockHdvBorrador,
      estadoActualizacion: 'Borrador',
      puedeEditar: true,
    });
    misDatosClientMock.enviarMisDatosARevision.mockReturnValue(of({}));

    service.enviarRevision().subscribe();

    expect(misDatosClientMock.enviarMisDatosARevision).toHaveBeenCalled();
    expect(service.hojaDeVida()?.estadoActualizacion).toBe('Enviado');
    expect(service.puedeEditar()).toBe(false);
  });
});
