import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ActualizarMarcaDto,
  ArchivosClient,
  ConfiguracionDocumentoClient,
  ConfiguracionDocumentoDto,
  ElegirPlantillaDto,
  PlantillaResumenDto,
  PlantillasHojaDeVidaClient,
} from '../../../api-client';
import { mensajeError } from '../../../core/auth/mensaje-error';

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

@Component({
  selector: 'app-configuracion-documento',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="configuracion-documento-panel" data-testid="panel-configuracion-documento">
      <div class="panel-header">
        <div>
          <h3 class="panel-title">Formato y Marca Institucional de Hoja de Vida</h3>
          <p class="panel-subtitle">
            Seleccione la plantilla global oficial y personalice la identidad gráfica de su
            institución.
          </p>
        </div>
      </div>

      @if (mensajeExito()) {
        <div class="alert alert-success" role="alert" data-testid="mensaje-exito">
          {{ mensajeExito() }}
        </div>
      }

      @if (error()) {
        <div class="alert alert-danger" role="alert" data-testid="mensaje-error">
          {{ error() }}
        </div>
      }

      @if (cargando()) {
        <div class="cargando-box" role="status">
          Cargando configuración institucional del documento...
        </div>
      } @else {
        <!-- ALERTA DE NUEVA VERSIÓN DISPONIBLE (RF-PLA-019) -->
        @if (configuracion()?.hayNuevaVersionDisponible) {
          <div
            class="alert alert-warning alerta-version"
            role="alert"
            data-testid="alerta-nueva-version"
          >
            <div class="alerta-contenido">
              <strong>¡Nueva versión de plantilla disponible!</strong>
              <p>
                El superadmin ha publicado una actualización de la plantilla seleccionada. Su
                institución continuará generando con la versión previa hasta que decida aceptarla.
              </p>
            </div>
            <button
              type="button"
              class="btn btn-warning"
              (click)="aceptarVersion()"
              [disabled]="guardando()"
              data-testid="btn-aceptar-version"
            >
              {{ guardando() ? 'Aceptando...' : 'Aceptar Nueva Versión' }}
            </button>
          </div>
        }

        <div class="grid-dos-columnas">
          <!-- SECCIÓN 1: ELECCIÓN DE PLANTILLA GLOBAL (RF-PLA-003) -->
          <div class="card">
            <h4 class="card-title">1. Plantilla Global de Hoja de Vida</h4>

            <div class="info-actual mb-3">
              <span class="text-muted">Plantilla en uso:</span>
              <strong>{{
                configuracion()?.nombrePlantilla || 'Plantilla Predeterminada del Sistema'
              }}</strong>
              @if (configuracion()?.numeroVersion) {
                <span class="badge badge-info ms-2">v{{ configuracion()?.numeroVersion }}</span>
              }
            </div>

            <div class="form-group">
              <label for="selectPlantilla">Cambiar Plantilla Oficial:</label>
              <select
                id="selectPlantilla"
                class="form-control"
                [(ngModel)]="plantillaSeleccionadaId"
                data-testid="select-plantilla"
              >
                @for (p of plantillasDisponibles(); track p.id) {
                  <option [value]="p.id">
                    {{ p.nombre }} (v{{ p.ultimaVersionPublicada }}){{
                      p.esPredeterminada ? ' - Predeterminada' : ''
                    }}
                  </option>
                }
              </select>
            </div>

            <button
              type="button"
              class="btn btn-primary"
              (click)="guardarPlantilla()"
              [disabled]="guardando() || !plantillaSeleccionadaId"
              data-testid="btn-guardar-plantilla"
            >
              {{ guardando() ? 'Guardando...' : 'Aplicar Plantilla' }}
            </button>
          </div>

          <!-- SECCIÓN 2: PERSONALIZACIÓN DE MARCA INSTITUCIONAL (RF-PLA-004) -->
          <div class="card">
            <h4 class="card-title">2. Marca e Identidad Institucional</h4>

            <form (ngSubmit)="guardarMarca()" data-testid="form-marca">
              <div class="form-group">
                <label for="inputNombreVisible">Nombre Visible Institucional:</label>
                <input
                  id="inputNombreVisible"
                  type="text"
                  class="form-control"
                  [(ngModel)]="nombreVisible"
                  name="nombreVisible"
                  placeholder="Ej: Instituto Superior Tecnológico Ejemplo"
                  data-testid="input-nombre-visible"
                />
              </div>

              <div class="form-row">
                <div class="form-group col">
                  <label for="inputColorPrimario">Color Primario (#RRGGBB):</label>
                  <div class="color-picker-group">
                    <input
                      type="color"
                      class="color-input"
                      [(ngModel)]="colorPrimario"
                      name="colorPrimarioPicker"
                      (change)="sincronizarColorPrimario()"
                    />
                    <input
                      id="inputColorPrimario"
                      type="text"
                      class="form-control"
                      [(ngModel)]="colorPrimario"
                      name="colorPrimario"
                      placeholder="#1B365D"
                      maxlength="7"
                      data-testid="input-color-primario"
                    />
                  </div>
                </div>

                <div class="form-group col">
                  <label for="inputColorSecundario">Color Secundario (#RRGGBB):</label>
                  <div class="color-picker-group">
                    <input
                      type="color"
                      class="color-input"
                      [(ngModel)]="colorSecundario"
                      name="colorSecundarioPicker"
                      (change)="sincronizarColorSecundario()"
                    />
                    <input
                      id="inputColorSecundario"
                      type="text"
                      class="form-control"
                      [(ngModel)]="colorSecundario"
                      name="colorSecundario"
                      placeholder="#4B6B94"
                      maxlength="7"
                      data-testid="input-color-secundario"
                    />
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label for="inputLema">Lema Institucional:</label>
                <input
                  id="inputLema"
                  type="text"
                  class="form-control"
                  [(ngModel)]="lema"
                  name="lema"
                  placeholder="Ej: Excelencia académica y servicio a la sociedad"
                  data-testid="input-lema"
                />
              </div>

              <div class="form-group">
                <label for="inputCompromiso">Texto del Compromiso / Declaración Jurada:</label>
                <textarea
                  id="inputCompromiso"
                  class="form-control"
                  rows="3"
                  [(ngModel)]="textoCompromiso"
                  name="textoCompromiso"
                  placeholder="Texto oficial de declaración jurada y compromiso de veracidad..."
                  data-testid="input-texto-compromiso"
                ></textarea>
              </div>

              <!-- Subida de Logo y Portada -->
              <div class="form-row">
                <div class="form-group col">
                  <label for="fileLogo">Logo Institucional:</label>
                  <input
                    id="fileLogo"
                    type="file"
                    class="form-control"
                    accept="image/png,image/jpeg,image/webp"
                    (change)="subirLogo($event)"
                    data-testid="input-subir-logo"
                  />
                  @if (logoArchivoId) {
                    <span class="badge badge-success mt-1" data-testid="badge-logo-cargado">
                      Logo cargado
                    </span>
                  }
                </div>

                <div class="form-group col">
                  <label for="filePortada">Imagen de Portada:</label>
                  <input
                    id="filePortada"
                    type="file"
                    class="form-control"
                    accept="image/png,image/jpeg,image/webp"
                    (change)="subirPortada($event)"
                    data-testid="input-subir-portada"
                  />
                  @if (portadaArchivoId) {
                    <span class="badge badge-success mt-1" data-testid="badge-portada-cargada">
                      Portada cargada
                    </span>
                  }
                </div>
              </div>

              <button
                type="submit"
                class="btn btn-success mt-3"
                [disabled]="guardando() || subiendoArchivo()"
                data-testid="btn-guardar-marca"
              >
                {{ guardando() ? 'Guardando...' : 'Guardar Marca Institucional' }}
              </button>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .configuracion-documento-panel {
      padding: 0.5rem 0;
    }
    .panel-header {
      margin-bottom: 1.25rem;
    }
    .panel-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.25rem 0;
    }
    .panel-subtitle {
      font-size: 0.85rem;
      color: #64748b;
      margin: 0;
    }
    .alert {
      padding: 0.75rem 1rem;
      border-radius: 0.375rem;
      margin-bottom: 1rem;
      font-size: 0.875rem;
    }
    .alert-success {
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
    }
    .alert-danger {
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
    }
    .alerta-version {
      background-color: #fffbeb;
      border: 1px solid #fde68a;
      color: #92400e;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
    .alerta-contenido p {
      margin: 0.25rem 0 0 0;
      font-size: 0.8125rem;
    }
    .grid-dos-columnas {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.375rem;
      padding: 1.25rem;
    }
    .card-title {
      font-size: 1rem;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 1rem 0;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 0.5rem;
    }
    .form-group {
      margin-bottom: 0.875rem;
    }
    .form-group label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #475569;
      margin-bottom: 0.25rem;
    }
    .form-control {
      width: 100%;
      box-sizing: border-box;
      padding: 0.5rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.375rem;
      font-size: 0.875rem;
    }
    .form-row {
      display: flex;
      gap: 0.75rem;
    }
    .col {
      flex: 1;
    }
    .color-picker-group {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .color-input {
      width: 40px;
      height: 38px;
      border: 1px solid #cbd5e1;
      border-radius: 0.375rem;
      padding: 2px;
      cursor: pointer;
    }
    .badge {
      display: inline-block;
      padding: 0.2rem 0.4rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge-info {
      background: #e0f2fe;
      color: #0369a1;
    }
    .badge-success {
      background: #dcfce7;
      color: #166534;
    }
    .ms-2 {
      margin-left: 0.5rem;
    }
    .mt-1 {
      margin-top: 0.25rem;
    }
    .mt-3 {
      margin-top: 0.75rem;
    }
    .mb-3 {
      margin-bottom: 0.75rem;
    }
    .text-muted {
      color: #64748b;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: 0.375rem;
      border: 1px solid transparent;
      cursor: pointer;
    }
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-primary {
      background: #2563eb;
      color: #ffffff;
    }
    .btn-warning {
      background: #f59e0b;
      color: #ffffff;
    }
    .btn-success {
      background: #16a34a;
      color: #ffffff;
    }
    .cargando-box {
      padding: 2rem;
      text-align: center;
      color: #64748b;
    }
    @media (max-width: 768px) {
      .grid-dos-columnas {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class ConfiguracionDocumentoComponent implements OnInit {
  private readonly client = inject(ConfiguracionDocumentoClient);
  private readonly plantillasClient = inject(PlantillasHojaDeVidaClient);
  private readonly archivosClient = inject(ArchivosClient);

  readonly configuracion = signal<ConfiguracionDocumentoDto | null>(null);
  readonly plantillasDisponibles = signal<PlantillaResumenDto[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly guardando = signal<boolean>(false);
  readonly subiendoArchivo = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly mensajeExito = signal<string | null>(null);

  plantillaSeleccionadaId = '';
  nombreVisible = '';
  colorPrimario = '#1B365D';
  colorSecundario = '#4B6B94';
  lema = '';
  textoCompromiso = '';
  logoArchivoId: string | undefined = undefined;
  portadaArchivoId: string | undefined = undefined;

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.plantillasClient.listarPlantillasHojaDeVida(true).subscribe({
      next: (plantillas) => {
        this.plantillasDisponibles.set(plantillas);
        this.cargarConfiguracion();
      },
      error: (err) => {
        this.error.set(mensajeError(err, 'Error al listar plantillas disponibles.'));
        this.cargando.set(false);
      },
    });
  }

  private cargarConfiguracion(): void {
    this.client.obtenerConfiguracionDocumento().subscribe({
      next: (cfg) => {
        this.configuracion.set(cfg);
        this.plantillaSeleccionadaId = cfg.plantillaId || '';
        this.nombreVisible = cfg.nombreVisible || '';
        this.colorPrimario = cfg.colorPrimario || '#1B365D';
        this.colorSecundario = cfg.colorSecundario || '#4B6B94';
        this.lema = cfg.lema || '';
        this.textoCompromiso = cfg.textoCompromiso || '';
        this.logoArchivoId = cfg.logoArchivoId;
        this.portadaArchivoId = cfg.portadaArchivoId;
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(mensajeError(err, 'Error al cargar la configuración del documento.'));
        this.cargando.set(false);
      },
    });
  }

  sincronizarColorPrimario(): void {
    if (!HEX_COLOR_REGEX.test(this.colorPrimario)) {
      this.colorPrimario = '#1B365D';
    }
  }

  sincronizarColorSecundario(): void {
    if (!HEX_COLOR_REGEX.test(this.colorSecundario)) {
      this.colorSecundario = '#4B6B94';
    }
  }

  guardarPlantilla(): void {
    if (!this.plantillaSeleccionadaId) return;

    this.guardando.set(true);
    this.error.set(null);
    this.mensajeExito.set(null);

    const body: ElegirPlantillaDto = {
      plantillaId: this.plantillaSeleccionadaId,
    };

    this.client.elegirPlantillaDocumento(body).subscribe({
      next: (cfgActualizada) => {
        this.configuracion.set(cfgActualizada);
        this.mensajeExito.set('Plantilla institucional actualizada exitosamente.');
        this.guardando.set(false);
      },
      error: (err) => {
        this.error.set(mensajeError(err, 'Error al actualizar la plantilla.'));
        this.guardando.set(false);
      },
    });
  }

  aceptarVersion(): void {
    this.guardando.set(true);
    this.error.set(null);
    this.mensajeExito.set(null);

    this.client.aceptarVersionDocumento().subscribe({
      next: (cfgActualizada) => {
        this.configuracion.set(cfgActualizada);
        this.mensajeExito.set('Nueva versión de la plantilla aceptada exitosamente.');
        this.guardando.set(false);
      },
      error: (err) => {
        this.error.set(mensajeError(err, 'Error al aceptar la nueva versión.'));
        this.guardando.set(false);
      },
    });
  }

  guardarMarca(): void {
    if (!HEX_COLOR_REGEX.test(this.colorPrimario)) {
      this.error.set('El color primario debe tener formato hexadecimal válido (#RRGGBB).');
      return;
    }
    if (!HEX_COLOR_REGEX.test(this.colorSecundario)) {
      this.error.set('El color secundario debe tener formato hexadecimal válido (#RRGGBB).');
      return;
    }

    this.guardando.set(true);
    this.error.set(null);
    this.mensajeExito.set(null);

    const body: ActualizarMarcaDto = {
      nombreVisible: this.nombreVisible.trim() || undefined,
      colorPrimario: this.colorPrimario.toUpperCase(),
      colorSecundario: this.colorSecundario.toUpperCase(),
      lema: this.lema.trim() || undefined,
      textoCompromiso: this.textoCompromiso.trim() || undefined,
      logoArchivoId: this.logoArchivoId,
      portadaArchivoId: this.portadaArchivoId,
    };

    this.client.actualizarMarcaDocumento(body).subscribe({
      next: (cfgActualizada) => {
        this.configuracion.set(cfgActualizada);
        this.mensajeExito.set('Configuración de marca institucional guardada exitosamente.');
        this.guardando.set(false);
      },
      error: (err) => {
        this.error.set(mensajeError(err, 'Error al guardar la marca institucional.'));
        this.guardando.set(false);
      },
    });
  }

  subirLogo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.subiendoArchivo.set(true);
    this.error.set(null);

    this.archivosClient
      .subirArchivo('marca', undefined, { data: file, fileName: file.name })
      .subscribe({
        next: (archivo) => {
          this.logoArchivoId = archivo.id;
          this.subiendoArchivo.set(false);
          this.mensajeExito.set(
            'Logo institucional subido correctamente. Guarde la marca para aplicar.',
          );
        },
        error: (err) => {
          this.error.set(mensajeError(err, 'Error al subir el logo institucional.'));
          this.subiendoArchivo.set(false);
        },
      });
  }

  subirPortada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.subiendoArchivo.set(true);
    this.error.set(null);

    this.archivosClient
      .subirArchivo('marca', undefined, { data: file, fileName: file.name })
      .subscribe({
        next: (archivo) => {
          this.portadaArchivoId = archivo.id;
          this.subiendoArchivo.set(false);
          this.mensajeExito.set(
            'Imagen de portada subida correctamente. Guarde la marca para aplicar.',
          );
        },
        error: (err) => {
          this.error.set(mensajeError(err, 'Error al subir la imagen de portada.'));
          this.subiendoArchivo.set(false);
        },
      });
  }
}
