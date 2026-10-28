import { CommonModule } from '@angular/common';
import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AvisoInstitucionalDto,
  InstitucionDto,
  InstitucionesClient,
  PublicarAvisoInstitucionalRequest,
  SuperadminProteccionDatosClient,
} from '../../api-client';
import { mensajeError } from '../../core/auth/mensaje-error';

@Component({
  selector: 'app-politicas-proteccion-datos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="politicas-container" data-testid="modulo-politicas-proteccion-datos">
      <!-- Selector de Institución -->
      <div class="card selector-card">
        <h2 class="card-title">Gestión de Políticas de Protección de Datos</h2>
        <p class="card-description">
          Consulte y publique las políticas y avisos legales de protección de datos personales por
          institución. Las cuentas institucionales (Usuario, Supervisor, Admin) requieren un aviso
          vigente para acceder a la plataforma.
        </p>

        <div class="form-row align-items-end">
          <div class="form-group col-institucion">
            <label for="selectInstitucion"><strong>Seleccionar Institución:</strong></label>
            <select
              id="selectInstitucion"
              class="form-control"
              [ngModel]="institucionSeleccionadaId()"
              (ngModelChange)="seleccionarInstitucion($event)"
              data-testid="select-institucion"
            >
              <option value="" disabled>-- Seleccione una institución --</option>
              @for (inst of instituciones(); track inst.id) {
                <option [value]="inst.id">{{ inst.nombre }} ({{ inst.id }})</option>
              }
            </select>
          </div>
          <div class="form-group col-filtro">
            <label for="inputFiltro">Buscar en listado:</label>
            <input
              id="inputFiltro"
              type="text"
              class="form-control"
              placeholder="Filtrar nombre de institución..."
              [ngModel]="filtroTexto()"
              (ngModelChange)="filtroTexto.set($event)"
              data-testid="input-filtro-institucion"
            />
          </div>
        </div>
      </div>

      <!-- Alertas globales de acción -->
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

      @if (institucionActual(); as inst) {
        <!-- Estado Actual de la Institución -->
        <div class="card estado-card" data-testid="card-estado-aviso">
          <div class="estado-header">
            <div>
              <span class="badge-institucion">{{ inst.nombre }}</span>
              <h3 class="estado-title">Estado de Protección de Datos</h3>
            </div>
            <div>
              @if (avisoVigente()) {
                <span class="badge badge-success" data-testid="badge-estado-vigente">Vigente</span>
              } @else {
                <span class="badge badge-warning" data-testid="badge-estado-pendiente">
                  Pendiente de Publicación
                </span>
              }
            </div>
          </div>

          @if (cargandoAvisos()) {
            <p class="text-muted">Cargando información de avisos...</p>
          } @else if (avisoVigente(); as vigente) {
            <div class="vigente-info" data-testid="seccion-aviso-vigente">
              <div class="info-grid">
                <div>
                  <span class="info-label">Versión Vigente:</span>
                  <strong class="info-value" data-testid="vigente-version">{{
                    vigente.version
                  }}</strong>
                </div>
                <div>
                  <span class="info-label">Título:</span>
                  <span class="info-value">{{ vigente.titulo }}</span>
                </div>
                <div>
                  <span class="info-label">Responsable:</span>
                  <span class="info-value">{{ vigente.responsable }}</span>
                </div>
                <div>
                  <span class="info-label">Vigente Desde (UTC):</span>
                  <span class="info-value">{{
                    vigente.vigenteDesdeUtc | date: 'dd/MM/yyyy HH:mm' : 'UTC'
                  }}</span>
                </div>
                <div>
                  <span class="info-label">Vigente Hasta (UTC):</span>
                  <span class="info-value">
                    {{
                      vigente.vigenteHastaUtc
                        ? (vigente.vigenteHastaUtc | date: 'dd/MM/yyyy HH:mm' : 'UTC')
                        : 'Indefinida'
                    }}
                  </span>
                </div>
                <div>
                  <span class="info-label">Roles Alcanzados:</span>
                  <div class="roles-badges" data-testid="vigente-roles">
                    @for (rol of obtenerNombresRoles(vigente.rolesDestinatarios); track rol) {
                      <span class="badge badge-role">{{ rol }}</span>
                    }
                  </div>
                </div>
              </div>
              <div class="mt-2">
                <span class="info-label">Evidencia de Autorización:</span>
                <span class="info-value">{{ vigente.evidenciaAprobacion }}</span>
              </div>
              <div class="mt-2">
                <span class="info-label">Fuente Oficial:</span>
                <a
                  [href]="vigente.fuenteOficial"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="link-externo"
                >
                  {{ vigente.fuenteOficial }} ↗
                </a>
              </div>
            </div>
          } @else {
            <div class="alert alert-warning mb-0" data-testid="alerta-sin-aviso">
              ⚠️ Esta institución <strong>no tiene un aviso de protección de datos vigente</strong>.
              Los usuarios con roles Usuario, Supervisor y Admin quedarán bloqueados al intentar
              iniciar sesión hasta que se publique una política legal válida.
            </div>
          }
        </div>

        <div class="grid-dos-columnas mt-3">
          <!-- Formulario Publicar Nueva Versión -->
          <div class="card form-card">
            <h3 class="card-title">Publicar Nueva Versión del Aviso Legal</h3>
            <p class="card-description">
              El aviso legal debe estar aprobado por la autoridad institucional competente. Al
              publicar una nueva versión para los mismos roles, se cerrará la vigencia de la versión
              previa.
            </p>

            <form (ngSubmit)="publicarAviso()" data-testid="form-publicar-aviso">
              <div class="form-row">
                <div class="form-group col">
                  <label for="inputVersion">Versión (ej. 1.0.0, 2.0.0): *</label>
                  <input
                    id="inputVersion"
                    type="text"
                    class="form-control"
                    [(ngModel)]="formVersion"
                    name="version"
                    required
                    placeholder="1.0.0"
                    data-testid="input-version"
                  />
                </div>
                <div class="form-group col">
                  <label for="inputTitulo">Título del Aviso: *</label>
                  <input
                    id="inputTitulo"
                    type="text"
                    class="form-control"
                    [(ngModel)]="formTitulo"
                    name="titulo"
                    required
                    placeholder="Aviso de Protección de Datos Personales"
                    data-testid="input-titulo"
                  />
                </div>
              </div>

              <div class="form-group">
                <label for="inputResponsable">Responsable del Tratamiento: *</label>
                <input
                  id="inputResponsable"
                  type="text"
                  class="form-control"
                  [(ngModel)]="formResponsable"
                  name="responsable"
                  required
                  placeholder="Oficial de Protección de Datos / Rectorado"
                  data-testid="input-responsable"
                />
              </div>

              <div class="form-row">
                <div class="form-group col">
                  <label for="inputFuente">Enlace a Fuente Oficial (HTTPS): *</label>
                  <input
                    id="inputFuente"
                    type="url"
                    class="form-control"
                    [(ngModel)]="formFuenteOficial"
                    name="fuenteOficial"
                    required
                    placeholder="https://institucion.edu.ec/politica-datos"
                    data-testid="input-fuente-oficial"
                  />
                </div>
                <div class="form-group col">
                  <label for="inputEvidencia">Referencia / Evidencia de Aprobación: *</label>
                  <input
                    id="inputEvidencia"
                    type="text"
                    class="form-control"
                    [(ngModel)]="formEvidenciaAprobacion"
                    name="evidenciaAprobacion"
                    required
                    placeholder="Resolución Rectoral Nro. 2026-001"
                    data-testid="input-evidencia-aprobacion"
                  />
                </div>
              </div>

              <div class="form-group">
                <label for="inputContenido">Contenido Íntegro del Texto Legal: *</label>
                <textarea
                  id="inputContenido"
                  class="form-control texto-multilinea"
                  rows="5"
                  [(ngModel)]="formContenido"
                  name="contenido"
                  required
                  placeholder="Ingrese el texto íntegro de la política o aviso legal..."
                  data-testid="input-contenido"
                ></textarea>
              </div>

              <div class="form-group">
                <label for="inputDeclaracion">Declaración Explícita de Aceptación: *</label>
                <textarea
                  id="inputDeclaracion"
                  class="form-control"
                  rows="2"
                  [(ngModel)]="formDeclaracionAceptacion"
                  name="declaracionAceptacion"
                  required
                  placeholder="Declaro haber leído y acepto libre y voluntariamente los términos expuestos..."
                  data-testid="input-declaracion-aceptacion"
                ></textarea>
              </div>

              <div class="form-group">
                <div class="label-heading"><strong>Roles Destinatarios: *</strong></div>
                <div class="roles-checkboxes">
                  <label class="checkbox-inline">
                    <input
                      type="checkbox"
                      [(ngModel)]="formRolUsuario"
                      name="rolUsuario"
                      data-testid="chk-rol-usuario"
                    />
                    Usuario
                  </label>
                  <label class="checkbox-inline">
                    <input
                      type="checkbox"
                      [(ngModel)]="formRolSupervisor"
                      name="rolSupervisor"
                      data-testid="chk-rol-supervisor"
                    />
                    Supervisor
                  </label>
                  <label class="checkbox-inline">
                    <input
                      type="checkbox"
                      [(ngModel)]="formRolAdmin"
                      name="rolAdmin"
                      data-testid="chk-rol-admin"
                    />
                    Admin
                  </label>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group col">
                  <label for="inputVigenteDesde">Vigente Desde (UTC): *</label>
                  <input
                    id="inputVigenteDesde"
                    type="datetime-local"
                    class="form-control"
                    [(ngModel)]="formVigenteDesde"
                    name="vigenteDesde"
                    required
                    data-testid="input-vigente-desde"
                  />
                </div>
                <div class="form-group col">
                  <label for="inputVigenteHasta">Vigente Hasta (UTC, opcional):</label>
                  <input
                    id="inputVigenteHasta"
                    type="datetime-local"
                    class="form-control"
                    [(ngModel)]="formVigenteHasta"
                    name="vigenteHasta"
                    data-testid="input-vigente-hasta"
                  />
                </div>
              </div>

              <div class="form-group form-check confirmation-box">
                <label class="form-check-label">
                  <input
                    type="checkbox"
                    class="form-check-input"
                    [(ngModel)]="formAprobacionConfirmada"
                    name="aprobacionConfirmada"
                    required
                    data-testid="chk-confirmacion-aprobacion"
                  />
                  <strong>Confirmación explícita de aprobación institucional:</strong> Certifico
                  conforme a ADR-0030 que este aviso cuenta con la debida aprobación rectoral u
                  órgano competente de la institución.
                </label>
              </div>

              <button
                type="submit"
                class="btn btn-primary"
                [disabled]="guardando() || !formularioValido()"
                data-testid="btn-publicar-aviso"
              >
                {{ guardando() ? 'Publicando...' : 'Publicar Aviso de Protección de Datos' }}
              </button>
            </form>
          </div>

          <!-- Historial de Avisos -->
          <div class="card historial-card">
            <h3 class="card-title">Historial de Avisos de la Institución</h3>
            <p class="card-description">
              Registro histórico y auditoría de todas las versiones publicadas.
            </p>

            <div class="table-container">
              <table class="data-table" data-testid="tabla-historial-avisos">
                <thead>
                  <tr>
                    <th>Versión</th>
                    <th>Título</th>
                    <th>Vigencia</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (av of avisos(); track av.id) {
                    <tr [attr.data-testid]="'fila-aviso-' + av.version">
                      <td>
                        <strong>{{ av.version }}</strong>
                      </td>
                      <td>
                        <span class="truncate-text" [title]="av.titulo">{{ av.titulo }}</span>
                      </td>
                      <td>
                        <small>
                          {{ av.vigenteDesdeUtc | date: 'dd/MM/yyyy' : 'UTC' }} -
                          {{
                            av.vigenteHastaUtc
                              ? (av.vigenteHastaUtc | date: 'dd/MM/yyyy' : 'UTC')
                              : 'Indef.'
                          }}
                        </small>
                      </td>
                      <td>
                        @if (av.esVigente) {
                          <span class="badge badge-success">Vigente</span>
                        } @else {
                          <span class="badge badge-secondary">Histórico</span>
                        }
                      </td>
                      <td>
                        <button
                          type="button"
                          class="btn btn-sm btn-secondary"
                          (click)="verDetalleAviso(av)"
                          data-testid="btn-ver-detalle-aviso"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5" class="text-center empty-state">
                        No hay avisos registrados para esta institución.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Modal / Visualizador de Contenido del Aviso -->
            @if (avisoSeleccionado(); as sel) {
              <div class="detalle-aviso-box mt-3" data-testid="detalle-aviso-modal">
                <div class="detalle-header">
                  <h4>Detalle Versión {{ sel.version }}: {{ sel.titulo }}</h4>
                  <button
                    type="button"
                    class="btn-close"
                    (click)="avisoSeleccionado.set(null)"
                    aria-label="Cerrar detalle"
                  >
                    ✕
                  </button>
                </div>
                <p><strong>Responsable:</strong> {{ sel.responsable }}</p>
                <p><strong>Evidencia:</strong> {{ sel.evidenciaAprobacion }}</p>
                <p>
                  <strong>Fuente Oficial:</strong>
                  <a [href]="sel.fuenteOficial" target="_blank" rel="noopener noreferrer">
                    {{ sel.fuenteOficial }} ↗
                  </a>
                </p>
                <div>
                  <strong>Texto Legal:</strong>
                  <div class="texto-preview">{{ sel.contenido }}</div>
                </div>
                <div class="mt-2">
                  <strong>Declaración de Aceptación:</strong>
                  <blockquote class="declaracion-preview">
                    {{ sel.declaracionAceptacion }}
                  </blockquote>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .politicas-container {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      padding: 1.25rem;
    }
    .card-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.25rem 0;
    }
    .card-description {
      font-size: 0.875rem;
      color: #64748b;
      margin: 0 0 1rem 0;
    }
    .selector-card {
      background: #f8fafc;
    }
    .form-row {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .col-institucion {
      flex: 2;
      min-width: 250px;
    }
    .col-filtro {
      flex: 1;
      min-width: 200px;
    }
    .col {
      flex: 1;
      min-width: 200px;
    }
    .form-group {
      margin-bottom: 0.875rem;
    }
    .form-group label,
    .label-heading {
      display: block;
      font-size: 0.875rem;
      font-weight: 600;
      color: #334155;
      margin-bottom: 0.35rem;
    }
    .form-control {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      box-sizing: border-box;
      background: #ffffff;
    }
    .form-control:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
    }
    .texto-multilinea {
      font-family: inherit;
      white-space: pre-wrap;
    }
    .roles-checkboxes {
      display: flex;
      gap: 1.5rem;
      margin-top: 0.25rem;
    }
    .checkbox-inline {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.875rem;
      color: #334155;
      cursor: pointer;
    }
    .confirmation-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 0.375rem;
      padding: 0.75rem;
      margin-top: 0.5rem;
      margin-bottom: 1rem;
    }
    .form-check-label {
      font-size: 0.85rem;
      color: #1e3a8a;
      cursor: pointer;
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
    }
    .form-check-input {
      margin-top: 0.2rem;
      cursor: pointer;
    }
    .btn {
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.2s ease;
    }
    .btn-primary {
      background-color: #2563eb;
      color: #ffffff;
    }
    .btn-primary:hover:not(:disabled) {
      background-color: #1d4ed8;
    }
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-secondary {
      background-color: #f1f5f9;
      color: #334155;
      border-color: #cbd5e1;
    }
    .btn-secondary:hover {
      background-color: #e2e8f0;
    }
    .btn-sm {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
    }
    .btn-close {
      background: none;
      border: none;
      font-size: 1.1rem;
      cursor: pointer;
      color: #64748b;
    }
    .btn-close:hover {
      color: #0f172a;
    }
    .grid-dos-columnas {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
    }
    @media (max-width: 900px) {
      .grid-dos-columnas {
        grid-template-columns: 1fr;
      }
    }
    .estado-card {
      border-left: 4px solid #2563eb;
    }
    .estado-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
    }
    .badge-institucion {
      font-size: 0.8rem;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #2563eb;
    }
    .estado-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0.2rem 0 0 0;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.75rem;
      background: #f8fafc;
      padding: 0.75rem;
      border-radius: 0.375rem;
      border: 1px solid #e2e8f0;
    }
    .info-label {
      display: block;
      font-size: 0.75rem;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 600;
    }
    .info-value {
      font-size: 0.875rem;
      color: #0f172a;
    }
    .roles-badges {
      display: flex;
      gap: 0.35rem;
      margin-top: 0.2rem;
      flex-wrap: wrap;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge-success {
      background-color: #dcfce7;
      color: #166534;
    }
    .badge-warning {
      background-color: #fef9c3;
      color: #854d0e;
    }
    .badge-secondary {
      background-color: #f1f5f9;
      color: #475569;
    }
    .badge-role {
      background-color: #e0e7ff;
      color: #3730a3;
      font-size: 0.7rem;
    }
    .alert {
      padding: 0.75rem 1rem;
      border-radius: 0.375rem;
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
    .alert-warning {
      background-color: #fffbeb;
      border: 1px solid #fde68a;
      color: #92400e;
    }
    .table-container {
      overflow-x: auto;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }
    .data-table th,
    .data-table td {
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
    }
    .data-table th {
      background-color: #f8fafc;
      color: #475569;
      font-weight: 600;
    }
    .truncate-text {
      display: inline-block;
      max-width: 140px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      vertical-align: bottom;
    }
    .empty-state {
      color: #94a3b8;
      font-style: italic;
      padding: 1.5rem !important;
    }
    .detalle-aviso-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 0.375rem;
      padding: 0.75rem;
      font-size: 0.85rem;
    }
    .detalle-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 0.25rem;
    }
    .detalle-header h4 {
      margin: 0;
      font-size: 0.95rem;
      color: #0f172a;
    }
    .texto-preview {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.25rem;
      padding: 0.5rem;
      max-height: 120px;
      overflow-y: auto;
      white-space: pre-wrap;
      font-size: 0.8rem;
      margin-top: 0.25rem;
    }
    .declaracion-preview {
      margin: 0.25rem 0 0 0;
      padding: 0.4rem 0.6rem;
      background: #eff6ff;
      border-left: 3px solid #2563eb;
      font-style: italic;
      font-size: 0.8rem;
    }
    .link-externo {
      color: #2563eb;
      text-decoration: underline;
    }
    .mt-2 {
      margin-top: 0.5rem;
    }
    .mt-3 {
      margin-top: 0.75rem;
    }
    .mb-0 {
      margin-bottom: 0;
    }
  `,
})
export class PoliticasProteccionDatosComponent implements OnInit {
  private readonly institucionesClient = inject(InstitucionesClient);
  private readonly superadminProteccionDatosClient = inject(SuperadminProteccionDatosClient);

  @Input()
  set institucionInicialId(id: string | undefined) {
    if (id) {
      this.institucionSeleccionadaId.set(id);
      this.cargarAvisos(id);
    }
  }

  readonly instituciones = signal<InstitucionDto[]>([]);
  readonly institucionSeleccionadaId = signal<string>('');
  readonly filtroTexto = signal<string>('');
  readonly avisos = signal<AvisoInstitucionalDto[]>([]);
  readonly avisoSeleccionado = signal<AvisoInstitucionalDto | null>(null);

  readonly cargandoAvisos = signal<boolean>(false);
  readonly guardando = signal<boolean>(false);
  readonly mensajeExito = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  // Campos de formulario
  formVersion = '';
  formTitulo = 'Aviso de Protección de Datos Personales';
  formResponsable = '';
  formFuenteOficial = '';
  formEvidenciaAprobacion = '';
  formContenido = '';
  formDeclaracionAceptacion = '';
  formRolUsuario = true;
  formRolSupervisor = true;
  formRolAdmin = true;
  formVigenteDesde = '';
  formVigenteHasta = '';
  formAprobacionConfirmada = false;

  readonly institucionActual = computed(() => {
    const id = this.institucionSeleccionadaId();
    return this.instituciones().find((i) => i.id === id) ?? null;
  });

  readonly avisoVigente = computed(() => {
    return this.avisos().find((a) => a.esVigente) ?? null;
  });

  ngOnInit(): void {
    this.iniciarFechaVigencia();
    this.cargarInstituciones();
  }

  private iniciarFechaVigencia(): void {
    const ahora = new Date();
    // Formato local YYYY-MM-DDTHH:mm para input datetime-local
    const pad = (n: number) => n.toString().padStart(2, '0');
    this.formVigenteDesde = `${ahora.getUTCFullYear()}-${pad(ahora.getUTCMonth() + 1)}-${pad(ahora.getUTCDate())}T${pad(ahora.getUTCHours())}:${pad(ahora.getUTCMinutes())}`;
  }

  cargarInstituciones(): void {
    this.institucionesClient.listarInstituciones().subscribe({
      next: (lista) => {
        this.instituciones.set(lista);
        if (!this.institucionSeleccionadaId() && lista.length > 0) {
          const primera = lista[0].id;
          this.institucionSeleccionadaId.set(primera);
          this.cargarAvisos(primera);
        }
      },
      error: (err) =>
        this.error.set(mensajeError(err, 'Error al cargar listado de instituciones.')),
    });
  }

  seleccionarInstitucion(id: string): void {
    this.institucionSeleccionadaId.set(id);
    this.mensajeExito.set(null);
    this.error.set(null);
    this.avisoSeleccionado.set(null);
    if (id) {
      this.cargarAvisos(id);
    } else {
      this.avisos.set([]);
    }
  }

  cargarAvisos(institucionId: string): void {
    this.cargandoAvisos.set(true);
    this.superadminProteccionDatosClient
      .listarAvisosProteccionDatosInstitucion(institucionId)
      .subscribe({
        next: (lista) => {
          this.avisos.set(lista);
          this.cargandoAvisos.set(false);
        },
        error: (err) => {
          this.error.set(
            mensajeError(err, 'Error al obtener las políticas de la institución seleccionada.'),
          );
          this.cargandoAvisos.set(false);
        },
      });
  }

  verDetalleAviso(aviso: AvisoInstitucionalDto): void {
    this.avisoSeleccionado.set(aviso);
  }

  obtenerNombresRoles(rolesDestinatarios: number[]): string[] {
    const mapa: Record<number, string> = {
      1: 'Usuario',
      2: 'Supervisor',
      3: 'Admin',
      4: 'Superadmin',
    };
    return (rolesDestinatarios || []).map((r) => mapa[r] || `Rol ${r}`);
  }

  formularioValido(): boolean {
    const rolesSeleccionados = this.formRolUsuario || this.formRolSupervisor || this.formRolAdmin;
    return (
      !!this.institucionSeleccionadaId() &&
      !!this.formVersion.trim() &&
      !!this.formTitulo.trim() &&
      !!this.formResponsable.trim() &&
      !!this.formFuenteOficial.trim() &&
      !!this.formEvidenciaAprobacion.trim() &&
      !!this.formContenido.trim() &&
      !!this.formDeclaracionAceptacion.trim() &&
      !!this.formVigenteDesde &&
      rolesSeleccionados &&
      this.formAprobacionConfirmada
    );
  }

  publicarAviso(): void {
    if (!this.formularioValido()) return;

    const institucionId = this.institucionSeleccionadaId();
    if (!institucionId) return;

    this.guardando.set(true);
    this.error.set(null);
    this.mensajeExito.set(null);

    const roles: number[] = [];
    if (this.formRolUsuario) roles.push(1);
    if (this.formRolSupervisor) roles.push(2);
    if (this.formRolAdmin) roles.push(3);

    const request: PublicarAvisoInstitucionalRequest = {
      version: this.formVersion.trim(),
      titulo: this.formTitulo.trim(),
      responsable: this.formResponsable.trim(),
      fuenteOficial: this.formFuenteOficial.trim(),
      evidenciaAprobacion: this.formEvidenciaAprobacion.trim(),
      contenido: this.formContenido.trim(),
      declaracionAceptacion: this.formDeclaracionAceptacion.trim(),
      rolesDestinatarios: roles,
      vigenteDesdeUtc: new Date(this.formVigenteDesde),
      vigenteHastaUtc: this.formVigenteHasta ? new Date(this.formVigenteHasta) : undefined,
      aprobacionInstitucionalConfirmada: this.formAprobacionConfirmada,
    };

    this.superadminProteccionDatosClient
      .publicarAvisoProteccionDatosInstitucion(institucionId, request)
      .subscribe({
        next: (publicado) => {
          this.mensajeExito.set(
            `Aviso versión "${publicado.version}" publicado exitosamente para la institución.`,
          );
          this.formVersion = '';
          this.formContenido = '';
          this.formDeclaracionAceptacion = '';
          this.formEvidenciaAprobacion = '';
          this.formAprobacionConfirmada = false;
          this.guardando.set(false);
          this.cargarAvisos(institucionId);
        },
        error: (err) => {
          this.error.set(mensajeError(err, 'Error al publicar la versión del aviso.'));
          this.guardando.set(false);
        },
      });
  }
}
