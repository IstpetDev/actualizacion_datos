import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth';

@Component({
  selector: 'app-supervisor-dashboard',
  template: `
    <section class="dashboard-section">
      <header class="section-header">
        <h1 class="section-title">Módulo de Revisión y Validación</h1>
        <p class="section-subtitle">
          Sesión de {{ authService.sesion()?.nombre }}. Revisión de carpetas y aprobaciones de datos
          institucionales.
        </p>
      </header>
      <div class="card-info">
        <p><strong>Rol activo:</strong> {{ authService.sesion()?.rol }}</p>
        <p><strong>Institución:</strong> {{ authService.sesion()?.institucionId }}</p>
        <p><strong>Funcionalidad:</strong> Bandeja de solicitudes de revisión (Issue #12)</p>
      </div>
    </section>
  `,
  styles: `
    .dashboard-section {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      padding: 1.5rem;
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
    .card-info {
      font-size: 0.875rem;
      color: #334155;
      line-height: 1.6;
    }
  `,
})
export class SupervisorDashboardComponent {
  protected readonly authService = inject(AuthService);
}
