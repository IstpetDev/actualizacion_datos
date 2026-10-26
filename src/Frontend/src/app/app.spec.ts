import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SaludClient } from './api-client';
import { App } from './app';

describe('App', () => {
  const saludClientMock = {
    obtenerSalud: () => of({ estado: 'ok' }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: SaludClient, useValue: saludClientMock }],
    }).compileComponents();
  });

  it('crea_la_aplicacion', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra_titulo', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compilado = fixture.nativeElement as HTMLElement;
    expect(compilado.querySelector('h1')?.textContent).toContain('Actualización de datos');
  });

  it('muestra_estado_api_conectado', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compilado = fixture.nativeElement as HTMLElement;
    expect(compilado.querySelector('[data-testid="estado-api"]')?.textContent).toContain('ok');
  });
});
