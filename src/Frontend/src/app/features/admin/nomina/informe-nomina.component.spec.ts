import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultadoCargaPersonasDto } from '../../../api-client';
import { InformeNominaComponent } from './informe-nomina.component';

describe('InformeNominaComponent', () => {
  let component: InformeNominaComponent;
  let fixture: ComponentFixture<InformeNominaComponent>;

  const mockResultadoCompleto: ResultadoCargaPersonasDto = {
    totalRecibidos: 5,
    totalCargados: 3,
    totalRechazados: 1,
    totalDuplicadosOmitidos: 1,
    advertencias: [
      { fila: 2, columna: 'Nombre', motivo: 'La división de nombres requiere confirmación' },
      { fila: 3, columna: 'Nacimiento', motivo: 'Fecha vacía' },
    ],
    rechazos: [{ fila: 4, motivo: 'Documento no numérico', documentoAnonimizado: '0001' }],
    documentosCargados: ['1700000001', '1700000002', '1700000003'],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InformeNominaComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InformeNominaComponent);
    component = fixture.componentInstance;
  });

  it('se_crea_correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('no_renderiza_nada_cuando_resultado_es_null', () => {
    fixture.componentRef.setInput('resultado', null);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="informe-nomina"]')).toBeNull();
  });

  it('renderiza_metricas_correctamente', () => {
    fixture.componentRef.setInput('resultado', mockResultadoCompleto);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="informe-nomina"]')).not.toBeNull();
    expect(compiled.querySelector('[data-testid="metrica-recibidos"]')?.textContent).toContain('5');
    expect(compiled.querySelector('[data-testid="metrica-cargados"]')?.textContent).toContain('3');
    expect(compiled.querySelector('[data-testid="metrica-omitidos"]')?.textContent).toContain('1');
    expect(compiled.querySelector('[data-testid="metrica-rechazados"]')?.textContent).toContain(
      '1',
    );
  });

  it('renderiza_tabla_de_rechazos_con_documento_anonimizado', () => {
    fixture.componentRef.setInput('resultado', mockResultadoCompleto);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const tablaRechazos = compiled.querySelector('[data-testid="tabla-rechazos"]');
    expect(tablaRechazos).not.toBeNull();
    expect(tablaRechazos?.textContent).toContain('#4');
    expect(tablaRechazos?.textContent).toContain('***0001');
    expect(tablaRechazos?.textContent).toContain('Documento no numérico');
  });

  it('renderiza_tabla_de_advertencias_correctamente', () => {
    fixture.componentRef.setInput('resultado', mockResultadoCompleto);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const tablaAdv = compiled.querySelector('[data-testid="tabla-advertencias"]');
    expect(tablaAdv).not.toBeNull();
    expect(tablaAdv?.textContent).toContain('#2');
    expect(tablaAdv?.textContent).toContain('Nombre');
    expect(tablaAdv?.textContent).toContain('La división de nombres requiere confirmación');
    expect(tablaAdv?.textContent).toContain('#3');
    expect(tablaAdv?.textContent).toContain('Nacimiento');
  });

  it('no_muestra_secciones_de_rechazos_ni_advertencias_si_las_listas_estan_vacias', () => {
    const mockLimpio: ResultadoCargaPersonasDto = {
      totalRecibidos: 2,
      totalCargados: 2,
      totalRechazados: 0,
      totalDuplicadosOmitidos: 0,
      advertencias: [],
      rechazos: [],
      documentosCargados: ['1700000001', '1700000002'],
    };

    fixture.componentRef.setInput('resultado', mockLimpio);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="seccion-rechazos"]')).toBeNull();
    expect(compiled.querySelector('[data-testid="seccion-advertencias"]')).toBeNull();
  });
});
