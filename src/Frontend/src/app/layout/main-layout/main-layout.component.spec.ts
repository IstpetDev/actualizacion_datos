import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AutenticacionClient } from '../../api-client';
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
    institucionNombre: 'Instituto Tecnológico Superior',
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
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        {
          provide: AutenticacionClient,
          useValue: { cerrarSesion: vi.fn(() => of({ mensaje: 'Sesión cerrada' })) },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('conserva_la_sesion_si_falla_el_cierre_remoto', () => {
    vi.spyOn(TestBed.inject(AutenticacionClient), 'cerrarSesion').mockReturnValue(
      throwError(() => new Error()),
    );
    const fixture = TestBed.createComponent(MainLayoutComponent);
    fixture.componentInstance.cerrarSesion();
    expect(authServiceMock.cerrarSesion).not.toHaveBeenCalled();
    expect(fixture.componentInstance.errorCierre()).toContain('No se pudo');
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

  it('muestra_el_nombre_de_la_institucion_activa_en_la_cabecera', () => {
    const fixture = TestBed.createComponent(MainLayoutComponent);
    fixture.detectChanges();
    const compilado = fixture.nativeElement as HTMLElement;

    expect(compilado.querySelector('.brand-badge')?.textContent).toContain(
      'Instituto Tecnológico Superior',
    );
  });
});
