import { ValidacionHojaDeVidaService } from '../usuario/hoja-de-vida/servicios/validacion-hoja-de-vida.service';
import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin, Observable } from 'rxjs';
import {
  CatalogosClient,
  CuentaBancariaClient,
  CuentaBancariaDto,
  ElementoCatalogoDto,
} from '../../api-client';
import { mensajeError } from '../../core/auth/mensaje-error';
import { filtrarCatalogo } from '../../core/util/filtro-busqueda.util';
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
    <section class="tarjeta card card-bento" aria-labelledby="titulo-cuenta">
      <div class="tarjeta-header">
        <div class="icono-header-box">
          <span class="material-symbols-outlined icono-header">account_balance</span>
        </div>
        <div>
          <h2 id="titulo-cuenta" class="titulo-seccion">Cuenta Bancaria Institucional</h2>
          <p class="ayuda">
            La institución la usa para comprobar que los pagos de nómina lleguen a la cuenta
            correcta. Fuera de esta pantalla solo se muestran los últimos cuatro dígitos protegidos.
          </p>
        </div>
      </div>

      @if (error()) {
        <p class="mensaje error alert alert-danger" role="alert">
          <span class="material-symbols-outlined icon-xs">error</span>
          <span>{{ error() }}</span>
        </p>
      }
      @if (aviso()) {
        <p class="mensaje exito alert alert-success" role="status">
          <span class="material-symbols-outlined icon-xs">check_circle</span>
          <span>{{ aviso() }}</span>
        </p>
      }
      @if (cargando()) {
        <div class="loading-state" role="status">
          <span class="material-symbols-outlined icon-spin">sync</span>
          <p>Cargando información bancaria institucional…</p>
        </div>
      } @else {
        <div class="bento-bancario-layout">
          @if (cuenta(); as actual) {
            <!-- Tarjeta Visual Estilo Credencial Bancaria Bento -->
            <div class="tarjeta-bancaria-visual">
              <div class="tb-top">
                <div class="tb-chip">
                  <span class="material-symbols-outlined icon-chip">contactless</span>
                </div>
                <span class="tb-tipo-badge">{{ actual.tipoCuenta }}</span>
              </div>
              <div class="tb-banco">{{ actual.banco }}</div>
              <div class="tb-numero" data-testid="numero-cuenta">
                {{ numeroCompleto() || actual.numeroEnmascarado }}
              </div>
              <div class="tb-bottom">
                <div class="tb-titular">
                  <span class="tb-label">ESTADO DE VERIFICACIÓN</span>
                  <span class="tb-valor-estado" data-testid="estado-cuenta">
                    <span class="status-dot" [class]="'dot-' + actual.estado"></span>
                    {{ estadoTexto(actual.estado) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Resumen y Acciones Rápidas -->
            <div class="detalle-cuenta-bento">
              <h3 class="subtitulo-detalle">Detalles de Registro</h3>
              <dl class="resumen-cuenta" data-testid="cuenta-actual">
                <dt>Entidad Bancaria:</dt>
                <dd>
                  <strong>{{ actual.banco }}</strong>
                </dd>
                <dt>Tipo de Cuenta:</dt>
                <dd>{{ actual.tipoCuenta }}</dd>
                <dt>Número Registrado:</dt>
                <dd class="font-mono">{{ numeroCompleto() || actual.numeroEnmascarado }}</dd>
                <dt>Estado Cotejo:</dt>
                <dd>
                  <span class="badge" [class]="obtenerClaseBadge(actual.estado)">
                    {{ estadoTexto(actual.estado) }}
                  </span>
                </dd>
              </dl>

              <div class="acciones-cuenta-row">
                @if (!numeroCompleto()) {
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm secundario"
                    [disabled]="ocupado()"
                    (click)="verNumero()"
                    title="Solicitar visualización completa en auditoría"
                  >
                    <span class="material-symbols-outlined icon-xs">visibility</span>
                    <span>Ver número completo</span>
                  </button>
                } @else {
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm secundario"
                    (click)="numeroCompleto.set('')"
                    title="Ocultar número completo"
                  >
                    <span class="material-symbols-outlined icon-xs">visibility_off</span>
                    <span>Ocultar número</span>
                  </button>
                }
                @if (actual.estado === 'sin-confirmar' && editable()) {
                  <button
                    type="button"
                    class="btn btn-success btn-sm"
                    data-testid="confirmar-cuenta"
                    [disabled]="ocupado()"
                    (click)="confirmar()"
                  >
                    <span class="material-symbols-outlined icon-xs">verified</span>
                    <span>Confirmar que es correcta</span>
                  </button>
                }
              </div>
            </div>
          } @else {
            <div class="sin-cuenta-card" data-testid="sin-cuenta">
              <span class="material-symbols-outlined icon-sin-cuenta">account_balance_wallet</span>
              <p class="sin-cuenta-titulo">Aún no registra una cuenta bancaria.</p>
              <p class="sin-cuenta-desc">
                Ingrese los datos de su cuenta de ahorros o corriente a continuación para cotejar
                con la nómina institucional.
              </p>
            </div>
          }
        </div>

        @if (editable()) {
          <div class="formulario-cuenta-bento">
            <h3 class="form-titulo">
              <span class="material-symbols-outlined icon-xs text-primary">edit_note</span>
              <span>{{ cuenta() ? 'Corregir cuenta' : 'Registrar cuenta' }}</span>
            </h3>

            <form #formulario="ngForm" (ngSubmit)="guardar()" class="formulario-cuenta">
              <div class="form-row-2">
                <div class="form-group">
                  <label for="tipo-cuenta" class="form-label">Tipo de cuenta *</label>
                  <select
                    id="tipo-cuenta"
                    name="tipoCuenta"
                    class="form-control"
                    [(ngModel)]="tipoCuentaId"
                    required
                  >
                    @for (tipo of tipos(); track tipo.id) {
                      <option [ngValue]="tipo.id">{{ tipo.nombre }}</option>
                    }
                  </select>
                </div>

                @if (bancos().length) {
                  <div class="form-group">
                    <label for="banco" class="form-label">Banco / Cooperativa *</label>
                    <input
                      type="search"
                      class="form-control form-control-sm mb-1"
                      placeholder="Buscar entidad bancaria..."
                      [ngModel]="filtroBanco()"
                      (ngModelChange)="filtroBanco.set($event)"
                      name="buscarBanco"
                      data-testid="input-buscar-banco"
                    />
                    <select id="banco" name="banco" class="form-control" [(ngModel)]="bancoId">
                      <option [ngValue]="null">Otro (escribir el nombre)</option>
                      @for (banco of bancosFiltrados(); track banco.id) {
                        <option [ngValue]="banco.id">{{ banco.nombre }}</option>
                      }
                    </select>
                  </div>
                }
              </div>

              @if (bancoId === null) {
                <div class="form-group">
                  <label for="banco-otro" class="form-label"
                    >Nombre del banco o institución *</label
                  >
                  <input
                    id="banco-otro"
                    name="bancoOtro"
                    class="form-control"
                    [(ngModel)]="nombreBancoOtro"
                    placeholder="Ej. Banco Bolivariano, Cooperativa Jep, etc."
                    maxlength="200"
                    required
                  />
                </div>
              }

              <div class="form-group">
                <label for="numero-nuevo" class="form-label">Número de cuenta *</label>
                <input
                  id="numero-nuevo"
                  name="numero"
                  class="form-control font-mono"
                  [(ngModel)]="numero"
                  placeholder="Ej. 2200112233"
                  inputmode="numeric"
                  autocomplete="off"
                  pattern="[0-9 \\-]{6,30}"
                  required
                />
              </div>

              @if (validacion.mensaje(datosValidacion(), 'cuenta', 'numero'); as mensaje) {
                <small class="text-danger" role="alert">{{ mensaje }}</small>
              }
              @if (validacion.mensaje(datosValidacion(), 'cuenta', 'nombreBancoOtro'); as mensaje) {
                <small class="text-danger" role="alert">{{ mensaje }}</small>
              }

              <div class="acciones-form mt-3">
                <button
                  type="submit"
                  class="btn btn-primary"
                  [disabled]="
                    formulario.invalid ||
                    ocupado() ||
                    validacion.invalido(datosValidacion(), 'cuenta')
                  "
                >
                  <span class="material-symbols-outlined icon-xs">save</span>
                  <span>Guardar cuenta</span>
                </button>
              </div>
            </form>
          </div>
        }
      }
    </section>
  `,
  styles: `
    .card-bento {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 1.75rem;
      box-shadow:
        0 4px 6px -1px rgba(0, 0, 0, 0.05),
        0 2px 4px -2px rgba(0, 0, 0, 0.05);
      margin-bottom: 2rem;
    }
    .tarjeta-header {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 1.5rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid #f1f5f9;
    }
    .icono-header-box {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #222c57 0%, #1e1b4b 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #c4a857;
      flex-shrink: 0;
      box-shadow: 0 4px 10px rgba(34, 44, 87, 0.2);
    }
    .icono-header {
      font-size: 24px;
    }
    .titulo-seccion {
      font-size: 1.25rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.25rem 0;
    }
    .ayuda {
      color: #64748b;
      font-size: 0.875rem;
      line-height: 1.45;
      margin: 0;
    }
    .bento-bancario-layout {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }
    /* Tarjeta Bancaria Visual */
    .tarjeta-bancaria-visual {
      background: linear-gradient(135deg, #0f172a 0%, #222c57 65%, #1e1b4b 100%);
      border-radius: 16px;
      padding: 1.5rem;
      color: #ffffff;
      box-shadow:
        0 10px 25px -5px rgba(15, 23, 42, 0.3),
        0 8px 10px -6px rgba(15, 23, 42, 0.2);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 190px;
      border: 1px solid rgba(196, 168, 87, 0.3);
    }
    .tarjeta-bancaria-visual::before {
      content: '';
      position: absolute;
      top: -30px;
      right: -30px;
      width: 140px;
      height: 140px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(196, 168, 87, 0.2) 0%, transparent 70%);
      pointer-events: none;
    }
    .tb-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .icon-chip {
      font-size: 28px;
      color: #c4a857;
    }
    .tb-tipo-badge {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.25rem 0.65rem;
      background: rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(4px);
      border-radius: 20px;
      color: #f1f5f9;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .tb-banco {
      font-size: 1.125rem;
      font-weight: 700;
      color: #ffffff;
      margin-top: 0.5rem;
      letter-spacing: -0.01em;
    }
    .tb-numero {
      font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
      font-size: 1.35rem;
      font-weight: 600;
      letter-spacing: 0.15em;
      color: #c4a857;
      margin: 0.75rem 0;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
    }
    .tb-bottom {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .tb-titular {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .tb-label {
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #94a3b8;
      font-weight: 600;
    }
    .tb-valor-estado {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #f8fafc;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #94a3b8;
      display: inline-block;
    }
    .dot-coincide {
      background: #10b981;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
    }
    .dot-difiere {
      background: #ef4444;
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
    }
    .dot-sin-confirmar {
      background: #f59e0b;
      box-shadow: 0 0 8px rgba(245, 158, 11, 0.6);
    }

    /* Detalle y Resumen */
    .detalle-cuenta-bento {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .subtitulo-detalle {
      font-size: 0.95rem;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 0.75rem 0;
    }
    .resumen-cuenta {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.5rem 1rem;
      font-size: 0.875rem;
      margin: 0 0 1rem 0;
    }
    .resumen-cuenta dt {
      color: #64748b;
      font-weight: 500;
    }
    .resumen-cuenta dd {
      margin: 0;
      color: #0f172a;
    }
    .acciones-cuenta-row {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      align-items: center;
      padding-top: 0.75rem;
      border-top: 1px solid #e2e8f0;
    }

    /* Sin cuenta */
    .sin-cuenta-card {
      background: #f8fafc;
      border: 2px dashed #cbd5e1;
      border-radius: 16px;
      padding: 2rem;
      text-align: center;
      grid-column: 1 / -1;
    }
    .icon-sin-cuenta {
      font-size: 40px;
      color: #94a3b8;
      margin-bottom: 0.5rem;
    }
    .sin-cuenta-titulo {
      font-size: 1rem;
      font-weight: 700;
      color: #334155;
      margin: 0 0 0.25rem 0;
    }
    .sin-cuenta-desc {
      font-size: 0.875rem;
      color: #64748b;
      margin: 0;
    }

    /* Formulario */
    .formulario-cuenta-bento {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 1.5rem;
      margin-top: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
    }
    .form-titulo {
      font-size: 1rem;
      font-weight: 700;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0 0 1.25rem 0;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid #f1f5f9;
    }
    .form-row-2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1rem;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      margin-bottom: 1rem;
    }
    .form-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #334155;
    }
    .form-control {
      padding: 0.625rem 0.875rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 0.875rem;
      color: #0f172a;
      background: #ffffff;
      transition:
        border-color 0.15s,
        box-shadow 0.15s;
    }
    .form-control:focus {
      outline: none;
      border-color: #222c57;
      box-shadow: 0 0 0 3px rgba(34, 44, 87, 0.12);
    }
    .font-mono {
      font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
    }
    .text-danger {
      color: #dc2626;
      font-size: 0.75rem;
      display: block;
      margin-top: 0.25rem;
    }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 0.25rem 0.65rem;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 9999px;
    }
    .badge-success {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .badge-warning {
      background: #fffbeb;
      color: #92400e;
      border: 1px solid #fde68a;
    }
    .badge-danger {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }
    .badge-info {
      background: #eff6ff;
      color: #1e40af;
      border: 1px solid #bfdbfe;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease-in-out;
    }
    .btn-sm {
      padding: 0.375rem 0.75rem;
      font-size: 0.8125rem;
    }
    .btn-primary {
      background: #222c57;
      color: #ffffff;
    }
    .btn-primary:hover:not(:disabled) {
      background: #1a2244;
      box-shadow: 0 4px 12px rgba(34, 44, 87, 0.25);
    }
    .btn-secondary {
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
    }
    .btn-secondary:hover:not(:disabled) {
      background: #e2e8f0;
      color: #0f172a;
    }
    .btn-success {
      background: #10b981;
      color: #ffffff;
    }
    .btn-success:hover:not(:disabled) {
      background: #059669;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
    }
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .icon-xs {
      font-size: 16px;
    }
  `,
})
export class MiCuentaBancariaComponent implements OnInit {
  readonly validacion = inject(ValidacionHojaDeVidaService);
  datosValidacion(): object {
    return {
      numero: this.numero,
      nombreBancoOtro: this.bancoId === null ? this.nombreBancoOtro : undefined,
    };
  }
  private readonly cliente = inject(CuentaBancariaClient);
  private readonly catalogos = inject(CatalogosClient);

  /** Lo decide el panel: campaña abierta y actualización en borrador o devuelta. */
  readonly editable = input(false);

  readonly cuenta = signal<CuentaBancariaDto | null>(null);
  readonly tipos = signal<ElementoCatalogoDto[]>([]);
  readonly bancos = signal<ElementoCatalogoDto[]>([]);
  readonly filtroBanco = signal('');
  readonly bancosFiltrados = computed(() =>
    filtrarCatalogo(this.bancos(), this.filtroBanco(), this.bancoId),
  );
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

  obtenerClaseBadge(estado?: string): string {
    switch (estado) {
      case 'coincide':
        return 'badge-success';
      case 'difiere':
        return 'badge-danger';
      case 'sin-confirmar':
        return 'badge-warning';
      default:
        return 'badge-info';
    }
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
    if (this.tipoCuentaId === null || this.validacion.invalido(this.datosValidacion(), 'cuenta'))
      return;
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
