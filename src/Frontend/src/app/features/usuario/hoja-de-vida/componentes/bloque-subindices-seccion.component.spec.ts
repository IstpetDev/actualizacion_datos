import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { EstadoSubindiceSeccionPersonaDto } from '../../../../api-client';
import {
  BloqueSubindicesSeccionComponent,
  nombreSubindicePorId,
} from './bloque-subindices-seccion.component';

describe('BloqueSubindicesSeccionComponent', () => {
  let component: BloqueSubindicesSeccionComponent;
  let fixture: ComponentFixture<BloqueSubindicesSeccionComponent>;

  const mockSubindices: EstadoSubindiceSeccionPersonaDto[] = [
    {
      id: 'sub-3er',
      seccion: 'formacion',
      nombre: 'Título 3er nivel',
      descripcion: 'Subir el título de 3er nivel en PDF',
      tipoFuncionarioId: undefined,
      esObligatorio: false,
      orden: 1,
      activo: true,
      estado: 'pendiente',
    },
    {
      id: 'sub-senescyt',
      seccion: 'formacion',
      nombre: 'Registro SENESCYT',
      descripcion: 'Subir registro SENESCYT en PDF',
      tipoFuncionarioId: undefined,
      esObligatorio: true,
      orden: 2,
      activo: true,
      estado: 'pendiente',
    },
    {
      id: 'sub-otra-seccion',
      seccion: 'experiencia',
      nombre: 'Certificado Laboral',
      descripcion: undefined,
      tipoFuncionarioId: undefined,
      esObligatorio: true,
      orden: 1,
      activo: true,
      estado: 'pendiente',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BloqueSubindicesSeccionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BloqueSubindicesSeccionComponent);
    component = fixture.componentInstance;
  });

  it('filtra_y_muestra_solo_subindices_activos_de_la_seccion', () => {
    fixture.componentRef.setInput('seccion', 'formacion');
    fixture.componentRef.setInput('subindices', mockSubindices);
    fixture.componentRef.setInput('puedeEditar', true);
    fixture.detectChanges();

    const activos = component.activos();
    expect(activos.length).toBe(2);
    expect(activos.map((a) => a.id)).toEqual(['sub-3er', 'sub-senescyt']);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="card-subindice-sub-3er"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="card-subindice-sub-senescyt"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="card-subindice-sub-otra-seccion"]')).toBeNull();
  });

  it('muestra_insignia_pendiente_cuando_es_obligatorio_y_no_cumplido', () => {
    fixture.componentRef.setInput('seccion', 'formacion');
    fixture.componentRef.setInput('subindices', mockSubindices);
    fixture.componentRef.setInput('idsCumplidos', new Set<string>());
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const badgeSenescyt = el.querySelector('[data-testid="estado-subindice-sub-senescyt"]');
    expect(badgeSenescyt?.textContent?.trim()).toBe('✕ Pendiente');

    // El opcional no cumplido no muestra badge pendiente
    const badge3er = el.querySelector('[data-testid="estado-subindice-sub-3er"]');
    expect(badge3er).toBeNull();
  });

  it('muestra_cargado_con_conteo_multiple_y_cambia_texto_del_boton', () => {
    fixture.componentRef.setInput('seccion', 'formacion');
    fixture.componentRef.setInput('subindices', mockSubindices);
    fixture.componentRef.setInput('idsCumplidos', new Set<string>(['sub-3er']));
    fixture.componentRef.setInput('conteos', { 'sub-3er': 3 });
    fixture.componentRef.setInput('puedeEditar', true);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const badge3er = el.querySelector('[data-testid="estado-subindice-sub-3er"]');
    expect(badge3er?.textContent?.trim()).toBe('✓ Cargado (3)');

    const btnCargar = el.querySelector<HTMLButtonElement>(
      '[data-testid="btn-cargar-subindice-sub-3er"]',
    );
    expect(btnCargar?.textContent?.trim()).toBe('+ Cargar otro');
  });

  it('emite_cargarEnSubindice_al_hacer_clic_en_el_boton', () => {
    fixture.componentRef.setInput('seccion', 'formacion');
    fixture.componentRef.setInput('subindices', mockSubindices);
    fixture.componentRef.setInput('puedeEditar', true);
    fixture.detectChanges();

    let emitido: EstadoSubindiceSeccionPersonaDto | undefined;
    component.cargarEnSubindice.subscribe((val) => (emitido = val));

    const el = fixture.nativeElement as HTMLElement;
    const btnCargar = el.querySelector<HTMLButtonElement>(
      '[data-testid="btn-cargar-subindice-sub-3er"]',
    );
    btnCargar?.click();

    expect(emitido).toEqual(mockSubindices[0]);
  });

  it('funcion_auxiliar_nombreSubindicePorId_retorna_nombre_correcto_o_undefined', () => {
    expect(nombreSubindicePorId(mockSubindices, 'sub-3er')).toBe('Título 3er nivel');
    expect(nombreSubindicePorId(mockSubindices, 'sub-inexistente')).toBeUndefined();
    expect(nombreSubindicePorId(undefined, 'sub-3er')).toBeUndefined();
  });
});
