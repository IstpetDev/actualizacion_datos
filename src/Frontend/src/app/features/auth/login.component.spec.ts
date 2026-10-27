import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AutenticacionClient, ResultadoLoginDto } from '../../api-client';
import { AuthService } from '../../core/auth';
import { LoginComponent } from './login.component';

const respuesta: ResultadoLoginDto = {
  id: 'persona-ficticia',
  institucionId: 'institucion-ficticia',
  documento: '0000000000',
  nombre: 'Persona de ejemplo',
  correo: undefined,
  rol: 'Usuario',
  debeCambiarContrasena: false,
  requiereAceptarProteccionDatos: false,
  correoVerificado: false,
};

describe('login real', () => {
  const cliente = { iniciarSesion: vi.fn() };
  beforeEach(() => {
    sessionStorage.clear();
    cliente.iniciarSesion.mockReturnValue(of(respuesta));
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([]), { provide: AutenticacionClient, useValue: cliente }],
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  afterEach(() => sessionStorage.clear());
  function preparar() {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.componentInstance.documento = '0000000000';
    fixture.componentInstance.contrasena = 'clave-de-ejemplo';
    fixture.detectChanges();
    return fixture;
  }
  it('usa_credenciales_y_rol_de_la_api_sin_selector_de_roles', () => {
    const fixture = preparar();
    fixture.componentInstance.enviarLogin();
    expect(cliente.iniciarSesion).toHaveBeenCalledWith({
      documento: '0000000000',
      contrasena: 'clave-de-ejemplo',
    });
    expect(TestBed.inject(AuthService).sesion()?.rol).toBe('usuario');
    expect(TestBed.inject(AuthService).sesion()?.token).toBeUndefined();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/usuario']);
    expect(fixture.nativeElement.querySelector('select')).toBeNull();
    expect(fixture.componentInstance.contrasena).toBe('');
  });
  it('redirige_al_cambio_obligatorio', () => {
    cliente.iniciarSesion.mockReturnValue(of({ ...respuesta, debeCambiarContrasena: true }));
    preparar().componentInstance.enviarLogin();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/cambiar-clave']);
  });
  it('no_crea_sesion_ante_error_y_muestra_mensaje_generico', () => {
    cliente.iniciarSesion.mockReturnValue(throwError(() => new Error('detalle interno')));
    const fixture = preparar();
    fixture.componentInstance.enviarLogin();
    fixture.detectChanges();
    expect(TestBed.inject(AuthService).estaAutenticado()).toBe(false);
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain(
      'Credenciales incorrectas',
    );
  });
  it('evita_login_vacio_y_doble_envio', () => {
    cliente.iniciarSesion.mockClear();
    const pendiente = new Subject<ResultadoLoginDto>();
    cliente.iniciarSesion.mockReturnValue(pendiente);
    const fixture = preparar();
    fixture.componentInstance.documento = ' ';
    fixture.componentInstance.enviarLogin();
    expect(cliente.iniciarSesion).not.toHaveBeenCalled();
    fixture.componentInstance.documento = '0000000000';
    fixture.componentInstance.enviarLogin();
    fixture.componentInstance.enviarLogin();
    expect(cliente.iniciarSesion).toHaveBeenCalledTimes(1);
    pendiente.complete();
  });
  it('alterna_visibilidad_de_contrasena_con_el_boton_ojo', () => {
    const fixture = preparar();
    const inputClave = fixture.nativeElement.querySelector('#contrasena') as HTMLInputElement;
    const btnOjo = fixture.nativeElement.querySelector('.btn-ojo') as HTMLButtonElement;

    expect(inputClave.type).toBe('password');
    expect(btnOjo.getAttribute('aria-label')).toBe('Mostrar contraseña');

    btnOjo.click();
    fixture.detectChanges();
    expect(inputClave.type).toBe('text');
    expect(btnOjo.getAttribute('aria-label')).toBe('Ocultar contraseña');

    btnOjo.click();
    fixture.detectChanges();
    expect(inputClave.type).toBe('password');
    expect(btnOjo.getAttribute('aria-label')).toBe('Mostrar contraseña');
  });
});
