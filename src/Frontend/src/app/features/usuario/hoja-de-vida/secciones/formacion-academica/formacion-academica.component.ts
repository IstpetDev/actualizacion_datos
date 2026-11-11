import { mensajeError } from '../../../../../core/auth/mensaje-error';
import { ValidacionHojaDeVidaService } from '../../servicios/validacion-hoja-de-vida.service';
import { fechaSinHora } from '../../servicios/fecha-sin-hora';
import { CommonModule } from '@angular/common';
import { DestroyRef, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { SeccionConCambios } from '../../servicios/seccion-con-cambios';
import { ModalCambiosSinGuardarComponent } from '../../componentes/modal-cambios-sin-guardar.component';
import { forkJoin } from 'rxjs';
import { FormsModule } from '@angular/forms';
import {
  ElementoCatalogoDto,
  EstadoSubindiceSeccionPersonaDto,
  GuardarTituloAcademicoRequest,
  GuardarTituloEnCursoRequest,
  TituloAcademicoDto,
  TituloEnCursoDto,
} from '../../../../../api-client';
import { filtrarCatalogo } from '../../../../../core/util/filtro-busqueda.util';
import { nombreSubindicePorId } from '../../componentes/bloque-subindices-seccion.component';
import { MarcaObservacionComponent } from '../../componentes/marca-observacion.component';
import { UploaderRespaldoComponent } from '../../componentes/uploader-respaldo.component';
import { CatalogosCacheService } from '../../servicios/catalogos-cache.service';
import { HojaDeVidaStateService } from '../../servicios/hoja-de-vida-state.service';

export interface TabExcelItem {
  id: string;
  tipo: '3er-nivel' | '4to-nivel' | 'senescyt' | 'en-curso' | 'general';
  titulo: string;
  subindiceId?: string;
  esObligatorio: boolean;
  cumplido: boolean;
  conteo: number;
}

@Component({
  selector: 'app-formacion-academica',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    UploaderRespaldoComponent,
    MarcaObservacionComponent,
    ModalCambiosSinGuardarComponent,
  ],
  template: `
    @if (validacion.errorCarga()) {
      <p role="alert">
        {{ validacion.errorCarga() }}
        <button type="button" (click)="validacion.cargar()">Reintentar</button>
      </p>
    }

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

      <!-- Pestañas Estilo Hojas de Excel -->
      <div class="tabs-excel-nav" role="tablist" aria-label="Apartados de Formación Académica">
        @for (tab of tabsApartados(); track tab.id) {
          <button
            type="button"
            role="tab"
            class="tab-excel-btn"
            [class.active]="tabActivaId() === tab.id"
            [attr.aria-selected]="tabActivaId() === tab.id"
            (click)="seleccionarTab(tab.id)"
            [attr.data-testid]="'tab-excel-' + tab.tipo"
          >
            <!-- Icono SVG del apartado -->
            <span class="tab-excel-icono">
              @if (tab.tipo === 'senescyt') {
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
              } @else if (tab.tipo === 'en-curso') {
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              } @else {
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                  <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                </svg>
              }
            </span>

            <span class="tab-excel-titulo">{{ tab.titulo }}</span>

            <!-- Insignia de estado o conteo -->
            @if (tab.tipo === 'senescyt') {
              @if (tab.cumplido) {
                <span class="tab-badge badge-cumplido">✓ Cargado</span>
              } @else {
                <span
                  class="tab-badge"
                  [class.badge-obligatorio]="tab.esObligatorio"
                  [class.badge-opcional]="!tab.esObligatorio"
                >
                  {{ tab.esObligatorio ? 'Obligatorio' : 'Opcional' }}
                </span>
              }
            } @else {
              <span class="tab-badge badge-contador">{{ tab.conteo }}</span>
            }
          </button>
        }
      </div>

      <!-- Panel de Contenido de la Pestaña Activa -->
      <div class="tab-excel-panel">
        <!-- VISTA: REGISTRO SENESCYT (Carga exclusiva del documento sin datos adicionales) -->
        @if (esTabSenescytActiva()) {
          <div class="panel-senescyt-directo" data-testid="contenido-senescyt">
            <!-- Caso A: Documento ya cargado (y no en modo reemplazo) -->
            @if (tieneDocumentoSenescyt() && !modoReemplazarSenescyt()) {
              <div class="card-documento-guardado" data-testid="card-senescyt-guardado">
                <div class="doc-guardado-header">
                  <div class="doc-icono-exito">
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  </div>
                  <div class="doc-info-exito">
                    <div class="doc-titulo-row">
                      <h4 class="doc-titulo-principal">Certificado Oficial de Registro SENESCYT</h4>
                      <span class="badge badge-success">✓ Documento Cargado</span>
                    </div>
                    <p class="doc-subtitulo">
                      Su certificado oficial de la SENESCYT se encuentra registrado y respaldado en
                      su expediente digital.
                    </p>
                  </div>
                </div>

                @if (puedeEditar()) {
                  <div class="doc-acciones-footer">
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      (click)="activarReemplazoSenescyt()"
                      data-testid="btn-reemplazar-senescyt"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
                      </svg>
                      Reemplazar Documento PDF
                    </button>
                    <button
                      type="button"
                      class="btn-accion btn-eliminar"
                      (click)="eliminarSenescyt()"
                      data-testid="btn-eliminar-senescyt"
                    >
                      Eliminar
                    </button>
                  </div>
                }
              </div>
            } @else {
              <!-- Caso B: Sin documento o en modo reemplazo (Carga directa de PDF) -->
              <div class="card-uploader-senescyt" data-testid="panel-carga-senescyt">
                <div class="uploader-senescyt-header">
                  <div class="uploader-header-icono">
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  </div>
                  <div class="uploader-header-info">
                    <h3 class="uploader-header-titulo">
                      {{
                        modoReemplazarSenescyt()
                          ? 'Reemplazar Certificado de Registro SENESCYT'
                          : 'Cargar Certificado de Registro SENESCYT'
                      }}
                    </h3>
                    <p class="uploader-header-desc">
                      Adjunte el certificado oficial emitido por la SENESCYT en formato PDF (máx. 10
                      MB).
                      <strong
                        >Solo se requiere el archivo digital; no debe ingresar datos ni títulos
                        adicionales.</strong
                      >
                    </p>
                  </div>
                </div>

                <div class="mt-3">
                  <app-uploader-respaldo
                    etiqueta="Certificado de Registro SENESCYT (PDF)"
                    ayuda="Documento digital oficial descargado del portal de la SENESCYT"
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
                  @if (modoReemplazarSenescyt()) {
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      (click)="cancelarReemplazoSenescyt()"
                    >
                      Cancelar
                    </button>
                  }
                  <button
                    type="button"
                    class="btn btn-primary btn-sm"
                    [disabled]="guardando() || !modeloTitulo.archivoId"
                    (click)="guardarSenescytDirecto()"
                    data-testid="btn-guardar-senescyt"
                  >
                    {{
                      guardando()
                        ? 'Guardando...'
                        : modoReemplazarSenescyt()
                          ? 'Actualizar Certificado'
                          : 'Guardar Certificado SENESCYT'
                    }}
                  </button>
                </div>
              </div>
            }
          </div>
        }

        <!-- VISTA: TÍTULOS DE 3ER NIVEL / 4TO NIVEL / GENERAL -->
        @if (esTabTitulosActiva()) {
          <div class="panel-titulos-apartado" data-testid="contenido-titulos-obtenidos">
            <div class="apartado-header-row">
              <div class="apartado-info-texto">
                <h3 class="apartado-titulo">{{ tabActivaActual()?.titulo }}</h3>
                <p class="apartado-desc">
                  @if (tabActivaActual()?.tipo === '3er-nivel') {
                    Registre sus títulos universitarios de grado (licenciaturas, ingenierías,
                    tecnologías).
                  } @else if (tabActivaActual()?.tipo === '4to-nivel') {
                    Registre sus títulos de posgrado (especialidades médicas, maestrías,
                    doctorados/PhD).
                  } @else {
                    Registre los títulos académicos correspondientes a este apartado.
                  }
                </p>
              </div>

              @if (puedeEditar() && !mostrarFormTitulo()) {
                <button
                  type="button"
                  class="btn btn-primary btn-sm"
                  (click)="abrirFormTituloParaApartadoActivo()"
                  data-testid="btn-nuevo-titulo"
                >
                  + Registrar {{ tabActivaActual()?.titulo }}
                </button>
              }
            </div>

            <!-- Formulario Inline de Registro/Edición de Título -->
            @if (mostrarFormTitulo()) {
              <div class="card-formulario-item" data-testid="form-titulo">
                <div class="form-item-header">
                  <h3 class="form-titulo-item">
                    {{ idTituloEdicion() ? 'Editar Título Académico' : 'Nuevo Título Académico' }}
                  </h3>
                </div>

                <!-- Grado Académico y Nivel Académico -->
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
                      [disabled]="nivelesDisponibles().length <= 1"
                      data-testid="select-nivel-academico"
                    >
                      <option [ngValue]="undefined">Seleccione nivel...</option>
                      @for (n of nivelesDisponibles(); track n.id) {
                        <option [ngValue]="n.id">{{ n.nombre }}</option>
                      }
                    </select>
                  </div>

                  <div class="form-group">
                    <label for="gradoAcademico"
                      >Grado Académico <span class="text-danger">*</span></label
                    >
                    <select
                      [attr.aria-describedby]="'error-modeloTitulo-gradoAcademicoId'"
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
                    @if (
                      validacion.mensaje(modeloTitulo, 'titulo', 'gradoAcademicoId');
                      as mensaje
                    ) {
                      <small
                        id="error-modeloTitulo-gradoAcademicoId"
                        class="text-danger"
                        role="alert"
                        >{{ mensaje }}</small
                      >
                    }
                  </div>
                </div>

                <!-- Nombre Completo del Título -->
                <div class="form-group mt-3">
                  <label for="nombreTitulo"
                    >Nombre Completo del Título <span class="text-danger">*</span></label
                  >
                  <input
                    [attr.aria-describedby]="'error-modeloTitulo-nombreTitulo'"
                    id="nombreTitulo"
                    type="text"
                    class="form-control"
                    [(ngModel)]="modeloTitulo.nombreTitulo"
                    placeholder="Ej. Licenciado en Ciencias de la Educación / Ingeniero en Software"
                    data-testid="input-nombre-titulo"
                  />
                  @if (validacion.mensaje(modeloTitulo, 'titulo', 'nombreTitulo'); as mensaje) {
                    <small id="error-modeloTitulo-nombreTitulo" class="text-danger" role="alert">{{
                      mensaje
                    }}</small>
                  }
                </div>

                <!-- Selector de Universidad Mejorado: Segmented Switch + Búsqueda Rápida -->
                <div class="form-group mt-3">
                  <label for="universidad"
                    >Universidad / Institución de Educación Superior
                    <span class="text-danger">*</span></label
                  >
                  <div class="universidad-selector-bloque">
                    <!-- Segmented Toggle -->
                    <div class="segment-toggle" role="group" aria-label="Origen de la Institución">
                      <button
                        type="button"
                        class="segment-btn"
                        [class.active]="!modoOtraInstitucion()"
                        (click)="setModoOtraInstitucion(false)"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                          <path
                            d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
                          ></path>
                        </svg>
                        Catálogo de Universidades Nacionales
                      </button>
                      <button
                        type="button"
                        class="segment-btn"
                        [class.active]="modoOtraInstitucion()"
                        (click)="setModoOtraInstitucion(true)"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="2" y1="12" x2="22" y2="12"></line>
                          <path
                            d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
                          ></path>
                        </svg>
                        Otra Institución / Internacional
                      </button>
                    </div>

                    <!-- Modo 1: Catálogo Nacional con Búsqueda Integrada -->
                    @if (!modoOtraInstitucion()) {
                      <div class="catalogo-selector-box mt-2">
                        <div class="search-input-wrapper">
                          <svg
                            class="search-icon"
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                          </svg>
                          <input
                            type="search"
                            class="form-control form-control-search"
                            placeholder="Escriba para filtrar universidades (ej. Central, Politécnica, San Francisco...)"
                            [ngModel]="filtroUniversidad()"
                            (ngModelChange)="filtroUniversidad.set($event)"
                            [disabled]="!puedeEditar()"
                            name="buscarUniversidad"
                            data-testid="buscar-universidad"
                          />
                          @if (filtroUniversidad()) {
                            <button
                              type="button"
                              class="btn-clear-search"
                              (click)="filtroUniversidad.set('')"
                              title="Limpiar búsqueda"
                            >
                              ✕
                            </button>
                          }
                        </div>

                        <select
                          [attr.aria-describedby]="'error-modeloTitulo-universidadId'"
                          id="universidad"
                          class="form-control mt-1 select-universidad-estilizado"
                          [(ngModel)]="modeloTitulo.universidadId"
                          (ngModelChange)="onUniversidadSeleccionada($event)"
                          data-testid="select-universidad"
                        >
                          <option [ngValue]="undefined">
                            {{
                              universidadesFiltradas().length > 0
                                ? '— Seleccione una universidad (' +
                                  universidadesFiltradas().length +
                                  ' encontradas) —'
                                : 'No se encontraron instituciones con ese criterio'
                            }}
                          </option>
                          @for (u of universidadesFiltradas(); track u.id) {
                            <option [ngValue]="u.id">{{ u.nombre }}</option>
                          }
                        </select>
                        @if (
                          validacion.mensaje(modeloTitulo, 'titulo', 'universidadId');
                          as mensaje
                        ) {
                          <small
                            id="error-modeloTitulo-universidadId"
                            class="text-danger"
                            role="alert"
                            >{{ mensaje }}</small
                          >
                        }
                      </div>
                    } @else {
                      <!-- Modo 2: Otra Institución / Internacional -->
                      <div class="otra-institucion-box mt-2">
                        <input
                          [attr.aria-describedby]="'error-modeloTitulo-nombreInstitucionOtra'"
                          id="institucionOtra"
                          type="text"
                          class="form-control"
                          [(ngModel)]="modeloTitulo.nombreInstitucionOtra"
                          placeholder="Nombre oficial de la institución internacional o externa"
                          data-testid="input-institucion-otra"
                        />
                        <small class="text-muted text-xs">
                          Especifique el nombre completo de la institución educativa externa o
                          internacional.
                        </small>
                        @if (
                          validacion.mensaje(modeloTitulo, 'titulo', 'nombreInstitucionOtra');
                          as mensaje
                        ) {
                          <small
                            id="error-modeloTitulo-nombreInstitucionOtra"
                            class="text-danger"
                            role="alert"
                            >{{ mensaje }}</small
                          >
                        }
                      </div>
                    }
                  </div>
                </div>

                <!-- Datos de SENESCYT del Título (Opcionales, Fecha de Obtención removida) -->
                <div class="grid-dos mt-3">
                  <div class="form-group">
                    <label for="fechaRegistroSenescyt"
                      >Fecha de Registro SENESCYT
                      <span class="text-muted text-xs">(Opcional)</span></label
                    >
                    <input
                      id="fechaRegistroSenescyt"
                      type="date"
                      class="form-control"
                      [ngModel]="fechaRegistroSenescytStr"
                      (ngModelChange)="onFechaRegistroSenescytChange($event)"
                      data-testid="input-fecha-registro-senescyt"
                    />
                    @if (
                      validacion.mensaje(modeloTitulo, 'titulo', 'fechaRegistroSenescyt');
                      as mensaje
                    ) {
                      <small class="text-danger" role="alert">{{ mensaje }}</small>
                    }
                  </div>

                  <div class="form-group">
                    <label for="registroSenescyt"
                      >N° de Registro SENESCYT
                      <span class="text-muted text-xs">(Opcional)</span></label
                    >
                    <input
                      [attr.aria-describedby]="'error-modeloTitulo-numeroRegistroSenescyt'"
                      id="registroSenescyt"
                      type="text"
                      class="form-control"
                      [(ngModel)]="modeloTitulo.numeroRegistroSenescyt"
                      placeholder="Ej. 1005-2020-123456"
                      data-testid="input-registro-senescyt"
                    />
                    @if (
                      validacion.mensaje(modeloTitulo, 'titulo', 'numeroRegistroSenescyt');
                      as mensaje
                    ) {
                      <small
                        id="error-modeloTitulo-numeroRegistroSenescyt"
                        class="text-danger"
                        role="alert"
                        >{{ mensaje }}</small
                      >
                    }
                  </div>
                </div>

                <!-- Callout Informativo Sin Emojis & Uploader de Copia de Título -->
                <div
                  class="callout-informativo callout-titulo mt-3"
                  data-testid="aviso-respaldo-titulo"
                >
                  <div class="callout-icono">
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                  </div>
                  <div class="callout-texto">
                    <strong class="callout-titulo"
                      >Copia del Título Académico o Acta de Grado (PDF Obligatorio)</strong
                    >
                    <p class="callout-desc">
                      Adjunte la copia oficial del <strong>Título o Acta de Grado</strong> otorgada
                      por la institución de educación superior en formato
                      <strong>PDF legible</strong>.
                    </p>
                    <div class="callout-alerta">
                      <svg
                        class="alerta-svg-icono"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      <div>
                        <strong>Aclaración importante:</strong> Este documento es la copia expedida
                        por la universidad.
                        <strong>No adjunte aquí el Certificado de Registro de la SENESCYT</strong>
                        (ese es un documento independiente y se sube en el apartado «Registro
                        SENESCYT»).
                      </div>
                    </div>
                  </div>
                </div>

                <div class="mt-2">
                  <app-uploader-respaldo
                    etiqueta="Copia de Título Académico o Acta de Grado"
                    ayuda="Obligatorio. Archivo digital en formato PDF del título universitario o acta de grado (máx. 10 MB)"
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
                    [disabled]="guardando() || validacion.invalido(modeloTitulo, 'titulo')"
                    (click)="guardarTitulo()"
                    data-testid="btn-guardar-titulo"
                  >
                    {{ guardando() ? 'Guardando...' : 'Guardar Título' }}
                  </button>
                </div>
              </div>
            }

            <!-- Tabla de Títulos de este Apartado -->
            <div class="table-container mt-3">
              <table class="data-table" data-testid="tabla-titulos">
                <thead>
                  <tr>
                    <th>Título Académico</th>
                    <th>Institución Educativa</th>
                    <th>Registro SENESCYT</th>
                    <th>Respaldo PDF</th>
                    <th class="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (t of titulosDelApartadoActivo(); track t.id) {
                    <tr>
                      <td>
                        <div class="titulo-nombre-fila">
                          <strong>{{ t.nombreTitulo }}</strong>
                          @if (nombreSubindice(t.subindiceSeccionId); as nomSub) {
                            <span
                              class="badge badge-info badge-subindice"
                              data-testid="badge-subindice-titulo"
                              >{{ nomSub }}</span
                            >
                          }
                        </div>
                        <app-marca-observacion
                          [marca]="obtenerMarca('titulo', t.id)"
                        ></app-marca-observacion>
                      </td>
                      <td>{{ t.nombreInstitucionOtra || 'Catálogo Oficial' }}</td>
                      <td>
                        @if (t.numeroRegistroSenescyt || t.fechaRegistroSenescyt) {
                          <div>
                            @if (t.numeroRegistroSenescyt) {
                              <div class="registro-codigo">
                                <code>{{ t.numeroRegistroSenescyt }}</code>
                              </div>
                            }
                            @if (t.fechaRegistroSenescyt) {
                              <small class="text-muted text-xs"
                                >Reg: {{ t.fechaRegistroSenescyt | date: 'dd/MM/yyyy' }}</small
                              >
                            }
                          </div>
                        } @else {
                          <span class="text-muted">—</span>
                        }
                      </td>
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
                        No ha registrado títulos en {{ tabActivaActual()?.titulo }} todavía.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- VISTA: ESTUDIOS EN CURSO (RF-HDV-005) -->
        @if (esTabEnCursoActiva()) {
          <div class="panel-estudios-en-curso" data-testid="contenido-titulos-en-curso">
            <div class="apartado-header-row">
              <div class="apartado-info-texto">
                <h3 class="apartado-titulo">Estudios en Curso</h3>
                <p class="apartado-desc">
                  Registre programas académicos de grado o posgrado que actualmente se encuentre
                  cursando (RF-HDV-005).
                </p>
              </div>

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

            <!-- Formulario de Estudio en Curso -->
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
                    [attr.aria-describedby]="'error-modeloEnCurso-nombrePrograma'"
                    id="nombrePrograma"
                    type="text"
                    class="form-control"
                    [(ngModel)]="modeloEnCurso.nombrePrograma"
                    placeholder="Ej. Maestría en Inteligencia Artificial"
                    data-testid="input-nombre-programa"
                  />
                  @if (
                    validacion.mensaje(modeloEnCurso, 'tituloEnCurso', 'nombrePrograma');
                    as mensaje
                  ) {
                    <small
                      id="error-modeloEnCurso-nombrePrograma"
                      class="text-danger"
                      role="alert"
                      >{{ mensaje }}</small
                    >
                  }
                </div>

                <div class="grid-dos mt-3">
                  <div class="form-group">
                    <label for="gradoEnCurso"
                      >Grado que Obtendrá <span class="text-danger">*</span></label
                    >
                    <select
                      [attr.aria-describedby]="'error-modeloEnCurso-gradoAcademicoId'"
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
                    @if (
                      validacion.mensaje(modeloEnCurso, 'tituloEnCurso', 'gradoAcademicoId');
                      as mensaje
                    ) {
                      <small
                        id="error-modeloEnCurso-gradoAcademicoId"
                        class="text-danger"
                        role="alert"
                        >{{ mensaje }}</small
                      >
                    }
                  </div>

                  <div class="form-group">
                    <label for="institucionEnCurso"
                      >Institución Educativa <span class="text-danger">*</span></label
                    >
                    <input
                      [attr.aria-describedby]="'error-modeloEnCurso-nombreInstitucionOtra'"
                      id="institucionEnCurso"
                      type="text"
                      class="form-control"
                      [(ngModel)]="modeloEnCurso.nombreInstitucionOtra"
                      placeholder="Universidad donde cursa los estudios"
                      data-testid="input-institucion-en-curso"
                    />
                    @if (
                      validacion.mensaje(modeloEnCurso, 'tituloEnCurso', 'nombreInstitucionOtra');
                      as mensaje
                    ) {
                      <small
                        id="error-modeloEnCurso-nombreInstitucionOtra"
                        class="text-danger"
                        role="alert"
                        >{{ mensaje }}</small
                      >
                    }
                  </div>
                </div>

                <!-- Checkbox condicional de Beca -->
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
                        <label for="tipoBeca">Tipo de beca</label>
                        <select
                          [attr.aria-describedby]="'error-modeloEnCurso-tipoBecaId'"
                          id="tipoBeca"
                          class="form-control"
                          [(ngModel)]="modeloEnCurso.tipoBecaId"
                          data-testid="select-tipo-beca"
                        >
                          <option [ngValue]="undefined">Seleccione tipo...</option>
                          @for (tipo of tiposBeca(); track tipo.id) {
                            <option [ngValue]="tipo.id">{{ tipo.nombre }}</option>
                          }
                        </select>
                        @if (
                          validacion.mensaje(modeloEnCurso, 'tituloEnCurso', 'tipoBecaId');
                          as mensaje
                        ) {
                          <small
                            id="error-modeloEnCurso-tipoBecaId"
                            class="text-danger"
                            role="alert"
                            >{{ mensaje }}</small
                          >
                        }
                      </div>
                      <div class="form-group">
                        <label for="financiamientoBeca">Financiamiento de beca</label>
                        <select
                          [attr.aria-describedby]="'error-modeloEnCurso-financiamientoBecaId'"
                          id="financiamientoBeca"
                          class="form-control"
                          [(ngModel)]="modeloEnCurso.financiamientoBecaId"
                          data-testid="select-financiamiento-beca"
                        >
                          <option [ngValue]="undefined">Seleccione financiamiento...</option>
                          @for (tipo of financiamientosBeca(); track tipo.id) {
                            <option [ngValue]="tipo.id">{{ tipo.nombre }}</option>
                          }
                        </select>
                        @if (
                          validacion.mensaje(
                            modeloEnCurso,
                            'tituloEnCurso',
                            'financiamientoBecaId'
                          );
                          as mensaje
                        ) {
                          <small
                            id="error-modeloEnCurso-financiamientoBecaId"
                            class="text-danger"
                            role="alert"
                            >{{ mensaje }}</small
                          >
                        }
                      </div>
                    </div>
                    <div class="grid-dos mt-2">
                      <div class="form-group">
                        <label for="porcentajeBeca">Porcentaje de Cobertura (%)</label>
                        <input
                          [attr.aria-describedby]="'error-modeloEnCurso-porcentajeBeca'"
                          id="porcentajeBeca"
                          type="number"
                          min="1"
                          max="100"
                          class="form-control"
                          [(ngModel)]="modeloEnCurso.porcentajeBeca"
                          placeholder="100"
                          data-testid="input-porcentaje-beca"
                        />
                        @if (
                          validacion.mensaje(modeloEnCurso, 'tituloEnCurso', 'porcentajeBeca');
                          as mensaje
                        ) {
                          <small
                            id="error-modeloEnCurso-porcentajeBeca"
                            class="text-danger"
                            role="alert"
                            >{{ mensaje }}</small
                          >
                        }
                      </div>

                      <div class="form-group">
                        <label for="montoBeca">Monto de la Beca (USD)</label>
                        <input
                          [attr.aria-describedby]="'error-modeloEnCurso-montoBeca'"
                          id="montoBeca"
                          type="number"
                          min="0"
                          class="form-control"
                          [(ngModel)]="modeloEnCurso.montoBeca"
                          placeholder="5000"
                          data-testid="input-monto-beca"
                        />
                        @if (
                          validacion.mensaje(modeloEnCurso, 'tituloEnCurso', 'montoBeca');
                          as mensaje
                        ) {
                          <small
                            id="error-modeloEnCurso-montoBeca"
                            class="text-danger"
                            role="alert"
                            >{{ mensaje }}</small
                          >
                        }
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
                    [disabled]="guardando() || validacion.invalido(modeloEnCurso, 'tituloEnCurso')"
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
                        @if (nombreSubindice(c.subindiceSeccionId); as nomSub) {
                          <div>
                            <span class="badge badge-info" data-testid="badge-subindice-en-curso">{{
                              nomSub
                            }}</span>
                          </div>
                        }
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
      </div>

      <!-- Modal de Advertencia de Cambios sin Guardar -->
      <app-modal-cambios-sin-guardar
        [guardarDeshabilitado]="validacion.hayErrores()"
        [abierto]="mostrarModalSubtab()"
        [guardando]="guardando()"
        [mensajeError]="errorFormulario()"
        (guardarYContinuar)="guardarYCambiarSubtab()"
        (descartarYContinuar)="descartarYCambiarSubtab()"
        (quedarse)="cancelarCambioSubtab()"
      ></app-modal-cambios-sin-guardar>
    </section>
  `,
  styles: [
    `
      .seccion-formacion {
        padding: 0.75rem 0;
      }
      .seccion-header {
        margin-bottom: 1.25rem;
      }
      .seccion-titulo {
        font-size: 1.25rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 0.35rem 0;
      }
      .seccion-desc {
        font-size: 0.875rem;
        color: #64748b;
        margin: 0;
        line-height: 1.5;
      }

      /* Tabs Estilo Hoja de Excel */
      .tabs-excel-nav {
        display: flex;
        gap: 4px;
        background: #f1f5f9;
        padding: 6px 8px 0 8px;
        border-radius: 8px 8px 0 0;
        border: 1px solid #cbd5e1;
        border-bottom: 1px solid #cbd5e1;
        overflow-x: auto;
      }
      .tab-excel-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.625rem 1rem;
        font-size: 0.84rem;
        font-weight: 500;
        color: #475569;
        background: #e2e8f0;
        border: 1px solid #cbd5e1;
        border-bottom: none;
        border-radius: 6px 6px 0 0;
        cursor: pointer;
        white-space: nowrap;
        position: relative;
        top: 1px;
        transition:
          background-color 160ms cubic-bezier(0.16, 1, 0.3, 1),
          color 160ms cubic-bezier(0.16, 1, 0.3, 1),
          transform 160ms cubic-bezier(0.16, 1, 0.3, 1);
      }
      .tab-excel-btn:hover {
        background: #f8fafc;
        color: #0f172a;
      }
      .tab-excel-btn:active {
        transform: scale(0.98);
      }
      .tab-excel-btn.active {
        background: #ffffff;
        color: #0f172a;
        font-weight: 600;
        border-color: #cbd5e1;
        border-bottom: 2px solid #ffffff;
        box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.03);
        z-index: 2;
      }
      .tab-excel-btn.active::before {
        content: '';
        position: absolute;
        top: -1px;
        left: 0;
        right: 0;
        height: 3px;
        background: var(--ammi-primary, #1d1e1c);
        border-radius: 6px 6px 0 0;
      }
      .tab-excel-icono {
        display: inline-flex;
        align-items: center;
        color: currentColor;
      }
      .tab-excel-titulo {
        font-size: 0.84rem;
      }

      /* Badges en pestañas */
      .tab-badge {
        display: inline-flex;
        align-items: center;
        font-size: 0.685rem;
        padding: 0.12rem 0.45rem;
        border-radius: 999px;
        font-weight: 600;
      }
      .badge-contador {
        background: #cbd5e1;
        color: #1e293b;
      }
      .tab-excel-btn.active .badge-contador {
        background: #0f172a;
        color: #ffffff;
      }
      .badge-cumplido {
        background: #dcfce7;
        color: #15803d;
        border: 1px solid #bbf7d0;
      }
      .badge-obligatorio {
        background: #fee2e2;
        color: #b91c1c;
        border: 1px solid #fecaca;
      }
      .badge-opcional {
        background: #f1f5f9;
        color: #64748b;
        border: 1px solid #e2e8f0;
      }

      /* Panel de contenido de tab */
      .tab-excel-panel {
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-top: none;
        border-radius: 0 0 8px 8px;
        padding: 1.5rem;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
        margin-bottom: 1.5rem;
      }

      /* Header de apartado */
      .apartado-header-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 1rem;
        margin-bottom: 1.25rem;
      }
      .apartado-titulo {
        font-size: 1.05rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 0.2rem 0;
      }
      .apartado-desc {
        font-size: 0.84rem;
        color: #64748b;
        margin: 0;
      }

      /* SENESCYT Panel Directo */
      .card-documento-guardado {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 8px;
        padding: 1.25rem;
      }
      .doc-guardado-header {
        display: flex;
        gap: 1rem;
        align-items: flex-start;
      }
      .doc-icono-exito {
        color: #16a34a;
        flex-shrink: 0;
        margin-top: 2px;
      }
      .doc-info-exito {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .doc-titulo-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
      }
      .doc-titulo-principal {
        font-size: 1rem;
        font-weight: 700;
        color: #14532d;
        margin: 0;
      }
      .doc-subtitulo {
        font-size: 0.84rem;
        color: #166534;
        margin: 0;
      }
      .doc-acciones-footer {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-top: 1rem;
        padding-top: 0.75rem;
        border-top: 1px solid #dcfce7;
      }

      /* Uploader SENESCYT Directo */
      .card-uploader-senescyt {
        background: #fafafa;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 1.25rem;
      }
      .uploader-senescyt-header {
        display: flex;
        gap: 0.85rem;
        align-items: flex-start;
      }
      .uploader-header-icono {
        color: #059669;
        flex-shrink: 0;
        margin-top: 2px;
      }
      .uploader-header-titulo {
        font-size: 1rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 0.25rem 0;
      }
      .uploader-header-desc {
        font-size: 0.84rem;
        color: #475569;
        margin: 0;
        line-height: 1.45;
      }

      /* Formulario Item */
      .card-formulario-item {
        background: #fafafa;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 1.25rem;
        margin-bottom: 1.5rem;
      }
      .form-item-header {
        margin-bottom: 1rem;
      }
      .form-titulo-item {
        font-size: 1rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0;
      }

      /* Selector de Universidad Mejorado */
      .universidad-selector-bloque {
        display: flex;
        flex-direction: column;
      }
      .segment-toggle {
        display: inline-flex;
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 2px;
        gap: 2px;
        align-self: flex-start;
      }
      .segment-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.35rem 0.75rem;
        font-size: 0.785rem;
        font-weight: 500;
        color: #64748b;
        background: transparent;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition:
          background-color 160ms cubic-bezier(0.16, 1, 0.3, 1),
          color 160ms cubic-bezier(0.16, 1, 0.3, 1),
          transform 160ms cubic-bezier(0.16, 1, 0.3, 1);
      }
      .segment-btn:hover {
        color: #0f172a;
      }
      .segment-btn:active {
        transform: scale(0.97);
      }
      .segment-btn.active {
        background: #ffffff;
        color: #0f172a;
        font-weight: 600;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      }
      .search-input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
      }
      .search-input-wrapper .search-icon {
        position: absolute;
        left: 0.65rem;
        color: #94a3b8;
        pointer-events: none;
      }
      .form-control-search {
        padding-left: 2rem !important;
        padding-right: 1.75rem !important;
      }
      .btn-clear-search {
        position: absolute;
        right: 0.5rem;
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-size: 0.8rem;
        padding: 0.2rem;
      }
      .btn-clear-search:hover {
        color: #334155;
      }

      /* Callout Informativo Sin Emojis */
      .callout-informativo {
        display: flex;
        gap: 0.85rem;
        align-items: flex-start;
        border-radius: 8px;
        padding: 0.85rem 1rem;
        font-size: 0.825rem;
      }
      .callout-titulo {
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        border-left: 4px solid #2563eb;
        color: #1e293b;
      }
      .callout-icono {
        flex-shrink: 0;
        margin-top: 2px;
        color: #2563eb;
      }
      .callout-texto {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .callout-texto strong.callout-titulo {
        font-size: 0.875rem;
        font-weight: 700;
        color: #0f172a;
      }
      .callout-desc {
        margin: 0;
        line-height: 1.45;
        color: #334155;
      }
      .callout-alerta {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        margin-top: 0.5rem;
        padding: 0.5rem 0.75rem;
        background: #fffbeb;
        border: 1px solid #fde68a;
        border-radius: 6px;
        font-size: 0.785rem;
        color: #92400e;
        line-height: 1.45;
      }
      .alerta-svg-icono {
        flex-shrink: 0;
        margin-top: 2px;
        color: #d97706;
      }

      /* Grids y Controles */
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
        transition:
          border-color 160ms cubic-bezier(0.16, 1, 0.3, 1),
          box-shadow 160ms cubic-bezier(0.16, 1, 0.3, 1);
      }
      .form-control:focus {
        border-color: #0f172a;
        outline: none;
        box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.1);
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

      /* Tablas */
      .data-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.875rem;
      }
      .data-table th {
        background: #f8fafc;
        padding: 0.625rem 0.875rem;
        text-align: left;
        font-weight: 600;
        color: #475569;
        border-bottom: 1px solid #e2e8f0;
        font-size: 0.8rem;
        letter-spacing: 0.02em;
      }
      .data-table td {
        padding: 0.625rem 0.875rem;
        border-bottom: 1px solid #f1f5f9;
        color: #1e293b;
      }
      .data-table tbody tr {
        transition: background-color 160ms cubic-bezier(0.16, 1, 0.3, 1);
      }
      .data-table tbody tr:hover {
        background: #f8fafc;
      }
      .titulo-nombre-fila {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.4rem;
      }
      .badge-subindice {
        background: #f1f5f9;
        color: #334155;
        border: 1px solid #cbd5e1;
        font-size: 0.7rem;
      }
      .registro-codigo code {
        font-family: monospace;
        font-size: 0.8rem;
        background: #f1f5f9;
        padding: 0.1rem 0.35rem;
        border-radius: 4px;
        color: #0f172a;
      }
      .text-xs {
        font-size: 0.75rem;
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
        border: 1px solid #bbf7d0;
      }
      .badge-danger {
        background: #fee2e2;
        color: #b91c1c;
        border: 1px solid #fecaca;
      }
      .badge-info {
        background: #e0f2fe;
        color: #0369a1;
        border: 1px solid #bae6fd;
      }
      .btn-accion {
        background: transparent;
        border: none;
        cursor: pointer;
        font-size: 0.8125rem;
        font-weight: 600;
        margin-left: 0.5rem;
        transition: color 160ms cubic-bezier(0.16, 1, 0.3, 1);
      }
      .btn-editar {
        color: var(--ammi-primary, #1d1e1c);
      }
      .btn-editar:hover {
        text-decoration: underline;
      }
      .btn-eliminar {
        color: #ef4444;
      }
      .btn-eliminar:hover {
        text-decoration: underline;
      }
      .btn {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        border: none;
        transition:
          transform 160ms cubic-bezier(0.16, 1, 0.3, 1),
          background-color 160ms cubic-bezier(0.16, 1, 0.3, 1),
          box-shadow 160ms cubic-bezier(0.16, 1, 0.3, 1);
      }
      .btn:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
      }
      .btn:active:not(:disabled) {
        transform: scale(0.97);
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
      .btn-secondary:hover:not(:disabled) {
        background: #cbd5e1;
      }
      .text-right {
        text-align: right;
      }
      .mt-1 {
        margin-top: 0.25rem;
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
export class FormacionAcademicaComponent implements OnInit, OnDestroy, SeccionConCambios {
  readonly validacion = inject(ValidacionHojaDeVidaService);
  private readonly registroValidacion = this.validacion.registrarFormulario(
    'formacion-academica',
    () =>
      (this.mostrarFormTitulo() && this.validacion.invalido(this.modeloTitulo, 'titulo')) ||
      (this.mostrarFormEnCurso() && this.validacion.invalido(this.modeloEnCurso, 'tituloEnCurso')),
    inject(DestroyRef),
  );

  readonly mostrarModalSubtab = signal(false);
  subtabPendiente?: 'obtenidos' | 'en-curso';
  tabPendienteId?: string;

  private readonly state = inject(HojaDeVidaStateService);
  private readonly catalogos = inject(CatalogosCacheService);

  readonly puedeEditar = this.state.puedeEditar;
  readonly guardando = this.state.guardando;

  readonly titulos = this.state.titulos;
  readonly titulosEnCurso = this.state.titulosEnCurso;
  readonly subindicesSeccion =
    this.state.subindicesSeccion ?? signal<EstadoSubindiceSeccionPersonaDto[]>([]);
  readonly subindicesActivos = computed(() =>
    this.subindicesSeccion().filter((s) => s.seccion === 'formacion' && s.activo),
  );

  readonly idsSubindicesCumplidos = computed(() => {
    const ids = new Set<string>();
    for (const t of this.titulos()) {
      if (t.subindiceSeccionId && t.archivoId) ids.add(t.subindiceSeccionId);
    }
    for (const tc of this.titulosEnCurso()) {
      if (tc.subindiceSeccionId && tc.archivoId) ids.add(tc.subindiceSeccionId);
    }
    return ids;
  });

  readonly conteosPorSubindice = computed(() => {
    const mapa: Record<string, number> = {};
    for (const t of this.titulos()) {
      if (t.subindiceSeccionId) {
        mapa[t.subindiceSeccionId] = (mapa[t.subindiceSeccionId] ?? 0) + 1;
      }
    }
    for (const tc of this.titulosEnCurso()) {
      if (tc.subindiceSeccionId) {
        mapa[tc.subindiceSeccionId] = (mapa[tc.subindiceSeccionId] ?? 0) + 1;
      }
    }
    return mapa;
  });

  // Pestañas Estilo Hojas de Excel
  readonly tabsApartados = computed<TabExcelItem[]>(() => {
    const subs = this.subindicesActivos();
    const titulos = this.titulos();
    const titulosEnCurso = this.titulosEnCurso();

    const countForSub = (subId?: string) => {
      if (!subId) return 0;
      return titulos.filter((t) => t.subindiceSeccionId === subId).length;
    };
    const hasDocForSub = (subId?: string) => {
      if (!subId) return false;
      return titulos.some((t) => t.subindiceSeccionId === subId && t.archivoId);
    };

    if (subs.length > 0) {
      const items: TabExcelItem[] = [];
      for (const sub of subs) {
        const lower = sub.nombre.toLowerCase();
        let tipo: '3er-nivel' | '4to-nivel' | 'senescyt' | 'en-curso' | 'general';
        if (lower.includes('senescyt')) {
          tipo = 'senescyt';
        } else if (
          lower.includes('4to') ||
          lower.includes('cuarto') ||
          lower.includes('posgrado')
        ) {
          tipo = '4to-nivel';
        } else if (
          lower.includes('3er') ||
          lower.includes('tercer') ||
          lower.includes('pregrado')
        ) {
          tipo = '3er-nivel';
        } else if (lower.includes('curso')) {
          tipo = 'en-curso';
        } else {
          tipo = 'general';
        }

        items.push({
          id: sub.id,
          tipo,
          titulo: sub.nombre,
          subindiceId: sub.id,
          esObligatorio: sub.esObligatorio,
          cumplido: hasDocForSub(sub.id),
          conteo: countForSub(sub.id),
        });
      }

      if (!items.some((t) => t.tipo === 'en-curso')) {
        items.push({
          id: 'tab-en-curso',
          tipo: 'en-curso',
          titulo: 'Estudios en Curso',
          subindiceId: undefined,
          esObligatorio: false,
          cumplido: titulosEnCurso.some((tc) => tc.archivoId),
          conteo: titulosEnCurso.length,
        });
      }
      return items;
    }

    // Configuración por defecto si no existen subíndices en BD
    return [
      {
        id: 'tab-3er-nivel',
        tipo: '3er-nivel',
        titulo: 'Título 3er nivel',
        esObligatorio: false,
        cumplido: titulos.some((t) => t.archivoId),
        conteo: titulos.length,
      },
      {
        id: 'tab-4to-nivel',
        tipo: '4to-nivel',
        titulo: 'Título 4to nivel',
        esObligatorio: false,
        cumplido: false,
        conteo: 0,
      },
      {
        id: 'tab-senescyt',
        tipo: 'senescyt',
        titulo: 'Registro SENESCYT',
        esObligatorio: true,
        cumplido: titulos.some(
          (t) => t.nombreTitulo?.toLowerCase().includes('senescyt') && t.archivoId,
        ),
        conteo: titulos.filter((t) => t.nombreTitulo?.toLowerCase().includes('senescyt')).length,
      },
      {
        id: 'tab-en-curso',
        tipo: 'en-curso',
        titulo: 'Estudios en Curso',
        esObligatorio: false,
        cumplido: titulosEnCurso.some((tc) => tc.archivoId),
        conteo: titulosEnCurso.length,
      },
    ];
  });

  readonly tabActivaId = signal<string>('');
  readonly tabActivaActual = computed<TabExcelItem | undefined>(() => {
    const id = this.tabActivaId();
    const tabs = this.tabsApartados();
    return tabs.find((t) => t.id === id) ?? tabs[0];
  });

  readonly esTabEnCursoActiva = computed(
    () => this.subtabActiva() === 'en-curso' || this.tabActivaActual()?.tipo === 'en-curso',
  );
  readonly esTabSenescytActiva = computed(
    () => this.subtabActiva() !== 'en-curso' && this.tabActivaActual()?.tipo === 'senescyt',
  );
  readonly esTabTitulosActiva = computed(
    () =>
      this.subtabActiva() !== 'en-curso' &&
      (this.tabActivaActual()?.tipo === '3er-nivel' ||
        this.tabActivaActual()?.tipo === '4to-nivel' ||
        this.tabActivaActual()?.tipo === 'general'),
  );

  // Retrocompatibilidad para subtabActiva
  readonly subtabActiva = signal<'obtenidos' | 'en-curso'>('obtenidos');

  // Estado SENESCYT Directo
  readonly modoReemplazarSenescyt = signal(false);
  readonly tituloSenescytActual = computed(() => {
    const tab = this.tabActivaActual();
    const subId = tab?.subindiceId;
    return this.titulos().find(
      (t) =>
        (subId && t.subindiceSeccionId === subId) ||
        t.nombreTitulo?.toLowerCase().includes('senescyt') ||
        t.nombreInstitucionOtra?.toLowerCase() === 'senescyt',
    );
  });
  readonly tieneDocumentoSenescyt = computed(() => {
    const t = this.tituloSenescytActual();
    return !!(t && t.archivoId);
  });

  // Títulos filtrados para el apartado activo
  readonly titulosDelApartadoActivo = computed(() => {
    const tab = this.tabActivaActual();
    if (!tab) return this.titulos();

    if (tab.subindiceId) {
      return this.titulos().filter((t) => t.subindiceSeccionId === tab.subindiceId);
    }
    if (tab.tipo === '3er-nivel' || tab.tipo === '4to-nivel') {
      return this.titulos().filter((t) => !t.nombreTitulo?.toLowerCase().includes('senescyt'));
    }
    return this.titulos();
  });

  readonly esSubindiceSenescyt = computed(() => {
    if (this.tabActivaActual()?.tipo === 'senescyt') return true;
    const subId = this.modeloTitulo.subindiceSeccionId;
    if (!subId) return false;
    const sub = this.subindicesSeccion().find((s) => s.id === subId);
    return sub ? sub.nombre.toLowerCase().includes('senescyt') : false;
  });

  // Catálogos
  readonly nivelesAcademicos = signal<ElementoCatalogoDto[]>([]);
  readonly nivelesDisponibles = computed(() => {
    const tab = this.tabActivaActual();
    const todos = this.nivelesAcademicos();
    if (!tab) return todos;

    if (tab.tipo === '3er-nivel') {
      const filtrados = todos.filter((n) => {
        const nom = n.nombre.toLowerCase();
        return (
          (nom.includes('tercer') ||
            nom.includes('grado') ||
            nom.includes('técnico') ||
            nom.includes('tecnológico') ||
            n.codigo === '1' ||
            n.codigo === 'TER') &&
          !nom.includes('cuarto') &&
          !nom.includes('posgrado') &&
          !nom.includes('especialidad') &&
          !nom.includes('maestría') &&
          !nom.includes('phd')
        );
      });
      return filtrados.length > 0 ? filtrados : todos;
    }

    if (tab.tipo === '4to-nivel') {
      const filtrados = todos.filter((n) => {
        const nom = n.nombre.toLowerCase();
        return (
          nom.includes('cuarto') ||
          nom.includes('posgrado') ||
          nom.includes('especialidad') ||
          nom.includes('maestría') ||
          nom.includes('phd') ||
          nom.includes('doctorado')
        );
      });
      return filtrados.length > 0 ? filtrados : todos;
    }

    return todos;
  });
  readonly gradosAcademicos = signal<ElementoCatalogoDto[]>([]);
  readonly todosLosGrados = signal<ElementoCatalogoDto[]>([]);
  readonly universidades = signal<ElementoCatalogoDto[]>([]);
  readonly filtroUniversidad = signal('');
  readonly universidadesFiltradas = computed(() =>
    filtrarCatalogo(
      this.universidades(),
      this.filtroUniversidad(),
      this.modeloTitulo.universidadId,
    ),
  );
  readonly camposAmplios = signal<ElementoCatalogoDto[]>([]);
  readonly camposEspecificos = signal<ElementoCatalogoDto[]>([]);
  readonly camposDetallados = signal<ElementoCatalogoDto[]>([]);
  readonly tiposBeca = signal<ElementoCatalogoDto[]>([]);
  readonly financiamientosBeca = signal<ElementoCatalogoDto[]>([]);
  campoAmplioId?: number;
  campoEspecificoId?: number;

  readonly nivelSeleccionadoId = signal<number | undefined>(undefined);
  readonly modoOtraInstitucion = signal(false);

  // Formulario Título Obtenido
  readonly mostrarFormTitulo = signal(false);
  readonly idTituloEdicion = signal<string | undefined>(undefined);
  readonly errorFormulario = signal('');
  fechaObtencionStr = '';
  fechaRegistroSenescytStr = '';

  modeloTitulo: GuardarTituloAcademicoRequest = {
    nombreTitulo: '',
    gradoAcademicoId: 0,
    universidadId: undefined,
    nombreInstitucionOtra: undefined,
    numeroRegistroSenescyt: undefined,
    fechaObtencion: undefined,
    fechaRegistroSenescyt: undefined,
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
    this.state.registrarSeccion?.(this);
    this.catalogos.nivelesAcademicos().subscribe((n) => {
      this.nivelesAcademicos.set(n);
      if (this.nivelSeleccionadoId()) {
        this.onNivelChange(this.nivelSeleccionadoId());
      }
    });
    this.catalogos.universidades().subscribe((u) => this.universidades.set(u));
    this.catalogos.obtener('GradoAcademico').subscribe((g) => this.todosLosGrados.set(g));
    this.catalogos.obtener('TipoBeca').subscribe((datos) => this.tiposBeca.set(datos));
    this.catalogos
      .obtener('FinanciamientoBeca')
      .subscribe((datos) => this.financiamientosBeca.set(datos));
    forkJoin({
      amplios: this.catalogos.obtener('CampoAmplioUnesco'),
      especificos: this.catalogos.obtener('CampoEspecificoUnesco'),
      detallados: this.catalogos.obtener('CampoDetalladoUnesco'),
    }).subscribe(({ amplios, especificos, detallados }) => {
      this.camposAmplios.set(amplios);
      this.camposEspecificos.set(especificos);
      this.camposDetallados.set(detallados);
      this.restaurarCamposTitulo();
    });

    // Inicializar pestaña activa
    const tabs = this.tabsApartados();
    if (tabs.length > 0 && !this.tabActivaId()) {
      this.tabActivaId.set(tabs[0].id);
    }
  }

  seleccionarTab(tabId: string): void {
    if (this.tabActivaId() === tabId) return;
    if (this.tieneCambios()) {
      this.tabPendienteId = tabId;
      this.mostrarModalSubtab.set(true);
      return;
    }
    this.aplicarCambioTab(tabId);
  }

  private aplicarCambioTab(tabId: string): void {
    this.tabActivaId.set(tabId);
    this.cancelarFormTitulo();
    this.cancelarFormEnCurso();
    this.modoReemplazarSenescyt.set(false);

    const tab = this.tabsApartados().find((t) => t.id === tabId);
    if (tab?.tipo === 'en-curso') {
      this.subtabActiva.set('en-curso');
    } else {
      this.subtabActiva.set('obtenidos');
    }
  }

  intentarCambiarSubtab(nueva: 'obtenidos' | 'en-curso'): void {
    if (this.subtabActiva() === nueva) return;
    if (this.tieneCambios()) {
      this.subtabPendiente = nueva;
      this.mostrarModalSubtab.set(true);
      return;
    }
    this.subtabActiva.set(nueva);
    if (nueva === 'en-curso') {
      const tabEnCurso = this.tabsApartados().find((t) => t.tipo === 'en-curso');
      if (tabEnCurso) this.tabActivaId.set(tabEnCurso.id);
    } else {
      const tabObt = this.tabsApartados().find((t) => t.tipo !== 'en-curso');
      if (tabObt) this.tabActivaId.set(tabObt.id);
    }
  }

  guardarYCambiarSubtab(): void {
    this.guardarCambios().subscribe((ok) => {
      if (ok) {
        this.mostrarModalSubtab.set(false);
        if (this.tabPendienteId) {
          this.aplicarCambioTab(this.tabPendienteId);
          this.tabPendienteId = undefined;
        } else if (this.subtabPendiente) {
          this.intentarCambiarSubtab(this.subtabPendiente);
          this.subtabPendiente = undefined;
        }
      }
    });
  }

  descartarYCambiarSubtab(): void {
    this.descartarCambios();
    this.mostrarModalSubtab.set(false);
    if (this.tabPendienteId) {
      this.aplicarCambioTab(this.tabPendienteId);
      this.tabPendienteId = undefined;
    } else if (this.subtabPendiente) {
      this.intentarCambiarSubtab(this.subtabPendiente);
      this.subtabPendiente = undefined;
    }
  }

  cancelarCambioSubtab(): void {
    this.mostrarModalSubtab.set(false);
    this.subtabPendiente = undefined;
    this.tabPendienteId = undefined;
  }

  setModoOtraInstitucion(valor: boolean): void {
    this.modoOtraInstitucion.set(valor);
    if (valor) {
      this.modeloTitulo.universidadId = undefined;
      this.filtroUniversidad.set('');
    } else {
      this.modeloTitulo.nombreInstitucionOtra = undefined;
    }
  }

  onUniversidadSeleccionada(id?: number): void {
    this.modeloTitulo.universidadId = id;
    if (id) {
      this.modeloTitulo.nombreInstitucionOtra = undefined;
    }
  }

  especificosDisponibles(): ElementoCatalogoDto[] {
    return this.camposEspecificos().filter((campo) => campo.padreId === this.campoAmplioId);
  }

  detalladosDisponibles(): ElementoCatalogoDto[] {
    return this.camposDetallados().filter((campo) => campo.padreId === this.campoEspecificoId);
  }

  cambiarCampoAmplio(id?: number): void {
    this.campoAmplioId = id;
    this.campoEspecificoId = undefined;
    this.modeloTitulo.campoDetalladoUnescoId = undefined;
  }

  cambiarCampoEspecifico(id?: number): void {
    this.campoEspecificoId = id;
    this.modeloTitulo.campoDetalladoUnescoId = undefined;
  }

  private restaurarCamposTitulo(): void {
    this.campoEspecificoId = this.camposDetallados().find(
      (campo) => campo.id === this.modeloTitulo.campoDetalladoUnescoId,
    )?.padreId;
    this.campoAmplioId = this.camposEspecificos().find(
      (campo) => campo.id === this.campoEspecificoId,
    )?.padreId;
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
    this.modeloTitulo.fechaObtencion = fechaSinHora(valor);
  }

  onFechaRegistroSenescytChange(valor: string): void {
    this.fechaRegistroSenescytStr = valor;
    this.modeloTitulo.fechaRegistroSenescyt = fechaSinHora(valor);
  }

  onSubindiceTituloChange(subId?: string): void {
    this.modeloTitulo.subindiceSeccionId = subId;
    if (!subId) return;
    const sub = this.subindicesSeccion().find((s) => s.id === subId);
    if (!sub) return;

    if (sub.nombre.toLowerCase().includes('senescyt')) {
      if (!this.modeloTitulo.nombreTitulo?.trim()) {
        this.modeloTitulo.nombreTitulo = 'Certificado de Registro SENESCYT';
      }
      if (!this.modeloTitulo.nombreInstitucionOtra?.trim()) {
        this.modeloTitulo.nombreInstitucionOtra = 'SENESCYT';
      }
      if (!this.modeloTitulo.gradoAcademicoId || this.modeloTitulo.gradoAcademicoId === 0) {
        this.modeloTitulo.gradoAcademicoId =
          this.gradosAcademicos()[0]?.id || this.todosLosGrados()[0]?.id || 1;
      }
    }
  }

  abrirFormTitulo(): void {
    this.idTituloEdicion.set(undefined);
    this.errorFormulario.set('');
    this.fechaObtencionStr = '';
    this.fechaRegistroSenescytStr = '';
    this.campoAmplioId = undefined;
    this.campoEspecificoId = undefined;
    this.filtroUniversidad.set('');
    this.modoOtraInstitucion.set(false);
    this.modeloTitulo = {
      nombreTitulo: '',
      gradoAcademicoId: 0,
      universidadId: undefined,
      nombreInstitucionOtra: undefined,
      numeroRegistroSenescyt: undefined,
      fechaObtencion: undefined,
      fechaRegistroSenescyt: undefined,
      archivoId: undefined,
    };
    this.mostrarFormTitulo.set(true);
  }

  abrirFormTituloParaApartadoActivo(): void {
    this.abrirFormTitulo();
    const tab = this.tabActivaActual();
    if (!tab) return;

    this.modeloTitulo.subindiceSeccionId = tab.subindiceId;

    // Autoseleccionar nivel según el apartado activo
    if (tab.tipo === '3er-nivel') {
      const nivel3 =
        this.nivelesDisponibles().find((n) => n.nombre.toLowerCase().includes('grado')) ??
        this.nivelesDisponibles().find(
          (n) => n.codigo === '1' || n.nombre.toLowerCase().includes('tercer'),
        ) ??
        this.nivelesDisponibles()[0];
      if (nivel3) {
        this.onNivelChange(nivel3.id);
      }
    } else if (tab.tipo === '4to-nivel') {
      const nivel4 =
        this.nivelesDisponibles().find((n) => n.nombre.toLowerCase().includes('maestría')) ??
        this.nivelesDisponibles().find(
          (n) =>
            ['4', '5', '6', '7'].includes(n.codigo ?? '') ||
            n.nombre.toLowerCase().includes('posgrado') ||
            n.nombre.toLowerCase().includes('cuarto'),
        ) ??
        this.nivelesDisponibles()[0];
      if (nivel4) {
        this.onNivelChange(nivel4.id);
      }
    }
  }

  editarTitulo(titulo: TituloAcademicoDto): void {
    this.idTituloEdicion.set(titulo.id);
    this.errorFormulario.set('');
    this.filtroUniversidad.set('');
    this.modoOtraInstitucion.set(!!titulo.nombreInstitucionOtra && !titulo.universidadId);

    this.modeloTitulo = {
      nombreTitulo: titulo.nombreTitulo,
      gradoAcademicoId: titulo.gradoAcademicoId,
      universidadId: titulo.universidadId,
      campoDetalladoUnescoId: titulo.campoDetalladoUnescoId,
      nombreInstitucionOtra: titulo.nombreInstitucionOtra,
      numeroRegistroSenescyt: titulo.numeroRegistroSenescyt,
      fechaObtencion: titulo.fechaObtencion,
      fechaRegistroSenescyt: titulo.fechaRegistroSenescyt,
      archivoId: titulo.archivoId,
      subindiceSeccionId: titulo.subindiceSeccionId,
    };
    this.restaurarCamposTitulo();
    if (titulo.fechaObtencion) {
      this.fechaObtencionStr = new Date(titulo.fechaObtencion).toISOString().split('T')[0];
    } else {
      this.fechaObtencionStr = '';
    }
    if (titulo.fechaRegistroSenescyt) {
      this.fechaRegistroSenescytStr = new Date(titulo.fechaRegistroSenescyt)
        .toISOString()
        .split('T')[0];
    } else {
      this.fechaRegistroSenescytStr = '';
    }
    const grado = this.todosLosGrados().find((g) => g.id === titulo.gradoAcademicoId);
    if (grado?.padreId) {
      this.nivelSeleccionadoId.set(grado.padreId);
      this.catalogos.gradosAcademicos(grado.padreId).subscribe((g) => this.gradosAcademicos.set(g));
    }
    this.mostrarFormTitulo.set(true);
  }

  cancelarFormTitulo(): void {
    this.mostrarFormTitulo.set(false);
    this.idTituloEdicion.set(undefined);
    this.fechaRegistroSenescytStr = '';
    this.fechaObtencionStr = '';
  }

  // --- Operaciones SENESCYT Directo (Solo Documento PDF) ---
  activarReemplazoSenescyt(): void {
    const t = this.tituloSenescytActual();
    this.idTituloEdicion.set(t?.id);
    this.modeloTitulo.archivoId = undefined;
    this.modoReemplazarSenescyt.set(true);
    this.errorFormulario.set('');
  }

  cancelarReemplazoSenescyt(): void {
    this.modoReemplazarSenescyt.set(false);
    this.idTituloEdicion.set(undefined);
    this.modeloTitulo.archivoId = undefined;
    this.errorFormulario.set('');
  }

  guardarSenescytDirecto(): void {
    if (!this.modeloTitulo.archivoId) {
      this.errorFormulario.set(
        'Debe adjuntar el archivo PDF del Certificado de Registro SENESCYT.',
      );
      return;
    }
    const tab = this.tabActivaActual();
    const subId =
      tab?.tipo === 'senescyt'
        ? tab.subindiceId
        : this.subindicesActivos().find((s) => s.nombre.toLowerCase().includes('senescyt'))?.id;

    const req: GuardarTituloAcademicoRequest = {
      nombreTitulo: 'Certificado de Registro SENESCYT',
      nombreInstitucionOtra: 'SENESCYT',
      gradoAcademicoId: this.gradosAcademicos()[0]?.id || this.todosLosGrados()[0]?.id || 1,
      archivoId: this.modeloTitulo.archivoId,
      subindiceSeccionId: subId,
      fechaObtencion: undefined,
      fechaRegistroSenescyt: undefined,
      numeroRegistroSenescyt: undefined,
    };

    const idEdicion = this.idTituloEdicion() || this.tituloSenescytActual()?.id;
    this.state
      .guardarTitulo(req, idEdicion)
      .pipe(
        map(() => {
          this.cancelarFormTitulo();
          this.modoReemplazarSenescyt.set(false);
          this.modeloTitulo.archivoId = undefined;
          this.errorFormulario.set('');
          this.state.actualizarEstadoCambios?.();
          return true;
        }),
        catchError((err) => {
          this.errorFormulario.set(mensajeError(err, 'Error al guardar el Certificado SENESCYT.'));
          return of(false);
        }),
      )
      .subscribe();
  }

  eliminarSenescyt(): void {
    const t = this.tituloSenescytActual();
    if (!t) return;
    if (!confirm('¿Está seguro de eliminar el Certificado de Registro SENESCYT?')) return;
    this.state.eliminarTitulo(t.id).subscribe();
  }

  guardarTituloObservable(): Observable<boolean> {
    if (this.esSubindiceSenescyt()) {
      if (!this.modeloTitulo.archivoId) {
        this.errorFormulario.set(
          'Debe adjuntar el archivo PDF del Certificado de Registro SENESCYT.',
        );
        return of(false);
      }
      if (!this.modeloTitulo.nombreTitulo?.trim()) {
        this.modeloTitulo.nombreTitulo = 'Certificado de Registro SENESCYT';
      }
      if (!this.modeloTitulo.gradoAcademicoId || this.modeloTitulo.gradoAcademicoId === 0) {
        this.modeloTitulo.gradoAcademicoId =
          this.gradosAcademicos()[0]?.id || this.todosLosGrados()[0]?.id || 1;
      }
      if (!this.modeloTitulo.universidadId && !this.modeloTitulo.nombreInstitucionOtra?.trim()) {
        this.modeloTitulo.nombreInstitucionOtra = 'SENESCYT';
      }
    } else {
      if (!this.modeloTitulo.nombreTitulo?.trim()) {
        this.errorFormulario.set('El nombre del título es obligatorio.');
        return of(false);
      }
      if (!this.modeloTitulo.gradoAcademicoId) {
        this.errorFormulario.set('Debe seleccionar el grado académico.');
        return of(false);
      }
      if (!this.modeloTitulo.universidadId && !this.modeloTitulo.nombreInstitucionOtra?.trim()) {
        this.errorFormulario.set(
          'Debe indicar la universidad del catálogo o el nombre de otra institución (RF-HDV-003).',
        );
        return of(false);
      }
      if (!this.modeloTitulo.archivoId) {
        this.errorFormulario.set(
          'Debe adjuntar la copia del título o acta de grado en formato PDF (RF-HDV-006, RF-HDV-024).',
        );
        return of(false);
      }
    }

    if (this.validacion.invalido(this.modeloTitulo, 'titulo')) return of(false);
    return this.state.guardarTitulo(this.modeloTitulo, this.idTituloEdicion()).pipe(
      map(() => {
        this.cancelarFormTitulo();
        this.state.actualizarEstadoCambios?.();
        return true;
      }),
      catchError((err) => {
        this.validacion.registrarError(err, this.modeloTitulo);
        this.errorFormulario.set(mensajeError(err, 'Error al guardar el título.'));
        return of(false);
      }),
    );
  }

  guardarTitulo(): void {
    this.guardarTituloObservable().subscribe();
  }

  eliminarTitulo(id: string): void {
    if (!confirm('¿Está seguro de eliminar este título académico?')) return;
    this.state.eliminarTitulo(id).subscribe();
  }

  // --- Métodos Estudios en Curso ---
  abrirFormEnCurso(): void {
    const tabEnCurso = this.tabsApartados().find((t) => t.tipo === 'en-curso');
    if (tabEnCurso) this.tabActivaId.set(tabEnCurso.id);
    this.subtabActiva.set('en-curso');
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
    const tabEnCurso = this.tabsApartados().find((t) => t.tipo === 'en-curso');
    if (tabEnCurso) this.tabActivaId.set(tabEnCurso.id);
    this.subtabActiva.set('en-curso');
    this.idEnCursoEdicion.set(enCurso.id);
    this.errorFormulario.set('');
    this.tieneBeca = enCurso.tieneBeca;
    this.modeloEnCurso = {
      nombrePrograma: enCurso.nombrePrograma,
      gradoAcademicoId: enCurso.gradoAcademicoId,
      nombreInstitucionOtra: enCurso.nombreInstitucionOtra ?? '',
      tieneBeca: enCurso.tieneBeca,
      tipoBecaId: enCurso.tipoBecaId,
      financiamientoBecaId: enCurso.financiamientoBecaId,
      porcentajeBeca: enCurso.porcentajeBeca,
      montoBeca: enCurso.montoBeca,
      archivoId: enCurso.archivoId,
      subindiceSeccionId: enCurso.subindiceSeccionId,
    };
    this.mostrarFormEnCurso.set(true);
  }

  abrirParaSubindice(sub: EstadoSubindiceSeccionPersonaDto): void {
    const tabMatch = this.tabsApartados().find((t) => t.subindiceId === sub.id);
    if (tabMatch) {
      this.tabActivaId.set(tabMatch.id);
    }

    if (this.subtabActiva() === 'en-curso' || tabMatch?.tipo === 'en-curso') {
      this.abrirFormEnCurso();
      this.modeloEnCurso.subindiceSeccionId = sub.id;
    } else {
      this.abrirFormTitulo();
      this.modeloTitulo.subindiceSeccionId = sub.id;
      if (sub.nombre.toLowerCase().includes('senescyt')) {
        this.modeloTitulo.nombreTitulo = 'Certificado de Registro SENESCYT';
        this.modeloTitulo.nombreInstitucionOtra = 'SENESCYT';
        this.modeloTitulo.gradoAcademicoId =
          this.gradosAcademicos()[0]?.id || this.todosLosGrados()[0]?.id || 1;
      } else if (
        sub.nombre.toLowerCase().includes('3er') ||
        sub.nombre.toLowerCase().includes('tercer')
      ) {
        const nivel3 = this.nivelesAcademicos().find(
          (n) => n.codigo === '1' || n.nombre.toLowerCase().includes('tercer'),
        );
        if (nivel3) {
          this.onNivelChange(nivel3.id);
        }
      } else if (
        sub.nombre.toLowerCase().includes('4to') ||
        sub.nombre.toLowerCase().includes('cuarto')
      ) {
        const nivel4 = this.nivelesAcademicos().find(
          (n) =>
            ['4', '5', '6', '7'].includes(n.codigo ?? '') ||
            n.nombre.toLowerCase().includes('posgrado') ||
            n.nombre.toLowerCase().includes('cuarto') ||
            n.nombre.toLowerCase().includes('maestría'),
        );
        if (nivel4) {
          this.onNivelChange(nivel4.id);
        }
      }
    }
  }

  nombreSubindice(id?: string): string | undefined {
    return nombreSubindicePorId(this.subindicesSeccion(), id);
  }

  cancelarFormEnCurso(): void {
    this.mostrarFormEnCurso.set(false);
    this.idEnCursoEdicion.set(undefined);
  }

  onBecaToggle(activa: boolean): void {
    this.tieneBeca = activa;
    this.modeloEnCurso.tieneBeca = activa;
    if (!activa) {
      this.modeloEnCurso.tipoBecaId = undefined;
      this.modeloEnCurso.financiamientoBecaId = undefined;
      this.modeloEnCurso.porcentajeBeca = undefined;
      this.modeloEnCurso.montoBeca = undefined;
    }
  }

  guardarEnCursoObservable(): Observable<boolean> {
    if (!this.modeloEnCurso.nombrePrograma?.trim()) {
      this.errorFormulario.set('El nombre del programa es obligatorio.');
      return of(false);
    }
    if (!this.modeloEnCurso.gradoAcademicoId) {
      this.errorFormulario.set('Debe seleccionar el grado que obtendrá.');
      return of(false);
    }
    if (!this.modeloEnCurso.nombreInstitucionOtra?.trim()) {
      this.errorFormulario.set('Debe especificar la institución educativa.');
      return of(false);
    }

    if (this.validacion.invalido(this.modeloEnCurso, 'tituloEnCurso')) return of(false);
    return this.state.guardarTituloEnCurso(this.modeloEnCurso, this.idEnCursoEdicion()).pipe(
      map(() => {
        this.cancelarFormEnCurso();
        this.state.actualizarEstadoCambios?.();
        return true;
      }),
      catchError((err) => {
        this.validacion.registrarError(err, this.modeloEnCurso);
        this.errorFormulario.set(mensajeError(err, 'Error al guardar el estudio en curso.'));
        return of(false);
      }),
    );
  }

  guardarEnCurso(): void {
    this.guardarEnCursoObservable().subscribe();
  }

  eliminarEnCurso(id: string): void {
    if (!confirm('¿Está seguro de eliminar este estudio en curso?')) return;
    this.state.eliminarTituloEnCurso(id).subscribe();
  }

  obtenerMarca(tipoDestino: string, claveDestino: string) {
    return this.state.obtenerMarcaParaItem(tipoDestino, claveDestino);
  }

  tieneCambios(): boolean {
    if (!this.puedeEditar()) return false;
    if (this.mostrarFormTitulo()) {
      const m = this.modeloTitulo;
      if (
        this.idTituloEdicion() ||
        m.nombreTitulo?.trim() ||
        m.gradoAcademicoId ||
        m.universidadId ||
        m.nombreInstitucionOtra?.trim() ||
        m.archivoId ||
        this.fechaRegistroSenescytStr
      ) {
        return true;
      }
    }
    if (this.mostrarFormEnCurso()) {
      const m = this.modeloEnCurso;
      if (
        this.idEnCursoEdicion() ||
        m.nombrePrograma?.trim() ||
        m.gradoAcademicoId ||
        m.nombreInstitucionOtra?.trim() ||
        m.archivoId
      ) {
        return true;
      }
    }
    return false;
  }

  guardarCambios(): Observable<boolean> {
    if (!this.puedeEditar()) return of(true);
    if (this.mostrarFormTitulo()) {
      return this.guardarTituloObservable();
    }
    if (this.mostrarFormEnCurso()) {
      return this.guardarEnCursoObservable();
    }
    return of(true);
  }

  descartarCambios(): void {
    if (this.mostrarFormTitulo()) {
      this.cancelarFormTitulo();
    }
    if (this.mostrarFormEnCurso()) {
      this.cancelarFormEnCurso();
    }
    this.state.actualizarEstadoCambios?.();
  }

  ngOnDestroy(): void {
    this.state.desregistrarSeccion?.(this);
  }
}
