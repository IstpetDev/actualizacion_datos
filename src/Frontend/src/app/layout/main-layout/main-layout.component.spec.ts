import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService, Rol, SesionUsuario } from '../../core/auth';
import { MainLayoutComponent } from './main-layout.component';

describe('MainLayoutComponent', () => {
  let authServiceMock: {
    sesion: () => SesionUsuario | null;
    tieneRol: (roles: readonly Rol[] | Rol) => boolean;
    cerrarSesion: () => void;
  };
  let router: Router;

  const sesionAdmin: SesionUsuario = {
    id: 'admin-1',
    cedula: '1799999999',
    nombre: 'Administrador General',
    rol: 'admin',
    institucionId: 'inst-1',
  };

  beforeEach(async () => {
    authServiceMock = {
      sesion: () => sesionAdmin,
      tieneRol: vi.fn((roles) => {
        if (Array.isArray(roles)) {
          return roles.includes('admin');
        }
        return roles === 'admin';
      }),
      cerrarSesion: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: authServiceMock }],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('crea_el_componente_layout', () => {
    const fixture = TestBed.createComponent(MainLayoutComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra_el_nombre_y_rol_del_usuario_autenticado', () => {
    const fixture = TestBed.createComponent(MainLayoutComponent);
    fixture.detectChanges();
    const compilado = fixture.nativeElement as HTMLElement;

    expect(compilado.querySelector('.user-name')?.textContent).toContain('Administrador General');
    expect(compilado.querySelector('.role-badge')?.textContent).toContain('admin');
  });

  it('cierra_sesion_y_redirige_a_login_al_presionar_salir', () => {
    const fixture = TestBed.createComponent(MainLayoutComponent);
    fixture.detectChanges();

    const botonSalir = fixture.nativeElement.querySelector('.btn-logout') as HTMLButtonElement;
    botonSalir.click();

    expect(authServiceMock.cerrarSesion).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
