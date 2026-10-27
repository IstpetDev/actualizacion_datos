import { ValidacionHojaDeVidaService } from '../../servicios/validacion-hoja-de-vida.service';
import { fechaSinHora } from '../../servicios/fecha-sin-hora';
import { CommonModule } from '@angular/common';
import { DestroyRef, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CapacitacionDto,
  ElementoCatalogoDto,
  GuardarCapacitacionRequest,
} from '../../../../../api-client';
import { MarcaObservacionComponent } from '../../componentes/marca-observacion.component';
import { UploaderRespaldoComponent } from '../../componentes/uploader-respaldo.component';
import { CatalogosCacheService } from '../../servicios/catalogos-cache.service';
import { HojaDeVidaStateService } from '../../servicios/hoja-de-vida-state.service';

@Component({
  selector: 'app-capacitaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, UploaderRespaldoComponent, MarcaObservacionComponent],
  template: `
    @if (validacion.errorCarga()) {
      <p role="alert">
        {{ validacion.errorCarga() }}
        <button type="button" (click)="validacion.cargar()">Reintentar</button>
      </p>
    }

    <section class="seccion-capacitaciones" data-testid="seccion-capacitaciones">
      <header class="seccion-header">
        <div class="header-titulos">
          <h2 class="seccion-titulo">3. Capacitaciones y Actualización Profesional</h2>
          <p class="seccion-desc">
            Registre los cursos, talleres, seminarios y capacitaciones continuas realizadas. Cada
            registro debe contar con su certificado o respaldo digital correspondiente (RF-HDV-006,
            RF-HDV-024).
          </p>
        </div>
        <div class="acciones-barra">
          @if (puedeEditar() && !mostrarFormulario()) {
            <button
              type="button"
              class="btn btn-primary btn-sm"
              (click)="abrirFormulario()"
              data-testid="btn-nueva-capacitacion"
            >
              + Registrar Capacitación
            </button>
          }
        </div>
      </header>

      <!-- Formulario Inline para Capacitación -->
      @if (mostrarFormulario()) {
        <div class="card-formulario-item" data-testid="form-capacitacion">
          <h3 class="form-titulo-item">
            {{ idEdicion() ? 'Editar Capacitación' : 'Nueva Capacitación' }}
          </h3>

          <div class="grid-dos">
            <div class="form-group">
              <label for="nombreEvento"
                >Nombre del Evento / Curso <span class="text-danger">*</span></label
              >
              <input
                [attr.aria-describedby]="'error-modelo-nombreEvento'"
                id="nombreEvento"
                type="text"
                class="form-control"
                [(ngModel)]="modelo.nombreEvento"
                placeholder="Ej. Metodologías Ágiles de Aprendizaje"
                data-testid="input-nombre-evento"
              />
              @if (validacion.mensaje(modelo, 'capacitacion', 'nombreEvento'); as mensaje) {
                <small id="error-modelo-nombreEvento" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>

            <div class="form-group">
              <label for="institucionOrganizadora"
                >Institución Organizadora <span class="text-danger">*</span></label
              >
              <input
                [attr.aria-describedby]="'error-modelo-institucionOrganizadora'"
                id="institucionOrganizadora"
                type="text"
                class="form-control"
                [(ngModel)]="modelo.institucionOrganizadora"
                placeholder="Ej. Red de Institutos Tecnológicos"
                data-testid="input-institucion-organizadora"
              />
              @if (
                validacion.mensaje(modelo, 'capacitacion', 'institucionOrganizadora');
                as mensaje
              ) {
                <small id="error-modelo-institucionOrganizadora" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>
          </div>

          <div class="grid-tres mt-3">
            <div class="form-group">
              <label for="tipoCapacitacion">Tipo de Capacitación</label>
              <select
                [attr.aria-describedby]="'error-modelo-tipoCapacitacionId'"
                id="tipoCapacitacion"
                class="form-control"
                [(ngModel)]="modelo.tipoCapacitacionId"
                data-testid="select-tipo-capacitacion"
              >
                <option [ngValue]="undefined">Seleccione tipo...</option>
                @for (tc of tiposCapacitacion(); track tc.id) {
                  <option [ngValue]="tc.id">{{ tc.nombre }}</option>
                }
              </select>
              @if (validacion.mensaje(modelo, 'capacitacion', 'tipoCapacitacionId'); as mensaje) {
                <small id="error-modelo-tipoCapacitacionId" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>

            <div class="form-group">
              <label for="tipoParticipacion">Tipo de Participación</label>
              <select
                [attr.aria-describedby]="'error-modelo-tipoParticipacion'"
                id="tipoParticipacion"
                class="form-control"
                [(ngModel)]="modelo.tipoParticipacion"
                data-testid="select-tipo-participacion"
              >
                <option value="Asistente">Asistente</option>
                <option value="Aprobado">Aprobado / Certificado</option>
                <option value="Ponente">Ponente / Expositor</option>
                <option value="Facilitador">Facilitador / Instructor</option>
                <option value="Organizador">Organizador</option>
              </select>
              @if (validacion.mensaje(modelo, 'capacitacion', 'tipoParticipacion'); as mensaje) {
                <small id="error-modelo-tipoParticipacion" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>

            <div class="form-group">
              <label for="numeroHoras">Horas de Duración</label>
              <input
                [attr.aria-describedby]="'error-modelo-numeroHoras'"
                id="numeroHoras"
                type="number"
                min="1"
                class="form-control"
                [(ngModel)]="modelo.numeroHoras"
                placeholder="40"
                data-testid="input-numero-horas"
              />
              @if (validacion.mensaje(modelo, 'capacitacion', 'numeroHoras'); as mensaje) {
                <small id="error-modelo-numeroHoras" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>
          </div>

          <div class="grid-dos mt-3">
            <div class="form-group">
              <label for="fechaInicio">Fecha de Inicio</label>
              <input
                [attr.aria-describedby]="'error-modelo-fechaInicio'"
                id="fechaInicio"
                type="date"
                class="form-control"
                [ngModel]="fechaInicioStr"
                (ngModelChange)="onFechaInicioChange($event)"
                data-testid="input-fecha-inicio"
              />
              @if (validacion.mensaje(modelo, 'capacitacion', 'fechaInicio'); as mensaje) {
                <small id="error-modelo-fechaInicio" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>

            <div class="form-group">
              <label for="fechaFin">Fecha de Finalización</label>
              <input
                [attr.aria-describedby]="'error-modelo-fechaFin'"
                id="fechaFin"
                type="date"
                class="form-control"
                [ngModel]="fechaFinStr"
                (ngModelChange)="onFechaFinChange($event)"
                data-testid="input-fecha-fin"
              />
              @if (validacion.mensaje(modelo, 'capacitacion', 'fechaFin'); as mensaje) {
                <small id="error-modelo-fechaFin" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>
          </div>

          <div class="grid-dos mt-3">
            <div class="form-group">
              <label for="lugar">Lugar / Ciudad o Modalidad</label>
              <input
                [attr.aria-describedby]="'error-modelo-lugar'"
                id="lugar"
                type="text"
                class="form-control"
                [(ngModel)]="modelo.lugar"
                placeholder="Ej. Quito / Virtual"
                data-testid="input-lugar"
              />
              @if (validacion.mensaje(modelo, 'capacitacion', 'lugar'); as mensaje) {
                <small id="error-modelo-lugar" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>

            <div class="form-check-centrado">
              <label class="checkbox-label">
                <input
                  [attr.aria-describedby]="'error-modelo-financiadaPorInstitucion'"
                  type="checkbox"
                  [(ngModel)]="modelo.financiadaPorInstitucion"
                  data-testid="checkbox-financiada"
                />
                @if (
                  validacion.mensaje(modelo, 'capacitacion', 'financiadaPorInstitucion');
                  as mensaje
                ) {
                  <small
                    id="error-modelo-financiadaPorInstitucion"
                    class="text-danger"
                    role="alert"
                    >{{ mensaje }}</small
                  >
                }
                <span>¿Financiada o auspiciada por la institución?</span>
              </label>
            </div>
          </div>

          <!-- Respaldo Digital Obligatorio -->
          <div class="mt-3">
            <app-uploader-respaldo
              etiqueta="Certificado de Capacitación"
              ayuda="Obligatorio para validar las horas de capacitación (PDF o imagen, máx. 10 MB)"
              [requerido]="true"
              [puedeEditar]="puedeEditar()"
              [archivoId]="modelo.archivoId"
              (archivoIdChange)="modelo.archivoId = $event"
              (archivoEliminado)="modelo.archivoId = undefined"
            ></app-uploader-respaldo>
          </div>

          @if (errorFormulario()) {
            <div class="alert alert-danger mt-2" data-testid="error-capacitacion">
              {{ errorFormulario() }}
            </div>
          }

          <div class="form-botones-item mt-4">
            <button type="button" class="btn btn-secondary btn-sm" (click)="cancelarFormulario()">
              Cancelar
            </button>
            <button
              type="button"
              class="btn btn-primary btn-sm"
              [disabled]="guardando() || validacion.invalido(modelo, 'capacitacion')"
              (click)="guardar()"
              data-testid="btn-guardar-capacitacion"
            >
              {{ guardando() ? 'Guardando...' : 'Guardar Capacitación' }}
            </button>
          </div>
        </div>
      }

      <!-- Tabla de Capacitaciones -->
      <div class="table-container mt-3">
        <table class="data-table" data-testid="tabla-capacitaciones">
          <thead>
            <tr>
              <th>Evento / Curso</th>
              <th>Institución Organizadora</th>
              <th>Horas</th>
              <th>Participación</th>
              <th>Respaldo</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (c of capacitaciones(); track c.id) {
              <tr>
                <td>
                  <strong>{{ c.nombreEvento }}</strong>
                  <app-marca-observacion
                    [marca]="obtenerMarca('capacitacion', c.id)"
                  ></app-marca-observacion>
                </td>
                <td>{{ c.institucionOrganizadora }}</td>
                <td>{{ c.numeroHoras ? c.numeroHoras + ' h' : '—' }}</td>
                <td>
                  <span class="badge badge-info">{{ c.tipoParticipacion || 'Asistente' }}</span>
                </td>
                <td>
                  @if (c.archivoId) {
                    <span class="badge badge-success">✓ Con Respaldo</span>
                  } @else {
                    <span class="badge badge-danger">✕ Sin Respaldo</span>
                  }
                </td>
                <td class="text-right">
                  @if (puedeEditar()) {
                    <button
                      type="button"
                      class="btn-accion btn-editar"
                      (click)="editar(c)"
                      data-testid="btn-editar-capacitacion"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      class="btn-accion btn-eliminar"
                      (click)="eliminar(c.id)"
                      data-testid="btn-eliminar-capacitacion"
                    >
                      Eliminar
                    </button>
                  } @else {
                    <span class="text-muted text-sm">Solo lectura</span>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="text-center empty-state">
                  No ha registrado capacitaciones ni cursos continuos todavía.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: [
    `
      .seccion-capacitaciones {
        padding: 1.25rem 0;
      }
      .seccion-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
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
      .card-formulario-item {
        background: var(--geist-surface-subtle, #fafafa);
        border: 1px solid var(--geist-border, #eaeaea);
        border-radius: var(--radius-md, 8px);
        padding: 1.25rem;
        margin-bottom: 1.5rem;
      }
      .form-titulo-item {
        font-size: 1.05rem;
        font-weight: 700;
        color: #1e293b;
        margin: 0 0 1rem 0;
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
      .form-check-centrado {
        display: flex;
        align-items: center;
        padding-top: 1.5rem;
      }
      .checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: #334155;
        cursor: pointer;
      }
      .form-botones-item {
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
      .btn-accion {
        background: transparent;
        border: none;
        cursor: pointer;
        font-size: 0.8125rem;
        font-weight: 600;
        margin-left: 0.5rem;
      }
      .btn-editar {
        color: var(--ammi-primary, #1d1e1c);
      }
      .btn-eliminar {
        color: #ef4444;
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
        background: var(--ammi-primary, #1d1e1c);
        border: 1px solid var(--ammi-primary, #1d1e1c);
        color: #ffffff;
      }
      .btn-secondary {
        background: #e2e8f0;
        color: #334155;
      }
      .text-right {
        text-align: right;
      }
      .text-muted {
        color: #94a3b8;
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
      .text-danger {
        color: #dc2626;
      }
      .alert-danger {
        background: #fee2e2;
        color: #991b1b;
        padding: 0.5rem 0.75rem;
        border-radius: 6px;
        font-size: 0.875rem;
      }
      .empty-state {
        color: #94a3b8;
        padding: 1.5rem !important;
      }
    `,
  ],
})
export class CapacitacionesComponent implements OnInit {
  readonly validacion = inject(ValidacionHojaDeVidaService);
  private readonly registroValidacion = this.validacion.registrarFormulario(
    'capacitaciones',
    () => this.mostrarFormulario() && this.validacion.invalido(this.modelo, 'capacitacion'),
    inject(DestroyRef),
  );
  private readonly state = inject(HojaDeVidaStateService);
  private readonly catalogos = inject(CatalogosCacheService);

  readonly puedeEditar = this.state.puedeEditar;
  readonly guardando = this.state.guardando;
  readonly capacitaciones = this.state.capacitaciones;

  readonly tiposCapacitacion = signal<ElementoCatalogoDto[]>([]);
  readonly mostrarFormulario = signal(false);
  readonly idEdicion = signal<string | undefined>(undefined);
  readonly errorFormulario = signal('');

  fechaInicioStr = '';
  fechaFinStr = '';

  modelo: GuardarCapacitacionRequest = {
    nombreEvento: '',
    institucionOrganizadora: '',
    tipoCapacitacionId: undefined,
    tipoParticipacion: 'Asistente',
    fechaInicio: undefined,
    fechaFin: undefined,
    numeroHoras: undefined,
    lugar: '',
    financiadaPorInstitucion: false,
    archivoId: undefined,
  };

  ngOnInit(): void {
    this.catalogos.tiposCapacitacion().subscribe((t) => this.tiposCapacitacion.set(t));
  }

  onFechaInicioChange(valor: string): void {
    this.fechaInicioStr = valor;
    this.modelo.fechaInicio = fechaSinHora(valor);
  }

  onFechaFinChange(valor: string): void {
    this.fechaFinStr = valor;
    this.modelo.fechaFin = fechaSinHora(valor);
  }

  abrirFormulario(): void {
    this.idEdicion.set(undefined);
    this.errorFormulario.set('');
    this.fechaInicioStr = '';
    this.fechaFinStr = '';
    this.modelo = {
      nombreEvento: '',
      institucionOrganizadora: '',
      tipoCapacitacionId: undefined,
      tipoParticipacion: 'Asistente',
      fechaInicio: undefined,
      fechaFin: undefined,
      numeroHoras: undefined,
      lugar: '',
      financiadaPorInstitucion: false,
      archivoId: undefined,
    };
    this.mostrarFormulario.set(true);
  }

  editar(c: CapacitacionDto): void {
    this.idEdicion.set(c.id);
    this.errorFormulario.set('');
    this.modelo = {
      nombreEvento: c.nombreEvento,
      institucionOrganizadora: c.institucionOrganizadora,
      tipoCapacitacionId: c.tipoCapacitacionId,
      tipoParticipacion: c.tipoParticipacion,
      fechaInicio: c.fechaInicio,
      fechaFin: c.fechaFin,
      numeroHoras: c.numeroHoras,
      lugar: c.lugar,
      financiadaPorInstitucion: c.financiadaPorInstitucion,
      archivoId: c.archivoId,
    };
    this.fechaInicioStr = c.fechaInicio ? new Date(c.fechaInicio).toISOString().split('T')[0] : '';
    this.fechaFinStr = c.fechaFin ? new Date(c.fechaFin).toISOString().split('T')[0] : '';
    this.mostrarFormulario.set(true);
  }

  cancelarFormulario(): void {
    this.mostrarFormulario.set(false);
    this.idEdicion.set(undefined);
  }

  guardar(): void {
    if (this.validacion.invalido(this.modelo, 'capacitacion')) return;
    if (!this.modelo.nombreEvento?.trim()) {
      this.errorFormulario.set('El nombre del evento o curso es obligatorio.');
      return;
    }
    if (!this.modelo.institucionOrganizadora?.trim()) {
      this.errorFormulario.set('La institución organizadora es obligatoria.');
      return;
    }

    this.state.guardarCapacitacion(this.modelo, this.idEdicion()).subscribe({
      next: () => this.cancelarFormulario(),
      error: (err) => {
        this.validacion.registrarError(err, this.modelo);
        this.errorFormulario.set(err?.message || 'Error al guardar la capacitación.');
      },
    });
  }

  eliminar(id: string): void {
    if (!confirm('¿Está seguro de eliminar esta capacitación?')) return;
    this.state.eliminarCapacitacion(id).subscribe();
  }

  obtenerMarca(tipoDestino: string, claveDestino: string) {
    return this.state.obtenerMarcaParaItem(tipoDestino, claveDestino);
  }
}
