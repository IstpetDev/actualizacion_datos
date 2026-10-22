import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import {
  API_BASE_URL,
  ArchivoDto,
  ArchivosClient,
  AutenticacionClient,
  CatalogosClient,
  CuentaBancariaClient,
  MisDatosClient,
  MisDatosDto,
  SwaggerException,
} from '../../api-client';
import { UsuarioDashboardComponent } from './usuario-dashboard.component';

const ficha: MisDatosDto = {
  id: 'persona-ficticia',
  institucionId: 'institucion-ficticia',
  documento: '0000000000',
  nombre: 'Persona de ejemplo',
  correo: 'usuario@ejemplo.test',
  correoVerificado: true,
  estadoActualizacion: 'Borrador',
  datosPersonalesJson: '{"telefono":"0000000000","adicional":{"conservar":true}}',
  tratamientoDatosAceptado: false,
  fechaAceptacionTratamientoDatosUtc: undefined,
  puedeEditar: true,
  mensajeEstado: 'Campaña abierta',
  observaciones: [],
};
const archivo: ArchivoDto = {
  id: 'archivo-ficticio',
  institucionId: 'institucion-ficticia',
  personaId: ficha.id,
  nombreOriginal: 'documento-ejemplo.pdf',
  tipoContenido: 'application/pdf',
  tamanoBytes: 1024,
  hashSha256: 'hash-de-ejemplo',
  claveDestino: 'documento',
  fechaSubidaUtc: new Date('2026-10-22T10:00:00Z'),
};

describe('panel de usuario', () => {
  const datos = {
    obtenerMisDatos: vi.fn(),
    obtenerEstadoEdicion: vi.fn(),
    actualizarMisDatos: vi.fn(),
    aceptarTratamientoDatos: vi.fn(),
    enviarMisDatosARevision: vi.fn(),
    iniciarNuevaActualizacion: vi.fn(),
  };
  const archivos = { listarMisArchivos: vi.fn(), subirArchivo: vi.fn(), eliminarArchivo: vi.fn() };
  const auth = { enviarCodigoCorreo: vi.fn(), verificarCodigoCorreo: vi.fn() };
  beforeEach(() => {
    vi.clearAllMocks();
    datos.obtenerMisDatos.mockReturnValue(of(structuredClone(ficha)));
    datos.obtenerEstadoEdicion.mockReturnValue(
      of({
        puedeEditar: true,
        mensaje: 'Campaña abierta',
        campanaActiva: {
          nombre: 'Campaña de ejemplo',
          fechaInicioUtc: new Date('2026-10-01'),
          fechaFinUtc: new Date('2026-11-01'),
        },
      }),
    );
    for (const metodo of [
      datos.actualizarMisDatos,
      datos.aceptarTratamientoDatos,
      datos.enviarMisDatosARevision,
      datos.iniciarNuevaActualizacion,
      archivos.eliminarArchivo,
      auth.enviarCodigoCorreo,
      auth.verificarCodigoCorreo,
    ])
      metodo.mockReturnValue(of({ mensaje: 'Operación completada' }));
    archivos.listarMisArchivos.mockReturnValue(of([archivo]));
    archivos.subirArchivo.mockReturnValue(of(archivo));
    TestBed.configureTestingModule({
      imports: [UsuarioDashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
        { provide: MisDatosClient, useValue: datos },
        { provide: ArchivosClient, useValue: archivos },
        { provide: AutenticacionClient, useValue: auth },
        {
          provide: CuentaBancariaClient,
          useValue: {
            obtenerMiCuentaBancaria: () =>
              throwError(() => new SwaggerException('No Content', 204, '', {}, null)),
          },
        },
        { provide: CatalogosClient, useValue: { consultarCatalogo: () => of([]) } },
      ],
    });
  });
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.restoreAllMocks();
  });
  function preparar() {
    const fixture = TestBed.createComponent(UsuarioDashboardComponent);
    fixture.detectChanges();
    return fixture;
  }
  function elegir(componente: UsuarioDashboardComponent, nombre: string, tamano: number) {
    const contenido = new File(['ejemplo'], nombre, { type: 'application/pdf' });
    Object.defineProperty(contenido, 'size', { value: tamano });
    const entrada = { files: [contenido], value: nombre };
    componente.seleccionarArchivo({ target: entrada } as unknown as Event);
    return entrada;
  }
  it('carga_ficha_campana_y_archivos_sin_suplantar_documento', () => {
    const fixture = preparar();
    expect(datos.obtenerMisDatos).toHaveBeenCalledWith();
    expect(archivos.listarMisArchivos).toHaveBeenCalledWith();
    expect(fixture.nativeElement.textContent).toContain('Campaña de ejemplo');
    expect(fixture.nativeElement.textContent).toContain('documento-ejemplo.pdf');
    expect(fixture.componentInstance.aceptaTratamiento).toBe(false);
  });
  it('guarda_campos_sin_perder_propiedades_adicionales', () => {
    const componente = preparar().componentInstance;
    componente.contacto['direccion'] = 'Calle ficticia';
    componente.guardar();
    const json = JSON.parse(datos.actualizarMisDatos.mock.calls[0][0].datosJson);
    expect(json).toEqual({
      telefono: '0000000000',
      direccion: 'Calle ficticia',
      ciudad: '',
      adicional: { conservar: true },
    });
  });
  it('no_sobrescribe_json_previo_ilegible', () => {
    datos.obtenerMisDatos.mockReturnValue(of({ ...ficha, datosPersonalesJson: '{invalido' }));
    const componente = preparar().componentInstance;
    componente.guardar();
    expect(componente.puedeEditar()).toBe(false);
    expect(datos.actualizarMisDatos).not.toHaveBeenCalled();
  });
  it('requiere_aceptacion_explicita_y_correo_verificado', () => {
    const componente = preparar().componentInstance;
    componente.enviar();
    expect(datos.actualizarMisDatos).not.toHaveBeenCalled();
    componente.aceptaTratamiento = true;
    componente.datos.set({ ...ficha, correoVerificado: false });
    componente.enviar();
    expect(datos.enviarMisDatosARevision).not.toHaveBeenCalled();
  });
  it('guarda_acepta_y_envia_en_orden_y_bloquea_la_edicion', () => {
    const pendiente = new Subject<unknown>();
    datos.actualizarMisDatos.mockReturnValue(pendiente);
    const fixture = preparar();
    const componente = fixture.componentInstance;
    componente.aceptaTratamiento = true;
    componente.enviar();
    expect(datos.aceptarTratamientoDatos).not.toHaveBeenCalled();
    expect(datos.enviarMisDatosARevision).not.toHaveBeenCalled();
    componente.enviar();
    expect(datos.actualizarMisDatos).toHaveBeenCalledTimes(1);
    pendiente.next({});
    pendiente.complete();
    expect(datos.aceptarTratamientoDatos).toHaveBeenCalledWith();
    expect(datos.enviarMisDatosARevision).toHaveBeenCalledWith();
    expect(datos.aceptarTratamientoDatos.mock.invocationCallOrder[0]).toBeLessThan(
      datos.enviarMisDatosARevision.mock.invocationCallOrder[0],
    );
    expect(componente.puedeEditar()).toBe(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#telefono').matches(':disabled')).toBe(true);
    expect(fixture.nativeElement.querySelector('[data-testid=estado]').textContent).toBe('Enviado');
  });
  it.each(['guardar', 'aceptar', 'enviar'])('conserva_borrador_si_falla_%s', (paso) => {
    const falla = throwError(() => new Error('Fallo de red'));
    if (paso === 'guardar') datos.actualizarMisDatos.mockReturnValue(falla);
    if (paso === 'aceptar') datos.aceptarTratamientoDatos.mockReturnValue(falla);
    if (paso === 'enviar') datos.enviarMisDatosARevision.mockReturnValue(falla);
    const componente = preparar().componentInstance;
    componente.contacto['ciudad'] = 'Ciudad ficticia';
    componente.aceptaTratamiento = true;
    componente.enviar();
    expect(componente.contacto['ciudad']).toBe('Ciudad ficticia');
    expect(componente.puedeEditar()).toBe(true);
    expect(componente.ocupado()).toBe(false);
    expect(componente.error()).toContain('Tus cambios siguen');
    if (paso !== 'enviar') expect(datos.enviarMisDatosARevision).not.toHaveBeenCalled();
  });
  it('muestra_el_motivo_del_rechazo_de_la_api_sin_perder_el_borrador', () => {
    datos.actualizarMisDatos.mockReturnValue(
      throwError(() => ({ mensaje: 'La campaña terminó.' })),
    );
    const componente = preparar().componentInstance;
    componente.contacto['direccion'] = 'Calle ficticia';
    componente.guardar();
    expect(componente.error()).toBe('La campaña terminó.');
    expect(componente.contacto['direccion']).toBe('Calle ficticia');
  });
  it('no_repite_aceptacion_ya_registrada', () => {
    datos.obtenerMisDatos.mockReturnValue(of({ ...ficha, tratamientoDatosAceptado: true }));
    preparar().componentInstance.enviar();
    expect(datos.aceptarTratamientoDatos).not.toHaveBeenCalled();
    expect(datos.enviarMisDatosARevision).toHaveBeenCalled();
  });
  it.each(['Enviado', 'Aprobado', 'Sin campaña'])('bloquea_mutaciones_en_%s', (estado) => {
    datos.obtenerMisDatos.mockReturnValue(
      of({ ...ficha, estadoActualizacion: estado, puedeEditar: false }),
    );
    const fixture = preparar();
    const componente = fixture.componentInstance;
    componente.aceptaTratamiento = true;
    componente.guardar();
    componente.enviar();
    componente.eliminarArchivo(archivo);
    componente.correo = 'otro@ejemplo.test';
    componente.solicitarCodigo();
    expect(datos.actualizarMisDatos).not.toHaveBeenCalled();
    expect(archivos.eliminarArchivo).not.toHaveBeenCalled();
    expect(auth.enviarCodigoCorreo).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#archivo').matches(':disabled')).toBe(true);
  });
  it('muestra_devolucion_rondas_y_marcas_y_permite_corregir', () => {
    datos.obtenerMisDatos.mockReturnValue(
      of({
        ...ficha,
        estadoActualizacion: 'Devuelto',
        observaciones: [
          {
            id: 'ronda-ficticia',
            ronda: 1,
            autor: 'Supervisor de ejemplo',
            fechaUtc: new Date(),
            texto: 'Corrige el teléfono',
            marcas: [
              {
                id: 'marca-ficticia',
                tipoDestino: 'campo',
                claveDestino: 'telefono',
                texto: 'Revisa este dato',
              },
            ],
          },
        ],
      }),
    );
    const fixture = preparar();
    expect(fixture.nativeElement.textContent).toContain('Corrige el teléfono');
    expect(fixture.nativeElement.querySelector('#observacion-telefono').textContent).toContain(
      'Revisa este dato',
    );
    expect(fixture.componentInstance.puedeEditar()).toBe(true);
  });
  it('permite_reintentar_una_carga_fallida', () => {
    datos.obtenerMisDatos.mockReturnValueOnce(throwError(() => new Error()));
    const fixture = preparar();
    expect(fixture.nativeElement.textContent).toContain('Reintentar carga');
    fixture.nativeElement.querySelector('button').click();
    expect(fixture.componentInstance.datos()?.documento).toBe('0000000000');
  });
  it('solicita_reenvia_y_verifica_codigo_sin_perder_el_contacto', () => {
    const componente = preparar().componentInstance;
    componente.contacto['ciudad'] = 'Ciudad ficticia';
    componente.correo = 'nuevo@ejemplo.test';
    componente.solicitarCodigo();
    componente.solicitarCodigo();
    expect(auth.enviarCodigoCorreo).toHaveBeenCalledTimes(2);
    expect(auth.enviarCodigoCorreo).toHaveBeenCalledWith({ correo: 'nuevo@ejemplo.test' });
    expect(componente.correoConfirmado).toBe(false);
    componente.codigo = '123';
    componente.verificarCorreo();
    expect(auth.verificarCodigoCorreo).not.toHaveBeenCalled();
    componente.codigo = '123456';
    componente.verificarCorreo();
    expect(auth.verificarCodigoCorreo).toHaveBeenCalledWith({ codigo: '123456' });
    expect(componente.correoConfirmado).toBe(true);
    expect(componente.contacto['ciudad']).toBe('Ciudad ficticia');
  });
  it('un_codigo_rechazado_no_verifica_el_correo', () => {
    auth.verificarCodigoCorreo.mockReturnValue(throwError(() => new Error()));
    const componente = preparar().componentInstance;
    componente.solicitarCodigo();
    componente.codigo = '123456';
    componente.verificarCorreo();
    expect(componente.correoConfirmado).toBe(false);
    expect(componente.codigo).toBe('123456');
  });
  it.each([
    [5, true],
    [10, true],
    [10.01, false],
  ])('aplica_el_limite_de_%s_MB', (mb, permitido) => {
    const componente = preparar().componentInstance;
    elegir(componente, 'ejemplo.pdf', Number(mb) * 1024 * 1024);
    expect(!!componente.archivoSeleccionado()).toBe(permitido);
    if (permitido) expect(componente.avisoArchivo()).toContain('5 MB');
  });
  it.each(['ejemplo.exe', 'ejemplo.svg'])('rechaza_el_tipo_%s', (nombre) => {
    const componente = preparar().componentInstance;
    elegir(componente, nombre, 1024);
    componente.subirArchivo();
    expect(archivos.subirArchivo).not.toHaveBeenCalled();
  });
  it('sube_y_elimina_archivos_con_clave_sin_documento_ajeno', () => {
    const componente = preparar().componentInstance;
    elegir(componente, 'ejemplo.png', 1024);
    componente.claveDocumento = 'documento';
    const entrada = { value: 'ejemplo.png' } as HTMLInputElement;
    componente.subirArchivo(entrada);
    expect(entrada.value).toBe('');
    expect(archivos.subirArchivo).toHaveBeenCalledWith(
      'documento',
      undefined,
      expect.objectContaining({ fileName: 'ejemplo.png' }),
    );
    componente.eliminarArchivo(archivo);
    expect(archivos.eliminarArchivo).toHaveBeenCalledWith(archivo.id);
    expect(componente.archivos()).toHaveLength(0);
  });
  it('descarga_binarios_en_lugar_de_descartar_el_cuerpo', () => {
    const crear = vi.fn(() => 'blob:ejemplo');
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: crear });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const componente = preparar().componentInstance;
    componente.descargarArchivo(archivo);
    const peticion = TestBed.inject(HttpTestingController).expectOne(
      '/api/api/archivos/archivo-ficticio/descargar',
    );
    expect(peticion.request.responseType).toBe('blob');
    peticion.flush(new Blob(['%PDF-ejemplo'], { type: 'application/pdf' }));
    expect(crear).toHaveBeenCalledWith(expect.any(Blob));
    expect(clic).toHaveBeenCalled();
  });
  describe('segunda_campana_PD_HDV_04', () => {
    const aprobadoConCampana = {
      puedeEditar: false,
      puedeIniciarNuevaActualizacion: true,
      mensaje: 'Su información ya ha sido aprobada.',
      campanaActiva: {
        nombre: 'Campaña de ejemplo',
        fechaInicioUtc: new Date('2026-10-01'),
        fechaFinUtc: new Date('2026-11-01'),
      },
    };
    beforeEach(() => {
      datos.obtenerMisDatos.mockReturnValue(
        of({ ...ficha, estadoActualizacion: 'Aprobado', puedeEditar: false }),
      );
    });
    it('oculta_el_boton_si_la_api_no_lo_permite', () => {
      datos.obtenerEstadoEdicion.mockReturnValue(
        of({ ...aprobadoConCampana, puedeIniciarNuevaActualizacion: false }),
      );
      const fixture = preparar();
      expect(fixture.nativeElement.querySelector('[data-testid=iniciar-actualizacion]')).toBeNull();
      fixture.componentInstance.iniciarNuevaActualizacion();
      expect(datos.iniciarNuevaActualizacion).not.toHaveBeenCalled();
    });
    it('reabre_la_actualizacion_y_habilita_la_edicion', () => {
      datos.obtenerEstadoEdicion.mockReturnValue(of(aprobadoConCampana));
      const fixture = preparar();
      const componente = fixture.componentInstance;
      expect(componente.puedeEditar()).toBe(false);
      const boton = fixture.nativeElement.querySelector('[data-testid=iniciar-actualizacion]');
      expect(boton.textContent).toContain('Actualizar mis datos');
      boton.click();
      fixture.detectChanges();
      expect(datos.iniciarNuevaActualizacion).toHaveBeenCalledWith();
      expect(componente.puedeEditar()).toBe(true);
      expect(fixture.nativeElement.querySelector('[data-testid=estado]').textContent).toBe(
        'Borrador',
      );
      expect(fixture.nativeElement.querySelector('[data-testid=iniciar-actualizacion]')).toBeNull();
      expect(fixture.nativeElement.querySelector('#telefono').matches(':disabled')).toBe(false);
    });
    it('si_la_api_rechaza_conserva_el_estado_aprobado_y_muestra_el_motivo', () => {
      datos.obtenerEstadoEdicion.mockReturnValue(of(aprobadoConCampana));
      datos.iniciarNuevaActualizacion.mockReturnValue(
        throwError(() => ({
          mensaje: 'No se permite iniciar una nueva actualización fuera del período.',
        })),
      );
      const componente = preparar().componentInstance;
      componente.iniciarNuevaActualizacion();
      expect(componente.error()).toContain('fuera del período');
      expect(componente.puedeEditar()).toBe(false);
      expect(componente.datos()?.estadoActualizacion).toBe('Aprobado');
    });
  });
});
