import { mensajeError } from '../../core/auth/mensaje-error';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  API_BASE_URL,
  CampanaDto,
  CampanasClient,
  CargarPersonasRequest,
  CrearCampanaRequest,
  PersonaCargaItem,
  PersonaDto,
  PersonasClient,
  ResultadoCargaPersonasDto,
} from '../../api-client';
import { AuthService } from '../../core/auth';
import { EstadoCuentasBancariasComponent } from '../cuenta-bancaria/estado-cuentas-bancarias.component';
import { ConfiguracionRequisitosComponent } from './configuracion/configuracion-requisitos.component';
import { InformeNominaComponent } from './nomina/informe-nomina.component';

type TabAdmin = 'campanas' | 'personas' | 'exportacion' | 'configuracion' | 'cuentas';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    EstadoCuentasBancariasComponent,
    InformeNominaComponent,
    ConfiguracionRequisitosComponent,
  ],
  template: `
    <section class="dashboard-section" data-testid="admin-panel">
      <header class="section-header">
        <div class="header-titles">
          <h1 class="section-title">Panel de Administración Institucional</h1>
          <p class="section-subtitle">
            Gestión de períodos de campaña, habilitación y carga de personas, y exportaciones.
          </p>
        </div>
      </header>

      <!-- Pestañas de Navegación -->
      <nav class="admin-tabs" role="tablist" aria-label="Secciones del panel de administración">
        <button
          type="button"
          class="tab-btn"
          role="tab"
          id="tab-btn-campanas"
          aria-controls="panel-campanas"
          [attr.aria-selected]="tabActiva() === 'campanas'"
          [class.active]="tabActiva() === 'campanas'"
          (click)="cambiarTab('campanas')"
          data-testid="tab-campanas"
        >
          Gestión de Campañas
        </button>
        <button
          type="button"
          class="tab-btn"
          role="tab"
          id="tab-btn-personas"
          aria-controls="panel-personas"
          [attr.aria-selected]="tabActiva() === 'personas'"
          [class.active]="tabActiva() === 'personas'"
          (click)="cambiarTab('personas')"
          data-testid="tab-personas"
        >
          Carga de Personas (Nómina)
        </button>
        <button
          type="button"
          class="tab-btn"
          role="tab"
          id="tab-btn-exportacion"
          aria-controls="panel-exportacion"
          [attr.aria-selected]="tabActiva() === 'exportacion'"
          [class.active]="tabActiva() === 'exportacion'"
          (click)="cambiarTab('exportacion')"
          data-testid="tab-exportacion"
        >
          Exportación de Datos
        </button>
        <button
          type="button"
          class="tab-btn"
          role="tab"
          id="tab-btn-configuracion"
          aria-controls="panel-configuracion"
          [attr.aria-selected]="tabActiva() === 'configuracion'"
          [class.active]="tabActiva() === 'configuracion'"
          (click)="cambiarTab('configuracion')"
          data-testid="tab-configuracion"
        >
          Configuración de Requisitos
        </button>
        <button
          type="button"
          class="tab-btn"
          role="tab"
          id="tab-btn-cuentas"
          aria-controls="panel-cuentas"
          [attr.aria-selected]="tabActiva() === 'cuentas'"
          [class.active]="tabActiva() === 'cuentas'"
          (click)="cambiarTab('cuentas')"
          data-testid="tab-cuentas"
        >
          Cuentas Bancarias
        </button>
      </nav>

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

      <!-- PESTAÑA 1: GESTIÓN DE CAMPAÑAS (RF-CAM-001, PD-07) -->
      @if (tabActiva() === 'campanas') {
        <div
          class="tab-content"
          role="tabpanel"
          id="panel-campanas"
          aria-labelledby="tab-btn-campanas"
          data-testid="contenido-campanas"
        >
          <!-- Estado de Preparación Institucional (Checklist del Flujo) -->
          <div class="card card-checklist mb-4" data-testid="checklist-preparacion">
            <h2 class="card-title">Estado de Preparación Institucional</h2>
            <div class="checklist-items">
              <div class="checklist-item">
                <span
                  class="checklist-indicador"
                  [class.listo]="personas().length > 0"
                  data-testid="indicador-nomina"
                >
                  {{ personas().length > 0 ? '✓' : '—' }}
                </span>
                <div class="checklist-detalle">
                  <strong>Nómina Institucional:</strong>
                  @if (personas().length > 0) {
                    <span>{{ personas().length }} personas registradas en nómina.</span>
                  } @else {
                    <span class="text-warning">Sin nómina cargada. </span>
                    <button
                      type="button"
                      class="btn-link"
                      (click)="cambiarTab('personas')"
                      data-testid="link-ir-personas"
                    >
                      Ir a cargar nómina →
                    </button>
                  }
                </div>
              </div>
              <div class="checklist-item">
                <span
                  class="checklist-indicador"
                  [class.listo]="campanaActiva()?.estaAbierta"
                  data-testid="indicador-campana"
                >
                  {{ campanaActiva()?.estaAbierta ? '✓' : '—' }}
                </span>
                <div class="checklist-detalle">
                  <strong>Período de Actualización:</strong>
                  @if (campanaActiva()?.estaAbierta) {
                    <span class="text-success"
                      >Campaña activa en curso para recepción de datos.</span
                    >
                  } @else {
                    <span class="text-muted">Sin campaña abierta en este momento.</span>
                  }
                </div>
              </div>
            </div>
          </div>

          <!-- Campaña Activa Actual -->
          <div class="card card-destacada">
            <h2 class="card-title">Campaña Activa</h2>
            @if (campanaActiva(); as activa) {
              <div class="campana-activa-info" data-testid="campana-activa-info">
                <div class="campana-badge-estado">
                  <span class="badge badge-success">Abierta para Actualización</span>
                </div>
                <h3 class="campana-nombre">{{ activa.nombre }}</h3>
                <div class="campana-fechas">
                  <span
                    ><strong>Desde:</strong>
                    {{ activa.fechaInicioUtc | date: 'dd/MM/yyyy HH:mm' }}</span
                  >
                  <span
                    ><strong>Hasta:</strong>
                    {{ activa.fechaFinUtc | date: 'dd/MM/yyyy HH:mm' }}</span
                  >
                </div>
              </div>
            } @else {
              <div class="alerta-vacia" data-testid="sin-campana-activa">
                <p>No existe ninguna campaña activa abierta en este momento.</p>
                <small class="text-muted"
                  >Cree una nueva campaña para habilitar la recepción y actualización de datos de
                  los usuarios.</small
                >
              </div>
            }
          </div>

          <div class="grid-dos-columnas mt-4">
            <!-- Formulario Crear Campaña -->
            <div class="card">
              <h2 class="card-title">Crear Nueva Campaña</h2>
              <form (ngSubmit)="crearCampana()" data-testid="form-crear-campana">
                <div class="form-group">
                  <label for="nombreCampana">Nombre de Campaña:</label>
                  <input
                    id="nombreCampana"
                    type="text"
                    class="form-control"
                    [(ngModel)]="nuevoNombreCampana"
                    name="nombreCampana"
                    required
                    placeholder="Ej: Campaña Actualización 2026"
                    data-testid="input-nombre-campana"
                  />
                </div>
                <div class="form-row">
                  <div class="form-group col">
                    <label for="fechaInicio">Fecha Inicio:</label>
                    <input
                      id="fechaInicio"
                      type="datetime-local"
                      class="form-control"
                      [(ngModel)]="nuevaFechaInicio"
                      name="fechaInicio"
                      required
                      data-testid="input-fecha-inicio"
                    />
                  </div>
                  <div class="form-group col">
                    <label for="fechaFin">Fecha Fin:</label>
                    <input
                      id="fechaFin"
                      type="datetime-local"
                      class="form-control"
                      [(ngModel)]="nuevaFechaFin"
                      name="fechaFin"
                      required
                      data-testid="input-fecha-fin"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  class="btn btn-primary"
                  [disabled]="guardandoCampana() || !formularioCampanaValido()"
                  data-testid="btn-guardar-campana"
                >
                  {{ guardandoCampana() ? 'Creando...' : 'Crear Campaña' }}
                </button>
              </form>
            </div>

            <!-- Listado de Campañas -->
            <div class="card">
              <h2 class="card-title">Historial de Campañas</h2>
              <div class="table-container">
                <table class="data-table" data-testid="tabla-campanas">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Período</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (camp of campanas(); track camp.id) {
                      <tr>
                        <td>
                          <strong>{{ camp.nombre }}</strong>
                        </td>
                        <td>
                          <small
                            >{{ camp.fechaInicioUtc | date: 'dd/MM/yyyy' }} -
                            {{ camp.fechaFinUtc | date: 'dd/MM/yyyy' }}</small
                          >
                        </td>
                        <td>
                          @if (camp.estaAbierta) {
                            <span class="badge badge-success">Abierta</span>
                          } @else {
                            <span class="badge badge-secondary">Cerrada</span>
                          }
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="3" class="text-center empty-state">
                          No hay campañas registradas.
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

      <!-- PESTAÑA 2: CARGA DE PERSONAS (RF-ACC-001, PD-09) -->
      @if (tabActiva() === 'personas') {
        <div
          class="tab-content"
          role="tabpanel"
          id="panel-personas"
          aria-labelledby="tab-btn-personas"
          data-testid="contenido-personas"
        >
          <div class="grid-personas-layout">
            <!-- Formulario Carga de Personas -->
            <div class="card">
              <h2 class="card-title">Cargar / Habilitar Personas</h2>
              <p class="card-desc">
                Ingrese las personas a habilitar. Puede ingresar una a una o pegar varias filas en
                formato <code>documento,nombre,correo</code>.
              </p>

              <!-- Carga mediante archivo Excel / CSV -->
              <div class="carga-archivo-box card-destacada">
                <h3 class="card-title">Cargar Nómina desde Archivo (.xlsx o .csv)</h3>
                <p class="card-desc">
                  Suba la nómina en formato Excel o CSV. Los registros ya existentes se omitirán sin
                  sobrescribir sus datos (si tenían el acceso pendiente, se habilita) y las personas
                  nuevas se habilitarán con sus datos personales y cuentas bancarias propuestas.
                </p>
                <div class="fila-archivo">
                  <input
                    type="file"
                    #archivoInput
                    accept=".xlsx,.csv"
                    (change)="onArchivoSeleccionado($event)"
                    class="form-control"
                    data-testid="input-archivo-nomina"
                  />
                  <button
                    type="button"
                    class="btn btn-primary"
                    [disabled]="!archivoParaCargar || cargandoArchivo()"
                    (click)="enviarArchivoNomina(archivoInput)"
                    data-testid="btn-subir-archivo-nomina"
                  >
                    {{ cargandoArchivo() ? 'Procesando archivo...' : 'Importar Nómina' }}
                  </button>
                </div>
              </div>

              <div class="divisor-o">
                <span>— o ingrese personas manualmente —</span>
              </div>

              <!-- Formulario simple para añadir fila -->
              <div class="fila-builder">
                <div class="form-row">
                  <div class="form-group col">
                    <label for="docPersona">Cédula / Documento:</label>
                    <input
                      id="docPersona"
                      type="text"
                      class="form-control"
                      [(ngModel)]="filaDoc"
                      placeholder="1700000000"
                      data-testid="input-persona-doc"
                    />
                  </div>
                  <div class="form-group col">
                    <label for="nomPersona">Nombre:</label>
                    <input
                      id="nomPersona"
                      type="text"
                      class="form-control"
                      [(ngModel)]="filaNom"
                      placeholder="Nombre Completo"
                      data-testid="input-persona-nom"
                    />
                  </div>
                </div>
                <div class="form-group">
                  <label for="corPersona">Correo Institucional:</label>
                  <input
                    id="corPersona"
                    type="email"
                    class="form-control"
                    [(ngModel)]="filaCor"
                    placeholder="usuario@ejemplo.test"
                    data-testid="input-persona-cor"
                  />
                </div>
                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  (click)="agregarFilaPersona()"
                  data-testid="btn-agregar-persona-fila"
                >
                  + Añadir a la Lista de Carga
                </button>
              </div>

              <!-- Lista pendiente de envío -->
              @if (listaParaCargar().length > 0) {
                <div class="personas-por-cargar" data-testid="lista-previa-carga">
                  <h4>Personas listas para procesar ({{ listaParaCargar().length }}):</h4>
                  <ul>
                    @for (p of listaParaCargar(); track $index) {
                      <li>
                        <span
                          ><strong>{{ p.documento }}</strong> — {{ p.nombre }} ({{
                            p.correo
                          }})</span
                        >
                        <button
                          type="button"
                          class="btn-link-danger"
                          (click)="quitarFilaPersona($index)"
                        >
                          ✕
                        </button>
                      </li>
                    }
                  </ul>
                  <button
                    type="button"
                    class="btn btn-primary mt-2"
                    (click)="enviarCargaPersonas()"
                    [disabled]="cargandoPersonas()"
                    data-testid="btn-enviar-carga"
                  >
                    {{ cargandoPersonas() ? 'Cargando en sistema...' : 'Procesar Carga Masiva' }}
                  </button>
                </div>
              }

              <!-- Resultado de la última carga (Informe ADR-0012) -->
              @if (resultadoCarga()) {
                <div class="resultado-carga-box" data-testid="resultado-carga">
                  <app-informe-nomina [resultado]="resultadoCarga()"></app-informe-nomina>
                </div>
              }
            </div>

            <!-- Listado de Personas Registradas -->
            <div class="card">
              <div class="card-header-flexible">
                <h2 class="card-title">Personas de la Institución</h2>
                <span class="metrica-total-personas" data-testid="total-personas-badge">
                  Total: {{ personas().length }} personas
                </span>
              </div>
              <p class="texto-aclaratorio-guardado">
                La importación de nómina persiste automáticamente a las personas y sus datos en la
                base de datos al finalizar. No requiere pulsar ningún botón adicional de guardado.
              </p>

              <!-- Barra de Búsqueda y Filtros -->
              <div class="filtros-tabla-personas">
                <div class="filtro-busqueda-input">
                  <label for="buscarPersonaInput" class="visually-hidden">Buscar persona</label>
                  <input
                    id="buscarPersonaInput"
                    type="search"
                    class="form-control"
                    placeholder="Buscar por cédula o nombre…"
                    [ngModel]="filtroBusqueda()"
                    (ngModelChange)="actualizarBusqueda($event)"
                    data-testid="input-buscar-persona"
                  />
                </div>
                <div class="filtro-select-grupo">
                  <label for="filtroAccesoSelect" class="filtro-label">Acceso:</label>
                  <select
                    id="filtroAccesoSelect"
                    class="form-control"
                    [ngModel]="filtroAcceso()"
                    (ngModelChange)="cambiarFiltroAcceso($event)"
                    data-testid="filtro-acceso"
                  >
                    <option value="todos">Todos los accesos ({{ personas().length }})</option>
                    <option value="habilitados">Habilitados ({{ totalHabilitadas() }})</option>
                    <option value="pendientes">Pendientes ({{ totalPendientes() }})</option>
                  </select>
                </div>
                <div class="filtro-select-grupo">
                  <label for="filasPorPaginaSelect" class="filtro-label">Filas:</label>
                  <select
                    id="filasPorPaginaSelect"
                    class="form-control"
                    [ngModel]="filasPorPagina()"
                    (ngModelChange)="cambiarFilasPorPagina($event)"
                    data-testid="select-filas-por-pagina"
                  >
                    <option [ngValue]="25">25 por pág.</option>
                    <option [ngValue]="50">50 por pág.</option>
                    <option [ngValue]="100">100 por pág.</option>
                  </select>
                </div>
              </div>

              <!-- Barra de Acciones Masivas -->
              @if (personasSeleccionadas().size > 0) {
                <div class="barra-acciones-masivas" data-testid="barra-acciones-masivas">
                  <span class="conteo-seleccionadas">
                    <strong>{{ personasSeleccionadas().size }}</strong> persona(s) seleccionada(s)
                  </span>
                  <div class="botones-masivos">
                    <button
                      type="button"
                      class="btn btn-sm btn-success"
                      (click)="cambiarAccesoSeleccionadas(true)"
                      [disabled]="cambiandoAcceso()"
                      data-testid="btn-habilitar-seleccionadas"
                    >
                      Habilitar seleccionadas
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm btn-danger"
                      (click)="cambiarAccesoSeleccionadas(false)"
                      [disabled]="cambiandoAcceso()"
                      data-testid="btn-deshabilitar-seleccionadas"
                    >
                      Deshabilitar seleccionadas
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm btn-secondary"
                      (click)="limpiarSeleccion()"
                      data-testid="btn-limpiar-seleccion"
                    >
                      Deseleccionar
                    </button>
                  </div>
                </div>
              }
              <div class="table-container">
                <table class="data-table tabla-personas" data-testid="tabla-personas">
                  <thead>
                    <tr>
                      <th class="col-checkbox">
                        <input
                          type="checkbox"
                          [checked]="todasSeleccionadas()"
                          [disabled]="personasFiltradasSeleccionables().length === 0"
                          (change)="toggleSeleccionarTodas()"
                          title="Seleccionar todas las visibles"
                          data-testid="checkbox-seleccionar-todas"
                        />
                      </th>
                      <th>Documento</th>
                      <th>Nombre</th>
                      <th>Correo</th>
                      <th>Rol</th>
                      <th>Ficha</th>
                      <th>Acceso</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (per of personasPaginadas(); track per.id) {
                      <tr>
                        <td class="col-checkbox">
                          @if (esUsuarioComun(per)) {
                            <input
                              type="checkbox"
                              [checked]="estaSeleccionada(per.id)"
                              (change)="toggleSeleccion(per.id)"
                              data-testid="checkbox-persona"
                            />
                          }
                        </td>
                        <td>
                          <strong>{{ per.documento }}</strong>
                        </td>
                        <td>{{ per.nombre || '—' }}</td>
                        <td>{{ per.correo || '—' }}</td>
                        <td>
                          <span class="badge badge-info">{{ per.rol }}</span>
                        </td>
                        <td>
                          @if (per.tieneFicha) {
                            <span class="badge badge-success" data-testid="ficha-cargada"
                              >Cargada</span
                            >
                          } @else {
                            <span class="badge badge-secondary" data-testid="ficha-pendiente"
                              >Sin ficha</span
                            >
                          }
                        </td>
                        <td>
                          <div class="acceso-celda">
                            @if (per.accesoHabilitado) {
                              <span class="badge badge-success" data-testid="acceso-habilitado"
                                >Habilitado</span
                              >
                            } @else {
                              <span class="badge badge-secondary" data-testid="acceso-pendiente"
                                >Pendiente</span
                              >
                            }
                            @if (esUsuarioComun(per)) {
                              <button
                                type="button"
                                class="btn-toggle-acceso"
                                [class.btn-deshabilitar]="per.accesoHabilitado"
                                [class.btn-habilitar]="!per.accesoHabilitado"
                                (click)="cambiarAccesoIndividual(per)"
                                [disabled]="cambiandoAcceso()"
                                [attr.data-testid]="'btn-toggle-acceso-' + per.documento"
                                [title]="
                                  per.accesoHabilitado ? 'Deshabilitar acceso' : 'Habilitar acceso'
                                "
                              >
                                {{ per.accesoHabilitado ? 'Deshabilitar' : 'Habilitar' }}
                              </button>
                            }
                          </div>
                        </td>
                        <td>
                          <span class="badge badge-warning">{{ per.estadoActualizacion }}</span>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td
                          colspan="8"
                          class="text-center empty-state"
                          data-testid="estado-personas-vacio"
                        >
                          @if (personas().length === 0) {
                            No hay personas registradas en la institución.
                          } @else {
                            No se encontraron personas que coincidan con el filtro aplicado.
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <!-- Controles de Paginación -->
              @if (personasFiltradas().length > 0) {
                <div class="paginacion-contenedor" data-testid="paginacion-personas">
                  <div class="paginacion-info">
                    Mostrando {{ indicePrimerElemento() }} - {{ indiceUltimoElemento() }} de
                    {{ personasFiltradas().length }} personas
                  </div>
                  <div class="paginacion-botones">
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      (click)="paginaAnterior()"
                      [disabled]="paginaActual() <= 1"
                      data-testid="btn-pagina-anterior"
                    >
                      ← Anterior
                    </button>
                    <span class="paginacion-indicador" data-testid="indicador-pagina-actual">
                      Página {{ paginaActual() }} de {{ totalPaginas() }}
                    </span>
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      (click)="paginaSiguiente()"
                      [disabled]="paginaActual() >= totalPaginas()"
                      data-testid="btn-pagina-siguiente"
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- PESTAÑA 3: EXPORTACIÓN DE DATOS (EXCLUSIVO ADMIN / SUPERADMIN) -->
      @if (tabActiva() === 'exportacion') {
        <div
          class="tab-content"
          role="tabpanel"
          id="panel-exportacion"
          aria-labelledby="tab-btn-exportacion"
          data-testid="contenido-exportacion"
        >
          <div class="card">
            <h2 class="card-title">Exportación de Datos y Archivos Institucionales</h2>
            <p class="card-desc">
              Generación de expedientes en formato ZIP estructurado y resumen tabular en Excel de
              los datos consolidados. Esta opción es exclusiva para el rol Administrador.
            </p>
            <div class="exportacion-info">
              <div class="info-item">
                <strong>Formato del archivo:</strong>
                <span>Carpeta institucional empaquetada en .zip con índice Markdown (.md)</span>
              </div>
              <div class="info-item">
                <strong>Reporte consolidado:</strong>
                <span>Hoja de cálculo Excel (.xlsx) con datos de contacto y estado</span>
              </div>
            </div>
            <div class="acciones-exportacion mt-4">
              <button
                type="button"
                class="btn btn-success"
                (click)="exportarZip()"
                [disabled]="exportandoZip() || exportandoExcel()"
                data-testid="btn-exportar-admin"
              >
                {{ exportandoZip() ? 'Descargando ZIP...' : 'Descargar Paquete ZIP (.zip)' }}
              </button>
              <button
                type="button"
                class="btn btn-primary"
                (click)="exportarExcel()"
                [disabled]="exportandoZip() || exportandoExcel()"
                data-testid="btn-exportar-excel"
              >
                {{ exportandoExcel() ? 'Descargando Excel...' : 'Descargar Reporte Excel (.xlsx)' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- PESTAÑA 4: CONFIGURACIÓN DE REQUISITOS (RF-HDV-012, RF-HDV-013, T-12) -->
      @if (tabActiva() === 'configuracion') {
        <div
          class="tab-content"
          role="tabpanel"
          id="panel-configuracion"
          aria-labelledby="tab-btn-configuracion"
          data-testid="contenido-configuracion"
        >
          <app-configuracion-requisitos />
        </div>
      }

      <!-- PESTAÑA 5: MONITOREO DE CUENTAS BANCARIAS (RF-HDV-027, ADR-0013, Issue #83) -->
      @if (tabActiva() === 'cuentas') {
        <div
          class="tab-content"
          role="tabpanel"
          id="panel-cuentas"
          aria-labelledby="tab-btn-cuentas"
          data-testid="contenido-cuentas"
        >
          <app-estado-cuentas-bancarias #panelCuentas />
        </div>
      }
    </section>
  `,
  styles: `
    .acciones-exportacion {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .dashboard-section {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      padding: 1.5rem;
      max-width: 100%;
      box-sizing: border-box;
      overflow-x: hidden;
    }
    .section-header {
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
    .admin-tabs {
      display: flex;
      gap: 0.5rem;
      border-bottom: 2px solid #e2e8f0;
      margin-bottom: 1.5rem;
      overflow-x: auto;
      overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: thin;
    }
    .tab-btn {
      padding: 0.75rem 1.25rem;
      border: none;
      background: none;
      font-size: 0.875rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      transition: all 0.2s;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .tab-btn:hover {
      color: #0f172a;
    }
    .tab-btn.active {
      color: #2563eb;
      border-bottom-color: #2563eb;
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
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
      overflow: hidden;
    }
    .card-destacada {
      background: #eff6ff;
      border-color: #bfdbfe;
    }
    .card-title {
      font-size: 1rem;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 1rem 0;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 0.5rem;
    }
    .card-desc {
      font-size: 0.875rem;
      color: #64748b;
      margin-bottom: 1rem;
    }
    .carga-archivo-box {
      margin-bottom: 1.25rem;
      border: 1px dashed #93c5fd;
      border-radius: 0.375rem;
      padding: 1rem;
    }
    .fila-archivo {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      align-items: stretch;
    }
    .fila-archivo .form-control {
      width: 100%;
    }
    .fila-archivo .btn {
      width: 100%;
    }
    .divisor-o {
      margin: 1.25rem 0;
      text-align: center;
      font-size: 0.8125rem;
      color: #94a3b8;
    }
    .grid-dos-columnas {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 1.5rem;
      min-width: 0;
    }
    .grid-personas-layout {
      display: grid;
      grid-template-columns: minmax(320px, 360px) minmax(0, 1fr);
      gap: 1.5rem;
      align-items: start;
      min-width: 0;
    }
    .mt-4 {
      margin-top: 1.5rem;
    }
    .mt-2 {
      margin-top: 0.5rem;
    }
    .mb-4 {
      margin-bottom: 1.5rem;
    }
    .card-checklist {
      background: #ffffff;
      border: 1px solid #cbd5e1;
    }
    .checklist-items {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .checklist-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.875rem;
    }
    .checklist-indicador {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 9999px;
      background: #f1f5f9;
      color: #64748b;
      font-weight: 700;
      font-size: 0.8125rem;
      border: 1px solid #cbd5e1;
      flex-shrink: 0;
    }
    .checklist-indicador.listo {
      background: #dcfce7;
      color: #15803d;
      border-color: #86efac;
    }
    .checklist-detalle {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .btn-link {
      background: none;
      border: none;
      color: #2563eb;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      padding: 0;
      text-decoration: underline;
    }
    .btn-link:hover {
      color: #1d4ed8;
    }
    .text-warning {
      color: #b45309;
    }
    .text-success {
      color: #15803d;
    }
    .campana-activa-info {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .campana-nombre {
      font-size: 1.125rem;
      font-weight: 700;
      color: #1e3a8a;
      margin: 0;
    }
    .campana-fechas {
      display: flex;
      gap: 1.5rem;
      font-size: 0.875rem;
      color: #334155;
    }
    .alerta-vacia {
      color: #64748b;
      font-size: 0.875rem;
    }
    .form-group {
      margin-bottom: 1rem;
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
      flex-wrap: wrap;
    }
    .col {
      flex: 1 1 180px;
      min-width: 0;
    }
    .fila-builder {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.375rem;
      padding: 1rem;
      margin-bottom: 1rem;
    }
    .personas-por-cargar {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 0.375rem;
      padding: 0.75rem;
      margin-bottom: 1rem;
    }
    .personas-por-cargar h4 {
      margin: 0 0 0.5rem 0;
      font-size: 0.875rem;
      color: #166534;
    }
    .personas-por-cargar ul {
      margin: 0;
      padding-left: 1.25rem;
      font-size: 0.8125rem;
    }
    .personas-por-cargar li {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.25rem;
    }
    .btn-link-danger {
      background: none;
      border: none;
      color: #dc2626;
      font-size: 0.875rem;
      cursor: pointer;
    }
    .resultado-carga-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 0.375rem;
      padding: 0.75rem;
      font-size: 0.875rem;
    }
    .resultado-carga-box h4 {
      margin: 0 0 0.5rem 0;
      font-size: 0.875rem;
    }
    .text-muted {
      color: #64748b;
    }
    .table-container {
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      border-radius: 0.375rem;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8125rem;
    }
    .data-table.tabla-personas {
      min-width: 680px;
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
    .badge-warning {
      background: #fef3c7;
      color: #92400e;
    }
    .badge-info {
      background: #e0f2fe;
      color: #0369a1;
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
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-sm {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
    }
    .btn-primary {
      background: #2563eb;
      color: #ffffff;
    }
    .btn-secondary {
      background: #f1f5f9;
      color: #334155;
      border-color: #cbd5e1;
    }
    .btn-success {
      background: #16a34a;
      color: #ffffff;
    }
    .exportacion-info {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      font-size: 0.875rem;
      color: #334155;
    }
    .info-item {
      display: flex;
      flex-direction: column;
    }
    .card-header-flexible {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 0.5rem;
    }
    .metrica-total-personas {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #1e3a8a;
      background: #eff6ff;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      border: 1px solid #bfdbfe;
    }
    .texto-aclaratorio-guardado {
      font-size: 0.8125rem;
      color: #64748b;
      margin: 0 0 1rem 0;
    }
    .filtros-tabla-personas {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 1rem;
    }
    .filtro-busqueda-input {
      flex: 1;
      min-width: 220px;
    }
    .filtro-select-grupo {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .filtro-label {
      font-size: 0.8125rem;
      color: #475569;
      font-weight: 500;
    }
    .paginacion-contenedor {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid #e2e8f0;
    }
    .paginacion-info {
      font-size: 0.8125rem;
      color: #64748b;
    }
    .paginacion-botones {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .paginacion-indicador {
      font-size: 0.8125rem;
      font-weight: 500;
      color: #334155;
    }
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    .tabla-filtros-acceso {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
      flex-wrap: wrap;
    }
    .barra-acciones-masivas {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.5rem 0.75rem;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 0.375rem;
      margin-bottom: 0.75rem;
      font-size: 0.8125rem;
    }
    .conteo-seleccionadas {
      color: #1e40af;
    }
    .botones-masivos {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .col-checkbox {
      width: 2.25rem;
      text-align: center;
    }
    .acceso-celda {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      min-width: 110px;
    }
    .btn-toggle-acceso {
      padding: 0.15rem 0.45rem;
      font-size: 0.7rem;
      font-weight: 500;
      border-radius: 0.25rem;
      border: 1px solid transparent;
      cursor: pointer;
    }
    .btn-toggle-acceso:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-deshabilitar {
      background: #fff1f2;
      color: #be123c;
      border-color: #fecdd3;
    }
    .btn-deshabilitar:hover:not(:disabled) {
      background: #ffe4e6;
    }
    .btn-habilitar {
      background: #f0fdf4;
      color: #15803d;
      border-color: #bbf7d0;
    }
    .btn-habilitar:hover:not(:disabled) {
      background: #dcfce7;
    }
    .btn-danger {
      background: #dc2626;
      color: #ffffff;
    }
    @media (max-width: 1024px) {
      .grid-personas-layout {
        grid-template-columns: minmax(0, 1fr);
      }
    }
    @media (max-width: 768px) {
      .grid-dos-columnas {
        grid-template-columns: minmax(0, 1fr);
        gap: 1rem;
      }
    }
    @media (max-width: 640px) {
      .dashboard-section {
        padding: 0.75rem;
      }
      .card {
        padding: 0.875rem;
      }
      .filtros-tabla-personas {
        flex-direction: column;
        align-items: stretch;
      }
      .filtro-busqueda-input {
        min-width: 100%;
      }
      .filtro-select-grupo {
        width: 100%;
        justify-content: space-between;
      }
      .filtro-select-grupo .form-control {
        flex: 1;
      }
      .campana-fechas {
        flex-direction: column;
        gap: 0.25rem;
      }
      .barra-acciones-masivas {
        flex-direction: column;
        align-items: flex-start;
      }
      .botones-masivos {
        width: 100%;
      }
      .botones-masivos .btn {
        flex: 1;
      }
    }
    @media (max-width: 540px) {
      .paginacion-contenedor {
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
      }
      .paginacion-info {
        text-align: center;
      }
      .paginacion-botones {
        width: 100%;
        justify-content: center;
      }
      .acciones-exportacion .btn {
        width: 100%;
      }
    }
    @media (max-width: 480px) {
      .form-row {
        flex-direction: column;
      }
    }
  `,
})
export class AdminDashboardComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  private readonly campanasClient = inject(CampanasClient);
  private readonly personasClient = inject(PersonasClient);
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL, { optional: true }) ?? '';

  readonly tabActiva = signal<TabAdmin>('campanas');
  readonly error = signal<string | null>(null);
  readonly mensajeExito = signal<string | null>(null);

  // Exportación
  readonly exportandoZip = signal<boolean>(false);
  readonly exportandoExcel = signal<boolean>(false);

  // Campañas
  readonly campanaActiva = signal<CampanaDto | null>(null);
  readonly campanas = signal<CampanaDto[]>([]);
  readonly guardandoCampana = signal<boolean>(false);
  nuevoNombreCampana = '';
  nuevaFechaInicio = '';
  nuevaFechaFin = '';

  // Personas
  readonly personas = signal<PersonaDto[]>([]);
  readonly cargandoPersonas = signal<boolean>(false);
  // Control de Acceso y Selección Masiva (Issue #86, ADR-0023)
  readonly filtroAcceso = signal<'todos' | 'habilitados' | 'pendientes'>('todos');
  readonly personasSeleccionadas = signal<Set<string>>(new Set());
  readonly cambiandoAcceso = signal<boolean>(false);

  readonly totalHabilitadas = computed(
    () => this.personas().filter((p) => p.accesoHabilitado).length,
  );
  readonly totalPendientes = computed(
    () => this.personas().filter((p) => !p.accesoHabilitado).length,
  );

  readonly listaParaCargar = signal<PersonaCargaItem[]>([]);
  readonly resultadoCarga = signal<ResultadoCargaPersonasDto | null>(null);
  filaDoc = '';
  filaNom = '';
  filaCor = '';
  archivoParaCargar: File | null = null;
  readonly cargandoArchivo = signal(false);

  // Paginación y filtros de personas
  readonly filtroBusqueda = signal<string>('');
  readonly paginaActual = signal<number>(1);
  readonly filasPorPagina = signal<number>(25);

  readonly personasFiltradas = computed(() => {
    const texto = this.filtroBusqueda().trim().toLowerCase();
    const filtro = this.filtroAcceso();
    return this.personas().filter((p) => {
      const coincideTexto =
        !texto ||
        (p.documento && p.documento.toLowerCase().includes(texto)) ||
        (p.nombre && p.nombre.toLowerCase().includes(texto)) ||
        (p.correo && p.correo.toLowerCase().includes(texto));

      const coincideAcceso =
        filtro === 'todos' ||
        (filtro === 'habilitados' && p.accesoHabilitado) ||
        (filtro === 'pendientes' && !p.accesoHabilitado);

      return coincideTexto && coincideAcceso;
    });
  });

  readonly personasFiltradasSeleccionables = computed(() => {
    return this.personasFiltradas().filter((p) => this.esUsuarioComun(p));
  });

  readonly todasSeleccionadas = computed(() => {
    const seleccionables = this.personasFiltradasSeleccionables();
    if (seleccionables.length === 0) return false;
    const sel = this.personasSeleccionadas();
    return seleccionables.every((p) => sel.has(p.id));
  });

  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.personasFiltradas().length / this.filasPorPagina())),
  );

  readonly personasPaginadas = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.filasPorPagina();
    return this.personasFiltradas().slice(inicio, inicio + this.filasPorPagina());
  });

  readonly indicePrimerElemento = computed(() => {
    if (this.personasFiltradas().length === 0) return 0;
    return (this.paginaActual() - 1) * this.filasPorPagina() + 1;
  });

  readonly indiceUltimoElemento = computed(() =>
    Math.min(this.paginaActual() * this.filasPorPagina(), this.personasFiltradas().length),
  );

  @ViewChild('panelCuentas') panelCuentas?: EstadoCuentasBancariasComponent;

  ngOnInit(): void {
    this.cargarDatosCampanas();
    this.cargarDatosPersonas();
  }

  cambiarTab(tab: TabAdmin): void {
    this.tabActiva.set(tab);
    this.error.set(null);
    this.mensajeExito.set(null);
    if (tab === 'cuentas') {
      this.panelCuentas?.cargar();
    }
  }

  cargarDatosCampanas(): void {
    this.campanasClient.obtenerCampanaActiva().subscribe({
      next: (activa) => this.campanaActiva.set(activa),
      error: () => this.campanaActiva.set(null),
    });

    this.campanasClient.listarCampanas().subscribe({
      next: (lista) => this.campanas.set(lista),
      error: (err) => this.error.set(mensajeError(err, 'Error al listar campañas.')),
    });
  }

  formularioCampanaValido(): boolean {
    return !!this.nuevoNombreCampana.trim() && !!this.nuevaFechaInicio && !!this.nuevaFechaFin;
  }

  crearCampana(): void {
    if (!this.formularioCampanaValido()) return;

    this.guardandoCampana.set(true);
    this.error.set(null);

    const body: CrearCampanaRequest = {
      nombre: this.nuevoNombreCampana.trim(),
      fechaInicioUtc: new Date(this.nuevaFechaInicio),
      fechaFinUtc: new Date(this.nuevaFechaFin),
    };

    this.campanasClient.crearCampana(body).subscribe({
      next: (res) => {
        this.mensajeExito.set(`Campaña "${res.nombre}" creada exitosamente.`);
        this.nuevoNombreCampana = '';
        this.nuevaFechaInicio = '';
        this.nuevaFechaFin = '';
        this.guardandoCampana.set(false);
        this.cargarDatosCampanas();
      },
      error: (err) => {
        this.error.set(mensajeError(err, 'Error al crear la campaña.'));
        this.guardandoCampana.set(false);
      },
    });
  }

  onArchivoSeleccionado(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.archivoParaCargar = input.files[0];
      this.error.set(null);
    } else {
      this.archivoParaCargar = null;
    }
  }

  enviarArchivoNomina(inputElement?: HTMLInputElement): void {
    if (!this.archivoParaCargar) return;

    this.cargandoArchivo.set(true);
    this.error.set(null);

    const fileParam = {
      data: this.archivoParaCargar,
      fileName: this.archivoParaCargar.name,
    };

    this.personasClient.cargarPersonasArchivo(fileParam).subscribe({
      next: (res) => {
        this.resultadoCarga.set(res);
        if (res.totalCargados > 0) {
          const omitidosTexto =
            res.totalDuplicadosOmitidos > 0
              ? ` (${res.totalDuplicadosOmitidos} omitidos por ya existir)`
              : '';
          this.mensajeExito.set(
            `Carga procesada: ${res.totalCargados} personas nuevas habilitadas${omitidosTexto}.`,
          );
        } else if (res.totalDuplicadosOmitidos > 0) {
          this.mensajeExito.set(
            `No hay nuevas personas que cargar: las ${res.totalDuplicadosOmitidos} personas del archivo ya estaban registradas en la institución.`,
          );
        } else {
          this.mensajeExito.set(`Archivo procesado: ${res.totalRecibidos} filas recibidas.`);
        }

        this.archivoParaCargar = null;
        if (inputElement) {
          inputElement.value = '';
        }
        this.cargandoArchivo.set(false);
        this.cargarDatosPersonas();
        this.panelCuentas?.cargar();
      },
      error: (err) => {
        this.error.set(mensajeError(err, 'Error al procesar el archivo de nómina.'));
        this.cargandoArchivo.set(false);
      },
    });
  }

  cargarDatosPersonas(): void {
    this.personasClient.listarPersonas().subscribe({
      next: (lista) => {
        this.personas.set(lista);
        this.paginaActual.set(1);
      },
      error: (err) => this.error.set(mensajeError(err, 'Error al listar personas.')),
    });
  }

  actualizarBusqueda(texto: string): void {
    this.filtroBusqueda.set(texto);
    this.paginaActual.set(1);
  }

  cambiarFilasPorPagina(filas: number): void {
    this.filasPorPagina.set(Number(filas));
    this.paginaActual.set(1);
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

  esUsuarioComun(per: PersonaDto): boolean {
    return per.rol?.toLowerCase() === 'usuario';
  }

  cambiarFiltroAcceso(filtro: 'todos' | 'habilitados' | 'pendientes'): void {
    this.filtroAcceso.set(filtro);
    this.paginaActual.set(1);
    this.limpiarSeleccion();
  }

  estaSeleccionada(id: string): boolean {
    return this.personasSeleccionadas().has(id);
  }

  toggleSeleccion(id: string): void {
    this.personasSeleccionadas.update((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(id)) {
        nuevo.delete(id);
      } else {
        nuevo.add(id);
      }
      return nuevo;
    });
  }

  toggleSeleccionarTodas(): void {
    const seleccionables = this.personasFiltradasSeleccionables();
    const todas = this.todasSeleccionadas();
    this.personasSeleccionadas.update((actual) => {
      const nuevo = new Set(actual);
      if (todas) {
        seleccionables.forEach((p) => nuevo.delete(p.id));
      } else {
        seleccionables.forEach((p) => nuevo.add(p.id));
      }
      return nuevo;
    });
  }

  limpiarSeleccion(): void {
    this.personasSeleccionadas.set(new Set());
  }

  cambiarAccesoIndividual(per: PersonaDto): void {
    const accion = per.accesoHabilitado ? 'deshabilitar' : 'habilitar';
    const confirmar = window.confirm(
      `¿Desea ${accion} el acceso de ${per.nombre || per.documento}?`,
    );
    if (!confirmar) return;

    this.cambiandoAcceso.set(true);
    this.error.set(null);

    const nuevoEstado = !per.accesoHabilitado;
    this.personasClient
      .cambiarAccesoPersonas({
        habilitar: nuevoEstado,
        personaIds: [per.id],
      })
      .subscribe({
        next: (res) => {
          this.mensajeExito.set(
            `Acceso ${nuevoEstado ? 'habilitado' : 'deshabilitado'} exitosamente para ${res.cambiadas} persona(s).`,
          );
          this.cambiandoAcceso.set(false);
          this.cargarDatosPersonas();
        },
        error: (err) => {
          this.error.set(mensajeError(err, 'Error al cambiar el acceso de la persona.'));
          this.cambiandoAcceso.set(false);
        },
      });
  }

  cambiarAccesoSeleccionadas(habilitar: boolean): void {
    const ids = Array.from(this.personasSeleccionadas());
    if (ids.length === 0) return;

    const accion = habilitar ? 'habilitar' : 'deshabilitar';
    const confirmar = window.confirm(
      `¿Desea ${accion} el acceso a las ${ids.length} personas seleccionadas?`,
    );
    if (!confirmar) return;

    this.cambiandoAcceso.set(true);
    this.error.set(null);

    this.personasClient
      .cambiarAccesoPersonas({
        habilitar,
        personaIds: ids,
      })
      .subscribe({
        next: (res) => {
          this.mensajeExito.set(
            `Operación completada: ${res.cambiadas} persona(s) ${habilitar ? 'habilitada(s)' : 'deshabilitada(s)'}` +
              (res.yaEnEstado > 0 ? ` (${res.yaEnEstado} ya estaban en ese estado).` : '.'),
          );
          this.personasSeleccionadas.set(new Set());
          this.cambiandoAcceso.set(false);
          this.cargarDatosPersonas();
        },
        error: (err) => {
          this.error.set(mensajeError(err, 'Error al procesar la actualización masiva de acceso.'));
          this.cambiandoAcceso.set(false);
        },
      });
  }

  actualizarFiltroEstado(estado: 'todos' | 'habilitados' | 'pendientes' | 'habilitado' | 'pendiente'): void {
    const normalizado = estado === 'habilitado' ? 'habilitados' : estado === 'pendiente' ? 'pendientes' : 'todos';
    this.cambiarFiltroAcceso(normalizado);
  }

  agregarFilaPersona(): void {
    const doc = this.filaDoc.trim();
    if (!doc) return;

    const nueva: PersonaCargaItem = {
      documento: doc,
      nombre: this.filaNom.trim() || undefined,
      correo: this.filaCor.trim() || undefined,
    };

    this.listaParaCargar.update((actuales) => [...actuales, nueva]);
    this.filaDoc = '';
    this.filaNom = '';
    this.filaCor = '';
  }

  quitarFilaPersona(index: number): void {
    this.listaParaCargar.update((actuales) => actuales.filter((_, i) => i !== index));
  }

  enviarCargaPersonas(): void {
    if (this.listaParaCargar().length === 0) return;

    this.cargandoPersonas.set(true);
    this.error.set(null);

    const request: CargarPersonasRequest = {
      personas: this.listaParaCargar(),
    };

    this.personasClient.cargarPersonas(request).subscribe({
      next: (res) => {
        this.resultadoCarga.set(res);
        this.mensajeExito.set(`Carga procesada: ${res.totalCargados} personas nuevas habilitadas.`);
        this.listaParaCargar.set([]);
        this.cargandoPersonas.set(false);
        this.cargarDatosPersonas();
        this.panelCuentas?.cargar();
      },
      error: (err) => {
        this.error.set(mensajeError(err, 'Error al procesar la carga de personas.'));
        this.cargandoPersonas.set(false);
      },
    });
  }

  iniciarExportacion(): void {
    this.exportarZip();
  }

  exportarZip(): void {
    if (this.exportandoZip() || this.exportandoExcel()) return;

    this.exportandoZip.set(true);
    this.error.set(null);
    this.mensajeExito.set(null);

    const url = `${this.baseUrl}/api/exportaciones/zip`;
    this.http
      .get(url, {
        responseType: 'blob',
        observe: 'response',
      })
      .subscribe({
        next: (res) => {
          const blob = res.body;
          if (!blob) {
            this.error.set('No se recibió el contenido del archivo.');
            this.exportandoZip.set(false);
            return;
          }
          const nombreArchivo =
            this.extraerNombreArchivo(res.headers.get('content-disposition')) ||
            'exportacion_datos.zip';
          this.descargarBlob(blob, nombreArchivo);
          this.mensajeExito.set('Paquete de exportación ZIP descargado exitosamente.');
          this.exportandoZip.set(false);
        },
        error: async (err) => {
          let msg = mensajeError(err, 'Error al generar la exportación ZIP.');
          if (err?.error instanceof Blob) {
            try {
              const texto = await err.error.text();
              const json = JSON.parse(texto);
              if (json?.mensaje) msg = json.mensaje;
            } catch {
              // fallback a msg
            }
          } else if (err?.error?.mensaje) {
            msg = err.error.mensaje;
          }
          this.error.set(msg);
          this.exportandoZip.set(false);
        },
      });
  }

  exportarExcel(): void {
    if (this.exportandoZip() || this.exportandoExcel()) return;

    this.exportandoExcel.set(true);
    this.error.set(null);
    this.mensajeExito.set(null);

    const url = `${this.baseUrl}/api/exportaciones/excel`;
    this.http
      .get(url, {
        responseType: 'blob',
        observe: 'response',
      })
      .subscribe({
        next: (res) => {
          const blob = res.body;
          if (!blob) {
            this.error.set('No se recibió el contenido del archivo.');
            this.exportandoExcel.set(false);
            return;
          }
          const nombreArchivo =
            this.extraerNombreArchivo(res.headers.get('content-disposition')) ||
            'exportacion_datos.xlsx';
          this.descargarBlob(blob, nombreArchivo);
          this.mensajeExito.set('Reporte Excel descargado exitosamente.');
          this.exportandoExcel.set(false);
        },
        error: async (err) => {
          let msg = mensajeError(err, 'Error al generar la exportación Excel.');
          if (err?.error instanceof Blob) {
            try {
              const texto = await err.error.text();
              const json = JSON.parse(texto);
              if (json?.mensaje) msg = json.mensaje;
            } catch {
              // fallback a msg
            }
          } else if (err?.error?.mensaje) {
            msg = err.error.mensaje;
          }
          this.error.set(msg);
          this.exportandoExcel.set(false);
        },
      });
  }

  private descargarBlob(blob: Blob, nombreArchivo: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  private extraerNombreArchivo(contentDisposition: string | null): string | null {
    if (!contentDisposition) return null;
    const match = /filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?/i.exec(contentDisposition);
    return match ? decodeURIComponent(match[1]) : null;
  }
}
