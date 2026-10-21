import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth';

@Component({
  selector: 'app-usuario-dashboard',
  template: `
    <section class="dashboard-section">
      <header class="section-header">
        <h1 class="section-title">Panel de Actualización de Datos</h1>
        <p class="section-subtitle">
          Bienvenido, {{ authService.sesion()?.nombre }}. Completa tus datos y documentos dentro de
          la campaña activa.
        </p>
      </header>
      <div class="card-info">
        <p><strong>Cédula:</strong> {{ authService.sesion()?.cedula }}</p>
        <p><strong>Rol:</strong> {{ authService.sesion()?.rol }}</p>
        <p><strong>Estado de campaña:</strong> Próxima apertura (Issue #11)</p>
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
export class UsuarioDashboardComponent {
  protected readonly authService = inject(AuthService);
}
