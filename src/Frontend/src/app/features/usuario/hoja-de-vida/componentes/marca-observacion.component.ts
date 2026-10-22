import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { MarcaObservacionDto } from '../../../../api-client';

@Component({
  selector: 'app-marca-observacion',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (marca(); as m) {
      <div class="marca-observacion-box" role="alert" data-testid="marca-observacion">
        <div class="marca-header">
          <span class="marca-tag">Observación de Revisión</span>
        </div>
        <p class="marca-texto">{{ m.texto }}</p>
      </div>
    }
  `,
  styles: [
    `
      .marca-observacion-box {
        margin: 0.5rem 0;
        padding: 0.625rem 0.875rem;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-left: 4px solid #ef4444;
        border-radius: 4px;
      }
      .marca-header {
        margin-bottom: 0.25rem;
      }
      .marca-tag {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        color: #b91c1c;
        letter-spacing: 0.025em;
      }
      .marca-texto {
        font-size: 0.875rem;
        color: #991b1b;
        margin: 0;
        line-height: 1.4;
      }
    `,
  ],
})
export class MarcaObservacionComponent {
  readonly marca = input<MarcaObservacionDto | undefined>(undefined);
}
