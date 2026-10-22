import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin, Observable } from 'rxjs';
import {
  CatalogosClient,
  CuentaBancariaClient,
  CuentaBancariaDto,
  ElementoCatalogoDto,
} from '../../api-client';
import { mensajeError } from '../../core/auth/mensaje-error';
import {
  catalogoOAlternativa,
  nuloSiNoHayContenido,
  textoEstadoCuenta,
  TIPOS_CUENTA_SEMBRADOS,
} from './cuenta-bancaria';

// RF-HDV-025 y 026 (ADR-0013): la persona registra, confirma o corrige su cuenta. El número completo solo
// se muestra a pedido, porque cada lectura queda en la auditoría.
@Component({
  selector: 'app-mi-cuenta-bancaria',
  imports: [FormsModule],
  template: `
    <section class="tarjeta" aria-labelledby="titulo-cuenta">
      <h2 id="titulo-cuenta">Cuenta bancaria</h2>
      <p class="ayuda">
        La institución la usa para comprobar que los pagos llegan a la cuenta correcta. Fuera de
        esta pantalla solo se muestran los últimos cuatro dígitos.
      </p>
      @if (error()) {
        <p class="mensaje error" role="alert">{{ error() }}</p>
      }
      @if (aviso()) {
        <p class="mensaje exito" role="status">{{ aviso() }}</p>
      }
      @if (cargando()) {
        <p role="status">Cargando cuenta bancaria…</p>
      } @else {
        @if (cuenta(); as actual) {
          <dl class="resumen-cuenta" data-testid="cuenta-actual">
            <dt>Banco</dt>
            <dd>{{ actual.banco }}</dd>
            <dt>Tipo</dt>
            <dd>{{ actual.tipoCuenta }}</dd>
            <dt>Número</dt>
            <dd data-testid="numero-cuenta">{{ numeroCompleto() || actual.numeroEnmascarado }}</dd>
            <dt>Estado</dt>
            <dd data-testid="estado-cuenta">{{ estadoTexto(actual.estado) }}</dd>
          </dl>
          @if (!numeroCompleto()) {
            <button type="button" class="secundario" [disabled]="ocupado()" (click)="verNumero()">
              Ver número completo
            </button>
          } @else {
            <button type="button" class="secundario" (click)="numeroCompleto.set('')">
              Ocultar número
            </button>
          }
          @if (actual.estado === 'sin-confirmar' && editable()) {
            <button
              type="button"
              data-testid="confirmar-cuenta"
              [disabled]="ocupado()"
              (click)="confirmar()"
            >
              Confirmar que es correcta
            </button>
          }
        } @else {
          <p data-testid="sin-cuenta">Aún no registra una cuenta bancaria.</p>
        }

        @if (editable()) {
          <form #formulario="ngForm" (ngSubmit)="guardar()" class="formulario-cuenta">
            <h3>{{ cuenta() ? 'Corregir cuenta' : 'Registrar cuenta' }}</h3>
            <label for="tipo-cuenta">Tipo de cuenta</label>
            <select id="tipo-cuenta" name="tipoCuenta" [(ngModel)]="tipoCuentaId" required>
              @for (tipo of tipos(); track tipo.id) {
                <option [ngValue]="tipo.id">{{ tipo.nombre }}</option>
              }
            </select>
            @if (bancos().length) {
              <label for="banco">Banco</label>
              <select id="banco" name="banco" [(ngModel)]="bancoId">
                <option [ngValue]="null">Otro (escribir el nombre)</option>
                @for (banco of bancos(); track banco.id) {
                  <option [ngValue]="banco.id">{{ banco.nombre }}</option>
                }
              </select>
            }
            @if (bancoId === null) {
              <label for="banco-otro">Nombre del banco</label>
              <input
                id="banco-otro"
                name="bancoOtro"
                [(ngModel)]="nombreBancoOtro"
                maxlength="200"
                required
              />
            }
            <label for="numero-nuevo">Número de cuenta</label>
            <input
              id="numero-nuevo"
              name="numero"
              [(ngModel)]="numero"
              inputmode="numeric"
              autocomplete="off"
              pattern="[0-9 \\-]{6,30}"
              required
            />
            <button type="submit" [disabled]="formulario.invalid || ocupado()">
              Guardar cuenta
            </button>
          </form>
        }
      }
    </section>
  `,
  styles: `
    .resumen-cuenta {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 0.25rem 1rem;
    }
    .formulario-cuenta {
      display: grid;
      gap: 0.5rem;
      margin-top: 1rem;
      max-width: 28rem;
    }
    .ayuda {
      color: var(--texto-secundario, #555);
    }
  `,
})
export class MiCuentaBancariaComponent implements OnInit {
  private readonly cliente = inject(CuentaBancariaClient);
  private readonly catalogos = inject(CatalogosClient);

  /** Lo decide el panel: campaña abierta y actualización en borrador o devuelta. */
  readonly editable = input(false);

  readonly cuenta = signal<CuentaBancariaDto | null>(null);
  readonly tipos = signal<ElementoCatalogoDto[]>([]);
  readonly bancos = signal<ElementoCatalogoDto[]>([]);
  readonly numeroCompleto = signal('');
  readonly cargando = signal(true);
  readonly ocupado = signal(false);
  readonly error = signal('');
  readonly aviso = signal('');

  tipoCuentaId: number | null = null;
  bancoId: number | null = null;
  nombreBancoOtro = '';
  numero = '';

  ngOnInit(): void {
    forkJoin({
      cuenta: nuloSiNoHayContenido(this.cliente.obtenerMiCuentaBancaria()),
      tipos: catalogoOAlternativa(
        this.catalogos.consultarCatalogo('TipoCuentaBancaria'),
        TIPOS_CUENTA_SEMBRADOS,
      ),
      bancos: catalogoOAlternativa(this.catalogos.consultarCatalogo('Banco'), []),
    })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: ({ cuenta, tipos, bancos }) => {
          this.tipos.set(tipos);
          this.bancos.set(bancos);
          this.mostrar(cuenta);
        },
        error: (error: unknown) =>
          this.error.set(mensajeError(error, 'No se pudo cargar la cuenta bancaria.')),
      });
  }

  estadoTexto(estado: string): string {
    return textoEstadoCuenta(estado);
  }

  verNumero(): void {
    this.realizar(this.cliente.leerMiNumeroCuentaBancaria(), (resultado) =>
      this.numeroCompleto.set((resultado as { numero: string }).numero),
    );
  }

  confirmar(): void {
    this.realizar(this.cliente.confirmarMiCuentaBancaria(), (resultado) => {
      this.mostrar(resultado as CuentaBancariaDto);
      this.aviso.set('Cuenta confirmada.');
    });
  }

  guardar(): void {
    if (this.tipoCuentaId === null) return;
    this.realizar(
      this.cliente.guardarMiCuentaBancaria({
        tipoCuentaId: this.tipoCuentaId,
        numero: this.numero,
        bancoId: this.bancoId ?? undefined,
        nombreBancoOtro: this.bancoId === null ? this.nombreBancoOtro : undefined,
      }),
      (resultado) => {
        this.mostrar(resultado as CuentaBancariaDto);
        this.numero = '';
        this.aviso.set('Cuenta guardada.');
      },
    );
  }

  private mostrar(cuenta: CuentaBancariaDto | null): void {
    this.cuenta.set(cuenta);
    this.numeroCompleto.set('');
    this.tipoCuentaId = cuenta?.tipoCuentaId ?? this.tipos()[0]?.id ?? null;
    this.bancoId = cuenta?.bancoId ?? null;
    this.nombreBancoOtro = cuenta && cuenta.bancoId == null ? cuenta.banco : '';
  }

  private realizar(accion: Observable<unknown>, exito: (resultado: unknown) => void): void {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.error.set('');
    this.aviso.set('');
    accion.pipe(finalize(() => this.ocupado.set(false))).subscribe({
      next: exito,
      error: (error: unknown) =>
        this.error.set(mensajeError(error, 'No se pudo completar la operación con la cuenta.')),
    });
  }
}
