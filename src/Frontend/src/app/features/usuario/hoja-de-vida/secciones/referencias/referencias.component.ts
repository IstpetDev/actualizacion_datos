import { mensajeError } from '../../../../../core/auth/mensaje-error';
import { ValidacionHojaDeVidaService } from '../../servicios/validacion-hoja-de-vida.service';
import { CommonModule } from '@angular/common';
import { DestroyRef, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { SeccionConCambios } from '../../servicios/seccion-con-cambios';
import { ModalCambiosSinGuardarComponent } from '../../componentes/modal-cambios-sin-guardar.component';
import { FormsModule } from '@angular/forms';
import { GuardarReferenciaRequest, ReferenciaDto } from '../../../../../api-client';
import { MarcaObservacionComponent } from '../../componentes/marca-observacion.component';
import { HojaDeVidaStateService } from '../../servicios/hoja-de-vida-state.service';

@Component({
  selector: 'app-referencias',
  standalone: true,
  imports: [CommonModule, FormsModule, MarcaObservacionComponent, ModalCambiosSinGuardarComponent],
  template: `
    @if (validacion.errorCarga()) {
      <p role="alert">
        {{ validacion.errorCarga() }}
        <button type="button" (click)="validacion.cargar()">Reintentar</button>
      </p>
    }

    <section class="seccion-referencias" data-testid="seccion-referencias">
      <header class="seccion-header">
        <div class="header-titulos">
          <h2 class="seccion-titulo">5. Referencias Personales y Laborales</h2>
          <p class="seccion-desc">
            Registre sus contactos de referencia. Es requisito obligatorio registrar al menos 2
            referencias personales para enviar su hoja de vida a revisión (RF-HDV-017), con un
            máximo de 5 por cada tipo (RF-HDV-016).
          </p>
        </div>
      </header>

      <!-- Subtabs: Personales y Laborales -->
      <nav class="subtabs-nav" role="tablist">
        <button
          type="button"
          class="subtab-btn"
          [class.active]="tipoActivo() === 'Personal'"
          (click)="intentarCambiarTipo('Personal')"
          data-testid="subtab-personales"
        >
          Referencias Personales ({{ personales().length }} / 5)
          @if (personales().length < 2) {
            <span class="tag-aviso">Mínimo 2</span>
          }
        </button>
        <button
          type="button"
          class="subtab-btn"
          [class.active]="tipoActivo() === 'Laboral'"
          (click)="intentarCambiarTipo('Laboral')"
          data-testid="subtab-laborales"
        >
          Referencias Laborales ({{ laborales().length }} / 5)
        </button>
      </nav>

      <div class="subtab-content">
        <div class="acciones-barra">
          @if (puedeEditar() && !mostrarFormulario()) {
            <button
              type="button"
              class="btn btn-primary btn-sm"
              [disabled]="
                tipoActivo() === 'Personal' ? personales().length >= 5 : laborales().length >= 5
              "
              (click)="abrirFormulario()"
              data-testid="btn-nueva-referencia"
            >
              + Registrar Referencia {{ tipoActivo() }}
            </button>
          }
        </div>

        <!-- Formulario Inline de Referencia -->
        @if (mostrarFormulario()) {
          <div class="card-formulario-item" data-testid="form-referencia">
            <h3 class="form-titulo-item">
              {{
                idEdicion()
                  ? 'Editar Referencia ' + tipoActivo()
                  : 'Nueva Referencia ' + tipoActivo()
              }}
            </h3>

            <div class="grid-dos">
              <div class="form-group">
                <label for="nombresApellidos"
                  >Nombres y Apellidos Completos <span class="text-danger">*</span></label
                >
                <input
                  [attr.aria-describedby]="'error-modelo-nombresApellidos'"
                  id="nombresApellidos"
                  type="text"
                  class="form-control"
                  [(ngModel)]="modelo.nombresApellidos"
                  placeholder="Ej. Ing. Carlos Andrade"
                  data-testid="input-nombres-apellidos"
                />
                @if (validacion.mensaje(modelo, 'referencia', 'nombresApellidos'); as mensaje) {
                  <small id="error-modelo-nombresApellidos" class="text-danger" role="alert">{{
                    mensaje
                  }}</small>
                }
              </div>

              <div class="form-group">
                <label for="telefono"
                  >Teléfono / Celular de Contacto <span class="text-danger">*</span></label
                >
                <input
                  [attr.aria-describedby]="'error-modelo-telefono'"
                  id="telefono"
                  type="tel"
                  class="form-control"
                  [(ngModel)]="modelo.telefono"
                  placeholder="Ej. 0991234567"
                  data-testid="input-telefono"
                />
                @if (validacion.mensaje(modelo, 'referencia', 'telefono'); as mensaje) {
                  <small id="error-modelo-telefono" class="text-danger" role="alert">{{
                    mensaje
                  }}</small>
                }
              </div>
            </div>

            <div class="grid-tres mt-3">
              <div class="form-group">
                <label for="titulo">Título o Profesión</label>
                <input
                  [attr.aria-describedby]="'error-modelo-titulo'"
                  id="titulo"
                  type="text"
                  class="form-control"
                  [(ngModel)]="modelo.titulo"
                  placeholder="Ej. Abogado"
                  data-testid="input-titulo-ref"
                />
                @if (validacion.mensaje(modelo, 'referencia', 'titulo'); as mensaje) {
                  <small id="error-modelo-titulo" class="text-danger" role="alert">{{
                    mensaje
                  }}</small>
                }
              </div>

              <div class="form-group">
                <label for="cargoActual">Cargo Actual</label>
                <input
                  [attr.aria-describedby]="'error-modelo-cargoActual'"
                  id="cargoActual"
                  type="text"
                  class="form-control"
                  [(ngModel)]="modelo.cargoActual"
                  placeholder="Ej. Coordinador Académico"
                  data-testid="input-cargo-ref"
                />
                @if (validacion.mensaje(modelo, 'referencia', 'cargoActual'); as mensaje) {
                  <small id="error-modelo-cargoActual" class="text-danger" role="alert">{{
                    mensaje
                  }}</small>
                }
              </div>

              <div class="form-group">
                <label for="empresa">Institución / Empresa</label>
                <input
                  [attr.aria-describedby]="'error-modelo-empresa'"
                  id="empresa"
                  type="text"
                  class="form-control"
                  [(ngModel)]="modelo.empresa"
                  placeholder="Ej. Ministerio de Educación"
                  data-testid="input-empresa-ref"
                />
                @if (validacion.mensaje(modelo, 'referencia', 'empresa'); as mensaje) {
                  <small id="error-modelo-empresa" class="text-danger" role="alert">{{
                    mensaje
                  }}</small>
                }
              </div>
            </div>

            @if (errorFormulario()) {
              <div class="alert alert-danger mt-2" data-testid="error-referencia">
                {{ errorFormulario() }}
              </div>
            }

            <div class="form-botones-item mt-4">
              <button type="button" class="btn btn-secondary btn-sm" (click)="cancelarFormulario()">
                Cancelar
              </button>
              <button
                type="button"
                class="btn btn-primary btn-sm"
                [disabled]="guardando() || validacion.invalido(modelo, 'referencia')"
                (click)="guardar()"
                data-testid="btn-guardar-referencia"
              >
                {{ guardando() ? 'Guardando...' : 'Guardar Referencia' }}
              </button>
            </div>
          </div>
        }

        <!-- Tabla de Referencias Activas -->
        <div class="table-container mt-3">
          <table class="data-table" data-testid="tabla-referencias">
            <thead>
              <tr>
                <th>Contacto</th>
                <th>Teléfono</th>
                <th>Cargo / Profesión</th>
                <th>Institución / Empresa</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (r of listaActiva(); track r.id) {
                <tr>
                  <td>
                    <strong>{{ r.nombresApellidos }}</strong>
                    <app-marca-observacion
                      [marca]="obtenerMarca('referencia', r.id)"
                    ></app-marca-observacion>
                  </td>
                  <td>{{ r.telefono }}</td>
                  <td>{{ r.cargoActual || r.titulo || '—' }}</td>
                  <td>{{ r.empresa || '—' }}</td>
                  <td class="text-right">
                    @if (puedeEditar()) {
                      <button
                        type="button"
                        class="btn-accion btn-editar"
                        (click)="editar(r)"
                        data-testid="btn-editar-referencia"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        class="btn-accion btn-eliminar"
                        (click)="eliminar(r.id)"
                        data-testid="btn-eliminar-referencia"
                      >
                        Eliminar
                      </button>
                    } @else {
                      <span class="text-muted text-sm">Solo lectura</span>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="text-center empty-state">
                    No ha registrado referencias
                    {{ tipoActivo() === 'Personal' ? 'personales' : 'laborales' }} todavía.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal de Advertencia de Cambios sin Guardar en Subpestaña -->
      <app-modal-cambios-sin-guardar
        [guardarDeshabilitado]="validacion.hayErrores()"
        [abierto]="mostrarModalSubtab()"
        [guardando]="guardando()"
        [mensajeError]="errorFormulario()"
        (guardarYContinuar)="guardarYCambiarTipo()"
        (descartarYContinuar)="descartarYCambiarTipo()"
        (quedarse)="cancelarCambioTipo()"
      ></app-modal-cambios-sin-guardar>
    </section>
  `,
  styles: [
    `
      .seccion-referencias {
        padding: 1.25rem 0;
      }
      .seccion-header {
        margin-bottom: 1rem;
      }
      .seccion-titulo {
        font-size: 1.25rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 0.25rem 0;
      }
      .seccion-desc {
        font-size: 0.875rem;
        color: #64748b;
        margin: 0;
      }
      .subtabs-nav {
        display: flex;
        gap: 0.5rem;
        border-bottom: 2px solid #e2e8f0;
        margin-bottom: 1.25rem;
      }
      .subtab-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: transparent;
        border: none;
        padding: 0.625rem 1rem;
        font-size: 0.875rem;
        font-weight: 600;
        color: #64748b;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        margin-bottom: -2px;
      }
      .subtab-btn.active {
        color: var(--ammi-primary, #1d1e1c);
        border-bottom-color: var(--ammi-primary, #1d1e1c);
      }
      .tag-aviso {
        background: #fef08a;
        color: #854d0e;
        padding: 0.125rem 0.375rem;
        border-radius: 4px;
        font-size: 0.6875rem;
        font-weight: 700;
      }
      .acciones-barra {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 1rem;
      }
      .card-formulario-item {
        background: var(--geist-surface-subtle, #fafafa);
        border: 1px solid var(--geist-border, #eaeaea);
        border-radius: var(--radius-md, 8px);
        padding: 1.25rem;
        margin-bottom: 1.5rem;
      }
      .form-titulo-item {
        font-size: 1.05rem;
        font-weight: 700;
        color: #1e293b;
        margin: 0 0 1rem 0;
      }
      .grid-dos {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 1rem;
      }
      .grid-tres {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 1rem;
      }
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
      }
      .form-group label {
        font-size: 0.8125rem;
        font-weight: 600;
        color: #475569;
      }
      .form-control {
        padding: 0.5rem 0.75rem;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        font-size: 0.875rem;
        background-color: #ffffff;
      }
      .form-botones-item {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
      }
      .data-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.875rem;
      }
      .data-table th {
        background: #f1f5f9;
        padding: 0.625rem 0.875rem;
        text-align: left;
        font-weight: 600;
        color: #475569;
        border-bottom: 1px solid #cbd5e1;
      }
      .data-table td {
        padding: 0.625rem 0.875rem;
        border-bottom: 1px solid #f1f5f9;
        color: #1e293b;
      }
      .btn-accion {
        background: transparent;
        border: none;
        cursor: pointer;
        font-size: 0.8125rem;
        font-weight: 600;
        margin-left: 0.5rem;
      }
      .btn-editar {
        color: var(--ammi-primary, #1d1e1c);
      }
      .btn-eliminar {
        color: #ef4444;
      }
      .btn {
        padding: 0.5rem 1rem;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        border: none;
      }
      .btn-sm {
        padding: 0.375rem 0.75rem;
        font-size: 0.8125rem;
      }
      .btn-primary {
        background: var(--ammi-primary, #1d1e1c);
        border: 1px solid var(--ammi-primary, #1d1e1c);
        color: #ffffff;
      }
      .btn-secondary {
        background: #e2e8f0;
        color: #334155;
      }
      .text-right {
        text-align: right;
      }
      .text-muted {
        color: #94a3b8;
      }
      .text-sm {
        font-size: 0.8125rem;
      }
      .mt-2 {
        margin-top: 0.5rem;
      }
      .mt-3 {
        margin-top: 0.75rem;
      }
      .mt-4 {
        margin-top: 1rem;
      }
      .text-danger {
        color: #dc2626;
      }
      .alert-danger {
        background: #fee2e2;
        color: #991b1b;
        padding: 0.5rem 0.75rem;
        border-radius: 6px;
        font-size: 0.875rem;
      }
      .empty-state {
        color: #94a3b8;
        padding: 1.5rem !important;
      }
    `,
  ],
})
export class ReferenciasComponent implements OnInit, OnDestroy, SeccionConCambios {
  readonly validacion = inject(ValidacionHojaDeVidaService);
  private readonly registroValidacion = this.validacion.registrarFormulario(
    'referencias',
    () => this.mostrarFormulario() && this.validacion.invalido(this.modelo, 'referencia'),
    inject(DestroyRef),
  );
  readonly mostrarModalSubtab = signal(false);
  tipoPendiente?: 'Personal' | 'Laboral';

  intentarCambiarTipo(tipo: 'Personal' | 'Laboral'): void {
    if (this.tipoActivo() === tipo) return;
    if (this.tieneCambios()) {
      this.tipoPendiente = tipo;
      this.mostrarModalSubtab.set(true);
      return;
    }
    this.cambiarTipo(tipo);
  }

  guardarYCambiarTipo(): void {
    this.guardarCambios().subscribe((ok) => {
      if (ok) {
        this.mostrarModalSubtab.set(false);
        if (this.tipoPendiente) {
          this.cambiarTipo(this.tipoPendiente);
          this.tipoPendiente = undefined;
        }
      }
    });
  }

  descartarYCambiarTipo(): void {
    this.descartarCambios();
    this.mostrarModalSubtab.set(false);
    if (this.tipoPendiente) {
      this.cambiarTipo(this.tipoPendiente);
      this.tipoPendiente = undefined;
    }
  }

  cancelarCambioTipo(): void {
    this.mostrarModalSubtab.set(false);
    this.tipoPendiente = undefined;
  }

  ngOnInit(): void {
    this.state.registrarSeccion?.(this);
  }

  ngOnDestroy(): void {
    this.state.desregistrarSeccion?.(this);
  }

  tieneCambios(): boolean {
    if (!this.puedeEditar()) return false;
    if (this.mostrarFormulario()) {
      return !!(
        this.idEdicion() ||
        this.modelo.nombresApellidos?.trim() ||
        this.modelo.telefono?.trim() ||
        this.modelo.titulo?.trim() ||
        this.modelo.cargoActual?.trim() ||
        this.modelo.empresa?.trim()
      );
    }
    return false;
  }

  guardarCambios(): Observable<boolean> {
    if (!this.puedeEditar()) return of(true);
    if (!this.mostrarFormulario()) return of(true);
    return this.guardarObservable();
  }

  descartarCambios(): void {
    this.cancelarFormulario();
    this.state.actualizarEstadoCambios?.();
  }

  private readonly state = inject(HojaDeVidaStateService);

  readonly puedeEditar = this.state.puedeEditar;
  readonly guardando = this.state.guardando;
  readonly referencias = this.state.referencias;

  readonly tipoActivo = signal<'Personal' | 'Laboral'>('Personal');
  readonly mostrarFormulario = signal(false);
  readonly idEdicion = signal<string | undefined>(undefined);
  readonly errorFormulario = signal('');

  readonly personales = computed(() =>
    this.referencias().filter((r) => r.tipo.toLowerCase() === 'personal'),
  );

  readonly laborales = computed(() =>
    this.referencias().filter((r) => r.tipo.toLowerCase() === 'laboral'),
  );

  readonly listaActiva = computed(() =>
    this.tipoActivo() === 'Personal' ? this.personales() : this.laborales(),
  );

  modelo: GuardarReferenciaRequest = {
    tipo: 'Personal',
    nombresApellidos: '',
    telefono: '',
    titulo: '',
    cargoActual: '',
    empresa: '',
  };

  cambiarTipo(tipo: 'Personal' | 'Laboral'): void {
    this.tipoActivo.set(tipo);
    this.cancelarFormulario();
  }

  abrirFormulario(): void {
    if (this.tipoActivo() === 'Personal' && this.personales().length >= 5) {
      this.errorFormulario.set('No puede registrar más de 5 referencias personales (RF-HDV-016).');
      return;
    }
    if (this.tipoActivo() === 'Laboral' && this.laborales().length >= 5) {
      this.errorFormulario.set('No puede registrar más de 5 referencias laborales (RF-HDV-016).');
      return;
    }

    this.idEdicion.set(undefined);
    this.errorFormulario.set('');
    this.modelo = {
      tipo: this.tipoActivo(),
      nombresApellidos: '',
      telefono: '',
      titulo: '',
      cargoActual: '',
      empresa: '',
    };
    this.mostrarFormulario.set(true);
  }

  editar(r: ReferenciaDto): void {
    this.idEdicion.set(r.id);
    this.errorFormulario.set('');
    this.modelo = {
      tipo: r.tipo,
      nombresApellidos: r.nombresApellidos,
      telefono: r.telefono,
      titulo: r.titulo,
      cargoActual: r.cargoActual,
      empresa: r.empresa,
    };
    this.mostrarFormulario.set(true);
  }

  cancelarFormulario(): void {
    this.mostrarFormulario.set(false);
    this.idEdicion.set(undefined);
  }

  guardarObservable(): Observable<boolean> {
    if (!this.modelo.nombresApellidos?.trim()) {
      this.errorFormulario.set('Nombres y apellidos son obligatorios.');
      return of(false);
    }
    if (!this.modelo.telefono?.trim()) {
      this.errorFormulario.set('El teléfono de contacto es obligatorio.');
      return of(false);
    }

    this.modelo.tipo = this.tipoActivo();

    if (this.validacion.invalido(this.modelo, 'referencia')) return of(false);
    return this.state.guardarReferencia(this.modelo, this.idEdicion()).pipe(
      map(() => {
        this.cancelarFormulario();
        this.state.actualizarEstadoCambios?.();
        return true;
      }),
      catchError((err) => {
        this.validacion.registrarError(err, this.modelo);
        this.errorFormulario.set(mensajeError(err, 'Error al guardar la referencia.'));
        return of(false);
      }),
    );
  }

  guardar(): void {
    this.guardarObservable().subscribe();
  }

  eliminar(id: string): void {
    if (!confirm('¿Está seguro de eliminar esta referencia?')) return;
    this.state.eliminarReferencia(id).subscribe();
  }

  obtenerMarca(tipoDestino: string, claveDestino: string) {
    return this.state.obtenerMarcaParaItem(tipoDestino, claveDestino);
  }
}
