import { Component, inject, input, OnInit, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { CuentaBancariaDto, EstadoCuentaPersonaDto, RevisionClient } from '../../api-client';
import { mensajeError } from '../../core/auth/mensaje-error';
import { nuloSiNoHayContenido, textoEstadoCuenta } from './cuenta-bancaria';

// RF-HDV-027 (ADR-0013 dec. 4): supervisor y admin ven si la cuenta coincide con la nómina, con los
// últimos cuatro dígitos; nunca el número completo.
@Component({
  selector: 'app-estado-cuentas-bancarias',
  template: `
    <section class="tarjeta-cuentas" aria-labelledby="titulo-estado-cuentas">
      <div class="encabezado-cuentas">
        <h2 id="titulo-estado-cuentas" class="titulo-cuentas">Cuentas bancarias</h2>
        <p class="subtitulo-cuentas">
          Monitoreo y cotejo de cuentas bancarias frente a la nómina institucional cargada.
        </p>
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
        <div class="estado-vacio">
          <p>No hay personas cargadas.</p>
        </div>
      } @else {
        <div class="resumen-barra" data-testid="resumen-cuentas">
          <span class="metrica-chip chip-difiere">{{ contar('difiere') }} difieren</span> ·
          <span class="metrica-chip chip-sin-confirmar">{{ contar('sin-confirmar') }} sin confirmar</span> ·
          <span class="metrica-chip chip-sin-registrar">{{ contar('sin-registrar') }} sin registrar</span>
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
              @for (fila of estados(); track fila.personaId) {
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
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
  styles: `
    .tarjeta-cuentas {
      margin-top: 1.5rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1.25rem 1.5rem;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.03);
    }
    .encabezado-cuentas {
      margin-bottom: 1rem;
    }
    .titulo-cuentas {
      font-size: 1.125rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.25rem 0;
      letter-spacing: -0.01em;
    }
    .subtitulo-cuentas {
      font-size: 0.8125rem;
      color: #64748b;
      margin: 0;
    }
    .alerta {
      padding: 0.75rem 1rem;
      border-radius: 6px;
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
      padding: 1.5rem;
      text-align: center;
      color: #64748b;
      font-size: 0.875rem;
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
      border-radius: 6px;
      font-size: 0.8125rem;
      color: #64748b;
    }
    .metrica-chip {
      font-weight: 500;
      display: inline-flex;
      align-items: center;
    }
    .chip-difiere {
      color: #dc2626;
      font-weight: 600;
    }
    .chip-sin-confirmar {
      color: #d97706;
      font-weight: 600;
    }
    .chip-sin-registrar {
      color: #475569;
      font-weight: 600;
    }
    .tabla-contenedor {
      overflow-x: auto;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      background: #ffffff;
    }
    .tabla-cuentas {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.875rem;
    }
    .tabla-cuentas th {
      background: #f8fafc;
      color: #475569;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.65rem 1rem;
      border-bottom: 1px solid #e2e8f0;
      white-space: nowrap;
    }
    .tabla-cuentas td {
      padding: 0.75rem 1rem;
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
      font-weight: 600;
      font-size: 0.8125rem;
      color: #0f172a;
      background: #f1f5f9;
      padding: 0.2rem 0.45rem;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }
    .col-nombre {
      font-weight: 500;
      color: #0f172a;
    }
    .col-banco {
      color: #334155;
    }
    .cuenta-enmascarada {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-weight: 500;
      font-size: 0.8125rem;
      background: #f8fafc;
      padding: 0.2rem 0.45rem;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
      letter-spacing: 0.03em;
    }
    .text-muted {
      color: #94a3b8;
    }
    .badge-estado {
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.55rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
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
  `,
})
export class EstadoCuentasBancariasComponent implements OnInit {
  private readonly cliente = inject(RevisionClient);
  readonly estados = signal<EstadoCuentaPersonaDto[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');

  ngOnInit(): void {
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
}

/** Cuenta de la persona del expediente que se revisa, enmascarada. */
@Component({
  selector: 'app-cuenta-bancaria-revision',
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
