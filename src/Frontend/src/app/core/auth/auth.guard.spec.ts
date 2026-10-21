import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authGuard, publicGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard y publicGuard', () => {
  let authServiceMock: {
    estaAutenticado: () => boolean;
  };
  let router: Router;
  const dummyRoute = {} as ActivatedRouteSnapshot;
  const dummyState = {} as RouterStateSnapshot;

  beforeEach(() => {
    authServiceMock = {
      estaAutenticado: () => false,
    };

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    });

    router = TestBed.inject(Router);
  });

  describe('authGuard', () => {
    it('permite_acceso_si_el_usuario_esta_autenticado', () => {
      authServiceMock.estaAutenticado = () => true;

      const resultado = TestBed.runInInjectionContext(() => authGuard(dummyRoute, dummyState));

      expect(resultado).toBe(true);
    });

    it('redirige_a_login_si_el_usuario_no_esta_autenticado', () => {
      authServiceMock.estaAutenticado = () => false;

      const resultado = TestBed.runInInjectionContext(() =>
        authGuard(dummyRoute, dummyState),
      ) as UrlTree;

      expect(resultado instanceof UrlTree).toBe(true);
      expect(router.serializeUrl(resultado)).toBe('/login');
    });
  });

  describe('publicGuard', () => {
    it('permite_acceso_a_rutas_publicas_si_no_esta_autenticado', () => {
      authServiceMock.estaAutenticado = () => false;

      const resultado = TestBed.runInInjectionContext(() => publicGuard(dummyRoute, dummyState));

      expect(resultado).toBe(true);
    });

    it('redirige_a_raiz_si_el_usuario_ya_esta_autenticado', () => {
      authServiceMock.estaAutenticado = () => true;

      const resultado = TestBed.runInInjectionContext(() =>
        publicGuard(dummyRoute, dummyState),
      ) as UrlTree;

      expect(resultado instanceof UrlTree).toBe(true);
      expect(router.serializeUrl(resultado)).toBe('/');
    });
  });
});
