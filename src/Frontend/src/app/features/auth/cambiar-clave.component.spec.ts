import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AutenticacionClient } from '../../api-client';
import { AuthService } from '../../core/auth';
import { CambiarClaveComponent } from './cambiar-clave.component';

describe('cambio de clave', () => {
  const cliente = { cambiarContrasena: vi.fn() };
  const auth = {
    sesion: () => ({ cedula: '0000000000', debeCambiarContrasena: true }),
    verificarSesion: vi.fn(),
  };
  beforeEach(() => {
    vi.clearAllMocks();
    cliente.cambiarContrasena.mockReturnValue(of({ mensaje: 'Actualizada' }));
    auth.verificarSesion.mockReturnValue(
      of({ rol: 'usuario', requiereAceptarProteccionDatos: false }),
    );
    TestBed.configureTestingModule({
      imports: [CambiarClaveComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: AutenticacionClient, useValue: cliente },
      ],
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  it.each([
    ['corta', 'corta'],
    ['0000000000', '0000000000'],
    ['clave-ejemplo', 'diferente'],
  ])('rechaza_claves_invalidas_%s', (nueva, confirmacion) => {
    const fixture = TestBed.createComponent(CambiarClaveComponent);
    fixture.componentInstance.nueva = nueva;
    fixture.componentInstance.confirmacion = confirmacion;
    fixture.componentInstance.cambiarClave();
    fixture.detectChanges();
    expect(cliente.cambiarContrasena).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role=alert]')).toBeTruthy();
  });
  it('cambia_clave_revalida_cookie_y_continua', () => {
    const fixture = TestBed.createComponent(CambiarClaveComponent);
    fixture.componentInstance.nueva = fixture.componentInstance.confirmacion = 'clave-de-ejemplo';
    fixture.componentInstance.cambiarClave();
    expect(cliente.cambiarContrasena).toHaveBeenCalledWith({
      nuevaContrasena: 'clave-de-ejemplo',
      contrasenaActual: undefined,
    });
    expect(auth.verificarSesion).toHaveBeenCalled();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/usuario']);
    expect(fixture.componentInstance.nueva).toBe('');
  });
  it('permite_reintentar_si_la_api_rechaza_el_cambio', () => {
    cliente.cambiarContrasena.mockReturnValue(throwError(() => new Error()));
    const fixture = TestBed.createComponent(CambiarClaveComponent);
    fixture.componentInstance.nueva = fixture.componentInstance.confirmacion = 'clave-de-ejemplo';
    fixture.componentInstance.cambiarClave();
    expect(fixture.componentInstance.ocupado()).toBe(false);
    expect(auth.verificarSesion).not.toHaveBeenCalled();
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });
  it('alterna_visibilidad_de_campos_de_contrasena_con_botones_ojo', () => {
    const fixture = TestBed.createComponent(CambiarClaveComponent);
    fixture.detectChanges();

    const inputNueva = fixture.nativeElement.querySelector('#clave-nueva') as HTMLInputElement;
    const inputConfirmacion = fixture.nativeElement.querySelector(
      '#clave-confirmacion',
    ) as HTMLInputElement;
    const btns = fixture.nativeElement.querySelectorAll(
      '.btn-ojo',
    ) as NodeListOf<HTMLButtonElement>;

    expect(inputNueva.type).toBe('password');
    expect(inputConfirmacion.type).toBe('password');

    // Click primer ojo (nueva contraseña)
    btns[0].click();
    fixture.detectChanges();
    expect(inputNueva.type).toBe('text');
    expect(inputConfirmacion.type).toBe('password');

    // Click segundo ojo (confirmación)
    btns[1].click();
    fixture.detectChanges();
    expect(inputConfirmacion.type).toBe('text');

    // Ocultar nuevamente
    btns[0].click();
    fixture.detectChanges();
    expect(inputNueva.type).toBe('password');
  });
});
