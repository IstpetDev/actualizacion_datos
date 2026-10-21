import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth';

@Component({
  selector: 'app-superadmin-dashboard',
  template: `
    <section class="dashboard-section">
      <header class="section-header">
        <h1 class="section-title">Módulo de Plataforma Global (Superadmin)</h1>
        <p class="section-subtitle">
          Sesión de {{ authService.sesion()?.nombre }}. Gestión multitenant de instituciones y
          delegación de administradores.
        </p>
      </header>
      <div class="card-info">
        <p><strong>Rol activo:</strong> {{ authService.sesion()?.rol }}</p>
        <p><strong>Cobertura:</strong> Operación entre instituciones educativas (Superadmin)</p>
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
export class SuperadminDashboardComponent {
  protected readonly authService = inject(AuthService);
}
