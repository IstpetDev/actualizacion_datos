import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AutenticacionClient } from '../../api-client';
import { AuthService, rutaDeAcceso } from '../../core/auth';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  styleUrl: './formulario-acceso.css',
  template: `
    <section class="tarjeta">
      <h1>Iniciar sesión</h1>
      <p>Actualización de datos institucionales</p>
      <form #formulario="ngForm" (ngSubmit)="enviarLogin()">
        <fieldset [disabled]="ocupado()">
          <label for="documento">Documento / cédula</label>
          <input
            id="documento"
            name="documento"
            [(ngModel)]="documento"
            required
            autocomplete="username"
          />
          <label for="contrasena">Contraseña</label>
          <div class="campo-clave">
            <input
              id="contrasena"
              name="contrasena"
              [type]="mostrarContrasena() ? 'text' : 'password'"
              [(ngModel)]="contrasena"
              required
              autocomplete="current-password"
            />
            <button
              type="button"
              class="btn-ojo"
              (click)="mostrarContrasena.set(!mostrarContrasena())"
              [attr.aria-label]="mostrarContrasena() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              [title]="mostrarContrasena() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            >
              @if (mostrarContrasena()) {
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path
                    d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                  />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              } @else {
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              }
            </button>
          </div>
          <p>En tu primer ingreso, utiliza la contraseña inicial indicada por tu institución.</p>
          <button type="submit" [disabled]="formulario.invalid || !documento.trim()">
            {{ ocupado() ? 'Ingresando…' : 'Ingresar' }}
          </button>
        </fieldset>
      </form>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
    </section>
  `,
})
export class LoginComponent {
  private readonly cliente = inject(AutenticacionClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  documento = '';
  contrasena = '';
  readonly mostrarContrasena = signal(false);
  readonly ocupado = signal(false);
  readonly error = signal('');

  enviarLogin(): void {
    if (this.ocupado() || !this.documento.trim() || !this.contrasena) return;
    this.ocupado.set(true);
    this.error.set('');
    this.cliente
      .iniciarSesion({ documento: this.documento.trim(), contrasena: this.contrasena })
      .pipe(
        finalize(() => {
          this.ocupado.set(false);
          this.contrasena = '';
        }),
      )
      .subscribe({
        next: (datos) => {
          try {
            const sesion = this.auth.recibirSesion(datos);
            void this.router.navigate([rutaDeAcceso(sesion)]);
          } catch {
            this.auth.cerrarSesion();
            this.error.set('No se pudo validar la sesión. Intenta nuevamente.');
          }
        },
        error: () =>
          this.error.set('Credenciales incorrectas o usuario no habilitado. Intenta nuevamente.'),
      });
  }
}
