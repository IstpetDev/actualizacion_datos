import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Rol } from './auth.models';
import { AuthService } from './auth.service';
import { roleGuard } from './role.guard';

describe('roleGuard', () => {
  let authServiceMock: {
    estaAutenticado: () => boolean;
    tieneRol: (roles: readonly Rol[] | Rol) => boolean;
  };
  let router: Router;
  const dummyRoute = {} as ActivatedRouteSnapshot;
  const dummyState = {} as RouterStateSnapshot;

  beforeEach(() => {
    authServiceMock = {
      estaAutenticado: () => false,
      tieneRol: () => false,
    };

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    });

    router = TestBed.inject(Router);
  });

  it('redirige_a_login_si_el_usuario_no_esta_autenticado', () => {
    authServiceMock.estaAutenticado = () => false;

    const guarda = roleGuard('admin');
    const resultado = TestBed.runInInjectionContext(() =>
      guarda(dummyRoute, dummyState),
    ) as UrlTree;

    expect(resultado instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(resultado)).toBe('/login');
  });

  it('permite_acceso_si_el_usuario_posee_el_rol_requerido', () => {
    authServiceMock.estaAutenticado = () => true;
    authServiceMock.tieneRol = (roles) =>
      roles === 'admin' || (Array.isArray(roles) && roles.includes('admin'));

    const guarda = roleGuard('admin');
    const resultado = TestBed.runInInjectionContext(() => guarda(dummyRoute, dummyState));

    expect(resultado).toBe(true);
  });

  it('permite_acceso_si_el_usuario_posee_uno_de_los_roles_permitidos_en_lista', () => {
    authServiceMock.estaAutenticado = () => true;
    authServiceMock.tieneRol = (roles) => Array.isArray(roles) && roles.includes('supervisor');

    const guarda = roleGuard(['admin', 'supervisor']);
    const resultado = TestBed.runInInjectionContext(() => guarda(dummyRoute, dummyState));

    expect(resultado).toBe(true);
  });

  it('redirige_a_no_autorizado_si_el_usuario_esta_autenticado_pero_no_tiene_el_rol', () => {
    authServiceMock.estaAutenticado = () => true;
    authServiceMock.tieneRol = () => false;

    const guarda = roleGuard(['admin', 'superadmin']);
    const resultado = TestBed.runInInjectionContext(() =>
      guarda(dummyRoute, dummyState),
    ) as UrlTree;

    expect(resultado instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(resultado)).toBe('/no-autorizado');
  });
});
