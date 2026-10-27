import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { HojaDeVidaComponent } from '../hoja-de-vida.component';
import { cambiosSinGuardarGuard } from './cambios-sin-guardar.guard';
import { AuthService } from '../../../../core/auth';

describe('cambiosSinGuardarGuard', () => {
  const dummyRoute = {} as ActivatedRouteSnapshot;
  const dummyState = {} as RouterStateSnapshot;

  it('permite_desactivacion_si_componente_no_define_puedeDesactivar', () => {
    const dummyComponent = {} as HojaDeVidaComponent;

    const resultado = TestBed.runInInjectionContext(() =>
      cambiosSinGuardarGuard(dummyComponent, dummyRoute, dummyState, dummyState),
    );

    expect(resultado).toBe(true);
  });
  it('una_version_nueva_prioriza_la_aceptacion_sin_autoguardar_ni_abrir_modal', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: { sesion: () => ({ requiereAceptarProteccionDatos: true }) },
        },
      ],
    });
    const componente = {
      puedeDesactivar: vi.fn().mockReturnValue(false),
    } as unknown as HojaDeVidaComponent;
    const resultado = TestBed.runInInjectionContext(() =>
      cambiosSinGuardarGuard(componente, dummyRoute, dummyState, {
        url: '/proteccion-datos',
      } as RouterStateSnapshot),
    );
    expect(resultado).toBe(true);
    expect(componente.puedeDesactivar).not.toHaveBeenCalled();
  });

  it('devuelve_el_resultado_de_puedeDesactivar_cuando_es_booleano', () => {
    const mockComponent = {
      puedeDesactivar: vi.fn().mockReturnValue(false),
    } as unknown as HojaDeVidaComponent;

    const resultado = TestBed.runInInjectionContext(() =>
      cambiosSinGuardarGuard(mockComponent, dummyRoute, dummyState, dummyState),
    );

    expect(resultado).toBe(false);
    expect(mockComponent.puedeDesactivar).toHaveBeenCalledTimes(1);
  });

  it('devuelve_observable_de_puedeDesactivar_cuando_es_asincrono', async () => {
    const mockComponent = {
      puedeDesactivar: vi.fn().mockReturnValue(of(true)),
    } as unknown as HojaDeVidaComponent;

    const resultado = TestBed.runInInjectionContext(() =>
      cambiosSinGuardarGuard(mockComponent, dummyRoute, dummyState, dummyState),
    );

    expect(resultado).toBeDefined();
    if (typeof resultado === 'object' && 'subscribe' in resultado) {
      resultado.subscribe((permitido) => {
        expect(permitido).toBe(true);
      });
    }
  });
});
