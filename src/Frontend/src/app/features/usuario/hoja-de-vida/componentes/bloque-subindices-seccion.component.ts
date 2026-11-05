import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { EstadoSubindiceSeccionPersonaDto } from '../../../../api-client';

export function nombreSubindicePorId(
  subindices: EstadoSubindiceSeccionPersonaDto[] | undefined,
  id?: string,
): string | undefined {
  if (!id || !subindices?.length) return undefined;
  return subindices.find((s) => s.id === id)?.nombre;
}

@Component({
  selector: 'app-bloque-subindices-seccion',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (activos().length > 0) {
      <div class="bloque-subindices" [attr.data-testid]="'bloque-subindices-' + seccion()">
        <div class="subindices-cabecera">
          <h3 class="subindices-titulo">Requisitos y Subíndices de esta Sección</h3>
          <p class="subindices-desc">
            Cargue sus registros diferenciados en los apartados requeridos por la institución.
          </p>
        </div>
        <div class="subindices-grid">
          @for (sub of activos(); track sub.id) {
            <div class="subindice-card" [attr.data-testid]="'card-subindice-' + sub.id">
              <div class="subindice-info">
                <div class="subindice-fila">
                  <strong>{{ sub.nombre }}</strong>
                  <span
                    class="badge"
                    [class.badge-warn]="sub.esObligatorio"
                    [class.badge-sec]="!sub.esObligatorio"
                  >
                    {{ sub.esObligatorio ? 'Obligatorio' : 'Opcional' }}
                  </span>
                  @if (estaCumplido(sub.id)) {
                    <span class="badge badge-ok" [attr.data-testid]="'estado-subindice-' + sub.id">
                      ✓ Cargado
                    </span>
                  } @else if (sub.esObligatorio) {
                    <span
                      class="badge badge-pend"
                      [attr.data-testid]="'estado-subindice-' + sub.id"
                    >
                      ✕ Pendiente
                    </span>
                  }
                </div>
                @if (sub.descripcion) {
                  <p class="subindice-ayuda">{{ sub.descripcion }}</p>
                }
              </div>
              @if (puedeEditar()) {
                <button
                  type="button"
                  class="btn-cargar"
                  (click)="cargarEnSubindice.emit(sub)"
                  [attr.data-testid]="'btn-cargar-subindice-' + sub.id"
                >
                  + Cargar aquí
                </button>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: `
    .bloque-subindices {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 0.9rem 1rem;
      margin-bottom: 1rem;
    }
    .subindices-titulo {
      margin: 0 0 0.15rem;
      font-size: 0.95rem;
      font-weight: 700;
      color: #0f172a;
    }
    .subindices-desc {
      margin: 0 0 0.75rem;
      font-size: 0.8rem;
      color: #475569;
    }
    .subindices-grid {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .subindice-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 0.65rem 0.85rem;
    }
    .subindice-fila {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.85rem;
      color: #0f172a;
    }
    .subindice-ayuda {
      margin: 0.2rem 0 0;
      font-size: 0.78rem;
      color: #64748b;
    }
    .badge {
      display: inline-block;
      padding: 0.12rem 0.45rem;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 600;
    }
    .badge-warn {
      background: #fef3c7;
      color: #92400e;
    }
    .badge-sec {
      background: #e2e8f0;
      color: #334155;
    }
    .badge-ok {
      background: #dcfce7;
      color: #15803d;
    }
    .badge-pend {
      background: #fee2e2;
      color: #b91c1c;
    }
    .btn-cargar {
      padding: 0.35rem 0.7rem;
      border-radius: 6px;
      border: 1px solid #0f172a;
      background: #0f172a;
      color: #fff;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }
  `,
})
export class BloqueSubindicesSeccionComponent {
  readonly seccion = input.required<string>();
  readonly subindices = input<EstadoSubindiceSeccionPersonaDto[]>([]);
  readonly idsCumplidos = input<Set<string>>(new Set());
  readonly puedeEditar = input<boolean>(false);

  readonly cargarEnSubindice = output<EstadoSubindiceSeccionPersonaDto>();

  readonly activos = computed(() =>
    (this.subindices() ?? []).filter((s) => s.seccion === this.seccion() && s.activo),
  );

  estaCumplido(id: string): boolean {
    return this.idsCumplidos().has(id);
  }
}
