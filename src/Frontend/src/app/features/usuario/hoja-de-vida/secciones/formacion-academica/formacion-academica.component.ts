import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ElementoCatalogoDto,
  GuardarTituloAcademicoRequest,
  GuardarTituloEnCursoRequest,
  TituloAcademicoDto,
  TituloEnCursoDto,
} from '../../../../../api-client';
import { MarcaObservacionComponent } from '../../componentes/marca-observacion.component';
import { UploaderRespaldoComponent } from '../../componentes/uploader-respaldo.component';
import { CatalogosCacheService } from '../../servicios/catalogos-cache.service';
import { HojaDeVidaStateService } from '../../servicios/hoja-de-vida-state.service';

@Component({
  selector: 'app-formacion-academica',
  standalone: true,
  imports: [CommonModule, FormsModule, UploaderRespaldoComponent, MarcaObservacionComponent],
  template: `
    <section class="seccion-formacion" data-testid="seccion-formacion-academica">
      <header class="seccion-header">
        <div class="header-titulos">
          <h2 class="seccion-titulo">2. Instrucción Formal y Formación Académica</h2>
          <p class="seccion-desc">
            Registre sus títulos académicos obtenidos y estudios de grado o posgrado actualmente en
            curso. Para enviar a revisión es obligatorio tener al menos un estudio registrado
            (RF-HDV-019) y su respectivo respaldo (RF-HDV-024).
          </p>
        </div>
      </header>

      <!-- Sub-Pestañas de Formación -->
      <nav class="subtabs-nav" role="tablist">
        <button
          type="button"
          class="subtab-btn"
          [class.active]="subtabActiva() === 'obtenidos'"
          (click)="subtabActiva.set('obtenidos')"
          data-testid="subtab-obtenidos"
        >
          Títulos Obtenidos ({{ titulos().length }})
        </button>
        <button
          type="button"
          class="subtab-btn"
          [class.active]="subtabActiva() === 'en-curso'"
          (click)="subtabActiva.set('en-curso')"
          data-testid="subtab-en-curso"
        >
          Estudios en Curso ({{ titulosEnCurso().length }})
        </button>
      </nav>

      <!-- SUBTAB 1: TÍTULOS OBTENIDOS -->
      @if (subtabActiva() === 'obtenidos') {
        <div class="subtab-content" data-testid="contenido-titulos-obtenidos">
          <div class="acciones-barra">
            @if (puedeEditar() && !mostrarFormTitulo()) {
              <button
                type="button"
                class="btn btn-primary btn-sm"
                (click)="abrirFormTitulo()"
                data-testid="btn-nuevo-titulo"
              >
                + Registrar Título Académico
              </button>
            }
          </div>

          <!-- Formulario / Modal Inline de Título -->
          @if (mostrarFormTitulo()) {
            <div class="card-formulario-item" data-testid="form-titulo">
              <h3 class="form-titulo-item">
                {{ idTituloEdicion() ? 'Editar Título Académico' : 'Nuevo Título Académico' }}
              </h3>

              <div class="grid-dos">
                <div class="form-group">
                  <label for="nivelAcademico"
                    >Nivel Académico <span class="text-danger">*</span></label
                  >
                  <select
                    id="nivelAcademico"
                    class="form-control"
                    [ngModel]="nivelSeleccionadoId()"
                    (ngModelChange)="onNivelChange($event)"
                    data-testid="select-nivel-academico"
                  >
                    <option [ngValue]="undefined">Seleccione nivel...</option>
                    @for (n of nivelesAcademicos(); track n.id) {
                      <option [ngValue]="n.id">{{ n.nombre }}</option>
                    }
                  </select>
                </div>

                <div class="form-group">
                  <label for="gradoAcademico"
                    >Grado Académico <span class="text-danger">*</span></label
                  >
                  <select
                    id="gradoAcademico"
                    class="form-control"
                    [(ngModel)]="modeloTitulo.gradoAcademicoId"
                    [disabled]="!nivelSeleccionadoId()"
                    data-testid="select-grado-academico"
                  >
                    <option [ngValue]="undefined">Seleccione grado...</option>
                    @for (g of gradosAcademicos(); track g.id) {
                      <option [ngValue]="g.id">{{ g.nombre }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="form-group mt-3">
                <label for="nombreTitulo"
                  >Nombre Completo del Título <span class="text-danger">*</span></label
                >
                <input
                  id="nombreTitulo"
                  type="text"
                  class="form-control"
                  [(ngModel)]="modeloTitulo.nombreTitulo"
                  placeholder="Ej. Licenciado en Ciencias de la Educación"
                  data-testid="input-nombre-titulo"
                />
              </div>

              <div class="grid-dos mt-3">
                <div class="form-group">
                  <label for="universidad">Universidad / Institución de Educación Superior</label>
                  <select
                    id="universidad"
                    class="form-control"
                    [(ngModel)]="modeloTitulo.universidadId"
                    data-testid="select-universidad"
                  >
                    <option [ngValue]="undefined">Seleccione institución o ingrese otra...</option>
                    @for (u of universidades(); track u.id) {
                      <option [ngValue]="u.id">{{ u.nombre }}</option>
                    }
                  </select>
                </div>

                <div class="form-group">
                  <label for="institucionOtra">Otra Institución (si no aparece en catálogo)</label>
                  <input
                    id="institucionOtra"
                    type="text"
                    class="form-control"
                    [(ngModel)]="modeloTitulo.nombreInstitucionOtra"
                    placeholder="Institución internacional o externa"
                    data-testid="input-institucion-otra"
                  />
                </div>
              </div>

              <div class="grid-dos mt-3">
                <div class="form-group">
                  <label for="registroSenescyt">N° de Registro SENESCYT</label>
                  <input
                    id="registroSenescyt"
                    type="text"
                    class="form-control"
                    [(ngModel)]="modeloTitulo.numeroRegistroSenescyt"
                    placeholder="1005-2020-123456"
                    data-testid="input-registro-senescyt"
                  />
                </div>

                <div class="form-group">
                  <label for="fechaObtencion">Fecha de Obtención / Graduación</label>
                  <input
                    id="fechaObtencion"
                    type="date"
                    class="form-control"
                    [ngModel]="fechaObtencionStr"
                    (ngModelChange)="onFechaObtencionChange($event)"
                    data-testid="input-fecha-obtencion"
                  />
                </div>
              </div>

              <!-- Archivo de Respaldo Obligatorio (RF-HDV-006, RF-HDV-024) -->
              <div class="mt-3">
                <app-uploader-respaldo
                  etiqueta="Certificado o Copia de Título"
                  ayuda="Obligatorio para validar el estudio. PDF o imagen (máx. 10 MB, aviso desde 5 MB)"
                  [requerido]="true"
                  [puedeEditar]="puedeEditar()"
                  [archivoId]="modeloTitulo.archivoId"
                  (archivoIdChange)="modeloTitulo.archivoId = $event"
                  (archivoEliminado)="modeloTitulo.archivoId = undefined"
                ></app-uploader-respaldo>
              </div>

              @if (errorFormulario()) {
                <div class="alert alert-danger mt-2" data-testid="error-titulo">
                  {{ errorFormulario() }}
                </div>
              }

              <div class="form-botones-item mt-4">
                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  (click)="cancelarFormTitulo()"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  class="btn btn-primary btn-sm"
                  [disabled]="guardando()"
                  (click)="guardarTitulo()"
                  data-testid="btn-guardar-titulo"
                >
                  {{ guardando() ? 'Guardando...' : 'Guardar Título' }}
                </button>
              </div>
            </div>
          }

          <!-- Tabla de Títulos Registrados -->
          <div class="table-container mt-3">
            <table class="data-table" data-testid="tabla-titulos">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Institución</th>
                  <th>Registro SENESCYT</th>
                  <th>Respaldo</th>
                  <th class="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (t of titulos(); track t.id) {
                  <tr>
                    <td>
                      <strong>{{ t.nombreTitulo }}</strong>
                      <!-- Marca de observación si existe -->
                      <app-marca-observacion
                        [marca]="obtenerMarca('titulo', t.id)"
                      ></app-marca-observacion>
                    </td>
                    <td>{{ t.nombreInstitucionOtra || 'Catálogo Oficial' }}</td>
                    <td>{{ t.numeroRegistroSenescyt || '—' }}</td>
                    <td>
                      @if (t.archivoId) {
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
                          (click)="editarTitulo(t)"
                          data-testid="btn-editar-titulo"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          class="btn-accion btn-eliminar"
                          (click)="eliminarTitulo(t.id)"
                          data-testid="btn-eliminar-titulo"
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
                    <td colspan="5" class="text-center empty-state">
                      No ha registrado títulos académicos obtenidos todavía.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- SUBTAB 2: ESTUDIOS EN CURSO (RF-HDV-005) -->
      @if (subtabActiva() === 'en-curso') {
        <div class="subtab-content" data-testid="contenido-titulos-en-curso">
          <div class="acciones-barra">
            @if (puedeEditar() && !mostrarFormEnCurso()) {
              <button
                type="button"
                class="btn btn-primary btn-sm"
                (click)="abrirFormEnCurso()"
                data-testid="btn-nuevo-en-curso"
              >
                + Registrar Estudio en Curso
              </button>
            }
          </div>

          <!-- Formulario / Modal Inline de Estudio en Curso -->
          @if (mostrarFormEnCurso()) {
            <div class="card-formulario-item" data-testid="form-en-curso">
              <h3 class="form-titulo-item">
                {{ idEnCursoEdicion() ? 'Editar Estudio en Curso' : 'Nuevo Estudio en Curso' }}
              </h3>

              <div class="form-group">
                <label for="nombrePrograma"
                  >Nombre del Programa / Carrera <span class="text-danger">*</span></label
                >
                <input
                  id="nombrePrograma"
                  type="text"
                  class="form-control"
                  [(ngModel)]="modeloEnCurso.nombrePrograma"
                  placeholder="Ej. Maestría en Inteligencia Artificial"
                  data-testid="input-nombre-programa"
                />
              </div>

              <div class="grid-dos mt-3">
                <div class="form-group">
                  <label for="gradoEnCurso"
                    >Grado que Obtendrá <span class="text-danger">*</span></label
                  >
                  <select
                    id="gradoEnCurso"
                    class="form-control"
                    [(ngModel)]="modeloEnCurso.gradoAcademicoId"
                    data-testid="select-grado-en-curso"
                  >
                    <option [ngValue]="undefined">Seleccione grado...</option>
                    @for (g of todosLosGrados(); track g.id) {
                      <option [ngValue]="g.id">{{ g.nombre }}</option>
                    }
                  </select>
                </div>

                <div class="form-group">
                  <label for="institucionEnCurso"
                    >Institución Educativa <span class="text-danger">*</span></label
                  >
                  <input
                    id="institucionEnCurso"
                    type="text"
                    class="form-control"
                    [(ngModel)]="modeloEnCurso.nombreInstitucionOtra"
                    placeholder="Universidad donde cursa los estudios"
                    data-testid="input-institucion-en-curso"
                  />
                </div>
              </div>

              <!-- Checkbox condicional de Beca (RF-HDV-005) -->
              <div class="form-check mt-3">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    [(ngModel)]="tieneBeca"
                    (ngModelChange)="onBecaToggle($event)"
                    data-testid="checkbox-tiene-beca"
                  />
                  <span>¿Cuenta con financiamiento o beca de estudios? (RF-HDV-005)</span>
                </label>
              </div>

              @if (tieneBeca) {
                <div class="beca-campos-box mt-2" data-testid="seccion-beca">
                  <div class="grid-dos">
                    <div class="form-group">
                      <label for="porcentajeBeca">Porcentaje de Cobertura (%)</label>
                      <input
                        id="porcentajeBeca"
                        type="number"
                        min="1"
                        max="100"
                        class="form-control"
                        [(ngModel)]="modeloEnCurso.porcentajeBeca"
                        placeholder="100"
                        data-testid="input-porcentaje-beca"
                      />
                    </div>

                    <div class="form-group">
                      <label for="montoBeca">Monto de la Beca (USD)</label>
                      <input
                        id="montoBeca"
                        type="number"
                        min="0"
                        class="form-control"
                        [(ngModel)]="modeloEnCurso.montoBeca"
                        placeholder="5000"
                        data-testid="input-monto-beca"
                      />
                    </div>
                  </div>
                </div>
              }

              <!-- Respaldo de matrícula o certificado de estudios -->
              <div class="mt-3">
                <app-uploader-respaldo
                  etiqueta="Certificado de Matrícula o Estudios"
                  ayuda="Obligatorio para justificar el estudio en curso (máx. 10 MB)"
                  [requerido]="true"
                  [puedeEditar]="puedeEditar()"
                  [archivoId]="modeloEnCurso.archivoId"
                  (archivoIdChange)="modeloEnCurso.archivoId = $event"
                  (archivoEliminado)="modeloEnCurso.archivoId = undefined"
                ></app-uploader-respaldo>
              </div>

              @if (errorFormulario()) {
                <div class="alert alert-danger mt-2">
                  {{ errorFormulario() }}
                </div>
              }

              <div class="form-botones-item mt-4">
                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  (click)="cancelarFormEnCurso()"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  class="btn btn-primary btn-sm"
                  [disabled]="guardando()"
                  (click)="guardarEnCurso()"
                  data-testid="btn-guardar-en-curso"
                >
                  {{ guardando() ? 'Guardando...' : 'Guardar Estudio' }}
                </button>
              </div>
            </div>
          }

          <!-- Tabla de Estudios en Curso -->
          <div class="table-container mt-3">
            <table class="data-table" data-testid="tabla-en-curso">
              <thead>
                <tr>
                  <th>Programa</th>
                  <th>Institución</th>
                  <th>Beca</th>
                  <th>Respaldo</th>
                  <th class="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (c of titulosEnCurso(); track c.id) {
                  <tr>
                    <td>
                      <strong>{{ c.nombrePrograma }}</strong>
                      <app-marca-observacion
                        [marca]="obtenerMarca('titulo_en_curso', c.id)"
                      ></app-marca-observacion>
                    </td>
                    <td>{{ c.nombreInstitucionOtra || '—' }}</td>
                    <td>
                      @if (c.porcentajeBeca || c.montoBeca) {
                        <span class="badge badge-info">Beca {{ c.porcentajeBeca ?? 0 }}%</span>
                      } @else {
                        <span class="text-muted">Sin beca</span>
                      }
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
                          (click)="editarEnCurso(c)"
                          data-testid="btn-editar-en-curso"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          class="btn-accion btn-eliminar"
                          (click)="eliminarEnCurso(c.id)"
                          data-testid="btn-eliminar-en-curso"
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
                    <td colspan="5" class="text-center empty-state">
                      No registra estudios actualmente en curso.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </section>
  `,
  styles: [
    `
      .seccion-formacion {
        padding: 1.25rem 0;
      }
      .seccion-header {
        margin-bottom: 1rem;
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
      .subtabs-nav {
        display: flex;
        gap: 0.5rem;
        border-bottom: 2px solid #e2e8f0;
        margin-bottom: 1.25rem;
      }
      .subtab-btn {
        background: transparent;
        border: none;
        padding: 0.625rem 1rem;
        font-size: 0.875rem;
        font-weight: 600;
        color: #64748b;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        margin-bottom: -2px;
      }
      .subtab-btn.active {
        color: var(--ammi-primary, #1d1e1c);
        border-bottom-color: var(--ammi-primary, #1d1e1c);
      }
      .acciones-barra {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 1rem;
      }
      .card-formulario-item {
        background: rgba(255, 255, 255, 0.78);
        backdrop-filter: blur(14px);
        border: 1px solid rgba(255, 255, 255, 0.9);
        outline: 1px solid rgba(148, 163, 184, 0.28);
        border-radius: 12px;
        box-shadow: var(--glass-shadow-sm);
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
      .form-check {
        display: flex;
        align-items: center;
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
      .beca-campos-box {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 0.875rem;
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
      .empty-state {
        color: #94a3b8;
        padding: 1.5rem !important;
      }
    `,
  ],
})
export class FormacionAcademicaComponent implements OnInit {
  private readonly state = inject(HojaDeVidaStateService);
  private readonly catalogos = inject(CatalogosCacheService);

  readonly puedeEditar = this.state.puedeEditar;
  readonly guardando = this.state.guardando;

  readonly titulos = this.state.titulos;
  readonly titulosEnCurso = this.state.titulosEnCurso;

  readonly subtabActiva = signal<'obtenidos' | 'en-curso'>('obtenidos');

  // Catálogos
  readonly nivelesAcademicos = signal<ElementoCatalogoDto[]>([]);
  readonly gradosAcademicos = signal<ElementoCatalogoDto[]>([]);
  readonly todosLosGrados = signal<ElementoCatalogoDto[]>([]);
  readonly universidades = signal<ElementoCatalogoDto[]>([]);

  readonly nivelSeleccionadoId = signal<number | undefined>(undefined);

  // Formulario Título Obtenido
  readonly mostrarFormTitulo = signal(false);
  readonly idTituloEdicion = signal<string | undefined>(undefined);
  readonly errorFormulario = signal('');
  fechaObtencionStr = '';

  modeloTitulo: GuardarTituloAcademicoRequest = {
    nombreTitulo: '',
    gradoAcademicoId: 0,
    universidadId: undefined,
    nombreInstitucionOtra: undefined,
    numeroRegistroSenescyt: undefined,
    fechaObtencion: undefined,
    archivoId: undefined,
  };

  // Formulario Estudio en Curso
  readonly mostrarFormEnCurso = signal(false);
  readonly idEnCursoEdicion = signal<string | undefined>(undefined);
  tieneBeca = false;

  modeloEnCurso: GuardarTituloEnCursoRequest = {
    nombrePrograma: '',
    gradoAcademicoId: 0,
    nombreInstitucionOtra: '',
    porcentajeBeca: undefined,
    montoBeca: undefined,
    archivoId: undefined,
  };

  ngOnInit(): void {
    this.catalogos.nivelesAcademicos().subscribe((n) => this.nivelesAcademicos.set(n));
    this.catalogos.universidades().subscribe((u) => this.universidades.set(u));
    // Cargar todos los grados para estudios en curso
    this.catalogos.obtener('GradoAcademico').subscribe((g) => this.todosLosGrados.set(g));
  }

  onNivelChange(nivelId?: number): void {
    this.nivelSeleccionadoId.set(nivelId);
    this.gradosAcademicos.set([]);
    this.modeloTitulo.gradoAcademicoId = 0;

    if (nivelId) {
      this.catalogos.gradosAcademicos(nivelId).subscribe((g) => this.gradosAcademicos.set(g));
    }
  }

  onFechaObtencionChange(valor: string): void {
    this.fechaObtencionStr = valor;
    this.modeloTitulo.fechaObtencion = valor ? new Date(valor) : undefined;
  }

  abrirFormTitulo(): void {
    this.idTituloEdicion.set(undefined);
    this.errorFormulario.set('');
    this.fechaObtencionStr = '';
    this.nivelSeleccionadoId.set(undefined);
    this.modeloTitulo = {
      nombreTitulo: '',
      gradoAcademicoId: 0,
      universidadId: undefined,
      nombreInstitucionOtra: undefined,
      numeroRegistroSenescyt: undefined,
      fechaObtencion: undefined,
      archivoId: undefined,
    };
    this.mostrarFormTitulo.set(true);
  }

  editarTitulo(titulo: TituloAcademicoDto): void {
    this.idTituloEdicion.set(titulo.id);
    this.errorFormulario.set('');
    this.modeloTitulo = {
      nombreTitulo: titulo.nombreTitulo,
      gradoAcademicoId: titulo.gradoAcademicoId,
      universidadId: titulo.universidadId,
      nombreInstitucionOtra: titulo.nombreInstitucionOtra,
      numeroRegistroSenescyt: titulo.numeroRegistroSenescyt,
      fechaObtencion: titulo.fechaObtencion,
      archivoId: titulo.archivoId,
    };
    if (titulo.fechaObtencion) {
      this.fechaObtencionStr = new Date(titulo.fechaObtencion).toISOString().split('T')[0];
    }
    this.mostrarFormTitulo.set(true);
  }

  cancelarFormTitulo(): void {
    this.mostrarFormTitulo.set(false);
    this.idTituloEdicion.set(undefined);
  }

  guardarTitulo(): void {
    if (!this.modeloTitulo.nombreTitulo?.trim()) {
      this.errorFormulario.set('El nombre del título es obligatorio.');
      return;
    }
    if (!this.modeloTitulo.gradoAcademicoId) {
      this.errorFormulario.set('Debe seleccionar el grado académico.');
      return;
    }
    if (!this.modeloTitulo.universidadId && !this.modeloTitulo.nombreInstitucionOtra?.trim()) {
      this.errorFormulario.set(
        'Debe indicar la universidad del catálogo o el nombre de otra institución (RF-HDV-003).',
      );
      return;
    }

    this.state.guardarTitulo(this.modeloTitulo, this.idTituloEdicion()).subscribe({
      next: () => this.cancelarFormTitulo(),
      error: (err) => this.errorFormulario.set(err?.message || 'Error al guardar el título.'),
    });
  }

  eliminarTitulo(id: string): void {
    if (!confirm('¿Está seguro de eliminar este título académico?')) return;
    this.state.eliminarTitulo(id).subscribe();
  }

  // --- Métodos Estudios en Curso ---
  abrirFormEnCurso(): void {
    this.idEnCursoEdicion.set(undefined);
    this.errorFormulario.set('');
    this.tieneBeca = false;
    this.modeloEnCurso = {
      nombrePrograma: '',
      gradoAcademicoId: 0,
      nombreInstitucionOtra: '',
      porcentajeBeca: undefined,
      montoBeca: undefined,
      archivoId: undefined,
    };
    this.mostrarFormEnCurso.set(true);
  }

  editarEnCurso(enCurso: TituloEnCursoDto): void {
    this.idEnCursoEdicion.set(enCurso.id);
    this.errorFormulario.set('');
    this.tieneBeca = !!(enCurso.porcentajeBeca || enCurso.montoBeca);
    this.modeloEnCurso = {
      nombrePrograma: enCurso.nombrePrograma,
      gradoAcademicoId: enCurso.gradoAcademicoId,
      nombreInstitucionOtra: enCurso.nombreInstitucionOtra ?? '',
      porcentajeBeca: enCurso.porcentajeBeca,
      montoBeca: enCurso.montoBeca,
      archivoId: enCurso.archivoId,
    };
    this.mostrarFormEnCurso.set(true);
  }

  cancelarFormEnCurso(): void {
    this.mostrarFormEnCurso.set(false);
    this.idEnCursoEdicion.set(undefined);
  }

  onBecaToggle(activa: boolean): void {
    this.tieneBeca = activa;
    if (!activa) {
      // RF-HDV-005: Limpiar beca si no aplica
      this.modeloEnCurso.porcentajeBeca = undefined;
      this.modeloEnCurso.montoBeca = undefined;
    }
  }

  guardarEnCurso(): void {
    if (!this.modeloEnCurso.nombrePrograma?.trim()) {
      this.errorFormulario.set('El nombre del programa es obligatorio.');
      return;
    }
    if (!this.modeloEnCurso.gradoAcademicoId) {
      this.errorFormulario.set('Debe seleccionar el grado que obtendrá.');
      return;
    }
    if (!this.modeloEnCurso.nombreInstitucionOtra?.trim()) {
      this.errorFormulario.set('Debe especificar la institución educativa.');
      return;
    }

    this.state.guardarTituloEnCurso(this.modeloEnCurso, this.idEnCursoEdicion()).subscribe({
      next: () => this.cancelarFormEnCurso(),
      error: (err) =>
        this.errorFormulario.set(err?.message || 'Error al guardar el estudio en curso.'),
    });
  }

  eliminarEnCurso(id: string): void {
    if (!confirm('¿Está seguro de eliminar este estudio en curso?')) return;
    this.state.eliminarTituloEnCurso(id).subscribe();
  }

  obtenerMarca(tipoDestino: string, claveDestino: string) {
    return this.state.obtenerMarcaParaItem(tipoDestino, claveDestino);
  }
}
