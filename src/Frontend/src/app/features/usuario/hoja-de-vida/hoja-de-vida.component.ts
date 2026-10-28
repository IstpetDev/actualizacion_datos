import { ValidacionHojaDeVidaService } from './servicios/validacion-hoja-de-vida.service';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, effect, HostListener, inject, OnInit, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { ModalCambiosSinGuardarComponent } from './componentes/modal-cambios-sin-guardar.component';
import { MiCuentaBancariaComponent } from '../../cuenta-bancaria/mi-cuenta-bancaria.component';
import { API_BASE_URL, FaltanteEnvioDto } from '../../../api-client';
import { ModalFaltantesEnvioComponent } from './componentes/modal-faltantes-envio.component';
import { CapacitacionesComponent } from './secciones/capacitaciones/capacitaciones.component';
import { DocumentosPersonalesComponent } from './secciones/documentos-personales/documentos-personales.component';
import { ExperienciaLaboralComponent } from './secciones/experiencia-laboral/experiencia-laboral.component';
import { FichaPersonalComponent } from './secciones/ficha-personal/ficha-personal.component';
import { FormacionAcademicaComponent } from './secciones/formacion-academica/formacion-academica.component';
import { ReferenciasComponent } from './secciones/referencias/referencias.component';
import { HojaDeVidaStateService } from './servicios/hoja-de-vida-state.service';
import { descargarBlob, extraerNombreArchivo } from '../../../core/util/descarga-archivo.util';
import { mensajeError } from '../../../core/auth/mensaje-error';

export type TabSeccionHojaVida =
  'ficha' | 'formacion' | 'capacitaciones' | 'experiencia' | 'referencias' | 'documentos';

@Component({
  selector: 'app-hoja-de-vida',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    FichaPersonalComponent,
    MiCuentaBancariaComponent,
    FormacionAcademicaComponent,
    CapacitacionesComponent,
    ExperienciaLaboralComponent,
    ReferenciasComponent,
    DocumentosPersonalesComponent,
    ModalFaltantesEnvioComponent,
    ModalCambiosSinGuardarComponent,
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
          <button
            type="button"
            class="btn btn-secondary"
            (click)="descargarVistaPreviaPdf()"
            [disabled]="descargandoPdf() || cargando()"
            data-testid="btn-descargar-vista-previa-pdf"
          >
            {{ descargandoPdf() ? 'Generando PDF...' : 'Descargar vista previa (PDF)' }}
          </button>
          @if (puedeEditar()) {
            <button
              type="button"
              class="btn btn-primary"
              [disabled]="guardando() || cargando() || hayErrores()"
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

      @if (errorDescargaPdf()) {
        <div class="alert alert-danger" role="alert" data-testid="error-descarga-pdf">
          {{ errorDescargaPdf() }}
        </div>
      }

      <!-- Navegación por Secciones Principales (Pestañas / Tabs) -->
      @if (!cargando() && hojaDeVida()) {
        <nav class="secciones-nav" role="tablist" aria-label="Secciones de Hoja de Vida">
          @for (tab of tabsDisponibles(); track tab.id; let idx = $index) {
            <button
              type="button"
              class="seccion-tab-btn"
              [class.active]="tabActiva() === tab.id"
              (click)="intentarCambiarTab(tab.id)"
              [attr.data-testid]="tab.testId"
            >
              <span class="tab-num">{{ idx + 1 }}</span>
              <span class="tab-texto">{{ tab.texto }}</span>
              @if (tab.badge !== undefined) {
                <span class="tab-badge">{{ tab.badge }}</span>
              }
              @if (tabActiva() === tab.id && tieneCambios()) {
                <span
                  class="tab-punto-cambios"
                  title="Cambios sin guardar"
                  aria-label="Cambios sin guardar"
                  >•</span
                >
              }
            </button>
          }
        </nav>

        <!-- Contenido Activo de la Sección Seleccionada -->
        <main class="seccion-activa-wrapper">
          @switch (tabActiva()) {
            @case ('ficha') {
              <app-ficha-personal></app-ficha-personal>
              @if (esCuentaBancariaAbierta()) {
                <app-mi-cuenta-bancaria [editable]="puedeEditar()"></app-mi-cuenta-bancaria>
              }
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
                [disabled]="guardando() || hayErrores()"
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

      <!-- Modal de Advertencia por Cambios sin Guardar (Issue #90) -->
      <app-modal-cambios-sin-guardar
        [guardarDeshabilitado]="hayErrores()"
        [abierto]="mostrarModalCambios()"
        [guardando]="guardando()"
        [mensajeError]="errorCambios()"
        (guardarYContinuar)="onGuardarYContinuar()"
        (descartarYContinuar)="onDescartarYContinuar()"
        (quedarse)="onQuedarmeAqui()"
      ></app-modal-cambios-sin-guardar>
    </div>
  `,
  styles: [
    `
      .tab-punto-cambios {
        display: inline-block;
        font-size: 1.35rem;
        line-height: 1;
        color: #d97706;
        margin-left: 0.15rem;
        font-weight: 900;
        vertical-align: middle;
      }

      .hoja-vida-container {
        max-width: 1120px;
        margin: 0 auto;
        padding: 0.25rem 0;
      }
      .hoja-vida-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1.5rem;
        margin-bottom: 1.25rem;
        padding: 1.5rem;
        background: var(--geist-surface, #ffffff);
        border: 1px solid var(--geist-border, #eaeaea);
        border-top: 3px solid var(--ammi-gold, #fcea1e);
        border-radius: var(--radius-md, 8px);
        box-shadow: var(--geist-shadow-sm);
      }
      .ceja {
        display: inline-block;
        font-size: 0.72rem;
        font-weight: 700;
        color: #111111;
        background: var(--ammi-gold, #fcea1e);
        padding: 0.15rem 0.55rem;
        border-radius: 4px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin: 0 0 0.5rem 0;
      }
      .titulo-principal {
        font-size: 1.65rem;
        font-weight: 700;
        color: var(--ammi-primary, #1d1e1c);
        letter-spacing: -0.035em;
        margin: 0 0 0.4rem 0;
      }
      .meta-usuario {
        display: flex;
        flex-wrap: wrap;
        gap: 1.25rem;
        font-size: 0.85rem;
        color: var(--ammi-text-muted, #666666);
      }
      .badge-estado {
        display: inline-block;
        padding: 0.15rem 0.55rem;
        border-radius: 9999px;
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      .badge-borrador {
        background: #f5f5f5;
        color: #444444;
        border: 1px solid #eaeaea;
      }
      .badge-devuelto {
        background: #fef2f2;
        color: #dc2626;
        border: 1px solid #fecaca;
      }
      .badge-enviado {
        background: rgba(252, 234, 30, 0.25);
        color: #111111;
        border: 1px solid var(--ammi-gold-border, #e5d415);
      }
      .banner-alerta {
        border-radius: var(--radius-md, 8px);
        padding: 1rem 1.25rem;
        margin-bottom: 1.25rem;
        border: 1px solid var(--geist-border, #eaeaea);
      }
      .banner-devuelto {
        background: #fef2f2;
        border-color: #fecaca;
        border-left: 3px solid #dc2626;
      }
      .banner-lectura {
        background: #ffffff;
        border-left: 3px solid var(--ammi-primary, #1d1e1c);
      }
      .banner-titulo {
        font-size: 0.95rem;
        font-weight: 700;
        color: #991b1b;
        margin: 0 0 0.25rem 0;
      }
      .banner-desc {
        font-size: 0.85rem;
        color: #444444;
        margin: 0;
      }
      .observacion-general-box {
        background: #ffffff;
        border: 1px solid #fecaca;
        border-left: 3px solid #dc2626;
        padding: 0.65rem 0.9rem;
        font-size: 0.85rem;
        color: #171717;
        margin: 0.65rem 0;
        border-radius: 6px;
      }
      .banner-conteo-marcas {
        font-size: 0.8rem;
        color: #7f1d1d;
        margin: 0.4rem 0 0 0;
      }
      .secciones-nav {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;
        border-bottom: 1px solid var(--geist-border, #eaeaea);
        margin-bottom: 1.25rem;
        background: var(--geist-surface, #ffffff);
        padding: 0.35rem 0.5rem 0;
        border-radius: var(--radius-md, 8px) var(--radius-md, 8px) 0 0;
        border: 1px solid var(--geist-border, #eaeaea);
      }
      .seccion-tab-btn {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        background: transparent;
        border: none;
        padding: 0.65rem 0.85rem;
        font-size: 0.835rem;
        font-weight: 500;
        color: var(--ammi-text-muted, #666666);
        cursor: pointer;
        border-bottom: 2px solid transparent;
        margin-bottom: -1px;
        transition: all var(--transition-fast);
      }
      .seccion-tab-btn:hover {
        color: var(--ammi-primary, #1d1e1c);
      }
      .seccion-tab-btn.active {
        color: var(--ammi-primary, #1d1e1c);
        font-weight: 600;
        border-bottom-color: var(--ammi-primary, #1d1e1c);
      }
      .tab-num {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1.3rem;
        height: 1.3rem;
        border-radius: 50%;
        background: #f5f5f5;
        border: 1px solid #eaeaea;
        color: #666666;
        font-size: 0.72rem;
        font-weight: 700;
      }
      .seccion-tab-btn.active .tab-num {
        background: var(--ammi-gold, #fcea1e);
        border-color: var(--ammi-primary, #1d1e1c);
        color: #111111;
      }
      .tab-badge {
        background: #f5f5f5;
        color: #444444;
        border: 1px solid #eaeaea;
        padding: 0.1rem 0.4rem;
        border-radius: 9999px;
        font-size: 0.68rem;
        font-weight: 600;
      }
      .seccion-tab-btn.active .tab-badge {
        background: var(--ammi-primary, #1d1e1c);
        border-color: var(--ammi-primary, #1d1e1c);
        color: var(--ammi-gold, #fcea1e);
      }
      .seccion-activa-wrapper {
        min-height: 420px;
        background: var(--geist-surface, #ffffff);
        border: 1px solid var(--geist-border, #eaeaea);
        border-radius: var(--radius-md, 8px);
        padding: 1.5rem;
        box-shadow: var(--geist-shadow-sm);
      }
      .hoja-vida-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1.5rem;
        background: var(--geist-surface, #ffffff);
        border: 1px solid var(--geist-border, #eaeaea);
        border-radius: var(--radius-md, 8px);
        padding: 1rem 1.5rem;
        box-shadow: var(--geist-shadow-sm);
      }
      .btn {
        padding: 0.5rem 1rem;
        border-radius: var(--radius-sm, 6px);
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        border: 1px solid transparent;
        transition: all var(--transition-fast);
      }
      .btn-primary {
        background: var(--ammi-primary, #1d1e1c);
        color: #ffffff;
        border-color: var(--ammi-primary, #1d1e1c);
      }
      .btn-primary:hover:not(:disabled) {
        background: #000000;
        border-color: var(--ammi-gold, #fcea1e);
        color: var(--ammi-gold, #fcea1e);
        box-shadow: 0 0 0 1px var(--ammi-gold, #fcea1e);
      }
      .btn-primary:disabled {
        background: #f5f5f5;
        color: #999999;
        border-color: #eaeaea;
        cursor: not-allowed;
      }
      .btn-lg {
        padding: 0.65rem 1.25rem;
        font-size: 0.875rem;
      }
      .cargando-box {
        text-align: center;
        padding: 3rem 1rem;
        color: var(--ammi-text-subtle, #888888);
        background: #ffffff;
        border: 1px solid #eaeaea;
        border-radius: var(--radius-md, 8px);
      }
      .alert-danger {
        background: #fef2f2;
        color: #dc2626;
        padding: 0.75rem 1rem;
        border-radius: var(--radius-sm, 6px);
        border: 1px solid #fecaca;
        margin-bottom: 1rem;
      }
      .mt-4 {
        margin-top: 1.25rem;
      }
      .m-0 {
        margin: 0;
      }
      .text-sm {
        font-size: 0.85rem;
      }
      .text-muted {
        color: var(--ammi-text-muted, #666666);
      }
    `,
  ],
})
export class HojaDeVidaComponent implements OnInit {
  readonly validacion = inject(ValidacionHojaDeVidaService);
  private readonly state = inject(HojaDeVidaStateService);
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL, { optional: true }) ?? '';

  hayErrores(): boolean {
    return this.validacion.hayErrores(this.seccionesAbiertas());
  }

  constructor() {
    effect(() => {
      this.validacion.actualizarSeccionesAbiertas(this.seccionesAbiertas());
    });
  }

  readonly descargandoPdf = signal<boolean>(false);
  readonly errorDescargaPdf = signal<string | null>(null);

  readonly tieneCambios = this.state.tieneCambiosSinGuardarSignal ?? signal(false);
  readonly mostrarModalCambios = signal(false);
  readonly errorCambios = signal('');
  tabPendiente?: TabSeccionHojaVida;
  private resolverNavegacion?: (permitir: boolean) => void;

  intentarCambiarTab(nuevaTab: TabSeccionHojaVida): void {
    if (this.tabActiva() === nuevaTab) return;
    if (!this.tabsDisponibles().some((t) => t.id === nuevaTab)) return;
    if (this.state.tieneCambiosSinGuardar ? this.state.tieneCambiosSinGuardar() : false) {
      this.tabPendiente = nuevaTab;
      this.errorCambios.set('');
      this.mostrarModalCambios.set(true);
      return;
    }
    this.tabActiva.set(nuevaTab);
  }

  onGuardarYContinuar(): void {
    const seccion = this.state.seccionActiva ? this.state.seccionActiva() : null;
    if (!seccion) {
      this.completarNavegacionPendiente(true);
      return;
    }
    seccion.guardarCambios().subscribe({
      next: (exito) => {
        if (exito) {
          this.completarNavegacionPendiente(true);
        } else {
          this.errorCambios.set(
            'No fue posible guardar los cambios. Revise los campos obligatorios o la conexión.',
          );
        }
      },
      error: (err) => {
        this.errorCambios.set(err?.message || 'Error al guardar los cambios.');
      },
    });
  }

  onDescartarYContinuar(): void {
    const seccion = this.state.seccionActiva();
    if (seccion) {
      seccion.descartarCambios();
    }
    this.completarNavegacionPendiente(true);
  }

  onQuedarmeAqui(): void {
    this.mostrarModalCambios.set(false);
    this.tabPendiente = undefined;
    if (this.resolverNavegacion) {
      this.resolverNavegacion(false);
      this.resolverNavegacion = undefined;
    }
  }

  private completarNavegacionPendiente(permitir: boolean): void {
    this.mostrarModalCambios.set(false);
    if (permitir && this.tabPendiente) {
      this.tabActiva.set(this.tabPendiente);
      this.tabPendiente = undefined;
    }
    if (this.resolverNavegacion) {
      this.resolverNavegacion(permitir);
      this.resolverNavegacion = undefined;
    }
  }

  puedeDesactivar(): Observable<boolean> | boolean {
    if (!(this.state.tieneCambiosSinGuardar ? this.state.tieneCambiosSinGuardar() : false)) {
      return true;
    }
    this.errorCambios.set('');
    this.mostrarModalCambios.set(true);
    return new Observable<boolean>((observer) => {
      this.resolverNavegacion = (permitir: boolean) => {
        observer.next(permitir);
        observer.complete();
      };
    });
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.state.tieneCambiosSinGuardar()) {
      event.preventDefault();
      event.returnValue = true;
    }
  }

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

  readonly seccionesAbiertas = computed<string[]>(() => {
    return (
      this.hojaDeVida()?.seccionesAbiertas ?? [
        'ficha',
        'formacion',
        'capacitaciones',
        'experiencia',
        'referencias',
        'documentos',
        'cuenta-bancaria',
      ]
    );
  });

  readonly esCuentaBancariaAbierta = computed<boolean>(() => {
    return this.seccionesAbiertas().includes('cuenta-bancaria');
  });

  readonly tabsDisponibles = computed(() => {
    const abiertas = this.seccionesAbiertas();
    const defs = [
      {
        id: 'ficha' as TabSeccionHojaVida,
        codigo: 'ficha',
        texto: 'Ficha Personal',
        testId: 'tab-ficha-personal',
        badge: undefined as number | undefined,
      },
      {
        id: 'formacion' as TabSeccionHojaVida,
        codigo: 'formacion',
        texto: 'Formación Académica',
        testId: 'tab-formacion-academica',
        badge: this.titulos().length + this.titulosEnCurso().length,
      },
      {
        id: 'capacitaciones' as TabSeccionHojaVida,
        codigo: 'capacitaciones',
        texto: 'Capacitaciones',
        testId: 'tab-capacitaciones',
        badge: this.capacitaciones().length,
      },
      {
        id: 'experiencia' as TabSeccionHojaVida,
        codigo: 'experiencia',
        texto: 'Experiencia Laboral',
        testId: 'tab-experiencia-laboral',
        badge: this.experiencias().length,
      },
      {
        id: 'referencias' as TabSeccionHojaVida,
        codigo: 'referencias',
        texto: 'Referencias',
        testId: 'tab-referencias',
        badge: this.referencias().length,
      },
      {
        id: 'documentos' as TabSeccionHojaVida,
        codigo: 'documentos',
        texto: 'Documentación',
        testId: 'tab-documentos-personales',
        badge: this.documentosRequeridos().length,
      },
    ];
    return defs.filter((t) => abiertas.includes(t.codigo));
  });

  readonly tabActiva = signal<TabSeccionHojaVida>('ficha');
  readonly mostrarModalFaltantes = signal(false);

  ngOnInit(): void {
    this.state.cargarTodo().subscribe();
  }

  validarYEnviar(): void {
    if (this.hayErrores()) return;
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

  descargarVistaPreviaPdf(): void {
    if (this.descargandoPdf()) return;

    this.descargandoPdf.set(true);
    this.errorDescargaPdf.set(null);

    const url = `${this.baseUrl}/api/mis-datos/documento-hoja-de-vida`;
    this.http
      .get(url, {
        responseType: 'blob',
        observe: 'response',
      })
      .subscribe({
        next: (res) => {
          const blob = res.body;
          if (!blob) {
            this.errorDescargaPdf.set('No se recibió el documento PDF.');
            this.descargandoPdf.set(false);
            return;
          }
          const nombreArchivo =
            extraerNombreArchivo(res.headers.get('content-disposition')) || 'hoja-de-vida.pdf';
          descargarBlob(blob, nombreArchivo);
          this.descargandoPdf.set(false);
        },
        error: (err) => {
          this.errorDescargaPdf.set(mensajeError(err, 'Error al generar la vista previa en PDF.'));
          this.descargandoPdf.set(false);
        },
      });
  }
}
