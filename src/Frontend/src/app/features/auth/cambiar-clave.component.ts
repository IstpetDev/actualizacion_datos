import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, switchMap } from 'rxjs';
import { AutenticacionClient } from '../../api-client';
import { AuthService } from '../../core/auth';
import { mensajeError } from '../../core/auth/mensaje-error';

@Component({
  selector: 'app-cambiar-clave',
  imports: [FormsModule],
  styleUrl: './formulario-acceso.css',
  template: `
    <section class="tarjeta">
      <h1>Cambiar contraseña</h1>
      <p>
        Para continuar, cambia tu contraseña inicial. Debe tener al menos 8 caracteres y ser
        distinta de tu documento.
      </p>
      <form #formulario="ngForm" (ngSubmit)="cambiarClave()">
        <fieldset [disabled]="ocupado()">
          @if (!auth.sesion()?.debeCambiarContrasena) {
            <label for="clave-actual">Contraseña actual</label>
            <input
              id="clave-actual"
              name="actual"
              type="password"
              [(ngModel)]="actual"
              required
              autocomplete="current-password"
            />
          }
          <label for="clave-nueva">Nueva contraseña</label>
          <input
            id="clave-nueva"
            name="nueva"
            type="password"
            [(ngModel)]="nueva"
            required
            minlength="8"
            autocomplete="new-password"
          />
          <label for="clave-confirmacion">Confirmar contraseña</label>
          <input
            id="clave-confirmacion"
            name="confirmacion"
            type="password"
            [(ngModel)]="confirmacion"
            required
            autocomplete="new-password"
          />
          <button type="submit" [disabled]="formulario.invalid">
            {{ ocupado() ? 'Guardando…' : 'Cambiar contraseña y continuar' }}
          </button>
        </fieldset>
      </form>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
    </section>
  `,
})
export class CambiarClaveComponent {
  readonly auth = inject(AuthService);
  private readonly cliente = inject(AutenticacionClient);
  private readonly router = inject(Router);
  nueva = '';
  confirmacion = '';
  actual = '';
  readonly ocupado = signal(false);
  readonly error = signal('');

  cambiarClave(): void {
    if (this.ocupado()) return;
    if (
      this.nueva.trim().length < 8 ||
      this.nueva.trim() === this.auth.sesion()?.cedula ||
      this.nueva !== this.confirmacion
    ) {
      this.error.set(
        'Las contraseñas deben coincidir, tener al menos 8 caracteres y ser distintas de tu documento.',
      );
      return;
    }
    if (!this.auth.sesion()?.debeCambiarContrasena && !this.actual) return;
    this.ocupado.set(true);
    this.error.set('');
    this.cliente
      .cambiarContrasena({
        nuevaContrasena: this.nueva,
        contrasenaActual: this.actual || undefined,
      })
      .pipe(
        switchMap(() => this.auth.verificarSesion()),
        finalize(() => {
          this.ocupado.set(false);
          this.nueva = this.confirmacion = this.actual = '';
        }),
      )
      .subscribe({
        next: (sesion) => {
          void this.router.navigate([`/${sesion.rol}`]);
        },
        error: (error: unknown) =>
          this.error.set(
            mensajeError(
              error,
              'No se pudo cambiar la contraseña o comprobar la sesión. Intenta nuevamente.',
            ),
          ),
      });
  }
}
