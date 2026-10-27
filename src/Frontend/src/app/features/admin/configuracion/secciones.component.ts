import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import {
  CambiarEstadoSeccionRequest,
  ConfiguracionSeccionesClient,
  SeccionConfiguracionDto,
} from '../../../api-client';
import { mensajeError } from '../../../core/auth/mensaje-error';

@Component({
  selector: 'app-secciones-configuracion',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <section
      class="secciones-container"
      data-testid="secciones-configuracion-panel"
      aria-labelledby="titulo-secciones"
    >
      <header class="secciones-header">
        <div>
          <h2 id="titulo-secciones" class="secciones-title">Liberación de Secciones por Fases</h2>
          <p class="secciones-subtitle">
            Habilite o deshabilite las secciones de la hoja de vida para las personas de su
            institución. La ficha personal es obligatoria y permanece siempre abierta.
          </p>
        </div>
        <button
          type="button"
          class="btn btn-secondary"
          (click)="cargarSecciones()"
          [disabled]="cargando()"
          data-testid="btn-recargar-secciones"
        >
          {{ cargando() ? 'Cargando...' : 'Recargar' }}
        </button>
      </header>

      @if (error()) {
        <div class="alert alert-danger" role="alert" data-testid="error-secciones">
          {{ error() }}
        </div>
      }

      @if (mensajeExito()) {
        <div class="alert alert-success" role="alert" data-testid="exito-secciones">
          {{ mensajeExito() }}
        </div>
      }

      @if (cargando() && secciones().length === 0) {
        <p class="cargando-texto" role="status">Cargando secciones...</p>
      } @else {
        <div class="table-responsive">
          <table class="table-secciones" data-testid="tabla-secciones">
            <thead>
              <tr>
                <th scope="col">Sección</th>
                <th scope="col">Estado</th>
                <th scope="col">Avance (Completadas / Total)</th>
                <th scope="col">Última Modificación</th>
                <th scope="col">Acción</th>
              </tr>
            </thead>
            <tbody>
              @for (s of secciones(); track s.codigo) {
                <tr [attr.data-testid]="'fila-seccion-' + s.codigo">
                  <td class="td-nombre">
                    <strong>{{ s.nombre }}</strong>
                    <span class="codigo-seccion">({{ s.codigo }})</span>
                  </td>
                  <td>
                    <span
                      class="badge"
                      [class.badge-abierta]="s.habilitada"
                      [class.badge-cerrada]="!s.habilitada"
                      [attr.data-testid]="'badge-estado-' + s.codigo"
                    >
                      {{ s.habilitada ? 'Abierta' : 'Cerrada' }}
                    </span>
                  </td>
                  <td>
                    <div class="avance-info">
                      <span class="avance-texto" [attr.data-testid]="'avance-' + s.codigo">
                        {{ s.personasCompletas }} / {{ s.totalPersonas }} personas
                      </span>
                      <div
                        class="barra-progreso"
                        role="progressbar"
                        [attr.aria-valuenow]="calcularPorcentaje(s)"
                        aria-valuemin="0"
                        aria-valuemax="100"
                      >
                        <div class="progreso-fill" [style.width.%]="calcularPorcentaje(s)"></div>
                      </div>
                    </div>
                  </td>
                  <td class="td-meta">
                    @if (s.ultimaModificacionUtc) {
                      <span>{{ s.ultimaModificacionUtc | date: 'medium' }}</span>
                      @if (s.modificadoPor) {
                        <small class="meta-actor">por {{ s.modificadoPor }}</small>
                      }
                    } @else {
                      <span class="text-muted">—</span>
                    }
                  </td>
                  <td>
                    @if (s.codigo === 'ficha') {
                      <span class="texto-inmutable" title="La ficha personal no puede cerrarse">
                        Siempre abierta
                      </span>
                    } @else {
                      <button
                        type="button"
                        class="btn btn-sm"
                        [class.btn-cerrar]="s.habilitada"
                        [class.btn-abrir]="!s.habilitada"
                        [disabled]="cambiando() === s.codigo"
                        (click)="confirmarYCambiarEstado(s)"
                        [attr.data-testid]="'btn-toggle-' + s.codigo"
                      >
                        {{ s.habilitada ? 'Cerrar sección' : 'Abrir sección' }}
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
  styles: `
    .secciones-container {
      margin: 1.5rem 0;
      padding: 1.25rem;
      background: var(--geist-surface, #ffffff);
      border: 1px solid var(--geist-border, #eaeaea);
      border-radius: var(--radius-md, 8px);
      box-shadow: var(--geist-shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.05));
    }
    .secciones-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 1.25rem;
      border-bottom: 1px solid var(--geist-border, #eaeaea);
      padding-bottom: 0.75rem;
    }
    .secciones-title {
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0 0 0.25rem 0;
      color: var(--ammi-primary, #1d1e1c);
    }
    .secciones-subtitle {
      font-size: 0.875rem;
      color: var(--ammi-text-muted, #666666);
      margin: 0;
    }
    .table-responsive {
      overflow-x: auto;
    }
    .table-secciones {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
      text-align: left;
    }
    .table-secciones th,
    .table-secciones td {
      padding: 0.75rem 0.5rem;
      border-bottom: 1px solid var(--geist-border, #eaeaea);
      vertical-align: middle;
    }
    .table-secciones th {
      font-weight: 600;
      color: #555555;
      background: #fafafa;
    }
    .td-nombre strong {
      display: block;
      color: var(--ammi-primary, #1d1e1c);
    }
    .codigo-seccion {
      font-size: 0.75rem;
      color: #888888;
      font-family: monospace;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge-abierta {
      background: #dcfce7;
      color: #15803d;
    }
    .badge-cerrada {
      background: #f3f4f6;
      color: #4b5563;
    }
    .avance-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 140px;
    }
    .avance-texto {
      font-size: 0.8rem;
      font-weight: 500;
    }
    .barra-progreso {
      height: 6px;
      background: #e5e7eb;
      border-radius: 9999px;
      overflow: hidden;
    }
    .progreso-fill {
      height: 100%;
      background: var(--ammi-primary, #1d1e1c);
      transition: width 0.3s ease;
    }
    .td-meta {
      font-size: 0.8rem;
    }
    .meta-actor {
      display: block;
      color: #777777;
    }
    .texto-inmutable {
      font-size: 0.8rem;
      color: #888888;
      font-style: italic;
    }
    .btn {
      padding: 0.5rem 1rem;
      border-radius: var(--radius-sm, 6px);
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.2s;
    }
    .btn-sm {
      padding: 0.35rem 0.75rem;
      font-size: 0.8rem;
    }
    .btn-secondary {
      background: #f5f5f5;
      color: #333333;
      border-color: #d4d4d4;
    }
    .btn-secondary:hover:not(:disabled) {
      background: #e5e5e5;
    }
    .btn-abrir {
      background: var(--ammi-primary, #1d1e1c);
      color: #ffffff;
      border-color: var(--ammi-primary, #1d1e1c);
    }
    .btn-abrir:hover:not(:disabled) {
      background: #000000;
      color: var(--ammi-gold, #fcea1e);
    }
    .btn-cerrar {
      background: #ffffff;
      color: #dc2626;
      border-color: #fca5a5;
    }
    .btn-cerrar:hover:not(:disabled) {
      background: #fef2f2;
      border-color: #dc2626;
    }
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .alert {
      padding: 0.75rem 1rem;
      border-radius: var(--radius-sm, 6px);
      margin-bottom: 1rem;
      font-size: 0.875rem;
    }
    .alert-danger {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }
    .alert-success {
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
    }
    .cargando-texto {
      color: #666666;
      font-style: italic;
      text-align: center;
      padding: 1rem;
    }
  `,
})
export class SeccionesComponent implements OnInit {
  private readonly client = inject(ConfiguracionSeccionesClient);

  readonly secciones = signal<SeccionConfiguracionDto[]>([]);
  readonly cargando = signal<boolean>(false);
  readonly cambiando = signal<string | null>(null);
  readonly error = signal<string>('');
  readonly mensajeExito = signal<string>('');

  ngOnInit(): void {
    this.cargarSecciones();
  }

  cargarSecciones(): void {
    this.cargando.set(true);
    this.error.set('');
    this.client.listarSeccionesConfiguracion().subscribe({
      next: (data) => {
        this.secciones.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(mensajeError(err, 'No fue posible cargar las secciones.'));
        this.cargando.set(false);
      },
    });
  }

  confirmarYCambiarEstado(seccion: SeccionConfiguracionDto): void {
    if (seccion.codigo === 'ficha') {
      this.error.set('La ficha personal no puede cerrarse.');
      return;
    }

    const nuevoEstado = !seccion.habilitada;

    // Si se va a cerrar y hay personas con registros completos o datos cargados
    if (!nuevoEstado) {
      const tieneDatos = seccion.personasCompletas > 0;
      const aviso = tieneDatos
        ? `¿Está seguro de cerrar la sección "${seccion.nombre}"? Hay ${seccion.personasCompletas} persona(s) con esta sección completa. Sus datos se conservarán intactos, pero nadie podrá editar ni subir respaldos mientras esté cerrada.`
        : `¿Está seguro de cerrar la sección "${seccion.nombre}"? Nadie podrá ingresar datos en ella mientras esté cerrada.`;

      if (!confirm(aviso)) {
        return;
      }
    }

    this.cambiando.set(seccion.codigo);
    this.error.set('');
    this.mensajeExito.set('');

    const request: CambiarEstadoSeccionRequest = { habilitada: nuevoEstado };
    this.client.cambiarEstadoSeccion(seccion.codigo, request).subscribe({
      next: (actualizada) => {
        this.secciones.update((lista) =>
          lista.map((s) => (s.codigo === actualizada.codigo ? actualizada : s)),
        );
        this.mensajeExito.set(
          `La sección "${actualizada.nombre}" ahora está ${actualizada.habilitada ? 'abierta' : 'cerrada'}.`,
        );
        this.cambiando.set(null);
      },
      error: (err) => {
        this.error.set(mensajeError(err, 'No fue posible cambiar el estado de la sección.'));
        this.cambiando.set(null);
      },
    });
  }

  calcularPorcentaje(s: SeccionConfiguracionDto): number {
    if (!s.totalPersonas || s.totalPersonas === 0) return 0;
    return Math.min(100, Math.round((s.personasCompletas / s.totalPersonas) * 100));
  }
}
