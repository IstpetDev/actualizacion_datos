import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { CuentaBancariaDto, EstadoCuentaPersonaDto, RevisionClient } from '../../api-client';
import { mensajeError } from '../../core/auth/mensaje-error';
import { nuloSiNoHayContenido, textoEstadoCuenta } from './cuenta-bancaria';

// RF-HDV-027 (ADR-0013 dec. 4): supervisor y admin ven si la cuenta coincide con la nómina, con los
// últimos cuatro dígitos; nunca el número completo.
@Component({
  selector: 'app-estado-cuentas-bancarias',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="tarjeta-cuentas" aria-labelledby="titulo-estado-cuentas">
      <!-- Encabezado Institucional -->
      <div class="encabezado-cuentas">
        <div class="titulos-cuentas">
          <div class="header-pill">
            <span class="material-symbols-outlined icon-xs">account_balance</span>
            <span>Talento Humano & Tesorería</span>
          </div>
          <h2 id="titulo-estado-cuentas" class="titulo-cuentas">Cuentas Bancarias</h2>
          <p class="subtitulo-cuentas">
            Monitoreo y cotejo de cuentas bancarias frente a la nómina institucional cargada.
          </p>
        </div>
        <button
          type="button"
          class="btn-refrescar"
          (click)="cargar()"
          [disabled]="cargando()"
          data-testid="btn-refrescar-cuentas"
        >
          <span class="material-symbols-outlined icon-sm">refresh</span>
          <span>{{ cargando() ? 'Actualizando…' : 'Actualizar' }}</span>
        </button>
      </div>

      @if (error()) {
        <div class="alerta alerta-error" role="alert">
          <span>{{ error() }}</span>
        </div>
      }

      @if (cargando()) {
        <div class="estado-cargando" role="status">
          <p>Cargando cuentas…</p>
        </div>
      } @else if (!estados().length) {
        <div class="estado-vacio" data-testid="estado-cuentas-vacio">
          <p>No hay personas registradas en la institución o la nómina aún no ha sido cargada.</p>
        </div>
      } @else {
        <!-- Resumen de Métricas (Bento Cards & TestId) -->
        <div class="bento-metricas-cuentas">
          <div
            class="bento-stat-card"
            [class.bento-active]="filtroEstado() === 'todos'"
            (click)="cambiarFiltroEstado('todos')"
            role="button"
            tabindex="0"
          >
            <span class="bento-stat-label">Total Cuentas</span>
            <span class="bento-stat-val">{{ estados().length }}</span>
            <span class="bento-stat-sub">Registros en nómina</span>
          </div>

          <div
            class="bento-stat-card bento-difiere"
            [class.bento-active]="filtroEstado() === 'difiere'"
            (click)="cambiarFiltroEstado('difiere')"
            role="button"
            tabindex="0"
          >
            <span class="bento-stat-label">Difieren de Nómina</span>
            <span class="bento-stat-val val-danger">{{ contar('difiere') }}</span>
            <span class="bento-stat-sub">Requieren verificación</span>
          </div>

          <div
            class="bento-stat-card bento-sin-confirmar"
            [class.bento-active]="filtroEstado() === 'sin-confirmar'"
            (click)="cambiarFiltroEstado('sin-confirmar')"
            role="button"
            tabindex="0"
          >
            <span class="bento-stat-label">Sin Confirmar</span>
            <span class="bento-stat-val val-warning">{{ contar('sin-confirmar') }}</span>
            <span class="bento-stat-sub">Propuesta pendiente</span>
          </div>

          <div
            class="bento-stat-card bento-sin-registrar"
            [class.bento-active]="filtroEstado() === 'sin-registrar'"
            (click)="cambiarFiltroEstado('sin-registrar')"
            role="button"
            tabindex="0"
          >
            <span class="bento-stat-label">Sin Registrar</span>
            <span class="bento-stat-val val-muted">{{ contar('sin-registrar') }}</span>
            <span class="bento-stat-sub">Sin datos bancarios</span>
          </div>
        </div>

        <!-- Barra de Resumen oficial para compatibilidad con tests -->
        <div class="resumen-barra" data-testid="resumen-cuentas">
          <span class="metrica-chip chip-difiere">{{ contar('difiere') }} difieren</span> ·
          <span class="metrica-chip chip-sin-confirmar"
            >{{ contar('sin-confirmar') }} sin confirmar</span
          >
          ·
          <span class="metrica-chip chip-sin-registrar"
            >{{ contar('sin-registrar') }} sin registrar</span
          >
        </div>

        <!-- Filtros y Búsqueda Táctil -->
        <div class="filtros-cuentas-box">
          <div class="buscador-cuentas">
            <span class="material-symbols-outlined icono-buscador">search</span>
            <input
              type="search"
              class="form-control input-buscador"
              placeholder="Buscar por cédula, nombre o banco…"
              [ngModel]="filtroBusqueda()"
              (ngModelChange)="actualizarBusqueda($event)"
              data-testid="input-buscar-cuentas"
            />
            @if (filtroBusqueda()) {
              <button
                type="button"
                class="btn-limpiar-busqueda"
                (click)="actualizarBusqueda('')"
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            }
          </div>

          <div class="selectores-cuentas">
            <div class="filtro-grupo">
              <label for="filtroEstadoCuentas" class="filtro-label">Estado:</label>
              <select
                id="filtroEstadoCuentas"
                class="form-control select-filtro"
                [ngModel]="filtroEstado()"
                (ngModelChange)="cambiarFiltroEstado($event)"
              >
                <option value="todos">Todos ({{ estados().length }})</option>
                <option value="difiere">Difiere ({{ contar('difiere') }})</option>
                <option value="sin-confirmar">Sin confirmar ({{ contar('sin-confirmar') }})</option>
                <option value="sin-registrar">Sin registrar ({{ contar('sin-registrar') }})</option>
                <option value="coincide">Coincide ({{ contar('coincide') }})</option>
              </select>
            </div>

            <div class="filtro-grupo">
              <label for="filasPorPaginaCuentas" class="filtro-label">Mostrar:</label>
              <select
                id="filasPorPaginaCuentas"
                class="form-control select-filtro select-filas"
                [ngModel]="filasPorPagina()"
                (ngModelChange)="cambiarFilasPorPagina($event)"
              >
                <option [ngValue]="10">10 por pág.</option>
                <option [ngValue]="25">25 por pág.</option>
                <option [ngValue]="50">50 por pág.</option>
                <option [ngValue]="100">100 por pág.</option>
              </select>
            </div>
          </div>
        </div>

        <div class="tabla-contenedor">
          <table class="tabla-cuentas">
            <thead>
              <tr>
                <th scope="col">Documento</th>
                <th scope="col">Nombre</th>
                <th scope="col">Banco</th>
                <th scope="col">Cuenta</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (fila of estadosPaginados(); track fila.personaId) {
                <tr [attr.data-estado]="fila.estado">
                  <td class="col-documento">
                    <span class="doc-badge">{{ fila.documento }}</span>
                  </td>
                  <td class="col-nombre">{{ fila.nombre || '—' }}</td>
                  <td class="col-banco">{{ fila.banco || '—' }}</td>
                  <td class="col-cuenta">
                    @if (fila.ultimosDigitos) {
                      <span class="cuenta-enmascarada">******{{ fila.ultimosDigitos }}</span>
                    } @else {
                      <span class="text-muted">—</span>
                    }
                  </td>
                  <td class="col-estado">
                    <span class="badge-estado" [class]="'badge-' + fila.estado">
                      {{ texto(fila.estado) }}
                    </span>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="text-center empty-state">
                    No se encontraron cuentas bancarias que coincidan con los filtros aplicados.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Controles de Paginación -->
        @if (estadosFiltrados().length > 0) {
          <div class="paginacion-contenedor">
            <div class="paginacion-info">
              Mostrando {{ indicePrimerElemento() }} - {{ indiceUltimoElemento() }} de
              {{ estadosFiltrados().length }} cuentas
            </div>
            <div class="paginacion-botones">
              <button
                type="button"
                class="btn-paginacion"
                (click)="paginaAnterior()"
                [disabled]="paginaActual() <= 1"
              >
                ← Anterior
              </button>
              <span class="paginacion-indicador">
                Página {{ paginaActual() }} de {{ totalPaginas() }}
              </span>
              <button
                type="button"
                class="btn-paginacion"
                (click)="paginaSiguiente()"
                [disabled]="paginaActual() >= totalPaginas()"
              >
                Siguiente →
              </button>
            </div>
          </div>
        }
      }
    </section>
  `,
  styles: `
    .tarjeta-cuentas {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04);
      margin-top: 1rem;
    }
    .encabezado-cuentas {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1.25rem;
      flex-wrap: wrap;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #f1f5f9;
    }
    .header-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: rgba(34, 44, 87, 0.08);
      color: #222c57;
      border: 1px solid rgba(34, 44, 87, 0.15);
      border-radius: 9999px;
      padding: 0.2rem 0.65rem;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 0.35rem;
    }
    .icon-xs {
      font-size: 0.875rem !important;
    }
    .icon-sm {
      font-size: 1.125rem !important;
    }
    .titulos-cuentas {
      flex: 1;
      min-width: 240px;
    }
    .btn-refrescar {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      color: #222c57;
      padding: 0.5rem 1rem;
      border-radius: 12px;
      font-weight: 700;
      font-size: 0.8125rem;
      cursor: pointer;
      min-height: 40px;
      transition: all 0.15s ease-in-out;
    }
    .btn-refrescar:hover:not(:disabled) {
      background: #f8fafc;
      border-color: #222c57;
      box-shadow: 0 2px 4px rgba(34, 44, 87, 0.08);
    }
    .btn-refrescar:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .titulo-cuentas {
      font-size: 1.25rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 0.25rem 0;
      letter-spacing: -0.02em;
    }
    .subtitulo-cuentas {
      font-size: 0.875rem;
      color: #64748b;
      margin: 0;
    }

    /* Bento Stats Grid */
    .bento-metricas-cuentas {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.25rem;
    }
    .bento-stat-card {
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 14px;
      padding: 1rem 1.25rem;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
    }
    .bento-stat-card:hover {
      border-color: #cbd5e1;
      background: #ffffff;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .bento-stat-card.bento-active {
      border-color: #222c57;
      background: #ffffff;
      box-shadow:
        0 0 0 2px #222c57,
        0 4px 12px rgba(34, 44, 87, 0.1);
    }
    .bento-stat-label {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
      margin-bottom: 0.25rem;
    }
    .bento-stat-val {
      font-size: 1.625rem;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.1;
      letter-spacing: -0.02em;
    }
    .val-danger {
      color: #dc2626;
    }
    .val-warning {
      color: #d97706;
    }
    .val-muted {
      color: #475569;
    }
    .bento-stat-sub {
      font-size: 0.75rem;
      color: #94a3b8;
      margin-top: 0.25rem;
    }

    .alerta {
      padding: 0.75rem 1rem;
      border-radius: 12px;
      margin-bottom: 1rem;
      font-size: 0.875rem;
    }
    .alerta-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
    }
    .estado-cargando,
    .estado-vacio {
      padding: 2.5rem 1.5rem;
      text-align: center;
      color: #64748b;
      font-size: 0.9375rem;
    }

    .resumen-barra {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex-wrap: wrap;
      margin-bottom: 1rem;
      padding: 0.6rem 0.9rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      font-size: 0.8125rem;
      color: #64748b;
    }
    .metrica-chip {
      font-weight: 600;
      display: inline-flex;
      align-items: center;
    }
    .chip-difiere {
      color: #dc2626;
      font-weight: 700;
    }
    .chip-sin-confirmar {
      color: #d97706;
      font-weight: 700;
    }
    .chip-sin-registrar {
      color: #475569;
      font-weight: 700;
    }

    /* Barra de Búsqueda y Filtros Bento */
    .filtros-cuentas-box {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.25rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 0.875rem 1rem;
    }
    .buscador-cuentas {
      position: relative;
      flex: 1;
      min-width: 240px;
      display: flex;
      align-items: center;
    }
    .icono-buscador {
      position: absolute;
      left: 0.75rem;
      color: #94a3b8;
      font-size: 1.25rem !important;
      pointer-events: none;
    }
    .input-buscador {
      width: 100%;
      min-height: 42px;
      padding-left: 2.35rem !important;
      padding-right: 2rem !important;
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      border-radius: 12px;
      font-size: 0.875rem;
      color: #0f172a;
    }
    .input-buscador:focus {
      border-color: #222c57;
      box-shadow: 0 0 0 3px rgba(34, 44, 87, 0.12);
    }
    .btn-limpiar-busqueda {
      position: absolute;
      right: 0.65rem;
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 0.875rem;
      cursor: pointer;
      padding: 0.25rem;
    }
    .selectores-cuentas {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .filtro-grupo {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .filtro-label {
      font-size: 0.8125rem;
      font-weight: 700;
      color: #475569;
    }
    .select-filtro {
      min-height: 42px;
      border: 1.5px solid #cbd5e1;
      border-radius: 12px;
      padding: 0.45rem 2rem 0.45rem 0.75rem;
      font-size: 0.8125rem;
      background: #ffffff;
      color: #0f172a;
      cursor: pointer;
    }
    .select-filas {
      min-width: 120px;
    }

    .tabla-contenedor {
      overflow-x: auto;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      background: #ffffff;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
    }
    .tabla-cuentas {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.875rem;
    }
    .tabla-cuentas th {
      background: #f8fafc;
      color: #334155;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.85rem 1rem;
      border-bottom: 1.5px solid #e2e8f0;
      white-space: nowrap;
    }
    .tabla-cuentas td {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
      vertical-align: middle;
    }
    .tabla-cuentas tbody tr:last-child td {
      border-bottom: none;
    }
    .tabla-cuentas tbody tr:hover {
      background-color: #f8fafc;
    }
    .doc-badge {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-weight: 700;
      font-size: 0.8125rem;
      color: #0f172a;
      background: #f1f5f9;
      padding: 0.25rem 0.55rem;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .col-nombre {
      font-weight: 600;
      color: #0f172a;
    }
    .col-banco {
      color: #334155;
      font-weight: 500;
    }
    .cuenta-enmascarada {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-weight: 600;
      font-size: 0.8125rem;
      background: #f8fafc;
      padding: 0.25rem 0.55rem;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      letter-spacing: 0.05em;
      color: #334155;
    }
    .text-muted {
      color: #94a3b8;
    }
    .badge-estado {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      line-height: 1.2;
      white-space: nowrap;
    }
    .badge-sin-registrar {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #e2e8f0;
    }
    .badge-difiere {
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }
    .badge-sin-confirmar {
      background: #fffbeb;
      color: #b45309;
      border: 1px solid #fde68a;
    }
    .badge-coincide {
      background: #f0fdf4;
      color: #15803d;
      border: 1px solid #bbf7d0;
    }
    .empty-state {
      padding: 2.5rem 1rem !important;
      color: #64748b;
      font-size: 0.875rem;
    }

    /* Paginación Bento */
    .paginacion-contenedor {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      padding: 1rem 0.25rem 0.25rem 0.25rem;
    }
    .paginacion-info {
      font-size: 0.8125rem;
      color: #64748b;
      font-weight: 500;
    }
    .paginacion-botones {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .btn-paginacion {
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      color: #222c57;
      padding: 0.4rem 0.85rem;
      border-radius: 10px;
      font-weight: 700;
      font-size: 0.8125rem;
      cursor: pointer;
      min-height: 38px;
      transition: all 0.15s ease-in-out;
    }
    .btn-paginacion:hover:not(:disabled) {
      background: #f8fafc;
      border-color: #222c57;
    }
    .btn-paginacion:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .paginacion-indicador {
      font-size: 0.8125rem;
      font-weight: 700;
      color: #0f172a;
      padding: 0 0.5rem;
    }

    @media (max-width: 640px) {
      .tarjeta-cuentas {
        padding: 1rem;
        border-radius: 12px;
      }
      .encabezado-cuentas {
        flex-direction: column;
        align-items: stretch;
      }
      .btn-refrescar {
        align-self: flex-start;
      }
      .filtros-cuentas-box {
        flex-direction: column;
        align-items: stretch;
      }
      .buscador-cuentas {
        min-width: 100%;
      }
      .selectores-cuentas {
        flex-direction: column;
        align-items: stretch;
      }
      .paginacion-contenedor {
        flex-direction: column;
        align-items: center;
      }
    }
  `,
})
export class EstadoCuentasBancariasComponent implements OnInit {
  private readonly cliente = inject(RevisionClient);
  readonly estados = signal<EstadoCuentaPersonaDto[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');

  // Filtros y paginación
  readonly filtroBusqueda = signal<string>('');
  readonly filtroEstado = signal<string>('todos');
  readonly paginaActual = signal<number>(1);
  readonly filasPorPagina = signal<number>(25);

  readonly estadosFiltrados = computed(() => {
    const texto = this.filtroBusqueda().trim().toLowerCase();
    const estado = this.filtroEstado();

    return this.estados().filter((fila) => {
      // Filtro por texto
      if (texto) {
        const doc = (fila.documento || '').toLowerCase();
        const nom = (fila.nombre || '').toLowerCase();
        const banco = (fila.banco || '').toLowerCase();
        if (!doc.includes(texto) && !nom.includes(texto) && !banco.includes(texto)) {
          return false;
        }
      }

      // Filtro por estado
      if (estado !== 'todos' && fila.estado !== estado) {
        return false;
      }

      return true;
    });
  });

  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.estadosFiltrados().length / this.filasPorPagina())),
  );

  readonly estadosPaginados = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.filasPorPagina();
    return this.estadosFiltrados().slice(inicio, inicio + this.filasPorPagina());
  });

  readonly indicePrimerElemento = computed(() => {
    if (this.estadosFiltrados().length === 0) return 0;
    return (this.paginaActual() - 1) * this.filasPorPagina() + 1;
  });

  readonly indiceUltimoElemento = computed(() =>
    Math.min(this.paginaActual() * this.filasPorPagina(), this.estadosFiltrados().length),
  );

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.cliente
      .listarEstadosCuentasBancarias()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (estados) => this.estados.set(estados),
        error: (error: unknown) =>
          this.error.set(mensajeError(error, 'No se pudieron cargar las cuentas bancarias.')),
      });
  }

  contar(estado: string): number {
    return this.estados().filter((fila) => fila.estado === estado).length;
  }

  texto(estado: string): string {
    return textoEstadoCuenta(estado);
  }

  actualizarBusqueda(texto: string): void {
    this.filtroBusqueda.set(texto);
    this.paginaActual.set(1);
  }

  cambiarFiltroEstado(estado: string): void {
    this.filtroEstado.set(estado);
    this.paginaActual.set(1);
  }

  cambiarFilasPorPagina(filas: number): void {
    this.filasPorPagina.set(Number(filas));
    this.paginaActual.set(1);
  }

  paginaSiguiente(): void {
    if (this.paginaActual() < this.totalPaginas()) {
      this.paginaActual.update((p) => p + 1);
    }
  }

  paginaAnterior(): void {
    if (this.paginaActual() > 1) {
      this.paginaActual.update((p) => p - 1);
    }
  }
}

/** Cuenta de la persona del expediente que se revisa, enmascarada. */
@Component({
  selector: 'app-cuenta-bancaria-revision',
  standalone: true,
  template: `
    <div class="info-item" data-testid="cuenta-revision">
      <span class="info-label">Cuenta bancaria</span>
      <span class="info-value">
        @if (cargando()) {
          Cargando…
        } @else if (error()) {
          {{ error() }}
        } @else if (cuenta(); as actual) {
          {{ actual.banco }} · {{ actual.tipoCuenta }} · {{ actual.numeroEnmascarado }} ·
          <strong>{{ texto(actual.estado) }}</strong>
        } @else {
          Sin registrar
        }
      </span>
    </div>
  `,
})
export class CuentaBancariaRevisionComponent implements OnInit {
  private readonly cliente = inject(RevisionClient);
  readonly documento = input.required<string>();
  readonly cuenta = signal<CuentaBancariaDto | null>(null);
  readonly cargando = signal(true);
  readonly error = signal('');

  ngOnInit(): void {
    nuloSiNoHayContenido(this.cliente.obtenerCuentaBancariaParaRevision(this.documento()))
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (cuenta) => this.cuenta.set(cuenta),
        error: (error: unknown) =>
          this.error.set(mensajeError(error, 'No se pudo consultar la cuenta.')),
      });
  }

  texto(estado: string): string {
    return textoEstadoCuenta(estado);
  }
}
