import { TestBed } from '@angular/core/testing';
import { HojaDeVidaDto } from '../../api-client';
import { ObservacionesRevisionComponent } from './observaciones-revision.component';
import { observacionesFicticias } from './observaciones-revision.fixture';
import { coincideMarca, ordenarObservaciones } from './observaciones-revision';

describe('Observaciones de revisión compartidas', () => {
  it('ordena por ronda descendente sin cambiar la respuesta original', () => {
    expect(ordenarObservaciones(observacionesFicticias).map((o) => o.ronda)).toEqual([2, 1]);
    expect(observacionesFicticias.map((o) => o.ronda)).toEqual([1, 2]);
  });
  it.each(['titulo', 'titulo-academico', 'titulo_academico'])(
    'asocia el alias %s al registro correcto',
    (tipo) => {
      expect(
        coincideMarca(
          {
            id: 'ficticia',
            tipoDestino: 'item',
            claveDestino: `${tipo}:tit-001`,
            texto: 'Ficticio',
          },
          'titulo',
          'tit-001',
        ),
      ).toBe(true);
      expect(
        coincideMarca(
          {
            id: 'ficticia',
            tipoDestino: 'item',
            claveDestino: `${tipo}:tit-001`,
            texto: 'Ficticio',
          },
          'titulo',
          'tit-002',
        ),
      ).toBe(false);
    },
  );
  it('asocia ficha, campo y obligatoria usando sus claves vigentes', () => {
    expect(coincideMarca(observacionesFicticias[0].marcas[0], 'ficha', 'datos_personales')).toBe(
      true,
    );
    expect(
      coincideMarca(
        { ...observacionesFicticias[0].marcas[0], claveDestino: 'celular' },
        'seccion',
        'ficha',
      ),
    ).toBe(true);
    expect(
      coincideMarca(
        {
          id: 'ficticia',
          tipoDestino: 'item',
          claveDestino: 'capacitaciones.obligatoria.ob-1',
          texto: 'Ficticio',
        },
        'capacitacion-obligatoria',
        'ob-1',
      ),
    ).toBe(true);
  });
  it('muestra general y dos específicas de cada ronda con contexto, autor, fecha y estado', async () => {
    await TestBed.configureTestingModule({
      imports: [ObservacionesRevisionComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(ObservacionesRevisionComponent);
    fixture.componentRef.setInput('observaciones', observacionesFicticias);
    fixture.componentRef.setInput('estado', 'Devuelto');
    fixture.componentRef.setInput('hojaDeVida', {
      titulos: [{ id: 'tit-001', nombreTitulo: 'Título Ficticio' }],
    } as HojaDeVidaDto);
    fixture.detectChanges();
    const texto = fixture.nativeElement.textContent as string;
    expect(texto.indexOf('Indicación general ficticia 2')).toBeLessThan(
      texto.indexOf('Indicación general ficticia 1'),
    );
    expect(texto).toContain('Ficha personal');
    expect(texto).toContain('Título: Título Ficticio');
    expect(texto).toContain('Supervisor Ficticio 2');
    expect(texto).toContain('22/10/2026');
    expect(texto).toContain('Estado del expediente: Devuelto');
    expect(fixture.nativeElement.querySelectorAll('[data-marca]').length).toBe(4);
    fixture.componentRef.setInput('estado', 'Enviado');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('[data-marca]').length).toBe(4);
    expect(fixture.nativeElement.textContent).not.toContain('Resuelta');
  });
  it('el contexto de un título conserva sus rondas y excluye marcas de la ficha', async () => {
    await TestBed.configureTestingModule({
      imports: [ObservacionesRevisionComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(ObservacionesRevisionComponent);
    fixture.componentRef.setInput('observaciones', observacionesFicticias);
    fixture.componentRef.setInput('tipoDestino', 'titulo');
    fixture.componentRef.setInput('claveDestino', 'tit-001');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Corregir título ficticio 2');
    expect(fixture.nativeElement.textContent).toContain('Corregir título ficticio 1');
    expect(fixture.nativeElement.textContent).not.toContain('Corregir ficha');
    fixture.componentRef.setInput('claveDestino', 'registro-distinto');
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="observaciones-revision"]'),
    ).toBeNull();
  });
});
