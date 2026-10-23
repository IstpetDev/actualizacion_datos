import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GuardarReferenciaRequest, ReferenciaDto } from '../../../../../api-client';
import { MarcaObservacionComponent } from '../../componentes/marca-observacion.component';
import { HojaDeVidaStateService } from '../../servicios/hoja-de-vida-state.service';

@Component({
  selector: 'app-referencias',
  standalone: true,
  imports: [CommonModule, FormsModule, MarcaObservacionComponent],
  template: `
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
          (click)="cambiarTipo('Personal')"
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
          (click)="cambiarTipo('Laboral')"
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
                  id="nombresApellidos"
                  type="text"
                  class="form-control"
                  [(ngModel)]="modelo.nombresApellidos"
                  placeholder="Ej. Ing. Carlos Andrade"
                  data-testid="input-nombres-apellidos"
                />
              </div>

              <div class="form-group">
                <label for="telefono"
                  >Teléfono / Celular de Contacto <span class="text-danger">*</span></label
                >
                <input
                  id="telefono"
                  type="tel"
                  class="form-control"
                  [(ngModel)]="modelo.telefono"
                  placeholder="Ej. 0991234567"
                  data-testid="input-telefono"
                />
              </div>
            </div>

            <div class="grid-tres mt-3">
              <div class="form-group">
                <label for="titulo">Título o Profesión</label>
                <input
                  id="titulo"
                  type="text"
                  class="form-control"
                  [(ngModel)]="modelo.titulo"
                  placeholder="Ej. Abogado"
                  data-testid="input-titulo-ref"
                />
              </div>

              <div class="form-group">
                <label for="cargoActual">Cargo Actual</label>
                <input
                  id="cargoActual"
                  type="text"
                  class="form-control"
                  [(ngModel)]="modelo.cargoActual"
                  placeholder="Ej. Coordinador Académico"
                  data-testid="input-cargo-ref"
                />
              </div>

              <div class="form-group">
                <label for="empresa">Institución / Empresa</label>
                <input
                  id="empresa"
                  type="text"
                  class="form-control"
                  [(ngModel)]="modelo.empresa"
                  placeholder="Ej. Ministerio de Educación"
                  data-testid="input-empresa-ref"
                />
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
                [disabled]="guardando()"
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
        background: rgba(255, 255, 255, 0.78);
        backdrop-filter: blur(14px);
        border: 1px solid rgba(255, 255, 255, 0.9);
        outline: 1px solid rgba(148, 163, 184, 0.28);
        border-radius: 12px;
        box-shadow: var(--glass-shadow-sm);
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
export class ReferenciasComponent {
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

  guardar(): void {
    if (!this.modelo.nombresApellidos?.trim()) {
      this.errorFormulario.set('Nombres y apellidos son obligatorios.');
      return;
    }
    if (!this.modelo.telefono?.trim()) {
      this.errorFormulario.set('El teléfono de contacto es obligatorio.');
      return;
    }

    this.modelo.tipo = this.tipoActivo();

    this.state.guardarReferencia(this.modelo, this.idEdicion()).subscribe({
      next: () => this.cancelarFormulario(),
      error: (err) => this.errorFormulario.set(err?.message || 'Error al guardar la referencia.'),
    });
  }

  eliminar(id: string): void {
    if (!confirm('¿Está seguro de eliminar esta referencia?')) return;
    this.state.eliminarReferencia(id).subscribe();
  }

  obtenerMarca(tipoDestino: string, claveDestino: string) {
    return this.state.obtenerMarcaParaItem(tipoDestino, claveDestino);
  }
}
