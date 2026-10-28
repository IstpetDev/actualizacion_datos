import { catchError, forkJoin, of, Subscription } from 'rxjs';
import { ObservacionesRevisionComponent } from '../revision-compartida/observaciones-revision.component';
import { mensajeError } from '../../core/auth/mensaje-error';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  API_BASE_URL,
  ArchivosClient,
  ArchivoDto,
  DevolverActualizacionRequest,
  ExpedienteRevisionDto,
  FileResponse,
  HojaDeVidaDto,
  MarcaObservacionItem,
  ResumenRevisionPendienteDto,
  RevisionClient,
} from '../../api-client';
import { AuthService } from '../../core/auth';
import { CuentaBancariaRevisionComponent } from '../cuenta-bancaria/estado-cuentas-bancarias.component';
import { ExpedienteSeccionesComponent } from './revision/expediente-secciones.component';
import { descargarBlob, extraerNombreArchivo } from '../../core/util/descarga-archivo.util';

@Component({
  selector: 'app-supervisor-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ObservacionesRevisionComponent,
    FormsModule,
    CuentaBancariaRevisionComponent,
    ExpedienteSeccionesComponent,
  ],
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

      <!-- Vista principal: Lista de solicitudes y personas de la institución -->
      @if (!expedienteSeleccionado()) {
        <div class="filtro-busqueda">
          <input
            type="text"
            class="form-control"
            placeholder="Buscar por documento, nombre o estado..."
            [ngModel]="filtroTexto()"
            (ngModelChange)="filtroTexto.set($event)"
            data-testid="input-filtro-supervisor"
          />
        </div>

        <div class="table-container">
          <table class="data-table" data-testid="tabla-pendientes">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Estado</th>
                <th>Avance</th>
                <th>Fecha Envío</th>
                <th class="text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              @for (item of pendientesFiltrados(); track item.id) {
                <tr [attr.data-testid]="'fila-pendiente-' + item.documento">
                  <td>
                    <strong>{{ item.documento }}</strong>
                  </td>
                  <td>{{ item.nombre || '—' }}</td>
                  <td>{{ item.correo || '—' }}</td>
                  <td>
                    <span
                      class="badge"
                      [ngClass]="obtenerClaseBadge(item.estadoActualizacion)"
                      [attr.data-testid]="'badge-estado-' + item.documento"
                    >
                      {{ item.estadoActualizacion }}
                    </span>
                  </td>
                  <td class="avance-cell" [attr.data-testid]="'avance-' + item.documento">
                    <div class="barra-avance-fondo">
                      <div
                        class="barra-avance-relleno"
                        [class.completo]="(item.porcentajeAvance || 0) >= 100"
                        [style.width.%]="item.porcentajeAvance || 0"
                      ></div>
                    </div>
                    <span class="avance-texto">
                      {{ item.seccionesConDatos || 0 }}/{{ item.totalSecciones || 7 }} secciones ({{
                        item.porcentajeAvance || 0
                      }}%)
                    </span>
                  </td>
                  <td>
                    {{
                      item.estadoActualizacion === 'Enviado' ||
                      item.estadoActualizacion === 'Aprobado'
                        ? (item.fechaCreacionUtc | date: 'dd/MM/yyyy HH:mm')
                        : '—'
                    }}
                  </td>
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
                  <td colspan="7" class="text-center empty-state">
                    No hay solicitudes ni personas registradas para mostrar.
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
                class="btn btn-primary"
                (click)="descargarDocumentoPdf()"
                [disabled]="descargandoPdf() || procesando()"
                data-testid="btn-descargar-hdv-pdf"
              >
                {{ descargandoPdf() ? 'Descargando PDF...' : 'Descargar Hoja de Vida (PDF)' }}
              </button>
              <button
                type="button"
                class="btn btn-danger"
                (click)="abrirModalDevolver()"
                [disabled]="procesando() || !esExpedienteEnviado()"
                data-testid="btn-abrir-devolver"
              >
                Devolver con Observaciones
              </button>
              <button
                type="button"
                class="btn btn-success"
                (click)="aprobar()"
                [disabled]="procesando() || !esExpedienteEnviado()"
                data-testid="btn-aprobar"
              >
                {{ procesando() ? 'Aprobando...' : 'Aprobar Actualización' }}
              </button>
            </div>
          </div>

          @if (!esExpedienteEnviado()) {
            <div class="aviso-modo-lectura" role="status" data-testid="aviso-modo-lectura">
              <strong>Modo solo lectura:</strong>
              @if (
                expedienteSeleccionado()?.estadoActualizacion === 'Borrador' ||
                expedienteSeleccionado()?.estadoActualizacion === 'Sin Iniciar'
              ) {
                El expediente se encuentra en estado
                <em>{{ expedienteSeleccionado()?.estadoActualizacion }}</em
                >. No puede ser aprobado ni devuelto hasta que la persona formalice su envío.
              } @else if (expedienteSeleccionado()?.estadoActualizacion === 'Devuelto') {
                El expediente se encuentra en estado <em>Devuelto</em> a la espera de que el usuario
                envíe las correcciones solicitadas.
              } @else if (expedienteSeleccionado()?.estadoActualizacion === 'Aprobado') {
                El expediente se encuentra <em>Aprobado</em> y cerrado para la campaña activa.
              }
            </div>
          }

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
              @if (expedienteSeleccionado(); as expediente) {
                <app-cuenta-bancaria-revision [documento]="expediente.documento" />
              }

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
                        {{ archivo.claveDestino || 'Documento General' }} •
                        {{ (archivo.tamanoBytes / 1024).toFixed(1) }} KB •
                        {{ archivo.tipoContenido }} • Subido:
                        {{ archivo.fechaSubidaUtc | date: 'dd/MM/yyyy HH:mm' }}
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

              <app-observaciones-revision
                [observaciones]="expedienteSeleccionado()?.observaciones ?? []"
                [hojaDeVida]="hojaDeVida()"
                [archivos]="archivosExpediente()"
                [estado]="expedienteSeleccionado()?.estadoActualizacion || ''"
              />
            </section>
          </div>

          @if (hojaDeVida(); as hdv) {
            <app-expediente-secciones
              [hojaDeVida]="hdv"
              [observaciones]="expedienteSeleccionado()?.observaciones ?? []"
              [archivos]="archivosExpediente()"
              (descargar)="descargarArchivo($event.archivoId, $event.nombreOriginal)"
              (marcarItem)="iniciarMarcaItem($event)"
            />
          }
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
                      <option value="Item">Ítem de Hoja de Vida</option>
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
export class SupervisorDashboardComponent implements OnInit, OnDestroy {
  protected readonly authService = inject(AuthService);
  private readonly revisionClient = inject(RevisionClient);
  private readonly archivosClient = inject(ArchivosClient);
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL, { optional: true }) ?? '';

  readonly pendientes = signal<ResumenRevisionPendienteDto[]>([]);
  readonly filtroTexto = signal<string>('');

  readonly pendientesFiltrados = computed(() => {
    const filtro = this.filtroTexto().trim().toLowerCase();
    if (!filtro) return this.pendientes();
    return this.pendientes().filter(
      (p) =>
        p.documento?.toLowerCase().includes(filtro) ||
        p.nombre?.toLowerCase().includes(filtro) ||
        p.correo?.toLowerCase().includes(filtro) ||
        p.estadoActualizacion?.toLowerCase().includes(filtro),
    );
  });

  readonly esExpedienteEnviado = computed(() => {
    return this.expedienteSeleccionado()?.estadoActualizacion === 'Enviado';
  });

  obtenerClaseBadge(estado?: string): string {
    const normalizado = (estado || '').toLowerCase();
    switch (normalizado) {
      case 'sin iniciar':
        return 'badge-secondary';
      case 'borrador':
        return 'badge-warning';
      case 'enviado':
        return 'badge-info';
      case 'devuelto':
        return 'badge-danger';
      case 'aprobado':
        return 'badge-success';
      default:
        return 'badge-secondary';
    }
  }
  readonly cargando = signal<boolean>(false);
  readonly procesando = signal<boolean>(false);
  readonly cargandoExpediente = signal<boolean>(false);
  readonly descargandoPdf = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly mensajeExito = signal<string | null>(null);

  readonly expedienteSeleccionado = signal<ExpedienteRevisionDto | null>(null);
  readonly hojaDeVida = signal<HojaDeVidaDto | null>(null);
  readonly archivosExpediente = signal<ArchivoDto[]>([]);
  readonly datosPersonalesParsed = signal<Record<string, unknown> | null>(null);

  readonly mostrarModalDevolver = signal<boolean>(false);
  observacionGeneral = signal<string>('');
  nuevaMarcaTipo = signal<string>('Campo');
  nuevaMarcaClave = signal<string>('');
  nuevaMarcaTexto = signal<string>('');
  readonly marcas = signal<MarcaObservacionItem[]>([]);

  private cargaExpediente?: Subscription;

  ngOnDestroy(): void {
    this.cargaExpediente?.unsubscribe();
  }

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
        this.error.set(mensajeError(err, 'Error al cargar la lista de solicitudes pendientes.'));
        this.cargando.set(false);
      },
    });
  }

  verExpediente(documento: string): void {
    this.cerrarExpediente();
    this.cargandoExpediente.set(true);
    this.error.set(null);
    this.mensajeExito.set(null);
    this.cargaExpediente = forkJoin({
      exp: this.revisionClient.obtenerExpedienteParaRevision(documento),
      hdv: this.revisionClient
        .obtenerHojaDeVidaParaRevision(documento)
        .pipe(catchError(() => of(null))),
      archivos: this.revisionClient
        .listarArchivosExpediente(documento)
        .pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ exp, hdv, archivos }) => {
        this.expedienteSeleccionado.set(exp);
        this.hojaDeVida.set(hdv);
        this.archivosExpediente.set(archivos);
        try {
          this.datosPersonalesParsed.set(
            exp.datosPersonalesJson ? JSON.parse(exp.datosPersonalesJson) : null,
          );
        } catch {
          this.datosPersonalesParsed.set(null);
        }
        this.cargandoExpediente.set(false);
      },
      error: (err: unknown) => {
        this.error.set(mensajeError(err, 'Error al obtener el expediente para revisión.'));
        this.cargandoExpediente.set(false);
      },
    });
  }

  cerrarExpediente(): void {
    this.cargaExpediente?.unsubscribe();
    this.cargandoExpediente.set(false);
    this.expedienteSeleccionado.set(null);
    this.hojaDeVida.set(null);
    this.archivosExpediente.set([]);
    this.datosPersonalesParsed.set(null);
  }

  iniciarMarcaItem(info: { tipo: string; clave: string; label: string }): void {
    if (this.expedienteSeleccionado()?.estadoActualizacion !== 'Enviado') return;
    this.nuevaMarcaTipo.set(info.tipo || 'Item');
    this.nuevaMarcaClave.set(info.clave);
    this.nuevaMarcaTexto.set('');
    this.mostrarModalDevolver.set(true);
  }

  aprobar(): void {
    const exp = this.expedienteSeleccionado();
    if (!exp || exp.estadoActualizacion !== 'Enviado') return;

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
        this.error.set(mensajeError(err, 'Error al aprobar la actualización.'));
        this.procesando.set(false);
      },
    });
  }

  abrirModalDevolver(): void {
    if (this.expedienteSeleccionado()?.estadoActualizacion !== 'Enviado') return;
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
    if (!exp || exp.estadoActualizacion !== 'Enviado' || !general) return;

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
        this.verExpediente(exp.documento);
        this.cargarPendientes();
        this.mensajeExito.set(
          res?.mensaje || 'Actualización devuelta al usuario con observaciones.',
        );
      },
      error: (err) => {
        this.error.set(mensajeError(err, 'Error al devolver la actualización.'));
        this.procesando.set(false);
      },
    });
  }

  descargarArchivo(archivoId: string, nombreOriginal: string): void {
    this.archivosClient.descargarArchivo(archivoId).subscribe({
      next: (res: FileResponse | Blob) => {
        const blob = res instanceof Blob ? res : res?.data;
        if (!blob) {
          this.error.set('El archivo descargado está vacío.');
          return;
        }
        const fileName = !(res instanceof Blob) ? res?.fileName : undefined;
        const nombre = fileName || nombreOriginal || 'archivo_adjunto';
        descargarBlob(blob, nombre);
      },
      error: (err) => {
        this.error.set(mensajeError(err, 'Error al descargar el archivo.'));
      },
    });
  }

  obtenerClaves(obj: Record<string, unknown>): string[] {
    return Object.keys(obj || {});
  }

  descargarDocumentoPdf(): void {
    const exp = this.expedienteSeleccionado();
    if (!exp || this.descargandoPdf()) return;

    this.descargandoPdf.set(true);
    this.error.set(null);

    const url = `${this.baseUrl}/api/personas/${exp.id}/documento-hoja-de-vida`;
    this.http
      .get(url, {
        responseType: 'blob',
        observe: 'response',
      })
      .subscribe({
        next: (res) => {
          const blob = res.body;
          if (!blob) {
            this.error.set('No se recibió el documento PDF.');
            this.descargandoPdf.set(false);
            return;
          }
          const nombreArchivo =
            extraerNombreArchivo(res.headers.get('content-disposition')) ||
            `hoja-de-vida-${exp.documento}.pdf`;
          descargarBlob(blob, nombreArchivo);
          this.descargandoPdf.set(false);
        },
        error: (err) => {
          this.error.set(mensajeError(err, 'Error al descargar la hoja de vida en PDF.'));
          this.descargandoPdf.set(false);
        },
      });
  }
}
