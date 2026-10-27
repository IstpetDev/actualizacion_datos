import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import {
  AutenticacionClient,
  EstadoProteccionDatosDto,
  ProteccionDatosClient,
} from '../../api-client';
import { AuthService } from '../../core/auth';
import { AvisoProteccionDatosComponent } from './aviso-proteccion-datos.component';

const pendiente: EstadoProteccionDatosDto = {
  aceptado: false,
  fechaAceptacionUtc: undefined,
  aviso: {
    id: '00000000-0000-0000-0000-000000000010',
    version: 'ficticia-1',
    titulo: 'Aviso Ficticio de Prueba',
    responsable: 'Institución Ficticia',
    contenido: 'CONTENIDO FICTICIO\n<script>contenido que debe mostrarse como texto</script>',
    declaracionAceptacion: 'Declaración ficticia exclusiva de pruebas',
    fuenteOficial: 'https://institucion.ejemplo.test/avisos',
    vigenteDesdeUtc: new Date('2026-10-27T12:00:00Z'),
    vigenteHastaUtc: undefined,
  },
};

describe('aviso de protección de datos al acceder', () => {
  const cliente = { obtenerAvisoProteccionDatos: vi.fn(), aceptarTratamientoDatos: vi.fn() };
  const autenticacion = { cerrarSesion: vi.fn() };
  const auth = { verificarSesion: vi.fn(), cerrarSesion: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    cliente.obtenerAvisoProteccionDatos.mockReturnValue(of(structuredClone(pendiente)));
    cliente.aceptarTratamientoDatos.mockReturnValue(of({ ...pendiente, aceptado: true }));
    autenticacion.cerrarSesion.mockReturnValue(of({ mensaje: 'Sesión cerrada' }));
    auth.verificarSesion.mockReturnValue(
      of({ rol: 'usuario', requiereAceptarProteccionDatos: false }),
    );
    TestBed.configureTestingModule({
      imports: [AvisoProteccionDatosComponent],
      providers: [
        provideRouter([]),
        { provide: ProteccionDatosClient, useValue: cliente },
        { provide: AutenticacionClient, useValue: autenticacion },
        { provide: AuthService, useValue: auth },
      ],
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  function preparar() {
    const fixture = TestBed.createComponent(AvisoProteccionDatosComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('muestra_contenido_completo_y_version_sin_marcar_ni_interpretar_HTML', () => {
    const fixture = preparar();
    const elemento = fixture.nativeElement as HTMLElement;
    expect((elemento.querySelector('#aceptar-aviso') as HTMLInputElement).checked).toBe(false);
    expect((elemento.querySelector('button[type=submit]') as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(elemento.textContent).toContain('ficticia-1');
    expect(elemento.textContent).toContain('<script>');
    expect(elemento.querySelector('script')).toBeNull();
    expect(elemento.querySelector('label[for=aceptar-aviso]')?.textContent).toContain(
      'Declaración ficticia',
    );
    fixture.componentInstance.aceptar();
    expect(cliente.aceptarTratamientoDatos).not.toHaveBeenCalled();
  });

  it('envia_version_y_confirmacion_explicita_y_espera_a_la_sesion_del_servidor', () => {
    const respuesta = new Subject<EstadoProteccionDatosDto>();
    const sesion = new Subject<{ rol: string; requiereAceptarProteccionDatos: boolean }>();
    cliente.aceptarTratamientoDatos.mockReturnValue(respuesta);
    auth.verificarSesion.mockReturnValue(sesion);
    const componente = preparar().componentInstance;
    componente.acepta = true;
    componente.aceptar();
    componente.aceptar();
    expect(cliente.aceptarTratamientoDatos).toHaveBeenCalledTimes(1);
    expect(cliente.aceptarTratamientoDatos).toHaveBeenCalledWith({
      avisoId: pendiente.aviso!.id,
      acepta: true,
    });
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
    respuesta.next({ ...pendiente, aceptado: true });
    expect(auth.verificarSesion).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
    sesion.next({ rol: 'usuario', requiereAceptarProteccionDatos: false });
    sesion.complete();
    respuesta.complete();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/usuario']);
    expect(componente.ocupado()).toBe(false);
  });

  it('rechazar_cierra_cookie_sin_aceptar_y_reingresar_empieza_desmarcado', () => {
    const componente = preparar().componentInstance;
    componente.salir();
    expect(autenticacion.cerrarSesion).toHaveBeenCalledTimes(1);
    expect(auth.cerrarSesion).toHaveBeenCalledTimes(1);
    expect(cliente.aceptarTratamientoDatos).not.toHaveBeenCalled();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/login']);
    expect(preparar().componentInstance.acepta).toBe(false);
  });

  it('permite_reintentar_o_salir_si_falla_la_carga_sin_mostrar_aceptacion', () => {
    cliente.obtenerAvisoProteccionDatos.mockReturnValueOnce(
      throwError(() => ({ mensaje: 'Aviso no disponible' })),
    );
    const fixture = preparar();
    expect(fixture.nativeElement.querySelector('#aceptar-aviso')).toBeNull();
    expect(fixture.componentInstance.error()).toContain('Aviso no disponible');
    fixture.componentInstance.aceptar();
    expect(cliente.aceptarTratamientoDatos).not.toHaveBeenCalled();
    fixture.componentInstance.cargar();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#aceptar-aviso')).toBeTruthy();
    expect(fixture.componentInstance.acepta).toBe(false);
  });

  it('fallar_al_guardar_no_marca_aceptado_ni_continua', () => {
    cliente.aceptarTratamientoDatos.mockReturnValue(
      throwError(() => ({ mensaje: 'Fallo ficticio al guardar' })),
    );
    const componente = preparar().componentInstance;
    componente.acepta = true;
    componente.aceptar();
    expect(componente.acepta).toBe(false);
    expect(componente.estado()?.aceptado).toBe(false);
    expect(componente.error()).toContain('Fallo ficticio');
    expect(auth.verificarSesion).not.toHaveBeenCalled();
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });

  it('ante_respuesta_perdida_consulta_estado_persistido_al_reintentar_sin_aceptar_dos_veces', () => {
    cliente.aceptarTratamientoDatos.mockReturnValue(throwError(() => ({ status: 0 })));
    const componente = preparar().componentInstance;
    componente.acepta = true;
    componente.aceptar();
    cliente.obtenerAvisoProteccionDatos.mockReturnValue(of({ ...pendiente, aceptado: true }));
    componente.cargar();
    expect(cliente.aceptarTratamientoDatos).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/usuario']);
  });

  it('cambio_de_version_recarga_el_aviso_y_exige_otra_decision', () => {
    const nuevo = {
      ...pendiente,
      aviso: { ...pendiente.aviso!, id: 'aviso-ficticio-2', version: 'ficticia-2' },
    };
    cliente.obtenerAvisoProteccionDatos
      .mockReturnValueOnce(of(pendiente))
      .mockReturnValueOnce(of(nuevo));
    cliente.aceptarTratamientoDatos.mockReturnValue(
      throwError(() => ({ codigo: 'VERSION_AVISO_CAMBIADA', mensaje: 'El aviso cambió' })),
    );
    const componente = preparar().componentInstance;
    componente.acepta = true;
    componente.aceptar();
    expect(componente.estado()?.aviso?.version).toBe('ficticia-2');
    expect(componente.acepta).toBe(false);
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });

  it('una_aceptacion_vigente_no_se_solicita_de_nuevo', () => {
    cliente.obtenerAvisoProteccionDatos.mockReturnValue(of({ ...pendiente, aceptado: true }));
    preparar();
    expect(cliente.aceptarTratamientoDatos).not.toHaveBeenCalled();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/usuario']);
  });

  it('si_falla_logout_permanece_en_el_flujo_y_permite_reintentar', () => {
    autenticacion.cerrarSesion.mockReturnValue(throwError(() => new Error('Fallo ficticio')));
    const componente = preparar().componentInstance;
    componente.salir();
    expect(componente.ocupado()).toBe(false);
    expect(auth.cerrarSesion).not.toHaveBeenCalled();
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });

  it('superadmin_sin_aviso_institucional_redirige_al_panel_global_al_consultar_o_recargar', () => {
    cliente.obtenerAvisoProteccionDatos.mockReturnValue(
      of({ aceptado: true, aviso: undefined, fechaAceptacionUtc: undefined }),
    );
    auth.verificarSesion.mockReturnValue(
      of({
        rol: 'superadmin',
        debeCambiarContrasena: false,
        requiereAceptarProteccionDatos: false,
      }),
    );
    const fixture = preparar();
    expect(fixture.nativeElement.querySelector('#aceptar-aviso')).toBeNull();
    expect(cliente.aceptarTratamientoDatos).not.toHaveBeenCalled();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/superadmin']);
  });
});
