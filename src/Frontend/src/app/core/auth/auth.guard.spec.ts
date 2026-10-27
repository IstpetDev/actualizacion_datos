import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { authGuard, publicGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('guards de sesión del servidor', () => {
  const auth = { verificarSesion: vi.fn(), cerrarSesion: vi.fn() };
  const ruta = {} as ActivatedRouteSnapshot;
  beforeEach(() => {
    vi.clearAllMocks();
    auth.verificarSesion.mockReturnValue(
      of({ rol: 'usuario', debeCambiarContrasena: false, requiereAceptarProteccionDatos: false }),
    );
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: auth }] });
  });
  async function comprobar(guardia: typeof authGuard, url = '/usuario') {
    const resultado = await TestBed.runInInjectionContext(() =>
      firstValueFrom(
        guardia(ruta, { url } as RouterStateSnapshot) as Observable<boolean | UrlTree>,
      ),
    );
    return resultado instanceof UrlTree
      ? TestBed.inject(Router).serializeUrl(resultado)
      : resultado;
  }
  it('consulta_al_servidor_antes_de_permitir_el_acceso', async () => {
    expect(await comprobar(authGuard)).toBe(true);
    expect(auth.verificarSesion).toHaveBeenCalled();
  });
  it('redirige_a_login_si_la_cookie_caduco', async () => {
    auth.verificarSesion.mockReturnValue(throwError(() => new Error()));
    expect(await comprobar(authGuard)).toBe('/login');
    expect(auth.cerrarSesion).toHaveBeenCalled();
  });
  it('exige_cambio_de_clave_y_permite_su_ruta', async () => {
    auth.verificarSesion.mockReturnValue(of({ debeCambiarContrasena: true }));
    expect(await comprobar(authGuard)).toBe('/cambiar-clave');
    expect(await comprobar(authGuard, '/cambiar-clave')).toBe(true);
  });
  it('login_redirige_al_rol_real_o_al_cambio_obligatorio', async () => {
    expect(await comprobar(publicGuard)).toBe('/usuario');
    auth.verificarSesion.mockReturnValue(of({ debeCambiarContrasena: true }));
    expect(await comprobar(publicGuard)).toBe('/cambiar-clave');
  });
  it('permite_login_sin_cookie_valida', async () => {
    auth.verificarSesion.mockReturnValue(throwError(() => new Error()));
    expect(await comprobar(publicGuard)).toBe(true);
  });
  it('restringe_navegacion_directa_y_login_al_aviso_pendiente', async () => {
    auth.verificarSesion.mockReturnValue(
      of({ rol: 'usuario', requiereAceptarProteccionDatos: true }),
    );
    expect(await comprobar(authGuard, '/usuario')).toBe('/proteccion-datos');
    expect(await comprobar(authGuard, '/no-autorizado')).toBe('/proteccion-datos');
    expect(await comprobar(authGuard, '/proteccion-datos')).toBe(true);
    expect(await comprobar(publicGuard)).toBe('/proteccion-datos');
  });
  it('una_respuesta_sin_estado_de_aceptacion_no_habilita_el_acceso', async () => {
    auth.verificarSesion.mockReturnValue(of({ rol: 'usuario' }));
    expect(await comprobar(authGuard)).toBe('/proteccion-datos');
  });
  it('al_fallar_el_estado_dirige_al_aviso_con_reintento_y_logout', async () => {
    auth.verificarSesion.mockReturnValue(throwError(() => ({ status: 503 })));
    expect(await comprobar(authGuard)).toBe('/proteccion-datos');
    expect(await comprobar(authGuard, '/proteccion-datos')).toBe(true);
    expect(auth.cerrarSesion).not.toHaveBeenCalled();
  });
  it('permite_acceso_directo_a_superadmin_sin_aviso_y_redirige_fuera_de_proteccion_datos', async () => {
    auth.verificarSesion.mockReturnValue(
      of({
        rol: 'superadmin',
        debeCambiarContrasena: false,
        requiereAceptarProteccionDatos: false,
      }),
    );
    expect(await comprobar(authGuard, '/superadmin')).toBe(true);
    expect(await comprobar(authGuard, '/proteccion-datos')).toBe('/superadmin');
    expect(await comprobar(publicGuard)).toBe('/superadmin');
  });
});
