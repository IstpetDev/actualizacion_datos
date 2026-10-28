import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { type Mock, vi } from 'vitest';
import {
  ArchivosClient,
  ConfiguracionDocumentoClient,
  ConfiguracionDocumentoDto,
  PlantillaResumenDto,
  PlantillasHojaDeVidaClient,
} from '../../../api-client';
import { ConfiguracionDocumentoComponent } from './configuracion-documento.component';

describe('ConfiguracionDocumentoComponent', () => {
  let component: ConfiguracionDocumentoComponent;
  let fixture: ComponentFixture<ConfiguracionDocumentoComponent>;
  let docClientMock: {
    obtenerConfiguracionDocumento: Mock;
    actualizarMarcaDocumento: Mock;
    elegirPlantillaDocumento: Mock;
    aceptarVersionDocumento: Mock;
  };
  let plantillasClientMock: {
    listarPlantillasHojaDeVida: Mock;
  };
  let archivosClientMock: {
    subirArchivo: Mock;
  };

  const configuracionMock: ConfiguracionDocumentoDto = {
    institucionId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    plantillaId: '11111111-1111-1111-1111-111111111111',
    versionPlantillaId: '22222222-2222-2222-2222-222222222222',
    nombrePlantilla: 'Plantilla Clásica Oficial',
    numeroVersion: 1,
    nombreVisible: 'Instituto Superior Tecnológico Ejemplo',
    logoArchivoId: 'logo-id-123',
    portadaArchivoId: undefined,
    colorPrimario: '#1B365D',
    colorSecundario: '#4B6B94',
    lema: 'Excelencia y compromiso',
    textoCompromiso: 'Declaro bajo juramento la veracidad de los datos.',
    tieneConfiguracionPropia: true,
    hayNuevaVersionDisponible: true,
    ultimaVersionDisponibleId: '33333333-3333-3333-3333-333333333333',
    ultimoNumeroVersionDisponible: 2,
  };

  const plantillasMock: PlantillaResumenDto[] = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      nombre: 'Plantilla Clásica Oficial',
      descripcion: 'Diseño oficial clásico',
      disenoBase: 'clasico',
      esPredeterminada: true,
      totalVersiones: 2,
      ultimaVersionPublicada: 2,
      fechaCreacionUtc: new Date('2026-10-01T00:00:00Z'),
      fechaActualizacionUtc: new Date('2026-10-01T00:00:00Z'),
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      nombre: 'Plantilla Moderna',
      descripcion: 'Diseño moderno alternativo',
      disenoBase: 'clasico',
      esPredeterminada: false,
      totalVersiones: 1,
      ultimaVersionPublicada: 1,
      fechaCreacionUtc: new Date('2026-10-01T00:00:00Z'),
      fechaActualizacionUtc: new Date('2026-10-01T00:00:00Z'),
    },
  ];

  beforeEach(async () => {
    docClientMock = {
      obtenerConfiguracionDocumento: vi.fn().mockReturnValue(of(configuracionMock)),
      actualizarMarcaDocumento: vi.fn().mockReturnValue(of(configuracionMock)),
      elegirPlantillaDocumento: vi.fn().mockReturnValue(of(configuracionMock)),
      aceptarVersionDocumento: vi.fn().mockReturnValue(
        of({
          ...configuracionMock,
          numeroVersion: 2,
          hayNuevaVersionDisponible: false,
        }),
      ),
    };

    plantillasClientMock = {
      listarPlantillasHojaDeVida: vi.fn().mockReturnValue(of(plantillasMock)),
    };

    archivosClientMock = {
      subirArchivo: vi.fn().mockReturnValue(of({ id: 'nuevo-archivo-id' })),
    };

    await TestBed.configureTestingModule({
      imports: [ConfiguracionDocumentoComponent],
      providers: [
        { provide: ConfiguracionDocumentoClient, useValue: docClientMock },
        { provide: PlantillasHojaDeVidaClient, useValue: plantillasClientMock },
        { provide: ArchivosClient, useValue: archivosClientMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfiguracionDocumentoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe_cargar_configuracion_y_plantillas_al_iniciar', () => {
    expect(component).toBeTruthy();
    expect(plantillasClientMock.listarPlantillasHojaDeVida).toHaveBeenCalledWith(true);
    expect(docClientMock.obtenerConfiguracionDocumento).toHaveBeenCalled();
    expect(component.configuracion()).toBeTruthy();
    expect(component.nombreVisible).toBe('Instituto Superior Tecnológico Ejemplo');
    expect(component.colorPrimario).toBe('#1B365D');
    expect(component.plantillasDisponibles().length).toBe(2);
  });

  it('muestra_alerta_cuando_hay_nueva_version_disponible_y_permite_aceptarla', () => {
    expect(component.configuracion()?.hayNuevaVersionDisponible).toBe(true);

    component.aceptarVersion();
    fixture.detectChanges();

    expect(docClientMock.aceptarVersionDocumento).toHaveBeenCalled();
    expect(component.mensajeExito()).toContain('Nueva versión de la plantilla aceptada');
  });

  it('permite_elegir_otra_plantilla_y_guardar', () => {
    component.plantillaSeleccionadaId = '44444444-4444-4444-4444-444444444444';
    component.guardarPlantilla();
    fixture.detectChanges();

    expect(docClientMock.elegirPlantillaDocumento).toHaveBeenCalledWith({
      plantillaId: '44444444-4444-4444-4444-444444444444',
    });
    expect(component.mensajeExito()).toContain('Plantilla institucional actualizada');
  });

  it('permite_actualizar_la_marca_institucional_con_colores_validos', () => {
    component.nombreVisible = 'Nuevo Nombre Instituto';
    component.colorPrimario = '#003366';
    component.colorSecundario = '#8899AA';
    component.lema = 'Nuevo Lema';
    component.textoCompromiso = 'Nuevo Compromiso';

    component.guardarMarca();
    fixture.detectChanges();

    expect(docClientMock.actualizarMarcaDocumento).toHaveBeenCalledWith(
      expect.objectContaining({
        nombreVisible: 'Nuevo Nombre Instituto',
        colorPrimario: '#003366',
        colorSecundario: '#8899AA',
        lema: 'Nuevo Lema',
      }),
    );
    expect(component.mensajeExito()).toContain('Configuración de marca institucional guardada');
  });

  it('rechaza_guardar_marca_si_el_color_no_es_hexadecimal_valido', () => {
    component.colorPrimario = 'rojo-invalido';
    component.guardarMarca();
    fixture.detectChanges();

    expect(docClientMock.actualizarMarcaDocumento).not.toHaveBeenCalled();
    expect(component.error()).toContain('formato hexadecimal válido');
  });

  it('permite_subir_logo_institucional', () => {
    const mockFile = new File(['dummy'], 'logo.png', { type: 'image/png' });
    const event = {
      target: {
        files: [mockFile],
      },
    } as unknown as Event;

    component.subirLogo(event);
    fixture.detectChanges();

    expect(archivosClientMock.subirArchivo).toHaveBeenCalledWith(
      'marca',
      undefined,
      expect.objectContaining({ fileName: 'logo.png' }),
    );
    expect(component.logoArchivoId).toBe('nuevo-archivo-id');
  });

  it('permite_subir_portada_institucional', () => {
    const mockFile = new File(['dummy'], 'portada.jpg', { type: 'image/jpeg' });
    const event = {
      target: {
        files: [mockFile],
      },
    } as unknown as Event;

    component.subirPortada(event);
    fixture.detectChanges();

    expect(archivosClientMock.subirArchivo).toHaveBeenCalledWith(
      'marca',
      undefined,
      expect.objectContaining({ fileName: 'portada.jpg' }),
    );
    expect(component.portadaArchivoId).toBe('nuevo-archivo-id');
  });

  it('muestra_error_accesible_si_falla_la_carga', () => {
    docClientMock.obtenerConfiguracionDocumento.mockReturnValue(
      throwError(() => ({ message: 'Error de servidor' })),
    );

    component.cargarDatos();
    fixture.detectChanges();

    expect(component.error()).toBeTruthy();
  });
});
