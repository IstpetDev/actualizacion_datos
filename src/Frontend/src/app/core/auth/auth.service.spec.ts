import { TestBed } from '@angular/core/testing';
import { Rol, SesionUsuario } from './auth.models';
import { AutenticacionClient } from '../../api-client';
import { AuthService } from './auth.service';

const CLAVE_STORAGE_SESION = 'istpet_actualizacion_datos_sesion';

describe('AuthService', () => {
  const sesionMock: SesionUsuario = {
    id: 'usr-1',
    cedula: '1700000000',
    nombre: 'Docente de Prueba',
    rol: 'usuario',
    institucionId: 'inst-1',
    token: 'jwt-token-ficticio',
  };

  beforeEach(() => {
    window.sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [{ provide: AutenticacionClient, useValue: {} }] });
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it('inicia_sin_sesion_cuando_storage_esta_vacio', () => {
    const service = TestBed.inject(AuthService);

    expect(service.sesion()).toBeNull();
    expect(service.estaAutenticado()).toBe(false);
    expect(service.rolActual()).toBeNull();
  });

  it('iniciarSesion_establece_estado_y_persiste_en_storage', () => {
    const service = TestBed.inject(AuthService);

    service.iniciarSesion(sesionMock);

    expect(service.sesion()).toEqual(sesionMock);
    expect(service.estaAutenticado()).toBe(true);
    expect(service.rolActual()).toBe('usuario');

    const persistido = window.sessionStorage.getItem(CLAVE_STORAGE_SESION);
    expect(persistido).not.toBeNull();
    expect(JSON.parse(persistido!)).toEqual(sesionMock);
  });

  it('iniciarSesion_rechaza_rol_invalido', () => {
    const service = TestBed.inject(AuthService);
    const sesionInvalida = {
      ...sesionMock,
      rol: 'rol_inexistente' as unknown as Rol,
    };

    expect(() => service.iniciarSesion(sesionInvalida)).toThrow();
  });

  it('cerrarSesion_limpia_estado_y_remueve_de_storage', () => {
    const service = TestBed.inject(AuthService);
    service.iniciarSesion(sesionMock);

    service.cerrarSesion();

    expect(service.sesion()).toBeNull();
    expect(service.estaAutenticado()).toBe(false);
    expect(service.rolActual()).toBeNull();
    expect(window.sessionStorage.getItem(CLAVE_STORAGE_SESION)).toBeNull();
  });

  it('tieneRol_retorna_true_si_coincide_con_rol_unico_o_lista', () => {
    const service = TestBed.inject(AuthService);
    service.iniciarSesion(sesionMock);

    expect(service.tieneRol('usuario')).toBe(true);
    expect(service.tieneRol(['usuario', 'admin'])).toBe(true);
    expect(service.tieneRol('admin')).toBe(false);
    expect(service.tieneRol(['supervisor', 'superadmin'])).toBe(false);
  });

  it('tieneRol_retorna_false_si_no_esta_autenticado', () => {
    const service = TestBed.inject(AuthService);

    expect(service.tieneRol('usuario')).toBe(false);
    expect(service.tieneRol(['usuario', 'admin'])).toBe(false);
  });

  it('actualizarToken_modifica_token_en_sesion_activa', () => {
    const service = TestBed.inject(AuthService);
    service.iniciarSesion(sesionMock);

    service.actualizarToken('nuevo-token-ficticio');

    expect(service.sesion()?.token).toBe('nuevo-token-ficticio');
  });

  it('actualizarToken_no_hace_nada_si_no_hay_sesion', () => {
    const service = TestBed.inject(AuthService);

    service.actualizarToken('nuevo-token');

    expect(service.sesion()).toBeNull();
  });

  it('recupera_sesion_valida_desde_sessionStorage_al_instanciar', () => {
    window.sessionStorage.setItem(CLAVE_STORAGE_SESION, JSON.stringify(sesionMock));

    const service = TestBed.inject(AuthService);

    expect(service.estaAutenticado()).toBe(true);
    expect(service.rolActual()).toBe('usuario');
    expect(service.sesion()?.cedula).toBe('1700000000');
  });

  it('purga_sessionStorage_si_los_datos_estan_corruptos', () => {
    window.sessionStorage.setItem(CLAVE_STORAGE_SESION, '{"datos":"corruptos"}');

    const service = TestBed.inject(AuthService);

    expect(service.estaAutenticado()).toBe(false);
    expect(window.sessionStorage.getItem(CLAVE_STORAGE_SESION)).toBeNull();
  });
});
