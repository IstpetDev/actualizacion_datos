import { ObservacionesRevisionComponent } from '../../revision-compartida/observaciones-revision.component';
import { CuentaBancariaRevisionComponent } from '../../cuenta-bancaria/estado-cuentas-bancarias.component';
import { CommonModule } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ArchivoDto,
  EstadoCapacitacionObligatoriaPersonaDto,
  EstadoSubindiceSeccionPersonaDto,
  ExpedienteRevisionDto,
  HojaDeVidaDto,
  ObservacionDto,
} from '../../../api-client';
import { nombreSubindicePorId } from '../../usuario/hoja-de-vida/componentes/bloque-subindices-seccion.component';

export type TabExpediente =
  'todos' | 'ficha' | 'formacion' | 'capacitaciones' | 'experiencia' | 'referencias' | 'documentos';

@Component({
  selector: 'app-expediente-secciones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ObservacionesRevisionComponent,
    CuentaBancariaRevisionComponent,
  ],
  template: `
    <div class="expediente-secciones-container" data-testid="expediente-secciones">
      <!-- Navegación de secciones del expediente (Segmented Control Accesible) -->
      <nav
        class="secciones-tabs"
        role="tablist"
        aria-label="Navegación de secciones del expediente"
      >
        <button
          type="button"
          class="tab-btn tab-btn-todo"
          [class.active]="tabActiva() === 'todos'"
          (click)="cambiarTab('todos')"
          data-testid="tab-exp-todos"
          title="Ver todo el expediente de forma continua en pantalla completa"
        >
          <span class="material-symbols-outlined icon-sm">view_agenda</span>
          <span>Ver Todo el Expediente</span>
        </button>

        <button
          type="button"
          class="tab-btn"
          [class.active]="tabActiva() === 'ficha'"
          (click)="cambiarTab('ficha')"
          data-testid="tab-exp-ficha"
        >
          <span class="material-symbols-outlined icon-sm">person</span>
          <span>1. Ficha Personal</span>
        </button>

        <button
          type="button"
          class="tab-btn"
          [class.active]="tabActiva() === 'formacion'"
          (click)="cambiarTab('formacion')"
          data-testid="tab-exp-formacion"
        >
          <span class="material-symbols-outlined icon-sm">school</span>
          <span>
            2. Formación Académica ({{
              (hojaDeVida().titulos?.length || 0) + (hojaDeVida().titulosEnCurso?.length || 0)
            }})
          </span>
        </button>

        <button
          type="button"
          class="tab-btn"
          [class.active]="tabActiva() === 'capacitaciones'"
          (click)="cambiarTab('capacitaciones')"
          data-testid="tab-exp-capacitaciones"
        >
          <span class="material-symbols-outlined icon-sm">workspace_premium</span>
          <span>3. Capacitaciones ({{ hojaDeVida().capacitaciones?.length || 0 }})</span>
        </button>

        <button
          type="button"
          class="tab-btn"
          [class.active]="tabActiva() === 'experiencia'"
          (click)="cambiarTab('experiencia')"
          data-testid="tab-exp-experiencia"
        >
          <span class="material-symbols-outlined icon-sm">work</span>
          <span>4. Experiencia Laboral ({{ hojaDeVida().experiencias?.length || 0 }})</span>
        </button>

        <button
          type="button"
          class="tab-btn"
          [class.active]="tabActiva() === 'referencias'"
          (click)="cambiarTab('referencias')"
          data-testid="tab-exp-referencias"
        >
          <span class="material-symbols-outlined icon-sm">groups</span>
          <span>5. Referencias ({{ hojaDeVida().referencias?.length || 0 }})</span>
        </button>

        <button
          type="button"
          class="tab-btn"
          [class.active]="tabActiva() === 'documentos'"
          (click)="cambiarTab('documentos')"
          data-testid="tab-exp-documentos"
        >
          <span class="material-symbols-outlined icon-sm">folder_open</span>
          <span>6. Documentos y Respaldos ({{ archivos().length }})</span>
        </button>
      </nav>

      <!-- =================================================================== -->
      <!-- SECCIÓN 1: FICHA PERSONAL E IDENTIDAD -->
      <!-- =================================================================== -->
      @if (tabActiva() === 'todos' || tabActiva() === 'ficha') {
        <section class="seccion-auditoria" data-testid="panel-exp-ficha" id="seccion-1-ficha">
          <header class="seccion-auditoria-header">
            <div class="seccion-header-main">
              <span class="seccion-index-badge">1</span>
              <div>
                <h3 class="seccion-auditoria-title">1. FICHA PERSONAL E IDENTIDAD</h3>
                <p class="seccion-auditoria-desc">
                  Información personal, identificación legal, contacto, domicilio y declaraciones
                  institucionales.
                </p>
              </div>
            </div>
          </header>

          <app-observaciones-revision
            [observaciones]="observaciones()"
            [hojaDeVida]="hojaDeVida()"
            [archivos]="archivos()"
            [estado]="hojaDeVida().estadoActualizacion"
            tipoDestino="seccion"
            claveDestino="ficha"
          />

          @if (hojaDeVida().ficha; as ficha) {
            <!-- Subíndice 1.1: Identidad y Fotografía -->
            <div class="subindice-card">
              <div class="subindice-header">
                <span class="subindice-tag">Índice 1.1</span>
                <h4 class="subindice-title">Identidad y Fotografía Institucional</h4>
              </div>

              <div class="identidad-layout">
                <!-- Tarjeta Fotografía -->
                <div class="foto-perfil-box">
                  <div class="foto-frame">
                    @if (ficha.fotoArchivoId) {
                      <div class="foto-badge-ok">
                        <span class="material-symbols-outlined icon-xs">check_circle</span>
                        <span>Foto Registrada</span>
                      </div>
                    } @else {
                      <div class="foto-empty">
                        <span class="material-symbols-outlined icon-xl text-muted"
                          >no_photography</span
                        >
                        <span class="text-xs text-muted">Sin foto registrada</span>
                      </div>
                    }
                  </div>
                  @if (ficha.fotoArchivoId) {
                    <div class="foto-actions">
                      <button
                        type="button"
                        class="btn btn-secondary btn-sm"
                        (click)="onPrevisualizar(ficha.fotoArchivoId, 'foto_perfil.jpg')"
                        title="Previsualizar fotografía"
                      >
                        <span class="material-symbols-outlined icon-xs">visibility</span>
                        <span>Previsualizar</span>
                      </button>
                      <button
                        type="button"
                        class="btn btn-secondary btn-sm"
                        (click)="onDescargar(ficha.fotoArchivoId, 'foto_perfil.jpg')"
                        data-testid="btn-descargar-foto"
                        title="Descargar archivo original de fotografía"
                      >
                        <span class="material-symbols-outlined icon-xs">download</span>
                        <span>Descargar Foto</span>
                      </button>
                      <button
                        type="button"
                        class="btn btn-danger btn-sm"
                        [disabled]="!esEnviado()"
                        (click)="onRetirarArchivo(ficha.fotoArchivoId, 'foto_perfil.jpg')"
                        data-testid="btn-retirar-foto"
                        title="Retirar fotografía de perfil del expediente"
                      >
                        <span class="material-symbols-outlined icon-xs">delete_sweep</span>
                        <span>Retirar foto</span>
                      </button>
                      <button
                        type="button"
                        class="btn btn-warning btn-sm"
                        [disabled]="!esEnviado()"
                        (click)="onMarcarItem('ficha', 'foto', 'Fotografía de Perfil')"
                        data-testid="btn-marcar-foto"
                        title="Solicitar corrección sobre la fotografía"
                      >
                        <span class="material-symbols-outlined icon-xs">edit_note</span>
                        <span>Solicitar corrección</span>
                      </button>
                    </div>
                  }
                </div>

                <!-- Cuadrícula de Datos de Identidad -->
                <div class="datos-grid-identidad">
                  <div class="dato-field">
                    <span class="dato-label">Nombres y Apellidos:</span>
                    <strong class="dato-value-highlight">
                      {{ ficha.primerNombre }} {{ ficha.segundoNombre || '' }}
                      {{ ficha.primerApellido }} {{ ficha.segundoApellido || '' }}
                    </strong>
                  </div>
                  <div class="dato-field">
                    <span class="dato-label">Documento de Identidad:</span>
                    <span class="dato-value font-mono" data-testid="expediente-doc">
                      {{ hojaDeVida().documento }}
                    </span>
                  </div>
                  <div class="dato-field">
                    <span class="dato-label">Fecha de Nacimiento:</span>
                    <span class="dato-value">
                      {{
                        ficha.fechaNacimiento ? (ficha.fechaNacimiento | date: 'dd/MM/yyyy') : '—'
                      }}
                    </span>
                  </div>
                  <div class="dato-field">
                    <span class="dato-label">Discapacidad:</span>
                    <span class="dato-value">
                      @if (ficha.porcentajeDiscapacidad) {
                        <span class="badge badge-warning">
                          Sí ({{ ficha.porcentajeDiscapacidad }}% • Carnet:
                          {{ ficha.numeroCarnetDiscapacidad || 'S/N' }})
                        </span>
                      } @else {
                        <span class="badge badge-success">No registra discapacidad</span>
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Subíndice 1.2: Contacto y Residencia Domiciliaria -->
            <div class="subindice-card">
              <div class="subindice-header">
                <span class="subindice-tag">Índice 1.2</span>
                <h4 class="subindice-title">Contacto y Residencia Domiciliaria</h4>
              </div>
              <div class="datos-grid-cards">
                <div class="dato-field">
                  <span class="dato-label">Correo Institucional:</span>
                  <span class="dato-value">{{ ficha.correoInstitucional || '—' }}</span>
                </div>
                <div class="dato-field">
                  <span class="dato-label">Correo Personal:</span>
                  <span class="dato-value font-semibold" data-testid="expediente-correo-personal">
                    {{ ficha.correoPersonal || '—' }}
                  </span>
                </div>
                <div class="dato-field">
                  <span class="dato-label">Teléfonos:</span>
                  <span class="dato-value">
                    Cel: <strong>{{ ficha.celular || '—' }}</strong> | Conv:
                    {{ ficha.telefonoConvencional || '—' }}
                  </span>
                </div>
                <div class="dato-field col-span-2">
                  <span class="dato-label">Dirección Domiciliaria:</span>
                  <span class="dato-value">
                    {{ ficha.callePrincipal || '—' }} {{ ficha.numeroCasa || '' }}
                    {{ ficha.calleSecundaria ? 'y ' + ficha.calleSecundaria : '' }}
                    {{ ficha.referenciaDomicilio ? '(' + ficha.referenciaDomicilio + ')' : '' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Subíndice 1.3: Consentimiento y Cuenta Bancaria -->
            <div class="subindice-card">
              <div class="subindice-header">
                <span class="subindice-tag">Índice 1.3</span>
                <h4 class="subindice-title">Consentimiento de Datos y Cuenta Bancaria</h4>
              </div>
              <div class="datos-grid-cards">
                <div class="dato-field">
                  <span class="dato-label">Tratamiento de Datos Personales:</span>
                  <span class="dato-value">
                    @if (expediente()?.tratamientoDatosAceptado) {
                      <span class="badge badge-success">Aceptado</span>
                      <small class="text-muted ml-2">
                        ({{
                          expediente()?.fechaAceptacionTratamientoDatosUtc
                            | date: 'dd/MM/yyyy HH:mm'
                        }})
                      </small>
                    } @else {
                      <span class="badge badge-secondary">Registrado formalmente</span>
                    }
                  </span>
                </div>
                <div class="dato-field col-span-2">
                  <span class="dato-label">Cuenta Bancaria Vinculada:</span>
                  <app-cuenta-bancaria-revision [documento]="hojaDeVida().documento" />
                </div>
              </div>
            </div>

            <!-- Subíndice 1.4: Perfil Profesional Sintetizado -->
            @if (ficha.perfil) {
              <div class="subindice-card">
                <div class="subindice-header">
                  <span class="subindice-tag">Índice 1.4</span>
                  <h4 class="subindice-title">Perfil Profesional Generado</h4>
                </div>
                <p class="texto-perfil">{{ ficha.perfil }}</p>
              </div>
            }
          } @else {
            <p class="text-muted empty-msg">
              No se registra ficha personal estructurada para este usuario.
            </p>
          }
        </section>
      }

      <!-- =================================================================== -->
      <!-- SECCIÓN 2: FORMACIÓN ACADÉMICA -->
      <!-- =================================================================== -->
      @if (tabActiva() === 'todos' || tabActiva() === 'formacion') {
        <section
          class="seccion-auditoria"
          data-testid="panel-exp-formacion"
          id="seccion-2-formacion"
        >
          <header class="seccion-auditoria-header">
            <div class="seccion-header-main">
              <span class="seccion-index-badge">2</span>
              <div>
                <h3 class="seccion-auditoria-title">
                  2. FORMACIÓN ACADÉMICA ({{
                    (hojaDeVida().titulos?.length || 0) +
                      (hojaDeVida().titulosEnCurso?.length || 0)
                  }})
                </h3>
                <p class="seccion-auditoria-desc">
                  Títulos de tercer y cuarto nivel debidamente registrados y estudios académicos de
                  posgrado en curso.
                </p>
              </div>
            </div>
          </header>

          <app-observaciones-revision
            [observaciones]="observaciones()"
            [hojaDeVida]="hojaDeVida()"
            [archivos]="archivos()"
            [estado]="hojaDeVida().estadoActualizacion"
            tipoDestino="seccion"
            claveDestino="formacion"
          />

          @if (subindicesActivosDe('formacion').length > 0) {
            <div class="subindices-banner-group mb-4" data-testid="subindices-revision-formacion">
              <span class="subindices-banner-title"
                >Subíndices Institucionales de Formación Requeridos:</span
              >
              <div class="subindices-pills">
                @for (sub of subindicesActivosDe('formacion'); track sub.id) {
                  <span
                    class="badge"
                    [class.badge-success]="sub.estado === 'cargado'"
                    [class.badge-warning]="sub.estado !== 'cargado' && sub.esObligatorio"
                    [class.badge-secondary]="sub.estado !== 'cargado' && !sub.esObligatorio"
                  >
                    {{ sub.nombre }}:
                    {{
                      sub.estado === 'cargado'
                        ? '✓ Cargado'
                        : sub.esObligatorio
                          ? '✕ Pendiente (Obligatorio)'
                          : 'Opcional sin carga'
                    }}
                  </span>
                }
              </div>
            </div>
          }

          <!-- Subíndice 2.1: Títulos Académicos Obtenidos -->
          <div class="subindice-bloque">
            <div class="subindice-bloque-header">
              <div class="subindice-tag-group">
                <span class="subindice-tag">Índice 2.1</span>
                <h4 class="subindice-title">
                  Títulos Académicos Obtenidos ({{ hojaDeVida().titulos?.length || 0 }})
                </h4>
              </div>
              <span class="badge badge-info">SENESCYT</span>
            </div>

            @if (!hojaDeVida().titulos?.length) {
              <p class="empty-subindice-msg">Sin títulos académicos registrados previamente.</p>
            } @else {
              <div class="items-cards-list">
                @for (t of hojaDeVida().titulos; track t.id; let idx = $index) {
                  <div
                    class="item-audit-card glass-card"
                    [attr.data-testid]="'item-titulo-' + t.id"
                  >
                    <app-observaciones-revision
                      [observaciones]="observaciones()"
                      [hojaDeVida]="hojaDeVida()"
                      [archivos]="archivos()"
                      [estado]="hojaDeVida().estadoActualizacion"
                      tipoDestino="titulo"
                      [claveDestino]="t.id"
                      [archivoId]="t.archivoId"
                    />

                    <div class="item-audit-top">
                      <div class="item-audit-left">
                        <span class="item-counter-badge" title="Título #{{ idx + 1 }}"
                          >#{{ idx + 1 }}</span
                        >
                        <div class="item-title-meta">
                          <h5 class="item-main-title">{{ t.nombreTitulo }}</h5>
                          <div class="item-badges-wrap">
                            @if (t.numeroRegistroSenescyt) {
                              <span class="badge badge-info font-mono">
                                Senescyt: {{ t.numeroRegistroSenescyt }}
                              </span>
                            }
                            @if (nombreSubindice(t.subindiceSeccionId); as nomSub) {
                              <span
                                class="badge badge-gold"
                                [attr.data-testid]="'badge-subindice-tit-' + t.id"
                              >
                                Subíndice: {{ nomSub }}
                              </span>
                            } @else {
                              <span class="badge badge-subtle-general">Clasificación General</span>
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="item-audit-body">
                      <div class="detail-grid">
                        <div>
                          <span class="detail-label">Institución de Educación Superior:</span>
                          <span class="detail-value font-semibold">
                            {{ t.nombreInstitucionOtra || 'Institución registrada' }}
                          </span>
                        </div>
                        <div>
                          <span class="detail-label">Fecha Reg. SENESCYT / Graduación:</span>
                          <span class="detail-value">
                            {{
                              t.fechaRegistroSenescyt
                                ? (t.fechaRegistroSenescyt | date: 'dd/MM/yyyy')
                                : t.fechaObtencion
                                  ? (t.fechaObtencion | date: 'dd/MM/yyyy')
                                  : '—'
                            }}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div class="item-audit-actions">
                      <div class="doc-actions-left">
                        @if (t.archivoId) {
                          <button
                            type="button"
                            class="btn btn-secondary btn-sm"
                            (click)="
                              onPrevisualizar(t.archivoId, 'titulo_' + t.nombreTitulo + '.pdf')
                            "
                            title="Previsualizar respaldo"
                          >
                            <span class="material-symbols-outlined icon-xs">visibility</span>
                            <span>Previsualizar</span>
                          </button>
                          <button
                            type="button"
                            class="btn btn-secondary btn-sm"
                            (click)="onDescargar(t.archivoId, 'titulo_' + t.nombreTitulo + '.pdf')"
                            [attr.data-testid]="'btn-descargar-titulo-' + t.id"
                            title="Descargar archivo PDF de título"
                          >
                            <span class="material-symbols-outlined icon-xs">download</span>
                            <span>Descargar Respaldo</span>
                          </button>
                          <button
                            type="button"
                            class="btn btn-danger btn-sm"
                            [disabled]="!esEnviado()"
                            (click)="
                              onRetirarArchivo(t.archivoId, 'titulo_' + t.nombreTitulo + '.pdf')
                            "
                            [attr.data-testid]="'btn-retirar-titulo-' + t.id"
                            title="Retirar respaldo adjunto de este título"
                          >
                            <span class="material-symbols-outlined icon-xs">delete_sweep</span>
                            <span>Retirar documento</span>
                          </button>
                        } @else {
                          <span class="sin-respaldo-tag">Sin respaldo adjunto</span>
                        }
                      </div>

                      <button
                        type="button"
                        class="btn btn-warning btn-sm"
                        [disabled]="!esEnviado()"
                        (click)="onMarcarItem('titulo', t.id, t.nombreTitulo)"
                        [attr.data-testid]="'btn-marcar-titulo-' + t.id"
                        title="Solicitar corrección puntual sobre este título"
                      >
                        <span class="material-symbols-outlined icon-xs">edit_note</span>
                        <span>Solicitar corrección</span>
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Subíndice 2.2: Estudios en Curso -->
          <div class="subindice-bloque mt-4">
            <div class="subindice-bloque-header">
              <div class="subindice-tag-group">
                <span class="subindice-tag">Índice 2.2</span>
                <h4 class="subindice-title">
                  Estudios Académicos en Curso ({{ hojaDeVida().titulosEnCurso?.length || 0 }})
                </h4>
              </div>
              <span class="badge badge-purple">En Curso</span>
            </div>

            @if (!hojaDeVida().titulosEnCurso?.length) {
              <p class="empty-subindice-msg">Sin estudios académicos en curso declarados.</p>
            } @else {
              <div class="items-cards-list">
                @for (tc of hojaDeVida().titulosEnCurso; track tc.id; let idx = $index) {
                  <div
                    class="item-audit-card glass-card"
                    [attr.data-testid]="'item-titulo-en-curso-' + tc.id"
                  >
                    <app-observaciones-revision
                      [observaciones]="observaciones()"
                      [hojaDeVida]="hojaDeVida()"
                      [archivos]="archivos()"
                      [estado]="hojaDeVida().estadoActualizacion"
                      tipoDestino="titulo_en_curso"
                      [claveDestino]="tc.id"
                      [archivoId]="tc.archivoId"
                    />

                    <div class="item-audit-top">
                      <div class="item-audit-left">
                        <span class="item-counter-badge" title="Estudio en curso #{{ idx + 1 }}">
                          #{{ idx + 1 }}
                        </span>
                        <div class="item-title-meta">
                          <h5 class="item-main-title">{{ tc.nombrePrograma }}</h5>
                          <div class="item-badges-wrap">
                            <span class="badge badge-warning">En curso</span>
                            @if (nombreSubindice(tc.subindiceSeccionId); as nomSub) {
                              <span class="badge badge-gold">Subíndice: {{ nomSub }}</span>
                            } @else {
                              <span class="badge badge-subtle-general">General</span>
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="item-audit-body">
                      <div class="detail-grid">
                        <div>
                          <span class="detail-label">Institución Educativa:</span>
                          <span class="detail-value font-semibold">
                            {{ tc.nombreInstitucionOtra || 'Institución registrada' }}
                          </span>
                        </div>
                        <div>
                          <span class="detail-label">Periodo:</span>
                          <span class="detail-value">
                            Inicio: {{ tc.fechaInicio | date: 'dd/MM/yyyy' }}
                            @if (tc.fechaFinEstimada) {
                              • Fin Estimado: {{ tc.fechaFinEstimada | date: 'dd/MM/yyyy' }}
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    <div class="item-audit-actions">
                      <div class="doc-actions-left">
                        @if (tc.archivoId) {
                          <button
                            type="button"
                            class="btn btn-secondary btn-sm"
                            (click)="
                              onPrevisualizar(
                                tc.archivoId,
                                'estudio_en_curso_' + tc.nombrePrograma + '.pdf'
                              )
                            "
                          >
                            <span class="material-symbols-outlined icon-xs">visibility</span>
                            <span>Previsualizar</span>
                          </button>
                          <button
                            type="button"
                            class="btn btn-secondary btn-sm"
                            (click)="
                              onDescargar(
                                tc.archivoId,
                                'estudio_en_curso_' + tc.nombrePrograma + '.pdf'
                              )
                            "
                            [attr.data-testid]="'btn-descargar-titulo-en-curso-' + tc.id"
                          >
                            <span class="material-symbols-outlined icon-xs">download</span>
                            <span>Descargar Respaldo</span>
                          </button>
                          <button
                            type="button"
                            class="btn btn-danger btn-sm"
                            [disabled]="!esEnviado()"
                            (click)="
                              onRetirarArchivo(
                                tc.archivoId,
                                'estudio_en_curso_' + tc.nombrePrograma + '.pdf'
                              )
                            "
                            [attr.data-testid]="'btn-retirar-titulo-en-curso-' + tc.id"
                            title="Retirar documento de este estudio"
                          >
                            <span class="material-symbols-outlined icon-xs">delete_sweep</span>
                            <span>Retirar documento</span>
                          </button>
                        } @else {
                          <span class="sin-respaldo-tag">Sin respaldo adjunto</span>
                        }
                      </div>

                      <button
                        type="button"
                        class="btn btn-warning btn-sm"
                        [disabled]="!esEnviado()"
                        (click)="onMarcarItem('titulo-en-curso', tc.id, tc.nombrePrograma)"
                        [attr.data-testid]="'btn-marcar-titulo-en-curso-' + tc.id"
                        title="Solicitar corrección"
                      >
                        <span class="material-symbols-outlined icon-xs">edit_note</span>
                        <span>Solicitar corrección</span>
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </section>
      }

      <!-- =================================================================== -->
      <!-- SECCIÓN 3: CAPACITACIONES Y CURSOS -->
      <!-- =================================================================== -->
      @if (tabActiva() === 'todos' || tabActiva() === 'capacitaciones') {
        <section
          class="seccion-auditoria"
          data-testid="panel-exp-capacitaciones"
          id="seccion-3-capacitaciones"
        >
          <header class="seccion-auditoria-header">
            <div class="seccion-header-main">
              <span class="seccion-index-badge">3</span>
              <div>
                <h3 class="seccion-auditoria-title">
                  3. CAPACITACIONES Y CURSOS ({{ hojaDeVida().capacitaciones?.length || 0 }})
                </h3>
                <p class="seccion-auditoria-desc">
                  Certificados de formación continua, cursos de actualización y programas de
                  pedagogía o técnica.
                </p>
              </div>
            </div>
          </header>

          <app-observaciones-revision
            [observaciones]="observaciones()"
            [hojaDeVida]="hojaDeVida()"
            [archivos]="archivos()"
            [estado]="hojaDeVida().estadoActualizacion"
            tipoDestino="seccion"
            claveDestino="capacitaciones"
          />

          <!-- Subíndice 3.1: Capacitaciones Obligatorias (si aplica) -->
          @if (obligatorias().length > 0) {
            <div class="subindice-bloque mb-4" data-testid="lista-obligatorias-revision">
              <div class="subindice-bloque-header">
                <div class="subindice-tag-group">
                  <span class="subindice-tag">Índice 3.1</span>
                  <h4 class="subindice-title">
                    Capacitaciones Obligatorias Institucionales ({{ obligatorias().length }})
                  </h4>
                </div>
                <span class="badge badge-warning">Requisitos Institucionales</span>
              </div>

              <div class="items-cards-list">
                @for (ob of obligatorias(); track ob.id; let idx = $index) {
                  <div
                    class="item-audit-card glass-card"
                    [attr.data-testid]="'item-obligatoria-' + ob.id"
                  >
                    <div class="item-audit-top">
                      <div class="item-audit-left">
                        <span class="item-counter-badge" title="Obligatoria #{{ idx + 1 }}">
                          #{{ idx + 1 }}
                        </span>
                        <div class="item-title-meta">
                          <h5 class="item-main-title">{{ ob.nombre }}</h5>
                          <span
                            class="badge"
                            [ngClass]="{
                              'badge-success': ob.estado === 'cumplida',
                              'badge-info':
                                ob.estado === 'exento-nuevo-ingreso' ||
                                ob.estado === 'justificada-nuevo-ingreso',
                              'badge-secondary': ob.estado === 'pendiente',
                            }"
                            [attr.data-testid]="'badge-obligatoria-' + ob.id"
                          >
                            {{ ob.estado }}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div class="item-audit-body">
                      <p class="item-meta">
                        @if (ob.horasEsperadas) {
                          <span
                            >Horas esperadas: <strong>{{ ob.horasEsperadas }}h</strong> •
                          </span>
                        }
                        @if (ob.institucionOrganizadora) {
                          <span>Organizadora: {{ ob.institucionOrganizadora }}</span>
                        }
                      </p>
                      @if (ob.justificacionNuevoIngreso) {
                        <p class="text-sm text-muted">
                          Justificación: <em>{{ ob.justificacionNuevoIngreso }}</em>
                        </p>
                      }
                    </div>

                    <div class="item-audit-actions">
                      @if (ob.capacitacionId) {
                        <button
                          type="button"
                          class="btn btn-warning btn-sm"
                          [disabled]="!esEnviado()"
                          (click)="onMarcarItem('capacitacion', ob.capacitacionId, ob.nombre)"
                          [attr.data-testid]="'btn-marcar-obligatoria-' + ob.id"
                        >
                          <span class="material-symbols-outlined icon-xs">edit_note</span>
                          <span>Solicitar corrección</span>
                        </button>
                      } @else if (ob.estado === 'pendiente') {
                        <button
                          type="button"
                          class="btn btn-warning btn-sm"
                          [disabled]="!esEnviado()"
                          (click)="onMarcarObligatoriaPendiente(ob.id, ob.nombre)"
                          [attr.data-testid]="'btn-marcar-obligatoria-pendiente-' + ob.id"
                        >
                          <span class="material-symbols-outlined icon-xs">warning</span>
                          <span>Marcar Faltante</span>
                        </button>

                        @if (puedeVincularPorAyuda() && capacitacionesDisponibles().length > 0) {
                          <button
                            type="button"
                            class="btn btn-primary btn-sm"
                            (click)="abrirModalAyuda(ob)"
                            [attr.data-testid]="'btn-vincular-ayuda-' + ob.id"
                          >
                            <span class="material-symbols-outlined icon-sm">link</span>
                            <span>Vincular por ayuda</span>
                          </button>
                        }
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Subíndice 3.2: Capacitaciones Registradas -->
          <div class="subindice-bloque">
            <div class="subindice-bloque-header">
              <div class="subindice-tag-group">
                <span class="subindice-tag">Índice 3.2</span>
                <h4 class="subindice-title">
                  Cursos y Certificaciones Registradas ({{
                    hojaDeVida().capacitaciones?.length || 0
                  }})
                </h4>
              </div>
              <span class="badge badge-info">Formación Continua</span>
            </div>

            @if (!hojaDeVida().capacitaciones?.length) {
              <p class="empty-subindice-msg">Sin capacitaciones ni cursos registrados.</p>
            } @else {
              <div class="items-cards-list">
                @for (c of hojaDeVida().capacitaciones; track c.id; let idx = $index) {
                  <div
                    class="item-audit-card glass-card"
                    [attr.data-testid]="'item-capacitacion-' + c.id"
                  >
                    <app-observaciones-revision
                      [observaciones]="observaciones()"
                      [hojaDeVida]="hojaDeVida()"
                      [archivos]="archivos()"
                      [estado]="hojaDeVida().estadoActualizacion"
                      tipoDestino="capacitacion"
                      [claveDestino]="c.id"
                      [archivoId]="c.archivoId"
                    />

                    <div class="item-audit-top">
                      <div class="item-audit-left">
                        <span class="item-counter-badge" title="Capacitación #{{ idx + 1 }}">
                          #{{ idx + 1 }}
                        </span>
                        <div class="item-title-meta">
                          <h5 class="item-main-title">{{ c.nombreEvento }}</h5>
                          <div class="item-badges-wrap">
                            <span class="badge badge-hours">{{ c.numeroHoras || 0 }} horas</span>
                            @if (nombreSubindice(c.subindiceSeccionId); as nomSub) {
                              <span class="badge badge-gold">Subíndice: {{ nomSub }}</span>
                            } @else {
                              <span class="badge badge-subtle-general">General</span>
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="item-audit-body">
                      <div class="detail-grid">
                        <div>
                          <span class="detail-label">Institución Organizadora:</span>
                          <span class="detail-value font-semibold">{{
                            c.institucionOrganizadora
                          }}</span>
                        </div>
                        <div>
                          <span class="detail-label">Periodo / Modalidad:</span>
                          <span class="detail-value">
                            {{ c.tipoParticipacion || 'Capacitación' }} •
                            {{ c.fechaInicio | date: 'dd/MM/yyyy' }} -
                            {{ c.fechaFin | date: 'dd/MM/yyyy' }}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div class="item-audit-actions">
                      <div class="doc-actions-left">
                        @if (c.archivoId) {
                          <button
                            type="button"
                            class="btn btn-secondary btn-sm"
                            (click)="
                              onPrevisualizar(
                                c.archivoId,
                                'capacitacion_' + c.nombreEvento + '.pdf'
                              )
                            "
                            title="Previsualizar certificado"
                          >
                            <span class="material-symbols-outlined icon-xs">visibility</span>
                            <span>Previsualizar</span>
                          </button>
                          <button
                            type="button"
                            class="btn btn-secondary btn-sm"
                            (click)="
                              onDescargar(c.archivoId, 'capacitacion_' + c.nombreEvento + '.pdf')
                            "
                            [attr.data-testid]="'btn-descargar-capacitacion-' + c.id"
                            title="Descargar certificado PDF"
                          >
                            <span class="material-symbols-outlined icon-xs">download</span>
                            <span>Descargar Certificado</span>
                          </button>
                          <button
                            type="button"
                            class="btn btn-danger btn-sm"
                            [disabled]="!esEnviado()"
                            (click)="
                              onRetirarArchivo(
                                c.archivoId,
                                'capacitacion_' + c.nombreEvento + '.pdf'
                              )
                            "
                            [attr.data-testid]="'btn-retirar-capacitacion-' + c.id"
                            title="Retirar certificado adjunto"
                          >
                            <span class="material-symbols-outlined icon-xs">delete_sweep</span>
                            <span>Retirar documento</span>
                          </button>
                        } @else {
                          <span class="sin-respaldo-tag">Sin certificado adjunto</span>
                        }
                      </div>

                      <button
                        type="button"
                        class="btn btn-warning btn-sm"
                        [disabled]="!esEnviado()"
                        (click)="onMarcarItem('capacitacion', c.id, c.nombreEvento)"
                        [attr.data-testid]="'btn-marcar-capacitacion-' + c.id"
                        title="Solicitar corrección"
                      >
                        <span class="material-symbols-outlined icon-xs">edit_note</span>
                        <span>Solicitar corrección</span>
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </section>
      }

      <!-- =================================================================== -->
      <!-- SECCIÓN 4: EXPERIENCIA LABORAL -->
      <!-- =================================================================== -->
      @if (tabActiva() === 'todos' || tabActiva() === 'experiencia') {
        <section
          class="seccion-auditoria"
          data-testid="panel-exp-experiencia"
          id="seccion-4-experiencia"
        >
          <header class="seccion-auditoria-header">
            <div class="seccion-header-main">
              <span class="seccion-index-badge">4</span>
              <div>
                <h3 class="seccion-auditoria-title">
                  4. EXPERIENCIA LABORAL ({{ hojaDeVida().experiencias?.length || 0 }})
                </h3>
                <p class="seccion-auditoria-desc">
                  Trayectoria profesional, docencia técnica y superior en instituciones públicas o
                  privadas.
                </p>
              </div>
            </div>
          </header>

          <app-observaciones-revision
            [observaciones]="observaciones()"
            [hojaDeVida]="hojaDeVida()"
            [archivos]="archivos()"
            [estado]="hojaDeVida().estadoActualizacion"
            tipoDestino="seccion"
            claveDestino="experiencia"
          />

          @if (subindicesActivosDe('experiencia').length > 0) {
            <div class="subindices-banner-group mb-4" data-testid="subindices-revision-experiencia">
              <span class="subindices-banner-title"
                >Subíndices Institucionales de Experiencia:</span
              >
              <div class="subindices-pills">
                @for (sub of subindicesActivosDe('experiencia'); track sub.id) {
                  <span
                    class="badge"
                    [class.badge-success]="sub.estado === 'cargado'"
                    [class.badge-warning]="sub.estado !== 'cargado' && sub.esObligatorio"
                    [class.badge-secondary]="sub.estado !== 'cargado' && !sub.esObligatorio"
                  >
                    {{ sub.nombre }}:
                    {{
                      sub.estado === 'cargado'
                        ? '✓ Cargado'
                        : sub.esObligatorio
                          ? '✕ Pendiente (Obligatorio)'
                          : 'Opcional sin carga'
                    }}
                  </span>
                }
              </div>
            </div>
          }

          <!-- Subíndice 4.1: Experiencias Laborales -->
          <div class="subindice-bloque">
            <div class="subindice-bloque-header">
              <div class="subindice-tag-group">
                <span class="subindice-tag">Índice 4.1</span>
                <h4 class="subindice-title">
                  Trayectoria Laboral Docente y Profesional ({{
                    hojaDeVida().experiencias?.length || 0
                  }})
                </h4>
              </div>
              <span class="badge badge-info">Historial Laboral</span>
            </div>

            @if (!hojaDeVida().experiencias?.length) {
              <p class="empty-subindice-msg">Sin experiencias laborales registradas.</p>
            } @else {
              <div class="items-cards-list">
                @for (e of hojaDeVida().experiencias; track e.id; let idx = $index) {
                  <div
                    class="item-audit-card glass-card"
                    [attr.data-testid]="'item-experiencia-' + e.id"
                  >
                    <app-observaciones-revision
                      [observaciones]="observaciones()"
                      [hojaDeVida]="hojaDeVida()"
                      [archivos]="archivos()"
                      [estado]="hojaDeVida().estadoActualizacion"
                      tipoDestino="experiencia"
                      [claveDestino]="e.id"
                      [archivoId]="e.archivoId"
                    />

                    <div class="item-audit-top">
                      <div class="item-audit-left">
                        <span class="item-counter-badge" title="Experiencia #{{ idx + 1 }}">
                          #{{ idx + 1 }}
                        </span>
                        <div class="item-title-meta">
                          <h5 class="item-main-title">{{ e.cargo }}</h5>
                          <div class="item-badges-wrap">
                            @if (e.trabajaActualmente) {
                              <span class="badge badge-success">✓ Actualmente Laborando</span>
                            }
                            @if (nombreSubindice(e.subindiceSeccionId); as nomSub) {
                              <span
                                class="badge badge-gold"
                                [attr.data-testid]="'badge-subindice-exp-' + e.id"
                              >
                                Subíndice: {{ nomSub }}
                              </span>
                            } @else {
                              <span class="badge badge-subtle-general">General</span>
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="item-audit-body">
                      <div class="detail-grid">
                        <div>
                          <span class="detail-label">Institución / Empresa Empleadora:</span>
                          <span class="detail-value font-semibold">{{ e.empleador }}</span>
                        </div>
                        <div>
                          <span class="detail-label">Periodo:</span>
                          <span class="detail-value">
                            {{ e.fechaInicio | date: 'dd/MM/yyyy' }} →
                            {{ e.fechaFin ? (e.fechaFin | date: 'dd/MM/yyyy') : 'Actualidad' }}
                          </span>
                        </div>
                      </div>
                      @if (e.funciones) {
                        <p class="text-xs text-muted mt-2">
                          <strong>Funciones:</strong> {{ e.funciones }}
                        </p>
                      }
                    </div>

                    <div class="item-audit-actions">
                      <div class="doc-actions-left">
                        @if (e.archivoId) {
                          <button
                            type="button"
                            class="btn btn-secondary btn-sm"
                            (click)="
                              onPrevisualizar(e.archivoId, 'experiencia_' + e.empleador + '.pdf')
                            "
                            title="Previsualizar certificado laboral"
                          >
                            <span class="material-symbols-outlined icon-xs">visibility</span>
                            <span>Previsualizar</span>
                          </button>
                          <button
                            type="button"
                            class="btn btn-secondary btn-sm"
                            (click)="
                              onDescargar(e.archivoId, 'experiencia_' + e.empleador + '.pdf')
                            "
                            [attr.data-testid]="'btn-descargar-experiencia-' + e.id"
                            title="Descargar certificado PDF"
                          >
                            <span class="material-symbols-outlined icon-xs">download</span>
                            <span>Descargar Certificado</span>
                          </button>
                          <button
                            type="button"
                            class="btn btn-danger btn-sm"
                            [disabled]="!esEnviado()"
                            (click)="
                              onRetirarArchivo(e.archivoId, 'experiencia_' + e.empleador + '.pdf')
                            "
                            [attr.data-testid]="'btn-retirar-experiencia-' + e.id"
                            title="Retirar certificado adjunto"
                          >
                            <span class="material-symbols-outlined icon-xs">delete_sweep</span>
                            <span>Retirar documento</span>
                          </button>
                        } @else {
                          <span class="sin-respaldo-tag">Sin certificado adjunto</span>
                        }
                      </div>

                      <button
                        type="button"
                        class="btn btn-warning btn-sm"
                        [disabled]="!esEnviado()"
                        (click)="onMarcarItem('experiencia', e.id, e.cargo)"
                        [attr.data-testid]="'btn-marcar-experiencia-' + e.id"
                        title="Solicitar corrección"
                      >
                        <span class="material-symbols-outlined icon-xs">edit_note</span>
                        <span>Solicitar corrección</span>
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </section>
      }

      <!-- =================================================================== -->
      <!-- SECCIÓN 5: REFERENCIAS -->
      <!-- =================================================================== -->
      @if (tabActiva() === 'todos' || tabActiva() === 'referencias') {
        <section
          class="seccion-auditoria"
          data-testid="panel-exp-referencias"
          id="seccion-5-referencias"
        >
          <header class="seccion-auditoria-header">
            <div class="seccion-header-main">
              <span class="seccion-index-badge">5</span>
              <div>
                <h3 class="seccion-auditoria-title">
                  5. REFERENCIAS PERSONALES Y LABORALES ({{
                    hojaDeVida().referencias?.length || 0
                  }})
                </h3>
                <p class="seccion-auditoria-desc">
                  Contactos de verificación personal y profesional declarados en el expediente.
                </p>
              </div>
            </div>
          </header>

          <app-observaciones-revision
            [observaciones]="observaciones()"
            [hojaDeVida]="hojaDeVida()"
            [archivos]="archivos()"
            [estado]="hojaDeVida().estadoActualizacion"
            tipoDestino="seccion"
            claveDestino="referencias"
          />

          <!-- Subíndice 5.1: Referencias -->
          <div class="subindice-bloque">
            <div class="subindice-bloque-header">
              <div class="subindice-tag-group">
                <span class="subindice-tag">Índice 5.1</span>
                <h4 class="subindice-title">
                  Referencias Registradas ({{ hojaDeVida().referencias?.length || 0 }})
                </h4>
              </div>
              <span class="badge badge-info">Contactos</span>
            </div>

            @if (!hojaDeVida().referencias?.length) {
              <p class="empty-subindice-msg">
                Sin referencias personales o profesionales registradas.
              </p>
            } @else {
              <div class="items-cards-list">
                @for (r of hojaDeVida().referencias; track r.id; let idx = $index) {
                  <div
                    class="item-audit-card glass-card"
                    [attr.data-testid]="'item-referencia-' + r.id"
                  >
                    <div class="item-audit-top">
                      <div class="item-audit-left">
                        <span class="item-counter-badge" title="Referencia #{{ idx + 1 }}">
                          #{{ idx + 1 }}
                        </span>
                        <div class="item-title-meta">
                          <h5 class="item-main-title">{{ r.nombresApellidos }}</h5>
                          <div class="item-badges-wrap">
                            <span class="badge badge-info">{{ r.tipo }}</span>
                            @if (nombreSubindice(r.subindiceSeccionId); as nomSub) {
                              <span class="badge badge-gold">Subíndice: {{ nomSub }}</span>
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="item-audit-body">
                      <div class="detail-grid">
                        <div>
                          <span class="detail-label">Teléfono de Contacto:</span>
                          <span class="detail-value font-semibold">{{ r.telefono }}</span>
                        </div>
                        <div>
                          <span class="detail-label">Institución / Cargo:</span>
                          <span class="detail-value">
                            {{ r.cargoActual || r.titulo || 'Sin cargo' }}
                            @if (r.empresa) {
                              • <em>{{ r.empresa }}</em>
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    <div class="item-audit-actions">
                      <div class="doc-actions-left"></div>
                      <button
                        type="button"
                        class="btn btn-warning btn-sm"
                        [disabled]="!esEnviado()"
                        (click)="onMarcarItem('referencia', r.id, r.nombresApellidos)"
                        [attr.data-testid]="'btn-marcar-referencia-' + r.id"
                        title="Solicitar corrección"
                      >
                        <span class="material-symbols-outlined icon-xs">edit_note</span>
                        <span>Solicitar corrección</span>
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </section>
      }

      <!-- =================================================================== -->
      <!-- SECCIÓN 6: DOCUMENTOS Y RESPALDOS DEL EXPEDIENTE -->
      <!-- =================================================================== -->
      @if (tabActiva() === 'todos' || tabActiva() === 'documentos') {
        <section
          class="seccion-auditoria"
          data-testid="panel-exp-documentos"
          id="seccion-6-documentos"
        >
          <header class="seccion-auditoria-header">
            <div class="seccion-header-main">
              <span class="seccion-index-badge">6</span>
              <div>
                <h3 class="seccion-auditoria-title">
                  6. DOCUMENTOS Y RESPALDOS DEL EXPEDIENTE ({{ archivos().length }})
                </h3>
                <p class="seccion-auditoria-desc">
                  Expediente digitalizado consolidado: cédula, certificados, títulos y respaldos
                  probatorios.
                </p>
              </div>
            </div>
          </header>

          <app-observaciones-revision
            [observaciones]="observaciones()"
            [hojaDeVida]="hojaDeVida()"
            [archivos]="archivos()"
            [estado]="hojaDeVida().estadoActualizacion"
            tipoDestino="seccion"
            claveDestino="documentos"
          />

          <!-- Subíndice 6.1: Expediente Digital Consolidado -->
          <div class="subindice-bloque">
            <div class="subindice-bloque-header">
              <div class="subindice-tag-group">
                <span class="subindice-tag">Índice 6.1</span>
                <h4 class="subindice-title">
                  Archivos Digitales Adjuntos ({{ archivos().length }})
                </h4>
              </div>
              <span class="badge badge-info">Auditoría Documental</span>
            </div>

            @if (!archivos().length) {
              <p class="empty-subindice-msg">
                No se registran documentos adjuntos en este expediente.
              </p>
            } @else {
              <div class="items-cards-list">
                @for (arc of archivos(); track arc.id; let idx = $index) {
                  <div
                    class="item-audit-card glass-card archivo-item"
                    [attr.data-testid]="'item-documento-' + arc.id"
                  >
                    <div [attr.data-testid]="'archivo-' + arc.id" class="archivo-id-tracker"></div>
                    <app-observaciones-revision
                      [observaciones]="observaciones()"
                      [hojaDeVida]="hojaDeVida()"
                      [archivos]="archivos()"
                      [estado]="hojaDeVida().estadoActualizacion"
                      tipoDestino="archivo"
                      [claveDestino]="arc.id"
                    />

                    <div class="item-audit-top">
                      <div class="item-audit-left">
                        <span class="item-counter-badge" title="Documento #{{ idx + 1 }}">
                          #{{ idx + 1 }}
                        </span>
                        <div class="item-title-meta">
                          <h5 class="item-main-title flex items-center gap-2">
                            <span class="material-symbols-outlined icon-sm text-primary"
                              >description</span
                            >
                            <span>{{ arc.nombreOriginal }}</span>
                          </h5>
                          <div class="item-badges-wrap">
                            <span class="badge badge-secondary">
                              {{ (arc.tamanoBytes / 1024).toFixed(1) }} KB
                            </span>
                            <span class="badge badge-info font-mono">
                              {{ arc.claveDestino || 'Documento general' }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="item-audit-body">
                      <div class="detail-grid">
                        <div>
                          <span class="detail-label">Tipo MIME:</span>
                          <span class="detail-value font-mono">{{ arc.tipoContenido }}</span>
                        </div>
                        <div>
                          <span class="detail-label">Subido:</span>
                          <span class="detail-value">
                            {{ arc.fechaSubidaUtc | date: 'dd/MM/yyyy HH:mm' }}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div class="item-audit-actions">
                      <div class="doc-actions-left">
                        <button
                          type="button"
                          class="btn btn-secondary btn-sm"
                          (click)="onPrevisualizar(arc.id, arc.nombreOriginal)"
                          title="Previsualizar archivo"
                        >
                          <span class="material-symbols-outlined icon-xs">visibility</span>
                          <span>Previsualizar</span>
                        </button>
                        <button
                          type="button"
                          class="btn btn-secondary btn-sm"
                          (click)="onDescargar(arc.id, arc.nombreOriginal)"
                          [attr.data-testid]="'btn-descargar-archivo-' + arc.id"
                          title="Descargar archivo"
                        >
                          <span class="material-symbols-outlined icon-xs">download</span>
                          <span>Descargar</span>
                        </button>
                        <button
                          type="button"
                          class="btn btn-danger btn-sm"
                          [disabled]="!esEnviado()"
                          (click)="onRetirarArchivo(arc.id, arc.nombreOriginal)"
                          [attr.data-testid]="'btn-retirar-' + arc.id"
                          title="Retirar archivo adjunto del expediente"
                        >
                          <span class="material-symbols-outlined icon-xs">delete_sweep</span>
                          <span>Retirar documento</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        class="btn btn-warning btn-sm"
                        [disabled]="!esEnviado()"
                        (click)="onMarcarItem('documento', arc.id, arc.nombreOriginal)"
                        [attr.data-testid]="'btn-marcar-documento-' + arc.id"
                        title="Solicitar corrección sobre este documento"
                      >
                        <span class="material-symbols-outlined icon-xs">edit_note</span>
                        <span>Solicitar corrección</span>
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </section>
      }

      <!-- Modal de Vincular por Ayuda -->
      @if (modalAyudaObligatoria()) {
        <div class="modal-overlay" data-testid="modal-vincular-ayuda">
          <div class="modal-dialog">
            <header class="modal-header">
              <h4 class="modal-title">
                <span class="material-symbols-outlined icon-md text-primary">link</span>
                <span>Vincular por ayuda del supervisor</span>
              </h4>
              <button
                type="button"
                class="btn-close"
                (click)="cerrarModalAyuda()"
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </header>
            <div class="modal-body">
              <p>
                Vincular una capacitación registrada del colaborador con el requisito obligatorio:
                <strong>{{ modalAyudaObligatoria()!.nombre }}</strong>
              </p>
              <div class="form-group mb-3">
                <label for="selectCapAyuda">Seleccionar Capacitación Registrada</label>
                <select
                  id="selectCapAyuda"
                  class="form-control"
                  [ngModel]="capacitacionAyudaSeleccionada()"
                  (ngModelChange)="capacitacionAyudaSeleccionada.set($event)"
                  data-testid="select-ayuda-capacitacion"
                >
                  <option value="">-- Seleccione una capacitación --</option>
                  @for (c of capacitacionesDisponibles(); track c.id) {
                    <option [value]="c.id">
                      {{ c.nombreEvento }} ({{ c.institucionOrganizadora }})
                    </option>
                  }
                </select>
              </div>
            </div>
            <footer class="modal-footer">
              <button type="button" class="btn btn-secondary btn-sm" (click)="cerrarModalAyuda()">
                Cancelar
              </button>
              <button
                type="button"
                class="btn btn-primary btn-sm"
                [disabled]="!capacitacionAyudaSeleccionada()"
                (click)="confirmarVincularAyuda()"
                data-testid="btn-confirmar-ayuda"
              >
                Confirmar Vínculo
              </button>
            </footer>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .expediente-secciones-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      width: 100%;
    }

    /* Pestañas de navegación sticky estilo Apple / Material 3 */
    .secciones-tabs {
      display: flex;
      gap: 0.5rem;
      overflow-x: auto;
      padding: 0.5rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      position: sticky;
      top: 0.75rem;
      z-index: 20;
      backdrop-filter: blur(8px);
    }
    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1rem;
      border: 1px solid transparent;
      border-radius: 0.625rem;
      background: #f8fafc;
      color: #475569;
      font-size: 0.8125rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s ease;
      min-height: 42px;
    }
    .tab-btn:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .tab-btn.active {
      background: #222c57;
      color: #ffffff;
      box-shadow: 0 4px 6px -1px rgba(34, 44, 87, 0.25);
    }
    .tab-btn-todo {
      background: rgba(34, 44, 87, 0.06);
      color: #222c57;
      border-color: rgba(34, 44, 87, 0.2);
    }
    .tab-btn-todo.active {
      background: #222c57;
      color: #ffffff;
    }

    /* Secciones de auditoría completas */
    .seccion-auditoria {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      padding: 1.5rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .seccion-auditoria-header {
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 1rem;
    }
    .seccion-header-main {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .seccion-index-badge {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: #222c57;
      color: #ffffff;
      font-weight: 900;
      font-size: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 4px rgba(34, 44, 87, 0.2);
      flex-shrink: 0;
    }
    .seccion-auditoria-title {
      font-size: 1.15rem;
      font-weight: 900;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.01em;
    }
    .seccion-auditoria-desc {
      font-size: 0.8125rem;
      color: #64748b;
      margin: 0.25rem 0 0 0;
    }

    /* Subíndices y Bloques de contenido */
    .subindice-card,
    .subindice-bloque {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.875rem;
      padding: 1.25rem;
    }
    .subindice-header,
    .subindice-bloque-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 0.625rem;
      border-bottom: 1px solid #e2e8f0;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .subindice-tag-group {
      display: flex;
      align-items: center;
      gap: 0.625rem;
    }
    .subindice-tag {
      background: #222c57;
      color: #ffffff;
      font-size: 0.6875rem;
      font-weight: 800;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .subindice-title {
      font-size: 0.95rem;
      font-weight: 800;
      color: #1e293b;
      margin: 0;
    }

    /* Layout Ficha Identidad */
    .identidad-layout {
      display: grid;
      grid-template-columns: 240px 1fr;
      gap: 1.5rem;
      align-items: start;
    }
    @media (max-width: 768px) {
      .identidad-layout {
        grid-template-columns: 1fr;
      }
    }
    .foto-perfil-box {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .foto-frame {
      width: 100%;
      height: 180px;
      border-radius: 0.75rem;
      background: #ffffff;
      border: 2px dashed #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }
    .foto-badge-ok {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      color: #16a34a;
      font-weight: 700;
      font-size: 0.8125rem;
    }
    .foto-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }
    .foto-actions {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .datos-grid-identidad,
    .datos-grid-cards {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }
    @media (max-width: 640px) {
      .datos-grid-identidad,
      .datos-grid-cards {
        grid-template-columns: 1fr;
      }
    }
    .dato-field {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.625rem;
      padding: 0.75rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .dato-field.col-span-2 {
      grid-column: span 2;
    }
    @media (max-width: 640px) {
      .dato-field.col-span-2 {
        grid-column: span 1;
      }
    }
    .dato-label {
      font-size: 0.6875rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .dato-value {
      font-size: 0.875rem;
      color: #1e293b;
      font-weight: 500;
    }
    .dato-value-highlight {
      font-size: 0.95rem;
      color: #0f172a;
      font-weight: 800;
    }
    .texto-perfil {
      font-size: 0.875rem;
      color: #334155;
      line-height: 1.6;
      background: #ffffff;
      padding: 1rem;
      border-radius: 0.625rem;
      border: 1px solid #e2e8f0;
      margin: 0;
    }

    /* Subíndices banners de requerimientos */
    .subindices-banner-group {
      background: rgba(34, 44, 87, 0.04);
      border: 1px solid rgba(34, 44, 87, 0.15);
      border-radius: 0.75rem;
      padding: 0.875rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .subindices-banner-title {
      font-size: 0.75rem;
      font-weight: 800;
      color: #222c57;
      text-transform: uppercase;
    }
    .subindices-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    /* Tarjetas de Auditoría de Ítems (Inspiradas en admin-tray) */
    .items-cards-list {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
    }
    .item-audit-card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 0.75rem;
      padding: 1rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      transition: all 0.2s ease;
    }
    .item-audit-card:hover {
      border-color: #94a3b8;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08);
    }
    .item-audit-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }
    .item-audit-left {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }
    .item-counter-badge {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #222c57;
      color: #ffffff;
      font-weight: 800;
      font-size: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
    }
    .item-title-meta {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .item-main-title {
      font-size: 0.95rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      line-height: 1.35;
    }
    .item-badges-wrap {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.375rem;
    }
    .item-audit-body {
      background: #f8fafc;
      border: 1px solid #f1f5f9;
      border-radius: 0.5rem;
      padding: 0.75rem 1rem;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }
    @media (max-width: 640px) {
      .detail-grid {
        grid-template-columns: 1fr;
      }
    }
    .detail-label {
      font-size: 0.6875rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: block;
      margin-bottom: 0.15rem;
    }
    .detail-value {
      font-size: 0.8125rem;
      color: #1e293b;
    }

    /* Acciones de Auditoría por cada Ítem */
    .item-audit-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid #f1f5f9;
    }
    .doc-actions-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    /* Badges Especiales */
    .badge-gold {
      background: rgba(196, 168, 87, 0.18);
      color: #8d7936;
      border: 1px solid rgba(196, 168, 87, 0.4);
      font-weight: 700;
    }
    .badge-purple {
      background: rgba(168, 85, 247, 0.15);
      color: #7e22ce;
      border: 1px solid rgba(168, 85, 247, 0.3);
      font-weight: 700;
    }
    .badge-hours {
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      font-weight: 800;
      font-size: 0.75rem;
    }
    .badge-subtle-general {
      background: #f1f5f9;
      color: #64748b;
      border: 1px solid #cbd5e1;
      font-size: 0.6875rem;
    }
    .sin-respaldo-tag {
      font-size: 0.75rem;
      color: #94a3b8;
      font-style: italic;
    }
    .empty-subindice-msg {
      font-size: 0.8125rem;
      color: #94a3b8;
      font-style: italic;
      padding: 1rem 0;
      margin: 0;
      text-align: center;
    }
    .archivo-id-tracker {
      display: none;
    }
  `,
})
export class ExpedienteSeccionesComponent {
  readonly hojaDeVida = input.required<HojaDeVidaDto>();
  readonly expediente = input<ExpedienteRevisionDto | null>(null);
  readonly observaciones = input<ObservacionDto[]>([]);
  readonly archivos = input<ArchivoDto[]>([]);
  readonly obligatorias = input<EstadoCapacitacionObligatoriaPersonaDto[]>([]);
  readonly puedeVincularPorAyuda = input<boolean>(true);

  readonly descargar = output<{ archivoId: string; nombreOriginal: string }>();
  readonly previsualizar = output<{ archivoId: string; nombreOriginal: string }>();
  readonly marcarItem = output<{ tipo: string; clave: string; label: string }>();
  readonly vincularPorAyuda = output<{ obligatoriaId: string; capacitacionId: string }>();
  readonly retirarArchivo = output<{ archivoId: string; nombreOriginal: string }>();

  readonly tabActiva = signal<TabExpediente>('todos');
  readonly modalAyudaObligatoria = signal<EstadoCapacitacionObligatoriaPersonaDto | null>(null);
  readonly capacitacionAyudaSeleccionada = signal<string>('');

  readonly esEnviado = computed(
    () => (this.hojaDeVida()?.estadoActualizacion ?? '').toLowerCase() === 'enviado',
  );

  readonly capacitacionesDisponibles = computed(() =>
    (this.hojaDeVida().capacitaciones || []).filter((c) => !c.capacitacionObligatoriaId),
  );

  cambiarTab(tab: TabExpediente): void {
    this.tabActiva.set(tab);
  }

  subindicesActivosDe(seccion: string): EstadoSubindiceSeccionPersonaDto[] {
    return (this.hojaDeVida().subindicesSeccion ?? []).filter(
      (s) => s.seccion === seccion && s.activo,
    );
  }

  nombreSubindice(id?: string): string | undefined {
    return nombreSubindicePorId(this.hojaDeVida().subindicesSeccion, id);
  }

  onDescargar(archivoId: string, nombreOriginal: string): void {
    this.descargar.emit({ archivoId, nombreOriginal });
  }

  onRetirarArchivo(archivoId: string, nombreOriginal: string): void {
    this.retirarArchivo.emit({ archivoId, nombreOriginal });
  }

  onPrevisualizar(archivoId: string, nombreOriginal: string): void {
    this.previsualizar.emit({ archivoId, nombreOriginal });
  }

  onMarcarItem(tipoItem: string, id: string, label: string): void {
    this.marcarItem.emit({
      tipo: 'Item',
      clave: `${tipoItem}:${id}`,
      label,
    });
  }

  onMarcarObligatoriaPendiente(id: string, nombre: string): void {
    this.marcarItem.emit({
      tipo: 'Item',
      clave: `capacitaciones.obligatoria.${id}`,
      label: `Obligatoria: ${nombre}`,
    });
  }

  abrirModalAyuda(ob: EstadoCapacitacionObligatoriaPersonaDto): void {
    this.modalAyudaObligatoria.set(ob);
    this.capacitacionAyudaSeleccionada.set('');
  }

  cerrarModalAyuda(): void {
    this.modalAyudaObligatoria.set(null);
    this.capacitacionAyudaSeleccionada.set('');
  }

  confirmarVincularAyuda(): void {
    const ob = this.modalAyudaObligatoria();
    const capId = this.capacitacionAyudaSeleccionada();
    if (!ob || !capId) return;
    this.vincularPorAyuda.emit({
      obligatoriaId: ob.id,
      capacitacionId: capId,
    });
    this.cerrarModalAyuda();
  }
}
