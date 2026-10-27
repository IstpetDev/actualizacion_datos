import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-modal-cambios-sin-guardar',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (abierto) {
      <div class="modal-backdrop" role="presentation" (click)="alHacerClicFondo($event)">
        <div
          class="modal-dialog"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-cambios"
          aria-describedby="desc-modal-cambios"
          (keydown.escape)="quedarse.emit()"
          tabindex="-1"
          data-testid="modal-cambios-sin-guardar"
        >
          <div class="modal-header">
            <div class="icono-aviso" aria-hidden="true">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
                ></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <h2 id="titulo-modal-cambios" class="modal-titulo">Tiene cambios sin guardar</h2>
          </div>

          <div class="modal-body">
            <p id="desc-modal-cambios" class="modal-desc">
              Ha modificado datos en esta sección que aún no han sido guardados en el sistema. Si
              continúa sin guardar, perderá la información ingresada.
            </p>

            @if (guardarDeshabilitado) {
              <p role="alert">
                Hay campos con formato inválido. Elija «Quedarme aquí» para corregirlos antes de
                guardar.
              </p>
            }
            @if (mensajeError) {
              <div class="alerta-error" role="alert" data-testid="error-modal-cambios">
                {{ mensajeError }}
              </div>
            }
          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              [disabled]="guardando"
              (click)="quedarse.emit()"
              data-testid="btn-quedarme-aqui"
            >
              Quedarme aquí
            </button>

            <button
              type="button"
              class="btn btn-danger-outline"
              [disabled]="guardando"
              (click)="descartarYContinuar.emit()"
              data-testid="btn-descartar-cambios"
            >
              Descartar cambios
            </button>

            <button
              type="button"
              class="btn btn-primary"
              [disabled]="guardando || guardarDeshabilitado"
              (click)="guardarYContinuar.emit()"
              data-testid="btn-guardar-continuar"
            >
              {{ guardando ? 'Guardando...' : 'Guardar y continuar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.55);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1050;
        padding: 1rem;
        backdrop-filter: blur(2px);
      }
      .modal-dialog {
        background: #ffffff;
        border-radius: var(--radius-md, 8px);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        max-width: 520px;
        width: 100%;
        overflow: hidden;
        border: 1px solid var(--geist-border, #eaeaea);
        animation: modalFadeIn 0.15s ease-out;
      }
      @keyframes modalFadeIn {
        from {
          opacity: 0;
          transform: scale(0.96);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
      .modal-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1.25rem 1.5rem 0.75rem;
      }
      .icono-aviso {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2.25rem;
        height: 2.25rem;
        border-radius: 50%;
        background-color: #fef3c7;
        color: #d97706;
        flex-shrink: 0;
      }
      .modal-titulo {
        font-size: 1.15rem;
        font-weight: 700;
        color: #111827;
        margin: 0;
      }
      .modal-body {
        padding: 0.5rem 1.5rem 1.25rem;
      }
      .modal-desc {
        font-size: 0.875rem;
        color: #4b5563;
        line-height: 1.45;
        margin: 0;
      }
      .alerta-error {
        margin-top: 0.85rem;
        padding: 0.65rem 0.85rem;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 6px;
        color: #b91c1c;
        font-size: 0.8125rem;
      }
      .modal-footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.625rem;
        padding: 1rem 1.5rem;
        background-color: #f9fafb;
        border-top: 1px solid #f3f4f6;
        flex-wrap: wrap;
      }
      .btn {
        padding: 0.5rem 0.875rem;
        font-size: 0.8125rem;
        font-weight: 600;
        border-radius: 6px;
        cursor: pointer;
        border: 1px solid transparent;
        transition: all var(--transition-fast, 0.15s ease);
      }
      .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .btn-secondary {
        background: #ffffff;
        color: #374151;
        border-color: #d1d5db;
      }
      .btn-secondary:hover:not(:disabled) {
        background: #f3f4f6;
        color: #111827;
      }
      .btn-danger-outline {
        background: transparent;
        color: #dc2626;
        border-color: #fca5a5;
      }
      .btn-danger-outline:hover:not(:disabled) {
        background: #fef2f2;
        border-color: #ef4444;
      }
      .btn-primary {
        background: var(--ammi-primary, #1d1e1c);
        color: #ffffff;
        border-color: var(--ammi-primary, #1d1e1c);
      }
      .btn-primary:hover:not(:disabled) {
        background: #000000;
        border-color: var(--ammi-gold, #fcea1e);
        color: var(--ammi-gold, #fcea1e);
      }
    `,
  ],
})
export class ModalCambiosSinGuardarComponent {
  @Input() abierto = false;
  @Input() guardarDeshabilitado = false;
  @Input() guardando = false;
  @Input() mensajeError = '';

  @Output() guardarYContinuar = new EventEmitter<void>();
  @Output() descartarYContinuar = new EventEmitter<void>();
  @Output() quedarse = new EventEmitter<void>();

  alHacerClicFondo(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.guardando) {
      this.quedarse.emit();
    }
  }
}
