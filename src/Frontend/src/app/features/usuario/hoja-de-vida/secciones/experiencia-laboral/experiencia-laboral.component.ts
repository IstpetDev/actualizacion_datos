import { mensajeError } from '../../../../../core/auth/mensaje-error';
import { ValidacionHojaDeVidaService } from '../../servicios/validacion-hoja-de-vida.service';
import { fechaSinHora } from '../../servicios/fecha-sin-hora';
import { CommonModule } from '@angular/common';
import { DestroyRef, Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { SeccionConCambios } from '../../servicios/seccion-con-cambios';
import { FormsModule } from '@angular/forms';
import {
  ElementoCatalogoDto,
  ExperienciaLaboralDto,
  GuardarExperienciaLaboralRequest,
} from '../../../../../api-client';
import { MarcaObservacionComponent } from '../../componentes/marca-observacion.component';
import { UploaderRespaldoComponent } from '../../componentes/uploader-respaldo.component';
import { CatalogosCacheService } from '../../servicios/catalogos-cache.service';
import { HojaDeVidaStateService } from '../../servicios/hoja-de-vida-state.service';

@Component({
  selector: 'app-experiencia-laboral',
  standalone: true,
  imports: [CommonModule, FormsModule, UploaderRespaldoComponent, MarcaObservacionComponent],
  template: `
    @if (validacion.errorCarga()) {
      <p role="alert">
        {{ validacion.errorCarga() }}
        <button type="button" (click)="validacion.cargar()">Reintentar</button>
      </p>
    }

    <section class="seccion-experiencia" data-testid="seccion-experiencia-laboral">
      <header class="seccion-header">
        <div class="header-titulos">
          <h2 class="seccion-titulo">4. Trayectoria y Experiencia Laboral</h2>
          <p class="seccion-desc">
            Detalle su historial de empleos previos y actuales. Para cada registro laboral debe
            adjuntar el certificado de trabajo o mecanizado correspondiente (RF-HDV-006,
            RF-HDV-024).
          </p>
        </div>
        <div class="acciones-barra">
          @if (puedeEditar() && !mostrarFormulario()) {
            <button
              type="button"
              class="btn btn-primary btn-sm"
              (click)="abrirFormulario()"
              data-testid="btn-nueva-experiencia"
            >
              + Registrar Experiencia Laboral
            </button>
          }
        </div>
      </header>

      <!-- Formulario Inline de Experiencia -->
      @if (mostrarFormulario()) {
        <div class="card-formulario-item" data-testid="form-experiencia">
          <h3 class="form-titulo-item">
            {{ idEdicion() ? 'Editar Experiencia Laboral' : 'Nueva Experiencia Laboral' }}
          </h3>

          <div class="grid-dos">
            <div class="form-group">
              <label for="empleador"
                >Empresa / Institución Empleadora <span class="text-danger">*</span></label
              >
              <input
                [attr.aria-describedby]="'error-modelo-empleador'"
                id="empleador"
                type="text"
                class="form-control"
                [(ngModel)]="modelo.empleador"
                placeholder="Ej. Instituto Superior Tecnológico..."
                data-testid="input-empleador"
              />
              @if (validacion.mensaje(modelo, 'experiencia', 'empleador'); as mensaje) {
                <small id="error-modelo-empleador" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>

            <div class="form-group">
              <label for="cargo"
                >Cargo o Puesto Desempeñado <span class="text-danger">*</span></label
              >
              <input
                [attr.aria-describedby]="'error-modelo-cargo'"
                id="cargo"
                type="text"
                class="form-control"
                [(ngModel)]="modelo.cargo"
                placeholder="Ej. Docente a Tiempo Completo / Desarrollador"
                data-testid="input-cargo"
              />
              @if (validacion.mensaje(modelo, 'experiencia', 'cargo'); as mensaje) {
                <small id="error-modelo-cargo" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>
          </div>

          <div class="grid-dos mt-3">
            <div class="form-group">
              <label for="paisExperiencia">País</label>
              <select
                [attr.aria-describedby]="'error-modelo-paisId'"
                id="paisExperiencia"
                class="form-control"
                [(ngModel)]="modelo.paisId"
                data-testid="select-pais-experiencia"
              >
                <option [ngValue]="undefined">Seleccione país...</option>
                @for (p of paises(); track p.id) {
                  <option [ngValue]="p.id">{{ p.nombre }}</option>
                }
              </select>
              @if (validacion.mensaje(modelo, 'experiencia', 'paisId'); as mensaje) {
                <small id="error-modelo-paisId" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>

            <div class="form-group">
              <label for="ciudadExperiencia">Ciudad</label>
              <input
                [attr.aria-describedby]="'error-modelo-ciudad'"
                id="ciudadExperiencia"
                type="text"
                class="form-control"
                [(ngModel)]="modelo.ciudad"
                placeholder="Ej. Quito"
                data-testid="input-ciudad-experiencia"
              />
              @if (validacion.mensaje(modelo, 'experiencia', 'ciudad'); as mensaje) {
                <small id="error-modelo-ciudad" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>
          </div>

          <!-- Fechas y Checkbox Trabaja Actualmente -->
          <div class="grid-tres mt-3">
            <div class="form-group">
              <label for="fechaInicio">Fecha de Inicio <span class="text-danger">*</span></label>
              <input
                [attr.aria-describedby]="'error-modelo-fechaInicio'"
                id="fechaInicio"
                type="date"
                class="form-control"
                [ngModel]="fechaInicioStr"
                (ngModelChange)="onFechaInicioChange($event)"
                data-testid="input-fecha-inicio"
              />
              @if (validacion.mensaje(modelo, 'experiencia', 'fechaInicio'); as mensaje) {
                <small id="error-modelo-fechaInicio" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>

            <div class="form-group">
              <label for="fechaFin">Fecha de Salida</label>
              <input
                [attr.aria-describedby]="'error-modelo-fechaFin'"
                id="fechaFin"
                type="date"
                class="form-control"
                [disabled]="!!modelo.trabajaActualmente"
                [ngModel]="fechaFinStr"
                (ngModelChange)="onFechaFinChange($event)"
                data-testid="input-fecha-fin"
              />
              @if (validacion.mensaje(modelo, 'experiencia', 'fechaFin'); as mensaje) {
                <small id="error-modelo-fechaFin" class="text-danger" role="alert">{{
                  mensaje
                }}</small>
              }
            </div>

            <div class="form-check-centrado">
              <label class="checkbox-label">
                <input
                  [attr.aria-describedby]="'error-modelo-trabajaActualmente'"
                  type="checkbox"
                  [(ngModel)]="modelo.trabajaActualmente"
                  (ngModelChange)="onTrabajaActualmenteChange($event)"
                  data-testid="checkbox-trabaja-actualmente"
                />
                @if (validacion.mensaje(modelo, 'experiencia', 'trabajaActualmente'); as mensaje) {
                  <small id="error-modelo-trabajaActualmente" class="text-danger" role="alert">{{
                    mensaje
                  }}</small>
                }
                <span>Trabajo actualmente aquí</span>
              </label>
            </div>
          </div>

          <div class="form-group mt-3">
            <label for="funciones">Principales Funciones y Responsabilidades</label>
            <textarea
              [attr.aria-describedby]="'error-modelo-funciones'"
              id="funciones"
              rows="3"
              class="form-control"
              [(ngModel)]="modelo.funciones"
              placeholder="Describa brevemente las funciones desarrolladas..."
              data-testid="textarea-funciones"
            ></textarea>
            @if (validacion.mensaje(modelo, 'experiencia', 'funciones'); as mensaje) {
              <small id="error-modelo-funciones" class="text-danger" role="alert">{{
                mensaje
              }}</small>
            }
          </div>

          <!-- Respaldo Digital de Experiencia -->
          <div class="mt-3">
            <app-uploader-respaldo
              etiqueta="Certificado de Trabajo o Mecanizado IESS"
              ayuda="Obligatorio para validar la experiencia laboral (máx. 10 MB)"
              [requerido]="true"
              [puedeEditar]="puedeEditar()"
              [archivoId]="modelo.archivoId"
              (archivoIdChange)="modelo.archivoId = $event"
              (archivoEliminado)="modelo.archivoId = undefined"
            ></app-uploader-respaldo>
          </div>

          @if (errorFormulario()) {
            <div class="alert alert-danger mt-2" data-testid="error-experiencia">
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
              [disabled]="guardando() || validacion.invalido(modelo, 'experiencia')"
              (click)="guardar()"
              data-testid="btn-guardar-experiencia"
            >
              {{ guardando() ? 'Guardando...' : 'Guardar Experiencia' }}
            </button>
          </div>
        </div>
      }

      <!-- Tabla de Experiencias -->
      <div class="table-container mt-3">
        <table class="data-table" data-testid="tabla-experiencias">
          <thead>
            <tr>
              <th>Empleador</th>
              <th>Cargo</th>
              <th>Periodo</th>
              <th>Lugar</th>
              <th>Respaldo</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (e of experiencias(); track e.id) {
              <tr>
                <td>
                  <strong>{{ e.empleador }}</strong>
                  <app-marca-observacion
                    [marca]="obtenerMarca('experiencia_laboral', e.id)"
                  ></app-marca-observacion>
                </td>
                <td>{{ e.cargo }}</td>
                <td>
                  {{ formatearFecha(e.fechaInicio) }} —
                  @if (e.trabajaActualmente) {
                    <span class="badge badge-activo">Actualmente</span>
                  } @else {
                    {{ formatearFecha(e.fechaFin) }}
                  }
                </td>
                <td>{{ e.ciudad || '—' }}</td>
                <td>
                  @if (e.archivoId) {
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
                      (click)="editar(e)"
                      data-testid="btn-editar-experiencia"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      class="btn-accion btn-eliminar"
                      (click)="eliminar(e.id)"
                      data-testid="btn-eliminar-experiencia"
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
                  No ha registrado experiencia laboral previa todavía.
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
      .seccion-experiencia {
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
      .badge-activo {
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
export class ExperienciaLaboralComponent implements OnInit, OnDestroy, SeccionConCambios {
  readonly validacion = inject(ValidacionHojaDeVidaService);
  private readonly registroValidacion = this.validacion.registrarFormulario(
    'experiencia-laboral',
    () => this.mostrarFormulario() && this.validacion.invalido(this.modelo, 'experiencia'),
    inject(DestroyRef),
  );
  private readonly state = inject(HojaDeVidaStateService);
  private readonly catalogos = inject(CatalogosCacheService);

  readonly puedeEditar = this.state.puedeEditar;
  readonly guardando = this.state.guardando;
  readonly experiencias = this.state.experiencias;

  readonly paises = signal<ElementoCatalogoDto[]>([]);
  readonly mostrarFormulario = signal(false);
  readonly idEdicion = signal<string | undefined>(undefined);
  readonly errorFormulario = signal('');

  fechaInicioStr = '';
  fechaFinStr = '';

  modelo: GuardarExperienciaLaboralRequest = {
    empleador: '',
    cargo: '',
    fechaInicio: new Date(),
    fechaFin: undefined,
    trabajaActualmente: false,
    ciudad: '',
    paisId: undefined,
    funciones: '',
    archivoId: undefined,
  };

  tieneCambios(): boolean {
    if (!this.puedeEditar()) return false;
    if (this.mostrarFormulario()) {
      return !!(
        this.idEdicion() ||
        this.modelo.empleador?.trim() ||
        this.modelo.cargo?.trim() ||
        this.fechaInicioStr ||
        this.fechaFinStr ||
        this.modelo.archivoId ||
        this.modelo.ciudad?.trim() ||
        this.modelo.funciones?.trim()
      );
    }
    return false;
  }

  guardarCambios(): Observable<boolean> {
    if (!this.puedeEditar()) return of(true);
    if (!this.mostrarFormulario()) return of(true);
    return this.guardarObservable();
  }

  descartarCambios(): void {
    this.cancelarFormulario();
    this.state.actualizarEstadoCambios?.();
  }

  ngOnInit(): void {
    this.catalogos.paises().subscribe((p) => this.paises.set(p));
    this.state.registrarSeccion?.(this);
  }

  ngOnDestroy(): void {
    this.state.desregistrarSeccion?.(this);
  }

  onFechaInicioChange(valor: string): void {
    this.fechaInicioStr = valor;
    this.modelo.fechaInicio = fechaSinHora(valor) as Date;
  }

  onFechaFinChange(valor: string): void {
    this.fechaFinStr = valor;
    this.modelo.fechaFin = fechaSinHora(valor);
  }

  onTrabajaActualmenteChange(activo: boolean): void {
    if (activo) {
      this.fechaFinStr = '';
      this.modelo.fechaFin = undefined;
    }
  }

  abrirFormulario(): void {
    this.idEdicion.set(undefined);
    this.errorFormulario.set('');
    this.fechaInicioStr = '';
    this.fechaFinStr = '';
    this.modelo = {
      empleador: '',
      cargo: '',
      fechaInicio: undefined as unknown as Date,
      fechaFin: undefined,
      trabajaActualmente: false,
      ciudad: '',
      paisId: undefined,
      funciones: '',
      archivoId: undefined,
    };
    this.mostrarFormulario.set(true);
  }

  editar(e: ExperienciaLaboralDto): void {
    this.idEdicion.set(e.id);
    this.errorFormulario.set('');
    this.modelo = {
      empleador: e.empleador,
      cargo: e.cargo,
      fechaInicio: e.fechaInicio,
      fechaFin: e.fechaFin,
      trabajaActualmente: e.trabajaActualmente,
      ciudad: e.ciudad,
      paisId: e.paisId,
      funciones: e.funciones,
      archivoId: e.archivoId,
    };
    this.fechaInicioStr = e.fechaInicio ? new Date(e.fechaInicio).toISOString().split('T')[0] : '';
    this.fechaFinStr = e.fechaFin ? new Date(e.fechaFin).toISOString().split('T')[0] : '';
    this.mostrarFormulario.set(true);
  }

  cancelarFormulario(): void {
    this.mostrarFormulario.set(false);
    this.idEdicion.set(undefined);
  }

  guardarObservable(): Observable<boolean> {
    if (!this.modelo.empleador?.trim()) {
      this.errorFormulario.set('El nombre de la empresa o institución empleadora es obligatorio.');
      return of(false);
    }
    if (!this.modelo.cargo?.trim()) {
      this.errorFormulario.set('El cargo desempeñado es obligatorio.');
      return of(false);
    }
    if (!this.fechaInicioStr) {
      this.errorFormulario.set('La fecha de inicio de labores es obligatoria.');
      return of(false);
    }

    if (this.validacion.invalido(this.modelo, 'experiencia')) return of(false);
    return this.state.guardarExperiencia(this.modelo, this.idEdicion()).pipe(
      map(() => {
        this.cancelarFormulario();
        this.state.actualizarEstadoCambios?.();
        return true;
      }),
      catchError((err) => {
        this.validacion.registrarError(err, this.modelo);
        this.errorFormulario.set(mensajeError(err, 'Error al guardar la experiencia laboral.'));
        return of(false);
      }),
    );
  }

  guardar(): void {
    this.guardarObservable().subscribe();
  }

  eliminar(id: string): void {
    if (!confirm('¿Está seguro de eliminar esta experiencia laboral?')) return;
    this.state.eliminarExperiencia(id).subscribe();
  }

  formatearFecha(fecha?: Date): string {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-EC', { year: 'numeric', month: 'short' });
  }

  obtenerMarca(tipoDestino: string, claveDestino: string) {
    return this.state.obtenerMarcaParaItem(tipoDestino, claveDestino);
  }
}
