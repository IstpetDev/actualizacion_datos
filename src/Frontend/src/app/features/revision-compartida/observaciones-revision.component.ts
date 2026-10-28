import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { ArchivoDto, HojaDeVidaDto, ObservacionDto } from '../../api-client';
import { coincideMarca, describirDestino, ordenarObservaciones } from './observaciones-revision';

@Component({
  selector: 'app-observaciones-revision',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (rondas().length) {
      <section
        class="observaciones"
        aria-label="Observaciones de devolución"
        data-testid="observaciones-revision"
      >
        @if (!tipoDestino()) {
          <h3>Historial de devoluciones</h3>
        }
        @for (observacion of rondas(); track observacion.id) {
          <article class="ronda" [attr.data-ronda]="observacion.ronda">
            <header>
              <strong>Devolución · ronda {{ observacion.ronda }}</strong>
              <span>{{
                observacion.ronda === ultimaRonda() ? 'Última devolución' : 'Devolución anterior'
              }}</span>
            </header>
            <p class="metadatos">
              Autor: {{ observacion.autor }} · {{ observacion.fechaUtc | date: 'dd/MM/yyyy HH:mm' }}
              @if (estado()) {
                · Estado del expediente: {{ estado() }}
              }
            </p>
            @if (!tipoDestino()) {
              <p class="texto general">{{ observacion.texto }}</p>
            }
            @for (marca of observacion.marcas; track marca.id) {
              <div class="marca" [attr.data-marca]="marca.id">
                <strong>{{ destino(marca) }}</strong>
                <p class="texto">{{ marca.texto }}</p>
              </div>
            }
          </article>
        }
      </section>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .observaciones {
      margin: 1rem 0;
    }
    h3 {
      font-size: 1rem;
      margin: 0 0 0.75rem;
    }
    .ronda {
      padding: 0.875rem 1rem;
      border: 1px solid #fed7aa;
      border-left: 4px solid #ea580c;
      border-radius: 0.375rem;
      margin: 0.65rem 0;
      background: #fff7ed;
    }
    header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 0.5rem;
      color: #7c2d12;
    }
    header span,
    .metadatos {
      font-size: 0.8rem;
    }
    .metadatos {
      color: #475569;
      margin: 0.5rem 0;
      overflow-wrap: anywhere;
    }
    .texto {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      margin: 0.35rem 0 0;
      line-height: 1.5;
    }
    .marca {
      padding-top: 0.65rem;
      margin-top: 0.65rem;
      border-top: 1px solid #fed7aa;
    }
    .marca strong {
      font-size: 0.875rem;
    }
  `,
})
export class ObservacionesRevisionComponent {
  readonly observaciones = input<ObservacionDto[]>([]);
  readonly hojaDeVida = input<HojaDeVidaDto | null>(null);
  readonly archivos = input<ArchivoDto[]>([]);
  readonly estado = input('');
  readonly tipoDestino = input<string>();
  readonly claveDestino = input('');
  readonly archivoId = input<string>();
  readonly ultimaRonda = computed(() => Math.max(0, ...this.observaciones().map((o) => o.ronda)));
  readonly rondas = computed(() => {
    const ordenadas = ordenarObservaciones(this.observaciones());
    const tipo = this.tipoDestino();
    return !tipo
      ? ordenadas
      : ordenadas
          .map((o) => ({
            ...o,
            marcas: o.marcas.filter(
              (m) =>
                coincideMarca(m, tipo, this.claveDestino()) ||
                (!!this.archivoId() && coincideMarca(m, 'archivo', this.archivoId()!)),
            ),
          }))
          .filter((o) => o.marcas.length > 0);
  });
  readonly destino = (marca: ObservacionDto['marcas'][number]) =>
    describirDestino(marca, this.hojaDeVida(), this.archivos());
}
