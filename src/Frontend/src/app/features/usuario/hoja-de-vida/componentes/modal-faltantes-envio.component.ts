import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { FaltanteEnvioDto } from '../../../../api-client';

@Component({
  selector: 'app-modal-faltantes-envio',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (abierto()) {
      <div
        class="modal-backdrop"
        (click)="onBackdropClick($event)"
        (keyup.escape)="cerrar.emit()"
        tabindex="0"
        role="dialog"
        aria-modal="true"
        data-testid="modal-faltantes"
      >
        <div class="modal-card">
          <header class="modal-header">
            <h3 class="modal-titulo">Requisitos Incompletos para el Envío</h3>
            <button type="button" class="btn-cerrar" (click)="cerrar.emit()">✕</button>
          </header>

          <div class="modal-cuerpo">
            <p class="modal-instruccion">
              Para poder enviar tu hoja de vida a revisión institucional, debes completar los
              siguientes campos o documentos obligatorios:
            </p>

            <ul class="lista-faltantes">
              @for (f of faltantes(); track $index) {
                <li class="item-faltante">
                  <span class="badge-seccion">{{ formatearSeccion(f.seccion) }}</span>
                  <span class="mensaje-faltante">{{ f.mensaje }}</span>
                </li>
              } @empty {
                <li class="text-muted">No hay faltantes registrados.</li>
              }
            </ul>
          </div>

          <footer class="modal-footer">
            <button type="button" class="btn btn-primary" (click)="cerrar.emit()">
              Entendido, continuar editando
            </button>
          </footer>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 1rem;
      }
      .modal-card {
        background: #ffffff;
        border-radius: 8px;
        width: 100%;
        max-width: 550px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .modal-header {
        padding: 1rem 1.25rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #e2e8f0;
      }
      .modal-titulo {
        font-size: 1.1rem;
        font-weight: 700;
        color: #b91c1c;
        margin: 0;
      }
      .btn-cerrar {
        background: transparent;
        border: none;
        font-size: 1.25rem;
        color: #64748b;
        cursor: pointer;
      }
      .modal-cuerpo {
        padding: 1.25rem;
        max-height: 400px;
        overflow-y: auto;
      }
      .modal-instruccion {
        font-size: 0.875rem;
        color: #475569;
        margin: 0 0 1rem 0;
      }
      .lista-faltantes {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .item-faltante {
        display: flex;
        align-items: flex-start;
        gap: 0.625rem;
        padding: 0.5rem 0.75rem;
        background: #fef2f2;
        border: 1px solid #fee2e2;
        border-radius: 6px;
      }
      .badge-seccion {
        font-size: 0.75rem;
        font-weight: 700;
        background: #fee2e2;
        color: #991b1b;
        padding: 0.125rem 0.375rem;
        border-radius: 4px;
        white-space: nowrap;
      }
      .mensaje-faltante {
        font-size: 0.8125rem;
        color: #7f1d1d;
        line-height: 1.35;
      }
      .modal-footer {
        padding: 0.875rem 1.25rem;
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
        display: flex;
        justify-content: flex-end;
      }
      .btn {
        padding: 0.5rem 1rem;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        border: none;
      }
      .btn-primary {
        background: var(--ammi-primary, #1d1e1c);
        border: 1px solid var(--ammi-primary, #1d1e1c);
        color: #ffffff;
      }
    `,
  ],
})
export class ModalFaltantesEnvioComponent {
  readonly faltantes = input<FaltanteEnvioDto[]>([]);
  readonly abierto = input<boolean>(false);
  readonly cerrar = output<void>();

  formatearSeccion(seccion: string): string {
    const mapa: Record<string, string> = {
      FichaPersonal: 'Ficha Personal',
      FormacionAcademica: 'Instrucción Formal',
      Capacitaciones: 'Capacitaciones',
      ExperienciasLaborales: 'Experiencia Laboral',
      ReferenciasPersonales: 'Referencias',
      CuentaBancaria: 'Datos Bancarios',
      DocumentosPersonales: 'Documentos',
    };
    return mapa[seccion] || seccion;
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.cerrar.emit();
    }
  }
}
