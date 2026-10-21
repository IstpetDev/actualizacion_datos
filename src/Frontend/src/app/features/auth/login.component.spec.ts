import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService, SesionUsuario } from '../../core/auth';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let authServiceMock: {
    iniciarSesion: (sesion: SesionUsuario) => void;
  };
  let router: Router;

  beforeEach(async () => {
    authServiceMock = {
      iniciarSesion: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: authServiceMock }],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('crea_el_componente_login', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('inicia_sesion_y_redirige_al_modulo_del_rol_seleccionado', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();

    const boton = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    boton.click();

    expect(authServiceMock.iniciarSesion).toHaveBeenCalledWith(
      expect.objectContaining({
        cedula: '1700000000',
        rol: 'usuario',
      }),
    );
    expect(router.navigate).toHaveBeenCalledWith(['/usuario']);
  });
});
