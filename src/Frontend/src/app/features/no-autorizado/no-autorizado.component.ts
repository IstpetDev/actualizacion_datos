import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth';

@Component({
  selector: 'app-no-autorizado',
  template: `
    <div class="forbidden-card">
      <div class="status-code">403</div>
      <h1 class="forbidden-title">Acceso no autorizado</h1>
      <p class="forbidden-message">
        Tu rol actual
        @if (authService.rolActual(); as rol) {
          (<strong class="highlight-role">{{ rol }}</strong
          >)
        }
        no posee los permisos requeridos para acceder a este módulo.
      </p>
      <div class="actions">
        <button type="button" class="btn-back" (click)="volver()">
          Volver a mi módulo principal
        </button>
      </div>
    </div>
  `,
  styles: `
    .forbidden-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      padding: 3rem 2rem;
      text-align: center;
      max-width: 540px;
      margin: 2rem auto;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .status-code {
      font-size: 3rem;
      font-weight: 800;
      color: #dc2626;
      line-height: 1;
      margin-bottom: 0.75rem;
    }
    .forbidden-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.5rem 0;
    }
    .forbidden-message {
      font-size: 0.95rem;
      color: #64748b;
      line-height: 1.5;
      margin: 0 0 1.5rem 0;
    }
    .highlight-role {
      color: #0f172a;
      text-transform: uppercase;
    }
    .btn-back {
      padding: 0.625rem 1.25rem;
      background-color: #0f172a;
      color: #ffffff;
      font-size: 0.875rem;
      font-weight: 600;
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: background-color 150ms ease-in-out;
    }
    .btn-back:hover {
      background-color: #334155;
    }
  `,
})
export class NoAutorizadoComponent {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  volver(): void {
    const rol = this.authService.rolActual();
    if (rol) {
      this.router.navigate([`/${rol}`]);
    } else {
      this.router.navigate(['/login']);
    }
  }
}
