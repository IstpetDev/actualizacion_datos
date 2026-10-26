import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SaludClient } from './api-client';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnInit {
  private readonly saludClient = inject(SaludClient);

  protected readonly titulo = 'Actualización de datos';
  protected readonly estadoApi = signal<string>('conectando...');

  ngOnInit(): void {
    this.saludClient.obtenerSalud().subscribe({
      next: (res) => this.estadoApi.set(res.estado ?? 'ok'),
      error: () => this.estadoApi.set('sin-conexion'),
    });
  }
}
