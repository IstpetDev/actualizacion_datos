import { mensajeError } from '../../../core/auth/mensaje-error';
import { DominiosCorreoComponent } from './dominios-correo.component';
import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ConfiguracionClient,
  GuardarRequisitoDocumentoRequest,
  GuardarTipoDocumentoRequest,
  GuardarTipoFuncionarioRequest,
  PersonaDto,
  PersonasClient,
  RequisitoDocumentoDto,
  TipoDocumentoDto,
  TipoFuncionarioDto,
} from '../../../api-client';
import { AuthService } from '../../../core/auth';

type TabConfiguracion = 'funcionarios' | 'documentos' | 'requisitos' | 'asignaciones';

@Component({
  selector: 'app-configuracion-requisitos',
  standalone: true,
  imports: [CommonModule, FormsModule, DominiosCorreoComponent],
  template: `
    <section class="configuracion-container" data-testid="configuracion-requisitos-panel">
      @if (!esAdmin()) {
        <div class="alert alert-danger" role="alert" data-testid="error-no-admin">
          Acceso no autorizado. Esta configuración es exclusiva para administradores de la
          institución.
        </div>
      } @else {
        <header class="config-header">
          <div>
            <h2 class="config-title">Configuración Institucional de Requisitos y Hoja de Vida</h2>
            <p class="config-subtitle">
              Administración de tipos de funcionario, catálogo de documentos exigidos, requisitos
              institucionales y asignación.
            </p>
          </div>
          <button
            type="button"
            class="btn btn-secondary"
            (click)="cargarDatos()"
            [disabled]="cargando()"
            data-testid="btn-recargar-config"
          >
            {{ cargando() ? 'Cargando...' : 'Recargar Configuración' }}
          </button>
        </header>

        @if (mensajeExito()) {
          <div class="alert alert-success" role="alert" data-testid="mensaje-exito-config">
            {{ mensajeExito() }}
          </div>
        }

        @if (error()) {
          <div class="alert alert-danger" role="alert" data-testid="mensaje-error-config">
            {{ error() }}
          </div>
        }

        <app-dominios-correo />
        <!-- Pestañas internas de configuración -->
        <nav class="config-subtabs" role="tablist">
          <button
            type="button"
            class="subtab-btn"
            [class.active]="tabActiva() === 'funcionarios'"
            (click)="cambiarTab('funcionarios')"
            data-testid="tab-tipos-funcionario"
          >
            1. Tipos de Funcionario ({{ tiposFuncionario().length }})
          </button>
          <button
            type="button"
            class="subtab-btn"
            [class.active]="tabActiva() === 'documentos'"
            (click)="cambiarTab('documentos')"
            data-testid="tab-tipos-documento"
          >
            2. Tipos de Documento ({{ tiposDocumento().length }})
          </button>
          <button
            type="button"
            class="subtab-btn"
            [class.active]="tabActiva() === 'requisitos'"
            (click)="cambiarTab('requisitos')"
            data-testid="tab-requisitos"
          >
            3. Requisitos de Documento ({{ requisitos().length }})
          </button>
          <button
            type="button"
            class="subtab-btn"
            [class.active]="tabActiva() === 'asignaciones'"
            (click)="cambiarTab('asignaciones')"
            data-testid="tab-asignaciones"
          >
            4. Asignación a Personas ({{ personas().length }})
          </button>
        </nav>

        <!-- SUBTAB 1: TIPOS DE FUNCIONARIO (RF-HDV-012) -->
        @if (tabActiva() === 'funcionarios') {
          <div class="subtab-panel" data-testid="panel-tipos-funcionario">
            <div class="grid-form-lista">
              <!-- Formulario de creación/edición -->
              <div class="card form-card">
                <h3 class="card-title">
                  {{
                    editandoFuncionarioId()
                      ? 'Editar Tipo de Funcionario'
                      : 'Nuevo Tipo de Funcionario'
                  }}
                </h3>
                <form (ngSubmit)="guardarTipoFuncionario()" data-testid="form-tipo-funcionario">
                  <div class="form-group">
                    <label for="tfCodigo">Código (Único, ej. DOCENTE):</label>
                    <input
                      id="tfCodigo"
                      type="text"
                      class="form-control"
                      [(ngModel)]="formTfCodigo"
                      name="tfCodigo"
                      required
                      [disabled]="!!editandoFuncionarioId()"
                      placeholder="DOCENTE, ADMINISTRATIVO..."
                      data-testid="input-tf-codigo"
                    />
                  </div>
                  <div class="form-group">
                    <label for="tfNombre">Nombre descriptivo:</label>
                    <input
                      id="tfNombre"
                      type="text"
                      class="form-control"
                      [(ngModel)]="formTfNombre"
                      name="tfNombre"
                      required
                      placeholder="Docente titular, Personal administrativo..."
                      data-testid="input-tf-nombre"
                    />
                  </div>
                  <div class="form-actions mt-3">
                    <button
                      type="submit"
                      class="btn btn-primary"
                      [disabled]="guardando()"
                      data-testid="btn-guardar-tf"
                    >
                      {{
                        guardando()
                          ? 'Guardando...'
                          : editandoFuncionarioId()
                            ? 'Actualizar'
                            : 'Crear Tipo de Funcionario'
                      }}
                    </button>
                    @if (editandoFuncionarioId()) {
                      <button
                        type="button"
                        class="btn btn-secondary ml-2"
                        (click)="cancelarEdicionFuncionario()"
                        data-testid="btn-cancelar-tf"
                      >
                        Cancelar
                      </button>
                    }
                  </div>
                </form>
              </div>

              <!-- Lista de tipos de funcionario -->
              <div class="card table-card">
                <h3 class="card-title">Tipos de Funcionario Registrados</h3>
                <div class="table-container">
                  <table class="data-table" data-testid="tabla-tipos-funcionario">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Nombre</th>
                        <th>Estado</th>
                        <th class="text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (tf of tiposFuncionario(); track tf.id) {
                        <tr [attr.data-testid]="'fila-tf-' + tf.codigo">
                          <td>
                            <strong>{{ tf.codigo }}</strong>
                          </td>
                          <td>{{ tf.nombre }}</td>
                          <td>
                            <span
                              class="badge"
                              [class.badge-success]="tf.activo"
                              [class.badge-secondary]="!tf.activo"
                            >
                              {{ tf.activo ? 'Activo' : 'Inactivo' }}
                            </span>
                          </td>
                          <td class="text-right">
                            <div class="acciones-tabla">
                              <button
                                type="button"
                                class="btn btn-secondary btn-sm"
                                (click)="iniciarEdicionFuncionario(tf)"
                                [attr.data-testid]="'btn-editar-tf-' + tf.codigo"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                class="btn btn-sm"
                                [class.btn-danger]="tf.activo"
                                [class.btn-success]="!tf.activo"
                                (click)="alternarActivoFuncionario(tf)"
                                [attr.data-testid]="'btn-toggle-tf-' + tf.codigo"
                              >
                                {{ tf.activo ? 'Desactivar' : 'Activar' }}
                              </button>
                            </div>
                          </td>
                        </tr>
                      } @empty {
                        <tr>
                          <td colspan="4" class="text-center empty-state">
                            No hay tipos de funcionario configurados en la institución.
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

        <!-- SUBTAB 2: TIPOS DE DOCUMENTO (RF-HDV-012) -->
        @if (tabActiva() === 'documentos') {
          <div class="subtab-panel" data-testid="panel-tipos-documento">
            <div class="grid-form-lista">
              <!-- Formulario de creación/edición de documento -->
              <div class="card form-card">
                <h3 class="card-title">
                  {{
                    editandoDocumentoId() ? 'Editar Tipo de Documento' : 'Nuevo Tipo de Documento'
                  }}
                </h3>
                <form (ngSubmit)="guardarTipoDocumento()" data-testid="form-tipo-documento">
                  <div class="form-group">
                    <label for="tdCodigo">Código Único (ej. CEDULA, MECANIZADO_IESS):</label>
                    <input
                      id="tdCodigo"
                      type="text"
                      class="form-control"
                      [(ngModel)]="formTdCodigo"
                      name="tdCodigo"
                      required
                      [disabled]="!!editandoDocumentoId()"
                      placeholder="CEDULA, PAPELETA_VOTACION..."
                      data-testid="input-td-codigo"
                    />
                  </div>
                  <div class="form-group">
                    <label for="tdNombre">Nombre oficial del documento:</label>
                    <input
                      id="tdNombre"
                      type="text"
                      class="form-control"
                      [(ngModel)]="formTdNombre"
                      name="tdNombre"
                      required
                      placeholder="Cédula de Identidad, Certificado de Votación..."
                      data-testid="input-td-nombre"
                    />
                  </div>
                  <div class="form-group">
                    <label for="tdDescripcion">Instrucción / Descripción:</label>
                    <textarea
                      id="tdDescripcion"
                      class="form-control"
                      rows="2"
                      [(ngModel)]="formTdDescripcion"
                      name="tdDescripcion"
                      placeholder="Requisitos para el escaneo o vigencia..."
                      data-testid="input-td-descripcion"
                    ></textarea>
                  </div>
                  <div class="form-row">
                    <div class="form-checkbox col">
                      <label>
                        <input
                          type="checkbox"
                          [(ngModel)]="formTdTieneVencimiento"
                          name="tdTieneVencimiento"
                          data-testid="input-td-vencimiento"
                        />
                        Exige fecha de vencimiento
                      </label>
                    </div>
                    <div class="form-group col">
                      <label for="tdOrden">Orden visual:</label>
                      <input
                        id="tdOrden"
                        type="number"
                        class="form-control"
                        [(ngModel)]="formTdOrden"
                        name="tdOrden"
                        data-testid="input-td-orden"
                      />
                    </div>
                  </div>
                  <div class="form-actions mt-3">
                    <button
                      type="submit"
                      class="btn btn-primary"
                      [disabled]="guardando()"
                      data-testid="btn-guardar-td"
                    >
                      {{
                        guardando()
                          ? 'Guardando...'
                          : editandoDocumentoId()
                            ? 'Actualizar'
                            : 'Crear Tipo de Documento'
                      }}
                    </button>
                    @if (editandoDocumentoId()) {
                      <button
                        type="button"
                        class="btn btn-secondary ml-2"
                        (click)="cancelarEdicionDocumento()"
                        data-testid="btn-cancelar-td"
                      >
                        Cancelar
                      </button>
                    }
                  </div>
                </form>
              </div>

              <!-- Lista de tipos de documento -->
              <div class="card table-card">
                <h3 class="card-title">Catálogo de Tipos de Documento</h3>
                <div class="table-container">
                  <table class="data-table" data-testid="tabla-tipos-documento">
                    <thead>
                      <tr>
                        <th>Orden</th>
                        <th>Código</th>
                        <th>Nombre</th>
                        <th>Vencimiento</th>
                        <th>Estado</th>
                        <th class="text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (td of tiposDocumento(); track td.id) {
                        <tr [attr.data-testid]="'fila-td-' + td.codigo">
                          <td>{{ td.orden }}</td>
                          <td>
                            <strong>{{ td.codigo }}</strong>
                          </td>
                          <td>
                            {{ td.nombre }}
                            @if (td.descripcion) {
                              <small class="d-block text-muted">{{ td.descripcion }}</small>
                            }
                          </td>
                          <td>
                            @if (td.tieneVencimiento) {
                              <span class="badge badge-warning">Exige fecha</span>
                            } @else {
                              <span class="text-muted">No aplica</span>
                            }
                          </td>
                          <td>
                            <span
                              class="badge"
                              [class.badge-success]="td.activo"
                              [class.badge-secondary]="!td.activo"
                            >
                              {{ td.activo ? 'Activo' : 'Inactivo' }}
                            </span>
                          </td>
                          <td class="text-right">
                            <div class="acciones-tabla">
                              <button
                                type="button"
                                class="btn btn-secondary btn-sm"
                                (click)="iniciarEdicionDocumento(td)"
                                [attr.data-testid]="'btn-editar-td-' + td.codigo"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                class="btn btn-sm"
                                [class.btn-danger]="td.activo"
                                [class.btn-success]="!td.activo"
                                (click)="alternarActivoDocumento(td)"
                                [attr.data-testid]="'btn-toggle-td-' + td.codigo"
                              >
                                {{ td.activo ? 'Desactivar' : 'Activar' }}
                              </button>
                            </div>
                          </td>
                        </tr>
                      } @empty {
                        <tr>
                          <td colspan="6" class="text-center empty-state">
                            No hay tipos de documento registrados en la institución.
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

        <!-- SUBTAB 3: REQUISITOS DE DOCUMENTO (RF-HDV-012, Escenario 3) -->
        @if (tabActiva() === 'requisitos') {
          <div class="subtab-panel" data-testid="panel-requisitos">
            <div class="grid-form-lista">
              <!-- Formulario de creación de requisito -->
              <div class="card form-card">
                <h3 class="card-title">Vincular Requisito de Documento</h3>
                <p class="card-desc">
                  Configure qué documento es obligatorio según el tipo de funcionario o para
                  <strong>«Todos»</strong> (sin tipo de funcionario).
                </p>
                <form (ngSubmit)="guardarRequisito()" data-testid="form-requisito">
                  <div class="form-group">
                    <label for="reqDocumento">Tipo de Documento:</label>
                    <select
                      id="reqDocumento"
                      class="form-control"
                      [(ngModel)]="formReqTipoDocumentoId"
                      name="reqDocumento"
                      required
                      data-testid="select-req-documento"
                    >
                      <option value="" disabled>Seleccione un documento...</option>
                      @for (td of tiposDocumentoActivos(); track td.id) {
                        <option [value]="td.id">{{ td.nombre }} ({{ td.codigo }})</option>
                      }
                    </select>
                  </div>
                  <div class="form-group">
                    <label for="reqFuncionario">Aplica para Tipo de Funcionario:</label>
                    <select
                      id="reqFuncionario"
                      class="form-control"
                      [(ngModel)]="formReqTipoFuncionarioId"
                      name="reqFuncionario"
                      data-testid="select-req-funcionario"
                    >
                      <option value="">Todos los funcionarios (Universal / Sin tipo)</option>
                      @for (tf of tiposFuncionarioActivos(); track tf.id) {
                        <option [value]="tf.id">{{ tf.nombre }} ({{ tf.codigo }})</option>
                      }
                    </select>
                  </div>
                  <div class="form-checkbox">
                    <label>
                      <input
                        type="checkbox"
                        [(ngModel)]="formReqObligatorio"
                        name="reqObligatorio"
                        data-testid="input-req-obligatorio"
                      />
                      Es requisito obligatorio para el envío
                    </label>
                  </div>
                  <div class="form-actions mt-3">
                    <button
                      type="submit"
                      class="btn btn-primary"
                      [disabled]="guardando() || !formReqTipoDocumentoId"
                      data-testid="btn-guardar-requisito"
                    >
                      {{ guardando() ? 'Guardando...' : 'Crear Requisito' }}
                    </button>
                  </div>
                </form>
              </div>

              <!-- Lista de requisitos configurados -->
              <div class="card table-card">
                <h3 class="card-title">Requisitos Vigentes de la Institución</h3>
                <div class="table-container">
                  <table class="data-table" data-testid="tabla-requisitos">
                    <thead>
                      <tr>
                        <th>Documento Exigido</th>
                        <th>Aplica a Funcionario</th>
                        <th>Obligatorio</th>
                        <th>Estado</th>
                        <th class="text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (req of requisitos(); track req.id) {
                        <tr [attr.data-testid]="'fila-requisito-' + req.id">
                          <td>
                            <strong>{{ obtenerNombreDocumento(req.tipoDocumentoId) }}</strong>
                          </td>
                          <td>
                            @if (req.tipoFuncionarioId) {
                              <span class="badge badge-info">{{
                                obtenerNombreFuncionario(req.tipoFuncionarioId)
                              }}</span>
                            } @else {
                              <span class="badge badge-success">Todos (Universal)</span>
                            }
                          </td>
                          <td>
                            @if (req.esObligatorio) {
                              <span class="badge badge-warning">Obligatorio</span>
                            } @else {
                              <span class="text-muted">Opcional</span>
                            }
                          </td>
                          <td>
                            <span
                              class="badge"
                              [class.badge-success]="req.activo"
                              [class.badge-secondary]="!req.activo"
                            >
                              {{ req.activo ? 'Activo' : 'Inactivo' }}
                            </span>
                          </td>
                          <td class="text-right">
                            <div class="acciones-tabla">
                              <button
                                type="button"
                                class="btn btn-sm"
                                [class.btn-danger]="req.activo"
                                [class.btn-success]="!req.activo"
                                (click)="alternarActivoRequisito(req)"
                                [attr.data-testid]="'btn-toggle-req-' + req.id"
                              >
                                {{ req.activo ? 'Desactivar' : 'Activar' }}
                              </button>
                            </div>
                          </td>
                        </tr>
                      } @empty {
                        <tr>
                          <td colspan="5" class="text-center empty-state">
                            No hay requisitos de documento configurados en la institución.
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

        <!-- SUBTAB 4: ASIGNACIÓN A PERSONAS (RF-HDV-013, Issue #76) -->
        @if (tabActiva() === 'asignaciones') {
          <div class="subtab-panel" data-testid="panel-asignaciones">
            <div class="card">
              <h3 class="card-title">Asignar Tipo de Funcionario a Personas (RF-HDV-013)</h3>
              <p class="card-desc">
                Seleccione el tipo de funcionario correspondiente a cada persona registrada en la
                nómina institucional. Los cambios persisten automáticamente.
              </p>

              <!-- Resumen y alertas de asignación -->
              <div class="resumen-asignaciones" data-testid="resumen-asignaciones">
                <div class="metrica-item">
                  <span class="metrica-label">Total en nómina:</span>
                  <span
                    class="metrica-valor badge badge-info"
                    data-testid="contador-total-personas"
                    >{{ personas().length }}</span
                  >
                </div>
                <div class="metrica-item">
                  <span class="metrica-label">Con tipo asignado:</span>
                  <span class="metrica-valor badge badge-success" data-testid="contador-con-tipo">{{
                    totalPersonasConTipo()
                  }}</span>
                </div>
                <div class="metrica-item">
                  <span class="metrica-label">Sin tipo asignado:</span>
                  <span
                    class="metrica-valor badge"
                    [class.badge-danger]="totalPersonasSinTipo() > 0"
                    [class.badge-secondary]="totalPersonasSinTipo() === 0"
                    data-testid="contador-sin-tipo"
                  >
                    {{ totalPersonasSinTipo() }}
                    {{ totalPersonasSinTipo() === 1 ? 'persona sin tipo' : 'personas sin tipo' }}
                  </span>
                </div>
              </div>

              <!-- Barra de acciones masivas -->
              <div class="barra-acciones-masivas" data-testid="barra-asignacion-masiva">
                <div class="masivo-selector">
                  <select
                    class="form-control form-control-sm"
                    [ngModel]="tipoParaAsignacionMasiva()"
                    (ngModelChange)="tipoParaAsignacionMasiva.set($event)"
                    data-testid="select-tipo-masivo"
                  >
                    <option value="">Seleccionar tipo para aplicar en lote...</option>
                    @for (tf of tiposFuncionarioActivos(); track tf.id) {
                      <option [value]="tf.id">{{ tf.nombre }} ({{ tf.codigo }})</option>
                    }
                  </select>
                </div>

                <div class="masivo-botones">
                  <button
                    type="button"
                    class="btn btn-primary btn-sm"
                    [disabled]="
                      !tipoParaAsignacionMasiva() ||
                      personasSeleccionadas().size === 0 ||
                      procesandoAsignacionMasiva()
                    "
                    (click)="asignarMasivoSeleccionadas()"
                    data-testid="btn-asignar-masivo-seleccionadas"
                  >
                    Asignar a seleccionadas ({{ personasSeleccionadas().size }})
                  </button>

                  <button
                    type="button"
                    class="btn btn-warning btn-sm"
                    [disabled]="
                      !tipoParaAsignacionMasiva() ||
                      totalPersonasSinTipo() === 0 ||
                      procesandoAsignacionMasiva()
                    "
                    (click)="asignarMasivoSinTipo()"
                    data-testid="btn-asignar-todas-sin-tipo"
                  >
                    Asignar a todas las personas sin tipo ({{ totalPersonasSinTipo() }})
                  </button>
                </div>
              </div>

              <!-- Filtros y búsqueda -->
              <div class="filtros-tabla-container">
                <div class="filtro-busqueda">
                  <input
                    type="text"
                    class="form-control form-control-sm"
                    placeholder="Buscar por documento o nombre..."
                    [ngModel]="busquedaPersonas()"
                    (ngModelChange)="onBusquedaChange($event)"
                    data-testid="filtro-busqueda-personas"
                  />
                </div>
                <div class="filtro-estado">
                  <select
                    class="form-control form-control-sm"
                    [ngModel]="filtroTipoEstado()"
                    (ngModelChange)="onFiltroEstadoChange($event)"
                    data-testid="filtro-estado-tipo"
                  >
                    <option value="todos">Todas las personas ({{ personas().length }})</option>
                    <option value="sin-tipo">
                      Solo sin tipo asignado ({{ totalPersonasSinTipo() }})
                    </option>
                    <option value="con-tipo">
                      Solo con tipo asignado ({{ totalPersonasConTipo() }})
                    </option>
                  </select>
                </div>
                <div class="filtro-tamano">
                  <label for="selectTamanoPagina" class="tamano-label">Mostrar:</label>
                  <select
                    id="selectTamanoPagina"
                    class="form-control form-control-sm tamano-select"
                    [ngModel]="tamanoPaginaPersonas()"
                    (ngModelChange)="onTamanoPaginaChange($event)"
                    data-testid="select-tamano-pagina"
                  >
                    <option [value]="10">10 por pág.</option>
                    <option [value]="25">25 por pág.</option>
                    <option [value]="50">50 por pág.</option>
                    <option [value]="100">100 por pág.</option>
                  </select>
                </div>
              </div>

              <div class="table-container">
                <table class="data-table" data-testid="tabla-asignaciones-personas">
                  <thead>
                    <tr>
                      <th class="th-checkbox">
                        <input
                          type="checkbox"
                          [checked]="todasSeleccionadas()"
                          (change)="toggleSeleccionarTodas()"
                          aria-label="Seleccionar todas las personas de la página"
                          data-testid="checkbox-seleccionar-todas"
                        />
                      </th>
                      <th>Documento</th>
                      <th>Nombre</th>
                      <th>Correo</th>
                      <th>Rol</th>
                      <th>Estado</th>
                      <th>Tipo de Funcionario Asignado</th>
                      <th class="text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (per of personasPaginadas(); track per.id) {
                      <tr
                        [attr.data-testid]="'fila-persona-asignacion-' + per.documento"
                        [class.fila-sin-tipo]="!per.tipoFuncionarioId"
                      >
                        <td class="td-checkbox">
                          <input
                            type="checkbox"
                            [checked]="personasSeleccionadas().has(per.id)"
                            (change)="toggleSeleccion(per.id)"
                            [attr.aria-label]="'Seleccionar persona ' + per.documento"
                            [attr.data-testid]="'checkbox-persona-' + per.documento"
                          />
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
                          @if (per.tipoFuncionarioId) {
                            <span class="badge badge-success">Asignado</span>
                          } @else {
                            <span class="badge badge-danger" data-testid="badge-sin-tipo"
                              >Sin tipo</span
                            >
                          }
                        </td>
                        <td>
                          <select
                            class="form-control form-control-sm"
                            [class.border-warning]="!per.tipoFuncionarioId"
                            [ngModel]="per.tipoFuncionarioId || ''"
                            (ngModelChange)="asignarTipo(per, $event)"
                            [attr.data-testid]="'select-asignar-tf-' + per.documento"
                          >
                            <option value="">Sin tipo asignado</option>
                            @for (tf of tiposFuncionarioActivos(); track tf.id) {
                              <option [value]="tf.id">{{ tf.nombre }} ({{ tf.codigo }})</option>
                            }
                          </select>
                        </td>
                        <td class="text-right">
                          @if (per.tipoFuncionarioId) {
                            <button
                              type="button"
                              class="btn btn-secondary btn-sm"
                              (click)="asignarTipo(per, '')"
                              [attr.data-testid]="'btn-quitar-tf-' + per.documento"
                            >
                              Quitar
                            </button>
                          }
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="8" class="text-center empty-state">
                          @if (personas().length === 0) {
                            No hay personas registradas en la institución.
                          } @else {
                            No se encontraron personas con los filtros seleccionados.
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <!-- Paginación -->
              @if (personasFiltradas().length > 0) {
                <div class="paginacion-container" data-testid="paginador-personas">
                  <div class="paginacion-info">
                    Mostrando {{ indicePrimerElemento() }} - {{ indiceUltimoElemento() }} de
                    {{ personasFiltradas().length }} personas
                  </div>
                  <div class="paginacion-controles">
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      [disabled]="paginaPersonas() <= 1"
                      (click)="cambiarPagina(paginaPersonas() - 1)"
                      data-testid="btn-pagina-anterior"
                    >
                      &laquo; Anterior
                    </button>
                    <span class="paginacion-pagina"
                      >Página {{ paginaPersonas() }} de {{ totalPaginasPersonas() }}</span
                    >
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      [disabled]="paginaPersonas() >= totalPaginasPersonas()"
                      (click)="cambiarPagina(paginaPersonas() + 1)"
                      data-testid="btn-pagina-siguiente"
                    >
                      Siguiente &raquo;
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      }
    </section>
  `,
  styles: `
    .configuracion-container {
      margin-top: 1rem;
    }
    .config-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 0.75rem;
    }
    .config-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.25rem 0;
    }
    .config-subtitle {
      font-size: 0.85rem;
      color: #64748b;
      margin: 0;
    }
    .config-subtabs {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      border-bottom: 2px solid #e2e8f0;
      margin-bottom: 1.5rem;
    }
    .subtab-btn {
      padding: 0.65rem 1.1rem;
      border: none;
      background: none;
      font-size: 0.85rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      transition: all 0.2s;
    }
    .subtab-btn:hover {
      color: #0f172a;
    }
    .subtab-btn.active {
      color: #1e3a8a;
      border-bottom-color: #1e3a8a;
    }
    .grid-form-lista {
      display: grid;
      grid-template-columns: 350px 1fr;
      gap: 1.5rem;
      align-items: start;
    }
    @media (max-width: 900px) {
      .grid-form-lista {
        grid-template-columns: 1fr;
      }
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      padding: 1.25rem;
    }
    .card-title {
      font-size: 1rem;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 0.5rem 0;
    }
    .card-desc {
      font-size: 0.8rem;
      color: #64748b;
      margin-bottom: 1rem;
    }
    .form-group {
      margin-bottom: 1rem;
    }
    .form-group label {
      display: block;
      font-size: 0.8rem;
      font-weight: 600;
      color: #334155;
      margin-bottom: 0.35rem;
    }
    .form-control {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.375rem;
      font-size: 0.85rem;
      box-sizing: border-box;
    }
    .form-control-sm {
      padding: 0.25rem 0.5rem;
      font-size: 0.8rem;
    }
    .form-checkbox {
      margin: 0.75rem 0;
      font-size: 0.85rem;
      color: #334155;
    }
    .form-row {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }
    .col {
      flex: 1;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }
    .data-table th,
    .data-table td {
      padding: 0.65rem 0.75rem;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    .data-table th {
      background: #f8fafc;
      font-weight: 600;
      color: #475569;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .empty-state {
      padding: 1.5rem;
      color: #94a3b8;
    }
    .badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge-info {
      background: #e0f2fe;
      color: #0369a1;
    }
    .badge-success {
      background: #dcfce7;
      color: #15803d;
    }
    .badge-warning {
      background: #fef3c7;
      color: #b45309;
    }
    .badge-secondary {
      background: #f1f5f9;
      color: #475569;
    }
    .btn {
      padding: 0.4rem 0.85rem;
      border-radius: 0.375rem;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s ease-in-out;
    }
    .btn-primary {
      background: #1e3a8a;
      color: #ffffff;
    }
    .btn-primary:hover:not(:disabled) {
      background: #172554;
    }
    .btn-secondary {
      background: #f1f5f9;
      color: #334155;
      border-color: #cbd5e1;
    }
    .btn-secondary:hover {
      background: #e2e8f0;
    }
    .btn-success {
      background: #15803d;
      color: #ffffff;
    }
    .btn-danger {
      background: #b91c1c;
      color: #ffffff;
    }
    .btn-sm {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
    }
    .ml-1 {
      margin-left: 0.25rem;
    }
    .ml-2 {
      margin-left: 0.5rem;
    }
    .mt-3 {
      margin-top: 0.75rem;
    }
    .alert {
      padding: 0.75rem 1rem;
      border-radius: 0.375rem;
      margin-bottom: 1rem;
      font-size: 0.85rem;
    }
    .alert-success {
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #bbf7d0;
    }
    .alert-danger {
      background: #fee2e2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }
    .d-block {
      display: block;
    }
    .text-muted {
      color: #64748b;
    }
    .table-container {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      border-radius: 0.375rem;
    }
    .acciones-tabla {
      display: flex;
      gap: 0.375rem;
      justify-content: flex-end;
      align-items: center;
      flex-wrap: wrap;
      min-width: 140px;
    }
    @media (max-width: 640px) {
      .config-subtabs {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        white-space: nowrap;
        padding-bottom: 0.25rem;
      }
      .subtab-btn {
        flex-shrink: 0;
      }
      .acciones-tabla {
        justify-content: flex-start;
      }
      .config-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }
    .resumen-asignaciones {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.375rem;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
    }
    .metrica-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
    }
    .metrica-label {
      font-weight: 600;
      color: #475569;
    }
    .barra-acciones-masivas {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 0.375rem;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
    }
    .masivo-selector {
      flex: 1;
      min-width: 250px;
    }
    .masivo-botones {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .filtros-tabla-container {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
      margin-bottom: 1rem;
    }
    .filtro-busqueda {
      flex: 1;
      min-width: 200px;
    }
    .filtro-estado {
      min-width: 200px;
    }
    .filtro-tamano {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .tamano-label {
      font-size: 0.8rem;
      color: #64748b;
      margin: 0;
    }
    .tamano-select {
      width: auto;
    }
    .th-checkbox,
    .td-checkbox {
      width: 36px;
      text-align: center;
    }
    .fila-sin-tipo {
      background-color: #fffdf5;
    }
    .badge-danger {
      background: #fee2e2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }
    .badge-warning {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
    }
    .border-warning {
      border-color: #f59e0b;
    }
    .btn-warning {
      background: #d97706;
      color: #ffffff;
      border: none;
    }
    .btn-warning:hover:not(:disabled) {
      background: #b45309;
    }
    .paginacion-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid #e2e8f0;
    }
    .paginacion-info {
      font-size: 0.85rem;
      color: #64748b;
    }
    .paginacion-controles {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .paginacion-pagina {
      font-size: 0.85rem;
      font-weight: 600;
      color: #334155;
    }
  `,
})
export class ConfiguracionRequisitosComponent implements OnInit {
  private readonly configClient = inject(ConfiguracionClient);
  private readonly personasClient = inject(PersonasClient);
  private readonly authService = inject(AuthService);

  readonly tabActiva = signal<TabConfiguracion>('funcionarios');
  readonly cargando = signal<boolean>(false);
  readonly guardando = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly mensajeExito = signal<string | null>(null);

  // Datos
  readonly tiposFuncionario = signal<TipoFuncionarioDto[]>([]);
  readonly tiposDocumento = signal<TipoDocumentoDto[]>([]);
  readonly requisitos = signal<RequisitoDocumentoDto[]>([]);
  readonly personas = signal<PersonaDto[]>([]);

  // Formularios
  // Tipo Funcionario
  editandoFuncionarioId = signal<string | null>(null);
  formTfCodigo = '';
  formTfNombre = '';
  formTfEsDocente = false;

  // Tipo Documento
  editandoDocumentoId = signal<string | null>(null);
  formTdCodigo = '';
  formTdNombre = '';
  formTdDescripcion = '';
  formTdTieneVencimiento = false;
  formTdOrden = 1;

  // Requisito Documento
  formReqTipoDocumentoId = '';
  formReqTipoFuncionarioId = '';
  formReqObligatorio = true;

  esAdmin(): boolean {
    const rol =
      typeof this.authService.rolActual === 'function'
        ? this.authService.rolActual()
        : ((this.authService as unknown as { sesion?: () => { rol?: string } }).sesion?.()?.rol ??
          null);
    return rol === 'admin' || rol === 'superadmin';
  }

  tiposFuncionarioActivos(): TipoFuncionarioDto[] {
    return this.tiposFuncionario().filter((t) => t.activo);
  }

  tiposDocumentoActivos(): TipoDocumentoDto[] {
    return this.tiposDocumento().filter((t) => t.activo);
  }

  ngOnInit(): void {
    if (this.esAdmin()) {
      this.cargarDatos();
    }
  }

  cambiarTab(tab: TabConfiguracion): void {
    this.tabActiva.set(tab);
    this.error.set(null);
    this.mensajeExito.set(null);
  }

  cargarDatos(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.configClient.listarTiposFuncionario().subscribe({
      next: (tfs) => this.tiposFuncionario.set(tfs || []),
      error: (err) => this.error.set(mensajeError(err, 'Error al cargar tipos de funcionario.')),
    });

    this.configClient.listarTiposDocumento().subscribe({
      next: (tds) => {
        this.tiposDocumento.set(tds || []);
        if (!this.editandoDocumentoId()) {
          this.formTdOrden = this.siguienteOrdenDocumento();
        }
      },
      error: (err) => this.error.set(mensajeError(err, 'Error al cargar tipos de documento.')),
    });

    this.configClient.listarRequisitosDocumento().subscribe({
      next: (reqs) => this.requisitos.set(reqs || []),
      error: (err) => this.error.set(mensajeError(err, 'Error al cargar requisitos de documento.')),
    });

    this.personasClient.listarPersonas().subscribe({
      next: (pers) => {
        this.personas.set(pers || []);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(mensajeError(err, 'Error al cargar personas para asignación.'));
        this.cargando.set(false);
      },
    });
  }

  // --- MÉTODOS TIPOS DE FUNCIONARIO (RF-HDV-012) ---
  iniciarEdicionFuncionario(tf: TipoFuncionarioDto): void {
    this.editandoFuncionarioId.set(tf.id);
    this.formTfCodigo = tf.codigo;
    this.formTfNombre = tf.nombre;
    this.formTfEsDocente = tf.esDocente;
  }

  cancelarEdicionFuncionario(): void {
    this.editandoFuncionarioId.set(null);
    this.formTfCodigo = '';
    this.formTfNombre = '';
    this.formTfEsDocente = false;
  }

  guardarTipoFuncionario(): void {
    const cod = this.formTfCodigo.trim().toUpperCase();
    const nom = this.formTfNombre.trim();
    if (!cod || !nom) return;

    this.guardando.set(true);
    this.error.set(null);
    this.mensajeExito.set(null);

    const req: GuardarTipoFuncionarioRequest = {
      codigo: cod,
      nombre: nom,
      esDocente: this.formTfEsDocente,
      activo: true,
    };

    const id = this.editandoFuncionarioId();
    if (id) {
      this.configClient.actualizarTipoFuncionario(id, req).subscribe({
        next: () => {
          this.mensajeExito.set(`Tipo de funcionario «${nom}» actualizado.`);
          this.cancelarEdicionFuncionario();
          this.guardando.set(false);
          this.cargarDatos();
        },
        error: (err) => {
          this.error.set(mensajeError(err, 'Error al actualizar tipo de funcionario.'));
          this.guardando.set(false);
        },
      });
    } else {
      this.configClient.crearTipoFuncionario(req).subscribe({
        next: () => {
          this.mensajeExito.set(`Tipo de funcionario «${nom}» creado.`);
          this.cancelarEdicionFuncionario();
          this.guardando.set(false);
          this.cargarDatos();
        },
        error: (err) => {
          this.error.set(mensajeError(err, 'Error al crear tipo de funcionario.'));
          this.guardando.set(false);
        },
      });
    }
  }

  alternarActivoFuncionario(tf: TipoFuncionarioDto): void {
    const nuevoEstado = !tf.activo;
    const req: GuardarTipoFuncionarioRequest = {
      codigo: tf.codigo,
      nombre: tf.nombre,
      esDocente: tf.esDocente,
      activo: nuevoEstado,
    };

    this.configClient.actualizarTipoFuncionario(tf.id, req).subscribe({
      next: () => {
        this.mensajeExito.set(
          `Tipo de funcionario «${tf.nombre}» ${nuevoEstado ? 'activado' : 'desactivado'}.`,
        );
        this.cargarDatos();
      },
      error: (err) =>
        this.error.set(mensajeError(err, 'Error al cambiar estado del tipo de funcionario.')),
    });
  }

  // --- MÉTODOS TIPOS DE DOCUMENTO (RF-HDV-012) ---
  iniciarEdicionDocumento(td: TipoDocumentoDto): void {
    this.editandoDocumentoId.set(td.id);
    this.formTdCodigo = td.codigo;
    this.formTdNombre = td.nombre;
    this.formTdDescripcion = td.descripcion || '';
    this.formTdTieneVencimiento = td.tieneVencimiento;
    this.formTdOrden = td.orden;
  }

  cancelarEdicionDocumento(): void {
    this.editandoDocumentoId.set(null);
    this.formTdCodigo = '';
    this.formTdNombre = '';
    this.formTdDescripcion = '';
    this.formTdTieneVencimiento = false;
    this.formTdOrden = this.siguienteOrdenDocumento();
  }

  private siguienteOrdenDocumento(): number {
    return this.tiposDocumento().reduce((maximo, tipo) => Math.max(maximo, tipo.orden), 0) + 1;
  }

  guardarTipoDocumento(): void {
    const cod = this.formTdCodigo.trim().toUpperCase();
    const nom = this.formTdNombre.trim();
    if (!cod || !nom) return;

    this.guardando.set(true);
    this.error.set(null);
    this.mensajeExito.set(null);

    const req: GuardarTipoDocumentoRequest = {
      codigo: cod,
      nombre: nom,
      descripcion: this.formTdDescripcion.trim() || undefined,
      tieneVencimiento: this.formTdTieneVencimiento,
      orden: this.formTdOrden,
      activo: true,
    };

    const id = this.editandoDocumentoId();
    if (id) {
      this.configClient.actualizarTipoDocumento(id, req).subscribe({
        next: () => {
          this.mensajeExito.set(`Tipo de documento «${nom}» actualizado.`);
          this.cancelarEdicionDocumento();
          this.guardando.set(false);
          this.cargarDatos();
        },
        error: (err) => {
          this.error.set(mensajeError(err, 'Error al actualizar tipo de documento.'));
          this.guardando.set(false);
        },
      });
    } else {
      this.configClient.crearTipoDocumento(req).subscribe({
        next: () => {
          this.mensajeExito.set(`Tipo de documento «${nom}» creado.`);
          this.cancelarEdicionDocumento();
          this.guardando.set(false);
          this.cargarDatos();
        },
        error: (err) => {
          this.error.set(mensajeError(err, 'Error al crear tipo de documento.'));
          this.guardando.set(false);
        },
      });
    }
  }

  alternarActivoDocumento(td: TipoDocumentoDto): void {
    const nuevoEstado = !td.activo;
    const req: GuardarTipoDocumentoRequest = {
      codigo: td.codigo,
      nombre: td.nombre,
      descripcion: td.descripcion,
      tieneVencimiento: td.tieneVencimiento,
      orden: td.orden,
      activo: nuevoEstado,
    };

    this.configClient.actualizarTipoDocumento(td.id, req).subscribe({
      next: () => {
        this.mensajeExito.set(
          `Tipo de documento «${td.nombre}» ${nuevoEstado ? 'activado' : 'desactivado'}.`,
        );
        this.cargarDatos();
      },
      error: (err) =>
        this.error.set(mensajeError(err, 'Error al cambiar estado del tipo de documento.')),
    });
  }

  // --- MÉTODOS REQUISITOS (RF-HDV-012, Escenario 3) ---
  guardarRequisito(): void {
    if (!this.formReqTipoDocumentoId) return;

    this.guardando.set(true);
    this.error.set(null);
    this.mensajeExito.set(null);

    const req: GuardarRequisitoDocumentoRequest = {
      tipoDocumentoId: this.formReqTipoDocumentoId,
      tipoFuncionarioId: this.formReqTipoFuncionarioId ? this.formReqTipoFuncionarioId : undefined,
      esObligatorio: this.formReqObligatorio,
      activo: true,
    };

    this.configClient.crearRequisitoDocumento(req).subscribe({
      next: () => {
        this.mensajeExito.set('Requisito institucional de documento configurado con éxito.');
        this.formReqTipoDocumentoId = '';
        this.formReqTipoFuncionarioId = '';
        this.formReqObligatorio = true;
        this.guardando.set(false);
        this.cargarDatos();
      },
      error: (err) => {
        this.error.set(mensajeError(err, 'Error al crear requisito de documento.'));
        this.guardando.set(false);
      },
    });
  }

  alternarActivoRequisito(req: RequisitoDocumentoDto): void {
    const nuevoEstado = !req.activo;
    const reqDto: GuardarRequisitoDocumentoRequest = {
      tipoDocumentoId: req.tipoDocumentoId,
      tipoFuncionarioId: req.tipoFuncionarioId,
      esObligatorio: req.esObligatorio,
      activo: nuevoEstado,
    };

    this.configClient.actualizarRequisitoDocumento(req.id, reqDto).subscribe({
      next: () => {
        this.mensajeExito.set(`Requisito ${nuevoEstado ? 'activado' : 'desactivado'}.`);
        this.cargarDatos();
      },
      error: (err) =>
        this.error.set(mensajeError(err, 'Error al actualizar estado del requisito.')),
    });
  }

  obtenerNombreDocumento(id: string): string {
    const doc = this.tiposDocumento().find((d) => d.id === id);
    return doc ? `${doc.nombre} (${doc.codigo})` : id;
  }

  obtenerNombreFuncionario(id?: string): string {
    if (!id) return 'Todos';
    const func = this.tiposFuncionario().find((f) => f.id === id);
    return func ? `${func.nombre} (${func.codigo})` : id;
  }

  // --- ASIGNACIÓN DE FUNCIONARIO A PERSONAS (RF-HDV-013, Issue #76) ---
  readonly busquedaPersonas = signal<string>('');
  readonly filtroTipoEstado = signal<'todos' | 'sin-tipo' | 'con-tipo'>('todos');
  readonly paginaPersonas = signal<number>(1);
  readonly tamanoPaginaPersonas = signal<number>(10);
  readonly personasSeleccionadas = signal<Set<string>>(new Set<string>());
  readonly tipoParaAsignacionMasiva = signal<string>('');
  readonly procesandoAsignacionMasiva = signal<boolean>(false);

  readonly totalPersonasSinTipo = computed(
    () => this.personas().filter((p) => !p.tipoFuncionarioId).length,
  );

  readonly totalPersonasConTipo = computed(
    () => this.personas().filter((p) => !!p.tipoFuncionarioId).length,
  );

  readonly personasFiltradas = computed(() => {
    let lista = this.personas();
    const query = this.busquedaPersonas().trim().toLowerCase();
    if (query) {
      lista = lista.filter(
        (p) =>
          p.documento.toLowerCase().includes(query) ||
          (p.nombre && p.nombre.toLowerCase().includes(query)),
      );
    }
    const estado = this.filtroTipoEstado();
    if (estado === 'sin-tipo') {
      lista = lista.filter((p) => !p.tipoFuncionarioId);
    } else if (estado === 'con-tipo') {
      lista = lista.filter((p) => !!p.tipoFuncionarioId);
    }
    return lista;
  });

  readonly totalPaginasPersonas = computed(() => {
    const total = this.personasFiltradas().length;
    return Math.max(1, Math.ceil(total / this.tamanoPaginaPersonas()));
  });

  readonly personasPaginadas = computed(() => {
    const inicio = (this.paginaPersonas() - 1) * this.tamanoPaginaPersonas();
    return this.personasFiltradas().slice(inicio, inicio + this.tamanoPaginaPersonas());
  });

  readonly indicePrimerElemento = computed(() => {
    if (this.personasFiltradas().length === 0) return 0;
    return (this.paginaPersonas() - 1) * this.tamanoPaginaPersonas() + 1;
  });

  readonly indiceUltimoElemento = computed(() => {
    return Math.min(
      this.paginaPersonas() * this.tamanoPaginaPersonas(),
      this.personasFiltradas().length,
    );
  });

  readonly todasSeleccionadas = computed(() => {
    const pagina = this.personasPaginadas();
    if (pagina.length === 0) return false;
    const seleccion = this.personasSeleccionadas();
    return pagina.every((p) => seleccion.has(p.id));
  });

  onBusquedaChange(valor: string): void {
    this.busquedaPersonas.set(valor);
    this.paginaPersonas.set(1);
  }

  onFiltroEstadoChange(valor: 'todos' | 'sin-tipo' | 'con-tipo'): void {
    this.filtroTipoEstado.set(valor);
    this.paginaPersonas.set(1);
  }

  onTamanoPaginaChange(valor: string | number): void {
    this.tamanoPaginaPersonas.set(Number(valor));
    this.paginaPersonas.set(1);
  }

  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina >= 1 && nuevaPagina <= this.totalPaginasPersonas()) {
      this.paginaPersonas.set(nuevaPagina);
    }
  }

  toggleSeleccion(personaId: string): void {
    const actuales = new Set(this.personasSeleccionadas());
    if (actuales.has(personaId)) {
      actuales.delete(personaId);
    } else {
      actuales.add(personaId);
    }
    this.personasSeleccionadas.set(actuales);
  }

  toggleSeleccionarTodas(): void {
    const pagina = this.personasPaginadas();
    const actuales = new Set(this.personasSeleccionadas());
    const todasEnPagina = pagina.length > 0 && pagina.every((p) => actuales.has(p.id));
    if (todasEnPagina) {
      pagina.forEach((p) => actuales.delete(p.id));
    } else {
      pagina.forEach((p) => actuales.add(p.id));
    }
    this.personasSeleccionadas.set(actuales);
  }

  asignarTipo(persona: PersonaDto, tipoFuncionarioId: string): void {
    this.error.set(null);
    this.mensajeExito.set(null);

    const nuevoTipoId = tipoFuncionarioId || undefined;

    this.personasClient
      .asignarTipoFuncionario(persona.id, { tipoFuncionarioId: nuevoTipoId })
      .subscribe({
        next: () => {
          persona.tipoFuncionarioId = nuevoTipoId;
          this.mensajeExito.set(
            `Tipo de funcionario actualizado para ${persona.nombre || persona.documento}.`,
          );
        },
        error: (err) => {
          this.error.set(mensajeError(err, 'Error al asignar tipo de funcionario a la persona.'));
          this.cargarDatos();
        },
      });
  }

  asignarMasivoSeleccionadas(): void {
    const tipoId = this.tipoParaAsignacionMasiva();
    if (!tipoId || this.personasSeleccionadas().size === 0) return;

    this.error.set(null);
    this.mensajeExito.set(null);
    this.procesandoAsignacionMasiva.set(true);

    const ids = Array.from(this.personasSeleccionadas());
    this.personasClient
      .asignarTipoFuncionarioMasivo({
        tipoFuncionarioId: tipoId,
        personaIds: ids,
        soloSinTipo: false,
      })
      .subscribe({
        next: (res) => {
          this.procesandoAsignacionMasiva.set(false);
          this.personasSeleccionadas.set(new Set());
          this.mensajeExito.set(
            res?.mensaje || `Tipo de funcionario asignado a ${ids.length} personas seleccionadas.`,
          );
          this.cargarDatos();
        },
        error: (err) => {
          this.procesandoAsignacionMasiva.set(false);
          this.error.set(err?.message || 'Error en la asignación masiva.');
          this.cargarDatos();
        },
      });
  }

  asignarMasivoSinTipo(): void {
    const tipoId = this.tipoParaAsignacionMasiva();
    if (!tipoId || this.totalPersonasSinTipo() === 0) return;

    const total = this.totalPersonasSinTipo();
    const confirma =
      typeof window !== 'undefined' && typeof window.confirm === 'function'
        ? window.confirm(
            `¿Desea asignar este tipo de funcionario a las ${total} personas sin tipo?`,
          )
        : true;
    if (!confirma) return;

    this.error.set(null);
    this.mensajeExito.set(null);
    this.procesandoAsignacionMasiva.set(true);

    this.personasClient
      .asignarTipoFuncionarioMasivo({
        tipoFuncionarioId: tipoId,
        soloSinTipo: true,
      })
      .subscribe({
        next: (res) => {
          this.procesandoAsignacionMasiva.set(false);
          this.personasSeleccionadas.set(new Set());
          this.mensajeExito.set(
            res?.mensaje ||
              `Tipo de funcionario asignado a todas las personas sin tipo (${total}).`,
          );
          this.cargarDatos();
        },
        error: (err) => {
          this.procesandoAsignacionMasiva.set(false);
          this.error.set(err?.message || 'Error al asignar a personas sin tipo.');
          this.cargarDatos();
        },
      });
  }
}
