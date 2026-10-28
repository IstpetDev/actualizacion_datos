import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfiguracionSeccionesClient, SeccionConfiguracionDto } from '../../../api-client';
import { SeccionesComponent } from './secciones.component';

describe('SeccionesComponent', () => {
  let component: SeccionesComponent;
  let fixture: ComponentFixture<SeccionesComponent>;
  let clientMock: {
    listarSeccionesConfiguracion: ReturnType<typeof vi.fn>;
    cambiarEstadoSeccion: ReturnType<typeof vi.fn>;
  };

  const mockSecciones: SeccionConfiguracionDto[] = [
    {
      codigo: 'ficha',
      nombre: 'Ficha Personal',
      habilitada: true,
      personasCompletas: 5,
      personasIncompletas: 0,
      totalPersonas: 5,
      ultimaModificacionUtc: undefined,
      modificadoPor: undefined,
    },
    {
      codigo: 'formacion',
      nombre: 'Formación Académica',
      habilitada: true,
      personasCompletas: 3,
      personasIncompletas: 2,
      totalPersonas: 5,
      ultimaModificacionUtc: new Date('2026-10-20T10:00:00Z'),
      modificadoPor: 'admin-1',
    },
    {
      codigo: 'capacitaciones',
      nombre: 'Capacitaciones',
      habilitada: false,
      personasCompletas: 0,
      personasIncompletas: 5,
      totalPersonas: 5,
      ultimaModificacionUtc: undefined,
      modificadoPor: undefined,
    },
    {
      codigo: 'experiencia',
      nombre: 'Experiencia Laboral',
      habilitada: false,
      personasCompletas: 0,
      personasIncompletas: 5,
      totalPersonas: 5,
      ultimaModificacionUtc: undefined,
      modificadoPor: undefined,
    },
    {
      codigo: 'referencias',
      nombre: 'Referencias',
      habilitada: true,
      personasCompletas: 4,
      personasIncompletas: 1,
      totalPersonas: 5,
      ultimaModificacionUtc: undefined,
      modificadoPor: undefined,
    },
    {
      codigo: 'documentos',
      nombre: 'Documentos Personales',
      habilitada: true,
      personasCompletas: 2,
      personasIncompletas: 3,
      totalPersonas: 5,
      ultimaModificacionUtc: undefined,
      modificadoPor: undefined,
    },
    {
      codigo: 'cuenta-bancaria',
      nombre: 'Cuenta Bancaria',
      habilitada: false,
      personasCompletas: 1,
      personasIncompletas: 4,
      totalPersonas: 5,
      ultimaModificacionUtc: undefined,
      modificadoPor: undefined,
    },
  ];

  beforeEach(async () => {
    clientMock = {
      listarSeccionesConfiguracion: vi.fn().mockReturnValue(of([...mockSecciones])),
      cambiarEstadoSeccion: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [SeccionesComponent],
      providers: [{ provide: ConfiguracionSeccionesClient, useValue: clientMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(SeccionesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('muestra_las_siete_secciones_con_estado_y_avance', () => {
    expect(clientMock.listarSeccionesConfiguracion).toHaveBeenCalledTimes(1);

    const filas = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');
    expect(filas.length).toBe(7);

    // Ficha personal abierta
    const filaFicha = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="fila-seccion-ficha"]',
    );
    expect(filaFicha).toBeTruthy();
    expect(
      filaFicha?.querySelector('[data-testid="badge-estado-ficha"]')?.textContent?.trim(),
    ).toBe('Abierta');
    expect(filaFicha?.querySelector('[data-testid="avance-ficha"]')?.textContent?.trim()).toBe(
      '5 / 5 personas',
    );

    // Capacitaciones cerrada
    const filaCap = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="fila-seccion-capacitaciones"]',
    );
    expect(filaCap).toBeTruthy();
    expect(
      filaCap?.querySelector('[data-testid="badge-estado-capacitaciones"]')?.textContent?.trim(),
    ).toBe('Cerrada');
    expect(
      filaCap?.querySelector('[data-testid="avance-capacitaciones"]')?.textContent?.trim(),
    ).toBe('0 / 5 personas');
  });

  it('abrir_y_cerrar_seccion_cambia_estado_exitosamente', () => {
    const actualizada: SeccionConfiguracionDto = {
      ...mockSecciones[2], // capacitaciones
      habilitada: true,
      ultimaModificacionUtc: new Date(),
      modificadoPor: 'admin-actual',
    };
    clientMock.cambiarEstadoSeccion.mockReturnValue(of(actualizada));

    const btnAbrir = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="btn-toggle-capacitaciones"]',
    ) as HTMLButtonElement;
    expect(btnAbrir).toBeTruthy();
    expect(btnAbrir.textContent?.trim()).toBe('Abrir sección');

    btnAbrir.click();

    expect(clientMock.cambiarEstadoSeccion).toHaveBeenCalledWith('capacitaciones', {
      habilitada: true,
    });
    fixture.detectChanges();

    const badge = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="badge-estado-capacitaciones"]',
    );
    expect(badge?.textContent?.trim()).toBe('Abierta');

    const exito = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="exito-secciones"]',
    );
    expect(exito?.textContent).toContain('ahora está abierta');
  });

  it('ficha_personal_no_se_puede_cerrar', () => {
    const btnFicha = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="btn-toggle-ficha"]',
    );
    expect(btnFicha).toBeNull();

    const filaFicha = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="fila-seccion-ficha"]',
    );
    expect(filaFicha?.textContent).toContain('Siempre abierta');

    // Si se invoca programáticamente el cambio sobre ficha, debe ser rechazado
    component.confirmarYCambiarEstado(mockSecciones[0]);
    expect(clientMock.cambiarEstadoSeccion).not.toHaveBeenCalled();
    expect(component.error()).toBe('La ficha personal no puede cerrarse.');
  });

  it('confirmacion_antes_de_cerrar_una_seccion_con_datos', () => {
    // Formación tiene 3 personas completas (datos cargados)
    const confirmSpy = vi.spyOn(window, 'confirm');

    // 1. Usuario cancela confirmación
    confirmSpy.mockReturnValue(false);
    const btnCerrar = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="btn-toggle-formacion"]',
    ) as HTMLButtonElement;
    expect(btnCerrar).toBeTruthy();
    expect(btnCerrar.textContent?.trim()).toBe('Cerrar sección');

    btnCerrar.click();
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(clientMock.cambiarEstadoSeccion).not.toHaveBeenCalled();

    // 2. Usuario acepta confirmación
    confirmSpy.mockReturnValue(true);
    const actualizada: SeccionConfiguracionDto = {
      ...mockSecciones[1],
      habilitada: false,
    };
    clientMock.cambiarEstadoSeccion.mockReturnValue(of(actualizada));

    btnCerrar.click();
    expect(confirmSpy).toHaveBeenCalledTimes(2);
    expect(clientMock.cambiarEstadoSeccion).toHaveBeenCalledWith('formacion', {
      habilitada: false,
    });
  });

  it('error_accesible_cuando_falla_la_api', () => {
    clientMock.cambiarEstadoSeccion.mockReturnValue(
      throwError(() => ({ mensaje: 'No tiene permisos.' })),
    );

    const btnToggle = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="btn-toggle-capacitaciones"]',
    ) as HTMLButtonElement;
    btnToggle.click();
    fixture.detectChanges();

    const alerta = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="error-secciones"]',
    );
    expect(alerta).toBeTruthy();
    expect(alerta?.getAttribute('role')).toBe('alert');
    expect(alerta?.textContent).toContain('No tiene permisos.');
  });
});
