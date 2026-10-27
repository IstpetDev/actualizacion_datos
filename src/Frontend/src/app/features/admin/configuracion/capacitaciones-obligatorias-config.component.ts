import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CapacitacionObligatoriaDto,
  ConfiguracionClient,
  CumplimientoCapacitacionObligatoriaDto,
  GuardarCapacitacionObligatoriaRequest,
  TipoFuncionarioDto,
} from '../../../api-client';
import { mensajeError } from '../../../core/auth/mensaje-error';

@Component({
  selector: 'app-capacitaciones-obligatorias-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="capacitaciones-config-container" data-testid="panel-capacitaciones-config">
      <header class="bloque-header">
        <div>
          <h3 class="bloque-titulo">Capacitaciones Obligatorias de la Institución</h3>
          <p class="bloque-desc">
            Defina las capacitaciones institucionales obligatorias, su alcance (todas las personas o
            por tipo de funcionario) y consulte el avance de cumplimiento (RF-CAP-001, RF-CAP-002,
            RF-CAP-010).
          </p>
        </div>
        <div class="header-acciones">
          @if (!mostrarFormulario()) {
            <button
              type="button"
              class="btn btn-primary btn-sm"
              (click)="abrirFormulario()"
              data-testid="btn-nueva-obligatoria"
            >
              + Nueva Capacitación Obligatoria
            </button>
          }
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            (click)="cargarDatos()"
            [disabled]="cargando()"
            data-testid="btn-recargar-obligatorias"
          >
            {{ cargando() ? 'Cargando...' : 'Recargar' }}
          </button>
        </div>
      </header>

      @if (mensajeExito()) {
        <div class="alert alert-success" role="alert" data-testid="mensaje-exito-obligatoria">
          {{ mensajeExito() }}
        </div>
      }

      @if (error()) {
        <div class="alert alert-danger" role="alert" data-testid="mensaje-error-obligatoria">
          {{ error() }}
        </div>
      }

      <!-- Formulario Inline -->
      @if (mostrarFormulario()) {
        <div class="card-formulario" data-testid="form-obligatoria">
          <h4>
            {{ idEdicion() ? 'Editar Capacitación Obligatoria' : 'Nueva Capacitación Obligatoria' }}
          </h4>

          <div class="grid-dos">
            <div class="form-group">
              <label for="obNombre"
                >Nombre de la Capacitación <span class="text-danger">*</span></label
              >
              <input
                id="obNombre"
                type="text"
                class="form-control"
                [(ngModel)]="modelo.nombre"
                placeholder="Ej. Seguridad y Salud en el Trabajo"
                data-testid="input-nombre-obligatoria"
              />
            </div>

            <div class="form-group">
              <label for="obOrganizadora">Institución Organizadora</label>
              <input
                id="obOrganizadora"
                type="text"
                class="form-control"
                [(ngModel)]="modelo.institucionOrganizadora"
                placeholder="Ej. ISTPET"
                data-testid="input-organizadora-obligatoria"
              />
            </div>
          </div>

          <div class="grid-tres mt-3">
            <div class="form-group">
              <label for="obHoras">Horas Esperadas</label>
              <input
                id="obHoras"
                type="number"
                min="1"
                class="form-control"
                [(ngModel)]="modelo.horasEsperadas"
                placeholder="Ej. 20"
                data-testid="input-horas-obligatoria"
              />
            </div>

            <div class="form-group">
              <label for="obFecha">Fecha de Realización</label>
              <input
                id="obFecha"
                type="date"
                class="form-control"
                [(ngModel)]="fechaRealizacionStr"
                (ngModelChange)="onFechaChange($event)"
                data-testid="input-fecha-obligatoria"
              />
            </div>

            <div class="form-group">
              <label for="obAlcance">Alcance de Exigencia <span class="text-danger">*</span></label>
              <select
                id="obAlcance"
                class="form-control"
                [(ngModel)]="modelo.tipoFuncionarioId"
                data-testid="select-alcance-obligatoria"
              >
                <option [ngValue]="undefined">Todas las personas (General)</option>
                @for (t of tiposFuncionario(); track t.id) {
                  <option [ngValue]="t.id">{{ t.nombre }} ({{ t.codigo }})</option>
                }
              </select>
            </div>
          </div>

          <div class="form-botones mt-4">
            <button type="button" class="btn btn-secondary btn-sm" (click)="cancelarFormulario()">
              Cancelar
            </button>
            <button
              type="button"
              class="btn btn-primary btn-sm"
              [disabled]="guardando() || !modelo.nombre?.trim()"
              (click)="guardar()"
              data-testid="btn-guardar-obligatoria"
            >
              {{ guardando() ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </div>
      }

      <!-- Tabla de Configuradas -->
      <div class="table-container mt-3">
        <table class="data-table" data-testid="tabla-capacitaciones-obligatorias">
          <thead>
            <tr>
              <th>Capacitación</th>
              <th>Organizadora</th>
              <th>Horas</th>
              <th>Alcance</th>
              <th>Estado</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (ob of obligatorias(); track ob.id) {
              <tr [attr.data-testid]="'fila-obligatoria-' + ob.id">
                <td>
                  <strong>{{ ob.nombre }}</strong>
                </td>
                <td>{{ ob.institucionOrganizadora || '—' }}</td>
                <td>{{ ob.horasEsperadas ? ob.horasEsperadas + ' h' : '—' }}</td>
                <td>
                  <span
                    class="badge"
                    [class.badge-info]="!ob.tipoFuncionarioId"
                    [class.badge-secondary]="ob.tipoFuncionarioId"
                  >
                    {{ nombreTipoFuncionario(ob.tipoFuncionarioId) }}
                  </span>
                </td>
                <td>
                  @if (ob.activo) {
                    <span class="badge badge-success">Activa</span>
                  } @else {
                    <span class="badge badge-danger">Inactiva</span>
                  }
                </td>
                <td class="text-right">
                  <button
                    type="button"
                    class="btn-accion btn-editar"
                    (click)="editar(ob)"
                    data-testid="btn-editar-obligatoria"
                  >
                    Editar
                  </button>
                  @if (ob.activo) {
                    <button
                      type="button"
                      class="btn-accion btn-eliminar"
                      (click)="desactivar(ob.id)"
                      data-testid="btn-desactivar-obligatoria"
                    >
                      Desactivar
                    </button>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="text-center empty-state">
                  No hay capacitaciones obligatorias configuradas.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Resumen de Cumplimiento (RF-CAP-010) -->
      <section class="cumplimiento-section mt-5" data-testid="seccion-cumplimiento">
        <div class="cumplimiento-header">
          <div>
            <h4 class="cumplimiento-titulo">Resumen de Cumplimiento Institucional</h4>
            <p class="cumplimiento-desc">
              Porcentaje y total de personas que han cargado o tienen pendiente cada capacitación
              obligatoria aplicable.
            </p>
          </div>
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            (click)="cargarCumplimiento()"
            [disabled]="cargandoCumplimiento()"
            data-testid="btn-actualizar-cumplimiento"
          >
            {{ cargandoCumplimiento() ? 'Actualizando...' : 'Actualizar Resumen' }}
          </button>
        </div>

        <div class="table-container mt-2">
          <table class="data-table" data-testid="tabla-cumplimiento">
            <thead>
              <tr>
                <th>Capacitación</th>
                <th>Total Aplica</th>
                <th>Cumplidas</th>
                <th>Exentas / Justificadas</th>
                <th>Pendientes</th>
                <th class="text-right">Detalle</th>
              </tr>
            </thead>
            <tbody>
              @for (c of cumplimiento(); track c.capacitacionObligatoriaId) {
                <tr [attr.data-testid]="'fila-cumplimiento-' + c.capacitacionObligatoriaId">
                  <td>
                    <strong>{{ c.nombre }}</strong>
                  </td>
                  <td>{{ c.totalAplica }}</td>
                  <td>
                    <span class="badge badge-success">{{ c.totalCumplida }}</span>
                  </td>
                  <td>
                    <span class="badge badge-info">{{ c.totalExentaOJustificada }}</span>
                  </td>
                  <td>
                    <span
                      class="badge"
                      [class.badge-danger]="c.totalPendiente > 0"
                      [class.badge-secondary]="c.totalPendiente === 0"
                    >
                      {{ c.totalPendiente }}
                    </span>
                  </td>
                  <td class="text-right">
                    @if (c.personasPendientes && c.personasPendientes.length > 0) {
                      <button
                        type="button"
                        class="btn-accion btn-ver"
                        (click)="verPendientes(c)"
                        [attr.data-testid]="'btn-ver-pendientes-' + c.capacitacionObligatoriaId"
                      >
                        Ver pendientes ({{ c.personasPendientes.length }})
                      </button>
                    } @else {
                      <span class="text-muted text-sm">Al día</span>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="text-center empty-state">
                    No hay información de cumplimiento disponible.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <!-- Modal Personas Pendientes -->
      @if (capacitacionDetallePendientes()) {
        <div class="modal-backdrop" data-testid="modal-detalle-pendientes">
          <div class="modal-card">
            <h4>Personas pendientes: {{ capacitacionDetallePendientes()!.nombre }}</h4>
            <p class="text-sm text-muted">
              Listado de personas a las que les aplica esta capacitación y aún no registran
              certificado aprobado.
            </p>

            <div class="table-container modal-table">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Documento</th>
                    <th>Nombre</th>
                    <th>Tipo Funcionario</th>
                  </tr>
                </thead>
                <tbody>
                  @for (
                    p of capacitacionDetallePendientes()!.personasPendientes;
                    track p.personaId
                  ) {
                    <tr>
                      <td>{{ p.documento }}</td>
                      <td>{{ p.nombre }}</td>
                      <td>{{ p.tipoFuncionarioNombre || 'Sin tipo' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="modal-botones mt-3">
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                (click)="cerrarModalPendientes()"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .capacitaciones-config-container {
      padding: 1rem 0;
    }
    .bloque-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }
    .bloque-titulo {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.25rem 0;
    }
    .bloque-desc {
      font-size: 0.85rem;
      color: #64748b;
      margin: 0;
    }
    .header-acciones {
      display: flex;
      gap: 0.5rem;
    }
    .card-formulario {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
    }
    .card-formulario h4 {
      margin: 0 0 1rem 0;
      font-size: 1rem;
      color: #1e293b;
    }
    .grid-dos {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1rem;
    }
    .grid-tres {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .form-group label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #475569;
    }
    .form-control {
      padding: 0.5rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.875rem;
      background-color: #ffffff;
    }
    .form-botones {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    .data-table th {
      background: #f1f5f9;
      padding: 0.625rem 0.875rem;
      text-align: left;
      font-weight: 600;
      color: #475569;
      border-bottom: 1px solid #cbd5e1;
    }
    .data-table td {
      padding: 0.625rem 0.875rem;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }
    .badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
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
    .badge-secondary {
      background: #f1f5f9;
      color: #475569;
    }
    .btn-accion {
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 0.8125rem;
      font-weight: 600;
      margin-left: 0.5rem;
    }
    .btn-editar {
      color: #0284c7;
    }
    .btn-eliminar {
      color: #ef4444;
    }
    .btn-ver {
      color: #2563eb;
    }
    .btn {
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
    }
    .btn-sm {
      padding: 0.375rem 0.75rem;
      font-size: 0.8125rem;
    }
    .btn-primary {
      background: #0f172a;
      color: #ffffff;
    }
    .btn-secondary {
      background: #e2e8f0;
      color: #334155;
    }
    .text-right {
      text-align: right;
    }
    .text-danger {
      color: #dc2626;
    }
    .text-muted {
      color: #64748b;
    }
    .text-sm {
      font-size: 0.8125rem;
    }
    .mt-2 {
      margin-top: 0.5rem;
    }
    .mt-3 {
      margin-top: 0.75rem;
    }
    .mt-4 {
      margin-top: 1rem;
    }
    .mt-5 {
      margin-top: 1.5rem;
    }
    .empty-state {
      color: #94a3b8;
      padding: 1.5rem !important;
    }
    .cumplimiento-section {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1.25rem;
    }
    .cumplimiento-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }
    .cumplimiento-titulo {
      font-size: 1.05rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.25rem 0;
    }
    .cumplimiento-desc {
      font-size: 0.8125rem;
      color: #64748b;
      margin: 0;
    }
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }
    .modal-card {
      background: #ffffff;
      border-radius: 8px;
      padding: 1.5rem;
      max-width: 650px;
      width: 100%;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
      max-height: 85vh;
      display: flex;
      flex-direction: column;
    }
    .modal-card h4 {
      margin: 0 0 0.25rem 0;
      font-size: 1.1rem;
      color: #0f172a;
    }
    .modal-table {
      overflow-y: auto;
      margin-top: 1rem;
      max-height: 50vh;
    }
    .modal-botones {
      display: flex;
      justify-content: flex-end;
    }
    .alert {
      padding: 0.75rem 1rem;
      border-radius: 6px;
      margin-bottom: 1rem;
      font-size: 0.875rem;
    }
    .alert-success {
      background: #dcfce7;
      color: #166534;
    }
    .alert-danger {
      background: #fee2e2;
      color: #991b1b;
    }
  `,
})
export class CapacitacionesObligatoriasConfigComponent implements OnInit {
  private readonly configClient = inject(ConfiguracionClient);

  readonly obligatorias = signal<CapacitacionObligatoriaDto[]>([]);
  readonly tiposFuncionario = signal<TipoFuncionarioDto[]>([]);
  readonly cumplimiento = signal<CumplimientoCapacitacionObligatoriaDto[]>([]);

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly cargandoCumplimiento = signal(false);
  readonly error = signal('');
  readonly mensajeExito = signal('');

  readonly mostrarFormulario = signal(false);
  readonly idEdicion = signal<string | undefined>(undefined);
  readonly capacitacionDetallePendientes = signal<CumplimientoCapacitacionObligatoriaDto | null>(
    null,
  );

  fechaRealizacionStr = '';

  modelo: GuardarCapacitacionObligatoriaRequest = {
    nombre: '',
    institucionOrganizadora: undefined,
    horasEsperadas: undefined,
    fechaRealizacion: undefined,
    tipoFuncionarioId: undefined,
    activo: true,
    orden: 0,
  };

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando.set(true);
    this.error.set('');

    this.configClient.listarTiposFuncionario().subscribe({
      next: (tipos) => this.tiposFuncionario.set(tipos ?? []),
    });

    this.configClient.listarCapacitacionesObligatorias().subscribe({
      next: (obs) => {
        this.obligatorias.set(obs ?? []);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(mensajeError(err, 'Error al cargar las capacitaciones obligatorias.'));
        this.cargando.set(false);
      },
    });

    this.cargarCumplimiento();
  }

  cargarCumplimiento(): void {
    this.cargandoCumplimiento.set(true);
    this.configClient.obtenerCumplimientoCapacitacionesObligatorias().subscribe({
      next: (cumpl) => {
        this.cumplimiento.set(cumpl ?? []);
        this.cargandoCumplimiento.set(false);
      },
      error: () => this.cargandoCumplimiento.set(false),
    });
  }

  nombreTipoFuncionario(tipoId: string | undefined): string {
    if (!tipoId) return 'Todas las personas';
    const tipo = this.tiposFuncionario().find((t) => t.id === tipoId);
    return tipo ? tipo.nombre : 'Todas las personas';
  }

  onFechaChange(valor: string): void {
    this.fechaRealizacionStr = valor;
    this.modelo.fechaRealizacion = valor ? new Date(valor + 'T00:00:00Z') : undefined;
  }

  abrirFormulario(): void {
    this.idEdicion.set(undefined);
    this.error.set('');
    this.mensajeExito.set('');
    this.fechaRealizacionStr = '';
    this.modelo = {
      nombre: '',
      institucionOrganizadora: '',
      horasEsperadas: undefined,
      fechaRealizacion: undefined,
      tipoFuncionarioId: undefined,
      activo: true,
      orden: 0,
    };
    this.mostrarFormulario.set(true);
  }

  editar(ob: CapacitacionObligatoriaDto): void {
    this.idEdicion.set(ob.id);
    this.error.set('');
    this.mensajeExito.set('');
    this.modelo = {
      nombre: ob.nombre,
      institucionOrganizadora: ob.institucionOrganizadora,
      horasEsperadas: ob.horasEsperadas,
      fechaRealizacion: ob.fechaRealizacion,
      tipoFuncionarioId: ob.tipoFuncionarioId,
      activo: ob.activo,
      orden: ob.orden,
    };
    this.fechaRealizacionStr = ob.fechaRealizacion
      ? new Date(ob.fechaRealizacion).toISOString().split('T')[0]
      : '';
    this.mostrarFormulario.set(true);
  }

  cancelarFormulario(): void {
    this.mostrarFormulario.set(false);
    this.idEdicion.set(undefined);
  }

  guardar(): void {
    if (!this.modelo.nombre?.trim()) {
      this.error.set('El nombre de la capacitación obligatoria es obligatorio.');
      return;
    }

    this.guardando.set(true);
    this.error.set('');
    this.mensajeExito.set('');

    const peticion = this.idEdicion()
      ? this.configClient.actualizarCapacitacionObligatoria(this.idEdicion()!, this.modelo)
      : this.configClient.crearCapacitacionObligatoria(this.modelo);

    peticion.subscribe({
      next: () => {
        this.mensajeExito.set(
          this.idEdicion()
            ? 'Capacitación obligatoria actualizada exitosamente.'
            : 'Capacitación obligatoria creada exitosamente.',
        );
        this.cancelarFormulario();
        this.cargarDatos();
        this.guardando.set(false);
      },
      error: (err) => {
        this.error.set(mensajeError(err, 'Error al guardar la capacitación obligatoria.'));
        this.guardando.set(false);
      },
    });
  }

  desactivar(id: string): void {
    if (
      !confirm(
        '¿Está seguro de desactivar esta capacitación obligatoria? Los certificados cargados se conservarán.',
      )
    ) {
      return;
    }

    this.configClient.eliminarCapacitacionObligatoria(id).subscribe({
      next: () => {
        this.mensajeExito.set('Capacitación obligatoria desactivada exitosamente.');
        this.cargarDatos();
      },
      error: (err) =>
        this.error.set(mensajeError(err, 'Error al desactivar la capacitación obligatoria.')),
    });
  }

  verPendientes(c: CumplimientoCapacitacionObligatoriaDto): void {
    this.capacitacionDetallePendientes.set(c);
  }

  cerrarModalPendientes(): void {
    this.capacitacionDetallePendientes.set(null);
  }
}
