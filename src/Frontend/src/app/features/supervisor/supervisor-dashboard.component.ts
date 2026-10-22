import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ArchivosClient,
  ArchivoDto,
  DevolverActualizacionRequest,
  ExpedienteRevisionDto,
  MarcaObservacionItem,
  ResumenRevisionPendienteDto,
  RevisionClient,
} from '../../api-client';
import { AuthService } from '../../core/auth';

@Component({
  selector: 'app-supervisor-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="dashboard-section" data-testid="supervisor-panel">
      <header class="section-header">
        <div class="header-titles">
          <h1 class="section-title">Bandeja de Revisión y Validación</h1>
          <p class="section-subtitle">
            Revisión de carpetas, verificación de documentos y aprobación institucional.
          </p>
        </div>
        <button
          type="button"
          class="btn btn-secondary"
          (click)="cargarPendientes()"
          [disabled]="cargando()"
          data-testid="btn-refrescar"
        >
          {{ cargando() ? 'Actualizando...' : 'Refrescar Bandeja' }}
        </button>
      </header>

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

      <!-- Vista principal: Lista de solicitudes pendientes -->
      @if (!expedienteSeleccionado()) {
        <div class="table-container">
          <table class="data-table" data-testid="tabla-pendientes">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Estado</th>
                <th>Fecha Envío</th>
                <th class="text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              @for (item of pendientes(); track item.id) {
                <tr [attr.data-testid]="'fila-pendiente-' + item.documento">
                  <td>
                    <strong>{{ item.documento }}</strong>
                  </td>
                  <td>{{ item.nombre || '—' }}</td>
                  <td>{{ item.correo || '—' }}</td>
                  <td>
                    <span class="badge badge-warning">{{ item.estadoActualizacion }}</span>
                  </td>
                  <td>{{ item.fechaCreacionUtc | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td class="text-right">
                    <button
                      type="button"
                      class="btn btn-primary btn-sm"
                      (click)="verExpediente(item.documento)"
                      [disabled]="cargandoExpediente()"
                      [attr.data-testid]="'btn-revisar-' + item.documento"
                    >
                      Revisar Expediente
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="text-center empty-state">
                    No hay solicitudes pendientes de revisión en este momento.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <!-- Vista detallada del Expediente seleccionado -->
        <article class="expediente-panel" data-testid="panel-expediente">
          <div class="expediente-header">
            <div>
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                (click)="cerrarExpediente()"
                data-testid="btn-volver"
              >
                ← Volver a la bandeja
              </button>
              <h2 class="expediente-title">
                Expediente: {{ expedienteSeleccionado()?.nombre || 'Usuario' }} ({{
                  expedienteSeleccionado()?.documento
                }})
              </h2>
            </div>
            <div class="expediente-actions">
              <button
                type="button"
                class="btn btn-danger"
                (click)="abrirModalDevolver()"
                [disabled]="procesando()"
                data-testid="btn-abrir-devolver"
              >
                Devolver con Observaciones
              </button>
              <button
                type="button"
                class="btn btn-success"
                (click)="aprobar()"
                [disabled]="procesando()"
                data-testid="btn-aprobar"
              >
                {{ procesando() ? 'Aprobando...' : 'Aprobar Actualización' }}
              </button>
            </div>
          </div>

          <div class="expediente-grid">
            <!-- Datos Personales -->
            <section class="card">
              <h3 class="card-title">Datos Personales y Tratamiento</h3>
              <div class="info-group">
                <span class="info-label">Documento:</span>
                <span class="info-value" data-testid="expediente-doc">{{
                  expedienteSeleccionado()?.documento
                }}</span>
              </div>
              <div class="info-group">
                <span class="info-label">Nombre Completo:</span>
                <span class="info-value">{{ expedienteSeleccionado()?.nombre || '—' }}</span>
              </div>
              <div class="info-group">
                <span class="info-label">Correo:</span>
                <span class="info-value">{{ expedienteSeleccionado()?.correo || '—' }}</span>
              </div>
              <div class="info-group">
                <span class="info-label">Tratamiento de Datos:</span>
                <span class="info-value">
                  @if (expedienteSeleccionado()?.tratamientoDatosAceptado) {
                    <span class="badge badge-success">Aceptado</span>
                    <small class="text-muted">
                      ({{
                        expedienteSeleccionado()?.fechaAceptacionTratamientoDatosUtc
                          | date: 'dd/MM/yyyy HH:mm'
                      }})</small
                    >
                  } @else {
                    <span class="badge badge-danger">No Aceptado</span>
                  }
                </span>
              </div>

              <h4 class="card-subtitle">Datos del Formulario</h4>
              <div class="json-datos" data-testid="datos-formulario">
                @if (datosPersonalesParsed(); as datos) {
                  <div class="datos-grid">
                    @for (clave of obtenerClaves(datos); track clave) {
                      <div class="dato-item">
                        <span class="dato-clave">{{ clave }}:</span>
                        <span class="dato-valor">{{ datos[clave] }}</span>
                      </div>
                    }
                  </div>
                } @else {
                  <p class="text-muted">Sin datos adicionales registrados.</p>
                }
              </div>
            </section>

            <!-- Documentos y Archivos Adjuntos -->
            <section class="card">
              <h3 class="card-title">Documentos Adjuntos</h3>
              <div class="archivos-lista" data-testid="lista-archivos-expediente">
                @for (archivo of archivosExpediente(); track archivo.id) {
                  <div class="archivo-item" [attr.data-testid]="'archivo-' + archivo.id">
                    <div class="archivo-info">
                      <strong>{{ archivo.nombreOriginal }}</strong>
                      <span class="archivo-meta">
                        {{ archivo.claveDestino || 'Documento' }} •
                        {{ (archivo.tamanoBytes / 1024).toFixed(1) }} KB •
                        {{ archivo.tipoContenido }}
                      </span>
                    </div>
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      (click)="descargarArchivo(archivo.id, archivo.nombreOriginal)"
                      [attr.data-testid]="'btn-descargar-' + archivo.id"
                    >
                      Descargar
                    </button>
                  </div>
                } @empty {
                  <p class="text-muted">No se registran documentos adjuntos en este expediente.</p>
                }
              </div>

              <!-- Historial de Observaciones Previas -->
              @if (expedienteSeleccionado()?.observaciones?.length) {
                <h3 class="card-title mt-4">Observaciones Anteriores</h3>
                <div class="observaciones-previas">
                  @for (obs of expedienteSeleccionado()?.observaciones; track obs.id) {
                    <div class="obs-item">
                      <div class="obs-header">
                        <strong>{{ obs.autor }}</strong>
                        <span>{{ obs.fechaUtc | date: 'dd/MM/yyyy HH:mm' }}</span>
                      </div>
                      <p class="obs-texto">{{ obs.texto }}</p>
                      @if (obs.marcas?.length) {
                        <ul class="marcas-previas">
                          @for (m of obs.marcas; track m.id) {
                            <li>
                              <strong>[{{ m.tipoDestino }}] {{ m.claveDestino }}:</strong>
                              {{ m.texto }}
                            </li>
                          }
                        </ul>
                      }
                    </div>
                  }
                </div>
              }
            </section>
          </div>
        </article>
      }

      <!-- Modal de Devolución con Marcas (ADR-0008) -->
      @if (mostrarModalDevolver()) {
        <div class="modal-overlay" data-testid="modal-devolver">
          <div class="modal-dialog">
            <header class="modal-header">
              <h3 class="modal-title">Devolver Expediente con Observaciones</h3>
              <button
                type="button"
                class="btn-close"
                (click)="cerrarModalDevolver()"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </header>

            <div class="modal-body">
              <div class="form-group">
                <label for="obsGeneral">Observación General (Obligatoria):</label>
                <textarea
                  id="obsGeneral"
                  class="form-control"
                  rows="3"
                  [(ngModel)]="observacionGeneral"
                  placeholder="Explique las correcciones requeridas por el usuario..."
                  data-testid="input-observacion-general"
                ></textarea>
              </div>

              <h4 class="modal-subtitle">Marcas Puntuales en Campos o Archivos (ADR-0008)</h4>
              <div class="marca-builder">
                <div class="form-row">
                  <div class="form-group col">
                    <label for="tipoDestino">Tipo:</label>
                    <select
                      id="tipoDestino"
                      class="form-control"
                      [(ngModel)]="nuevaMarcaTipo"
                      data-testid="select-tipo-marca"
                    >
                      <option value="Campo">Campo de Formulario</option>
                      <option value="Archivo">Archivo / Documento</option>
                    </select>
                  </div>
                  <div class="form-group col">
                    <label for="claveDestino">Clave / Campo:</label>
                    <input
                      id="claveDestino"
                      type="text"
                      class="form-control"
                      [(ngModel)]="nuevaMarcaClave"
                      placeholder="Ej: telefono, cedula_frontal..."
                      data-testid="input-clave-marca"
                    />
                  </div>
                </div>
                <div class="form-group">
                  <label for="textoMarca">Motivo o Corrección Puntual:</label>
                  <input
                    id="textoMarca"
                    type="text"
                    class="form-control"
                    [(ngModel)]="nuevaMarcaTexto"
                    placeholder="Ej: Documento borroso o número incompleto"
                    data-testid="input-texto-marca"
                  />
                </div>
                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  (click)="agregarMarca()"
                  data-testid="btn-agregar-marca"
                >
                  + Agregar Marca Específica
                </button>
              </div>

              @if (marcas().length > 0) {
                <div class="marcas-lista" data-testid="lista-marcas-creadas">
                  <h5>Marcas a Enviar ({{ marcas().length }}):</h5>
                  <ul>
                    @for (m of marcas(); track $index) {
                      <li>
                        <span>
                          <strong>[{{ m.tipoDestino }}] {{ m.claveDestino }}:</strong>
                          {{ m.texto }}
                        </span>
                        <button
                          type="button"
                          class="btn-link-danger"
                          (click)="eliminarMarca($index)"
                        >
                          Eliminar
                        </button>
                      </li>
                    }
                  </ul>
                </div>
              }
            </div>

            <footer class="modal-footer">
              <button
                type="button"
                class="btn btn-secondary"
                (click)="cerrarModalDevolver()"
                [disabled]="procesando()"
              >
                Cancelar
              </button>
              <button
                type="button"
                class="btn btn-danger"
                (click)="confirmarDevolucion()"
                [disabled]="procesando() || !observacionGeneral().trim()"
                data-testid="btn-confirmar-devolver"
              >
                {{ procesando() ? 'Devolviendo...' : 'Confirmar y Devolver' }}
              </button>
            </footer>
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    .dashboard-section {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      padding: 1.5rem;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 1rem;
    }
    .section-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.25rem 0;
    }
    .section-subtitle {
      font-size: 0.875rem;
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
    .table-container {
      overflow-x: auto;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    .data-table th,
    .data-table td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
    }
    .data-table th {
      background: #f8fafc;
      color: #475569;
      font-weight: 600;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .empty-state {
      padding: 2rem;
      color: #64748b;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge-warning {
      background: #fef3c7;
      color: #92400e;
    }
    .badge-success {
      background: #dcfce7;
      color: #166534;
    }
    .badge-danger {
      background: #fee2e2;
      color: #991b1b;
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
      transition: background-color 0.2s;
    }
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-sm {
      padding: 0.25rem 0.625rem;
      font-size: 0.75rem;
    }
    .btn-primary {
      background: #2563eb;
      color: #ffffff;
    }
    .btn-primary:hover:not(:disabled) {
      background: #1d4ed8;
    }
    .btn-secondary {
      background: #f1f5f9;
      color: #334155;
      border-color: #cbd5e1;
    }
    .btn-secondary:hover:not(:disabled) {
      background: #e2e8f0;
    }
    .btn-success {
      background: #16a34a;
      color: #ffffff;
    }
    .btn-success:hover:not(:disabled) {
      background: #15803d;
    }
    .btn-danger {
      background: #dc2626;
      color: #ffffff;
    }
    .btn-danger:hover:not(:disabled) {
      background: #b91c1c;
    }
    .expediente-panel {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .expediente-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 1rem;
    }
    .expediente-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0.5rem 0 0 0;
    }
    .expediente-actions {
      display: flex;
      gap: 0.75rem;
    }
    .expediente-grid {
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
    .card-subtitle {
      font-size: 0.875rem;
      font-weight: 600;
      color: #334155;
      margin: 1rem 0 0.5rem 0;
    }
    .info-group {
      display: flex;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }
    .info-label {
      width: 140px;
      font-weight: 600;
      color: #475569;
    }
    .info-value {
      color: #0f172a;
    }
    .datos-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
      font-size: 0.8125rem;
    }
    .dato-item {
      background: #ffffff;
      padding: 0.375rem 0.5rem;
      border-radius: 0.25rem;
      border: 1px solid #e2e8f0;
    }
    .dato-clave {
      font-weight: 600;
      color: #64748b;
      margin-right: 0.25rem;
      text-transform: capitalize;
    }
    .archivos-lista {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .archivo-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.375rem;
      padding: 0.75rem;
    }
    .archivo-info {
      display: flex;
      flex-direction: column;
      font-size: 0.8125rem;
    }
    .archivo-meta {
      color: #64748b;
      font-size: 0.75rem;
      margin-top: 0.25rem;
    }
    .mt-4 {
      margin-top: 1.5rem;
    }
    .observaciones-previas {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .obs-item {
      background: #ffffff;
      border-left: 3px solid #f59e0b;
      border: 1px solid #e2e8f0;
      border-left-width: 4px;
      padding: 0.75rem;
      border-radius: 0.25rem;
    }
    .obs-header {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: #64748b;
      margin-bottom: 0.25rem;
    }
    .obs-texto {
      margin: 0;
      font-size: 0.875rem;
      color: #1e293b;
    }
    .marcas-previas {
      margin: 0.5rem 0 0 1rem;
      padding: 0;
      font-size: 0.8125rem;
      color: #b45309;
    }
    /* Modal */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 50;
    }
    .modal-dialog {
      background: #ffffff;
      border-radius: 0.5rem;
      width: 100%;
      max-width: 580px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #e2e8f0;
    }
    .modal-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .btn-close {
      background: transparent;
      border: none;
      font-size: 1.125rem;
      color: #64748b;
      cursor: pointer;
    }
    .modal-body {
      padding: 1.25rem;
      max-height: 70vh;
      overflow-y: auto;
    }
    .modal-subtitle {
      font-size: 0.875rem;
      font-weight: 600;
      color: #334155;
      margin: 1.25rem 0 0.5rem 0;
    }
    .form-group {
      margin-bottom: 0.75rem;
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
    .marca-builder {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.375rem;
      padding: 0.75rem;
      margin-bottom: 0.75rem;
    }
    .marcas-lista {
      background: #fefce8;
      border: 1px solid #fef08a;
      border-radius: 0.375rem;
      padding: 0.75rem;
      margin-top: 0.75rem;
    }
    .marcas-lista h5 {
      margin: 0 0 0.5rem 0;
      font-size: 0.8125rem;
      color: #854d0e;
    }
    .marcas-lista ul {
      margin: 0;
      padding-left: 1.25rem;
      font-size: 0.8125rem;
    }
    .marcas-lista li {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.25rem;
    }
    .btn-link-danger {
      background: none;
      border: none;
      color: #dc2626;
      font-size: 0.75rem;
      cursor: pointer;
      text-decoration: underline;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 0.75rem 1.25rem;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    @media (max-width: 768px) {
      .expediente-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class SupervisorDashboardComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  private readonly revisionClient = inject(RevisionClient);
  private readonly archivosClient = inject(ArchivosClient);

  readonly pendientes = signal<ResumenRevisionPendienteDto[]>([]);
  readonly cargando = signal<boolean>(false);
  readonly procesando = signal<boolean>(false);
  readonly cargandoExpediente = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly mensajeExito = signal<string | null>(null);

  readonly expedienteSeleccionado = signal<ExpedienteRevisionDto | null>(null);
  readonly archivosExpediente = signal<ArchivoDto[]>([]);
  readonly datosPersonalesParsed = signal<Record<string, unknown> | null>(null);

  readonly mostrarModalDevolver = signal<boolean>(false);
  observacionGeneral = signal<string>('');
  nuevaMarcaTipo = signal<string>('Campo');
  nuevaMarcaClave = signal<string>('');
  nuevaMarcaTexto = signal<string>('');
  readonly marcas = signal<MarcaObservacionItem[]>([]);

  ngOnInit(): void {
    this.cargarPendientes();
  }

  cargarPendientes(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.revisionClient.listarPendientesRevision().subscribe({
      next: (lista) => {
        this.pendientes.set(lista);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(err?.message || 'Error al cargar la lista de solicitudes pendientes.');
        this.cargando.set(false);
      },
    });
  }

  verExpediente(documento: string): void {
    this.cargandoExpediente.set(true);
    this.error.set(null);
    this.mensajeExito.set(null);

    this.revisionClient.obtenerExpedienteParaRevision(documento).subscribe({
      next: (exp) => {
        this.expedienteSeleccionado.set(exp);
        try {
          if (exp.datosPersonalesJson) {
            this.datosPersonalesParsed.set(JSON.parse(exp.datosPersonalesJson));
          } else {
            this.datosPersonalesParsed.set(null);
          }
        } catch {
          this.datosPersonalesParsed.set(null);
        }

        // Cargar los archivos adjuntos del expediente
        this.revisionClient.listarArchivosExpediente(documento).subscribe({
          next: (archivos) => {
            this.archivosExpediente.set(archivos);
            this.cargandoExpediente.set(false);
          },
          error: () => {
            this.archivosExpediente.set([]);
            this.cargandoExpediente.set(false);
          },
        });
      },
      error: (err) => {
        this.error.set(err?.message || 'Error al obtener el expediente para revisión.');
        this.cargandoExpediente.set(false);
      },
    });
  }

  cerrarExpediente(): void {
    this.expedienteSeleccionado.set(null);
    this.archivosExpediente.set([]);
    this.datosPersonalesParsed.set(null);
  }

  aprobar(): void {
    const exp = this.expedienteSeleccionado();
    if (!exp) return;

    this.procesando.set(true);
    this.error.set(null);

    this.revisionClient.aprobarActualizacion(exp.documento).subscribe({
      next: (res) => {
        this.mensajeExito.set(res?.mensaje || 'Actualización aprobada con éxito.');
        this.procesando.set(false);
        this.cerrarExpediente();
        this.cargarPendientes();
      },
      error: (err) => {
        this.error.set(err?.message || 'Error al aprobar la actualización.');
        this.procesando.set(false);
      },
    });
  }

  abrirModalDevolver(): void {
    this.observacionGeneral.set('');
    this.marcas.set([]);
    this.nuevaMarcaClave.set('');
    this.nuevaMarcaTexto.set('');
    this.mostrarModalDevolver.set(true);
  }

  cerrarModalDevolver(): void {
    this.mostrarModalDevolver.set(false);
  }

  agregarMarca(): void {
    const clave = this.nuevaMarcaClave().trim();
    const texto = this.nuevaMarcaTexto().trim();
    if (!clave || !texto) return;

    const item: MarcaObservacionItem = {
      tipoDestino: this.nuevaMarcaTipo(),
      claveDestino: clave,
      texto,
    };

    this.marcas.update((actuales) => [...actuales, item]);
    this.nuevaMarcaClave.set('');
    this.nuevaMarcaTexto.set('');
  }

  eliminarMarca(index: number): void {
    this.marcas.update((actuales) => actuales.filter((_, i) => i !== index));
  }

  confirmarDevolucion(): void {
    const exp = this.expedienteSeleccionado();
    const general = this.observacionGeneral().trim();
    if (!exp || !general) return;

    this.procesando.set(true);
    this.error.set(null);

    const body: DevolverActualizacionRequest = {
      observacionGeneral: general,
      marcas: this.marcas(),
    };

    this.revisionClient.devolverActualizacion(exp.documento, body).subscribe({
      next: (res) => {
        this.mensajeExito.set(
          res?.mensaje || 'Actualización devuelta al usuario con observaciones.',
        );
        this.procesando.set(false);
        this.cerrarModalDevolver();
        this.cerrarExpediente();
        this.cargarPendientes();
      },
      error: (err) => {
        this.error.set(err?.message || 'Error al devolver la actualización.');
        this.procesando.set(false);
      },
    });
  }

  descargarArchivo(archivoId: string, nombreOriginal: string): void {
    this.archivosClient.descargarArchivo(archivoId).subscribe({
      next: (res: unknown) => {
        const respuestaObj = res as { data?: Blob };
        const blob =
          respuestaObj?.data instanceof Blob
            ? respuestaObj.data
            : res instanceof Blob
              ? res
              : new Blob([String(res)]);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreOriginal || 'archivo_adjunto';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.error.set(err?.message || 'Error al descargar el archivo.');
      },
    });
  }

  obtenerClaves(obj: Record<string, unknown>): string[] {
    return Object.keys(obj || {});
  }
}
