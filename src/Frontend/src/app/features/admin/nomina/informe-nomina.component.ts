import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { ResultadoCargaPersonasDto } from '../../../api-client';

@Component({
  selector: 'app-informe-nomina',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (resultado(); as res) {
      <div class="informe-nomina-container" data-testid="informe-nomina">
        <header class="informe-header">
          <h3 class="informe-titulo">Informe del Proceso de Carga de Nómina</h3>
          <p class="informe-subtitulo">
            Resumen de filas procesadas, advertencias y rechazos. Los datos no incluyen información
            personal sensible.
          </p>
        </header>

        <!-- Tarjetas de Métricas -->
        <div class="metricas-grid">
          <div class="metrica-card" data-testid="metrica-recibidos">
            <span class="metrica-etiqueta">Total Recibidos</span>
            <span class="metrica-valor">{{ res.totalRecibidos }}</span>
          </div>

          <div class="metrica-card card-exito" data-testid="metrica-cargados">
            <span class="metrica-etiqueta">Nuevos Cargados</span>
            <span class="metrica-valor text-success">{{ res.totalCargados }}</span>
          </div>

          <div class="metrica-card card-aviso" data-testid="metrica-omitidos">
            <span class="metrica-etiqueta">Duplicados Omitidos</span>
            <span class="metrica-valor text-warning">{{ res.totalDuplicadosOmitidos }}</span>
          </div>

          @if (res.totalExistentesHabilitados) {
            <div class="metrica-card card-exito" data-testid="metrica-habilitados">
              <span class="metrica-etiqueta">Accesos Habilitados</span>
              <span class="metrica-valor text-success">{{ res.totalExistentesHabilitados }}</span>
            </div>
          }

          <div class="metrica-card card-error" data-testid="metrica-rechazados">
            <span class="metrica-etiqueta">Filas Rechazadas</span>
            <span class="metrica-valor text-danger">{{ res.totalRechazados }}</span>
          </div>
        </div>

        <!-- Tabla de Rechazos (si existen) -->
        @if (res.rechazos && res.rechazos.length > 0) {
          <div class="seccion-detalle rechazos-seccion" data-testid="seccion-rechazos">
            <h4 class="seccion-titulo text-danger">Filas Rechazadas ({{ res.rechazos.length }})</h4>
            <p class="seccion-desc">
              Solo un documento vacío, no numérico o con longitud distinta de 10 dígitos tras ajuste
              provoca el rechazo de la fila.
            </p>
            <div class="tabla-scroll">
              <table class="tabla-informe" data-testid="tabla-rechazos">
                <thead>
                  <tr>
                    <th>Fila</th>
                    <th>Documento (Últimos 4)</th>
                    <th>Motivo de Rechazo</th>
                  </tr>
                </thead>
                <tbody>
                  @for (rechazo of res.rechazos; track $index) {
                    <tr>
                      <td>
                        <strong>#{{ rechazo.fila }}</strong>
                      </td>
                      <td>
                        <code>{{
                          rechazo.documentoAnonimizado ? '***' + rechazo.documentoAnonimizado : '—'
                        }}</code>
                      </td>
                      <td class="text-danger">{{ rechazo.motivo }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- Tabla de Advertencias (si existen) -->
        @if (res.advertencias && res.advertencias.length > 0) {
          <div class="seccion-detalle advertencias-seccion" data-testid="seccion-advertencias">
            <h4 class="seccion-titulo text-warning">
              Advertencias de Columnas Opcionales ({{ res.advertencias.length }})
            </h4>
            <p class="seccion-desc">
              Los valores vacíos o no reconocidos se guardan en nulo como datos propuestos y no
              bloquean la carga.
            </p>
            <div class="tabla-scroll">
              <table class="tabla-informe" data-testid="tabla-advertencias">
                <thead>
                  <tr>
                    <th>Fila</th>
                    <th>Columna</th>
                    <th>Advertencia / Observación</th>
                  </tr>
                </thead>
                <tbody>
                  @for (adv of res.advertencias; track $index) {
                    <tr>
                      <td>
                        <strong>#{{ adv.fila }}</strong>
                      </td>
                      <td>
                        <span class="badge-columna">{{ adv.columna }}</span>
                      </td>
                      <td>{{ adv.motivo }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [
    `
      .informe-nomina-container {
        margin-top: 1.5rem;
        padding: 1.25rem;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
      }
      .informe-header {
        margin-bottom: 1rem;
      }
      .informe-titulo {
        font-size: 1.15rem;
        font-weight: 600;
        color: #1e293b;
        margin: 0 0 0.25rem 0;
      }
      .informe-subtitulo {
        font-size: 0.875rem;
        color: #64748b;
        margin: 0;
      }
      .metricas-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 0.75rem;
        margin-bottom: 1.25rem;
      }
      .metrica-card {
        background: #ffffff;
        padding: 0.75rem 1rem;
        border-radius: 6px;
        border: 1px solid #cbd5e1;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
      }
      .metrica-etiqueta {
        font-size: 0.75rem;
        color: #64748b;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.025em;
      }
      .metrica-valor {
        font-size: 1.5rem;
        font-weight: 700;
        line-height: 1.2;
        margin-top: 0.25rem;
      }
      .text-success {
        color: #16a34a;
      }
      .text-warning {
        color: #d97706;
      }
      .text-danger {
        color: #dc2626;
      }
      .seccion-detalle {
        margin-top: 1.25rem;
        padding-top: 1rem;
        border-top: 1px solid #e2e8f0;
      }
      .seccion-titulo {
        font-size: 0.95rem;
        font-weight: 600;
        margin: 0 0 0.25rem 0;
      }
      .seccion-desc {
        font-size: 0.8rem;
        color: #64748b;
        margin: 0 0 0.75rem 0;
      }
      .tabla-scroll {
        overflow-x: auto;
        max-height: 250px;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        background: #ffffff;
      }
      .tabla-informe {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8125rem;
        text-align: left;
      }
      .tabla-informe th {
        background: #f1f5f9;
        color: #475569;
        padding: 0.5rem 0.75rem;
        font-weight: 600;
        border-bottom: 1px solid #cbd5e1;
        position: sticky;
        top: 0;
      }
      .tabla-informe td {
        padding: 0.45rem 0.75rem;
        border-bottom: 1px solid #f1f5f9;
        color: #334155;
      }
      .tabla-informe tr:last-child td {
        border-bottom: none;
      }
      .badge-columna {
        display: inline-block;
        padding: 0.15rem 0.4rem;
        border-radius: 4px;
        font-size: 0.75rem;
        background: #fef3c7;
        color: #92400e;
        font-weight: 600;
      }
    `,
  ],
})
export class InformeNominaComponent {
  readonly resultado = input<ResultadoCargaPersonasDto | null>(null);
}
