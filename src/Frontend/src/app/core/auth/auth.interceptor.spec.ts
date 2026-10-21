import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { authInterceptor } from './auth.interceptor';
import { SesionUsuario } from './auth.models';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authServiceMock: {
    sesion: () => SesionUsuario | null;
    cerrarSesion: () => void;
  };
  let routerMock: {
    navigate: (commands: string[]) => Promise<boolean>;
  };

  const sesionConToken: SesionUsuario = {
    id: 'u-1',
    cedula: '1700000000',
    nombre: 'Usuario Test',
    rol: 'usuario',
    institucionId: 'inst-1',
    token: 'jwt-valido',
  };

  beforeEach(() => {
    authServiceMock = {
      sesion: () => null,
      cerrarSesion: vi.fn(),
    };

    routerMock = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('agrega_encabezado_Authorization_Bearer_cuando_existe_token', () => {
    authServiceMock.sesion = () => sesionConToken;

    httpClient.get('/api/prueba').subscribe();

    const req = httpMock.expectOne('/api/prueba');
    expect(req.request.headers.has('Authorization')).toBe(true);
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-valido');
    req.flush({ ok: true });
  });

  it('no_agrega_encabezado_Authorization_si_no_hay_token', () => {
    authServiceMock.sesion = () => null;

    httpClient.get('/api/prueba').subscribe();

    const req = httpMock.expectOne('/api/prueba');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ ok: true });
  });

  it('no_sobreescribe_encabezado_Authorization_si_ya_esta_presente', () => {
    authServiceMock.sesion = () => sesionConToken;

    httpClient
      .get('/api/prueba', {
        headers: { Authorization: 'CustomToken existente' },
      })
      .subscribe();

    const req = httpMock.expectOne('/api/prueba');
    expect(req.request.headers.get('Authorization')).toBe('CustomToken existente');
    req.flush({ ok: true });
  });

  it('no_agrega_encabezado_Authorization_a_urls_externas_absolutas', () => {
    authServiceMock.sesion = () => sesionConToken;

    httpClient.get('https://servicio-externo.com/api/datos').subscribe();

    const req = httpMock.expectOne('https://servicio-externo.com/api/datos');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ externo: true });
  });

  it('cierra_sesion_y_redirige_a_login_ante_error_401', () => {
    authServiceMock.sesion = () => sesionConToken;

    httpClient.get('/api/protegido').subscribe({
      next: () => expect.fail('La petición debió fallar con 401'),
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(401);
      },
    });

    const req = httpMock.expectOne('/api/protegido');
    req.flush('No autorizado', { status: 401, statusText: 'Unauthorized' });

    expect(authServiceMock.cerrarSesion).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('redirige_a_no_autorizado_ante_error_403', () => {
    authServiceMock.sesion = () => sesionConToken;

    httpClient.get('/api/restringido').subscribe({
      next: () => expect.fail('La petición debió fallar con 403'),
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(403);
      },
    });

    const req = httpMock.expectOne('/api/restringido');
    req.flush('Prohibido', { status: 403, statusText: 'Forbidden' });

    expect(authServiceMock.cerrarSesion).not.toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/no-autorizado']);
  });

  it('propaga_otros_errores_sin_cerrar_sesion_ni_redirigir', () => {
    authServiceMock.sesion = () => sesionConToken;

    httpClient.get('/api/error-servidor').subscribe({
      next: () => expect.fail('La petición debió fallar con 500'),
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(500);
      },
    });

    const req = httpMock.expectOne('/api/error-servidor');
    req.flush('Error interno', { status: 500, statusText: 'Internal Server Error' });

    expect(authServiceMock.cerrarSesion).not.toHaveBeenCalled();
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });
});
