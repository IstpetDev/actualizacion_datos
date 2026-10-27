import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { type Mock, vi } from 'vitest';
import {
  MensajeRespuesta,
  PlantillaDetalleDto,
  PlantillaResumenDto,
  PlantillasHojaDeVidaClient,
  VersionPlantillaDto,
} from '../../api-client';
import { PlantillasHojaDeVidaComponent } from './plantillas-hoja-de-vida.component';

describe('PlantillasHojaDeVidaComponent', () => {
  let component: PlantillasHojaDeVidaComponent;
  let fixture: ComponentFixture<PlantillasHojaDeVidaComponent>;
  let clientMock: {
    listarPlantillasHojaDeVida: Mock;
    obtenerPlantillaHojaDeVida: Mock;
    crearPlantillaHojaDeVida: Mock;
    actualizarPlantillaHojaDeVida: Mock;
    publicarVersionPlantilla: Mock;
    marcarPlantillaPredeterminada: Mock;
  };

  const plantillaMock: PlantillaResumenDto = {
    id: '11111111-1111-1111-1111-111111111111',
    nombre: 'Plantilla Clásica',
    descripcion: 'Diseño tradicional',
    disenoBase: 'clasico',
    esPredeterminada: true,
    totalVersiones: 1,
    ultimaVersionPublicada: 1,
    fechaCreacionUtc: new Date('2026-10-01T00:00:00Z'),
    fechaActualizacionUtc: new Date('2026-10-01T00:00:00Z'),
  };

  const detalleMock: PlantillaDetalleDto = {
    id: '11111111-1111-1111-1111-111111111111',
    nombre: 'Plantilla Clásica',
    descripcion: 'Diseño tradicional',
    disenoBase: 'clasico',
    esPredeterminada: true,
    fechaCreacionUtc: new Date('2026-10-01T00:00:00Z'),
    fechaActualizacionUtc: new Date('2026-10-01T00:00:00Z'),
    configuracionBorrador: {
      disenoBase: 'clasico',
      secciones: [{ codigoSeccion: 'portada', mostrarSiVacia: false, campos: ['nombre_completo'] }],
    },
    versiones: [
      {
        id: '22222222-2222-2222-2222-222222222222',
        plantillaId: '11111111-1111-1111-1111-111111111111',
        numeroVersion: 1,
        disenoBase: 'clasico',
        configuracion: {
          disenoBase: 'clasico',
          secciones: [],
        },
        descripcionCambio: 'Versión inicial',
        fechaPublicacionUtc: new Date('2026-10-01T00:00:00Z'),
      },
    ],
  };

  beforeEach(async () => {
    clientMock = {
      listarPlantillasHojaDeVida: vi.fn().mockReturnValue(of([plantillaMock])),
      obtenerPlantillaHojaDeVida: vi.fn().mockReturnValue(of(detalleMock)),
      crearPlantillaHojaDeVida: vi.fn().mockReturnValue(of(detalleMock)),
      actualizarPlantillaHojaDeVida: vi.fn().mockReturnValue(of(detalleMock)),
      publicarVersionPlantilla: vi.fn().mockReturnValue(
        of({
          id: '33333333-3333-3333-3333-333333333333',
          plantillaId: '11111111-1111-1111-1111-111111111111',
          numeroVersion: 2,
          disenoBase: 'clasico',
          configuracion: {
            disenoBase: 'clasico',
            secciones: [],
          },
          descripcionCambio: 'Versión 2',
          fechaPublicacionUtc: new Date(),
        } as unknown as VersionPlantillaDto),
      ),
      marcarPlantillaPredeterminada: vi.fn().mockReturnValue(
        of({
          mensaje: 'Plantilla marcada como predeterminada exitosamente.',
        } as MensajeRespuesta),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [PlantillasHojaDeVidaComponent],
      providers: [{ provide: PlantillasHojaDeVidaClient, useValue: clientMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(PlantillasHojaDeVidaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe_listar_plantillas_al_iniciar', () => {
    expect(component).toBeTruthy();
    expect(clientMock.listarPlantillasHojaDeVida).toHaveBeenCalled();
    expect(component.plantillas().length).toBe(1);
    expect(component.plantillas()[0].nombre).toBe('Plantilla Clásica');
  });

  it('permite_crear_una_nueva_plantilla_con_configuracion_valida', () => {
    component.nuevoNombre = 'Nueva Plantilla 2026';
    component.nuevaDescripcion = 'Descripción prueba';
    component.nuevoDisenoBase = 'clasico';
    component.nuevaConfiguracionJson = JSON.stringify({
      disenoBase: 'clasico',
      secciones: [],
    });

    component.crearPlantilla();
    fixture.detectChanges();

    expect(clientMock.crearPlantillaHojaDeVida).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: 'Nueva Plantilla 2026',
        disenoBase: 'clasico',
      }),
    );
    expect(component.mensajeExito()).toContain('creada correctamente');
  });

  it('rechaza_creacion_si_el_json_es_invalido', () => {
    component.nuevoNombre = 'Plantilla Invalida';
    component.nuevaConfiguracionJson = '{ json no valido ';

    component.crearPlantilla();
    fixture.detectChanges();

    expect(clientMock.crearPlantillaHojaDeVida).not.toHaveBeenCalled();
    expect(component.error()).toContain('no es un JSON válido');
  });

  it('permite_seleccionar_y_ver_detalle_de_plantilla', () => {
    component.seleccionarPlantilla('11111111-1111-1111-1111-111111111111');
    fixture.detectChanges();

    expect(clientMock.obtenerPlantillaHojaDeVida).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
    );
    expect(component.plantillaSeleccionada()).toBeTruthy();
    expect(component.editNombre).toBe('Plantilla Clásica');
    expect(component.plantillaSeleccionada()?.versiones.length).toBe(1);
  });

  it('permite_actualizar_borrador_de_plantilla', () => {
    component.seleccionarPlantilla('11111111-1111-1111-1111-111111111111');
    component.editNombre = 'Plantilla Clásica Modificada';
    component.editConfiguracionJson = JSON.stringify({
      disenoBase: 'clasico',
      secciones: [{ codigo: 'portada', mostrarSiVacia: true, campos: ['nombre_completo'] }],
    });

    component.actualizarBorrador('11111111-1111-1111-1111-111111111111');
    fixture.detectChanges();

    expect(clientMock.actualizarPlantillaHojaDeVida).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
      expect.objectContaining({
        nombre: 'Plantilla Clásica Modificada',
      }),
    );
    expect(component.mensajeExito()).toContain('Borrador de plantilla actualizado');
  });

  it('permite_publicar_nueva_version', () => {
    component.seleccionarPlantilla('11111111-1111-1111-1111-111111111111');
    component.descripcionCambio = 'Ajuste de colores y portada';

    component.publicarVersion('11111111-1111-1111-1111-111111111111');
    fixture.detectChanges();

    expect(clientMock.publicarVersionPlantilla).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
      { descripcionCambio: 'Ajuste de colores y portada' },
    );
    expect(component.mensajeExito()).toContain('publicada exitosamente');
  });

  it('permite_marcar_plantilla_como_predeterminada', () => {
    component.marcarPredeterminada('11111111-1111-1111-1111-111111111111');
    fixture.detectChanges();

    expect(clientMock.marcarPlantillaPredeterminada).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
    );
    expect(component.mensajeExito()).toContain('marcada como predeterminada');
  });

  it('muestra_error_accesible_si_falla_la_peticion', () => {
    clientMock.listarPlantillasHojaDeVida.mockReturnValue(
      throwError(() => ({ message: 'Error de servidor' })),
    );

    component.cargarPlantillas();
    fixture.detectChanges();

    expect(component.error()).toBeTruthy();
  });
});
