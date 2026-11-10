import { catchError, forkJoin, of, Subscription } from 'rxjs';
import { ObservacionesRevisionComponent } from '../revision-compartida/observaciones-revision.component';
import { mensajeError } from '../../core/auth/mensaje-error';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  Component,
  computed,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
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
import { coincideBusqueda } from '../../core/util/filtro-busqueda.util';

export interface ArchivoPrevisualizacion {
  id: string;
  nombreOriginal: string;
  tipoContenido: string;
  blobUrl: string;
  safeUrl: SafeResourceUrl | null;
  esPdf: boolean;
  esImagen: boolean;
}

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
      <!-- Encabezado Principal de RRHH -->
      <header class="section-header">
        <div class="header-main-group">
          <div class="header-icon-box">
            <span class="material-symbols-outlined">inbox</span>
          </div>
          <div class="header-titles">
            <div class="header-pill">
              <span class="material-symbols-outlined icon-xs">verified_user</span>
              <span>Talento Humano</span>
            </div>
            <h1 class="section-title">Bandeja de Actualizaciones y Control de Expedientes</h1>
            <p class="section-subtitle">
              Control de calidad documental, verificación de hojas de vida y aprobación
              institucional.
            </p>
          </div>
        </div>
        <div class="header-actions">
          <button
            type="button"
            class="btn btn-secondary"
            (click)="cargarPendientes()"
            [disabled]="cargando()"
            data-testid="btn-refrescar"
          >
            <span class="material-symbols-outlined icon-sm">refresh</span>
            <span>{{ cargando() ? 'Actualizando...' : 'Refrescar Bandeja' }}</span>
          </button>
        </div>
      </header>

      @if (mensajeExito()) {
        <div class="alert alert-success" role="alert" data-testid="mensaje-exito">
          <span class="material-symbols-outlined icon-md">check_circle</span>
          <div class="alert-content"><strong>Operación exitosa:</strong> {{ mensajeExito() }}</div>
          <button
            type="button"
            class="alert-close"
            (click)="mensajeExito.set(null)"
            aria-label="Cerrar mensaje"
          >
            ✕
          </button>
        </div>
      }

      @if (error()) {
        <div class="alert alert-danger" role="alert" data-testid="mensaje-error">
          <span class="material-symbols-outlined icon-md">error</span>
          <div class="alert-content"><strong>Atención:</strong> {{ error() }}</div>
          <button
            type="button"
            class="alert-close"
            (click)="error.set(null)"
            aria-label="Cerrar mensaje"
          >
            ✕
          </button>
        </div>
      }

      <!-- Vista principal: Lista y Filtros de Solicitudes -->
      @if (!expedienteSeleccionado()) {
        <!-- Barra de Control Unificada: Segmentación por Estado + Búsqueda (Baja Carga Cognitiva) -->
        <div class="control-panel">
          <!-- Segmented Control de Estados (Ley de Hick: una sola fila de opciones claras) -->
          <div class="segmented-control" role="tablist" aria-label="Filtrar por estado">
            <button
              type="button"
              role="tab"
              class="segment-btn"
              [class.segment-active]="filtroEstado() === 'todos'"
              (click)="setFiltroEstado('todos')"
            >
              <span>Todos</span>
              <span class="segment-badge">{{ totalExpedientes() }}</span>
            </button>

            <button
              type="button"
              role="tab"
              class="segment-btn"
              [class.segment-active]="filtroEstado() === 'Enviado'"
              (click)="setFiltroEstado('Enviado')"
            >
              <span>Por Revisar</span>
              <span class="segment-badge segment-badge-gold">{{ conteoEnviados() }}</span>
            </button>

            <button
              type="button"
              role="tab"
              class="segment-btn"
              [class.segment-active]="filtroEstado() === 'Devuelto'"
              (click)="setFiltroEstado('Devuelto')"
            >
              <span>Devueltos</span>
              <span class="segment-badge">{{ conteoDevueltos() }}</span>
            </button>

            <button
              type="button"
              role="tab"
              class="segment-btn"
              [class.segment-active]="filtroEstado() === 'Aprobado'"
              (click)="setFiltroEstado('Aprobado')"
            >
              <span>Aprobados</span>
              <span class="segment-badge">{{ conteoAprobados() }}</span>
            </button>

            <button
              type="button"
              role="tab"
              class="segment-btn"
              [class.segment-active]="filtroEstado() === 'Borrador'"
              (click)="setFiltroEstado('Borrador')"
            >
              <span>En Elaboración</span>
              <span class="segment-badge">{{ conteoBorradores() }}</span>
            </button>
          </div>

          <!-- Búsqueda y Ordenación Compacta -->
          <div class="actions-row">
            <div class="search-box">
              <span class="material-symbols-outlined search-icon">search</span>
              <input
                type="text"
                class="search-input"
                placeholder="Buscar por cédula, nombre o correo..."
                [ngModel]="busquedaTexto()"
                (ngModelChange)="onBusquedaChange($event)"
                data-testid="input-filtro-supervisor"
                aria-label="Buscar solicitudes"
              />
              @if (busquedaTexto()) {
                <button
                  type="button"
                  class="search-clear-btn"
                  (click)="onBusquedaChange('')"
                  aria-label="Limpiar búsqueda"
                >
                  <span class="material-symbols-outlined icon-sm">close</span>
                </button>
              }
            </div>

            <div class="filter-group">
              <label for="selectOrden" class="filter-label">
                <span class="material-symbols-outlined icon-xs">sort</span>
                <span>Ordenar:</span>
              </label>
              <select
                id="selectOrden"
                class="form-control select-filter"
                [ngModel]="ordenCriterio()"
                (ngModelChange)="ordenCriterio.set($event)"
              >
                <option value="fecha-desc">Más reciente primero</option>
                <option value="fecha-asc">Más antiguo primero</option>
                <option value="nombre-asc">Nombre (A - Z)</option>
                <option value="nombre-desc">Nombre (Z - A)</option>
                <option value="documento-asc">Cédula / Documento</option>
                <option value="estado">Por Estado</option>
              </select>
            </div>

            @if (tieneFiltrosActivos()) {
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                (click)="limpiarFiltros()"
                title="Restablecer todos los filtros"
              >
                <span class="material-symbols-outlined icon-sm">filter_alt_off</span>
                <span>Restablecer</span>
              </button>
            }
          </div>

          <!-- Píldoras de Filtros Activos y Conteo -->
          <div class="filters-summary">
            <span class="results-counter">
              Mostrando <strong>{{ paginaVisible().length }}</strong> de
              <strong>{{ totalFiltrados() }}</strong> expedientes
              @if (totalFiltrados() !== totalExpedientes()) {
                <span class="text-muted">(filtrados de un total de {{ totalExpedientes() }})</span>
              }
            </span>

            @if (tieneFiltrosActivos()) {
              <div class="active-pills">
                @if (busquedaTexto()) {
                  <span class="active-pill">
                    Texto: "{{ busquedaTexto() }}"
                    <button
                      type="button"
                      class="pill-remove"
                      (click)="onBusquedaChange('')"
                      aria-label="Quitar filtro de búsqueda"
                    >
                      ✕
                    </button>
                  </span>
                }
                @if (filtroEstado() !== 'todos') {
                  <span class="active-pill">
                    Estado: {{ filtroEstado() }}
                    <button
                      type="button"
                      class="pill-remove"
                      (click)="onFiltroEstadoChange('todos')"
                      aria-label="Quitar filtro de estado"
                    >
                      ✕
                    </button>
                  </span>
                }
              </div>
            }
          </div>
        </div>

        <!-- Tabla de Datos con Glassmorphism -->
        <!-- Tabla de Datos con Glassmorphism -->
        <div class="table-container">
          <table class="data-table" data-testid="tabla-pendientes">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Colaborador</th>
                <th>Correo Institucional</th>
                <th>Estado</th>
                <th>Avance</th>
                <th>Fecha Envío</th>
                <th class="text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              @for (item of paginaVisible(); track item.id) {
                <tr [attr.data-testid]="'fila-pendiente-' + item.documento">
                  <td>
                    <div class="doc-cell">
                      <span class="material-symbols-outlined icon-sm text-muted">badge</span>
                      <strong>{{ item.documento }}</strong>
                    </div>
                  </td>
                  <td>
                    <div class="name-cell">
                      <span class="collaborator-name">{{ item.nombre || '—' }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="email-text">{{ item.correo || '—' }}</span>
                  </td>
                  <td>
                    <span
                      class="badge"
                      [ngClass]="obtenerClaseBadge(item.estadoActualizacion)"
                      [attr.data-testid]="'badge-estado-' + item.documento"
                    >
                      <span class="badge-dot"></span>
                      <span>{{ item.estadoActualizacion }}</span>
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
                    <div class="date-cell">
                      <span class="material-symbols-outlined icon-xs text-muted"
                        >calendar_today</span
                      >
                      <span>{{
                        item.estadoActualizacion === 'Enviado' ||
                        item.estadoActualizacion === 'Aprobado'
                          ? (item.fechaCreacionUtc | date: 'dd/MM/yyyy HH:mm')
                          : '—'
                      }}</span>
                    </div>
                  </td>
                  <td class="text-right">
                    <button
                      type="button"
                      class="btn btn-primary btn-sm"
                      (click)="verExpediente(item.documento)"
                      [disabled]="cargandoExpediente()"
                      [attr.data-testid]="'btn-revisar-' + item.documento"
                    >
                      <span class="material-symbols-outlined icon-sm">assignment_turned_in</span>
                      <span>Revisar Expediente</span>
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="text-center empty-state">
                    <div class="empty-state-content">
                      <span class="material-symbols-outlined empty-icon">folder_off</span>
                      <p class="empty-title">No se encontraron expedientes</p>
                      <p class="empty-subtitle">
                        @if (tieneFiltrosActivos()) {
                          No hay registros que coincidan con los criterios de búsqueda aplicados.
                        } @else {
                          No hay solicitudes en la bandeja en este momento.
                        }
                      </p>
                      @if (tieneFiltrosActivos()) {
                        <button
                          type="button"
                          class="btn btn-secondary btn-sm mt-3"
                          (click)="limpiarFiltros()"
                        >
                          Restablecer filtros
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Barra de Paginación Accesible (Issue #180) -->
        @if (totalFiltrados() > 0) {
          <div class="pagination-bar glass-card">
            <div class="pagination-size">
              <label for="selectTamano" class="text-sm text-muted">Mostrar:</label>
              <select
                id="selectTamano"
                class="form-control select-size"
                [ngModel]="tamanoPagina()"
                (ngModelChange)="cambiarTamanoPagina($event)"
              >
                <option [ngValue]="10">10 por pág.</option>
                <option [ngValue]="25">25 por pág.</option>
                <option [ngValue]="50">50 por pág.</option>
              </select>
              <span class="pagination-range text-sm text-muted">
                {{ rangoTexto() }}
              </span>
            </div>

            <nav class="pagination-controls" aria-label="Controles de paginación">
              <button
                type="button"
                class="pagination-btn"
                [disabled]="paginaActual() <= 1"
                (click)="irAPagina(1)"
                title="Primera página"
                aria-label="Primera página"
              >
                <span class="material-symbols-outlined icon-sm">first_page</span>
              </button>

              <button
                type="button"
                class="pagination-btn"
                [disabled]="paginaActual() <= 1"
                (click)="paginaAnterior()"
                title="Página anterior"
                aria-label="Página anterior"
              >
                <span class="material-symbols-outlined icon-sm">chevron_left</span>
              </button>

              <div class="pagination-pages">
                @for (p of paginasVisibles(); track p) {
                  <button
                    type="button"
                    class="page-number-btn"
                    [class.active]="p === paginaActual()"
                    (click)="irAPagina(p)"
                    [attr.aria-current]="p === paginaActual() ? 'page' : null"
                  >
                    {{ p }}
                  </button>
                }
              </div>

              <button
                type="button"
                class="pagination-btn"
                [disabled]="paginaActual() >= totalPaginas()"
                (click)="paginaSiguiente()"
                title="Página siguiente"
                aria-label="Página siguiente"
              >
                <span class="material-symbols-outlined icon-sm">chevron_right</span>
              </button>

              <button
                type="button"
                class="pagination-btn"
                [disabled]="paginaActual() >= totalPaginas()"
                (click)="irAPagina(totalPaginas())"
                title="Última página"
                aria-label="Última página"
              >
                <span class="material-symbols-outlined icon-sm">last_page</span>
              </button>
            </nav>
          </div>
        }
      } @else {
        <!-- Vista detallada del Expediente seleccionado -->
        <article class="expediente-panel" data-testid="panel-expediente">
          <div class="expediente-header glass-card">
            <div class="expediente-header-info">
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                (click)="cerrarExpediente()"
                data-testid="btn-volver"
              >
                <span class="material-symbols-outlined icon-sm">arrow_back</span>
                <span>Volver a la bandeja</span>
              </button>
              <h2 class="expediente-title">
                Expediente: {{ expedienteSeleccionado()?.nombre || 'Usuario' }}
                <span class="expediente-doc-badge">
                  CI: {{ expedienteSeleccionado()?.documento }}
                </span>
              </h2>
            </div>
            <div class="expediente-actions">
              <button
                type="button"
                class="btn btn-secondary"
                (click)="descargarDocumentoPdf()"
                [disabled]="descargandoPdf() || procesando()"
                data-testid="btn-descargar-hdv-pdf"
              >
                <span class="material-symbols-outlined icon-sm">picture_as_pdf</span>
                <span>{{
                  descargandoPdf() ? 'Generando PDF...' : 'Descargar Hoja de Vida (PDF)'
                }}</span>
              </button>
              <button
                type="button"
                class="btn btn-danger"
                (click)="abrirModalDevolver()"
                [disabled]="procesando() || !esExpedienteEnviado()"
                data-testid="btn-abrir-devolver"
              >
                <span class="material-symbols-outlined icon-sm">rate_review</span>
                <span>Devolver con Observaciones</span>
              </button>
              <button
                type="button"
                class="btn btn-success"
                (click)="aprobar()"
                [disabled]="procesando() || !esExpedienteEnviado()"
                data-testid="btn-aprobar"
              >
                <span class="material-symbols-outlined icon-sm">verified</span>
                <span>{{ procesando() ? 'Aprobando...' : 'Aprobar Actualización' }}</span>
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
            <!-- Datos Personales y Tratamiento -->
            <section class="card glass-card">
              <div class="card-header-styled">
                <span class="material-symbols-outlined icon-md text-primary">person</span>
                <h3 class="card-title">Datos Personales y Tratamiento</h3>
              </div>
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

              <h4 class="card-subtitle mt-4">Datos del Formulario</h4>
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

            <!-- Documentos y Archivos Adjuntos con Previsualización (Issue #176 & #177) -->
            <section class="card glass-card">
              <div class="card-header-styled">
                <div class="card-title-group">
                  <span class="material-symbols-outlined icon-md text-primary">attach_file</span>
                  <h3 class="card-title">Documentos Adjuntos del Expediente</h3>
                </div>
                <span class="badge badge-info">{{ archivosExpediente().length }} total</span>
              </div>
              <p class="section-hint text-muted">
                Respaldos subidos en el expediente. Se pueden revisar aquí o dentro de cada pestaña
                inferior.
              </p>
              <div class="archivos-lista" data-testid="lista-archivos-expediente">
                @for (archivo of archivosExpediente(); track archivo.id) {
                  <div class="archivo-item" [attr.data-testid]="'archivo-' + archivo.id">
                    <div class="archivo-info">
                      <div class="archivo-icon-row">
                        <span class="material-symbols-outlined icon-sm text-muted">
                          {{
                            esTipoPdf(archivo.tipoContenido, archivo.nombreOriginal)
                              ? 'picture_as_pdf'
                              : 'description'
                          }}
                        </span>
                        <strong>{{ archivo.nombreOriginal }}</strong>
                      </div>
                      <span class="archivo-meta">
                        {{ archivo.claveDestino || 'Documento General' }} •
                        {{ (archivo.tamanoBytes / 1024).toFixed(1) }} KB •
                        {{ archivo.tipoContenido }} • Subido:
                        {{ archivo.fechaSubidaUtc | date: 'dd/MM/yyyy HH:mm' }}
                      </span>
                    </div>
                    <div class="archivo-buttons">
                      <button
                        type="button"
                        class="btn btn-secondary btn-sm"
                        (click)="
                          previsualizarArchivo(
                            archivo.id,
                            archivo.nombreOriginal,
                            archivo.tipoContenido
                          )
                        "
                        title="Previsualizar archivo sin salir"
                      >
                        <span class="material-symbols-outlined icon-sm">visibility</span>
                        <span>Previsualizar</span>
                      </button>
                      <button
                        type="button"
                        class="btn btn-secondary btn-sm"
                        (click)="descargarArchivo(archivo.id, archivo.nombreOriginal)"
                        [attr.data-testid]="'btn-descargar-' + archivo.id"
                        title="Descargar archivo a tu equipo"
                      >
                        <span class="material-symbols-outlined icon-sm">download</span>
                        <span>Descargar</span>
                      </button>
                      <button
                        type="button"
                        class="btn btn-danger btn-sm"
                        (click)="iniciarRetiroArchivo(archivo)"
                        [attr.data-testid]="'btn-retirar-' + archivo.id"
                        title="Retirar archivo con motivo de rechazo"
                      >
                        <span class="material-symbols-outlined icon-sm">delete_sweep</span>
                        <span>Retirar</span>
                      </button>
                    </div>
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

          <!-- Secciones detalladas de Hoja de Vida -->
          @if (hojaDeVida(); as hdv) {
            <app-expediente-secciones
              [hojaDeVida]="hdv"
              [observaciones]="expedienteSeleccionado()?.observaciones ?? []"
              [archivos]="archivosExpediente()"
              (descargar)="descargarArchivo($event.archivoId, $event.nombreOriginal)"
              (previsualizar)="previsualizarArchivo($event.archivoId, $event.nombreOriginal)"
              (marcarItem)="iniciarMarcaItem($event)"
            />
          }
        </article>
      }

      <!-- Modal de Previsualización de Archivos PDF e Imágenes (Issue #177) -->
      @if (archivoEnPrevisualizacion()) {
        <div class="modal-overlay preview-overlay">
          <div class="modal-dialog preview-dialog">
            <header class="modal-header">
              <div class="preview-title-wrap">
                <span class="material-symbols-outlined icon-md text-primary">
                  {{ archivoEnPrevisualizacion()?.esPdf ? 'picture_as_pdf' : 'image' }}
                </span>
                <h3 class="modal-title">
                  {{ archivoEnPrevisualizacion()?.nombreOriginal }}
                </h3>
              </div>
              <div class="preview-header-actions">
                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  (click)="
                    descargarArchivo(
                      archivoEnPrevisualizacion()!.id,
                      archivoEnPrevisualizacion()!.nombreOriginal
                    )
                  "
                >
                  <span class="material-symbols-outlined icon-sm">download</span>
                  <span>Descargar</span>
                </button>
                <button
                  type="button"
                  class="btn-close"
                  (click)="cerrarPrevisualizacion()"
                  aria-label="Cerrar visor"
                >
                  ✕
                </button>
              </div>
            </header>

            <div class="modal-body preview-body">
              @if (cargandoPrevisualizacion()) {
                <div class="preview-loading">
                  <span class="material-symbols-outlined icon-xl spin-animation"
                    >progress_activity</span
                  >
                  <p>Cargando previsualización segura...</p>
                </div>
              } @else if (errorPrevisualizacion()) {
                <div class="preview-error">
                  <span class="material-symbols-outlined icon-xl text-danger">warning</span>
                  <p>{{ errorPrevisualizacion() }}</p>
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm mt-3"
                    (click)="
                      descargarArchivo(
                        archivoEnPrevisualizacion()!.id,
                        archivoEnPrevisualizacion()!.nombreOriginal
                      )
                    "
                  >
                    Descargar en su lugar
                  </button>
                </div>
              } @else if (
                archivoEnPrevisualizacion()?.esPdf && archivoEnPrevisualizacion()?.safeUrl
              ) {
                <iframe
                  [src]="archivoEnPrevisualizacion()?.safeUrl"
                  class="preview-iframe"
                  title="Visor de PDF"
                ></iframe>
              } @else if (
                archivoEnPrevisualizacion()?.esImagen && archivoEnPrevisualizacion()?.blobUrl
              ) {
                <div class="preview-image-container">
                  <img
                    [src]="archivoEnPrevisualizacion()?.blobUrl"
                    [alt]="archivoEnPrevisualizacion()?.nombreOriginal"
                    class="preview-img"
                  />
                </div>
              } @else {
                <div class="preview-unsupported">
                  <span class="material-symbols-outlined icon-xl text-muted">draft</span>
                  <p>Este formato no admite previsualización en el navegador.</p>
                  <button
                    type="button"
                    class="btn btn-primary btn-sm mt-3"
                    (click)="
                      descargarArchivo(
                        archivoEnPrevisualizacion()!.id,
                        archivoEnPrevisualizacion()!.nombreOriginal
                      )
                    "
                  >
                    Descargar archivo para abrirlo
                  </button>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- Modal Centrado y Accesible de Devolución con Marcas (Issue #175 & ADR-0008) -->
      @if (mostrarModalDevolver()) {
        <div class="modal-overlay" data-testid="modal-devolver">
          <div class="modal-dialog">
            <header class="modal-header">
              <h3 class="modal-title">
                <span class="material-symbols-outlined icon-md text-danger">rate_review</span>
                <span>Devolver Expediente con Observaciones</span>
              </h3>
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
              @if (itemParaMarcarLabel()) {
                <div class="item-marcado-banner" data-testid="banner-item-marcado">
                  <span class="material-symbols-outlined icon-md text-warning">edit_note</span>
                  <div class="banner-content">
                    <span class="banner-sub">Corrección solicitada para:</span>
                    <strong class="banner-title">{{ itemParaMarcarLabel() }}</strong>
                  </div>
                </div>
              }

              <div class="form-group">
                <label for="obsGeneral">Observación General (Obligatoria):</label>
                <textarea
                  id="obsGeneral"
                  class="form-control"
                  rows="3"
                  [(ngModel)]="observacionGeneral"
                  placeholder="Explique detalladamente al colaborador las correcciones requeridas..."
                  data-testid="input-observacion-general"
                ></textarea>
              </div>

              <h4 class="modal-subtitle mt-4">Solicitud de Corrección Puntual (ADR-0008)</h4>
              <div class="marca-builder glass-card">
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
                      placeholder="Ej: telefono, cedula_frontal, titulo:tit-1..."
                      data-testid="input-clave-marca"
                    />
                  </div>
                </div>
                <div class="form-group mt-2">
                  <label for="textoMarca">Motivo o Corrección Puntual:</label>
                  <input
                    id="textoMarca"
                    type="text"
                    class="form-control"
                    [(ngModel)]="nuevaMarcaTexto"
                    placeholder="Ej: Documento borroso o certificado desactualizado..."
                    data-testid="input-texto-marca"
                  />
                </div>
                <button
                  type="button"
                  class="btn btn-secondary btn-sm mt-3"
                  (click)="agregarMarca()"
                  data-testid="btn-agregar-marca"
                >
                  <span class="material-symbols-outlined icon-sm">add</span>
                  <span>+ Agregar Marca Específica</span>
                </button>
              </div>

              @if (marcas().length > 0) {
                <div class="marcas-lista mt-3" data-testid="lista-marcas-creadas">
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
                [disabled]="
                  procesando() ||
                  (!observacionGeneral().trim() &&
                    !nuevaMarcaTexto().trim() &&
                    marcas().length === 0)
                "
                data-testid="btn-confirmar-devolver"
              >
                <span class="material-symbols-outlined icon-sm">send</span>
                <span>{{ procesando() ? 'Devolviendo...' : 'Confirmar y Devolver' }}</span>
              </button>
            </footer>
          </div>
        </div>
      }

      <!-- Modal para Retiro Auditado de Adjuntos (Issue #139, ADR-0039) -->
      @if (archivoParaRetirar(); as arch) {
        <div class="modal-backdrop" data-testid="modal-retiro-archivo">
          <div class="modal-dialog">
            <header class="modal-header">
              <h3>Retirar Documento Adjunto</h3>
              <button type="button" class="btn-cerrar" (click)="cancelarRetiroArchivo()">✕</button>
            </header>
            <div class="modal-body">
              <p>
                Está por retirar el archivo <strong>{{ arch.nombreOriginal }}</strong> del
                expediente de {{ expedienteSeleccionado()?.nombre }}.
              </p>
              <p class="text-danger">
                Esta acción es auditada e inmutable. El archivo será eliminado físicamente del
                almacenamiento.
              </p>
              <div class="form-group">
                <label for="motivoRetiro">Motivo del retiro (obligatorio):</label>
                <textarea
                  id="motivoRetiro"
                  class="form-control"
                  rows="3"
                  [(ngModel)]="motivoRetiro"
                  placeholder="Explique detalladamente el motivo por el cual se retira este adjunto..."
                  data-testid="input-motivo-retiro"
                ></textarea>
                @if (errorRetiro()) {
                  <p class="text-danger" role="alert" data-testid="error-retiro">
                    {{ errorRetiro() }}
                  </p>
                }
              </div>
            </div>
            <footer class="modal-footer">
              <button
                type="button"
                class="btn btn-secondary"
                (click)="cancelarRetiroArchivo()"
                [disabled]="retirandoArchivo()"
              >
                Cancelar
              </button>
              <button
                type="button"
                class="btn btn-danger"
                (click)="confirmarRetiroArchivo()"
                [disabled]="retirandoArchivo() || !motivoRetiro.trim()"
                data-testid="btn-confirmar-retiro"
              >
                {{ retirandoArchivo() ? 'Retirando...' : 'Confirmar Retiro' }}
              </button>
            </footer>
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    .dashboard-section {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1.5rem;
      border-bottom: 1px solid rgba(226, 232, 240, 0.8);
      padding-bottom: 1.25rem;
      flex-wrap: wrap;
    }
    .header-main-group {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .header-icon-box {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      background: rgba(34, 44, 87, 0.08);
      border: 1px solid rgba(34, 44, 87, 0.18);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #222c57;
      flex-shrink: 0;
    }
    .header-icon-box .material-symbols-outlined {
      font-size: 28px;
    }
    .header-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.2rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      color: #222c57;
      background: rgba(34, 44, 87, 0.08);
      border: 1px solid rgba(34, 44, 87, 0.18);
      margin-bottom: 0.35rem;
    }
    .section-title {
      font-family: var(--font-display, 'Outfit', sans-serif);
      font-size: 1.5rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 0.25rem 0;
      letter-spacing: -0.025em;
    }
    .section-subtitle {
      font-size: 0.875rem;
      color: #64748b;
      margin: 0;
    }

    /* Panel de Control Unificado: Segmented Control + Búsqueda */
    .control-panel {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: var(--radius-md);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      box-shadow: var(--shadow-sm);
    }
    .segmented-control {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      overflow-x: auto;
      padding-bottom: 0.25rem;
    }
    .segment-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #334155;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition-fast);
      white-space: nowrap;
    }
    .segment-btn:hover {
      background: #f1f5f9;
      border-color: #94a3b8;
    }
    .segment-active {
      background: #222c57 !important;
      color: #ffffff !important;
      border-color: #222c57 !important;
      border-bottom: 3px solid #c4a857 !important;
      box-shadow: 0 4px 12px rgba(34, 44, 87, 0.25);
    }
    .segment-badge {
      font-size: 0.75rem;
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
      background: #e2e8f0;
      color: #334155;
      font-weight: 700;
    }
    .segment-active .segment-badge {
      background: rgba(255, 255, 255, 0.2);
      color: #ffffff;
    }
    .segment-badge-gold {
      background: #c4a857 !important;
      color: #0f172a !important;
      font-weight: 800;
    }
    .actions-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .search-box {
      flex: 1;
      min-width: 280px;
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-icon {
      position: absolute;
      left: 0.85rem;
      color: #94a3b8;
      pointer-events: none;
    }
    .search-input {
      padding-left: 2.5rem !important;
      padding-right: 2.25rem !important;
    }
    .search-clear-btn {
      position: absolute;
      right: 0.75rem;
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .search-clear-btn:hover {
      color: #0f172a;
    }
    .filter-group {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }
    .filter-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #475569;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      white-space: nowrap;
    }
    .select-filter {
      min-width: 175px;
    }
    .filters-summary {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      padding-top: 0.5rem;
      border-top: 1px solid rgba(226, 232, 240, 0.6);
      font-size: 0.8125rem;
    }
    .active-pills {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .active-pill {
      background: rgba(252, 234, 30, 0.18);
      border: 1px solid #d4be10;
      color: #1d1e1c;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.15rem 0.55rem;
      border-radius: 9999px;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }
    .pill-remove {
      background: transparent;
      border: none;
      color: #785c00;
      cursor: pointer;
      font-size: 0.75rem;
      padding: 0;
    }

    /* Tabla celdas */
    .doc-cell,
    .date-cell,
    .archivo-icon-row {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }
    .collaborator-name {
      font-weight: 600;
      color: #0f172a;
    }
    .email-text {
      color: #64748b;
      font-size: 0.8125rem;
    }
    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }
    .empty-state-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem 1rem;
    }
    .empty-icon {
      font-size: 48px;
      color: #cbd5e1;
      margin-bottom: 0.75rem;
    }
    .empty-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 0.25rem 0;
    }
    .empty-subtitle {
      font-size: 0.875rem;
      color: #64748b;
      margin: 0;
    }

    /* Paginación */
    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1.25rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .pagination-size {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }
    .select-size {
      width: auto !important;
      padding: 0.3rem 0.6rem !important;
      font-size: 0.8125rem !important;
    }
    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .pagination-btn {
      width: 34px;
      height: 34px;
      border-radius: var(--radius-sm);
      border: 1px solid rgba(203, 213, 225, 0.8);
      background: rgba(255, 255, 255, 0.9);
      color: #334155;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--transition-fast);
    }
    .pagination-btn:hover:not(:disabled) {
      background: #ffffff;
      border-color: #1d1e1c;
      color: #1d1e1c;
    }
    .pagination-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .pagination-pages {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .page-number-btn {
      min-width: 34px;
      height: 34px;
      padding: 0 0.5rem;
      border-radius: var(--radius-sm);
      border: 1px solid transparent;
      background: transparent;
      color: #475569;
      font-weight: 600;
      font-size: 0.8125rem;
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    .page-number-btn:hover {
      background: #f1f5f9;
      color: #222c57;
    }
    .page-number-btn.active {
      background: #222c57;
      color: #ffffff;
      border-bottom: 2px solid #c4a857;
      box-shadow: 0 2px 6px rgba(34, 44, 87, 0.3);
    }

    /* Expediente Vista Detalle */
    .expediente-panel {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .expediente-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.75rem;
      gap: 1.5rem;
      flex-wrap: wrap;
    }
    .expediente-header-info {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      flex-wrap: wrap;
    }
    .expediente-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .expediente-doc-badge {
      font-size: 0.8125rem;
      font-weight: 700;
      color: #222c57;
      background: rgba(34, 44, 87, 0.1);
      border: 1px solid rgba(34, 44, 87, 0.22);
      padding: 0.2rem 0.55rem;
      border-radius: 9999px;
    }
    .expediente-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .expediente-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    .card-header-styled {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 0.75rem;
      margin-bottom: 1rem;
    }
    .card-title {
      font-size: 1rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .card-subtitle {
      font-size: 0.875rem;
      font-weight: 700;
      color: #475569;
      margin: 1.25rem 0 0.5rem 0;
    }
    .info-group {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid rgba(241, 245, 249, 0.8);
      font-size: 0.875rem;
    }
    .info-label {
      font-weight: 500;
      color: #64748b;
    }
    .info-value {
      font-weight: 600;
      color: #0f172a;
    }
    .json-datos {
      background: rgba(248, 250, 252, 0.8);
      border: 1px solid #e2e8f0;
      border-radius: var(--radius-sm);
      padding: 0.75rem;
    }
    .datos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 0.5rem;
    }
    .dato-item {
      display: flex;
      flex-direction: column;
      font-size: 0.8125rem;
    }
    .dato-clave {
      color: #64748b;
      font-size: 0.75rem;
    }
    .dato-valor {
      font-weight: 600;
      color: #0f172a;
    }
    .card-title-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .section-hint {
      font-size: 0.8125rem;
      margin: 0.25rem 0 0.75rem 0;
    }
    .archivos-lista {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
      max-height: 320px;
      overflow-y: auto;
      padding-right: 0.375rem;
    }
    .archivos-lista::-webkit-scrollbar {
      width: 6px;
    }
    .archivos-lista::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 4px;
    }
    .item-marcado-banner {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: rgba(254, 243, 199, 0.7);
      border: 1px solid #fde68a;
      border-radius: var(--radius-sm);
      margin-bottom: 1rem;
    }
    .banner-content {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }
    .banner-sub {
      font-size: 0.75rem;
      text-transform: uppercase;
      font-weight: 600;
      color: #92400e;
      letter-spacing: 0.03em;
    }
    .banner-title {
      font-size: 0.9375rem;
      color: #78350f;
    }
    .archivo-item {
      background: rgba(248, 250, 252, 0.85);
      border: 1px solid #e2e8f0;
      border-radius: var(--radius-sm);
      padding: 0.75rem 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .archivo-acciones {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .archivo-info {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .archivo-meta {
      font-size: 0.75rem;
      color: #64748b;
    }
    .archivo-buttons {
      display: flex;
      gap: 0.5rem;
    }
    .observaciones-previas {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 0.75rem;
    }
    .obs-item {
      background: rgba(254, 242, 242, 0.6);
      border: 1px solid #fecaca;
      border-radius: var(--radius-sm);
      padding: 0.75rem;
    }
    .obs-header {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: #991b1b;
      margin-bottom: 0.35rem;
    }
    .obs-texto {
      margin: 0;
      font-size: 0.875rem;
      color: #7f1d1d;
    }
    .marcas-previas {
      margin: 0.5rem 0 0 1rem;
      padding: 0;
      font-size: 0.8125rem;
      color: #991b1b;
    }

    /* Modal de Previsualización (Issue #177) */
    .preview-dialog {
      max-width: 900px !important;
      height: 85vh;
    }
    .preview-body {
      padding: 0 !important;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f1f5f9;
      height: 100%;
      overflow: hidden;
    }
    .preview-title-wrap {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .preview-header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .preview-iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    .preview-image-container {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: auto;
      padding: 1.5rem;
    }
    .preview-img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    }
    .preview-loading,
    .preview-error,
    .preview-unsupported {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      text-align: center;
      gap: 0.75rem;
      color: #475569;
    }

    /* Devolución modal */
    .marca-builder {
      background: rgba(248, 250, 252, 0.8);
      border: 1px solid #e2e8f0;
      border-radius: var(--radius-sm);
      padding: 1rem;
      margin-top: 0.5rem;
    }
    .form-row {
      display: flex;
      gap: 0.75rem;
    }
    .col {
      flex: 1;
    }
    .marcas-lista ul {
      list-style: none;
      padding: 0;
      margin: 0.5rem 0;
    }
    .marcas-lista li {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0.75rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      margin-bottom: 0.35rem;
      font-size: 0.8125rem;
    }

    .alert {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.85rem 1.25rem;
      border-radius: var(--radius-md);
    }
    .alert-content {
      flex: 1;
    }
    .alert-close {
      background: transparent;
      border: none;
      cursor: pointer;
      color: inherit;
      font-size: 1.1rem;
    }
    .spin-animation {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .spin-animation {
        animation: none;
      }
    }
    @media (max-width: 768px) {
      .expediente-grid {
        grid-template-columns: 1fr;
      }
      .filters-row {
        flex-direction: column;
        align-items: stretch;
      }
      .search-box,
      .filter-group,
      .select-filter {
        width: 100%;
        min-width: 0;
      }
    }
  `,
})
export class SupervisorDashboardComponent implements OnInit, OnDestroy {
  protected readonly authService = inject(AuthService);
  private readonly revisionClient = inject(RevisionClient);
  private readonly archivosClient = inject(ArchivosClient);
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly baseUrl = inject(API_BASE_URL, { optional: true }) ?? '';

  readonly pendientes = signal<ResumenRevisionPendienteDto[]>([]);
  readonly filtroTexto = signal<string>('');

  readonly pendientesFiltrados = computed(() => {
    const filtro = this.filtroTexto().trim();
    if (!filtro) return this.pendientes();
    return this.pendientes().filter(
      (p) =>
        coincideBusqueda(p.documento, filtro) ||
        coincideBusqueda(p.nombre, filtro) ||
        coincideBusqueda(p.correo, filtro) ||
        coincideBusqueda(p.estadoActualizacion, filtro),
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

  // Filtros y Búsqueda (Issue #180)
  readonly busquedaTexto = signal<string>('');
  readonly filtroEstado = signal<string>('todos');
  readonly ordenCriterio = signal<string>('fecha-desc');

  // Paginación (Issue #180)
  readonly paginaActual = signal<number>(1);
  readonly tamanoPagina = signal<number>(10);

  // Expediente Seleccionado
  readonly expedienteSeleccionado = signal<ExpedienteRevisionDto | null>(null);
  readonly hojaDeVida = signal<HojaDeVidaDto | null>(null);
  readonly archivosExpediente = signal<ArchivoDto[]>([]);
  readonly datosPersonalesParsed = signal<Record<string, unknown> | null>(null);

  // Modal Devolución
  readonly mostrarModalDevolver = signal<boolean>(false);
  observacionGeneral = signal<string>('');
  nuevaMarcaTipo = signal<string>('Campo');
  nuevaMarcaClave = signal<string>('');
  nuevaMarcaTexto = signal<string>('');
  readonly marcas = signal<MarcaObservacionItem[]>([]);
  readonly itemParaMarcarLabel = signal<string>('');

  private cargaExpediente?: Subscription;

  ngOnDestroy(): void {
    this.cargaExpediente?.unsubscribe();
  }
  // Previsualización de Archivo (Issue #177)
  readonly archivoEnPrevisualizacion = signal<ArchivoPrevisualizacion | null>(null);
  readonly cargandoPrevisualizacion = signal<boolean>(false);
  readonly errorPrevisualizacion = signal<string | null>(null);

  // Métricas Computadas
  readonly totalExpedientes = computed(() => this.pendientes().length);
  readonly conteoEnviados = computed(
    () => this.pendientes().filter((p) => p.estadoActualizacion === 'Enviado').length,
  );
  readonly conteoDevueltos = computed(
    () => this.pendientes().filter((p) => p.estadoActualizacion === 'Devuelto').length,
  );
  readonly conteoAprobados = computed(
    () => this.pendientes().filter((p) => p.estadoActualizacion === 'Aprobado').length,
  );
  readonly conteoBorradores = computed(
    () =>
      this.pendientes().filter(
        (p) => p.estadoActualizacion === 'Borrador' || p.estadoActualizacion === 'Sin Iniciar',
      ).length,
  );

  readonly tieneFiltrosActivos = computed(() => {
    return this.busquedaTexto().trim().length > 0 || this.filtroEstado() !== 'todos';
  });

  // Lista Filtrada y Ordenada
  readonly expedientesFiltrados = computed(() => {
    let lista = [...this.pendientesFiltrados()];
    const estado = this.filtroEstado();
    const orden = this.ordenCriterio();

    // Filtro por estado
    if (estado !== 'todos') {
      lista = lista.filter((item) => item.estadoActualizacion === estado);
    }

    // Ordenamiento
    lista.sort((a, b) => {
      switch (orden) {
        case 'fecha-asc':
          return (
            new Date(a.fechaCreacionUtc || 0).getTime() -
            new Date(b.fechaCreacionUtc || 0).getTime()
          );
        case 'fecha-desc':
          return (
            new Date(b.fechaCreacionUtc || 0).getTime() -
            new Date(a.fechaCreacionUtc || 0).getTime()
          );
        case 'nombre-asc':
          return (a.nombre || '').localeCompare(b.nombre || '');
        case 'nombre-desc':
          return (b.nombre || '').localeCompare(a.nombre || '');
        case 'documento-asc':
          return (a.documento || '').localeCompare(b.documento || '');
        case 'estado':
          return (a.estadoActualizacion || '').localeCompare(b.estadoActualizacion || '');
        default:
          return 0;
      }
    });

    return lista;
  });

  readonly totalFiltrados = computed(() => this.expedientesFiltrados().length);

  readonly totalPaginas = computed(() => {
    const total = this.totalFiltrados();
    const tam = this.tamanoPagina();
    return Math.max(1, Math.ceil(total / tam));
  });

  // Página Visible
  readonly paginaVisible = computed(() => {
    const lista = this.expedientesFiltrados();
    const inicio = (this.paginaActual() - 1) * this.tamanoPagina();
    const fin = inicio + this.tamanoPagina();
    return lista.slice(inicio, fin);
  });

  readonly rangoTexto = computed(() => {
    const total = this.totalFiltrados();
    if (total === 0) return '0 de 0';
    const inicio = (this.paginaActual() - 1) * this.tamanoPagina() + 1;
    const fin = Math.min(inicio + this.tamanoPagina() - 1, total);
    return `${inicio} a ${fin} de ${total}`;
  });

  readonly paginasVisibles = computed(() => {
    const total = this.totalPaginas();
    const actual = this.paginaActual();
    const paginas: number[] = [];
    const rango = 2;

    const inicio = Math.max(1, actual - rango);
    const fin = Math.min(total, actual + rango);

    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }
    return paginas;
  });

  @HostListener('window:keydown.escape')
  onEscapePress(): void {
    if (this.archivoEnPrevisualizacion()) {
      this.cerrarPrevisualizacion();
    } else if (this.mostrarModalDevolver()) {
      this.cerrarModalDevolver();
    }
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

  onBusquedaChange(valor: string): void {
    this.busquedaTexto.set(valor);
    this.paginaActual.set(1);
  }

  onFiltroEstadoChange(valor: string): void {
    this.filtroEstado.set(valor);
    this.paginaActual.set(1);
  }

  setFiltroEstado(estado: string): void {
    this.filtroEstado.set(estado);
    this.paginaActual.set(1);
  }

  limpiarFiltros(): void {
    this.busquedaTexto.set('');
    this.filtroEstado.set('todos');
    this.ordenCriterio.set('fecha-desc');
    this.paginaActual.set(1);
  }

  irAPagina(p: number): void {
    if (p >= 1 && p <= this.totalPaginas()) {
      this.paginaActual.set(p);
    }
  }

  paginaAnterior(): void {
    if (this.paginaActual() > 1) {
      this.paginaActual.update((p) => p - 1);
    }
  }

  paginaSiguiente(): void {
    if (this.paginaActual() < this.totalPaginas()) {
      this.paginaActual.update((p) => p + 1);
    }
  }

  cambiarTamanoPagina(tam: number): void {
    this.tamanoPagina.set(tam);
    this.paginaActual.set(1);
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
    this.cerrarPrevisualizacion();
    this.cargandoExpediente.set(false);
    this.expedienteSeleccionado.set(null);
    this.hojaDeVida.set(null);
    this.archivosExpediente.set([]);
    this.datosPersonalesParsed.set(null);
  }

  iniciarMarcaItem(info: { tipo: string; clave: string; label: string }): void {
    if (this.expedienteSeleccionado()?.estadoActualizacion !== 'Enviado') return;
    this.itemParaMarcarLabel.set(info.label || info.tipo);
    this.nuevaMarcaTipo.set(info.tipo || 'Item');
    this.nuevaMarcaClave.set(info.clave);
    this.nuevaMarcaTexto.set('');
    if (!this.observacionGeneral().trim()) {
      this.observacionGeneral.set(`Se solicita corrección en: ${info.label || info.tipo}`);
    }
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
    this.itemParaMarcarLabel.set('');
    this.observacionGeneral.set('');
    this.marcas.set([]);
    this.nuevaMarcaClave.set('');
    this.nuevaMarcaTexto.set('');
    this.mostrarModalDevolver.set(true);
  }

  cerrarModalDevolver(): void {
    this.mostrarModalDevolver.set(false);
    this.itemParaMarcarLabel.set('');
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
    if (!exp || exp.estadoActualizacion !== 'Enviado') return;

    // Si el revisor redactó un motivo puntual y no pulsó '+ Agregar Marca', agregarla automáticamente
    const clave = this.nuevaMarcaClave().trim();
    const texto = this.nuevaMarcaTexto().trim();
    if (
      clave &&
      texto &&
      !this.marcas().some((m) => m.claveDestino === clave && m.texto === texto)
    ) {
      this.marcas.update((actuales) => [
        ...actuales,
        {
          tipoDestino: this.nuevaMarcaTipo(),
          claveDestino: clave,
          texto,
        },
      ]);
      this.nuevaMarcaTexto.set('');
    }

    let general = this.observacionGeneral().trim();
    if (!general) {
      if (this.itemParaMarcarLabel()) {
        general = `Se solicita corrección en ${this.itemParaMarcarLabel()}`;
      } else if (this.marcas().length > 0) {
        general = 'Se devuelven observaciones puntuales en el expediente.';
      }
      this.observacionGeneral.set(general);
    }

    if (!general) return;

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

  esTipoPdf(tipoContenido?: string, nombreOriginal?: string): boolean {
    const tipo = (tipoContenido || '').toLowerCase();
    const nombre = (nombreOriginal || '').toLowerCase();
    return tipo.includes('pdf') || nombre.endsWith('.pdf');
  }

  esTipoImagen(tipoContenido?: string, nombreOriginal?: string): boolean {
    const tipo = (tipoContenido || '').toLowerCase();
    const nombre = (nombreOriginal || '').toLowerCase();
    return (
      tipo.startsWith('image/') ||
      nombre.endsWith('.jpg') ||
      nombre.endsWith('.jpeg') ||
      nombre.endsWith('.png') ||
      nombre.endsWith('.webp') ||
      nombre.endsWith('.svg')
    );
  }

  previsualizarArchivo(archivoId: string, nombreOriginal: string, tipoContenido?: string): void {
    this.cargandoPrevisualizacion.set(true);
    this.errorPrevisualizacion.set(null);

    const esPdf = this.esTipoPdf(tipoContenido, nombreOriginal);
    const esImagen = this.esTipoImagen(tipoContenido, nombreOriginal);

    this.archivoEnPrevisualizacion.set({
      id: archivoId,
      nombreOriginal,
      tipoContenido: tipoContenido || (esPdf ? 'application/pdf' : 'application/octet-stream'),
      blobUrl: '',
      safeUrl: null,
      esPdf,
      esImagen,
    });

    this.archivosClient.descargarArchivo(archivoId).subscribe({
      next: (res: unknown) => {
        const respuestaObj = res as { data?: Blob };
        const blob =
          respuestaObj?.data instanceof Blob
            ? respuestaObj.data
            : res instanceof Blob
              ? res
              : new Blob([String(res)], {
                  type: esPdf ? 'application/pdf' : 'application/octet-stream',
                });

        const blobUrl = window.URL.createObjectURL(blob);
        const safeUrl = esPdf ? this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl) : null;

        this.archivoEnPrevisualizacion.set({
          id: archivoId,
          nombreOriginal,
          tipoContenido: tipoContenido || blob.type,
          blobUrl,
          safeUrl,
          esPdf,
          esImagen,
        });
        this.cargandoPrevisualizacion.set(false);
      },
      error: (err) => {
        this.errorPrevisualizacion.set(
          mensajeError(err, 'No fue posible cargar la previsualización del archivo.'),
        );
        this.cargandoPrevisualizacion.set(false);
      },
    });
  }

  cerrarPrevisualizacion(): void {
    const actual = this.archivoEnPrevisualizacion();
    if (actual?.blobUrl) {
      window.URL.revokeObjectURL(actual.blobUrl);
    }
    this.archivoEnPrevisualizacion.set(null);
    this.cargandoPrevisualizacion.set(false);
    this.errorPrevisualizacion.set(null);
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

  readonly archivoParaRetirar = signal<ArchivoDto | null>(null);
  motivoRetiro = '';
  readonly retirandoArchivo = signal(false);
  readonly errorRetiro = signal('');

  iniciarRetiroArchivo(archivo: ArchivoDto): void {
    this.archivoParaRetirar.set(archivo);
    this.motivoRetiro = '';
    this.errorRetiro.set('');
  }

  cancelarRetiroArchivo(): void {
    this.archivoParaRetirar.set(null);
    this.motivoRetiro = '';
    this.errorRetiro.set('');
  }

  confirmarRetiroArchivo(): void {
    const archivo = this.archivoParaRetirar();
    if (!archivo) return;
    const motivo = this.motivoRetiro.trim();
    if (!motivo || motivo.length < 5) {
      this.errorRetiro.set('Debe ingresar un motivo obligatorio (mínimo 5 caracteres).');
      return;
    }

    this.retirandoArchivo.set(true);
    this.errorRetiro.set('');
    this.archivosClient.retirarArchivoSupervisor(archivo.id, { motivo }).subscribe({
      next: () => {
        this.retirandoArchivo.set(false);
        this.archivoParaRetirar.set(null);
        this.motivoRetiro = '';
        this.mensajeExito.set('El adjunto ha sido retirado del expediente exitosamente.');
        const exp = this.expedienteSeleccionado();
        if (exp) {
          this.revisionClient.listarArchivosExpediente(exp.documento).subscribe({
            next: (archivos) => this.archivosExpediente.set(archivos),
          });
        }
      },
      error: (err) => {
        this.retirandoArchivo.set(false);
        this.errorRetiro.set(mensajeError(err, 'Error al retirar el archivo adjunto.'));
      },
    });
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

          const blobUrl = window.URL.createObjectURL(blob);
          const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);

          this.archivoEnPrevisualizacion.set({
            id: 'hdv-pdf',
            nombreOriginal: nombreArchivo,
            tipoContenido: 'application/pdf',
            blobUrl,
            safeUrl,
            esPdf: true,
            esImagen: false,
          });
          this.cargandoPrevisualizacion.set(false);
          this.descargandoPdf.set(false);
        },
        error: (err) => {
          this.error.set(mensajeError(err, 'Error al descargar la hoja de vida en PDF.'));
          this.descargandoPdf.set(false);
        },
      });
  }
}
