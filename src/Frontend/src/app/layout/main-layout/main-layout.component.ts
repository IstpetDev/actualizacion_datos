import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AutenticacionClient } from '../../api-client';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css',
})
export class MainLayoutComponent {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private readonly cliente = inject(AutenticacionClient);
  readonly cerrando = signal(false);
  readonly errorCierre = signal('');

  cerrarSesion(): void {
    if (this.cerrando()) return;
    this.cerrando.set(true);
    this.errorCierre.set('');
    this.cliente
      .cerrarSesion()
      .pipe(finalize(() => this.cerrando.set(false)))
      .subscribe({
        next: () => {
          this.authService.cerrarSesion();
          void this.router.navigate(['/login']);
        },
        error: () => this.errorCierre.set('No se pudo cerrar la sesión. Intenta nuevamente.'),
      });
  }
}
