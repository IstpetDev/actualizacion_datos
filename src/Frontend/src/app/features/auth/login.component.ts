import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, Rol, ROLES_VALIDOS, SesionUsuario } from '../../core/auth';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <div class="login-card">
      <div class="card-header">
        <h1 class="card-title">Iniciar Sesión</h1>
        <p class="card-subtitle">Plataforma de Actualización de Datos Institucionales</p>
      </div>

      <form (ngSubmit)="enviarLogin()" class="login-form" novalidate>
        <div class="form-group">
          <label for="cedula-input" class="form-label">Número de Documento / Cédula</label>
          <input
            id="cedula-input"
            type="text"
            class="form-control"
            [(ngModel)]="cedula"
            name="cedula"
            required
            placeholder="Ingrese su cédula"
            autocomplete="username"
          />
        </div>

        <div class="form-group">
          <label for="rol-select" class="form-label">Rol de Acceso (Desarrollo / Pruebas)</label>
          <select id="rol-select" class="form-control" [(ngModel)]="rolSeleccionado" name="rol">
            @for (rol of rolesDisponibles; track rol) {
              <option [value]="rol">{{ rol }}</option>
            }
          </select>
        </div>

        @if (errorMensaje()) {
          <div class="alert-error" role="alert">
            {{ errorMensaje() }}
          </div>
        }

        <button type="submit" class="btn-primary" [disabled]="!cedula.trim()">
          Ingresar al Sistema
        </button>
      </form>
    </div>
  `,
  styles: `
    .login-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      padding: 2rem;
      box-shadow:
        0 4px 6px -1px rgba(0, 0, 0, 0.05),
        0 2px 4px -2px rgba(0, 0, 0, 0.05);
    }
    .card-header {
      margin-bottom: 1.5rem;
      text-align: center;
    }
    .card-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.25rem 0;
      letter-spacing: -0.02em;
    }
    .card-subtitle {
      font-size: 0.875rem;
      color: #64748b;
      margin: 0;
    }
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .form-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #334155;
    }
    .form-control {
      padding: 0.625rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      color: #0f172a;
      background-color: #ffffff;
      outline: none;
      transition: border-color 150ms ease-in-out;
    }
    .form-control:focus {
      border-color: #4f46e5;
      box-shadow: 0 0 0 1px #4f46e5;
    }
    .alert-error {
      padding: 0.75rem;
      border-radius: 0.375rem;
      background-color: #fef2f2;
      border: 1px solid #fee2e2;
      color: #991b1b;
      font-size: 0.8125rem;
    }
    .btn-primary {
      padding: 0.75rem 1rem;
      background-color: #4f46e5;
      color: #ffffff;
      font-size: 0.875rem;
      font-weight: 600;
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: background-color 150ms ease-in-out;
    }
    .btn-primary:hover:not(:disabled) {
      background-color: #4338ca;
    }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected cedula = '1700000000';
  protected rolSeleccionado: Rol = 'usuario';
  protected readonly rolesDisponibles = ROLES_VALIDOS;
  protected readonly errorMensaje = signal<string | null>(null);

  enviarLogin(): void {
    if (!this.cedula.trim()) {
      this.errorMensaje.set('Debe ingresar un número de cédula válido.');
      return;
    }

    const nuevaSesion: SesionUsuario = {
      id: `usr-${this.rolSeleccionado}-1`,
      cedula: this.cedula.trim(),
      nombre: `Usuario ${this.rolSeleccionado.toUpperCase()}`,
      rol: this.rolSeleccionado,
      institucionId: 'inst-1',
      token: `token-ficticio-${this.rolSeleccionado}`,
    };

    this.authService.iniciarSesion(nuevaSesion);
    this.router.navigate([`/${this.rolSeleccionado}`]);
  }
}
