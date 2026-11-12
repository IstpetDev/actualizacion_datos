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
  MarcaObservacionItem,
  ObservacionDto,
} from '../../../api-client';
import { nombreSubindicePorId } from '../../usuario/hoja-de-vida/componentes/bloque-subindices-seccion.component';

export type TabExpediente =
  'ficha' | 'formacion' | 'capacitaciones' | 'experiencia' | 'referencias' | 'documentos';

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
          <span>2. Formación Académica</span>
          <span
            class="tab-count-badge"
            [class.tab-count-has-items]="
              (hojaDeVida().titulos?.length || 0) + (hojaDeVida().titulosEnCurso?.length || 0) > 0
            "
          >
            {{ (hojaDeVida().titulos?.length || 0) + (hojaDeVida().titulosEnCurso?.length || 0) }}
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
          <span>3. Capacitaciones</span>
          <span
            class="tab-count-badge"
            [class.tab-count-has-items]="(hojaDeVida().capacitaciones?.length || 0) > 0"
          >
            {{ hojaDeVida().capacitaciones?.length || 0 }}
          </span>
        </button>

        <button
          type="button"
          class="tab-btn"
          [class.active]="tabActiva() === 'experiencia'"
          (click)="cambiarTab('experiencia')"
          data-testid="tab-exp-experiencia"
        >
          <span class="material-symbols-outlined icon-sm">work</span>
          <span>4. Experiencia Laboral</span>
          <span
            class="tab-count-badge"
            [class.tab-count-has-items]="(hojaDeVida().experiencias?.length || 0) > 0"
          >
            {{ hojaDeVida().experiencias?.length || 0 }}
          </span>
        </button>

        <button
          type="button"
          class="tab-btn"
          [class.active]="tabActiva() === 'referencias'"
          (click)="cambiarTab('referencias')"
          data-testid="tab-exp-referencias"
        >
          <span class="material-symbols-outlined icon-sm">groups</span>
          <span>5. Referencias</span>
          <span
            class="tab-count-badge"
            [class.tab-count-has-items]="(hojaDeVida().referencias?.length || 0) > 0"
          >
            {{ hojaDeVida().referencias?.length || 0 }}
          </span>
        </button>

        <button
          type="button"
          class="tab-btn"
          [class.active]="tabActiva() === 'documentos'"
          (click)="cambiarTab('documentos')"
          data-testid="tab-exp-documentos"
        >
          <span class="material-symbols-outlined icon-sm">folder_open</span>
          <span>6. Documentos del Expediente</span>
          <span
            class="tab-count-badge"
            [class.tab-count-has-items]="documentosExpediente().length > 0"
          >
            {{ documentosExpediente().length }}
          </span>
        </button>
      </nav>

      <!-- =================================================================== -->
      <!-- SECCIÓN 1: FICHA PERSONAL E IDENTIDAD -->
      <!-- =================================================================== -->
      @if (tabActiva() === 'ficha') {
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
            <div class="ficha-bento-grid">
              <!-- Columna Izquierda: Identidad y Contacto -->
              <div class="ficha-bento-col">
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
                            ficha.fechaNacimiento
                              ? (ficha.fechaNacimiento | date: 'dd/MM/yyyy')
                              : '—'
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
                      <span
                        class="dato-value font-semibold"
                        data-testid="expediente-correo-personal"
                      >
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
              </div>

              <!-- Columna Derecha: Consentimiento, Cuenta Bancaria y Perfil -->
              <div class="ficha-bento-col">
                <!-- Subíndice 1.3: Consentimiento y Cuenta Bancaria -->
                <div class="subindice-card">
                  <div class="subindice-header">
                    <span class="subindice-tag">Índice 1.3</span>
                    <h4 class="subindice-title">Consentimiento de Datos y Cuenta Bancaria</h4>
                  </div>
                  <div class="datos-grid-cards">
                    <div class="dato-field col-span-2">
                      <span class="dato-label">Tratamiento de Datos Personales (LOPDP):</span>
                      <span class="dato-value">
                        @if (expediente()?.tratamientoDatosAceptado) {
                          <span class="badge badge-success">✓ Aceptado formalmente</span>
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
              </div>
            </div>
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
      @if (tabActiva() === 'formacion') {
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
                    [class.item-revisado-auditado]="estaRevisado('titulo:' + t.id)"
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

                    @if (marcaPendienteDe('titulo:' + t.id); as marca) {
                      <div class="marca-pendiente-item-badge">
                        <span class="material-symbols-outlined icon-xs text-warning">warning</span>
                        <span>Corrección en cola: "{{ marca.texto }}"</span>
                      </div>
                    }

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
                            @if (estaRevisado('titulo:' + t.id)) {
                              <span class="badge badge-success">✓ Verificado</span>
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

                      <div class="doc-actions-right flex items-center gap-2">
                        <button
                          type="button"
                          class="btn btn-sm btn-revisado"
                          [class.btn-revisado-ok]="estaRevisado('titulo:' + t.id)"
                          (click)="toggleRevisado('titulo:' + t.id)"
                          [attr.data-testid]="'btn-toggle-revisado-titulo-' + t.id"
                          title="Marcar este título como verificado y conforme"
                        >
                          <span class="material-symbols-outlined icon-xs">
                            {{
                              estaRevisado('titulo:' + t.id)
                                ? 'check_circle'
                                : 'radio_button_unchecked'
                            }}
                          </span>
                          <span>{{
                            estaRevisado('titulo:' + t.id) ? 'Revisado' : 'Marcar Revisado'
                          }}</span>
                        </button>
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
      @if (tabActiva() === 'capacitaciones') {
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
                    [class.item-revisado-auditado]="estaRevisado('capacitacion:' + c.id)"
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

                    @if (marcaPendienteDe('capacitacion:' + c.id); as marca) {
                      <div class="marca-pendiente-item-badge">
                        <span class="material-symbols-outlined icon-xs text-warning">warning</span>
                        <span>Corrección en cola: "{{ marca.texto }}"</span>
                      </div>
                    }

                    <div class="item-audit-top">
                      <div class="item-audit-left">
                        <span class="item-counter-badge" title="Capacitación #{{ idx + 1 }}">
                          #{{ idx + 1 }}
                        </span>
                        <div class="item-title-meta">
                          <h5 class="item-main-title">{{ c.nombreEvento }}</h5>
                          <div class="item-badges-wrap">
                            <span class="badge badge-hours">{{ c.numeroHoras || 0 }} horas</span>
                            @if (estaRevisado('capacitacion:' + c.id)) {
                              <span class="badge badge-success">✓ Verificado</span>
                            }
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

                      <div class="doc-actions-right flex items-center gap-2">
                        <button
                          type="button"
                          class="btn btn-sm btn-revisado"
                          [class.btn-revisado-ok]="estaRevisado('capacitacion:' + c.id)"
                          (click)="toggleRevisado('capacitacion:' + c.id)"
                          title="Marcar capacitación como verificada"
                        >
                          <span class="material-symbols-outlined icon-xs">
                            {{
                              estaRevisado('capacitacion:' + c.id)
                                ? 'check_circle'
                                : 'radio_button_unchecked'
                            }}
                          </span>
                          <span>{{
                            estaRevisado('capacitacion:' + c.id) ? 'Revisado' : 'Marcar Revisado'
                          }}</span>
                        </button>
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
      @if (tabActiva() === 'experiencia') {
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
      @if (tabActiva() === 'referencias') {
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
      <!-- SECCIÓN 6: DOCUMENTOS DEL EXPEDIENTE -->
      <!-- =================================================================== -->
      @if (tabActiva() === 'documentos') {
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
                  6. DOCUMENTOS DEL EXPEDIENTE ({{ documentosExpediente().length }})
                </h3>
                <p class="seccion-auditoria-desc">
                  Expediente digitalizado oficial: cédula de identidad, certificados y documentos
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
            claveDestino="documentos"
          />

          <!-- Subíndice 6.1: Expediente Digital Institucional -->
          <div class="subindice-bloque">
            <div class="subindice-bloque-header flex justify-between items-center flex-wrap gap-2">
              <div class="subindice-tag-group">
                <span class="subindice-tag">Índice 6.1</span>
                <h4 class="subindice-title">
                  Documentos Personales e Institucionales ({{ documentosExpediente().length }})
                </h4>
              </div>
              <span class="badge badge-info">Expediente Oficial</span>
            </div>

            @if (!documentosExpediente().length) {
              <p class="empty-subindice-msg">
                No se registran documentos personales ni institucionales adjuntos en este
                expediente.
              </p>
            } @else {
              <div class="items-cards-list">
                @for (arc of documentosExpediente(); track arc.id; let idx = $index) {
                  <div
                    class="item-audit-card glass-card archivo-item"
                    [class.item-revisado-auditado]="estaRevisado('documento:' + arc.id)"
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

                    @if (marcaPendienteDe('documento:' + arc.id); as marca) {
                      <div class="marca-pendiente-item-badge">
                        <span class="material-symbols-outlined icon-xs text-warning">warning</span>
                        <span>Corrección en cola: "{{ marca.texto }}"</span>
                      </div>
                    }

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
                            @if (estaRevisado('documento:' + arc.id)) {
                              <span class="badge badge-success">✓ Verificado</span>
                            }
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

                      <div class="doc-actions-right flex items-center gap-2">
                        <button
                          type="button"
                          class="btn btn-sm btn-revisado"
                          [class.btn-revisado-ok]="estaRevisado('documento:' + arc.id)"
                          (click)="toggleRevisado('documento:' + arc.id)"
                          title="Marcar documento como verificado"
                        >
                          <span class="material-symbols-outlined icon-xs">
                            {{
                              estaRevisado('documento:' + arc.id)
                                ? 'check_circle'
                                : 'radio_button_unchecked'
                            }}
                          </span>
                          <span>{{
                            estaRevisado('documento:' + arc.id) ? 'Revisado' : 'Marcar Revisado'
                          }}</span>
                        </button>
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
                  </div>
                }
              </div>
            }

            @if (respaldosEspecificos().length > 0) {
              <div class="aviso-respaldos-en-secciones mt-4">
                <span class="material-symbols-outlined icon-xs text-primary">info</span>
                <span>
                  Los <strong>{{ respaldosEspecificos().length }} respaldos específicos</strong>
                  (títulos, certificados de cursos y experiencia laboral) se revisan directamente
                  dentro de cada sección (Formación, Capacitaciones, Experiencia) para mantener un
                  expediente claro y sin duplicidad.
                </span>
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

    /* Pestañas de navegación sticky estilo Aurora UI & Glassmorphism */
    .secciones-tabs {
      display: flex;
      gap: 0.5rem;
      overflow-x: auto;
      padding: 0.5rem 0.75rem;
      background: rgba(255, 255, 255, 0.88);
      border: 1px solid rgba(226, 232, 240, 0.85);
      border-radius: 1rem;
      box-shadow:
        0 4px 16px -2px rgba(15, 23, 42, 0.06),
        0 1px 2px 0 rgba(0, 0, 0, 0.03);
      position: sticky;
      top: 0.75rem;
      z-index: 20;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
    .tab-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 1 1 0px;
      min-width: 140px;
      gap: 0.5rem;
      padding: 0.55rem 0.875rem;
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
    .tab-count-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.6875rem;
      font-weight: 800;
      min-width: 20px;
      height: 20px;
      padding: 0 0.375rem;
      border-radius: 9999px;
      background: #e2e8f0;
      color: #64748b;
      line-height: 1;
      transition: all 0.2s ease;
    }
    .tab-count-badge.tab-count-has-items {
      background: #0284c7;
      color: #ffffff;
      box-shadow: 0 1px 2px rgba(2, 132, 199, 0.3);
    }
    .tab-btn.active .tab-count-badge {
      background: rgba(255, 255, 255, 0.25);
      color: #ffffff;
    }
    .tab-btn.active .tab-count-badge.tab-count-has-items {
      background: #38bdf8;
      color: #082f49;
    }
    .tab-btn:hover {
      background: #f1f5f9;
      color: #0f172a;
    }
    .tab-btn.active {
      background: linear-gradient(135deg, #1e293b 0%, #172554 50%, #222c57 100%);
      color: #ffffff;
      box-shadow: 0 4px 12px -2px rgba(34, 44, 87, 0.35);
      border-color: rgba(255, 255, 255, 0.18);
    }

    /* Secciones de auditoría con Glassmorphism */
    .seccion-auditoria {
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid rgba(226, 232, 240, 0.9);
      border-radius: 1.125rem;
      padding: 1.5rem;
      box-shadow:
        0 8px 24px -4px rgba(15, 23, 42, 0.05),
        0 2px 6px -1px rgba(0, 0, 0, 0.03);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
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
      background: linear-gradient(135deg, #172554 0%, #222c57 100%);
      color: #ffffff;
      font-weight: 900;
      font-size: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 10px -2px rgba(34, 44, 87, 0.35);
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

    /* Bento Grid para Ficha Personal */
    .ficha-bento-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1.25rem;
      align-items: start;
    }
    .ficha-bento-col {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    @media (max-width: 960px) {
      .ficha-bento-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Layout Ficha Identidad */
    .identidad-layout {
      display: grid;
      grid-template-columns: 170px 1fr;
      gap: 1.25rem;
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
      height: 140px;
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
    /* Estado de Ítem Revisado / Conforme */
    .item-revisado-auditado {
      border-left: 5px solid #10b981 !important;
      background: rgba(240, 253, 244, 0.6) !important;
    }
    .btn-revisado {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.375rem 0.65rem;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #475569;
    }
    .btn-revisado:hover {
      border-color: #10b981;
      color: #047857;
      background: #f0fdf4;
    }
    .btn-revisado-ok {
      background: #10b981 !important;
      color: #ffffff !important;
      border-color: #059669 !important;
      font-weight: 700 !important;
    }
    .marca-pendiente-item-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.65rem;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      font-weight: 700;
      color: #b45309;
      width: 100%;
    }
    .aviso-respaldos-en-secciones {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 0.875rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      font-size: 0.78125rem;
      color: #475569;
      margin-bottom: 0.75rem;
    }
    .doc-actions-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
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
  readonly marcasPendientes = input<MarcaObservacionItem[]>([]);
  readonly puedeVincularPorAyuda = input<boolean>(true);

  readonly descargar = output<{ archivoId: string; nombreOriginal: string }>();
  readonly previsualizar = output<{ archivoId: string; nombreOriginal: string }>();
  readonly marcarItem = output<{ tipo: string; clave: string; label: string }>();
  readonly vincularPorAyuda = output<{ obligatoriaId: string; capacitacionId: string }>();
  readonly retirarArchivo = output<{ archivoId: string; nombreOriginal: string }>();

  readonly tabActiva = signal<TabExpediente>('ficha');
  readonly modalAyudaObligatoria = signal<EstadoCapacitacionObligatoriaPersonaDto | null>(null);
  readonly capacitacionAyudaSeleccionada = signal<string>('');

  // Ítems revisados localmente por el supervisor para seguimiento
  readonly itemsRevisados = signal<Set<string>>(new Set<string>());

  readonly esEnviado = computed(
    () => (this.hojaDeVida()?.estadoActualizacion ?? '').toLowerCase() === 'enviado',
  );

  readonly capacitacionesDisponibles = computed(() =>
    (this.hojaDeVida().capacitaciones || []).filter((c) => !c.capacitacionObligatoriaId),
  );

  readonly idsArchivosTitulos = computed(() => {
    const ids = new Set<string>();
    for (const t of this.hojaDeVida()?.titulos || []) {
      if (t.archivoId) ids.add(t.archivoId.toLowerCase());
    }
    for (const tc of this.hojaDeVida()?.titulosEnCurso || []) {
      if (tc.archivoId) ids.add(tc.archivoId.toLowerCase());
    }
    return ids;
  });

  readonly idsArchivosCapacitaciones = computed(() => {
    const ids = new Set<string>();
    for (const c of this.hojaDeVida()?.capacitaciones || []) {
      if (c.archivoId) ids.add(c.archivoId.toLowerCase());
    }
    return ids;
  });

  readonly idsArchivosExperiencias = computed(() => {
    const ids = new Set<string>();
    for (const e of this.hojaDeVida()?.experiencias || []) {
      if (e.archivoId) ids.add(e.archivoId.toLowerCase());
    }
    return ids;
  });

  esArchivoDeItemEspecifico(arc: ArchivoDto): boolean {
    const id = (arc.id || '').toLowerCase();
    const clave = (arc.claveDestino || '').toLowerCase();
    if (
      clave.startsWith('titulo:') ||
      clave.startsWith('capacitacion:') ||
      clave.startsWith('experiencia:') ||
      clave.startsWith('ficha') ||
      clave.startsWith('foto')
    ) {
      return true;
    }
    return (
      this.idsArchivosTitulos().has(id) ||
      this.idsArchivosCapacitaciones().has(id) ||
      this.idsArchivosExperiencias().has(id)
    );
  }

  readonly documentosExpediente = computed(() => {
    return this.archivos().filter((a) => !this.esArchivoDeItemEspecifico(a));
  });

  readonly respaldosEspecificos = computed(() => {
    return this.archivos().filter((a) => this.esArchivoDeItemEspecifico(a));
  });

  estaRevisado(key: string): boolean {
    return this.itemsRevisados().has(key);
  }

  toggleRevisado(key: string): void {
    this.itemsRevisados.update((set) => {
      const nuevo = new Set(set);
      if (nuevo.has(key)) {
        nuevo.delete(key);
      } else {
        nuevo.add(key);
      }
      return nuevo;
    });
  }

  marcaPendienteDe(clave: string): MarcaObservacionItem | undefined {
    const cNorm = clave.toLowerCase();
    return this.marcasPendientes().find(
      (m) =>
        m.claveDestino.toLowerCase() === cNorm ||
        m.claveDestino.toLowerCase().endsWith(':' + cNorm),
    );
  }

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
