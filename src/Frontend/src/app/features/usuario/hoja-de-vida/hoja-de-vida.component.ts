import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FaltanteEnvioDto } from '../../../api-client';
import { ModalFaltantesEnvioComponent } from './componentes/modal-faltantes-envio.component';
import { CapacitacionesComponent } from './secciones/capacitaciones/capacitaciones.component';
import { DocumentosPersonalesComponent } from './secciones/documentos-personales/documentos-personales.component';
import { ExperienciaLaboralComponent } from './secciones/experiencia-laboral/experiencia-laboral.component';
import { FichaPersonalComponent } from './secciones/ficha-personal/ficha-personal.component';
import { FormacionAcademicaComponent } from './secciones/formacion-academica/formacion-academica.component';
import { ReferenciasComponent } from './secciones/referencias/referencias.component';
import { HojaDeVidaStateService } from './servicios/hoja-de-vida-state.service';

export type TabSeccionHojaVida =
  'ficha' | 'formacion' | 'capacitaciones' | 'experiencia' | 'referencias' | 'documentos';

@Component({
  selector: 'app-hoja-de-vida',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    FichaPersonalComponent,
    FormacionAcademicaComponent,
    CapacitacionesComponent,
    ExperienciaLaboralComponent,
    ReferenciasComponent,
    DocumentosPersonalesComponent,
    ModalFaltantesEnvioComponent,
  ],
  template: `
    <div class="hoja-vida-container" data-testid="contenedor-hoja-de-vida">
      <!-- Encabezado Principal y Resumen -->
      <header class="hoja-vida-header">
        <div class="header-info">
          <p class="ceja">Expediente Digital del Funcionario</p>
          <h1 class="titulo-principal">Hoja de Vida</h1>
          <div class="meta-usuario">
            <span class="meta-item">
              <strong>Documento:</strong> {{ hojaDeVida()?.documento || '—' }}
            </span>
            <span class="meta-item">
              <strong>Estado:</strong>
              <span
                class="badge-estado"
                [class.badge-borrador]="hojaDeVida()?.estadoActualizacion === 'Borrador'"
                [class.badge-devuelto]="esDevuelto()"
                [class.badge-enviado]="hojaDeVida()?.estadoActualizacion === 'Enviado'"
                data-testid="estado-hoja-vida"
              >
                {{ hojaDeVida()?.estadoActualizacion || 'Borrador' }}
              </span>
            </span>
            @if (campanaActiva(); as campana) {
              <span class="meta-item meta-campana">
                <strong>Campaña:</strong> {{ campana.nombre }} (hasta
                {{ campana.fechaFinUtc | date: 'mediumDate' }})
              </span>
            }
          </div>
        </div>

        <!-- Botón de Envío Superior (siempre visible para comodidad) -->
        <div class="header-acciones">
          @if (puedeEditar()) {
            <button
              type="button"
              class="btn btn-primary"
              [disabled]="guardando() || cargando()"
              (click)="validarYEnviar()"
              data-testid="btn-enviar-revision-top"
            >
              {{ guardando() ? 'Validando...' : 'Enviar a Revisión' }}
            </button>
          }
        </div>
      </header>

      <!-- Banner de Notificación si la Hoja de Vida fue Devuelta (RF-HDV-011) -->
      @if (esDevuelto()) {
        <div class="banner-alerta banner-devuelto" data-testid="banner-devuelto" role="alert">
          <div class="banner-contenido">
            <h2 class="banner-titulo">Actualización Devuelta con Observaciones</h2>
            <p class="banner-desc">
              Su expediente fue revisado y devuelto por el supervisor con correcciones pendientes.
              Por favor revise las observaciones marcadas en cada sección y la indicación general a
              continuación:
            </p>
            @if (observacionGeneralDevolucion()) {
              <blockquote class="observacion-general-box">
                {{ observacionGeneralDevolucion() }}
              </blockquote>
            }
            @if (totalMarcas() > 0) {
              <p class="banner-conteo-marcas">
                Existen <strong>{{ totalMarcas() }}</strong> observaciones específicas señaladas en
                sus registros.
              </p>
            }
          </div>
        </div>
      }

      <!-- Banner Informativo si está en Modo Solo Lectura (RF-HDV-010) -->
      @if (!puedeEditar() && !esDevuelto() && !cargando()) {
        <div class="banner-alerta banner-lectura" data-testid="banner-solo-lectura" role="status">
          <p class="banner-desc">
            Su expediente se encuentra en <strong>solo lectura</strong> (Estado:
            {{ hojaDeVida()?.estadoActualizacion || 'Enviado' }}). No se permiten modificaciones
            mientras se encuentre en revisión o validado por la institución.
          </p>
        </div>
      }

      <!-- Mensajes de Carga o Error -->
      @if (cargando()) {
        <div class="cargando-box" role="status">
          <p>Cargando información completa de la hoja de vida...</p>
        </div>
      }

      @if (error()) {
        <div class="alert alert-danger" role="alert">
          {{ error() }}
        </div>
      }

      <!-- Navegación por Secciones Principales (Pestañas / Tabs) -->
      @if (!cargando() && hojaDeVida()) {
        <nav class="secciones-nav" role="tablist" aria-label="Secciones de Hoja de Vida">
          <button
            type="button"
            class="seccion-tab-btn"
            [class.active]="tabActiva() === 'ficha'"
            (click)="tabActiva.set('ficha')"
            data-testid="tab-ficha-personal"
          >
            <span class="tab-num">1</span>
            <span class="tab-texto">Ficha Personal</span>
          </button>

          <button
            type="button"
            class="seccion-tab-btn"
            [class.active]="tabActiva() === 'formacion'"
            (click)="tabActiva.set('formacion')"
            data-testid="tab-formacion-academica"
          >
            <span class="tab-num">2</span>
            <span class="tab-texto">Formación Académica</span>
            <span class="tab-badge">{{ titulos().length + titulosEnCurso().length }}</span>
          </button>

          <button
            type="button"
            class="seccion-tab-btn"
            [class.active]="tabActiva() === 'capacitaciones'"
            (click)="tabActiva.set('capacitaciones')"
            data-testid="tab-capacitaciones"
          >
            <span class="tab-num">3</span>
            <span class="tab-texto">Capacitaciones</span>
            <span class="tab-badge">{{ capacitaciones().length }}</span>
          </button>

          <button
            type="button"
            class="seccion-tab-btn"
            [class.active]="tabActiva() === 'experiencia'"
            (click)="tabActiva.set('experiencia')"
            data-testid="tab-experiencia-laboral"
          >
            <span class="tab-num">4</span>
            <span class="tab-texto">Experiencia Laboral</span>
            <span class="tab-badge">{{ experiencias().length }}</span>
          </button>

          <button
            type="button"
            class="seccion-tab-btn"
            [class.active]="tabActiva() === 'referencias'"
            (click)="tabActiva.set('referencias')"
            data-testid="tab-referencias"
          >
            <span class="tab-num">5</span>
            <span class="tab-texto">Referencias</span>
            <span class="tab-badge">{{ referencias().length }}</span>
          </button>

          <button
            type="button"
            class="seccion-tab-btn"
            [class.active]="tabActiva() === 'documentos'"
            (click)="tabActiva.set('documentos')"
            data-testid="tab-documentos-personales"
          >
            <span class="tab-num">6</span>
            <span class="tab-texto">Documentación</span>
            <span class="tab-badge">{{ documentosRequeridos().length }}</span>
          </button>
        </nav>

        <!-- Contenido Activo de la Sección Seleccionada -->
        <main class="seccion-activa-wrapper">
          @switch (tabActiva()) {
            @case ('ficha') {
              <app-ficha-personal></app-ficha-personal>
            }
            @case ('formacion') {
              <app-formacion-academica></app-formacion-academica>
            }
            @case ('capacitaciones') {
              <app-capacitaciones></app-capacitaciones>
            }
            @case ('experiencia') {
              <app-experiencia-laboral></app-experiencia-laboral>
            }
            @case ('referencias') {
              <app-referencias></app-referencias>
            }
            @case ('documentos') {
              <app-documentos-personales></app-documentos-personales>
            }
          }
        </main>

        <!-- Barra Inferior de Acción y Envío -->
        @if (puedeEditar()) {
          <footer class="hoja-vida-footer mt-4">
            <div class="footer-texto">
              <p class="m-0 text-sm text-muted">
                Asegúrese de haber completado sus datos y respaldos en cada pestaña antes de enviar
                su postulación/actualización.
              </p>
            </div>
            <div class="footer-acciones">
              <button
                type="button"
                class="btn btn-primary btn-lg"
                [disabled]="guardando()"
                (click)="validarYEnviar()"
                data-testid="btn-enviar-revision"
              >
                {{ guardando() ? 'Validando Requisitos...' : 'Validar y Enviar Hoja de Vida' }}
              </button>
            </div>
          </footer>
        }
      }

      <!-- Modal de Validación de Requisitos Faltantes (RF-HDV-009) -->
      <app-modal-faltantes-envio
        [abierto]="mostrarModalFaltantes()"
        [faltantes]="faltantes()"
        (cerrar)="mostrarModalFaltantes.set(false)"
      ></app-modal-faltantes-envio>
    </div>
  `,
  styles: [
    `
      .hoja-vida-container {
        max-width: 1100px;
        margin: 0 auto;
        padding: 1.5rem 1rem;
      }
      .hoja-vida-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1.5rem;
        margin-bottom: 1.5rem;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 1.25rem;
      }
      .ceja {
        font-size: 0.8125rem;
        font-weight: 700;
        color: #0284c7;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin: 0 0 0.25rem 0;
      }
      .titulo-principal {
        font-size: 1.75rem;
        font-weight: 800;
        color: #0f172a;
        margin: 0 0 0.5rem 0;
      }
      .meta-usuario {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        font-size: 0.875rem;
        color: #475569;
      }
      .badge-estado {
        display: inline-block;
        padding: 0.2rem 0.6rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
      }
      .badge-borrador {
        background: #f1f5f9;
        color: #475569;
      }
      .badge-devuelto {
        background: #fee2e2;
        color: #b91c1c;
      }
      .badge-enviado {
        background: #dbeafe;
        color: #1d4ed8;
      }
      .banner-alerta {
        border-radius: 8px;
        padding: 1rem 1.25rem;
        margin-bottom: 1.5rem;
      }
      .banner-devuelto {
        background: #fef2f2;
        border-left: 4px solid #ef4444;
      }
      .banner-lectura {
        background: #f8fafc;
        border-left: 4px solid #94a3b8;
      }
      .banner-titulo {
        font-size: 1rem;
        font-weight: 700;
        color: #991b1b;
        margin: 0 0 0.35rem 0;
      }
      .banner-desc {
        font-size: 0.875rem;
        color: #334155;
        margin: 0;
      }
      .observacion-general-box {
        background: #ffffff;
        border-left: 3px solid #dc2626;
        padding: 0.75rem 1rem;
        font-size: 0.875rem;
        font-style: italic;
        color: #1e293b;
        margin: 0.75rem 0;
        border-radius: 0 6px 6px 0;
      }
      .banner-conteo-marcas {
        font-size: 0.8125rem;
        color: #7f1d1d;
        margin: 0.5rem 0 0 0;
      }
      .secciones-nav {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
        border-bottom: 2px solid #e2e8f0;
        margin-bottom: 1.5rem;
      }
      .seccion-tab-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: transparent;
        border: none;
        padding: 0.75rem 1rem;
        font-size: 0.875rem;
        font-weight: 600;
        color: #64748b;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        margin-bottom: -2px;
        transition: all 0.15s ease-in-out;
      }
      .seccion-tab-btn:hover {
        color: #0f172a;
      }
      .seccion-tab-btn.active {
        color: #0284c7;
        border-bottom-color: #0284c7;
      }
      .tab-num {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1.35rem;
        height: 1.35rem;
        border-radius: 50%;
        background: #e2e8f0;
        color: #475569;
        font-size: 0.75rem;
        font-weight: 700;
      }
      .seccion-tab-btn.active .tab-num {
        background: #0284c7;
        color: #ffffff;
      }
      .tab-badge {
        background: #f1f5f9;
        color: #475569;
        padding: 0.125rem 0.4rem;
        border-radius: 9999px;
        font-size: 0.6875rem;
        font-weight: 700;
      }
      .seccion-tab-btn.active .tab-badge {
        background: #e0f2fe;
        color: #0284c7;
      }
      .seccion-activa-wrapper {
        min-height: 420px;
      }
      .hoja-vida-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1.5rem;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 1rem 1.25rem;
      }
      .btn {
        padding: 0.5rem 1rem;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        border: none;
        transition: background-color 0.15s ease;
      }
      .btn-primary {
        background: #0284c7;
        color: #ffffff;
      }
      .btn-primary:hover:not(:disabled) {
        background: #0369a1;
      }
      .btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .btn-lg {
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
      }
      .cargando-box {
        text-align: center;
        padding: 3rem 1rem;
        color: #64748b;
      }
      .alert-danger {
        background: #fee2e2;
        color: #991b1b;
        padding: 0.75rem 1rem;
        border-radius: 6px;
        margin-bottom: 1rem;
      }
      .mt-4 {
        margin-top: 1.5rem;
      }
      .m-0 {
        margin: 0;
      }
      .text-sm {
        font-size: 0.875rem;
      }
      .text-muted {
        color: #64748b;
      }
    `,
  ],
})
export class HojaDeVidaComponent implements OnInit {
  private readonly state = inject(HojaDeVidaStateService);

  readonly cargando = this.state.cargando;
  readonly guardando = this.state.guardando;
  readonly error = this.state.error;
  readonly hojaDeVida = this.state.hojaDeVida;
  readonly estadoEdicion = this.state.estadoEdicion;
  readonly puedeEditar = this.state.puedeEditar;
  readonly esDevuelto = this.state.esDevuelto;
  readonly observacionGeneralDevolucion = this.state.observacionGeneralDevolucion;
  readonly marcasObservacion = this.state.marcasObservacion;
  readonly faltantes = this.state.faltantes;

  readonly titulos = this.state.titulos;
  readonly titulosEnCurso = this.state.titulosEnCurso;
  readonly capacitaciones = this.state.capacitaciones;
  readonly experiencias = this.state.experiencias;
  readonly referencias = this.state.referencias;
  readonly documentosRequeridos = this.state.documentosRequeridos;

  readonly campanaActiva = computed(() => this.estadoEdicion()?.campanaActiva);
  readonly totalMarcas = computed(() => this.marcasObservacion().length);

  readonly tabActiva = signal<TabSeccionHojaVida>('ficha');
  readonly mostrarModalFaltantes = signal(false);

  ngOnInit(): void {
    this.state.cargarTodo().subscribe();
  }

  validarYEnviar(): void {
    this.state.obtenerFaltantes().subscribe({
      next: (faltantes: FaltanteEnvioDto[]) => {
        if (faltantes && faltantes.length > 0) {
          // RF-HDV-009: Mostrar modal con lista de faltantes y bloquear envío
          this.mostrarModalFaltantes.set(true);
        } else {
          // No hay faltantes: confirmar y enviar
          if (
            confirm(
              '¿Desea enviar su hoja de vida a revisión? Una vez enviada, el expediente quedará en solo lectura hasta su validación.',
            )
          ) {
            this.state.enviarRevision().subscribe();
          }
        }
      },
    });
  }
}
