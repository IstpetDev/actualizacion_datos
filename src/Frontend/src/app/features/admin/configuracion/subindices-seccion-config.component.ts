import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ConfiguracionClient,
  GuardarSubindiceSeccionRequest,
  SubindiceSeccionDto,
  TipoFuncionarioDto,
} from '../../../api-client';
import { mensajeError } from '../../../core/auth/mensaje-error';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

export interface SeccionSubindiceOpcion {
  codigo: string;
  nombre: string;
}

export const SECCIONES_SUBINDICE: SeccionSubindiceOpcion[] = [
  { codigo: 'formacion', nombre: 'Formación académica' },
  { codigo: 'experiencia', nombre: 'Experiencia laboral' },
  { codigo: 'capacitaciones', nombre: 'Capacitaciones' },
  { codigo: 'referencias', nombre: 'Referencias' },
];

@Component({
  selector: 'app-subindices-seccion-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="subindices-config" data-testid="panel-subindices-config">
      <header class="bloque-header">
        <div>
          <h3 class="bloque-titulo">Subíndices Libres por Sección</h3>
          <p class="bloque-desc">
            Configure subcategorías o requisitos diferenciados de texto libre dentro de cada sección
            de la hoja de vida (ej. Títulos de 3er Nivel, Títulos de 4to Nivel, Título SENESCYT),
            generales o por tipo de funcionario.
          </p>
        </div>
        <div class="header-acciones">
          @if (!mostrarFormulario()) {
            <button
              type="button"
              class="btn btn-primary btn-sm"
              (click)="abrirFormulario()"
              data-testid="btn-nuevo-subindice"
            >
              + Nuevo Subíndice
            </button>
          }
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            (click)="cargarDatos()"
            [disabled]="cargando()"
            data-testid="btn-recargar-subindices"
          >
            {{ cargando() ? 'Cargando...' : 'Recargar' }}
          </button>
        </div>
      </header>

      @if (mensajeExito()) {
        <div class="alert alert-success" role="alert" data-testid="mensaje-exito-subindice">
          {{ mensajeExito() }}
        </div>
      }
      @if (error()) {
        <div class="alert alert-danger" role="alert" data-testid="mensaje-error-subindice">
          {{ error() }}
        </div>
      }

      <div class="filtros-seccion" role="tablist" aria-label="Filtrar subíndices por sección">
        <button
          type="button"
          class="chip-filtro"
          [class.activo]="filtroSeccion() === 'todas'"
          (click)="filtroSeccion.set('todas')"
          data-testid="filtro-subindice-todas"
        >
          Todas ({{ subindices().length }})
        </button>
        @for (sec of secciones; track sec.codigo) {
          <button
            type="button"
            class="chip-filtro"
            [class.activo]="filtroSeccion() === sec.codigo"
            (click)="filtroSeccion.set(sec.codigo)"
            [attr.data-testid]="'filtro-subindice-' + sec.codigo"
          >
            {{ sec.nombre }} ({{ contarPorSeccion(sec.codigo) }})
          </button>
        }
      </div>

      @if (mostrarFormulario()) {
        <div class="card-formulario" data-testid="form-subindice">
          <h4>{{ idEdicion() ? 'Editar Subíndice' : 'Nuevo Subíndice de Sección' }}</h4>
          <div class="grid-dos">
            <div class="form-group">
              <label for="subSeccion">Sección <span class="text-danger">*</span></label>
              <select
                id="subSeccion"
                class="form-control"
                [(ngModel)]="modelo.seccion"
                data-testid="select-seccion-subindice"
              >
                @for (sec of secciones; track sec.codigo) {
                  <option [value]="sec.codigo">{{ sec.nombre }}</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label for="subNombre"
                >Nombre del Subíndice (libre) <span class="text-danger">*</span></label
              >
              <input
                id="subNombre"
                type="text"
                maxlength="150"
                class="form-control"
                [(ngModel)]="modelo.nombre"
                placeholder="Ej. Títulos de 3er Nivel, Título SENESCYT..."
                data-testid="input-nombre-subindice"
              />
            </div>
          </div>

          <div class="grid-tres mt-3">
            <div class="form-group">
              <label for="subAlcance">Alcance</label>
              <select
                id="subAlcance"
                class="form-control"
                [(ngModel)]="modelo.tipoFuncionarioId"
                data-testid="select-alcance-subindice"
              >
                <option [ngValue]="undefined">Todas las personas (General)</option>
                @for (tf of tiposFuncionario(); track tf.id) {
                  <option [ngValue]="tf.id">{{ tf.nombre }} ({{ tf.codigo }})</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label for="subOrden">Orden de visualización</label>
              <input
                id="subOrden"
                type="number"
                min="0"
                class="form-control"
                [(ngModel)]="modelo.orden"
                data-testid="input-orden-subindice"
              />
            </div>

            <div class="checks-fila">
              <label class="check-label">
                <input
                  type="checkbox"
                  [(ngModel)]="modelo.esObligatorio"
                  data-testid="check-obligatorio-subindice"
                />
                <span>Obligatorio para envío</span>
              </label>
              @if (idEdicion()) {
                <label class="check-label">
                  <input
                    type="checkbox"
                    [(ngModel)]="modelo.activo"
                    data-testid="check-activo-subindice"
                  />
                  <span>Activo</span>
                </label>
              }
            </div>
          </div>

          <div class="form-group mt-3">
            <label for="subDescripcion">Indicación para la persona (opcional)</label>
            <input
              id="subDescripcion"
              type="text"
              maxlength="500"
              class="form-control"
              [(ngModel)]="modelo.descripcion"
              placeholder="Ej. Adjunte el certificado registrado en SENESCYT en formato PDF"
              data-testid="input-descripcion-subindice"
            />
          </div>

          <div class="form-botones mt-3">
            <button type="button" class="btn btn-secondary btn-sm" (click)="cancelarFormulario()">
              Cancelar
            </button>
            <button
              type="button"
              class="btn btn-primary btn-sm"
              [disabled]="guardando() || !modelo.nombre.trim()"
              (click)="guardar()"
              data-testid="btn-guardar-subindice"
            >
              {{ guardando() ? 'Guardando...' : idEdicion() ? 'Actualizar' : 'Crear Subíndice' }}
            </button>
          </div>
        </div>
      }

      <div class="table-container">
        <table class="data-table" data-testid="tabla-subindices-seccion">
          <thead>
            <tr>
              <th>Sección</th>
              <th>Subíndice</th>
              <th>Alcance</th>
              <th>Exigencia</th>
              <th>Orden</th>
              <th>Estado</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (sub of subindicesFiltrados(); track sub.id) {
              <tr [attr.data-testid]="'fila-subindice-' + sub.id">
                <td>
                  <span class="badge badge-sec">{{ nombreSeccion(sub.seccion) }}</span>
                </td>
                <td>
                  <strong>{{ sub.nombre }}</strong>
                  @if (sub.descripcion) {
                    <div class="desc-texto">{{ sub.descripcion }}</div>
                  }
                </td>
                <td>{{ nombreTipoFuncionario(sub.tipoFuncionarioId) }}</td>
                <td>
                  <span
                    class="badge"
                    [class.badge-warn]="sub.esObligatorio"
                    [class.badge-sec]="!sub.esObligatorio"
                  >
                    {{ sub.esObligatorio ? 'Obligatorio' : 'Opcional' }}
                  </span>
                </td>
                <td>{{ sub.orden }}</td>
                <td>
                  <span class="badge" [class.badge-ok]="sub.activo" [class.badge-off]="!sub.activo">
                    {{ sub.activo ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="text-right">
                  <button
                    type="button"
                    class="btn-link"
                    (click)="editar(sub)"
                    [attr.data-testid]="'btn-editar-subindice-' + sub.id"
                  >
                    Editar
                  </button>
                  @if (sub.activo) {
                    <button
                      type="button"
                      class="btn-link danger"
                      (click)="desactivar(sub)"
                      [attr.data-testid]="'btn-desactivar-subindice-' + sub.id"
                    >
                      Desactivar
                    </button>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="empty-msg">
                  No hay subíndices configurados para el filtro seleccionado.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: `
    .bloque-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .bloque-titulo {
      margin: 0 0 0.25rem;
      font-size: 1.1rem;
      color: #0f172a;
    }
    .bloque-desc {
      margin: 0;
      font-size: 0.85rem;
      color: #64748b;
    }
    .header-acciones,
    .filtros-seccion,
    .form-botones {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .filtros-seccion {
      margin-bottom: 1rem;
    }
    .chip-filtro {
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      border: 1px solid #cbd5e1;
      background: #fff;
      font-size: 0.8rem;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
    }
    .chip-filtro.activo {
      background: #0f172a;
      border-color: #0f172a;
      color: #fff;
    }
    .card-formulario {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
    }
    .card-formulario h4 {
      margin: 0 0 0.75rem;
      font-size: 0.95rem;
    }
    .grid-dos {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 0.75rem;
    }
    .grid-tres {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 0.75rem;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .form-group label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #334155;
    }
    .form-control {
      padding: 0.45rem 0.65rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.85rem;
      background: #fff;
    }
    .checks-fila {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding-top: 1.2rem;
    }
    .check-label {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
    }
    .form-botones {
      justify-content: flex-end;
    }
    .mt-3 {
      margin-top: 0.75rem;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }
    .data-table th,
    .data-table td {
      padding: 0.6rem 0.75rem;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
    }
    .data-table th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 600;
    }
    .desc-texto {
      font-size: 0.76rem;
      color: #64748b;
      margin-top: 0.15rem;
    }
    .badge {
      display: inline-block;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 600;
    }
    .badge-sec {
      background: #e2e8f0;
      color: #334155;
    }
    .badge-warn {
      background: #fef3c7;
      color: #92400e;
    }
    .badge-ok {
      background: #dcfce7;
      color: #15803d;
    }
    .badge-off {
      background: #f1f5f9;
      color: #64748b;
    }
    .btn {
      padding: 0.4rem 0.8rem;
      border-radius: 6px;
      font-size: 0.82rem;
      font-weight: 600;
      border: none;
      cursor: pointer;
    }
    .btn-primary {
      background: #0f172a;
      color: #fff;
    }
    .btn-secondary {
      background: #e2e8f0;
      color: #334155;
    }
    .btn-link {
      background: none;
      border: none;
      color: #1d4ed8;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      margin-left: 0.5rem;
    }
    .btn-link.danger {
      color: #dc2626;
    }
    .text-right {
      text-align: right;
    }
    .text-danger {
      color: #dc2626;
    }
    .empty-msg {
      text-align: center;
      color: #94a3b8;
      padding: 1.25rem !important;
    }
    .alert {
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      font-size: 0.85rem;
      margin-bottom: 0.75rem;
    }
    .alert-success {
      background: #dcfce7;
      color: #166534;
    }
    .alert-danger {
      background: #fee2e2;
      color: #991b1b;
    }
  `,
})
export class SubindicesSeccionConfigComponent implements OnInit {
  private readonly configClient = inject(ConfiguracionClient);

  readonly secciones = SECCIONES_SUBINDICE;
  readonly subindices = signal<SubindiceSeccionDto[]>([]);
  readonly tiposFuncionario = signal<TipoFuncionarioDto[]>([]);
  readonly filtroSeccion = signal<string>('todas');
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly mostrarFormulario = signal(false);
  readonly idEdicion = signal<string | undefined>(undefined);
  readonly error = signal('');
  readonly mensajeExito = signal('');

  readonly subindicesFiltrados = computed(() => {
    const filtro = this.filtroSeccion();
    const lista = this.subindices();
    return filtro === 'todas' ? lista : lista.filter((s) => s.seccion === filtro);
  });

  modelo: GuardarSubindiceSeccionRequest = this.crearModeloVacio();

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando.set(true);
    this.error.set('');
    forkJoin({
      subindices: this.configClient.listarSubindicesSeccion().pipe(catchError(() => of([]))),
      tipos: this.configClient.listarTiposFuncionario().pipe(catchError(() => of([]))),
    })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe(({ subindices, tipos }) => {
        this.subindices.set(subindices ?? []);
        this.tiposFuncionario.set(tipos ?? []);
      });
  }

  abrirFormulario(): void {
    this.idEdicion.set(undefined);
    this.error.set('');
    this.mensajeExito.set('');
    const seccionInicial = this.filtroSeccion() === 'todas' ? 'experiencia' : this.filtroSeccion();
    this.modelo = this.crearModeloVacio(seccionInicial);
    this.mostrarFormulario.set(true);
  }

  editar(sub: SubindiceSeccionDto): void {
    this.idEdicion.set(sub.id);
    this.error.set('');
    this.mensajeExito.set('');
    this.modelo = {
      seccion: sub.seccion,
      nombre: sub.nombre,
      descripcion: sub.descripcion,
      tipoFuncionarioId: sub.tipoFuncionarioId,
      esObligatorio: sub.esObligatorio,
      orden: sub.orden,
      activo: sub.activo,
    };
    this.mostrarFormulario.set(true);
  }

  cancelarFormulario(): void {
    this.mostrarFormulario.set(false);
    this.idEdicion.set(undefined);
  }

  guardar(): void {
    if (!this.modelo.nombre?.trim()) {
      this.error.set('El nombre del subíndice es obligatorio.');
      return;
    }

    this.guardando.set(true);
    this.error.set('');
    this.mensajeExito.set('');

    const payload: GuardarSubindiceSeccionRequest = {
      seccion: this.modelo.seccion,
      nombre: this.modelo.nombre.trim(),
      descripcion: this.modelo.descripcion?.trim() || undefined,
      tipoFuncionarioId: this.modelo.tipoFuncionarioId || undefined,
      esObligatorio: !!this.modelo.esObligatorio,
      orden: Number(this.modelo.orden ?? 0),
      activo: this.modelo.activo ?? true,
    };

    const id = this.idEdicion();
    const obs = id
      ? this.configClient.actualizarSubindiceSeccion(id, payload)
      : this.configClient.crearSubindiceSeccion(payload);

    obs.pipe(finalize(() => this.guardando.set(false))).subscribe({
      next: () => {
        this.mensajeExito.set(
          id ? 'Subíndice actualizado correctamente.' : 'Subíndice creado correctamente.',
        );
        this.cancelarFormulario();
        this.cargarDatos();
      },
      error: (err) => {
        this.error.set(mensajeError(err, 'No se pudo guardar el subíndice.'));
      },
    });
  }

  desactivar(sub: SubindiceSeccionDto): void {
    this.error.set('');
    this.mensajeExito.set('');
    this.configClient.eliminarSubindiceSeccion(sub.id).subscribe({
      next: () => {
        this.mensajeExito.set(`Subíndice "${sub.nombre}" desactivado.`);
        this.cargarDatos();
      },
      error: (err) => {
        this.error.set(mensajeError(err, 'No se pudo desactivar el subíndice.'));
      },
    });
  }

  contarPorSeccion(codigo: string): number {
    return this.subindices().filter((s) => s.seccion === codigo).length;
  }

  nombreSeccion(codigo: string): string {
    return this.secciones.find((s) => s.codigo === codigo)?.nombre ?? codigo;
  }

  nombreTipoFuncionario(id?: string): string {
    if (!id) return 'Todas las personas';
    return this.tiposFuncionario().find((t) => t.id === id)?.nombre ?? 'Tipo específico';
  }

  private crearModeloVacio(seccion = 'experiencia'): GuardarSubindiceSeccionRequest {
    return {
      seccion,
      nombre: '',
      descripcion: '',
      tipoFuncionarioId: undefined,
      esObligatorio: true,
      orden: 1,
      activo: true,
    };
  }
}
