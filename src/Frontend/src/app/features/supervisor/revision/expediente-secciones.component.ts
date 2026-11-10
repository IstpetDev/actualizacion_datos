import { ObservacionesRevisionComponent } from '../../revision-compartida/observaciones-revision.component';
import { CommonModule } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ArchivoDto,
  EstadoCapacitacionObligatoriaPersonaDto,
  EstadoSubindiceSeccionPersonaDto,
  HojaDeVidaDto,
  ObservacionDto,
} from '../../../api-client';
import { nombreSubindicePorId } from '../../usuario/hoja-de-vida/componentes/bloque-subindices-seccion.component';

export type TabExpediente =
  'ficha' | 'formacion' | 'capacitaciones' | 'experiencia' | 'referencias' | 'documentos';

@Component({
  selector: 'app-expediente-secciones',
  standalone: true,
  imports: [CommonModule, FormsModule, ObservacionesRevisionComponent],
  template: `
    <div class="expediente-secciones-container" data-testid="expediente-secciones">
      <!-- Navegación de pestañas de secciones con Glassmorphism -->
      <nav class="secciones-tabs" role="tablist">
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
                <span class="label">Correo Personal:</span>
                <span class="valor" data-testid="expediente-correo-personal">{{
                  ficha.correoPersonal || '—'
                }}</span>
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
                  <div class="item-actions mt-2">
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      (click)="onPrevisualizar(ficha.fotoArchivoId, 'foto_perfil.jpg')"
                    >
                      <span class="material-symbols-outlined icon-sm">visibility</span>
                      <span>Previsualizar</span>
                    </button>
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      (click)="onDescargar(ficha.fotoArchivoId, 'foto_perfil.jpg')"
                      data-testid="btn-descargar-foto"
                    >
                      <span class="material-symbols-outlined icon-sm">download</span>
                      <span>Descargar Foto</span>
                    </button>
                    <button
                      type="button"
                      class="btn btn-danger btn-sm"
                      [disabled]="hojaDeVida().estadoActualizacion !== 'Enviado'"
                      (click)="onRetirarArchivo(ficha.fotoArchivoId, 'foto_perfil.jpg')"
                      data-testid="btn-retirar-foto"
                      title="Retirar fotografía de perfil del expediente"
                    >
                      <span class="material-symbols-outlined icon-sm">delete_sweep</span>
                      <span>Retirar foto</span>
                    </button>
                  </div>
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
          @if (subindicesActivosDe('formacion').length > 0) {
            <div class="items-lista mb-4" data-testid="subindices-revision-formacion">
              @for (sub of subindicesActivosDe('formacion'); track sub.id) {
                <div class="item-card">
                  <div class="item-header">
                    <strong>Subíndice: {{ sub.nombre }}</strong>
                    <span
                      class="badge"
                      [class.badge-success]="sub.estado === 'cargado'"
                      [class.badge-warning]="sub.estado !== 'cargado' && sub.esObligatorio"
                      [class.badge-secondary]="sub.estado !== 'cargado' && !sub.esObligatorio"
                    >
                      {{
                        sub.estado === 'cargado'
                          ? '✓ Cargado'
                          : sub.esObligatorio
                            ? '✕ Pendiente (Obligatorio)'
                            : 'Opcional sin carga'
                      }}
                    </span>
                  </div>
                </div>
              }
            </div>
          }
          <h4 class="subtitulo-seccion">Títulos Académicos Obtenidos</h4>
          <div class="items-lista">
            @for (t of hojaDeVida().titulos; track t.id) {
              <div class="item-card glass-card" [attr.data-testid]="'item-titulo-' + t.id">
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
                  <div class="item-title-row">
                    <span class="material-symbols-outlined icon-md text-primary">school</span>
                    <strong>{{ t.nombreTitulo }}</strong>
                  </div>
                  <div>
                    @if (nombreSubindice(t.subindiceSeccionId); as nomSub) {
                      <span class="badge badge-info">{{ nomSub }}</span>
                    }
                    @if (t.numeroRegistroSenescyt) {
                      <span class="badge badge-info ml-2"
                        >Senescyt: {{ t.numeroRegistroSenescyt }}</span
                      >
                    }
                  </div>
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
                      (click)="onPrevisualizar(t.archivoId, 'titulo_' + t.nombreTitulo + '.pdf')"
                    >
                      <span class="material-symbols-outlined icon-sm">visibility</span>
                      <span>Previsualizar</span>
                    </button>
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      (click)="onDescargar(t.archivoId, 'titulo_' + t.nombreTitulo + '.pdf')"
                      [attr.data-testid]="'btn-descargar-titulo-' + t.id"
                    >
                      <span class="material-symbols-outlined icon-sm">download</span>
                      <span>Descargar Respaldo</span>
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
                    <span class="material-symbols-outlined icon-xs">edit_note</span>
                    <span>Solicitar corrección</span>
                  </button>
                  @if (t.archivoId) {
                    <button
                      type="button"
                      class="btn btn-danger btn-sm"
                      [disabled]="hojaDeVida().estadoActualizacion !== 'Enviado'"
                      (click)="onRetirarArchivo(t.archivoId, 'titulo_' + t.nombreTitulo + '.pdf')"
                      [attr.data-testid]="'btn-retirar-titulo-' + t.id"
                      title="Retirar respaldo adjunto de este título"
                    >
                      <span class="material-symbols-outlined icon-sm">delete_sweep</span>
                      <span>Retirar documento</span>
                    </button>
                  }
                </div>
              </div>
            } @empty {
              <p class="text-muted empty-msg">No se registran títulos académicos obtenidos.</p>
            }
          </div>

          <h4 class="subtitulo-seccion mt-4">Estudios en Curso</h4>
          <div class="items-lista">
            @for (tc of hojaDeVida().titulosEnCurso; track tc.id) {
              <div
                class="item-card glass-card"
                [attr.data-testid]="'item-titulo-en-curso-' + tc.id"
              >
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
                  <div class="item-title-row">
                    <span class="material-symbols-outlined icon-md text-primary">auto_stories</span>
                    <strong>{{ tc.nombrePrograma }}</strong>
                  </div>
                  <div>
                    @if (nombreSubindice(tc.subindiceSeccionId); as nomSub) {
                      <span class="badge badge-info">{{ nomSub }}</span>
                    }
                    <span class="badge badge-warning ml-2">En curso</span>
                  </div>
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
                        onPrevisualizar(
                          tc.archivoId,
                          'estudio_en_curso_' + tc.nombrePrograma + '.pdf'
                        )
                      "
                    >
                      <span class="material-symbols-outlined icon-sm">visibility</span>
                      <span>Previsualizar</span>
                    </button>
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      (click)="
                        onDescargar(tc.archivoId, 'estudio_en_curso_' + tc.nombrePrograma + '.pdf')
                      "
                      [attr.data-testid]="'btn-descargar-titulo-en-curso-' + tc.id"
                    >
                      <span class="material-symbols-outlined icon-sm">download</span>
                      <span>Descargar Respaldo</span>
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
                    <span class="material-symbols-outlined icon-xs">edit_note</span>
                    <span>Solicitar corrección</span>
                  </button>
                  @if (tc.archivoId) {
                    <button
                      type="button"
                      class="btn btn-danger btn-sm"
                      [disabled]="hojaDeVida().estadoActualizacion !== 'Enviado'"
                      (click)="
                        onRetirarArchivo(
                          tc.archivoId,
                          'estudio_en_curso_' + tc.nombrePrograma + '.pdf'
                        )
                      "
                      [attr.data-testid]="'btn-retirar-titulo-en-curso-' + tc.id"
                      title="Retirar respaldo adjunto de este estudio en curso"
                    >
                      <span class="material-symbols-outlined icon-sm">delete_sweep</span>
                      <span>Retirar documento</span>
                    </button>
                  }
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
          @if (subindicesActivosDe('capacitaciones').length > 0) {
            <div class="items-lista mb-4" data-testid="subindices-revision-capacitaciones">
              @for (sub of subindicesActivosDe('capacitaciones'); track sub.id) {
                <div class="item-card">
                  <div class="item-header">
                    <strong>Subíndice: {{ sub.nombre }}</strong>
                    <span
                      class="badge"
                      [class.badge-success]="sub.estado === 'cargado'"
                      [class.badge-warning]="sub.estado !== 'cargado' && sub.esObligatorio"
                      [class.badge-secondary]="sub.estado !== 'cargado' && !sub.esObligatorio"
                    >
                      {{
                        sub.estado === 'cargado'
                          ? '✓ Cargado'
                          : sub.esObligatorio
                            ? '✕ Pendiente (Obligatorio)'
                            : 'Opcional sin carga'
                      }}
                    </span>
                  </div>
                </div>
              }
            </div>
          }
          @if (obligatorias().length > 0) {
            <h4 class="subtitulo-seccion">Obligatorias de la Institución</h4>
            <div class="items-lista mb-4" data-testid="lista-obligatorias-revision">
              @for (ob of obligatorias(); track ob.id) {
                <div class="item-card glass-card" [attr.data-testid]="'item-obligatoria-' + ob.id">
                  <app-observaciones-revision
                    [observaciones]="observaciones()"
                    [hojaDeVida]="hojaDeVida()"
                    [archivos]="archivos()"
                    [estado]="hojaDeVida().estadoActualizacion"
                    tipoDestino="capacitacion-obligatoria"
                    [claveDestino]="ob.id"
                  />
                  <div class="item-header">
                    <div class="item-title-row">
                      <span class="material-symbols-outlined icon-md text-amber"
                        >verified_user</span
                      >
                      <strong>{{ ob.nombre }}</strong>
                    </div>
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
                        <span class="material-symbols-outlined icon-xs">edit_note</span>
                        <span>Solicitar corrección</span>
                      </button>
                    } @else if (ob.estado === 'pendiente') {
                      <button
                        type="button"
                        class="btn btn-warning btn-sm"
                        [disabled]="hojaDeVida().estadoActualizacion !== 'Enviado'"
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
          }

          <h4 class="subtitulo-seccion mt-4">Capacitaciones Registradas</h4>
          <div class="items-lista">
            @for (c of hojaDeVida().capacitaciones; track c.id) {
              <div class="item-card glass-card" [attr.data-testid]="'item-capacitacion-' + c.id">
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
                  <div class="item-title-row">
                    <span class="material-symbols-outlined icon-md text-primary"
                      >workspace_premium</span
                    >
                    <strong>{{ c.nombreEvento }}</strong>
                  </div>
                  <div>
                    @if (nombreSubindice(c.subindiceSeccionId); as nomSub) {
                      <span class="badge badge-info">{{ nomSub }}</span>
                    }
                    <span class="badge badge-info ml-2">{{ c.numeroHoras || 0 }} horas</span>
                  </div>
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
                      (click)="
                        onPrevisualizar(c.archivoId, 'capacitacion_' + c.nombreEvento + '.pdf')
                      "
                    >
                      <span class="material-symbols-outlined icon-sm">visibility</span>
                      <span>Previsualizar</span>
                    </button>
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      (click)="onDescargar(c.archivoId, 'capacitacion_' + c.nombreEvento + '.pdf')"
                      [attr.data-testid]="'btn-descargar-capacitacion-' + c.id"
                    >
                      <span class="material-symbols-outlined icon-sm">download</span>
                      <span>Descargar Respaldo</span>
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
                    <span class="material-symbols-outlined icon-xs">edit_note</span>
                    <span>Solicitar corrección</span>
                  </button>
                  @if (c.archivoId) {
                    <button
                      type="button"
                      class="btn btn-danger btn-sm"
                      [disabled]="hojaDeVida().estadoActualizacion !== 'Enviado'"
                      (click)="
                        onRetirarArchivo(c.archivoId, 'capacitacion_' + c.nombreEvento + '.pdf')
                      "
                      [attr.data-testid]="'btn-retirar-capacitacion-' + c.id"
                      title="Retirar respaldo adjunto de esta capacitación"
                    >
                      <span class="material-symbols-outlined icon-sm">delete_sweep</span>
                      <span>Retirar documento</span>
                    </button>
                  }
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
          @if (subindicesActivosDe('experiencia').length > 0) {
            <div class="items-lista mb-4" data-testid="subindices-revision-experiencia">
              @for (sub of subindicesActivosDe('experiencia'); track sub.id) {
                <div class="item-card">
                  <div class="item-header">
                    <strong>Subíndice: {{ sub.nombre }}</strong>
                    <span
                      class="badge"
                      [class.badge-success]="sub.estado === 'cargado'"
                      [class.badge-warning]="sub.estado !== 'cargado' && sub.esObligatorio"
                      [class.badge-secondary]="sub.estado !== 'cargado' && !sub.esObligatorio"
                    >
                      {{
                        sub.estado === 'cargado'
                          ? '✓ Cargado'
                          : sub.esObligatorio
                            ? '✕ Pendiente (Obligatorio)'
                            : 'Opcional sin carga'
                      }}
                    </span>
                  </div>
                </div>
              }
            </div>
          }
          <div class="items-lista">
            @for (e of hojaDeVida().experiencias; track e.id) {
              <div class="item-card glass-card" [attr.data-testid]="'item-experiencia-' + e.id">
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
                  <div class="item-title-row">
                    <span class="material-symbols-outlined icon-md text-primary">work</span>
                    <strong>{{ e.cargo }}</strong>
                  </div>
                  <div>
                    @if (nombreSubindice(e.subindiceSeccionId); as nomSub) {
                      <span
                        class="badge badge-info"
                        [attr.data-testid]="'badge-subindice-exp-' + e.id"
                        >{{ nomSub }}</span
                      >
                    }
                    <span
                      class="badge ml-2"
                      [class.badge-success]="e.trabajaActualmente"
                      [class.badge-secondary]="!e.trabajaActualmente"
                    >
                      {{ e.trabajaActualmente ? 'Trabaja actualmente' : 'Finalizado' }}
                    </span>
                  </div>
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
                      (click)="onPrevisualizar(e.archivoId, 'experiencia_' + e.empleador + '.pdf')"
                    >
                      <span class="material-symbols-outlined icon-sm">visibility</span>
                      <span>Previsualizar</span>
                    </button>
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      (click)="onDescargar(e.archivoId, 'experiencia_' + e.empleador + '.pdf')"
                      [attr.data-testid]="'btn-descargar-experiencia-' + e.id"
                    >
                      <span class="material-symbols-outlined icon-sm">download</span>
                      <span>Descargar Respaldo</span>
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
                    <span class="material-symbols-outlined icon-xs">edit_note</span>
                    <span>Solicitar corrección</span>
                  </button>
                  @if (e.archivoId) {
                    <button
                      type="button"
                      class="btn btn-danger btn-sm"
                      [disabled]="hojaDeVida().estadoActualizacion !== 'Enviado'"
                      (click)="onRetirarArchivo(e.archivoId, 'experiencia_' + e.empleador + '.pdf')"
                      [attr.data-testid]="'btn-retirar-experiencia-' + e.id"
                      title="Retirar respaldo adjunto de esta experiencia laboral"
                    >
                      <span class="material-symbols-outlined icon-sm">delete_sweep</span>
                      <span>Retirar documento</span>
                    </button>
                  }
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
          @if (subindicesActivosDe('referencias').length > 0) {
            <div class="items-lista mb-4" data-testid="subindices-revision-referencias">
              @for (sub of subindicesActivosDe('referencias'); track sub.id) {
                <div class="item-card">
                  <div class="item-header">
                    <strong>Subíndice: {{ sub.nombre }}</strong>
                    <span
                      class="badge"
                      [class.badge-success]="sub.estado === 'cargado'"
                      [class.badge-warning]="sub.estado !== 'cargado' && sub.esObligatorio"
                      [class.badge-secondary]="sub.estado !== 'cargado' && !sub.esObligatorio"
                    >
                      {{
                        sub.estado === 'cargado'
                          ? '✓ Cargado'
                          : sub.esObligatorio
                            ? '✕ Pendiente (Obligatorio)'
                            : 'Opcional sin carga'
                      }}
                    </span>
                  </div>
                </div>
              }
            </div>
          }
          <div class="items-lista">
            @for (r of hojaDeVida().referencias; track r.id) {
              <div class="item-card glass-card" [attr.data-testid]="'item-referencia-' + r.id">
                <app-observaciones-revision
                  [observaciones]="observaciones()"
                  [hojaDeVida]="hojaDeVida()"
                  [archivos]="archivos()"
                  [estado]="hojaDeVida().estadoActualizacion"
                  tipoDestino="referencia"
                  [claveDestino]="r.id"
                />
                <div class="item-header">
                  <div class="item-title-row">
                    <span class="material-symbols-outlined icon-md text-primary">groups</span>
                    <strong>{{ r.nombresApellidos }}</strong>
                  </div>
                  <div>
                    @if (nombreSubindice(r.subindiceSeccionId); as nomSub) {
                      <span class="badge badge-info">{{ nomSub }}</span>
                    }
                    <span class="badge badge-info ml-2">{{ r.tipo }}</span>
                  </div>
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
                    <span class="material-symbols-outlined icon-xs">edit_note</span>
                    <span>Solicitar corrección</span>
                  </button>
                </div>
              </div>
            } @empty {
              <p class="text-muted empty-msg">
                No se registran referencias personales o profesionales.
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
              <div
                class="item-card glass-card archivo-item"
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
                <div class="item-header">
                  <div class="item-title-row">
                    <span class="material-symbols-outlined icon-md text-primary">description</span>
                    <strong>{{ arc.nombreOriginal }}</strong>
                  </div>
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
                    (click)="onPrevisualizar(arc.id, arc.nombreOriginal)"
                  >
                    <span class="material-symbols-outlined icon-sm">visibility</span>
                    <span>Previsualizar</span>
                  </button>
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    (click)="onDescargar(arc.id, arc.nombreOriginal)"
                    [attr.data-testid]="'btn-descargar-archivo-' + arc.id"
                  >
                    <span class="material-symbols-outlined icon-sm">download</span>
                    <span>Descargar</span>
                  </button>
                  <button
                    type="button"
                    class="btn btn-warning btn-sm"
                    [disabled]="hojaDeVida().estadoActualizacion !== 'Enviado'"
                    (click)="onMarcarItem('documento', arc.id, arc.nombreOriginal)"
                    [attr.data-testid]="'btn-marcar-documento-' + arc.id"
                  >
                    <span class="material-symbols-outlined icon-xs">edit_note</span>
                    <span>Solicitar corrección</span>
                  </button>
                  <button
                    type="button"
                    class="btn btn-danger btn-sm"
                    [disabled]="hojaDeVida().estadoActualizacion !== 'Enviado'"
                    (click)="onRetirarArchivo(arc.id, arc.nombreOriginal)"
                    [attr.data-testid]="'btn-retirar-' + arc.id"
                    title="Retirar archivo adjunto del expediente"
                  >
                    <span class="material-symbols-outlined icon-sm">delete_sweep</span>
                    <span>Retirar documento</span>
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

      <!-- Modal Centrado y Accesible de Vincular por Ayuda -->
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
                <span class="material-symbols-outlined icon-sm">check</span>
                <span>Confirmar Vínculo</span>
              </button>
            </footer>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .expediente-secciones-container {
      margin-top: 1rem;
    }
    .secciones-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      border-bottom: 2px solid rgba(226, 232, 240, 0.8);
      margin-bottom: 1.5rem;
      padding-bottom: 0.25rem;
    }
    .tab-btn {
      padding: 0.65rem 1.15rem;
      border: none;
      background: rgba(255, 255, 255, 0.6);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border-radius: var(--radius-sm, 8px) var(--radius-sm, 8px) 0 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      border-bottom: 3px solid transparent;
      margin-bottom: -0.25rem;
      transition: all var(--transition-fast, 180ms ease);
    }
    .tab-btn:hover {
      background: rgba(255, 255, 255, 0.95);
      color: #0f172a;
    }
    .tab-btn.active {
      color: #4338ca;
      background: #ffffff;
      border-bottom-color: #6366f1;
      box-shadow: 0 -2px 10px rgba(99, 102, 241, 0.1);
    }
    .tab-panel {
      padding: 0.5rem 0;
    }
    .subtitulo-seccion {
      font-size: 1rem;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 0.85rem;
    }
    .ficha-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }
    .card-dato {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      padding: 0.85rem 1.15rem;
      border-radius: var(--radius-sm, 8px);
      border: 1px solid rgba(226, 232, 240, 0.8);
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
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }
    .valor {
      font-size: 0.925rem;
      color: #0f172a;
    }
    .texto-perfil {
      white-space: pre-line;
      margin: 0;
    }
    .items-lista {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .item-card {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.8);
      border-radius: var(--radius-md, 12px);
      padding: 1.15rem 1.35rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03);
      transition: all var(--transition-fast, 180ms ease);
    }
    .item-card:hover {
      box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
      border-color: rgba(99, 102, 241, 0.3);
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .item-title-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .item-body {
      font-size: 0.875rem;
      color: #475569;
    }
    .item-meta {
      margin: 0;
    }
    .item-contacto {
      margin: 0.25rem 0 0 0;
      font-size: 0.8125rem;
      color: #64748b;
    }
    .item-actions {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      margin-top: 0.35rem;
      flex-wrap: wrap;
    }
    .sin-respaldo {
      font-size: 0.8125rem;
      color: #94a3b8;
      font-style: italic;
    }
    .empty-msg {
      padding: 2rem;
      text-align: center;
      color: #64748b;
    }
    .text-primary {
      color: #4338ca;
    }
    .text-amber {
      color: #d97706;
    }
    @media (max-width: 768px) {
      .ficha-grid {
        grid-template-columns: 1fr;
      }
      .col-span-2 {
        grid-column: span 1;
      }
      .secciones-tabs {
        flex-direction: column;
      }
      .tab-btn {
        width: 100%;
        border-radius: var(--radius-sm, 8px);
        border-bottom: none;
      }
      .tab-btn.active {
        border-left: 3px solid #6366f1;
      }
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
  readonly previsualizar = output<{ archivoId: string; nombreOriginal: string }>();
  readonly marcarItem = output<{ tipo: string; clave: string; label: string }>();
  readonly vincularPorAyuda = output<{ obligatoriaId: string; capacitacionId: string }>();
  readonly retirarArchivo = output<{ archivoId: string; nombreOriginal: string }>();

  readonly tabActiva = signal<TabExpediente>('ficha');
  readonly modalAyudaObligatoria = signal<EstadoCapacitacionObligatoriaPersonaDto | null>(null);
  readonly capacitacionAyudaSeleccionada = signal<string>('');

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
