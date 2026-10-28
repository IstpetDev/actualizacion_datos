import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AdminInicialRequest,
  CrearInstitucionRequest,
  InstitucionDto,
  InstitucionesClient,
} from '../../api-client';
import { AuthService } from '../../core/auth';
import { mensajeError } from '../../core/auth/mensaje-error';
import { PlantillasHojaDeVidaComponent } from './plantillas-hoja-de-vida.component';
import { PoliticasProteccionDatosComponent } from './politicas-proteccion-datos.component';

type TabSuperadmin = 'instituciones' | 'plantillas' | 'politicas-datos';

@Component({
  selector: 'app-superadmin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PlantillasHojaDeVidaComponent,
    PoliticasProteccionDatosComponent,
  ],
  template: `
    <section class="dashboard-section" data-testid="superadmin-panel">
      <header class="section-header">
        <div class="header-titles">
          <h1 class="section-title">Panel Global de Plataforma (Superadmin)</h1>
          <p class="section-subtitle">
            Gestión multitenant de instituciones educativas y provisión de administradores
            iniciales.
          </p>
        </div>
      </header>

      <nav class="superadmin-tabs" role="tablist" aria-label="Secciones Superadmin">
        <button
          type="button"
          class="tab-btn"
          [class.active]="tabActiva() === 'instituciones'"
          (click)="tabActiva.set('instituciones')"
          data-testid="tab-instituciones"
        >
          Instituciones
        </button>
        <button
          type="button"
          class="tab-btn"
          [class.active]="tabActiva() === 'plantillas'"
          (click)="tabActiva.set('plantillas')"
          data-testid="tab-plantillas"
        >
          Plantillas Globales
        </button>
        <button
          type="button"
          class="tab-btn"
          [class.active]="tabActiva() === 'politicas-datos'"
          (click)="tabActiva.set('politicas-datos')"
          data-testid="tab-politicas-datos"
        >
          Políticas de Protección de Datos
        </button>
      </nav>

      @if (tabActiva() === 'instituciones') {
        @if (mensajeExito()) {
          <div class="alert alert-success" role="alert" data-testid="mensaje-exito">
            {{ mensajeExito() }}
          </div>
        }

        @if (error()) {
          <div class="alert alert-danger" role="alert" data-testid="mensaje-error">
            {{ error() }}
          </div>
        }

        <div class="grid-dos-columnas">
          <!-- Formulario Crear Institución (RF-MUL-001) -->
          <div class="card">
            <h2 class="card-title">Registrar Nueva Institución</h2>
            <form (ngSubmit)="crearInstitucion()" data-testid="form-crear-institucion">
              <div class="form-group">
                <label for="nombreInst">Nombre de la Institución:</label>
                <input
                  id="nombreInst"
                  type="text"
                  class="form-control"
                  [(ngModel)]="nombreInstitucion"
                  name="nombreInst"
                  required
                  placeholder="Ej: Instituto Superior Tecnológico Ejemplo"
                  data-testid="input-nombre-institucion"
                />
              </div>

              <h3 class="card-subtitle">Administrador Inicial de la Institución</h3>
              <div class="form-row">
                <div class="form-group col">
                  <label for="adminDoc">Cédula / Documento:</label>
                  <input
                    id="adminDoc"
                    type="text"
                    class="form-control"
                    [(ngModel)]="adminDoc"
                    name="adminDoc"
                    required
                    placeholder="1700000000"
                    data-testid="input-admin-doc"
                  />
                </div>
                <div class="form-group col">
                  <label for="adminNom">Nombre:</label>
                  <input
                    id="adminNom"
                    type="text"
                    class="form-control"
                    [(ngModel)]="adminNom"
                    name="adminNom"
                    placeholder="Nombre y Apellido"
                    data-testid="input-admin-nom"
                  />
                </div>
              </div>
              <div class="form-group">
                <label for="adminCor">Correo Electrónico:</label>
                <input
                  id="adminCor"
                  type="email"
                  class="form-control"
                  [(ngModel)]="adminCor"
                  name="adminCor"
                  placeholder="admin@ejemplo.test"
                  data-testid="input-admin-cor"
                />
              </div>

              <button
                type="submit"
                class="btn btn-primary"
                [disabled]="guardando() || !formularioValido()"
                data-testid="btn-guardar-institucion"
              >
                {{ guardando() ? 'Registrando...' : 'Registrar Institución' }}
              </button>
            </form>
          </div>

          <!-- Listado de Instituciones (RF-MUL-002) -->
          <div class="card">
            <h2 class="card-title">Instituciones Registradas</h2>
            <div class="table-container">
              <table class="data-table" data-testid="tabla-instituciones">
                <thead>
                  <tr>
                    <th>Nombre Institucional</th>
                    <th>ID Identificador</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (inst of instituciones(); track inst.id) {
                    <tr [attr.data-testid]="'fila-inst-' + inst.id">
                      <td>
                        <strong>{{ inst.nombre }}</strong>
                      </td>
                      <td>
                        <small class="text-muted">{{ inst.id }}</small>
                      </td>
                      <td>
                        @if (inst.activa) {
                          <span class="badge badge-success">Activa</span>
                        } @else {
                          <span class="badge badge-secondary">Inactiva</span>
                        }
                      </td>
                      <td>
                        <button
                          type="button"
                          class="btn btn-sm btn-secondary"
                          (click)="irAPoliticas(inst.id)"
                          [attr.data-testid]="'btn-politicas-inst-' + inst.id"
                        >
                          Políticas
                        </button>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="4" class="text-center empty-state">
                        No hay instituciones registradas en el sistema.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      } @else if (tabActiva() === 'plantillas') {
        <app-plantillas-hoja-de-vida />
      } @else {
        <app-politicas-proteccion-datos
          [institucionInicialId]="institucionSeleccionadaParaPoliticas()"
        />
      }
    </section>
  `,
  styles: `
    .dashboard-section {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      padding: 1.5rem;
    }
    .superadmin-tabs {
      display: flex;
      gap: 0.5rem;
      border-bottom: 2px solid #e2e8f0;
      margin-bottom: 1.5rem;
    }
    .tab-btn {
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      padding: 0.5rem 1rem;
      font-size: 0.95rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      margin-bottom: -2px;
    }
    .tab-btn.active {
      color: #2563eb;
      border-bottom-color: #2563eb;
    }
    .section-header {
      margin-bottom: 1.5rem;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 1rem;
    }
    .section-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.25rem 0;
    }
    .section-subtitle {
      font-size: 0.875rem;
      color: #64748b;
      margin: 0;
    }
    .alert {
      padding: 0.75rem 1rem;
      border-radius: 0.375rem;
      margin-bottom: 1rem;
      font-size: 0.875rem;
    }
    .alert-success {
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
    }
    .alert-danger {
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
    }
    .grid-dos-columnas {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.375rem;
      padding: 1.25rem;
    }
    .card-title {
      font-size: 1rem;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 1rem 0;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 0.5rem;
    }
    .card-subtitle {
      font-size: 0.875rem;
      font-weight: 600;
      color: #334155;
      margin: 1rem 0 0.5rem 0;
    }
    .form-group {
      margin-bottom: 0.875rem;
    }
    .form-group label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #475569;
      margin-bottom: 0.25rem;
    }
    .form-control {
      width: 100%;
      box-sizing: border-box;
      padding: 0.5rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.375rem;
      font-size: 0.875rem;
    }
    .form-row {
      display: flex;
      gap: 0.75rem;
    }
    .col {
      flex: 1;
    }
    .table-container {
      overflow-x: auto;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8125rem;
    }
    .data-table th,
    .data-table td {
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
    }
    .data-table th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 600;
    }
    .badge {
      display: inline-block;
      padding: 0.2rem 0.4rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge-success {
      background: #dcfce7;
      color: #166534;
    }
    .badge-secondary {
      background: #e2e8f0;
      color: #475569;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: 0.375rem;
      border: 1px solid transparent;
      cursor: pointer;
    }
    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-primary {
      background: #2563eb;
      color: #ffffff;
    }
    .text-muted {
      color: #64748b;
    }
    .text-center {
      text-align: center;
    }
    .empty-state {
      padding: 1.5rem;
      color: #64748b;
    }
    @media (max-width: 768px) {
      .grid-dos-columnas {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class SuperadminDashboardComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  private readonly institucionesClient = inject(InstitucionesClient);

  readonly tabActiva = signal<TabSuperadmin>('instituciones');
  readonly instituciones = signal<InstitucionDto[]>([]);
  readonly institucionSeleccionadaParaPoliticas = signal<string | undefined>(undefined);
  readonly guardando = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly mensajeExito = signal<string | null>(null);

  nombreInstitucion = '';
  adminDoc = '';
  adminNom = '';
  adminCor = '';

  irAPoliticas(institucionId: string): void {
    this.institucionSeleccionadaParaPoliticas.set(institucionId);
    this.tabActiva.set('politicas-datos');
  }

  ngOnInit(): void {
    this.cargarInstituciones();
  }

  cargarInstituciones(): void {
    this.institucionesClient.listarInstituciones().subscribe({
      next: (lista) => this.instituciones.set(lista),
      error: (err) => this.error.set(mensajeError(err, 'Error al listar instituciones.')),
    });
  }

  formularioValido(): boolean {
    return !!this.nombreInstitucion.trim() && !!this.adminDoc.trim();
  }

  crearInstitucion(): void {
    if (!this.formularioValido()) return;

    this.guardando.set(true);
    this.error.set(null);

    const admins: AdminInicialRequest[] = [
      {
        documento: this.adminDoc.trim(),
        nombre: this.adminNom.trim() || undefined,
        correo: this.adminCor.trim() || undefined,
      },
    ];

    const body: CrearInstitucionRequest = {
      nombre: this.nombreInstitucion.trim(),
      admins,
    };

    this.institucionesClient.crearInstitucion(body).subscribe({
      next: (res) => {
        this.mensajeExito.set(`Institución "${res.nombre}" registrada exitosamente.`);
        this.nombreInstitucion = '';
        this.adminDoc = '';
        this.adminNom = '';
        this.adminCor = '';
        this.guardando.set(false);
        this.cargarInstituciones();
      },
      error: (err) => {
        this.error.set(mensajeError(err, 'Error al registrar la institución.'));
        this.guardando.set(false);
      },
    });
  }
}
