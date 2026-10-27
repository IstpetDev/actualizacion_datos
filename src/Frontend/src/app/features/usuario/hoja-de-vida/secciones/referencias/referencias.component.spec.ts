import politicaPrueba from '../../servicios/politica-validacion.fixture.json';
import { ConfiguracionClient } from '../../../../../api-client';
import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { ReferenciaDto } from '../../../../../api-client';
import { HojaDeVidaStateService } from '../../servicios/hoja-de-vida-state.service';
import { ReferenciasComponent } from './referencias.component';

describe('ReferenciasComponent', () => {
  let component: ReferenciasComponent;
  let fixture: ComponentFixture<ReferenciasComponent>;

  let stateMock: {
    puedeEditar: WritableSignal<boolean>;
    guardando: WritableSignal<boolean>;
    referencias: WritableSignal<ReferenciaDto[]>;
    guardarReferencia: Mock;
    eliminarReferencia: Mock;
    obtenerMarcaParaItem: Mock;
  };

  const mockRefPersonal: ReferenciaDto = {
    id: 'ref-1',
    tipo: 'Personal',
    nombresApellidos: 'Lic. Ana Morales',
    telefono: '0998765432',
    titulo: 'Docente',
    cargoActual: 'Rectora',
    empresa: 'Colegio Nacional',
    fechaActualizacionUtc: new Date(),
  };

  const mockRefLaboral: ReferenciaDto = {
    id: 'ref-2',
    tipo: 'Laboral',
    nombresApellidos: 'Ing. Pedro Suarez',
    telefono: '0981122334',
    titulo: 'Ingeniero',
    cargoActual: 'Gerente TI',
    empresa: 'Soluciones Web',
    fechaActualizacionUtc: new Date(),
  };

  beforeEach(async () => {
    stateMock = {
      puedeEditar: signal(true),
      guardando: signal(false),
      referencias: signal([mockRefPersonal, mockRefLaboral]),
      guardarReferencia: vi.fn().mockReturnValue(of({})),
      eliminarReferencia: vi.fn().mockReturnValue(of({})),
      obtenerMarcaParaItem: vi.fn().mockReturnValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [ReferenciasComponent],
      providers: [
        {
          provide: ConfiguracionClient,
          useValue: { obtenerPoliticaValidacion: () => of(politicaPrueba) },
        },
        { provide: HojaDeVidaStateService, useValue: stateMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReferenciasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe_crearse_y_clasificar_referencias_por_tipo', () => {
    expect(component).toBeTruthy();
    expect(component.personales().length).toBe(1);
    expect(component.laborales().length).toBe(1);
    expect(component.listaActiva()).toEqual([mockRefPersonal]);
  });

  it('cambiar_tipo_actualiza_lista_activa', () => {
    component.cambiarTipo('Laboral');
    expect(component.tipoActivo()).toBe('Laboral');
    expect(component.listaActiva()).toEqual([mockRefLaboral]);
  });

  it('valida_campos_obligatorios_al_guardar', () => {
    component.abrirFormulario();
    component.guardar();
    expect(component.errorFormulario()).toContain('Nombres y apellidos');

    component.modelo.nombresApellidos = 'Carlos Ruiz';
    component.guardar();
    expect(component.errorFormulario()).toContain('El teléfono');
  });

  it('guarda_referencia_personal_con_exito', () => {
    component.abrirFormulario();
    component.modelo = {
      tipo: 'Personal',
      nombresApellidos: 'Carlos Ruiz',
      telefono: '0990001122',
      titulo: 'Abogado',
      cargoActual: 'Consultor',
      empresa: 'Libre ejercicio',
    };

    component.guardar();

    expect(stateMock.guardarReferencia).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'Personal',
        nombresApellidos: 'Carlos Ruiz',
        telefono: '0990001122',
      }),
      undefined,
    );
    expect(component.mostrarFormulario()).toBe(false);
  });

  it('impide_abrir_formulario_si_se_supera_limite_de_5', () => {
    const cincoPersonales: ReferenciaDto[] = Array.from({ length: 5 }, (_, i) => ({
      ...mockRefPersonal,
      id: `ref-p-${i}`,
      nombresApellidos: `Persona ${i}`,
    }));
    stateMock.referencias.set(cincoPersonales);
    fixture.detectChanges();

    component.abrirFormulario();

    expect(component.mostrarFormulario()).toBe(false);
    expect(component.errorFormulario()).toContain('No puede registrar más de 5');
  });

  it('eliminar_referencia_invoca_state_al_confirmar', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    component.eliminar('ref-1');
    expect(stateMock.eliminarReferencia).toHaveBeenCalledWith('ref-1');
  });

  it('muestra_error_de_formato_y_bloquea_guardar_hasta_corregir', async () => {
    component.abrirFormulario();
    component.modelo.telefono = '080000000';
    fixture.detectChanges();
    const boton = fixture.nativeElement.querySelector(
      '[data-testid="btn-guardar-referencia"]',
    ) as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelector('#error-modelo-telefono').textContent.trim().length,
    ).toBeGreaterThan(5);
    component.modelo.telefono = '0900000000';
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(boton.disabled).toBe(false);
  });

  it('bloquea_cambio_de_tipo_si_hay_datos_sin_guardar_en_formulario', () => {
    component.abrirFormulario();
    component.modelo.nombresApellidos = 'Carlos Andrade';
    fixture.detectChanges();

    expect(component.tieneCambios()).toBe(true);

    component.intentarCambiarTipo('Laboral');
    fixture.detectChanges();

    expect(component.tipoActivo()).toBe('Personal');
    expect(component.mostrarModalSubtab()).toBe(true);
  });

  it('descartar_cambios_de_tipo_limpia_formulario_y_cambia_de_tipo', () => {
    component.abrirFormulario();
    component.modelo.nombresApellidos = 'Carlos Andrade';
    component.intentarCambiarTipo('Laboral');
    expect(component.mostrarModalSubtab()).toBe(true);

    component.descartarYCambiarTipo();
    fixture.detectChanges();

    expect(component.mostrarModalSubtab()).toBe(false);
    expect(component.mostrarFormulario()).toBe(false);
    expect(component.tipoActivo()).toBe('Laboral');
  });
});
