import { mensajeError } from '../../../../../core/auth/mensaje-error';
import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DocumentoRequeridoDto, GuardarDocumentoPersonalRequest } from '../../../../../api-client';
import { MarcaObservacionComponent } from '../../componentes/marca-observacion.component';
import { UploaderRespaldoComponent } from '../../componentes/uploader-respaldo.component';
import { HojaDeVidaStateService } from '../../servicios/hoja-de-vida-state.service';

@Component({
  selector: 'app-documentos-personales',
  standalone: true,
  imports: [CommonModule, FormsModule, UploaderRespaldoComponent, MarcaObservacionComponent],
  template: `
    <section class="seccion-documentos" data-testid="seccion-documentos-personales">
      <header class="seccion-header">
        <div class="header-titulos">
          <h2 class="seccion-titulo">6. Documentación Personal y Respaldo Institucional</h2>
          <p class="seccion-desc">
            Cargue los documentos obligatorios exigidos según su tipo de vinculación institucional
            (RF-HDV-007, RF-HDV-008). Todos los documentos marcados como obligatorios deben estar
            debidamente cargados para poder enviar su hoja de vida a validación (RF-HDV-009).
          </p>
        </div>
      </header>

      <div class="cards-documentos-grid">
        @for (req of documentosRequeridos(); track req.tipoDocumentoId) {
          <div
            class="card-documento"
            [class.card-documento-cargado]="req.registrado?.archivoId"
            [class.card-documento-faltante]="req.esObligatorio && !req.registrado?.archivoId"
            data-testid="card-doc-requerido"
          >
            <div class="card-doc-header">
              <div class="doc-titulos">
                <span class="doc-codigo">{{ req.codigo }}</span>
                <h3 class="doc-nombre">{{ req.nombre }}</h3>
              </div>
              <div class="doc-estado-badge">
                @if (req.registrado?.archivoId) {
                  <span class="badge badge-success" data-testid="badge-doc-cargado">✓ Cargado</span>
                } @else if (req.esObligatorio) {
                  <span class="badge badge-danger" data-testid="badge-doc-obligatorio"
                    >✕ Obligatorio</span
                  >
                } @else {
                  <span class="badge badge-info">Opcional</span>
                }
              </div>
            </div>

            @if (req.descripcion) {
              <p class="doc-descripcion">{{ req.descripcion }}</p>
            }

            <!-- Marca de observación del supervisor si existe -->
            <app-marca-observacion
              [marca]="obtenerMarca('documento_personal', req.tipoDocumentoId)"
            ></app-marca-observacion>

            <!-- Uploader de archivo de respaldo -->
            <div class="mt-3">
              <app-uploader-respaldo
                [etiqueta]="'Archivo Digital: ' + req.nombre"
                ayuda="PDF o imagen legible (máx. 10 MB, aviso desde 5 MB)"
                [requerido]="req.esObligatorio"
                [puedeEditar]="puedeEditar()"
                [archivoId]="req.registrado?.archivoId"
                (archivoIdChange)="guardarArchivo(req, $event)"
              ></app-uploader-respaldo>
            </div>

            @if (req.registrado?.fechaActualizacionUtc) {
              <div class="doc-footer mt-2">
                <span class="text-muted text-xs">
                  Actualizado: {{ formatearFecha(req.registrado?.fechaActualizacionUtc) }}
                </span>
              </div>
            }
          </div>
        } @empty {
          <div class="empty-state card-full">
            No se encontraron requisitos de documentación personal configurados para su perfil.
          </div>
        }
      </div>

      @if (errorMensaje()) {
        <div class="alert alert-danger mt-3" data-testid="error-documentos">
          {{ errorMensaje() }}
        </div>
      }
    </section>
  `,
  styles: [
    `
      .seccion-documentos {
        padding: 1.25rem 0;
      }
      .seccion-header {
        margin-bottom: 1.25rem;
      }
      .seccion-titulo {
        font-size: 1.25rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 0.25rem 0;
      }
      .seccion-desc {
        font-size: 0.875rem;
        color: #64748b;
        margin: 0;
      }
      .cards-documentos-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 1.25rem;
      }
      .card-documento {
        background: var(--geist-surface, #ffffff);
        border: 1px solid var(--geist-border, #eaeaea);
        border-radius: var(--radius-md, 8px);
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        transition: border-color 0.15s ease-in-out;
      }
      .card-documento-cargado {
        border-left: 4px solid #16a34a;
      }
      .card-documento-faltante {
        border-left: 4px solid #dc2626;
        background: #fffafa;
      }
      .card-doc-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 0.75rem;
        margin-bottom: 0.5rem;
      }
      .doc-codigo {
        font-size: 0.75rem;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        display: block;
      }
      .doc-nombre {
        font-size: 0.975rem;
        font-weight: 700;
        color: #1e293b;
        margin: 0.125rem 0 0 0;
      }
      .doc-descripcion {
        font-size: 0.8125rem;
        color: #64748b;
        margin: 0.25rem 0 0.5rem 0;
      }
      .badge {
        display: inline-block;
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
        white-space: nowrap;
      }
      .badge-success {
        background: #dcfce7;
        color: #15803d;
      }
      .badge-danger {
        background: #fee2e2;
        color: #b91c1c;
      }
      .badge-info {
        background: #e0f2fe;
        color: #0369a1;
      }
      .text-muted {
        color: #94a3b8;
      }
      .text-xs {
        font-size: 0.75rem;
      }
      .mt-2 {
        margin-top: 0.5rem;
      }
      .mt-3 {
        margin-top: 0.75rem;
      }
      .alert-danger {
        background: #fee2e2;
        color: #991b1b;
        padding: 0.75rem;
        border-radius: 6px;
        font-size: 0.875rem;
      }
      .empty-state {
        color: #94a3b8;
        padding: 2rem;
        text-align: center;
        background: #f8fafc;
        border-radius: 8px;
        border: 1px dashed #cbd5e1;
      }
      .card-full {
        grid-column: 1 / -1;
      }
    `,
  ],
})
export class DocumentosPersonalesComponent {
  private readonly state = inject(HojaDeVidaStateService);

  readonly puedeEditar = this.state.puedeEditar;
  readonly documentosRequeridos = this.state.documentosRequeridos;
  readonly errorMensaje = signal('');

  guardarArchivo(req: DocumentoRequeridoDto, archivoId?: string): void {
    if (!archivoId) return;

    this.errorMensaje.set('');
    const request: GuardarDocumentoPersonalRequest = {
      archivoId,
      numeroDocumento: req.registrado?.numeroDocumento,
      entidadEmisora: req.registrado?.entidadEmisora,
      fechaEmision: req.registrado?.fechaEmision,
      fechaVencimiento: req.registrado?.fechaVencimiento,
      categoriaLicencia: req.registrado?.categoriaLicencia,
      puntosLicencia: req.registrado?.puntosLicencia,
    };

    this.state.guardarDocumentoPersonal(req.tipoDocumentoId, request).subscribe({
      error: (err) =>
        this.errorMensaje.set(mensajeError(err, 'Error al registrar el documento personal.')),
    });
  }

  formatearFecha(fecha?: Date): string {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-EC', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  obtenerMarca(tipoDestino: string, claveDestino: string) {
    return this.state.obtenerMarcaParaItem(tipoDestino, claveDestino);
  }
}
