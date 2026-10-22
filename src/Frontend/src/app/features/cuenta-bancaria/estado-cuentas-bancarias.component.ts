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
    <section class="tarjeta" aria-labelledby="titulo-estado-cuentas">
      <h2 id="titulo-estado-cuentas">Cuentas bancarias</h2>
      @if (error()) {
        <p class="mensaje error" role="alert">{{ error() }}</p>
      }
      @if (cargando()) {
        <p role="status">Cargando cuentas…</p>
      } @else if (!estados().length) {
        <p>No hay personas cargadas.</p>
      } @else {
        <p data-testid="resumen-cuentas">
          {{ contar('difiere') }} difieren · {{ contar('sin-confirmar') }} sin confirmar ·
          {{ contar('sin-registrar') }} sin registrar
        </p>
        <table>
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
                <td>{{ fila.documento }}</td>
                <td>{{ fila.nombre || '—' }}</td>
                <td>{{ fila.banco || '—' }}</td>
                <td>{{ fila.ultimosDigitos ? '******' + fila.ultimosDigitos : '—' }}</td>
                <td>{{ texto(fila.estado) }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
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
