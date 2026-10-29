import { ObservacionesRevisionComponent } from '../../revision-compartida/observaciones-revision.component';
import { CommonModule } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ArchivoDto,
  EstadoCapacitacionObligatoriaPersonaDto,
  HojaDeVidaDto,
  ObservacionDto,
} from '../../../api-client';

export type TabExpediente =
  'ficha' | 'formacion' | 'capacitaciones' | 'experiencia' | 'referencias' | 'documentos';

@Component({
  selector: 'app-expediente-secciones',
  standalone: true,
  imports: [CommonModule, FormsModule, ObservacionesRevisionComponent],
  template: `
    <div class="expediente-secciones-container" data-testid="expediente-secciones">
      <!-- Navegación de pestañas de secciones -->
      <nav class="secciones-tabs" role="tablist">
        <button
          type="button"
          class="tab-btn"
          [class.active]="tabActiva() === 'ficha'"
          (click)="cambiarTab('ficha')"
          data-testid="tab-exp-ficha"
        >
          1. Ficha Personal
        </button>
        <button
          type="button"
          class="tab-btn"
          [class.active]="tabActiva() === 'formacion'"
          (click)="cambiarTab('formacion')"
          data-testid="tab-exp-formacion"
        >
          2. Formación Académica ({{
            (hojaDeVida().titulos?.length || 0) + (hojaDeVida().titulosEnCurso?.length || 0)
          }})
        </button>
        <button
          type="button"
          class="tab-btn"
          [class.active]="tabActiva() === 'capacitaciones'"
          (click)="cambiarTab('capacitaciones')"
          data-testid="tab-exp-capacitaciones"
        >
          3. Capacitaciones ({{ hojaDeVida().capacitaciones?.length || 0 }})
        </button>
        <button
          type="button"
          class="tab-btn"
          [class.active]="tabActiva() === 'experiencia'"
          (click)="cambiarTab('experiencia')"
          data-testid="tab-exp-experiencia"
        >
          4. Experiencia Laboral ({{ hojaDeVida().experiencias?.length || 0 }})
        </button>
        <button
          type="button"
          class="tab-btn"
          [class.active]="tabActiva() === 'referencias'"
          (click)="cambiarTab('referencias')"
          data-testid="tab-exp-referencias"
        >
          5. Referencias ({{ hojaDeVida().referencias?.length || 0 }})
        </button>
        <button
          type="button"
          class="tab-btn"
          [class.active]="tabActiva() === 'documentos'"
          (click)="cambiarTab('documentos')"
          data-testid="tab-exp-documentos"
        >
          6. Documentos y Respaldos ({{ archivos().length }})
        </button>
      </nav>

      <!-- SECCIÓN 1: FICHA PERSONAL -->
      @if (tabActiva() === 'ficha') {
        <div class="tab-panel" data-testid="panel-exp-ficha">
          <app-observaciones-revision
            [observaciones]="observaciones()"
            [hojaDeVida]="hojaDeVida()"
            [archivos]="archivos()"
            [estado]="hojaDeVida().estadoActualizacion"
            tipoDestino="seccion"
            claveDestino="ficha"
          />
          @if (hojaDeVida().ficha; as ficha) {
            <div class="ficha-grid">
              <div class="card-dato">
                <span class="label">Nombres y Apellidos:</span>
                <strong class="valor"
                  >{{ ficha.primerNombre }} {{ ficha.segundoNombre || '' }}
                  {{ ficha.primerApellido }} {{ ficha.segundoApellido || '' }}</strong
                >
              </div>
              <div class="card-dato">
                <span class="label">Documento:</span>
                <span class="valor">{{ hojaDeVida().documento }}</span>
              </div>
              <div class="card-dato">
                <span class="label">Fecha Nacimiento:</span>
                <span class="valor">{{
                  ficha.fechaNacimiento ? (ficha.fechaNacimiento | date: 'dd/MM/yyyy') : '—'
                }}</span>
              </div>
              <div class="card-dato">
                <span class="label">Correo Institucional:</span>
                <span class="valor">{{ ficha.correoInstitucional || '—' }}</span>
              </div>
              <div class="card-dato">
                <span class="label">Teléfonos:</span>
                <span class="valor"
                  >Cel: {{ ficha.celular || '—' }} | Conv:
                  {{ ficha.telefonoConvencional || '—' }}</span
                >
              </div>
              <div class="card-dato col-span-2">
                <span class="label">Dirección Domiciliaria:</span>
                <span class="valor"
                  >{{ ficha.callePrincipal || '—' }} {{ ficha.numeroCasa || '' }}
                  {{ ficha.calleSecundaria ? 'y ' + ficha.calleSecundaria : '' }}
                  {{ ficha.referenciaDomicilio ? '(' + ficha.referenciaDomicilio + ')' : '' }}</span
                >
              </div>
              <div class="card-dato col-span-2">
                <span class="label">Discapacidad:</span>
                <span class="valor">
                  @if (ficha.porcentajeDiscapacidad) {
                    <span class="badge badge-warning"
                      >Sí ({{ ficha.porcentajeDiscapacidad }}% - Carnet:
                      {{ ficha.numeroCarnetDiscapacidad || 'S/N' }})</span
                    >
                  } @else {
                    <span class="badge badge-success">No registra discapacidad</span>
                  }
                </span>
              </div>
              @if (ficha.perfil) {
                <div class="card-dato col-span-2">
                  <span class="label">Perfil profesional generado:</span>
                  <p class="valor texto-perfil">{{ ficha.perfil }}</p>
                </div>
              }
              @if (ficha.fotoArchivoId) {
                <div class="card-dato col-span-2">
                  <span class="label">Fotografía de Perfil:</span>
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    (click)="onDescargar(ficha.fotoArchivoId, 'foto_perfil.jpg')"
                    data-testid="btn-descargar-foto"
                  >
                    Ver Fotografía Adjunta
                  </button>
                </div>
              }
            </div>
          } @else {
            <p class="text-muted empty-msg">
              No se registra ficha personal estructurada para este usuario.
            </p>
          }
        </div>
      }

      <!-- SECCIÓN 2: FORMACIÓN ACADÉMICA -->
      @if (tabActiva() === 'formacion') {
        <div class="tab-panel" data-testid="panel-exp-formacion">
          <app-observaciones-revision
            [observaciones]="observaciones()"
            [hojaDeVida]="hojaDeVida()"
            [archivos]="archivos()"
            [estado]="hojaDeVida().estadoActualizacion"
            tipoDestino="seccion"
            claveDestino="formacion"
          />
          <h4 class="subtitulo-seccion">Títulos Académicos Obtenidos</h4>
          <div class="items-lista">
            @for (t of hojaDeVida().titulos; track t.id) {
              <div class="item-card" [attr.data-testid]="'item-titulo-' + t.id">
                <app-observaciones-revision
                  [observaciones]="observaciones()"
                  [hojaDeVida]="hojaDeVida()"
                  [archivos]="archivos()"
                  [estado]="hojaDeVida().estadoActualizacion"
                  tipoDestino="titulo"
                  [claveDestino]="t.id"
                  [archivoId]="t.archivoId"
                />
                <div class="item-header">
                  <strong>{{ t.nombreTitulo }}</strong>
                  @if (t.numeroRegistroSenescyt) {
                    <span class="badge badge-info">Senescyt: {{ t.numeroRegistroSenescyt }}</span>
                  }
                </div>
                <div class="item-body">
                  <p class="item-meta">
                    Institución: <em>{{ t.nombreInstitucionOtra || 'Institución registrada' }}</em>
                    @if (t.fechaRegistroSenescyt) {
                      • Fecha Reg: {{ t.fechaRegistroSenescyt | date: 'dd/MM/yyyy' }}
                    } @else if (t.fechaObtencion) {
                      • Fecha: {{ t.fechaObtencion | date: 'dd/MM/yyyy' }}
                    }
                  </p>
                </div>
                <div class="item-actions">
                  @if (t.archivoId) {
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      (click)="onDescargar(t.archivoId, 'titulo_' + t.nombreTitulo + '.pdf')"
                      [attr.data-testid]="'btn-descargar-titulo-' + t.id"
                    >
                      Descargar Respaldo
                    </button>
                  } @else {
                    <span class="sin-respaldo">Sin respaldo adjunto</span>
                  }
                  <button
                    type="button"
                    class="btn btn-warning btn-sm"
                    [disabled]="hojaDeVida().estadoActualizacion !== 'Enviado'"
                    (click)="onMarcarItem('titulo', t.id, t.nombreTitulo)"
                    [attr.data-testid]="'btn-marcar-titulo-' + t.id"
                  >
                    ⚠️ Marcar Ítem
                  </button>
                </div>
              </div>
            } @empty {
              <p class="text-muted empty-msg">No se registran títulos académicos obtenidos.</p>
            }
          </div>

          <h4 class="subtitulo-seccion mt-4">Estudios en Curso</h4>
          <div class="items-lista">
            @for (tc of hojaDeVida().titulosEnCurso; track tc.id) {
              <div class="item-card" [attr.data-testid]="'item-titulo-en-curso-' + tc.id">
                <app-observaciones-revision
                  [observaciones]="observaciones()"
                  [hojaDeVida]="hojaDeVida()"
                  [archivos]="archivos()"
                  [estado]="hojaDeVida().estadoActualizacion"
                  tipoDestino="titulo-en-curso"
                  [claveDestino]="tc.id"
                  [archivoId]="tc.archivoId"
                />
                <div class="item-header">
                  <strong>{{ tc.nombrePrograma }}</strong>
                  <span class="badge badge-warning">En curso</span>
                </div>
                <div class="item-body">
                  <p class="item-meta">
                    Institución:
                    <em>{{ tc.nombreInstitucionOtra || 'Institución registrada' }}</em> • Inicio:
                    {{ tc.fechaInicio | date: 'dd/MM/yyyy' }}
                    @if (tc.fechaFinEstimada) {
                      • Fin Estimado: {{ tc.fechaFinEstimada | date: 'dd/MM/yyyy' }}
                    }
                  </p>
                </div>
                <div class="item-actions">
                  @if (tc.archivoId) {
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      (click)="
                        onDescargar(tc.archivoId, 'estudio_en_curso_' + tc.nombrePrograma + '.pdf')
                      "
                      [attr.data-testid]="'btn-descargar-titulo-en-curso-' + tc.id"
                    >
                      Descargar Respaldo
                    </button>
                  } @else {
                    <span class="sin-respaldo">Sin respaldo adjunto</span>
                  }
                  <button
                    type="button"
                    class="btn btn-warning btn-sm"
                    [disabled]="hojaDeVida().estadoActualizacion !== 'Enviado'"
                    (click)="onMarcarItem('titulo-en-curso', tc.id, tc.nombrePrograma)"
                    [attr.data-testid]="'btn-marcar-titulo-en-curso-' + tc.id"
                  >
                    ⚠️ Marcar Ítem
                  </button>
                </div>
              </div>
            } @empty {
              <p class="text-muted empty-msg">No se registran estudios en curso.</p>
            }
          </div>
        </div>
      }

      <!-- SECCIÓN 3: CAPACITACIONES -->
      @if (tabActiva() === 'capacitaciones') {
        <div class="tab-panel" data-testid="panel-exp-capacitaciones">
          <app-observaciones-revision
            [observaciones]="observaciones()"
            [hojaDeVida]="hojaDeVida()"
            [archivos]="archivos()"
            [estado]="hojaDeVida().estadoActualizacion"
            tipoDestino="seccion"
            claveDestino="capacitaciones"
          />
          @if (obligatorias().length > 0) {
            <h4 class="subtitulo-seccion">Obligatorias de la Institución</h4>
            <div class="items-lista mb-4" data-testid="lista-obligatorias-revision">
              @for (ob of obligatorias(); track ob.id) {
                <div class="item-card" [attr.data-testid]="'item-obligatoria-' + ob.id">
                  <app-observaciones-revision
                    [observaciones]="observaciones()"
                    [hojaDeVida]="hojaDeVida()"
                    [archivos]="archivos()"
                    [estado]="hojaDeVida().estadoActualizacion"
                    tipoDestino="capacitacion-obligatoria"
                    [claveDestino]="ob.id"
                  />
                  <div class="item-header">
                    <strong>{{ ob.nombre }}</strong>
                    <span
                      class="badge"
                      [ngClass]="{
                        'badge-success': ob.estado === 'cargada',
                        'badge-warning': ob.estado === 'observada',
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
                  <div class="item-body">
                    <p class="item-meta">
                      @if (ob.horasEsperadas) {
                        <span>Horas esperadas: {{ ob.horasEsperadas }}h • </span>
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
                  <div class="item-actions">
                    @if (ob.capacitacionId) {
                      <button
                        type="button"
                        class="btn btn-warning btn-sm"
                        [disabled]="hojaDeVida().estadoActualizacion !== 'Enviado'"
                        (click)="onMarcarItem('capacitacion', ob.capacitacionId, ob.nombre)"
                        [attr.data-testid]="'btn-marcar-obligatoria-' + ob.id"
                      >
                        ⚠️ Marcar Ítem
                      </button>
                    } @else if (ob.estado === 'pendiente') {
                      <button
                        type="button"
                        class="btn btn-warning btn-sm"
                        [disabled]="hojaDeVida().estadoActualizacion !== 'Enviado'"
                        (click)="onMarcarObligatoriaPendiente(ob.id, ob.nombre)"
                        [attr.data-testid]="'btn-marcar-obligatoria-pendiente-' + ob.id"
                      >
                        ⚠️ Marcar Faltante
                      </button>

                      @if (puedeVincularPorAyuda() && capacitacionesDisponibles().length > 0) {
                        <button
                          type="button"
                          class="btn btn-primary btn-sm"
                          (click)="abrirModalAyuda(ob)"
                          [attr.data-testid]="'btn-vincular-ayuda-' + ob.id"
                        >
                          Vincular por ayuda
                        </button>
                      }
                    }
                  </div>
                </div>
              }
            </div>
          }

          <h4 class="subtitulo-seccion mt-4">Capacitaciones Registradas</h4>
          <div class="items-lista">
            @for (c of hojaDeVida().capacitaciones; track c.id) {
              <div class="item-card" [attr.data-testid]="'item-capacitacion-' + c.id">
                <app-observaciones-revision
                  [observaciones]="observaciones()"
                  [hojaDeVida]="hojaDeVida()"
                  [archivos]="archivos()"
                  [estado]="hojaDeVida().estadoActualizacion"
                  tipoDestino="capacitacion"
                  [claveDestino]="c.id"
                  [archivoId]="c.archivoId"
                />
                <div class="item-header">
                  <strong>{{ c.nombreEvento }}</strong>
                  <span class="badge badge-info">{{ c.numeroHoras || 0 }} horas</span>
                </div>
                <div class="item-body">
                  <p class="item-meta">
                    Institución: <em>{{ c.institucionOrganizadora }}</em> • Tipo:
                    {{ c.tipoParticipacion || 'Capacitación' }} • Fechas:
                    {{ c.fechaInicio | date: 'dd/MM/yyyy' }} -
                    {{ c.fechaFin | date: 'dd/MM/yyyy' }}
                  </p>
                </div>
                <div class="item-actions">
                  @if (c.archivoId) {
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      (click)="onDescargar(c.archivoId, 'capacitacion_' + c.nombreEvento + '.pdf')"
                      [attr.data-testid]="'btn-descargar-capacitacion-' + c.id"
                    >
                      Descargar Respaldo
                    </button>
                  } @else {
                    <span class="sin-respaldo">Sin respaldo adjunto</span>
                  }
                  <button
                    type="button"
                    class="btn btn-warning btn-sm"
                    [disabled]="hojaDeVida().estadoActualizacion !== 'Enviado'"
                    (click)="onMarcarItem('capacitacion', c.id, c.nombreEvento)"
                    [attr.data-testid]="'btn-marcar-capacitacion-' + c.id"
                  >
                    ⚠️ Marcar Ítem
                  </button>
                </div>
              </div>
            } @empty {
              <p class="text-muted empty-msg">No se registran capacitaciones profesionales.</p>
            }
          </div>
        </div>
      }

      <!-- SECCIÓN 4: EXPERIENCIA LABORAL -->
      @if (tabActiva() === 'experiencia') {
        <div class="tab-panel" data-testid="panel-exp-experiencia">
          <app-observaciones-revision
            [observaciones]="observaciones()"
            [hojaDeVida]="hojaDeVida()"
            [archivos]="archivos()"
            [estado]="hojaDeVida().estadoActualizacion"
            tipoDestino="seccion"
            claveDestino="experiencia"
          />
          <div class="items-lista">
            @for (e of hojaDeVida().experiencias; track e.id) {
              <div class="item-card" [attr.data-testid]="'item-experiencia-' + e.id">
                <app-observaciones-revision
                  [observaciones]="observaciones()"
                  [hojaDeVida]="hojaDeVida()"
                  [archivos]="archivos()"
                  [estado]="hojaDeVida().estadoActualizacion"
                  tipoDestino="experiencia"
                  [claveDestino]="e.id"
                  [archivoId]="e.archivoId"
                />
                <div class="item-header">
                  <strong>{{ e.cargo }}</strong>
                  <span
                    class="badge"
                    [class.badge-success]="e.trabajaActualmente"
                    [class.badge-secondary]="!e.trabajaActualmente"
                  >
                    {{ e.trabajaActualmente ? 'Trabaja actualmente' : 'Finalizado' }}
                  </span>
                </div>
                <div class="item-body">
                  <p class="item-meta">
                    Empleador: <em>{{ e.empleador }}</em> • Desde:
                    {{ e.fechaInicio | date: 'dd/MM/yyyy' }}
                    @if (e.fechaFin) {
                      • Hasta: {{ e.fechaFin | date: 'dd/MM/yyyy' }}
                    }
                  </p>
                  @if (e.funciones) {
                    <p class="item-contacto">Funciones: {{ e.funciones }}</p>
                  }
                </div>
                <div class="item-actions">
                  @if (e.archivoId) {
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      (click)="onDescargar(e.archivoId, 'experiencia_' + e.empleador + '.pdf')"
                      [attr.data-testid]="'btn-descargar-experiencia-' + e.id"
                    >
                      Descargar Respaldo
                    </button>
                  } @else {
                    <span class="sin-respaldo">Sin respaldo adjunto</span>
                  }
                  <button
                    type="button"
                    class="btn btn-warning btn-sm"
                    [disabled]="hojaDeVida().estadoActualizacion !== 'Enviado'"
                    (click)="onMarcarItem('experiencia', e.id, e.cargo + ' en ' + e.empleador)"
                    [attr.data-testid]="'btn-marcar-experiencia-' + e.id"
                  >
                    ⚠️ Marcar Ítem
                  </button>
                </div>
              </div>
            } @empty {
              <p class="text-muted empty-msg">No se registran experiencias laborales.</p>
            }
          </div>
        </div>
      }

      <!-- SECCIÓN 5: REFERENCIAS -->
      @if (tabActiva() === 'referencias') {
        <div class="tab-panel" data-testid="panel-exp-referencias">
          <app-observaciones-revision
            [observaciones]="observaciones()"
            [hojaDeVida]="hojaDeVida()"
            [archivos]="archivos()"
            [estado]="hojaDeVida().estadoActualizacion"
            tipoDestino="seccion"
            claveDestino="referencias"
          />
          <div class="items-lista">
            @for (r of hojaDeVida().referencias; track r.id) {
              <div class="item-card" [attr.data-testid]="'item-referencia-' + r.id">
                <app-observaciones-revision
                  [observaciones]="observaciones()"
                  [hojaDeVida]="hojaDeVida()"
                  [archivos]="archivos()"
                  [estado]="hojaDeVida().estadoActualizacion"
                  tipoDestino="referencia"
                  [claveDestino]="r.id"
                />
                <div class="item-header">
                  <strong>{{ r.nombresApellidos }}</strong>
                  <span class="badge badge-info">{{ r.tipo }}</span>
                </div>
                <div class="item-body">
                  <p class="item-meta">
                    Teléfono: <strong>{{ r.telefono }}</strong>
                    @if (r.cargoActual || r.titulo) {
                      • Cargo / Título: {{ r.cargoActual || r.titulo }}
                    }
                    @if (r.empresa) {
                      • Empresa: <em>{{ r.empresa }}</em>
                    }
                  </p>
                </div>
                <div class="item-actions">
                  <button
                    type="button"
                    class="btn btn-warning btn-sm"
                    [disabled]="hojaDeVida().estadoActualizacion !== 'Enviado'"
                    (click)="onMarcarItem('referencia', r.id, r.nombresApellidos)"
                    [attr.data-testid]="'btn-marcar-referencia-' + r.id"
                  >
                    ⚠️ Marcar Ítem
                  </button>
                </div>
              </div>
            } @empty {
              <p class="text-muted empty-msg">
                No se registran referencias personales o familiares.
              </p>
            }
          </div>
        </div>
      }

      <!-- SECCIÓN 6: DOCUMENTOS Y RESPALDOS -->
      @if (tabActiva() === 'documentos') {
        <div class="tab-panel" data-testid="panel-exp-documentos">
          <app-observaciones-revision
            [observaciones]="observaciones()"
            [hojaDeVida]="hojaDeVida()"
            [archivos]="archivos()"
            [estado]="hojaDeVida().estadoActualizacion"
            tipoDestino="seccion"
            claveDestino="documentos"
          />
          <div class="items-lista">
            @for (arc of archivos(); track arc.id) {
              <div class="item-card" [attr.data-testid]="'item-documento-' + arc.id">
                <app-observaciones-revision
                  [observaciones]="observaciones()"
                  [hojaDeVida]="hojaDeVida()"
                  [archivos]="archivos()"
                  [estado]="hojaDeVida().estadoActualizacion"
                  tipoDestino="archivo"
                  [claveDestino]="arc.id"
                />
                <div class="item-header">
                  <strong>{{ arc.nombreOriginal }}</strong>
                  <span class="badge badge-secondary"
                    >{{ (arc.tamanoBytes / 1024).toFixed(1) }} KB</span
                  >
                </div>
                <div class="item-body">
                  <p class="item-meta">
                    Destino: <code>{{ arc.claveDestino || 'Documento general' }}</code> • Formato:
                    {{ arc.tipoContenido }} • Subido:
                    {{ arc.fechaSubidaUtc | date: 'dd/MM/yyyy HH:mm' }}
                  </p>
                </div>
                <div class="item-actions">
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    (click)="onDescargar(arc.id, arc.nombreOriginal)"
                    [attr.data-testid]="'btn-descargar-archivo-' + arc.id"
                  >
                    Descargar
                  </button>
                  <button
                    type="button"
                    class="btn btn-warning btn-sm"
                    [disabled]="hojaDeVida().estadoActualizacion !== 'Enviado'"
                    (click)="onMarcarItem('documento', arc.id, arc.nombreOriginal)"
                    [attr.data-testid]="'btn-marcar-documento-' + arc.id"
                  >
                    ⚠️ Marcar Ítem / Archivo
                  </button>
                </div>
              </div>
            } @empty {
              <p class="text-muted empty-msg">
                No se registran documentos adjuntos en este expediente.
              </p>
            }
          </div>
        </div>
      }
      <!-- Modal Vincular por Ayuda -->
      @if (modalAyudaObligatoria()) {
        <div class="modal-backdrop" data-testid="modal-vincular-ayuda">
          <div class="modal-card">
            <h4>Vincular por ayuda del supervisor</h4>
            <p>
              Vincular una capacitación registrada de la persona a:
              <strong>{{ modalAyudaObligatoria()!.nombre }}</strong>
            </p>
            <div class="form-group mb-3">
              <label for="selectCapAyuda">Seleccionar Capacitación</label>
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
            <div class="modal-botones">
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
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .btn-primary {
      background: #2563eb;
      color: #ffffff;
      border-color: #1d4ed8;
    }
    .btn-primary:hover {
      background: #1d4ed8;
    }
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }
    .modal-card {
      background: #ffffff;
      border-radius: 8px;
      padding: 1.5rem;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
    }
    .modal-card h4 {
      margin: 0 0 0.5rem 0;
      font-size: 1.125rem;
      color: #0f172a;
    }
    .modal-card p {
      font-size: 0.875rem;
      color: #475569;
      margin: 0 0 1rem 0;
    }
    .modal-botones {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }
    .form-control {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.875rem;
      background-color: #ffffff;
    }
    .mb-3 {
      margin-bottom: 0.75rem;
    }
    .mb-4 {
      margin-bottom: 1rem;
    }
    .expediente-secciones-container {
      margin-top: 1rem;
    }
    .secciones-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      border-bottom: 2px solid #e2e8f0;
      margin-bottom: 1.25rem;
    }
    .tab-btn {
      padding: 0.6rem 1rem;
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
    .tab-btn:hover {
      color: #0f172a;
    }
    .tab-btn.active {
      color: #1e3a8a;
      border-bottom-color: #1e3a8a;
    }
    .tab-panel {
      padding: 0.5rem 0;
    }
    .subtitulo-seccion {
      font-size: 0.95rem;
      font-weight: 700;
      color: #334155;
      margin-bottom: 0.75rem;
    }
    .ficha-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }
    .card-dato {
      background: #f8fafc;
      padding: 0.75rem 1rem;
      border-radius: 0.375rem;
      border: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .col-span-2 {
      grid-column: span 2;
    }
    .label {
      font-size: 0.75rem;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
    }
    .valor {
      font-size: 0.9rem;
      color: #0f172a;
    }
    .texto-perfil {
      white-space: pre-line;
      margin: 0;
    }
    .items-lista {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .item-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.375rem;
      padding: 0.875rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .item-body {
      font-size: 0.85rem;
      color: #475569;
    }
    .item-meta {
      margin: 0;
    }
    .item-contacto {
      margin: 0.25rem 0 0 0;
      font-size: 0.8rem;
      color: #64748b;
    }
    .item-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.25rem;
    }
    .sin-respaldo {
      font-size: 0.75rem;
      color: #94a3b8;
      font-style: italic;
    }
    .empty-msg {
      padding: 1.5rem;
      text-align: center;
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
      padding: 0.35rem 0.75rem;
      border-radius: 0.375rem;
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s ease-in-out;
    }
    .btn-secondary {
      background: #f1f5f9;
      color: #334155;
      border-color: #cbd5e1;
    }
    .btn-secondary:hover {
      background: #e2e8f0;
    }
    .btn-warning {
      background: #fffbeb;
      color: #b45309;
      border-color: #fde68a;
    }
    .btn-warning:hover {
      background: #fef3c7;
    }
    .ml-2 {
      margin-left: 0.5rem;
    }
    .mt-4 {
      margin-top: 1rem;
    }
  `,
})
export class ExpedienteSeccionesComponent {
  readonly hojaDeVida = input.required<HojaDeVidaDto>();
  readonly observaciones = input<ObservacionDto[]>([]);
  readonly archivos = input<ArchivoDto[]>([]);
  readonly obligatorias = input<EstadoCapacitacionObligatoriaPersonaDto[]>([]);
  readonly puedeVincularPorAyuda = input<boolean>(true);

  readonly descargar = output<{ archivoId: string; nombreOriginal: string }>();
  readonly marcarItem = output<{ tipo: string; clave: string; label: string }>();
  readonly vincularPorAyuda = output<{ obligatoriaId: string; capacitacionId: string }>();

  readonly tabActiva = signal<TabExpediente>('ficha');
  readonly modalAyudaObligatoria = signal<EstadoCapacitacionObligatoriaPersonaDto | null>(null);
  readonly capacitacionAyudaSeleccionada = signal<string>('');

  readonly capacitacionesDisponibles = computed(() =>
    (this.hojaDeVida().capacitaciones || []).filter((c) => !c.capacitacionObligatoriaId),
  );

  cambiarTab(tab: TabExpediente): void {
    this.tabActiva.set(tab);
  }

  onDescargar(archivoId: string, nombreOriginal: string): void {
    this.descargar.emit({ archivoId, nombreOriginal });
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
