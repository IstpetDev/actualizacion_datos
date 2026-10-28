import { Component, effect, inject, input, OnDestroy, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, Subscription } from 'rxjs';
import {
  AsignarPersonalInstitucionalRequest,
  PersonaDto,
  PersonalInstitucionalClient,
  SupervisoresClient,
} from '../../api-client';
import { mensajeError } from '../../core/auth/mensaje-error';

@Component({
  selector: 'app-personal-institucional',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section aria-labelledby="titulo-personal" data-testid="gestion-personal">
      <header class="encabezado">
        <div>
          <h2 id="titulo-personal">
            {{ institucionId() ? 'Administradores y supervisores' : 'Supervisores' }}
          </h2>
          <p>
            {{
              institucionId()
                ? 'Asigne los responsables de la institución seleccionada.'
                : 'Asigne quiénes pueden revisar los expedientes de su institución.'
            }}
          </p>
        </div>
        <button
          type="button"
          class="secundario"
          (click)="cargar()"
          [disabled]="cargando() || guardando()"
        >
          Actualizar listado
        </button>
      </header>

      <div class="contenido">
        <form #formulario="ngForm" (ngSubmit)="guardar()" data-testid="form-personal">
          <h3>Registrar o asignar</h3>
          <p id="ayuda-personal">
            Si el documento ya está registrado en esta institución, se actualizan únicamente su rol
            y acceso. El nombre y el correo se usan para cuentas nuevas.
          </p>
          <fieldset [disabled]="guardando()">
            <label for="documento-personal">Cédula / documento</label>
            <input
              id="documento-personal"
              name="documento"
              [(ngModel)]="modelo.documento"
              required
              pattern="[0-9]{10}"
              maxlength="10"
              inputmode="numeric"
              autocomplete="off"
              aria-describedby="ayuda-personal"
            />
            <label for="nombre-personal">Nombre completo (cuenta nueva)</label>
            <input
              id="nombre-personal"
              name="nombre"
              [(ngModel)]="modelo.nombre"
              maxlength="403"
              autocomplete="name"
            />
            <label for="correo-personal">Correo electrónico (cuenta nueva)</label>
            <input
              id="correo-personal"
              name="correo"
              [(ngModel)]="modelo.correo"
              type="email"
              email
              maxlength="200"
              autocomplete="email"
            />
            @if (institucionId()) {
              <label for="rol-personal">Rol que se asignará</label>
              <select id="rol-personal" name="rol" [(ngModel)]="modelo.rol" required>
                <option value="Supervisor">Supervisor</option>
                <option value="Admin">Administrador</option>
              </select>
            } @else {
              <p class="rol-fijo">Rol que se asignará: <strong>Supervisor</strong></p>
            }
          </fieldset>
          @if (exito()) {
            <p class="exito" role="status">{{ exito() }}</p>
          }
          @if (errorGuardado()) {
            <p class="error" role="alert">{{ errorGuardado() }}</p>
          }
          <button
            type="submit"
            class="primario"
            [disabled]="cargando() || guardando() || formulario.invalid"
            data-testid="guardar-personal"
          >
            {{ guardando() ? 'Guardando…' : 'Guardar asignación' }}
          </button>
        </form>

        <div class="listado">
          <h3>{{ institucionId() ? 'Personal asignado' : 'Supervisores asignados' }}</h3>
          @if (cargando()) {
            <p role="status">Cargando personal…</p>
          } @else if (errorCarga()) {
            <p class="error" role="alert">{{ errorCarga() }}</p>
            <button type="button" class="secundario" (click)="cargar()">Reintentar</button>
          } @else {
            <div
              class="tabla-contenedor"
              tabindex="0"
              role="region"
              aria-label="Personal de la institución"
            >
              <table>
                <thead>
                  <tr>
                    <th scope="col">Persona</th>
                    <th scope="col">Rol</th>
                    <th scope="col">Acceso</th>
                    <th scope="col">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  @for (persona of personal(); track persona.id) {
                    <tr>
                      <td>
                        <strong>{{ persona.nombre || 'Sin nombre registrado' }}</strong
                        ><span>{{ persona.documento }}</span>
                      </td>
                      <td>{{ persona.rol === 'Admin' ? 'Administrador' : 'Supervisor' }}</td>
                      <td>{{ persona.accesoHabilitado ? 'Habilitado' : 'Deshabilitado' }}</td>
                      <td>
                        <button
                          type="button"
                          class="secundario"
                          [disabled]="guardando()"
                          (click)="seleccionar(persona)"
                          [attr.aria-label]="'Seleccionar ' + (persona.nombre || persona.documento)"
                        >
                          Seleccionar
                        </button>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="4">
                        {{
                          institucionId()
                            ? 'No hay administradores ni supervisores asignados.'
                            : 'No hay supervisores asignados.'
                        }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .encabezado {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    h2 {
      margin: 0 0 0.5rem;
      font-size: 1.2rem;
      color: #0f172a;
    }
    h3 {
      margin: 0 0 1rem;
      font-size: 1rem;
    }
    p {
      color: #475569;
      line-height: 1.6;
      margin: 0 0 1rem;
    }
    .contenido {
      display: grid;
      grid-template-columns: minmax(260px, 360px) minmax(0, 1fr);
      gap: 1.5rem;
    }
    form,
    .listado {
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      padding: 1.25rem;
      background: white;
      min-width: 0;
    }
    fieldset {
      border: 0;
      padding: 0;
      margin: 0 0 1rem;
      min-width: 0;
    }
    label {
      display: block;
      font-size: 0.875rem;
      font-weight: 600;
      margin: 1rem 0 0.375rem;
    }
    input,
    select {
      box-sizing: border-box;
      width: 100%;
      padding: 0.65rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.375rem;
      background: white;
      color: #0f172a;
      font: inherit;
    }
    button {
      padding: 0.6rem 0.85rem;
      border-radius: 0.375rem;
      font: inherit;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid #cbd5e1;
    }
    button:active:not(:disabled) {
      transform: scale(0.97);
    }
    .primario {
      background: var(--ammi-primary, #1d1e1c);
      color: white;
      border-color: var(--ammi-primary, #1d1e1c);
    }
    .secundario {
      background: white;
      color: #334155;
    }
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    :is(button, input, select, .tabla-contenedor):focus-visible {
      outline: 2px solid #2563eb;
      outline-offset: 3px;
    }
    .tabla-contenedor {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.875rem;
    }
    th,
    td {
      padding: 0.8rem 0.6rem;
      border-bottom: 1px solid #e2e8f0;
    }
    th {
      color: #475569;
      font-weight: 600;
    }
    td span {
      display: block;
      margin-top: 0.25rem;
      color: #64748b;
    }
    .rol-fijo {
      margin-top: 1rem;
    }
    .exito {
      color: #166534;
      background: #f0fdf4;
      padding: 0.75rem;
      border-radius: 0.375rem;
    }
    .error {
      color: #b91c1c;
      background: #fef2f2;
      padding: 0.75rem;
      border-radius: 0.375rem;
    }
    @media (max-width: 850px) {
      .contenido {
        grid-template-columns: 1fr;
      }
      .encabezado {
        flex-direction: column;
      }
    }
  `,
})
export class PersonalInstitucionalComponent implements OnDestroy {
  readonly institucionId = input<string>();
  readonly asignado = output<void>();
  private readonly global = inject(PersonalInstitucionalClient);
  private readonly supervisores = inject(SupervisoresClient);
  readonly personal = signal<PersonaDto[]>([]);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly errorCarga = signal('');
  readonly errorGuardado = signal('');
  readonly exito = signal('');
  modelo: AsignarPersonalInstitucionalRequest = { documento: '', rol: 'Supervisor' };
  private carga?: Subscription;
  private guardado?: Subscription;

  constructor() {
    effect(() => {
      const id = this.institucionId();
      this.guardado?.unsubscribe();
      this.modelo = { documento: '', rol: 'Supervisor' };
      this.personal.set([]);
      this.exito.set('');
      this.errorGuardado.set('');
      this.cargar(id);
    });
  }

  cargar(id = this.institucionId()): void {
    this.carga?.unsubscribe();
    this.cargando.set(true);
    this.errorCarga.set('');
    const consulta = id
      ? this.global.listarPersonalInstitucion(id)
      : this.supervisores.listarSupervisores();
    this.carga = consulta.pipe(finalize(() => this.cargando.set(false))).subscribe({
      next: (personal) => this.personal.set(personal),
      error: (error: unknown) =>
        this.errorCarga.set(mensajeError(error, 'No se pudo cargar el personal.')),
    });
  }

  seleccionar(persona: PersonaDto): void {
    this.modelo = {
      documento: persona.documento,
      rol: this.institucionId() ? persona.rol : 'Supervisor',
    };
    this.exito.set('');
    this.errorGuardado.set('');
    document.getElementById('documento-personal')?.focus();
  }

  guardar(): void {
    if (this.cargando() || this.guardando() || !/^[0-9]{10}$/.test(this.modelo.documento)) return;
    const id = this.institucionId();
    const solicitud = { ...this.modelo, rol: id ? this.modelo.rol : 'Supervisor' };
    this.guardando.set(true);
    this.exito.set('');
    this.errorGuardado.set('');
    const operacion = id
      ? this.global.asignarPersonalInstitucion(id, solicitud)
      : this.supervisores.asignarSupervisor(solicitud);
    this.guardado = operacion.pipe(finalize(() => this.guardando.set(false))).subscribe({
      next: (persona) => {
        this.errorCarga.set('');
        this.personal.update((actual) => [...actual.filter((p) => p.id !== persona.id), persona]);
        this.modelo = { documento: '', rol: 'Supervisor' };
        this.exito.set('Asignación guardada. El acceso de la persona está habilitado.');
        this.asignado.emit();
      },
      error: (error: unknown) =>
        this.errorGuardado.set(mensajeError(error, 'No se pudo guardar la asignación.')),
    });
  }

  ngOnDestroy(): void {
    this.carga?.unsubscribe();
    this.guardado?.unsubscribe();
  }
}
