import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { API_BASE_URL, AutenticacionClient } from '../../api-client';
import { LoginComponent } from '../../features/auth/login.component';
import { AuthService } from './auth.service';

const sesion = {
  id: 'persona-ficticia',
  institucionId: 'institucion-ficticia',
  documento: '0000000000',
  nombre: 'Persona de ejemplo',
  correo: 'usuario@ejemplo.test',
  rol: 'Usuario',
  debeCambiarContrasena: false,
  requiereAceptarProteccionDatos: false,
  correoVerificado: true,
};

describe('integración HTTP de autenticación con cliente generado', () => {
  let controlador: HttpTestingController;
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '' },
      ],
    });
    controlador = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  afterEach(() => {
    controlador.verify();
    sessionStorage.clear();
  });
  it('envia_documento_y_clave_y_usa_la_respuesta_del_login', async () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.componentInstance.documento = '0000000000';
    fixture.componentInstance.contrasena = 'clave-de-ejemplo';
    fixture.componentInstance.enviarLogin();
    const peticion = controlador.expectOne('/api/auth/login');
    expect(peticion.request.method).toBe('POST');
    expect(JSON.parse(peticion.request.body)).toEqual({
      documento: '0000000000',
      contrasena: 'clave-de-ejemplo',
    });
    expect(peticion.request.headers.has('Authorization')).toBe(false);
    peticion.flush(new Blob([JSON.stringify(sesion)], { type: 'application/json' }));
    await vi.waitFor(() => expect(TestBed.inject(AuthService).sesion()?.cedula).toBe('0000000000'));
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/usuario']);
  });
  it('revalida_la_sesion_por_cookie_y_descarta_un_rol_local_distinto', async () => {
    const auth = TestBed.inject(AuthService);
    auth.iniciarSesion({
      id: 'local',
      institucionId: 'local',
      cedula: '0000000000',
      nombre: 'Ejemplo',
      rol: 'admin',
    });
    auth.verificarSesion().subscribe();
    const peticion = controlador.expectOne('/api/auth/sesion');
    expect(peticion.request.method).toBe('GET');
    peticion.flush(new Blob([JSON.stringify(sesion)], { type: 'application/json' }));
    await vi.waitFor(() => expect(auth.rolActual()).toBe('usuario'));
  });
  it('el_cierre_llama_al_endpoint_que_invalida_la_cookie', async () => {
    let completado = false;
    TestBed.inject(AutenticacionClient)
      .cerrarSesion()
      .subscribe(() => {
        completado = true;
      });
    const peticion = controlador.expectOne('/api/auth/logout');
    expect(peticion.request.method).toBe('POST');
    peticion.flush(
      new Blob([JSON.stringify({ mensaje: 'Sesión cerrada' })], { type: 'application/json' }),
    );
    await vi.waitFor(() => expect(completado).toBe(true));
  });
});
