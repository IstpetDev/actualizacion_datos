import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { ModalCambiosSinGuardarComponent } from './modal-cambios-sin-guardar.component';

describe('ModalCambiosSinGuardarComponent', () => {
  let fixture: ComponentFixture<ModalCambiosSinGuardarComponent>;
  let component: ModalCambiosSinGuardarComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalCambiosSinGuardarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalCambiosSinGuardarComponent);
    component = fixture.componentInstance;
  });

  it('no_renderiza_dialogo_cuando_abierto_es_false', () => {
    component.abierto = false;
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[data-testid="modal-cambios-sin-guardar"]');
    expect(dialog).toBeNull();
  });

  it('renderiza_dialogo_accesible_cuando_abierto_es_true', () => {
    component.abierto = true;
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector(
      '[data-testid="modal-cambios-sin-guardar"]',
    ) as HTMLElement;
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('role')).toBe('alertdialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('titulo-modal-cambios');
    expect(dialog.getAttribute('aria-describedby')).toBe('desc-modal-cambios');

    const titulo = fixture.nativeElement.querySelector('#titulo-modal-cambios');
    expect(titulo?.textContent).toContain('Tiene cambios sin guardar');
  });

  it('emite_guardarYContinuar_al_pulsar_boton_guardar', () => {
    component.abierto = true;
    const emitSpy = vi.fn();
    component.guardarYContinuar.subscribe(emitSpy);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector(
      '[data-testid="btn-guardar-continuar"]',
    ) as HTMLButtonElement;
    btn.click();

    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it('emite_descartarYContinuar_al_pulsar_boton_descartar', () => {
    component.abierto = true;
    const emitSpy = vi.fn();
    component.descartarYContinuar.subscribe(emitSpy);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector(
      '[data-testid="btn-descartar-cambios"]',
    ) as HTMLButtonElement;
    btn.click();

    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it('emite_quedarse_al_pulsar_boton_quedarme_aqui', () => {
    component.abierto = true;
    const emitSpy = vi.fn();
    component.quedarse.subscribe(emitSpy);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector(
      '[data-testid="btn-quedarme-aqui"]',
    ) as HTMLButtonElement;
    btn.click();

    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it('deshabilita_botones_cuando_guardando_es_true', () => {
    component.abierto = true;
    component.guardando = true;
    fixture.detectChanges();

    const btnGuardar = fixture.nativeElement.querySelector(
      '[data-testid="btn-guardar-continuar"]',
    ) as HTMLButtonElement;
    const btnDescartar = fixture.nativeElement.querySelector(
      '[data-testid="btn-descartar-cambios"]',
    ) as HTMLButtonElement;
    const btnQuedarse = fixture.nativeElement.querySelector(
      '[data-testid="btn-quedarme-aqui"]',
    ) as HTMLButtonElement;

    expect(btnGuardar.disabled).toBe(true);
    expect(btnDescartar.disabled).toBe(true);
    expect(btnQuedarse.disabled).toBe(true);
    expect(btnGuardar.textContent).toContain('Guardando...');
  });

  it('muestra_alerta_de_error_cuando_existe_mensajeError', () => {
    component.abierto = true;
    component.mensajeError = 'Faltan campos obligatorios para guardar.';
    fixture.detectChanges();

    const alerta = fixture.nativeElement.querySelector(
      '[data-testid="error-modal-cambios"]',
    ) as HTMLElement;
    expect(alerta).not.toBeNull();
    expect(alerta.textContent).toContain('Faltan campos obligatorios para guardar.');
  });
});
