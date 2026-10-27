import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, switchMap } from 'rxjs';
import {
  AutenticacionClient,
  EstadoProteccionDatosDto,
  ProteccionDatosClient,
} from '../../api-client';
import { AuthService, rutaDeAcceso } from '../../core/auth';
import { mensajeError } from '../../core/auth/mensaje-error';

@Component({
  selector: 'app-aviso-proteccion-datos',
  imports: [FormsModule, DatePipe],
  styleUrl: './formulario-acceso.css',
  styles: `
    :host {
      padding: 2rem 1rem;
    }
    .tarjeta {
      max-width: 52rem;
    }
    .contenido {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      line-height: 1.6;
      margin-block: 1.5rem;
    }
    .decision {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      line-height: 1.5;
    }
    .decision input {
      width: 1.25rem;
      height: 1.25rem;
      flex: none;
      margin-top: 0.2rem;
    }
    .secundario {
      background: transparent;
      color: inherit;
    }
    .metadatos {
      margin-block: 1rem;
    }
  `,
  template: `
    <main class="tarjeta" aria-labelledby="titulo-aviso" [attr.aria-busy]="cargando() || ocupado()">
      <h1 id="titulo-aviso">Protección de datos personales</h1>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
      @if (cargando()) {
        <p role="status">Cargando el aviso de tu institución…</p>
      }
      @if (estado()?.aviso; as aviso) {
        <h2>{{ aviso.titulo }}</h2>
        <p class="metadatos">
          Responsable: {{ aviso.responsable }}<br />
          Versión {{ aviso.version }} · Vigente desde {{ aviso.vigenteDesdeUtc | date: 'medium' }}
          @if (aviso.vigenteHastaUtc) {
            hasta {{ aviso.vigenteHastaUtc | date: 'medium' }}
          }
        </p>
        <a [href]="aviso.fuenteOficial" target="_blank" rel="noopener noreferrer"
          >Fuente institucional del aviso (abre otra pestaña)</a
        >
        <article class="contenido" aria-label="Contenido íntegro del aviso">
          {{ aviso.contenido }}
        </article>
        <form (ngSubmit)="aceptar()">
          <fieldset [disabled]="ocupado() || cargando()">
            <label class="decision" for="aceptar-aviso">
              <input id="aceptar-aviso" name="acepta" type="checkbox" [(ngModel)]="acepta" />
              <span
                >{{ aviso.declaracionAceptacion }} ({{ aviso.titulo }}, versión
                {{ aviso.version }})</span
              >
            </label>
            <button type="submit" [disabled]="!acepta || ocupado() || cargando()">
              {{ ocupado() ? 'Comprobando aceptación…' : 'Aceptar y continuar' }}
            </button>
          </fieldset>
        </form>
      }
      <button
        type="button"
        class="secundario"
        [disabled]="cargando() || ocupado()"
        (click)="cargar()"
      >
        Volver a cargar el aviso
      </button>
      <button type="button" class="secundario" [disabled]="ocupado()" (click)="salir()">
        No aceptar y cerrar sesión
      </button>
    </main>
  `,
})
export class AvisoProteccionDatosComponent implements OnInit {
  private readonly cliente = inject(ProteccionDatosClient);
  private readonly autenticacion = inject(AutenticacionClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly estado = signal<EstadoProteccionDatosDto | null>(null);
  readonly cargando = signal(false);
  readonly ocupado = signal(false);
  readonly error = signal('');
  acepta = false;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    if (this.cargando() || this.ocupado()) return;
    this.cargando.set(true);
    this.acepta = false;
    this.estado.set(null);
    this.error.set('');
    this.cliente
      .obtenerAvisoProteccionDatos()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (estado) => {
          this.estado.set(estado);
          if (estado.aceptado) this.comprobarSesion();
        },
        error: (error: unknown) =>
          this.error.set(
            mensajeError(error, 'No se pudo cargar el aviso. Puedes reintentar o cerrar sesión.'),
          ),
      });
  }

  aceptar(): void {
    const aviso = this.estado()?.aviso;
    if (!this.acepta || !aviso || this.ocupado() || this.cargando()) return;
    this.ocupado.set(true);
    this.error.set('');
    this.cliente
      .aceptarTratamientoDatos({ avisoId: aviso.id, acepta: true })
      .pipe(
        switchMap(() => this.auth.verificarSesion()),
        finalize(() => this.ocupado.set(false)),
      )
      .subscribe({
        next: (sesion) => {
          const destino = rutaDeAcceso(sesion);
          if (destino === '/proteccion-datos') {
            this.ocupado.set(false);
            this.cargar();
          } else void this.router.navigate([destino]);
        },
        error: (error: { status?: number }) => {
          this.acepta = false;
          this.ocupado.set(false);
          if (error?.status === 409) this.cargar();
          this.error.set(
            mensajeError(
              error,
              'No se pudo confirmar la aceptación. Vuelve a cargar el aviso para comprobar su estado o reintentar.',
            ),
          );
        },
      });
  }

  salir(): void {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.autenticacion
      .cerrarSesion()
      .pipe(finalize(() => this.ocupado.set(false)))
      .subscribe({
        next: () => {
          this.auth.cerrarSesion();
          this.estado.set(null);
          this.acepta = false;
          void this.router.navigate(['/login']);
        },
        error: (error: unknown) =>
          this.error.set(mensajeError(error, 'No se pudo cerrar la sesión. Intenta nuevamente.')),
      });
  }

  private comprobarSesion(): void {
    this.auth.verificarSesion().subscribe({
      next: (sesion) => {
        if (rutaDeAcceso(sesion) !== '/proteccion-datos')
          void this.router.navigate([rutaDeAcceso(sesion)]);
        else this.error.set('El aviso cambió. Vuelve a cargarlo para leer la versión vigente.');
      },
      error: (error: unknown) =>
        this.error.set(mensajeError(error, 'No se pudo comprobar la sesión. Vuelve a intentarlo.')),
    });
  }
}
