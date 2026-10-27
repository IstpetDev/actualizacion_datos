import { mensajeError } from '../../../../../core/auth/mensaje-error';
import { ValidacionHojaDeVidaService } from '../../servicios/validacion-hoja-de-vida.service';
import { fechaSinHora } from '../../servicios/fecha-sin-hora';
import { CommonModule } from '@angular/common';
import { DestroyRef, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { SeccionConCambios } from '../../servicios/seccion-con-cambios';
import { FormsModule } from '@angular/forms';
import {
  CapacitacionDto,
  ElementoCatalogoDto,
  EstadoCapacitacionObligatoriaPersonaDto,
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

      <!-- Bloque Obligatorias de la Institución (RF-CAP-004) -->
      @if (obligatorias().length > 0) {
        <div class="bloque-obligatorias" data-testid="bloque-capacitaciones-obligatorias">
          <div class="bloque-obligatorias-header">
            <h3 class="bloque-titulo">Capacitaciones Obligatorias de la Institución</h3>
            <p class="bloque-desc">
              La institución exige las siguientes capacitaciones. El envío a revisión se bloqueará
              si tiene capacitaciones obligatorias pendientes (RF-CAP-004, RF-CAP-007).
            </p>
          </div>

          <div class="lista-obligatorias">
            @for (ob of obligatorias(); track ob.id) {
              <div class="card-obligatoria" [attr.data-testid]="'card-obligatoria-' + ob.id">
                <div class="obligatoria-info">
                  <div class="obligatoria-titulo-fila">
                    <strong class="obligatoria-nombre">{{ ob.nombre }}</strong>
                    <span
                      class="badge"
                      [ngClass]="{
                        'badge-success': ob.estado === 'cargada',
                        'badge-warning': ob.estado === 'observada',
                        'badge-info':
                          ob.estado === 'exento-nuevo-ingreso' ||
                          ob.estado === 'justificada-nuevo-ingreso',
                        'badge-danger': ob.estado === 'pendiente',
                      }"
                      [attr.data-testid]="'badge-estado-obligatoria-' + ob.id"
                    >
                      @switch (ob.estado) {
                        @case ('cargada') {
                          ✓ Cargada
                        }
                        @case ('observada') {
                          ⚠️ Observada
                        }
                        @case ('exento-nuevo-ingreso') {
                          ℹ Exento por nuevo ingreso
                        }
                        @case ('justificada-nuevo-ingreso') {
                          ✓ Justificada
                        }
                        @default {
                          ✕ Pendiente
                        }
                      }
                    </span>
                  </div>

                  <p class="obligatoria-meta">
                    @if (ob.institucionOrganizadora) {
                      <span>Organizadora: {{ ob.institucionOrganizadora }}</span>
                    }
                    @if (ob.horasEsperadas) {
                      <span> • Horas: {{ ob.horasEsperadas }}h</span>
                    }
                    @if (ob.fechaRealizacion) {
                      <span> • Fecha: {{ ob.fechaRealizacion | date: 'dd/MM/yyyy' }}</span>
                    }
                  </p>

                  @if (ob.justificacionNuevoIngreso) {
                    <p class="obligatoria-justificacion text-muted text-sm">
                      <em>Justificación: {{ ob.justificacionNuevoIngreso }}</em>
                    </p>
                  }
                </div>

                @if (puedeEditar()) {
                  <div class="obligatoria-acciones">
                    @if (ob.estado === 'pendiente' || ob.estado === 'observada') {
                      <button
                        type="button"
                        class="btn btn-primary btn-sm"
                        (click)="subirParaObligatoria(ob)"
                        [attr.data-testid]="'btn-subir-obligatoria-' + ob.id"
                      >
                        Subir Certificado
                      </button>

                      @if (capacitacionesSinVincular().length > 0) {
                        <button
                          type="button"
                          class="btn btn-secondary btn-sm"
                          (click)="abrirModalVincular(ob)"
                          [attr.data-testid]="'btn-usar-existente-' + ob.id"
                        >
                          Usar una que ya tengo
                        </button>
                      }

                      <button
                        type="button"
                        class="btn btn-outline btn-sm"
                        (click)="abrirModalJustificar(ob)"
                        [attr.data-testid]="'btn-justificar-obligatoria-' + ob.id"
                      >
                        Justificar ingreso
                      </button>
                    }
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- Modal Vincular Existente -->
      @if (obligatoriaParaVincular()) {
        <div class="modal-backdrop" data-testid="modal-vincular-existente">
          <div class="modal-card">
            <h4>Vincular capacitación existente</h4>
            <p>
              Seleccione una de sus capacitaciones registradas para cumplir con:
              <strong>{{ obligatoriaParaVincular()!.nombre }}</strong>
            </p>

            <div class="form-group">
              <label for="selectCapacitacion">Capacitación registrada</label>
              <select
                id="selectCapacitacion"
                class="form-control"
                [(ngModel)]="capacitacionSeleccionadaParaVincular"
                data-testid="select-capacitacion-existente"
              >
                <option value="">-- Seleccione una capacitación --</option>
                @for (c of capacitacionesSinVincular(); track c.id) {
                  <option [value]="c.id">
                    {{ c.nombreEvento }} ({{ c.institucionOrganizadora }} -
                    {{ c.numeroHoras || 0 }}h)
                  </option>
                }
              </select>
            </div>

            <div class="modal-botones mt-3">
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                (click)="cerrarModalVincular()"
              >
                Cancelar
              </button>
              <button
                type="button"
                class="btn btn-primary btn-sm"
                [disabled]="!capacitacionSeleccionadaParaVincular"
                (click)="confirmarVincularExistente()"
                data-testid="btn-confirmar-vincular"
              >
                Vincular
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal Justificar Nuevo Ingreso -->
      @if (obligatoriaParaJustificar()) {
        <div class="modal-backdrop" data-testid="modal-justificar-ingreso">
          <div class="modal-card">
            <h4>Justificar nuevo ingreso</h4>
            <p>
              Indique el motivo por el cual no cuenta con:
              <strong>{{ obligatoriaParaJustificar()!.nombre }}</strong>
            </p>

            <div class="form-group">
              <label for="textoJustificacion">Justificación</label>
              <textarea
                id="textoJustificacion"
                class="form-control"
                rows="3"
                [(ngModel)]="textoJustificacion"
                placeholder="Ej. Ingresé recientemente a la institución posterior a la fecha del curso..."
                data-testid="textarea-justificacion"
              ></textarea>
            </div>

            <div class="modal-botones mt-3">
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                (click)="cerrarModalJustificar()"
              >
                Cancelar
              </button>
              <button
                type="button"
                class="btn btn-primary btn-sm"
                [disabled]="!textoJustificacion.trim()"
                (click)="confirmarJustificar()"
                data-testid="btn-confirmar-justificar"
              >
                Enviar Justificación
              </button>
            </div>
          </div>
        </div>
      }

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
                [min]="fechaInicioStr"
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
            <div class="alert alert-danger mt-2" role="alert" data-testid="error-capacitacion">
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
      .bloque-obligatorias {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: var(--radius-md, 8px);
        padding: 1.25rem;
        margin-bottom: 1.5rem;
      }
      .bloque-obligatorias-header {
        margin-bottom: 1rem;
      }
      .bloque-titulo {
        font-size: 1.05rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 0.25rem 0;
      }
      .bloque-desc {
        font-size: 0.8125rem;
        color: #64748b;
        margin: 0;
      }
      .lista-obligatorias {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .card-obligatoria {
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 0.875rem 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
      }
      .obligatoria-info {
        flex: 1;
        min-width: 250px;
      }
      .obligatoria-titulo-fila {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.25rem;
      }
      .obligatoria-nombre {
        font-size: 0.9375rem;
        color: #1e293b;
      }
      .obligatoria-meta {
        font-size: 0.8125rem;
        color: #64748b;
        margin: 0;
      }
      .obligatoria-justificacion {
        margin: 0.25rem 0 0 0;
      }
      .obligatoria-acciones {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .btn-outline {
        background: transparent;
        border: 1px solid #cbd5e1;
        color: #475569;
      }
      .btn-outline:hover {
        background: #f1f5f9;
      }
      .badge-warning {
        background: #fef3c7;
        color: #92400e;
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
        max-width: 500px;
        width: 100%;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
      }
      .modal-card h4 {
        margin: 0 0 0.5rem 0;
        font-size: 1.125rem;
        color: #0f172a;
      }
      .modal-card p {
        font-size: 0.875rem;
        color: #475569;
        margin: 0 0 1rem 0;
      }
      .modal-botones {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
      }
    `,
  ],
})
export class CapacitacionesComponent implements OnInit, OnDestroy, SeccionConCambios {
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
  readonly obligatorias =
    this.state.capacitacionesObligatorias ?? signal<EstadoCapacitacionObligatoriaPersonaDto[]>([]);

  readonly capacitacionesSinVincular = computed(() =>
    this.capacitaciones().filter((c) => !c.capacitacionObligatoriaId),
  );

  readonly obligatoriaParaVincular = signal<EstadoCapacitacionObligatoriaPersonaDto | null>(null);
  capacitacionSeleccionadaParaVincular = '';

  readonly obligatoriaParaJustificar = signal<EstadoCapacitacionObligatoriaPersonaDto | null>(null);
  textoJustificacion = '';

  subirParaObligatoria(ob: EstadoCapacitacionObligatoriaPersonaDto): void {
    this.abrirFormulario();
    this.modelo.capacitacionObligatoriaId = ob.id;
    this.modelo.nombreEvento = ob.nombre;
    this.modelo.institucionOrganizadora = ob.institucionOrganizadora || '';
    if (ob.horasEsperadas) {
      this.modelo.numeroHoras = ob.horasEsperadas;
    }
  }

  abrirModalVincular(ob: EstadoCapacitacionObligatoriaPersonaDto): void {
    this.obligatoriaParaVincular.set(ob);
    this.capacitacionSeleccionadaParaVincular = '';
  }

  cerrarModalVincular(): void {
    this.obligatoriaParaVincular.set(null);
    this.capacitacionSeleccionadaParaVincular = '';
  }

  confirmarVincularExistente(): void {
    const ob = this.obligatoriaParaVincular();
    if (!ob || !this.capacitacionSeleccionadaParaVincular) return;

    this.state
      .vincularCapacitacionObligatoria(ob.id, this.capacitacionSeleccionadaParaVincular)
      .subscribe({
        next: () => this.cerrarModalVincular(),
        error: (err) =>
          this.errorFormulario.set(mensajeError(err, 'Error al vincular la capacitación.')),
      });
  }

  abrirModalJustificar(ob: EstadoCapacitacionObligatoriaPersonaDto): void {
    this.obligatoriaParaJustificar.set(ob);
    this.textoJustificacion = '';
  }

  cerrarModalJustificar(): void {
    this.obligatoriaParaJustificar.set(null);
    this.textoJustificacion = '';
  }

  confirmarJustificar(): void {
    const ob = this.obligatoriaParaJustificar();
    if (!ob || !this.textoJustificacion.trim()) return;

    this.state.justificarNuevoIngreso(ob.id, this.textoJustificacion.trim()).subscribe({
      next: () => this.cerrarModalJustificar(),
      error: (err) => this.errorFormulario.set(mensajeError(err, 'Error al justificar.')),
    });
  }

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

  tieneCambios(): boolean {
    if (!this.puedeEditar()) return false;
    if (this.mostrarFormulario()) {
      return !!(
        this.idEdicion() ||
        this.modelo.nombreEvento?.trim() ||
        this.modelo.institucionOrganizadora?.trim() ||
        this.modelo.tipoCapacitacionId ||
        this.modelo.archivoId ||
        this.fechaInicioStr ||
        this.fechaFinStr ||
        this.modelo.lugar?.trim()
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
    this.catalogos.tiposCapacitacion().subscribe((t) => this.tiposCapacitacion.set(t));
    this.state.registrarSeccion?.(this);
  }

  ngOnDestroy(): void {
    this.state.desregistrarSeccion?.(this);
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
      capacitacionObligatoriaId: undefined,
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
      capacitacionObligatoriaId: c.capacitacionObligatoriaId,
    };
    this.fechaInicioStr = c.fechaInicio ? new Date(c.fechaInicio).toISOString().split('T')[0] : '';
    this.fechaFinStr = c.fechaFin ? new Date(c.fechaFin).toISOString().split('T')[0] : '';
    this.mostrarFormulario.set(true);
  }

  cancelarFormulario(): void {
    this.mostrarFormulario.set(false);
    this.idEdicion.set(undefined);
  }

  guardarObservable(): Observable<boolean> {
    if (!this.modelo.nombreEvento?.trim()) {
      this.errorFormulario.set('El nombre del evento o curso es obligatorio.');
      return of(false);
    }
    if (!this.modelo.institucionOrganizadora?.trim()) {
      this.errorFormulario.set('La institución organizadora es obligatoria.');
      return of(false);
    }
    if (
      this.modelo.fechaInicio &&
      this.modelo.fechaFin &&
      this.modelo.fechaFin < this.modelo.fechaInicio
    ) {
      this.errorFormulario.set('La fecha de fin no puede ser anterior a la fecha de inicio.');
      return of(false);
    }

    if (this.validacion.invalido(this.modelo, 'capacitacion')) return of(false);
    return this.state.guardarCapacitacion(this.modelo, this.idEdicion()).pipe(
      map(() => {
        this.cancelarFormulario();
        this.state.actualizarEstadoCambios?.();
        return true;
      }),
      catchError((err) => {
        this.validacion.registrarError(err, this.modelo);
        this.errorFormulario.set(mensajeError(err, 'Error al guardar la capacitación.'));
        return of(false);
      }),
    );
  }

  guardar(): void {
    this.guardarObservable().subscribe();
  }

  eliminar(id: string): void {
    if (!confirm('¿Está seguro de eliminar esta capacitación?')) return;
    this.state.eliminarCapacitacion(id).subscribe();
  }

  obtenerMarca(tipoDestino: string, claveDestino: string) {
    return this.state.obtenerMarcaParaItem(tipoDestino, claveDestino);
  }
}
