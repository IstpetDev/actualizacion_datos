import { mensajeError } from '../../../../core/auth/mensaje-error';
import { CommonModule } from '@angular/common';
import {
  Component,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { finalize } from 'rxjs';
import { API_BASE_URL, ArchivosClient, FileResponse } from '../../../../api-client';
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

      <!-- Modo con vista previa de imagen (fotografía) -->
      @if (mostrarVistaPrevia() || soloImagenes()) {
        <!-- Caso con imagen para mostrar (vista previa local o persistida) -->
        @if (vistaPreviaUrl() || archivoId()) {
          <div class="foto-card" data-testid="foto-previa-contenedor">
            <div class="foto-marco">
              <img
                [src]="vistaPreviaUrl() || (archivoId() ? obtenerUrlDescarga(archivoId()!) : '')"
                [alt]="
                  esSeleccionPendiente()
                    ? 'Vista previa de la foto seleccionada'
                    : 'Foto de perfil guardada'
                "
                class="foto-img"
                [attr.data-testid]="
                  esSeleccionPendiente() ? 'foto-vista-previa' : 'foto-persistida'
                "
              />
            </div>
            <div class="foto-detalles">
              <div class="foto-estados">
                @if (esSeleccionPendiente()) {
                  <span class="badge-estado badge-pendiente" data-testid="badge-pendiente">
                    Foto seleccionada (sin guardar)
                  </span>
                } @else {
                  <span class="badge-estado badge-guardada" data-testid="badge-guardada">
                    Foto guardada
                  </span>
                }
              </div>

              <div class="foto-acciones">
                @if (!esSeleccionPendiente() && archivoId(); as id) {
                  <a
                    [href]="obtenerUrlDescarga(id)"
                    (click)="descargarArchivo(id, $event)"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn-enlace"
                    data-testid="btn-descargar-foto"
                  >
                    {{ descargando() ? 'Descargando...' : 'Ver / Descargar' }}
                  </a>
                }

                @if (puedeEditar()) {
                  <button
                    type="button"
                    class="btn-accion btn-reemplazar"
                    (click)="abrirSelectorFoto()"
                    [disabled]="subiendo()"
                    data-testid="btn-reemplazar-foto"
                  >
                    {{ esSeleccionPendiente() ? 'Cambiar selección' : 'Reemplazar foto' }}
                  </button>

                  @if (esSeleccionPendiente()) {
                    <button
                      type="button"
                      class="btn-accion btn-cancelar"
                      (click)="cancelarSeleccion()"
                      [disabled]="subiendo()"
                      data-testid="btn-cancelar-seleccion"
                    >
                      Cancelar selección
                    </button>
                  } @else {
                    <button
                      type="button"
                      class="btn-accion btn-quitar"
                      (click)="quitarArchivo()"
                      [disabled]="subiendo()"
                      title="Quitar foto"
                      data-testid="btn-quitar-foto"
                    >
                      Quitar foto
                    </button>
                  }
                }
              </div>

              @if (subiendo()) {
                <span class="subiendo-indicador">Subiendo archivo...</span>
              }
            </div>
          </div>
        } @else {
          <!-- Caso sin imagen registrada ni seleccionada -->
          @if (puedeEditar()) {
            <div class="foto-vacia-card" data-testid="foto-vacia">
              <div class="foto-placeholder-silueta" aria-hidden="true">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#94a3b8"
                  stroke-width="1.5"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <div class="foto-vacia-acciones">
                <button
                  type="button"
                  class="btn-accion btn-seleccionar"
                  (click)="abrirSelectorFoto()"
                  [disabled]="subiendo()"
                  data-testid="btn-seleccionar-foto"
                >
                  Seleccionar foto
                </button>
                @if (subiendo()) {
                  <span class="subiendo-indicador">Subiendo archivo...</span>
                }
              </div>
            </div>
          } @else {
            <p class="sin-foto-aviso">Sin foto de perfil registrada.</p>
          }
        }

        <!-- Input file para modo fotografía -->
        @if (puedeEditar()) {
          <input
            #inputArchivoFoto
            type="file"
            accept="image/png,image/jpeg,image/webp"
            (change)="onArchivoSeleccionado($event)"
            [disabled]="subiendo()"
            class="input-file-oculto"
            data-testid="input-archivo"
            aria-label="Seleccionar imagen de fotografía"
          />
        }
      } @else {
        <!-- Modo estándar para documentos adjuntos / PDFs -->
        @if (archivoId(); as id) {
          <div class="archivo-cargado-badge" data-testid="archivo-asignado">
            <div class="archivo-info">
              <span class="archivo-icono">📄</span>
              <span class="archivo-nombre">{{ nombreArchivo() || 'Documento adjunto' }}</span>
            </div>
            <div class="archivo-acciones">
              <a
                [href]="obtenerUrlDescarga(id)"
                (click)="descargarArchivo(id, $event)"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-enlace"
                data-testid="btn-descargar-respaldo"
              >
                {{ descargando() ? 'Descargando...' : 'Ver / Descargar' }}
              </a>
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

      /* Estilos para vista previa de fotografía */
      .foto-card {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 1.25rem;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 1rem;
      }
      .foto-marco {
        width: 120px;
        height: 140px;
        flex-shrink: 0;
        border-radius: 6px;
        overflow: hidden;
        background: #e2e8f0;
        border: 1px solid #cbd5e1;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .foto-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .foto-detalles {
        display: flex;
        flex-direction: column;
        gap: 0.625rem;
        flex: 1;
      }
      .foto-estados {
        display: flex;
        align-items: center;
      }
      .badge-estado {
        display: inline-block;
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
      }
      .badge-pendiente {
        background: #fef3c7;
        color: #92400e;
        border: 1px solid #fde68a;
      }
      .badge-guardada {
        background: #dcfce7;
        color: #166534;
        border: 1px solid #bbf7d0;
      }
      .foto-acciones {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.75rem;
      }
      .btn-accion {
        padding: 0.375rem 0.75rem;
        font-size: 0.8125rem;
        font-weight: 500;
        border-radius: 5px;
        cursor: pointer;
        border: 1px solid transparent;
        transition:
          background-color 0.2s,
          border-color 0.2s;
      }
      .btn-reemplazar {
        background: #ffffff;
        border-color: #cbd5e1;
        color: #334155;
      }
      .btn-reemplazar:hover:not(:disabled) {
        background: #f1f5f9;
        border-color: #94a3b8;
      }
      .btn-cancelar {
        background: #fff1f2;
        border-color: #fecdd3;
        color: #e11d48;
      }
      .btn-cancelar:hover:not(:disabled) {
        background: #ffe4e6;
      }
      .btn-quitar {
        background: transparent;
        border: none;
        color: #ef4444;
        font-weight: 500;
        padding: 0.25rem 0.5rem;
      }
      .btn-quitar:hover:not(:disabled) {
        text-decoration: underline;
      }
      .foto-vacia-card {
        display: flex;
        align-items: center;
        gap: 1.25rem;
        background: #f8fafc;
        border: 1px dashed #cbd5e1;
        border-radius: 8px;
        padding: 1rem;
      }
      .foto-placeholder-silueta {
        width: 80px;
        height: 90px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f1f5f9;
        border-radius: 6px;
      }
      .btn-seleccionar {
        background: var(--ammi-primary, #1d1e1c);
        color: #ffffff;
        border: 1px solid var(--ammi-primary, #1d1e1c);
      }
      .btn-seleccionar:hover:not(:disabled) {
        background: var(--ammi-primary-hover, #0f100e);
      }
      .input-file-oculto {
        display: none;
      }
      .sin-foto-aviso {
        font-size: 0.875rem;
        color: #64748b;
        font-style: italic;
        margin: 0.5rem 0;
      }
    `,
  ],
})
export class UploaderRespaldoComponent {
  private readonly archivosClient = inject(ArchivosClient);
  private readonly baseUrl = inject(API_BASE_URL, { optional: true }) ?? '';

  readonly inputArchivoFoto = viewChild<ElementRef<HTMLInputElement>>('inputArchivoFoto');

  readonly archivoId = input<string | undefined>(undefined);
  readonly archivoIdGuardado = input<string | undefined>(undefined);
  readonly nombreArchivo = input<string | undefined>(undefined);
  readonly claveDestino = input<string | undefined>(undefined);
  readonly puedeEditar = input<boolean>(true);
  readonly requerido = input<boolean>(true);
  readonly etiqueta = input<string>('Archivo de respaldo');
  readonly ayuda = input<string>('Formatos permitidos: PDF, JPG, PNG (máx. 10 MB)');
  readonly soloImagenes = input<boolean>(false);
  readonly mostrarVistaPrevia = input<boolean>(false);

  readonly archivoIdChange = output<string>();
  readonly archivoEliminado = output<void>();

  readonly subiendo = signal(false);
  readonly descargando = signal(false);
  readonly error = signal('');
  readonly avisoTamanio = signal('');
  readonly vistaPreviaUrl = signal<string | null>(null);
  readonly esSeleccionPendiente = signal(false);

  constructor() {
    effect(() => {
      const id = this.archivoId();
      const guardado = this.archivoIdGuardado();
      if (id && guardado && id === guardado) {
        this.esSeleccionPendiente.set(false);
        this.vistaPreviaUrl.set(null);
      }
    });
  }

  abrirSelectorFoto(): void {
    this.inputArchivoFoto()?.nativeElement.click();
  }

  onArchivoSeleccionado(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const archivo = inputEl.files?.[0];
    if (!archivo) return;

    this.error.set('');
    this.avisoTamanio.set('');

    // Validación de tipo imagen si aplica
    if (this.soloImagenes()) {
      const esPdf = archivo.type === 'application/pdf' || /\.pdf$/i.test(archivo.name);
      const esImagen =
        (archivo.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(archivo.name)) && !esPdf;
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

    // Generar vista previa local si mostrarVistaPrevia o soloImagenes está activo
    if (this.mostrarVistaPrevia() || this.soloImagenes()) {
      this.generarVistaPreviaLocal(archivo);
    }

    this.subirArchivo(archivo, inputEl);
  }

  private generarVistaPreviaLocal(archivo: File): void {
    this.esSeleccionPendiente.set(true);

    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      try {
        const url = URL.createObjectURL(archivo);
        if (url) {
          this.vistaPreviaUrl.set(url);
          return;
        }
      } catch {
        // Fallback a FileReader si ocurre un error
      }
    }

    if (typeof FileReader !== 'undefined') {
      const reader = new FileReader();
      reader.onload = () => {
        this.vistaPreviaUrl.set(reader.result as string);
      };
      reader.readAsDataURL(archivo);
    }
  }

  cancelarSeleccion(): void {
    this.error.set('');
    this.avisoTamanio.set('');
    this.vistaPreviaUrl.set(null);
    this.esSeleccionPendiente.set(false);

    const guardado = this.archivoIdGuardado();
    if (guardado) {
      this.archivoIdChange.emit(guardado);
    } else {
      this.archivoEliminado.emit();
    }
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

  descargarArchivo(id: string, event?: Event): void {
    if (event) {
      event.preventDefault();
    }
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

  obtenerUrlDescarga(id: string): string {
    return `${this.baseUrl}/api/archivos/${encodeURIComponent(id)}/descargar`;
  }

  quitarArchivo(): void {
    this.error.set('');
    this.avisoTamanio.set('');
    this.vistaPreviaUrl.set(null);
    this.esSeleccionPendiente.set(false);
    this.archivoEliminado.emit();
  }
}
