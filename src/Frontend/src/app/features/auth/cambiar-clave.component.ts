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
            <div class="campo-clave">
              <input
                id="clave-actual"
                name="actual"
                [type]="mostrarActual() ? 'text' : 'password'"
                [(ngModel)]="actual"
                required
                autocomplete="current-password"
              />
              <button
                type="button"
                class="btn-ojo"
                (click)="mostrarActual.set(!mostrarActual())"
                [attr.aria-label]="
                  mostrarActual() ? 'Ocultar contraseña actual' : 'Mostrar contraseña actual'
                "
                [title]="
                  mostrarActual() ? 'Ocultar contraseña actual' : 'Mostrar contraseña actual'
                "
              >
                @if (mostrarActual()) {
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
          }
          <label for="clave-nueva">Nueva contraseña</label>
          <div class="campo-clave">
            <input
              id="clave-nueva"
              name="nueva"
              [type]="mostrarNueva() ? 'text' : 'password'"
              [(ngModel)]="nueva"
              required
              minlength="8"
              autocomplete="new-password"
            />
            <button
              type="button"
              class="btn-ojo"
              (click)="mostrarNueva.set(!mostrarNueva())"
              [attr.aria-label]="
                mostrarNueva() ? 'Ocultar nueva contraseña' : 'Mostrar nueva contraseña'
              "
              [title]="mostrarNueva() ? 'Ocultar nueva contraseña' : 'Mostrar nueva contraseña'"
            >
              @if (mostrarNueva()) {
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
          <label for="clave-confirmacion">Confirmar contraseña</label>
          <div class="campo-clave">
            <input
              id="clave-confirmacion"
              name="confirmacion"
              [type]="mostrarConfirmacion() ? 'text' : 'password'"
              [(ngModel)]="confirmacion"
              required
              autocomplete="new-password"
            />
            <button
              type="button"
              class="btn-ojo"
              (click)="mostrarConfirmacion.set(!mostrarConfirmacion())"
              [attr.aria-label]="
                mostrarConfirmacion()
                  ? 'Ocultar confirmación de contraseña'
                  : 'Mostrar confirmación de contraseña'
              "
              [title]="
                mostrarConfirmacion()
                  ? 'Ocultar confirmación de contraseña'
                  : 'Mostrar confirmación de contraseña'
              "
            >
              @if (mostrarConfirmacion()) {
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
          <div class="requisitos-clave" aria-label="Requisitos de contraseña">
            <div class="requisito-item" [class.cumplido]="cumpleLongitud">
              <span class="icono-check" aria-hidden="true">
                @if (cumpleLongitud) {
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                }
              </span>
              <span>Al menos 8 caracteres</span>
            </div>
            <div class="requisito-item" [class.cumplido]="cumpleDistintaDocumento">
              <span class="icono-check" aria-hidden="true">
                @if (cumpleDistintaDocumento) {
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                }
              </span>
              <span>Distinta de tu número de documento</span>
            </div>
            <div class="requisito-item" [class.cumplido]="cumpleCoincidencia">
              <span class="icono-check" aria-hidden="true">
                @if (cumpleCoincidencia) {
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                }
              </span>
              <span>Las contraseñas coinciden</span>
            </div>
          </div>
          <button type="submit" [disabled]="formulario.invalid || !todosCumplidos">
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
  readonly mostrarActual = signal(false);
  readonly mostrarNueva = signal(false);
  readonly mostrarConfirmacion = signal(false);
  readonly ocupado = signal(false);
  readonly error = signal('');

  get cumpleLongitud(): boolean {
    return this.nueva.trim().length >= 8;
  }

  get cumpleDistintaDocumento(): boolean {
    const cedula = this.auth.sesion()?.cedula;
    return this.nueva.trim().length > 0 && (!cedula || this.nueva.trim() !== cedula);
  }

  get cumpleCoincidencia(): boolean {
    return this.nueva.length > 0 && this.nueva === this.confirmacion;
  }

  get todosCumplidos(): boolean {
    return this.cumpleLongitud && this.cumpleDistintaDocumento && this.cumpleCoincidencia;
  }

  cambiarClave(): void {
    if (this.ocupado()) return;
    if (!this.todosCumplidos) {
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
