import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfiguracionClient } from '../../../api-client';
import { mensajeError } from '../../../core/auth/mensaje-error';

@Component({
  selector: 'app-dominios-correo',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section aria-labelledby="titulo-dominios">
      <h3 id="titulo-dominios">Correo institucional</h3>
      @if (sinDominios()) {
        <p role="status">
          No hay dominios configurados: se aceptan correos con formato válido de cualquier dominio.
          Configure los de su institución.
        </p>
      }
      <form (ngSubmit)="guardar()">
        <label for="dominios-correo">Dominios permitidos (uno por línea, hasta 10)</label>
        <textarea
          id="dominios-correo"
          name="dominiosCorreoPermitidos"
          [(ngModel)]="dominios"
          rows="3"
          aria-describedby="ayuda-dominios error-dominios"
          [disabled]="ocupado()"
        ></textarea>
        <p id="ayuda-dominios">
          Ejemplo: institucion-ficticia.example. Se comparan dominios exactos sin distinguir
          mayúsculas. Los subdominios deben agregarse explícitamente. Dejar vacío permite cualquier
          dominio; los correos existentes se comprobarán al guardar o enviar a revisión.
        </p>
        @if (error()) {
          <p id="error-dominios" role="alert">{{ error() }}</p>
        }
        @if (aviso()) {
          <p role="status">{{ aviso() }}</p>
        }
        <button type="submit" [disabled]="ocupado()">Guardar dominios</button>
      </form>
    </section>
  `,
  styles: `
    section {
      margin: 1.5rem 0;
      padding: 1rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
    }
    label,
    textarea {
      display: block;
    }
    textarea {
      width: 100%;
      box-sizing: border-box;
      font: inherit;
    }
    button {
      padding: 0.6rem 1rem;
    }
    p {
      max-width: 80ch;
    }
  `,
})
export class DominiosCorreoComponent implements OnInit {
  private readonly cliente = inject(ConfiguracionClient);
  dominios = '';
  readonly ocupado = signal(false);
  readonly sinDominios = signal(false);
  readonly error = signal('');
  readonly aviso = signal('');
  ngOnInit(): void {
    this.ocupado.set(true);
    this.cliente.obtenerPoliticaValidacion().subscribe({
      next: (p) => {
        this.dominios = p.dominiosCorreoPermitidos.join('\n');
        this.sinDominios.set(!p.dominiosCorreoPermitidos.length);
        this.ocupado.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e, 'No se pudieron cargar los dominios.'));
        this.ocupado.set(false);
      },
    });
  }
  guardar(): void {
    this.ocupado.set(true);
    this.error.set('');
    this.aviso.set('');
    this.cliente
      .guardarDominiosCorreo({
        dominiosCorreoPermitidos: this.dominios.split(/\r?\n/).filter((d) => d.trim()),
      })
      .subscribe({
        next: (p) => {
          this.dominios = p.dominiosCorreoPermitidos.join('\n');
          this.sinDominios.set(!p.dominiosCorreoPermitidos.length);
          this.aviso.set('Dominios guardados.');
          this.ocupado.set(false);
        },
        error: (e) => {
          this.error.set(
            mensajeError(
              e,
              'Revise los dominios: hasta 10 dominios DNS, sin rutas, puertos ni comodines.',
            ),
          );
          this.ocupado.set(false);
        },
      });
  }
}
