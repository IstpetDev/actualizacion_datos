import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
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

type TabAdmin = 'campanas' | 'personas' | 'exportacion' | 'configuracion';

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
      <nav class="admin-tabs" role="tablist">
        <button
          type="button"
          class="tab-btn"
          [class.active]="tabActiva() === 'campanas'"
          (click)="cambiarTab('campanas')"
          data-testid="tab-campanas"
        >
          Gestión de Campañas
        </button>
        <button
          type="button"
          class="tab-btn"
          [class.active]="tabActiva() === 'personas'"
          (click)="cambiarTab('personas')"
          data-testid="tab-personas"
        >
          Carga de Personas (Nómina)
        </button>
        <button
          type="button"
          class="tab-btn"
          [class.active]="tabActiva() === 'exportacion'"
          (click)="cambiarTab('exportacion')"
          data-testid="tab-exportacion"
        >
          Exportación de Datos
        </button>
        <button
          type="button"
          class="tab-btn"
          [class.active]="tabActiva() === 'configuracion'"
          (click)="cambiarTab('configuracion')"
          data-testid="tab-configuracion"
        >
          Configuración de Requisitos
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
        <div class="tab-content" data-testid="contenido-campanas">
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
        <div class="tab-content" data-testid="contenido-personas">
          <div class="grid-dos-columnas">
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
              <h2 class="card-title">Personas de la Institución</h2>
              <div class="table-container">
                <table class="data-table" data-testid="tabla-personas">
                  <thead>
                    <tr>
                      <th>Documento</th>
                      <th>Nombre</th>
                      <th>Correo</th>
                      <th>Rol</th>
                      <th>Acceso</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (per of personas(); track per.id) {
                      <tr>
                        <td>
                          <strong>{{ per.documento }}</strong>
                        </td>
                        <td>{{ per.nombre || '—' }}</td>
                        <td>{{ per.correo || '—' }}</td>
                        <td>
                          <span class="badge badge-info">{{ per.rol }}</span>
                        </td>
                        <td>
                          @if (per.accesoHabilitado) {
                            <span class="badge badge-success" data-testid="acceso-habilitado"
                              >Habilitado</span
                            >
                          } @else {
                            <span class="badge badge-secondary" data-testid="acceso-pendiente"
                              >Pendiente</span
                            >
                          }
                        </td>
                        <td>
                          <span class="badge badge-warning">{{ per.estadoActualizacion }}</span>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="6" class="text-center empty-state">
                          No hay personas registradas en la institución.
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

      <!-- PESTAÑA 3: EXPORTACIÓN DE DATOS (EXCLUSIVO ADMIN / SUPERADMIN) -->
      @if (tabActiva() === 'exportacion') {
        <div class="tab-content" data-testid="contenido-exportacion">
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
        <div class="tab-content" data-testid="contenido-configuracion">
          <app-configuracion-requisitos />
        </div>
      }
      <app-estado-cuentas-bancarias />
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
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
    }
    .fila-archivo .form-control {
      flex: 1;
      min-width: 200px;
    }
    .divisor-o {
      margin: 1.25rem 0;
      text-align: center;
      font-size: 0.8125rem;
      color: #94a3b8;
    }
    .grid-dos-columnas {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    .mt-4 {
      margin-top: 1.5rem;
    }
    .mt-2 {
      margin-top: 0.5rem;
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
    }
    .col {
      flex: 1;
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
    .text-success {
      color: #16a34a;
    }
    .text-muted {
      color: #64748b;
    }
    .table-container {
      overflow-x: auto;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8125rem;
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
    @media (max-width: 768px) {
      .grid-dos-columnas {
        grid-template-columns: 1fr;
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
  readonly listaParaCargar = signal<PersonaCargaItem[]>([]);
  readonly resultadoCarga = signal<ResultadoCargaPersonasDto | null>(null);
  filaDoc = '';
  filaNom = '';
  filaCor = '';
  archivoParaCargar: File | null = null;
  readonly cargandoArchivo = signal(false);

  ngOnInit(): void {
    this.cargarDatosCampanas();
    this.cargarDatosPersonas();
  }

  cambiarTab(tab: TabAdmin): void {
    this.tabActiva.set(tab);
    this.error.set(null);
    this.mensajeExito.set(null);
  }

  cargarDatosCampanas(): void {
    this.campanasClient.obtenerCampanaActiva().subscribe({
      next: (activa) => this.campanaActiva.set(activa),
      error: () => this.campanaActiva.set(null),
    });

    this.campanasClient.listarCampanas().subscribe({
      next: (lista) => this.campanas.set(lista),
      error: (err) => this.error.set(err?.message || 'Error al listar campañas.'),
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
        this.error.set(err?.message || 'Error al crear la campaña.');
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
      },
      error: (err) => {
        this.error.set(err?.message || 'Error al procesar el archivo de nómina.');
        this.cargandoArchivo.set(false);
      },
    });
  }

  cargarDatosPersonas(): void {
    this.personasClient.listarPersonas().subscribe({
      next: (lista) => this.personas.set(lista),
      error: (err) => this.error.set(err?.message || 'Error al listar personas.'),
    });
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
      },
      error: (err) => {
        this.error.set(err?.message || 'Error al procesar la carga de personas.');
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
          let msg = err?.message || 'Error al generar la exportación ZIP.';
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
          let msg = err?.message || 'Error al generar la exportación Excel.';
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
