import { ObservacionesRevisionComponent } from '../../revision-compartida/observaciones-revision.component';
import { ValidacionHojaDeVidaService } from './servicios/validacion-hoja-de-vida.service';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, effect, HostListener, inject, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
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
import { extraerNombreArchivo } from '../../../core/util/descarga-archivo.util';
import { mensajeError } from '../../../core/auth/mensaje-error';
import { AuthService } from '../../../core/auth';

export type TabSeccionHojaVida =
  'ficha' | 'formacion' | 'capacitaciones' | 'experiencia' | 'referencias' | 'documentos';

@Component({
  selector: 'app-hoja-de-vida',
  standalone: true,
  imports: [
    CommonModule,
    ObservacionesRevisionComponent,
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
      <!-- ==================== ENCABEZADO INSTITUCIONAL LUMINOSO & AMIGABLE ==================== -->
      <header class="hoja-vida-header-istpet mb-4">
        <div class="header-istpet-content">
          <!-- Sello Institucional ISTPET + Títulos -->
          <div class="header-identidad">
            <div class="sello-istpet-box">
              <span class="material-symbols-outlined icono-sello">shield_person</span>
            </div>
            <div class="header-textos">
              <div class="header-pills-row">
                <span class="badge-talento-humano">
                  <span class="material-symbols-outlined icon-xs">verified</span>
                  <span>Talento Humano</span>
                </span>
                @if (hojaDeVida()?.documento) {
                  <span class="badge-documento-hdv">
                    <span class="material-symbols-outlined icon-xs">badge</span>
                    <span>CI: {{ hojaDeVida()?.documento }}</span>
                  </span>
                }
              </div>
              <h1 class="titulo-principal">Actualización de Hoja de Vida</h1>
            </div>
          </div>

          <!-- Sincronización y Acciones Rápidas -->
          <div class="header-acciones-istpet">
            <div class="badge-borrador-seguro">
              <span class="material-symbols-outlined icon-xs text-success">check_circle</span>
              <span class="texto-borrador">Borrador seguro</span>
            </div>
            @if (puedeDescargarPdf()) {
              <button
                type="button"
                class="btn btn-secondary"
                (click)="descargarVistaPreviaPdf()"
                [disabled]="descargandoPdf() || cargando()"
                data-testid="btn-descargar-vista-previa-pdf"
              >
                {{ descargandoPdf() ? 'Generando PDF...' : 'Descargar PDF' }}
              </button>
            }
            @if (puedeEditar()) {
              <button
                type="button"
                class="btn btn-primary"
                [disabled]="guardando() || cargando() || validacion.hayErrores()"
                (click)="validarYEnviar()"
                data-testid="btn-enviar-revision-top"
              >
                {{ guardando() ? 'Validando...' : 'Enviar a Revisión' }}
              </button>
            }
          </div>
        </div>
      </header>

      <!-- ==================== BANNER DE UBICACIÓN INSTITUCIONAL Y ESTADO ==================== -->
      <div class="banner-expediente-istpet mb-4">
        <div class="banner-expediente-flex">
          <div class="avatar-expediente-box">
            @if (fotoUrl(); as url) {
              <img [src]="url" alt="Foto del Funcionario" class="avatar-funcionario-img" />
            } @else {
              <div class="avatar-funcionario-placeholder">
                <span class="iniciales-avatar">{{ inicialesFuncionario() }}</span>
              </div>
            }
          </div>
          <div class="expediente-textos">
            <div class="expediente-pills">
              <span class="pill-expediente-digital">
                <span class="material-symbols-outlined icon-xs">assignment_ind</span>
                <span>Expediente Digital del Funcionario</span>
              </span>
              <span
                class="badge-estado"
                [class.badge-borrador]="esBorrador()"
                [class.badge-devuelto]="esDevuelto()"
                [class.badge-enviado]="esEnviado()"
                data-testid="estado-hoja-vida"
              >
                Estado: {{ hojaDeVida()?.estadoActualizacion || 'Borrador' }}
              </span>
              @if (campanaActiva(); as campana) {
                <span class="pill-campana">
                  <span class="material-symbols-outlined icon-xs">campaign</span>
                  {{ campana.nombre }} (hasta {{ campana.fechaFinUtc | date: 'dd/MM/yyyy' }})
                </span>
              }
            </div>
            <h2 class="nombre-funcionario-hdv">
              {{ nombreFuncionario() }}
            </h2>
            <div class="detalles-sub-hdv">
              <span class="detalle-chip">
                <span class="material-symbols-outlined icon-xs">school</span>
                Personal Institucional ISTPET
              </span>
              @if (hojaDeVida()?.documento) {
                <span class="detalle-chip">
                  <span class="material-symbols-outlined icon-xs">fingerprint</span>
                  CI: {{ hojaDeVida()?.documento }}
                </span>
              }
              @if (hojaDeVida()?.ficha?.celular) {
                <span class="detalle-chip">
                  <span class="material-symbols-outlined icon-xs">phone_iphone</span>
                  {{ hojaDeVida()?.ficha?.celular }}
                </span>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- ==================== BANNER DE CORRECCIÓN SOLICITADA POR RRHH (RF-HDV-011) ==================== -->
      @if (esDevuelto()) {
        <div
          class="banner-alerta banner-devuelto-istpet mb-4"
          data-testid="banner-devuelto"
          role="alert"
        >
          <div class="icono-alerta-box">
            <span class="material-symbols-outlined">warning</span>
          </div>
          <div class="alerta-contenido-istpet">
            <div class="alerta-header-istpet">
              <h2 class="banner-titulo-istpet">Corrección Solicitada por Recursos Humanos</h2>
              <span class="badge-accion-requerida">Acción Requerida</span>
            </div>
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
                El historial contiene <strong>{{ totalMarcas() }}</strong> observaciones
                específicas.
              </p>
            }
          </div>
        </div>
      }

      <app-observaciones-revision
        [observaciones]="observaciones()"
        [hojaDeVida]="hojaDeVida()"
        [estado]="hojaDeVida()?.estadoActualizacion || ''"
      />

      <!-- Banner Informativo si está en Modo Solo Lectura (RF-HDV-010) -->
      @if (!puedeEditar() && !esDevuelto() && !cargando()) {
        <div
          class="banner-alerta banner-lectura mb-4"
          data-testid="banner-solo-lectura"
          role="status"
        >
          <div class="alerta-lectura-inner">
            <span class="material-symbols-outlined icono-info-lectura">info</span>
            <div class="alerta-lectura-textos">
              @if (esBorrador()) {
                <p class="banner-desc m-0">
                  No existe un período de campaña de actualización activo en la institución. Su
                  expediente se encuentra en <strong>modo consulta</strong>.
                </p>
              } @else {
                <p class="banner-desc m-0">
                  Su expediente se encuentra en <strong>solo lectura</strong> (Estado:
                  {{ hojaDeVida()?.estadoActualizacion || 'Enviado' }}). No se permiten
                  modificaciones mientras se encuentre en revisión o validado por la institución.
                </p>
              }
            </div>
          </div>
        </div>
      }

      <!-- Mensajes de Carga o Error -->
      @if (cargando()) {
        <div class="cargando-box mb-4" role="status">
          <p>Cargando información completa de la hoja de vida...</p>
        </div>
      }

      @if (error()) {
        <div class="alert alert-danger mb-4" role="alert">
          {{ error() }}
        </div>
      }

      @if (errorDescargaPdf()) {
        <div class="alert alert-danger mb-4" role="alert" data-testid="error-descarga-pdf">
          {{ errorDescargaPdf() }}
        </div>
      }

      <!-- ==================== NAVEGACIÓN STEPPER POR SECCIONES ==================== -->
      @if (!cargando() && hojaDeVida()) {
        <nav
          class="secciones-nav custom-stepper"
          role="tablist"
          aria-label="Secciones de Hoja de Vida"
        >
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
          @if (tabActiva() !== 'ficha') {
            <app-observaciones-revision
              [observaciones]="observaciones()"
              [hojaDeVida]="hojaDeVida()"
              [estado]="hojaDeVida()?.estadoActualizacion || ''"
              tipoDestino="seccion"
              [claveDestino]="tabActiva()"
            />
          }
          @switch (tabActiva()) {
            @case ('ficha') {
              <app-ficha-personal></app-ficha-personal>
              @if (esCuentaBancariaAbierta()) {
                <div class="cuenta-bancaria-wrapper-separador">
                  <app-mi-cuenta-bancaria [editable]="puedeEditar()"></app-mi-cuenta-bancaria>
                </div>
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

      <!-- Modal de Previsualización In-App del Documento PDF -->
      @if (mostrarModalPdf() && urlPdfPrevisualizacion()) {
        <div
          class="modal-overlay preview-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-preview-pdf"
        >
          <div class="modal-dialog preview-dialog">
            <header class="modal-header">
              <div class="preview-title-wrap">
                <span class="material-symbols-outlined icon-md text-primary">picture_as_pdf</span>
                <h3 id="titulo-preview-pdf" class="modal-title">
                  Vista Previa Oficial del Expediente (PDF)
                </h3>
              </div>
              <div class="preview-header-actions">
                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  (click)="descargarPdfCopia()"
                  title="Descargar copia del archivo a tu computadora"
                >
                  <span class="material-symbols-outlined icon-sm">download</span>
                  <span>Descargar Copia</span>
                </button>
                <button
                  type="button"
                  class="btn-close"
                  (click)="cerrarModalPdf()"
                  aria-label="Cerrar visor"
                >
                  ✕
                </button>
              </div>
            </header>
            <div class="modal-body preview-body">
              <iframe
                [src]="urlPdfPrevisualizacion()"
                class="preview-iframe"
                title="Visor de PDF Institucional"
              ></iframe>
            </div>
          </div>
        </div>
      }
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
        max-width: 1180px;
        margin: 0 auto;
        padding: 0.5rem 0.75rem;
      }

      .cuenta-bancaria-wrapper-separador {
        margin-top: 2.5rem;
        padding-top: 2rem;
        border-top: 1px dashed #cbd5e1;
      }

      /* Encabezado Institucional Luminoso (Estilo public-updater ISTPET) */
      .hoja-vida-header-istpet,
      .hoja-vida-header {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-top: 3.5px solid #c4a857;
        border-radius: 20px;
        padding: 1.25rem 1.5rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        margin-bottom: 1rem;
      }
      .header-istpet-content {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        gap: 1.25rem;
        flex-wrap: wrap;
      }
      .header-identidad {
        display: flex;
        align-items: center;
        gap: 1rem;
        flex: 1;
        min-width: 280px;
      }
      .sello-istpet-box {
        width: 52px;
        height: 52px;
        border-radius: 14px;
        background: #f8fafc;
        border: 1.5px solid #e2e8f0;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
      }
      .icono-sello {
        font-size: 28px !important;
        color: #222c57;
      }
      .header-textos {
        flex: 1;
        min-width: 0;
      }
      .header-pills-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-bottom: 0.25rem;
      }
      .badge-talento-humano {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.15rem 0.65rem;
        background: rgba(34, 44, 87, 0.08);
        color: #222c57;
        font-size: 0.6875rem;
        font-weight: 700;
        border-radius: 9999px;
        border: 1px solid rgba(34, 44, 87, 0.18);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .badge-documento-hdv {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.15rem 0.65rem;
        background: #f1f5f9;
        color: #475569;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.72rem;
        font-weight: 700;
        border-radius: 9999px;
        border: 1px solid #cbd5e1;
      }
      .titulo-principal {
        font-family: var(--font-display, 'Outfit', sans-serif);
        font-size: 1.45rem;
        font-weight: 800;
        color: #0f172a;
        letter-spacing: -0.025em;
        margin: 0 0 0.15rem 0;
        line-height: 1.2;
      }
      .subtitulo-institucional {
        font-size: 0.75rem;
        color: #64748b;
        margin: 0;
      }
      .header-acciones-istpet {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
      }
      .badge-borrador-seguro {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.75rem;
        color: #64748b;
        background: #f8fafc;
        padding: 0.35rem 0.75rem;
        border-radius: 10px;
        border: 1px solid #e2e8f0;
      }
      .text-success {
        color: #16a34a !important;
      }
      .texto-borrador {
        font-weight: 600;
        font-size: 0.75rem;
      }

      /* Banner de Expediente y Estado */
      .banner-expediente-istpet {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 1rem 1.25rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      }
      .banner-expediente-flex {
        display: flex;
        align-items: center;
        gap: 1.25rem;
        flex-wrap: wrap;
      }
      .avatar-expediente-box {
        width: 58px;
        height: 58px;
        border-radius: 14px;
        background: #f1f5f9;
        border: 2px solid #c4a857;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        flex-shrink: 0;
        box-shadow: 0 2px 8px rgba(34, 44, 87, 0.1);
      }
      .avatar-funcionario-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .avatar-funcionario-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #222c57 0%, #1a2244 100%);
        color: #ffffff;
        font-weight: 800;
        font-size: 1.15rem;
        letter-spacing: 0.05em;
      }
      .detalles-sub-hdv {
        display: flex;
        align-items: center;
        gap: 0.85rem;
        flex-wrap: wrap;
        margin-top: 0.3rem;
      }
      .detalle-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.75rem;
        color: #64748b;
        font-weight: 500;
      }
      .alerta-lectura-inner {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .icono-info-lectura {
        font-size: 24px;
        color: #0284c7;
        flex-shrink: 0;
      }
      .alerta-lectura-textos {
        flex: 1;
      }
      .m-0 {
        margin: 0 !important;
      }
      .expediente-textos {
        flex: 1;
        min-width: 240px;
      }
      .expediente-pills {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-bottom: 0.25rem;
      }
      .pill-expediente-digital {
        font-size: 0.6875rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #222c57;
        background: rgba(34, 44, 87, 0.08);
        padding: 0.15rem 0.65rem;
        border-radius: 9999px;
        border: 1px solid rgba(34, 44, 87, 0.15);
      }
      .pill-campana {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.15rem 0.65rem;
        border-radius: 9999px;
        font-size: 0.6875rem;
        font-weight: 700;
        background: #f1f5f9;
        color: #334155;
        border: 1px solid #cbd5e1;
      }
      .nombre-funcionario-hdv {
        font-size: 1.05rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0;
      }

      /* Banner de Corrección Solicitada por RRHH */
      .banner-devuelto-istpet {
        background: #fffbeb !important;
        border: 2px solid #f59e0b !important;
        border-radius: 16px;
        padding: 1.15rem 1.25rem;
        display: flex;
        align-items: flex-start;
        gap: 1rem;
      }
      .icono-alerta-box {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        background: #f59e0b;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        flex-shrink: 0;
      }
      .alerta-contenido-istpet {
        flex: 1;
        min-width: 0;
      }
      .alerta-header-istpet {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
        margin-bottom: 0.4rem;
      }
      .banner-titulo-istpet {
        font-size: 0.95rem;
        font-weight: 800;
        color: #78350f;
        margin: 0;
      }
      .badge-accion-requerida {
        padding: 0.15rem 0.55rem;
        border-radius: 9999px;
        font-size: 0.65rem;
        font-weight: 800;
        background: #fde68a;
        color: #78350f;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .observacion-general-box {
        background: #ffffff;
        border: 1.5px solid #fde68a;
        border-left: 4px solid #f59e0b;
        padding: 0.75rem 1rem;
        font-size: 0.85rem;
        color: #451a03;
        margin: 0.65rem 0;
        border-radius: 10px;
        line-height: 1.4;
      }
      .banner-conteo-marcas {
        font-size: 0.8125rem;
        color: #92400e;
        margin: 0.4rem 0 0 0;
      }

      /* Clases de compatibilidad */
      .ceja {
        display: inline-block;
        font-size: 0.72rem;
        font-weight: 800;
        color: #222c57;
        background: rgba(34, 44, 87, 0.08);
        border: 1px solid rgba(34, 44, 87, 0.18);
        padding: 0.2rem 0.65rem;
        border-radius: 9999px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin: 0 0 0.5rem 0;
      }
      .meta-usuario {
        display: flex;
        flex-wrap: wrap;
        gap: 1.25rem;
        font-size: 0.85rem;
        color: #64748b;
      }
      .badge-estado {
        display: inline-block;
        padding: 0.2rem 0.65rem;
        border-radius: 9999px;
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      .badge-borrador {
        background: #f1f5f9;
        color: #475569;
        border: 1px solid #cbd5e1;
      }
      .badge-devuelto {
        background: #fef2f2;
        color: #dc2626;
        border: 1px solid #fecaca;
      }
      .badge-enviado {
        background: rgba(196, 168, 87, 0.18);
        color: #8d7936;
        border: 1px solid #c4a857;
      }
      .banner-alerta {
        border-radius: 14px;
        padding: 1rem 1.25rem;
        margin-bottom: 1.25rem;
        border: 1px solid #e2e8f0;
      }
      .banner-devuelto {
        background: #fffbeb;
        border-color: #fde68a;
        border-left: 4px solid #f59e0b;
      }
      .banner-lectura {
        background: #ffffff;
        border-left: 4px solid #222c57;
      }
      .banner-titulo {
        font-size: 0.95rem;
        font-weight: 700;
        color: #78350f;
        margin: 0 0 0.25rem 0;
      }
      .banner-desc {
        font-size: 0.85rem;
        color: #444444;
        margin: 0;
      }
      .icon-xs {
        font-size: 0.875rem !important;
      }

      /* Stepper Táctil Institucional (Estilo public-updater custom-stepper) */
      .secciones-nav {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-bottom: 1.25rem;
        background: transparent;
        padding: 0;
        border: none;
      }
      .seccion-tab-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
        background: #ffffff;
        border: 1.5px solid #cbd5e1;
        border-radius: 12px;
        padding: 0.6rem 1rem;
        font-size: 0.875rem;
        font-weight: 600;
        color: #475569;
        cursor: pointer;
        min-height: 44px;
        transition: all var(--transition-fast);
      }
      .seccion-tab-btn:hover {
        background: #f8fafc;
        border-color: #222c57;
        color: #222c57;
      }
      .seccion-tab-btn.active {
        background: #222c57 !important;
        border-color: #222c57 !important;
        border-bottom: 3.5px solid #c4a857 !important;
        color: #ffffff !important;
        box-shadow: 0 4px 12px rgba(34, 44, 87, 0.25);
        font-weight: 700;
      }
      .tab-num {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.6rem;
        height: 1.6rem;
        border-radius: 8px;
        background: #f1f5f9;
        border: 1.5px solid #cbd5e1;
        color: #475569;
        font-size: 0.75rem;
        font-weight: 700;
      }
      .seccion-tab-btn.active .tab-num {
        background: #c4a857;
        border-color: #c4a857;
        color: #0f172a;
        font-weight: 800;
      }
      .tab-badge {
        background: #e2e8f0;
        color: #334155;
        padding: 0.15rem 0.5rem;
        border-radius: 9999px;
        font-size: 0.72rem;
        font-weight: 700;
      }
      .seccion-tab-btn.active .tab-badge {
        background: rgba(255, 255, 255, 0.2);
        color: #ffffff;
      }
      .seccion-activa-wrapper {
        min-height: 420px;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 18px;
        padding: 1.75rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      }
      .hoja-vida-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1.5rem;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        padding: 1.25rem 1.5rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      }
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.55rem 1.15rem;
        border-radius: 12px;
        font-size: 0.875rem;
        font-weight: 700;
        cursor: pointer;
        min-height: 42px;
        border: 1.5px solid transparent;
        transition: all var(--transition-fast);
      }
      .btn-primary {
        background: #222c57;
        color: #ffffff;
        border-color: #222c57;
      }
      .btn-primary:hover:not(:disabled) {
        background: #1a2244;
        border-color: #1a2244;
        transform: translateY(-1px);
        box-shadow: 0 4px 10px rgba(34, 44, 87, 0.25);
      }
      .btn-primary:disabled {
        background: #f1f5f9;
        color: #94a3b8;
        border-color: #e2e8f0;
        cursor: not-allowed;
      }
      .btn-secondary {
        background: #f8fafc;
        color: #334155;
        border-color: #cbd5e1;
      }
      .btn-secondary:hover:not(:disabled) {
        background: #f1f5f9;
        border-color: #94a3b8;
        color: #0f172a;
      }
      .btn-lg {
        padding: 0.7rem 1.4rem;
        font-size: 0.9375rem;
        min-height: 46px;
      }
      .cargando-box {
        text-align: center;
        padding: 3rem 1rem;
        color: #64748b;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
      }
      .alert-danger {
        background: #fef2f2;
        color: #dc2626;
        padding: 0.75rem 1rem;
        border-radius: 12px;
        border: 1px solid #fecaca;
        margin-bottom: 1rem;
      }
      .mt-4 {
        margin-top: 1.25rem;
      }
      .mb-4 {
        margin-bottom: 1.25rem;
      }
      .m-0 {
        margin: 0;
      }
      .text-sm {
        font-size: 0.85rem;
      }
      .text-muted {
        color: #64748b;
      }
      /* Visor Modal de PDF In-App */
      .modal-overlay.preview-overlay {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.78);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1050;
        padding: 1rem;
      }
      .modal-dialog.preview-dialog {
        background: #ffffff;
        border-radius: 20px;
        width: 100%;
        max-width: 980px;
        height: 90vh;
        max-height: 920px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
        overflow: hidden;
        border: 1.5px solid #cbd5e1;
      }
      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem 1.5rem;
        background: #ffffff;
        border-bottom: 1.5px solid #e2e8f0;
      }
      .preview-title-wrap {
        display: flex;
        align-items: center;
        gap: 0.65rem;
      }
      .modal-title {
        font-size: 1.05rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0;
      }
      .preview-header-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .btn-close {
        background: none;
        border: none;
        font-size: 1.25rem;
        color: #64748b;
        cursor: pointer;
        padding: 0.25rem 0.5rem;
        border-radius: 8px;
        line-height: 1;
        transition: all 0.15s ease;
      }
      .btn-close:hover {
        background: #f1f5f9;
        color: #0f172a;
      }
      .preview-body {
        flex: 1;
        padding: 0;
        background: #1e293b;
        overflow: hidden;
      }
      .preview-iframe {
        width: 100%;
        height: 100%;
        border: none;
        display: block;
      }
    `,
  ],
})
export class HojaDeVidaComponent implements OnInit {
  readonly validacion = inject(ValidacionHojaDeVidaService);
  private readonly state = inject(HojaDeVidaStateService);
  private readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL, { optional: true }) ?? '';

  private readonly sanitizer = inject(DomSanitizer);

  readonly puedeDescargarPdf = computed(() => {
    return this.authService.tieneRol(['supervisor', 'admin', 'superadmin']);
  });

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
  readonly urlPdfPrevisualizacion = signal<SafeResourceUrl | null>(null);
  readonly blobUrlPdf = signal<string | null>(null);
  readonly mostrarModalPdf = signal<boolean>(false);
  private nombreArchivoPdf = 'hoja-de-vida.pdf';

  readonly nombreFuncionario = computed(() => {
    const f = this.hojaDeVida()?.ficha;
    if (f) {
      const parts = [f.primerNombre, f.segundoNombre, f.primerApellido, f.segundoApellido]
        .map((p) => (p ?? '').trim())
        .filter((p) => p.length > 0);
      if (parts.length > 0) {
        return parts.join(' ');
      }
    }
    const sesionNom =
      typeof this.authService?.sesion === 'function'
        ? this.authService.sesion()?.nombre
        : undefined;
    if (sesionNom && sesionNom !== 'Usuario') return sesionNom;
    return 'Funcionario Institucional';
  });

  readonly inicialesFuncionario = computed(() => {
    const nom = this.nombreFuncionario();
    if (!nom || nom === 'Funcionario Institucional') return 'IST';
    const partes = nom.split(' ').filter(Boolean);
    if (partes.length >= 2) {
      return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return nom.substring(0, 2).toUpperCase();
  });

  readonly fotoUrl = computed(() => {
    const fotoId = this.hojaDeVida()?.ficha?.fotoArchivoId;
    if (!fotoId) return null;
    return `${this.baseUrl}/api/archivos/${encodeURIComponent(fotoId)}/descargar`;
  });

  readonly esBorrador = computed(
    () => (this.hojaDeVida()?.estadoActualizacion ?? '').toLowerCase() === 'borrador',
  );

  readonly esEnviado = computed(
    () => (this.hojaDeVida()?.estadoActualizacion ?? '').toLowerCase() === 'enviado',
  );

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
  readonly observaciones = this.state.observaciones;
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
    if (!this.puedeDescargarPdf()) {
      this.errorDescargaPdf.set('No tiene permisos para descargar el documento de hoja de vida.');
      return;
    }

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
          this.nombreArchivoPdf =
            extraerNombreArchivo(res.headers.get('content-disposition')) ||
            `hoja-de-vida-${this.hojaDeVida()?.documento || 'expediente'}.pdf`;

          if (this.blobUrlPdf()) {
            window.URL.revokeObjectURL(this.blobUrlPdf()!);
          }
          const blobUrl = window.URL.createObjectURL(blob);
          const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);
          this.blobUrlPdf.set(blobUrl);
          this.urlPdfPrevisualizacion.set(safeUrl);
          this.mostrarModalPdf.set(true);
          this.descargandoPdf.set(false);
        },
        error: (err) => {
          this.errorDescargaPdf.set(mensajeError(err, 'Error al generar la vista previa en PDF.'));
          this.descargandoPdf.set(false);
        },
      });
  }

  cerrarModalPdf(): void {
    if (this.blobUrlPdf()) {
      window.URL.revokeObjectURL(this.blobUrlPdf()!);
      this.blobUrlPdf.set(null);
    }
    this.urlPdfPrevisualizacion.set(null);
    this.mostrarModalPdf.set(false);
  }

  descargarPdfCopia(): void {
    if (this.blobUrlPdf()) {
      const a = document.createElement('a');
      a.href = this.blobUrlPdf()!;
      a.download = this.nombreArchivoPdf;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }
}
