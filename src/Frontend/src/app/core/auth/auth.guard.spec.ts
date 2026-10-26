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
    auth.verificarSesion.mockReturnValue(of({ rol: 'usuario', debeCambiarContrasena: false }));
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
});
