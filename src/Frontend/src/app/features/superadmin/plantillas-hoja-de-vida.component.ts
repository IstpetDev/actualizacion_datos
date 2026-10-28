import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ConfiguracionPlantilla,
  PlantillaDetalleDto,
  PlantillaResumenDto,
  PlantillasHojaDeVidaClient,
} from '../../api-client';
import { mensajeError } from '../../core/auth/mensaje-error';

const CONFIGURACION_PREDETERMINADA: ConfiguracionPlantilla = {
  disenoBase: 'clasico',
  secciones: [
    {
      codigoSeccion: 'portada',
      mostrarSiVacia: false,
      campos: ['nombre_completo', 'tipo_personal', 'foto_portada', 'lema', 'colores'],
    },
    {
      codigoSeccion: 'datos_personales',
      mostrarSiVacia: false,
      campos: [
        'foto',
        'documento',
        'lugar_nacimiento',
        'fecha_nacimiento',
        'estado_civil',
        'ciudad',
        'direccion',
        'telefono_celular',
        'telefono_convencional',
        'correo_institucional',
        'registro_senescyt',
      ],
    },
    { codigoSeccion: 'perfil', mostrarSiVacia: false, campos: ['texto_perfil'] },
    {
      codigoSeccion: 'compromiso',
      mostrarSiVacia: false,
      campos: ['texto_compromiso', 'nombre_completo', 'documento'],
    },
    {
      codigoSeccion: 'formacion',
      mostrarSiVacia: false,
      campos: ['primaria', 'secundaria', 'superior'],
    },
    {
      codigoSeccion: 'experiencia',
      mostrarSiVacia: false,
      campos: ['empresa', 'cargo', 'funciones', 'fecha_inicio', 'fecha_fin'],
    },
    {
      codigoSeccion: 'capacitaciones',
      mostrarSiVacia: false,
      campos: ['evento', 'institucion', 'horas', 'lugar', 'fecha_inicio', 'fecha_fin'],
    },
    {
      codigoSeccion: 'referencias',
      mostrarSiVacia: false,
      campos: ['nombre', 'titulo', 'cargo', 'empresa', 'telefono', 'tipo'],
    },
    { codigoSeccion: 'anexos', mostrarSiVacia: false, campos: ['portada_anexos'] },
  ],
};

@Component({
  selector: 'app-plantillas-hoja-de-vida',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="plantillas-container" data-testid="panel-plantillas-superadmin">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Biblioteca Global de Plantillas</h2>
          <p class="panel-subtitle">
            Administración de plantillas oficiales para la generación de hojas de vida en PDF.
          </p>
        </div>
        <button
          type="button"
          class="btn btn-primary"
          (click)="mostrarFormularioCrear.set(!mostrarFormularioCrear())"
          data-testid="btn-toggle-crear-plantilla"
        >
          {{ mostrarFormularioCrear() ? 'Cancelar' : 'Nueva Plantilla' }}
        </button>
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

      <!-- Formulario para crear plantilla -->
      @if (mostrarFormularioCrear()) {
        <div class="card mb-4" data-testid="form-crear-plantilla-box">
          <h3 class="card-title">Crear Nueva Plantilla</h3>
          <form (ngSubmit)="crearPlantilla()" data-testid="form-crear-plantilla">
            <div class="form-group">
              <label for="nuevoNombre">Nombre de la Plantilla:</label>
              <input
                id="nuevoNombre"
                type="text"
                class="form-control"
                [(ngModel)]="nuevoNombre"
                name="nuevoNombre"
                required
                placeholder="Ej: Plantilla Clásica Institucional"
                data-testid="input-nombre-plantilla"
              />
            </div>
            <div class="form-group">
              <label for="nuevaDescripcion">Descripción:</label>
              <input
                id="nuevaDescripcion"
                type="text"
                class="form-control"
                [(ngModel)]="nuevaDescripcion"
                name="nuevaDescripcion"
                placeholder="Descripción del diseño y objetivo"
                data-testid="input-descripcion-plantilla"
              />
            </div>
            <div class="form-group">
              <label for="nuevoDisenoBase">Diseño Base:</label>
              <select
                id="nuevoDisenoBase"
                class="form-control"
                [(ngModel)]="nuevoDisenoBase"
                name="nuevoDisenoBase"
                data-testid="select-diseno-base"
              >
                <option value="clasico">Clásico</option>
              </select>
            </div>
            <div class="form-group">
              <label for="nuevaConfiguracionJson"
                >Configuración de Secciones y Campos (JSON):</label
              >
              <textarea
                id="nuevaConfiguracionJson"
                class="form-control font-mono"
                rows="8"
                [(ngModel)]="nuevaConfiguracionJson"
                name="nuevaConfiguracionJson"
                data-testid="input-configuracion-json"
              ></textarea>
            </div>
            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="guardando() || !nuevoNombre.trim()"
              data-testid="btn-guardar-plantilla"
            >
              {{ guardando() ? 'Guardando...' : 'Crear Plantilla' }}
            </button>
          </form>
        </div>
      }

      <!-- Listado de plantillas -->
      <div class="table-container mb-4">
        <table class="data-table" data-testid="tabla-plantillas">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Diseño Base</th>
              <th>Versiones</th>
              <th>Última Publicada</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (p of plantillas(); track p.id) {
              <tr [attr.data-testid]="'fila-plantilla-' + p.id">
                <td>
                  <strong>{{ p.nombre }}</strong>
                  @if (p.descripcion) {
                    <div class="text-muted small">{{ p.descripcion }}</div>
                  }
                </td>
                <td>{{ p.disenoBase }}</td>
                <td>{{ p.totalVersiones }}</td>
                <td>
                  {{ p.ultimaVersionPublicada ? 'v' + p.ultimaVersionPublicada : 'Sin publicar' }}
                </td>
                <td>
                  @if (p.esPredeterminada) {
                    <span class="badge badge-success" data-testid="badge-predeterminada"
                      >Predeterminada</span
                    >
                  } @else {
                    <span class="badge badge-secondary">Opcional</span>
                  }
                </td>
                <td class="acciones-cell">
                  <button
                    type="button"
                    class="btn btn-sm btn-secondary"
                    (click)="seleccionarPlantilla(p.id)"
                    [attr.data-testid]="'btn-detalle-' + p.id"
                  >
                    Detalle
                  </button>
                  @if (!p.esPredeterminada) {
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-primary"
                      (click)="marcarPredeterminada(p.id)"
                      [disabled]="guardando()"
                      [attr.data-testid]="'btn-marcar-predeterminada-' + p.id"
                    >
                      Hacer Predeterminada
                    </button>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="text-center empty-state">
                  No hay plantillas registradas en el sistema.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Detalle y Edición de Plantilla Seleccionada -->
      @if (plantillaSeleccionada(); as detalle) {
        <div class="card detalle-card" data-testid="detalle-plantilla-box">
          <div class="panel-header">
            <h3 class="card-title">Detalle de Plantilla: {{ detalle.nombre }}</h3>
            <button
              type="button"
              class="btn btn-sm btn-secondary"
              (click)="plantillaSeleccionada.set(null)"
              data-testid="btn-cerrar-detalle"
            >
              Cerrar
            </button>
          </div>

          <div class="grid-dos-columnas">
            <!-- Edición de borrador -->
            <div>
              <h4>Borrador Actual</h4>
              <div class="form-group">
                <label for="editNombre">Nombre:</label>
                <input
                  id="editNombre"
                  type="text"
                  class="form-control"
                  [(ngModel)]="editNombre"
                  data-testid="input-edit-nombre"
                />
              </div>
              <div class="form-group">
                <label for="editDescripcion">Descripción:</label>
                <input
                  id="editDescripcion"
                  type="text"
                  class="form-control"
                  [(ngModel)]="editDescripcion"
                  data-testid="input-edit-descripcion"
                />
              </div>
              <div class="form-group">
                <label for="editConfiguracionJson">Configuración Borrador (JSON):</label>
                <textarea
                  id="editConfiguracionJson"
                  class="form-control font-mono"
                  rows="8"
                  [(ngModel)]="editConfiguracionJson"
                  data-testid="input-edit-configuracion-json"
                ></textarea>
              </div>
              <button
                type="button"
                class="btn btn-primary"
                (click)="actualizarBorrador(detalle.id)"
                [disabled]="guardando()"
                data-testid="btn-guardar-borrador"
              >
                {{ guardando() ? 'Guardando...' : 'Guardar Borrador' }}
              </button>

              <hr class="my-4" />

              <h4>Publicar como Nueva Versión</h4>
              <div class="form-group">
                <label for="descripcionCambio">Descripción del Cambio:</label>
                <input
                  id="descripcionCambio"
                  type="text"
                  class="form-control"
                  [(ngModel)]="descripcionCambio"
                  placeholder="Ej: Reordenamiento de secciones para 2026"
                  data-testid="input-descripcion-cambio"
                />
              </div>
              <button
                type="button"
                class="btn btn-success"
                (click)="publicarVersion(detalle.id)"
                [disabled]="guardando()"
                data-testid="btn-publicar-version"
              >
                {{ guardando() ? 'Publicando...' : 'Publicar Versión' }}
              </button>
            </div>

            <!-- Historial de versiones publicadas -->
            <div>
              <h4>Versiones Publicadas ({{ detalle.versiones?.length || 0 }})</h4>
              <div class="table-container">
                <table class="data-table" data-testid="tabla-versiones-plantilla">
                  <thead>
                    <tr>
                      <th>Versión</th>
                      <th>Fecha</th>
                      <th>Cambios</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (v of detalle.versiones; track v.id) {
                      <tr>
                        <td>
                          <strong>v{{ v.numeroVersion }}</strong>
                        </td>
                        <td>{{ v.fechaPublicacionUtc | date: 'dd/MM/yyyy HH:mm' }}</td>
                        <td>{{ v.descripcionCambio || 'Sin notas' }}</td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="3" class="text-center empty-state">
                          Aún no se ha publicado ninguna versión formal.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .plantillas-container {
      margin-top: 1.5rem;
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
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
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.375rem;
      padding: 1.25rem;
    }
    .mb-4 {
      margin-bottom: 1.5rem;
    }
    .my-4 {
      margin: 1.5rem 0;
      border: 0;
      border-top: 1px solid #e2e8f0;
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
    .font-mono {
      font-family: monospace;
      font-size: 0.8rem;
    }
    .grid-dos-columnas {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    .table-container {
      overflow-x: auto;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8125rem;
    }
    .data-table th,
    .data-table td {
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
    }
    .data-table th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 600;
    }
    .badge {
      display: inline-block;
      padding: 0.2rem 0.4rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge-success {
      background: #dcfce7;
      color: #166534;
    }
    .badge-secondary {
      background: #e2e8f0;
      color: #475569;
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
    .btn-sm {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
    }
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-primary {
      background: #2563eb;
      color: #ffffff;
    }
    .btn-secondary {
      background: #e2e8f0;
      color: #1e293b;
    }
    .btn-outline-primary {
      background: transparent;
      border-color: #2563eb;
      color: #2563eb;
    }
    .btn-success {
      background: #16a34a;
      color: #ffffff;
    }
    .acciones-cell {
      display: flex;
      gap: 0.5rem;
    }
    .text-muted {
      color: #64748b;
    }
    .small {
      font-size: 0.75rem;
    }
    .text-center {
      text-align: center;
    }
    .empty-state {
      padding: 1.5rem;
      color: #64748b;
    }
    @media (max-width: 768px) {
      .grid-dos-columnas {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class PlantillasHojaDeVidaComponent implements OnInit {
  private readonly client = inject(PlantillasHojaDeVidaClient);

  readonly plantillas = signal<PlantillaResumenDto[]>([]);
  readonly plantillaSeleccionada = signal<PlantillaDetalleDto | null>(null);
  readonly mostrarFormularioCrear = signal<boolean>(false);
  readonly guardando = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly mensajeExito = signal<string | null>(null);

  nuevoNombre = '';
  nuevaDescripcion = '';
  nuevoDisenoBase = 'clasico';
  nuevaConfiguracionJson = JSON.stringify(CONFIGURACION_PREDETERMINADA, null, 2);

  editNombre = '';
  editDescripcion = '';
  editConfiguracionJson = '';
  descripcionCambio = '';

  ngOnInit(): void {
    this.cargarPlantillas();
  }

  cargarPlantillas(): void {
    this.client.listarPlantillasHojaDeVida().subscribe({
      next: (res) => this.plantillas.set(res),
      error: (err) => this.error.set(mensajeError(err, 'Error al listar las plantillas.')),
    });
  }

  crearPlantilla(): void {
    if (!this.nuevoNombre.trim()) return;

    let configParsed: ConfiguracionPlantilla;
    try {
      configParsed = JSON.parse(this.nuevaConfiguracionJson);
    } catch {
      this.error.set('La configuración no es un JSON válido.');
      return;
    }

    this.guardando.set(true);
    this.error.set(null);
    this.mensajeExito.set(null);

    this.client
      .crearPlantillaHojaDeVida({
        nombre: this.nuevoNombre.trim(),
        descripcion: this.nuevaDescripcion.trim() || undefined,
        disenoBase: this.nuevoDisenoBase,
        configuracion: configParsed,
      })
      .subscribe({
        next: (creada) => {
          this.mensajeExito.set(`Plantilla "${creada.nombre}" creada correctamente.`);
          this.nuevoNombre = '';
          this.nuevaDescripcion = '';
          this.mostrarFormularioCrear.set(false);
          this.guardando.set(false);
          this.cargarPlantillas();
        },
        error: (err) => {
          this.error.set(mensajeError(err, 'Error al crear la plantilla.'));
          this.guardando.set(false);
        },
      });
  }

  seleccionarPlantilla(id: string): void {
    this.error.set(null);
    this.client.obtenerPlantillaHojaDeVida(id).subscribe({
      next: (detalle) => {
        this.plantillaSeleccionada.set(detalle);
        this.editNombre = detalle.nombre;
        this.editDescripcion = detalle.descripcion || '';
        this.editConfiguracionJson = JSON.stringify(detalle.configuracionBorrador, null, 2);
        this.descripcionCambio = '';
      },
      error: (err) =>
        this.error.set(mensajeError(err, 'Error al cargar el detalle de la plantilla.')),
    });
  }

  actualizarBorrador(id: string): void {
    let configParsed: ConfiguracionPlantilla;
    try {
      configParsed = JSON.parse(this.editConfiguracionJson);
    } catch {
      this.error.set('La configuración del borrador no es un JSON válido.');
      return;
    }

    this.guardando.set(true);
    this.error.set(null);
    this.mensajeExito.set(null);

    this.client
      .actualizarPlantillaHojaDeVida(id, {
        nombre: this.editNombre.trim(),
        descripcion: this.editDescripcion.trim() || undefined,
        disenoBase: 'clasico',
        configuracion: configParsed,
      })
      .subscribe({
        next: (actualizada) => {
          this.plantillaSeleccionada.set(actualizada);
          this.mensajeExito.set('Borrador de plantilla actualizado correctamente.');
          this.guardando.set(false);
          this.cargarPlantillas();
        },
        error: (err) => {
          this.error.set(mensajeError(err, 'Error al actualizar el borrador.'));
          this.guardando.set(false);
        },
      });
  }

  publicarVersion(id: string): void {
    this.guardando.set(true);
    this.error.set(null);
    this.mensajeExito.set(null);

    this.client
      .publicarVersionPlantilla(id, {
        descripcionCambio: this.descripcionCambio.trim() || undefined,
      })
      .subscribe({
        next: (version) => {
          this.mensajeExito.set(`Versión v${version.numeroVersion} publicada exitosamente.`);
          this.guardando.set(false);
          this.descripcionCambio = '';
          this.seleccionarPlantilla(id);
          this.cargarPlantillas();
        },
        error: (err) => {
          this.error.set(mensajeError(err, 'Error al publicar la versión.'));
          this.guardando.set(false);
        },
      });
  }

  marcarPredeterminada(id: string): void {
    this.guardando.set(true);
    this.error.set(null);
    this.mensajeExito.set(null);

    this.client.marcarPlantillaPredeterminada(id).subscribe({
      next: (res) => {
        this.mensajeExito.set(res.mensaje || 'Plantilla marcada como predeterminada.');
        this.guardando.set(false);
        this.cargarPlantillas();
      },
      error: (err) => {
        this.error.set(mensajeError(err, 'Error al marcar como predeterminada.'));
        this.guardando.set(false);
      },
    });
  }
}
