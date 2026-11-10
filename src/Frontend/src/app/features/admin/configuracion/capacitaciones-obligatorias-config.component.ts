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
import { extraerDetalleError, mensajeError } from '../../../core/auth/mensaje-error';
import { fechaSinHora } from '../../usuario/hoja-de-vida/servicios/fecha-sin-hora';

@Component({
  selector: 'app-capacitaciones-obligatorias-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="capacitaciones-bento-container" data-testid="panel-capacitaciones-config">
      <!-- Bento Header Card -->
      <header class="bento-card header-bento">
        <div class="header-info">
          <div class="header-badge-row">
            <span class="badge-institucional">
              <span class="badge-dot"></span>
              Gestión Institucional ISTPET
            </span>
            <span class="badge-normativa">RF-CAP-001 · RF-CAP-002 · RF-CAP-010</span>
          </div>
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
              class="btn-istpet-primary"
              (click)="abrirFormulario()"
              data-testid="btn-nueva-obligatoria"
            >
              <span class="btn-icon">+</span>
              Nueva Capacitación Obligatoria
            </button>
          }
          <button
            type="button"
            class="btn-istpet-secondary"
            (click)="cargarDatos()"
            [disabled]="cargando()"
            data-testid="btn-recargar-obligatorias"
          >
            {{ cargando() ? 'Cargando...' : 'Recargar' }}
          </button>
        </div>
      </header>

      <!-- Mensajes Globales -->
      @if (mensajeExito()) {
        <div class="bento-alert alert-success" role="alert" data-testid="mensaje-exito-obligatoria">
          <span class="alert-icon">✓</span>
          <span>{{ mensajeExito() }}</span>
        </div>
      }

      @if (error()) {
        <div class="bento-alert alert-danger" role="alert" data-testid="mensaje-error-obligatoria">
          <span class="alert-icon">⚠</span>
          <span>{{ error() }}</span>
        </div>
      }

      <!-- Formulario Bento de Creación / Edición -->
      @if (mostrarFormulario()) {
        <section class="bento-card form-bento" data-testid="form-obligatoria">
          <div class="form-bento-header">
            <div>
              <span class="chip-modo">
                {{ idEdicion() ? 'Edición de Registro' : 'Nuevo Registro Institucional' }}
              </span>
              <h4 class="form-titulo">
                {{
                  idEdicion() ? 'Editar Capacitación Obligatoria' : 'Nueva Capacitación Obligatoria'
                }}
              </h4>
            </div>
            <span class="form-nota-obligatorios"
              >Los campos marcados con <strong class="text-danger">*</strong> son obligatorios</span
            >
          </div>

          <div class="form-grid-dos">
            <div class="form-group" [class.has-error]="obtenerErrorCampo('nombre')">
              <label for="obNombre" class="form-label">
                Nombre de la Capacitación <span class="text-danger">*</span>
              </label>
              <input
                id="obNombre"
                type="text"
                class="form-control"
                [(ngModel)]="modelo.nombre"
                placeholder="Ej. Seguridad y Salud en el Trabajo"
                data-testid="input-nombre-obligatoria"
              />
              @if (obtenerErrorCampo('nombre')) {
                <span class="campo-error-msg">{{ obtenerErrorCampo('nombre') }}</span>
              }
            </div>

            <div
              class="form-group"
              [class.has-error]="obtenerErrorCampo('institucionOrganizadora')"
            >
              <label for="obOrganizadora" class="form-label">Institución Organizadora</label>
              <input
                id="obOrganizadora"
                type="text"
                class="form-control"
                [(ngModel)]="modelo.institucionOrganizadora"
                placeholder="Ej. ISTPET / SECAP / CISCO"
                data-testid="input-organizadora-obligatoria"
              />
              @if (obtenerErrorCampo('institucionOrganizadora')) {
                <span class="campo-error-msg">{{
                  obtenerErrorCampo('institucionOrganizadora')
                }}</span>
              }
            </div>
          </div>

          <div class="form-grid-tres mt-3">
            <div class="form-group" [class.has-error]="obtenerErrorCampo('horasEsperadas')">
              <label for="obHoras" class="form-label">Horas Esperadas</label>
              <input
                id="obHoras"
                type="number"
                min="1"
                class="form-control"
                [(ngModel)]="modelo.horasEsperadas"
                placeholder="Ej. 40"
                data-testid="input-horas-obligatoria"
              />
              @if (obtenerErrorCampo('horasEsperadas')) {
                <span class="campo-error-msg">{{ obtenerErrorCampo('horasEsperadas') }}</span>
              }
            </div>

            <div class="form-group" [class.has-error]="obtenerErrorCampo('fechaRealizacion')">
              <label for="obFecha" class="form-label">Fecha de Realización</label>
              <input
                id="obFecha"
                type="date"
                class="form-control"
                [(ngModel)]="fechaRealizacionStr"
                (ngModelChange)="onFechaChange($event)"
                data-testid="input-fecha-obligatoria"
              />
              <span class="form-help-text"
                >Personas contratadas con posterioridad quedarán exentas automáticamente.</span
              >
              @if (obtenerErrorCampo('fechaRealizacion')) {
                <span class="campo-error-msg">{{ obtenerErrorCampo('fechaRealizacion') }}</span>
              }
            </div>

            <div class="form-group" [class.has-error]="obtenerErrorCampo('tipoFuncionarioId')">
              <label for="obAlcance" class="form-label">
                Alcance de Exigencia <span class="text-danger">*</span>
              </label>
              <select
                id="obAlcance"
                class="form-control form-select"
                [(ngModel)]="modelo.tipoFuncionarioId"
                data-testid="select-alcance-obligatoria"
              >
                <option [ngValue]="undefined">Todas las personas (General)</option>
                @for (t of tiposFuncionario(); track t.id) {
                  <option [ngValue]="t.id">{{ t.nombre }} ({{ t.codigo }})</option>
                }
              </select>
              <span class="form-help-text">Define a qué grupo de funcionarios aplica.</span>
              @if (obtenerErrorCampo('tipoFuncionarioId')) {
                <span class="campo-error-msg">{{ obtenerErrorCampo('tipoFuncionarioId') }}</span>
              }
            </div>
          </div>

          <div class="form-botones mt-4">
            <button
              type="button"
              class="btn-istpet-secondary"
              (click)="cancelarFormulario()"
              [disabled]="guardando()"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="btn-istpet-primary"
              [disabled]="guardando() || !modelo.nombre?.trim()"
              (click)="guardar()"
              data-testid="btn-guardar-obligatoria"
            >
              {{ guardando() ? 'Guardando...' : idEdicion() ? 'Actualizar' : 'Guardar' }}
            </button>
          </div>
        </section>
      }

      <!-- Tabla Bento de Configuradas -->
      <section class="bento-card tabla-bento mt-4">
        <div class="tabla-bento-header">
          <div>
            <h4 class="seccion-subtitulo">Catálogo Institucional</h4>
            <span class="total-badge"
              >{{ obligatorias().length }}
              {{ obligatorias().length === 1 ? 'capacitación' : 'capacitaciones' }}
              configuradas</span
            >
          </div>
        </div>

        <div class="table-responsive">
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
                    <div class="capacitacion-nombre-cell">
                      <strong class="nombre-principal">{{ ob.nombre }}</strong>
                      @if (ob.fechaRealizacion) {
                        <span class="subtexto-fecha">
                          Fecha: {{ ob.fechaRealizacion | date: 'dd/MM/yyyy' }}
                        </span>
                      }
                    </div>
                  </td>
                  <td>
                    <span class="texto-secundario">{{ ob.institucionOrganizadora || '—' }}</span>
                  </td>
                  <td>
                    <span class="chip-horas">
                      {{ ob.horasEsperadas ? ob.horasEsperadas + ' h' : '—' }}
                    </span>
                  </td>
                  <td>
                    <span
                      class="badge-alcance"
                      [class.badge-alcance-general]="!ob.tipoFuncionarioId"
                      [class.badge-alcance-tipo]="ob.tipoFuncionarioId"
                    >
                      {{ nombreTipoFuncionario(ob.tipoFuncionarioId) }}
                    </span>
                  </td>
                  <td>
                    @if (ob.activo) {
                      <span class="badge-estado badge-estado-activo">
                        <span class="dot-activo"></span>
                        Activa
                      </span>
                    } @else {
                      <span class="badge-estado badge-estado-inactivo">
                        <span class="dot-inactivo"></span>
                        Inactiva
                      </span>
                    }
                  </td>
                  <td class="text-right">
                    <div class="acciones-inline">
                      <button
                        type="button"
                        class="btn-accion btn-editar"
                        (click)="editar(ob)"
                        data-testid="btn-editar-obligatoria"
                        title="Editar capacitación"
                      >
                        Editar
                      </button>
                      @if (ob.activo) {
                        <button
                          type="button"
                          class="btn-accion btn-eliminar"
                          (click)="desactivar(ob.id)"
                          data-testid="btn-desactivar-obligatoria"
                          title="Desactivar capacitación"
                        >
                          Desactivar
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="text-center empty-state">
                    <div class="empty-state-box">
                      <span class="empty-icon">📋</span>
                      <p>No hay capacitaciones obligatorias configuradas.</p>
                      <button
                        type="button"
                        class="btn-istpet-secondary btn-sm"
                        (click)="abrirFormulario()"
                      >
                        Crear la primera
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <!-- Resumen de Cumplimiento (RF-CAP-010) Bento Card -->
      <section class="bento-card cumplimiento-bento mt-5" data-testid="seccion-cumplimiento">
        <div class="cumplimiento-header">
          <div>
            <div class="header-badge-row">
              <span class="badge-monitoreo">Monitoreo en Tiempo Real</span>
            </div>
            <h4 class="cumplimiento-titulo">Resumen de Cumplimiento Institucional</h4>
            <p class="cumplimiento-desc">
              Porcentaje y total de personas que han cargado o tienen pendiente cada capacitación
              obligatoria aplicable.
            </p>
          </div>
          <button
            type="button"
            class="btn-istpet-secondary btn-sm"
            (click)="cargarCumplimiento()"
            [disabled]="cargandoCumplimiento()"
            data-testid="btn-actualizar-cumplimiento"
          >
            {{ cargandoCumplimiento() ? 'Actualizando...' : 'Actualizar Resumen' }}
          </button>
        </div>

        <div class="table-responsive mt-3">
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
                    <div class="cumplimiento-nombre-cell">
                      <strong>{{ c.nombre }}</strong>
                      <div class="progreso-bar-contenedor" title="Progreso de cumplimiento">
                        <div
                          class="progreso-bar-segmento seg-cumplidas"
                          [style.width.%]="calcularPorcentaje(c.totalCumplida, c.totalAplica)"
                        ></div>
                        <div
                          class="progreso-bar-segmento seg-exentas"
                          [style.width.%]="
                            calcularPorcentaje(c.totalExentaOJustificada, c.totalAplica)
                          "
                        ></div>
                        <div
                          class="progreso-bar-segmento seg-pendientes"
                          [style.width.%]="calcularPorcentaje(c.totalPendiente, c.totalAplica)"
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="chip-metric chip-total">{{ c.totalAplica }}</span>
                  </td>
                  <td>
                    <span class="chip-metric chip-cumplidas">{{ c.totalCumplida }}</span>
                  </td>
                  <td>
                    <span class="chip-metric chip-exentas">{{ c.totalExentaOJustificada }}</span>
                  </td>
                  <td>
                    <span
                      class="chip-metric"
                      [class.chip-pendientes]="c.totalPendiente > 0"
                      [class.chip-al-dia]="c.totalPendiente === 0"
                    >
                      {{ c.totalPendiente }}
                    </span>
                  </td>
                  <td class="text-right">
                    @if (c.personasPendientes && c.personasPendientes.length > 0) {
                      <button
                        type="button"
                        class="btn-ver-pendientes"
                        (click)="verPendientes(c)"
                        [attr.data-testid]="'btn-ver-pendientes-' + c.capacitacionObligatoriaId"
                      >
                        Ver pendientes ({{ c.personasPendientes.length }})
                      </button>
                    } @else {
                      <span class="badge-al-dia">✓ Al día</span>
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
          <div class="modal-card bento-card">
            <div class="modal-header-institucional">
              <div>
                <span class="chip-modo">Seguimiento de Cumplimiento</span>
                <h4 class="modal-titulo">
                  Personas pendientes: {{ capacitacionDetallePendientes()!.nombre }}
                </h4>
              </div>
              <button
                type="button"
                class="modal-btn-close"
                (click)="cerrarModalPendientes()"
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            <p class="text-sm text-muted modal-desc">
              Listado de personas a las que les aplica esta capacitación y aún no registran
              certificado aprobado.
            </p>

            <div class="modal-table-container">
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
                      <td class="font-mono">{{ p.documento }}</td>
                      <td>
                        <strong>{{ p.nombre }}</strong>
                      </td>
                      <td>
                        <span class="badge-alcance-tipo">{{
                          p.tipoFuncionarioNombre || 'Sin tipo'
                        }}</span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="modal-botones mt-3">
              <button
                type="button"
                class="btn-istpet-secondary btn-sm"
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
    :host {
      display: block;
      color: #0f172a;
    }

    .capacitaciones-bento-container {
      padding: 0.5rem 0 2rem 0;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    /* Bento Cards base */
    .bento-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 1.5rem;
      box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.04);
      transition:
        box-shadow 0.2s ease,
        border-color 0.2s ease;
    }

    .bento-card:hover {
      box-shadow: 0 6px 20px -2px rgba(15, 23, 42, 0.07);
    }

    /* Bento Header */
    .header-bento {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1.5rem;
      flex-wrap: wrap;
      background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
      border-left: 5px solid #222c57;
    }

    .header-info {
      flex: 1;
      min-width: 280px;
    }

    .header-badge-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-bottom: 0.5rem;
    }

    .badge-institucional {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      background: rgba(34, 44, 87, 0.08);
      color: #222c57;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      letter-spacing: 0.02em;
    }

    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #c4a857;
    }

    .badge-normativa {
      font-size: 0.75rem;
      color: #64748b;
      font-weight: 600;
      background: #f1f5f9;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
    }

    .badge-monitoreo {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 700;
      color: #c4a857;
      background: rgba(196, 168, 87, 0.12);
      border: 1px solid rgba(196, 168, 87, 0.3);
      padding: 0.2rem 0.5rem;
      border-radius: 9999px;
    }

    .bloque-titulo {
      font-size: 1.25rem;
      font-weight: 700;
      color: #222c57;
      margin: 0 0 0.375rem 0;
      letter-spacing: -0.01em;
    }

    .bloque-desc {
      font-size: 0.875rem;
      color: #475569;
      margin: 0;
      line-height: 1.5;
      max-width: 720px;
    }

    .header-acciones {
      display: flex;
      gap: 0.625rem;
      align-items: center;
    }

    /* Botones Institucionales ISTPET */
    .btn-istpet-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      background: #222c57;
      color: #ffffff;
      border: 1px solid #1a2244;
      border-radius: 8px;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      box-shadow: 0 1px 3px rgba(34, 44, 87, 0.2);
    }

    .btn-istpet-primary:hover:not(:disabled) {
      background: #1a2244;
      border-color: #c4a857;
      box-shadow: 0 3px 8px rgba(34, 44, 87, 0.3);
      transform: translateY(-1px);
    }

    .btn-istpet-primary:disabled {
      background: #94a3b8;
      border-color: #94a3b8;
      cursor: not-allowed;
      opacity: 0.7;
    }

    .btn-icon {
      font-weight: bold;
      font-size: 1rem;
    }

    .btn-istpet-secondary {
      background: #f8fafc;
      color: #334155;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 0.5rem 0.875rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-istpet-secondary:hover:not(:disabled) {
      background: #e2e8f0;
      color: #0f172a;
    }

    .btn-istpet-secondary:disabled {
      background: #f1f5f9;
      color: #94a3b8;
      cursor: not-allowed;
    }

    .btn-sm {
      padding: 0.375rem 0.625rem;
      font-size: 0.8125rem;
    }

    /* Alertas Bento */
    .bento-alert {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.875rem 1rem;
      border-radius: 10px;
      font-size: 0.875rem;
      font-weight: 500;
      animation: fadeIn 0.2s ease-in;
    }

    .alert-icon {
      font-weight: bold;
      font-size: 1rem;
    }

    .alert-success {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }

    .alert-danger {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    /* Formulario Bento */
    .form-bento {
      border: 1px solid #c4a857;
      background: #ffffff;
      box-shadow: 0 8px 24px -4px rgba(196, 168, 87, 0.12);
    }

    .form-bento-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.25rem;
      padding-bottom: 0.875rem;
      border-bottom: 1px solid #f1f5f9;
    }

    .chip-modo {
      display: inline-block;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #c4a857;
      margin-bottom: 0.25rem;
    }

    .form-titulo {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
      color: #222c57;
    }

    .form-nota-obligatorios {
      font-size: 0.75rem;
      color: #64748b;
    }

    .form-grid-dos {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.25rem;
    }

    .form-grid-tres {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.25rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .form-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #334155;
    }

    .form-control {
      padding: 0.5625rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 0.875rem;
      color: #0f172a;
      background-color: #ffffff;
      transition: all 0.15s ease;
    }

    .form-control:focus {
      outline: none;
      border-color: #222c57;
      box-shadow: 0 0 0 3px rgba(34, 44, 87, 0.15);
    }

    .form-group.has-error .form-control {
      border-color: #dc2626;
      background-color: #fffaf0;
    }

    .form-select {
      cursor: pointer;
    }

    .form-help-text {
      font-size: 0.7188rem;
      color: #64748b;
      line-height: 1.3;
    }

    .campo-error-msg {
      font-size: 0.75rem;
      color: #dc2626;
      font-weight: 500;
    }

    .form-botones {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 1rem;
      border-top: 1px solid #f1f5f9;
    }

    /* Tablas Bento */
    .tabla-bento-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .seccion-subtitulo {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 700;
      color: #222c57;
    }

    .total-badge {
      font-size: 0.75rem;
      font-weight: 600;
      color: #64748b;
    }

    .table-responsive {
      overflow-x: auto;
      border: 1px solid #f1f5f9;
      border-radius: 10px;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
      background: #ffffff;
    }

    .data-table th {
      background: #f8fafc;
      padding: 0.75rem 1rem;
      text-align: left;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #475569;
      border-bottom: 1px solid #e2e8f0;
    }

    .data-table td {
      padding: 0.875rem 1rem;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
      vertical-align: middle;
    }

    .data-table tbody tr:hover {
      background-color: #f8fafc;
    }

    .capacitacion-nombre-cell {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .nombre-principal {
      font-size: 0.9375rem;
      color: #0f172a;
    }

    .subtexto-fecha {
      font-size: 0.75rem;
      color: #64748b;
    }

    .texto-secundario {
      color: #475569;
    }

    .chip-horas {
      display: inline-block;
      font-weight: 600;
      color: #334155;
      background: #f1f5f9;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      font-size: 0.8125rem;
    }

    .badge-alcance {
      display: inline-block;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .badge-alcance-general {
      background: rgba(34, 44, 87, 0.08);
      color: #222c57;
      border: 1px solid rgba(34, 44, 87, 0.2);
    }

    .badge-alcance-tipo {
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
    }

    .badge-estado {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.2rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .badge-estado-activo {
      background: #dcfce7;
      color: #166534;
    }

    .badge-estado-inactivo {
      background: #fee2e2;
      color: #991b1b;
    }

    .dot-activo {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #16a34a;
    }

    .dot-inactivo {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #dc2626;
    }

    .acciones-inline {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }

    .btn-accion {
      background: transparent;
      border: 1px solid transparent;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.8125rem;
      font-weight: 600;
      padding: 0.25rem 0.5rem;
      transition: all 0.15s ease;
    }

    .btn-editar {
      color: #0284c7;
      border-color: rgba(2, 132, 199, 0.2);
      background: rgba(2, 132, 199, 0.04);
    }

    .btn-editar:hover {
      background: rgba(2, 132, 199, 0.12);
      border-color: #0284c7;
    }

    .btn-eliminar {
      color: #dc2626;
      border-color: rgba(220, 38, 38, 0.2);
      background: rgba(220, 38, 38, 0.04);
    }

    .btn-eliminar:hover {
      background: rgba(220, 38, 38, 0.12);
      border-color: #dc2626;
    }

    /* Cumplimiento Bento Card */
    .cumplimiento-bento {
      border-top: 4px solid #c4a857;
    }

    .cumplimiento-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .cumplimiento-titulo {
      font-size: 1.15rem;
      font-weight: 700;
      color: #222c57;
      margin: 0.25rem 0 0.25rem 0;
    }

    .cumplimiento-desc {
      font-size: 0.8438rem;
      color: #64748b;
      margin: 0;
    }

    .cumplimiento-nombre-cell {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .progreso-bar-contenedor {
      display: flex;
      height: 6px;
      background: #e2e8f0;
      border-radius: 9999px;
      overflow: hidden;
      width: 100%;
      min-width: 140px;
      max-width: 220px;
    }

    .progreso-bar-segmento {
      height: 100%;
      transition: width 0.3s ease;
    }

    .seg-cumplidas {
      background: #16a34a;
    }

    .seg-exentas {
      background: #0284c7;
    }

    .seg-pendientes {
      background: #e11d48;
    }

    .chip-metric {
      display: inline-block;
      font-weight: 700;
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
      font-size: 0.8125rem;
      text-align: center;
      min-width: 32px;
    }

    .chip-total {
      background: #f1f5f9;
      color: #334155;
    }

    .chip-cumplidas {
      background: #dcfce7;
      color: #15803d;
    }

    .chip-exentas {
      background: #e0f2fe;
      color: #0369a1;
    }

    .chip-pendientes {
      background: #fee2e2;
      color: #b91c1c;
    }

    .chip-al-dia {
      background: #f1f5f9;
      color: #64748b;
    }

    .badge-al-dia {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #15803d;
    }

    .btn-ver-pendientes {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #222c57;
      font-size: 0.8125rem;
      font-weight: 600;
      padding: 0.3rem 0.625rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-ver-pendientes:hover {
      background: #222c57;
      color: #ffffff;
      border-color: #222c57;
    }

    /* Modal Bento */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
      padding: 1rem;
      animation: fadeIn 0.15s ease-out;
    }

    .modal-card {
      max-width: 680px;
      width: 100%;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 40px -8px rgba(0, 0, 0, 0.3);
      border: 1px solid #cbd5e1;
    }

    .modal-header-institucional {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.5rem;
    }

    .modal-titulo {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: #222c57;
    }

    .modal-btn-close {
      background: transparent;
      border: none;
      font-size: 1.25rem;
      line-height: 1;
      color: #64748b;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
    }

    .modal-btn-close:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    .modal-desc {
      margin: 0 0 1rem 0;
    }

    .modal-table-container {
      overflow-y: auto;
      max-height: 50vh;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }

    .modal-botones {
      display: flex;
      justify-content: flex-end;
    }

    .font-mono {
      font-family: monospace;
      font-size: 0.8125rem;
    }

    .empty-state-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 2rem;
      color: #64748b;
    }

    .empty-icon {
      font-size: 1.75rem;
    }

    .text-danger {
      color: #dc2626;
    }

    .text-muted {
      color: #64748b;
    }

    .text-right {
      text-align: right;
    }

    .text-center {
      text-align: center;
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

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(2px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
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
  readonly erroresCampos = signal<Record<string, string[]>>({});

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
    this.modelo.fechaRealizacion = fechaSinHora(valor);
  }

  obtenerErrorCampo(campo: string): string | null {
    const errs = this.erroresCampos();
    if (!errs) return null;
    const matchKey = Object.keys(errs).find((k) => k.toLowerCase() === campo.toLowerCase());
    if (matchKey && errs[matchKey]?.length) {
      return errs[matchKey].join(', ');
    }
    return null;
  }

  calcularPorcentaje(parcial: number, total: number): number {
    if (!total || total <= 0) return 0;
    return Math.min(100, Math.round((parcial / total) * 100));
  }

  abrirFormulario(): void {
    this.idEdicion.set(undefined);
    this.error.set('');
    this.mensajeExito.set('');
    this.erroresCampos.set({});
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
    this.erroresCampos.set({});

    this.fechaRealizacionStr = ob.fechaRealizacion
      ? new Date(ob.fechaRealizacion).toISOString().split('T')[0]
      : '';

    this.modelo = {
      nombre: ob.nombre,
      institucionOrganizadora: ob.institucionOrganizadora,
      horasEsperadas: ob.horasEsperadas,
      fechaRealizacion: this.fechaRealizacionStr
        ? fechaSinHora(this.fechaRealizacionStr)
        : undefined,
      tipoFuncionarioId: ob.tipoFuncionarioId,
      activo: ob.activo,
      orden: ob.orden,
    };

    this.mostrarFormulario.set(true);
  }

  cancelarFormulario(): void {
    this.mostrarFormulario.set(false);
    this.idEdicion.set(undefined);
    this.erroresCampos.set({});
  }

  guardar(): void {
    if (!this.modelo.nombre?.trim()) {
      this.error.set('El nombre de la capacitación obligatoria es obligatorio.');
      return;
    }

    this.guardando.set(true);
    this.error.set('');
    this.mensajeExito.set('');
    this.erroresCampos.set({});

    // Higienizar payload para serialización estricta con DateOnly y tipos numéricos
    let fechaFinal: Date | undefined = undefined;
    if (this.fechaRealizacionStr) {
      fechaFinal = fechaSinHora(this.fechaRealizacionStr);
    } else if (this.modelo.fechaRealizacion) {
      const d = this.modelo.fechaRealizacion;
      fechaFinal = fechaSinHora(
        d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10),
      );
    }

    const horas =
      this.modelo.horasEsperadas !== undefined &&
      this.modelo.horasEsperadas !== null &&
      String(this.modelo.horasEsperadas).trim() !== ''
        ? Number(this.modelo.horasEsperadas)
        : undefined;

    const peticionRequest: GuardarCapacitacionObligatoriaRequest = {
      nombre: this.modelo.nombre.trim(),
      institucionOrganizadora: this.modelo.institucionOrganizadora?.trim() || undefined,
      horasEsperadas: horas,
      fechaRealizacion: fechaFinal,
      tipoFuncionarioId: this.modelo.tipoFuncionarioId || undefined,
      activo: this.modelo.activo ?? true,
      orden: this.modelo.orden ?? 0,
    };

    const peticion = this.idEdicion()
      ? this.configClient.actualizarCapacitacionObligatoria(this.idEdicion()!, peticionRequest)
      : this.configClient.crearCapacitacionObligatoria(peticionRequest);

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
        const detalle = extraerDetalleError(err, 'Error al guardar la capacitación obligatoria.');
        this.error.set(detalle.mensaje);
        this.erroresCampos.set(detalle.errores ?? {});
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
