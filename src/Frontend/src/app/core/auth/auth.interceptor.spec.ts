import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('interceptor de sesión por cookie', () => {
  const auth = { sesion: vi.fn(), cerrarSesion: vi.fn() };
  const router = { navigate: vi.fn() };
  let http: HttpClient;
  let controlador: HttpTestingController;
  beforeEach(() => {
    vi.clearAllMocks();
    auth.sesion.mockReturnValue(null);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpClient);
    controlador = TestBed.inject(HttpTestingController);
  });
  afterEach(() => controlador.verify());
  it('no_fabrica_bearer', () => {
    auth.sesion.mockReturnValue({ token: 'dato-local-ignorado' });
    http.get('/api/prueba').subscribe();
    const peticion = controlador.expectOne('/api/prueba');
    expect(peticion.request.headers.has('Authorization')).toBe(false);
    peticion.flush({});
  });
  it.each([401, 403, 500])('gestiona_el_error_%s', (status) => {
    http.get('/api/prueba').subscribe({ error: () => undefined });
    controlador.expectOne('/api/prueba').flush({}, { status, statusText: 'Error' });
    if (status === 401) {
      expect(auth.cerrarSesion).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    } else if (status === 403) expect(router.navigate).toHaveBeenCalledWith(['/no-autorizado']);
    else expect(router.navigate).not.toHaveBeenCalled();
  });
  it('mantiene_el_error_de_login_en_el_formulario', () => {
    http.post('/api/auth/login', {}).subscribe({ error: () => undefined });
    controlador.expectOne('/api/auth/login').flush({}, { status: 401, statusText: 'Error' });
    expect(router.navigate).not.toHaveBeenCalled();
  });
  it('conserva_la_pantalla_si_la_campana_cierra_durante_la_edicion', () => {
    http.put('/api/mis-datos', {}).subscribe({ error: () => undefined });
    controlador.expectOne('/api/mis-datos').flush({}, { status: 403, statusText: 'Error' });
    expect(router.navigate).not.toHaveBeenCalled();
  });
  it('redirige_al_cambio_obligatorio_ante_un_403', () => {
    auth.sesion.mockReturnValue({ debeCambiarContrasena: true });
    http.get('/api/prueba').subscribe({ error: () => undefined });
    controlador.expectOne('/api/prueba').flush({}, { status: 403, statusText: 'Error' });
    expect(router.navigate).toHaveBeenCalledWith(['/cambiar-clave']);
  });
});
