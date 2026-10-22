import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AutenticacionClient } from '../../api-client';
import { AuthService } from '../../core/auth';

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
          <input
            id="contrasena"
            name="contrasena"
            type="password"
            [(ngModel)]="contrasena"
            required
            autocomplete="current-password"
          />
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
            void this.router.navigate([
              sesion.debeCambiarContrasena ? '/cambiar-clave' : `/${sesion.rol}`,
            ]);
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
