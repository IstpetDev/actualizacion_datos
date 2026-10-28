import { mensajeError } from '../../../../core/auth/mensaje-error';
import { CommonModule } from '@angular/common';
import { Component, inject, input, output, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { ArchivosClient, FileResponse } from '../../../../api-client';
import { descargarBlob } from '../../../../core/util/descarga-archivo.util';

const LIMITE_ALERTA_BYTES = 5 * 1024 * 1024; // 5 MB (ADR-0006)
const LIMITE_MAXIMO_BYTES = 10 * 1024 * 1024; // 10 MB (ADR-0006)

@Component({
  selector: 'app-uploader-respaldo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="uploader-container" data-testid="uploader-respaldo">
      <div class="uploader-header">
        <span class="uploader-label">
          {{ etiqueta() }}
          @if (requerido()) {
            <span class="text-danger">*</span>
          }
        </span>
        <span class="uploader-ayuda">{{ ayuda() }}</span>
      </div>

      <!-- Estado: Archivo ya asignado -->
      @if (archivoId(); as id) {
        <div class="archivo-cargado-badge" data-testid="archivo-asignado">
          <div class="archivo-info">
            <span class="archivo-icono">📄</span>
            <span class="archivo-nombre">{{ nombreArchivo() || 'Documento adjunto' }}</span>
          </div>
          <div class="archivo-acciones">
            <button
              type="button"
              class="btn-enlace"
              (click)="descargarArchivo(id)"
              [disabled]="descargando()"
              data-testid="btn-descargar-respaldo"
            >
              {{ descargando() ? 'Descargando...' : 'Ver / Descargar' }}
            </button>
            @if (puedeEditar()) {
              <button
                type="button"
                class="btn-quitar"
                (click)="quitarArchivo()"
                [disabled]="subiendo() || descargando()"
                title="Quitar archivo"
                data-testid="btn-quitar-respaldo"
              >
                ✕
              </button>
            }
          </div>
        </div>
      }

      <!-- Control de selección de archivo cuando puede editar -->
      @if (puedeEditar()) {
        <div class="input-file-wrapper" [class.oculto]="!!archivoId()">
          <input
            type="file"
            [accept]="
              soloImagenes() ? 'image/png,image/jpeg,image/webp' : '.pdf,image/png,image/jpeg'
            "
            (change)="onArchivoSeleccionado($event)"
            [disabled]="subiendo()"
            class="input-file"
            data-testid="input-archivo"
          />
          @if (subiendo()) {
            <span class="subiendo-indicador">Subiendo archivo...</span>
          }
        </div>
      }

      <!-- Alertas de tamaño y errores -->
      @if (avisoTamanio()) {
        <div class="alerta-tamanio" role="alert" data-testid="aviso-tamanio">
          {{ avisoTamanio() }}
        </div>
      }

      @if (error()) {
        <div class="alerta-error" role="alert" data-testid="error-archivo">
          {{ error() }}
        </div>
      }
    </div>
  `,
  styles: [
    `
      .uploader-container {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
        margin: 0.5rem 0;
      }
      .uploader-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
      }
      .uploader-label {
        font-size: 0.875rem;
        font-weight: 600;
        color: #334155;
      }
      .uploader-ayuda {
        font-size: 0.75rem;
        color: #64748b;
      }
      .archivo-cargado-badge {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f1f5f9;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 0.5rem 0.75rem;
      }
      .archivo-info {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: #1e293b;
      }
      .archivo-acciones {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .btn-enlace {
        color: var(--ammi-primary, #1d1e1c);
        font-size: 0.8125rem;
        text-decoration: underline;
        font-weight: 500;
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 0;
      }
      .btn-enlace:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .btn-quitar {
        background: transparent;
        border: none;
        color: #ef4444;
        font-weight: bold;
        cursor: pointer;
        padding: 0 0.25rem;
      }
      .input-file-wrapper {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .input-file-wrapper.oculto {
        display: none;
      }
      .input-file {
        font-size: 0.8125rem;
        color: #475569;
      }
      .subiendo-indicador {
        font-size: 0.8125rem;
        color: var(--ammi-primary, #1d1e1c);
        font-style: italic;
      }
      .alerta-tamanio {
        background: #fffbeb;
        border: 1px solid #fde68a;
        color: #b45309;
        font-size: 0.75rem;
        padding: 0.375rem 0.625rem;
        border-radius: 4px;
      }
      .alerta-error {
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #dc2626;
        font-size: 0.75rem;
        padding: 0.375rem 0.625rem;
        border-radius: 4px;
      }
      .text-danger {
        color: #dc2626;
      }
    `,
  ],
})
export class UploaderRespaldoComponent {
  private readonly archivosClient = inject(ArchivosClient);

  readonly archivoId = input<string | undefined>(undefined);
  readonly nombreArchivo = input<string | undefined>(undefined);
  readonly claveDestino = input<string | undefined>(undefined);
  readonly puedeEditar = input<boolean>(true);
  readonly requerido = input<boolean>(true);
  readonly etiqueta = input<string>('Archivo de respaldo');
  readonly ayuda = input<string>('Formatos permitidos: PDF, JPG, PNG (máx. 10 MB)');
  readonly soloImagenes = input<boolean>(false);

  readonly archivoIdChange = output<string>();
  readonly archivoEliminado = output<void>();

  readonly subiendo = signal(false);
  readonly descargando = signal(false);
  readonly error = signal('');
  readonly avisoTamanio = signal('');

  onArchivoSeleccionado(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const archivo = inputEl.files?.[0];
    if (!archivo) return;

    this.error.set('');
    this.avisoTamanio.set('');

    // Validación de tipo imagen si aplica
    if (this.soloImagenes()) {
      const esImagen =
        archivo.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(archivo.name);
      if (!esImagen) {
        this.error.set('Formato inválido. Solo se admiten imágenes (JPG, PNG).');
        inputEl.value = '';
        return;
      }
    }

    // Validación de tamaño máximo (10 MB)
    if (archivo.size > LIMITE_MAXIMO_BYTES) {
      this.error.set('El archivo supera el tamaño máximo permitido de 10 MB.');
      inputEl.value = '';
      return;
    }

    // Aviso informativo de 5 MB (ADR-0006)
    if (archivo.size > LIMITE_ALERTA_BYTES) {
      this.avisoTamanio.set(
        'Aviso: El archivo supera los 5 MB. Considere comprimirlo para optimizar la carga.',
      );
    }

    this.subirArchivo(archivo, inputEl);
  }

  private subirArchivo(archivo: File, inputEl: HTMLInputElement): void {
    this.subiendo.set(true);

    const parametroArchivo = {
      data: archivo,
      fileName: archivo.name,
    };

    this.archivosClient
      .subirArchivo(this.claveDestino() || undefined, undefined, parametroArchivo)
      .pipe(
        finalize(() => {
          this.subiendo.set(false);
          inputEl.value = '';
        }),
      )
      .subscribe({
        next: (res) => {
          if (res?.id) {
            this.archivoIdChange.emit(res.id);
          }
        },
        error: (err) => {
          this.error.set(mensajeError(err, 'Error al subir el archivo.'));
        },
      });
  }

  descargarArchivo(id: string): void {
    if (this.descargando()) return;
    this.descargando.set(true);
    this.error.set('');

    this.archivosClient.descargarArchivo(id).subscribe({
      next: (res: FileResponse | Blob) => {
        this.descargando.set(false);
        const blob = res instanceof Blob ? res : res?.data;
        if (!blob) {
          this.error.set('El archivo descargado está vacío.');
          return;
        }
        const fileName = !(res instanceof Blob) ? res?.fileName : undefined;
        const nombre = fileName || this.nombreArchivo() || 'archivo_adjunto';
        descargarBlob(blob, nombre);
      },
      error: (err) => {
        this.descargando.set(false);
        this.error.set(mensajeError(err, 'Error al descargar el archivo.'));
      },
    });
  }

  quitarArchivo(): void {
    this.error.set('');
    this.avisoTamanio.set('');
    this.archivoEliminado.emit();
  }
}
