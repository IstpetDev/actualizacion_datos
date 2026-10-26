import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService, Rol } from '../../core/auth';
import { NoAutorizadoComponent } from './no-autorizado.component';

describe('NoAutorizadoComponent', () => {
  let authServiceMock: {
    rolActual: () => Rol | null;
  };
  let router: Router;

  beforeEach(async () => {
    authServiceMock = {
      rolActual: () => 'usuario',
    };

    await TestBed.configureTestingModule({
      imports: [NoAutorizadoComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: authServiceMock }],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('crea_el_componente_no_autorizado', () => {
    const fixture = TestBed.createComponent(NoAutorizadoComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra_el_rol_del_usuario_en_el_mensaje', () => {
    const fixture = TestBed.createComponent(NoAutorizadoComponent);
    fixture.detectChanges();
    const compilado = fixture.nativeElement as HTMLElement;

    expect(compilado.querySelector('.highlight-role')?.textContent).toContain('usuario');
  });

  it('volver_redirige_a_la_seccion_del_rol_del_usuario', () => {
    const fixture = TestBed.createComponent(NoAutorizadoComponent);
    fixture.detectChanges();

    const boton = fixture.nativeElement.querySelector('.btn-back') as HTMLButtonElement;
    boton.click();

    expect(router.navigate).toHaveBeenCalledWith(['/usuario']);
  });

  it('volver_redirige_a_login_si_no_hay_rol_activo', () => {
    authServiceMock.rolActual = () => null;
    const fixture = TestBed.createComponent(NoAutorizadoComponent);
    fixture.detectChanges();

    const boton = fixture.nativeElement.querySelector('.btn-back') as HTMLButtonElement;
    boton.click();

    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
