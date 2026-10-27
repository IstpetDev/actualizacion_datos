import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin, Observable, switchMap } from 'rxjs';
import {
  API_BASE_URL,
  ArchivoDto,
  ArchivosClient,
  AutenticacionClient,
  EstadoEdicionDto,
  MisDatosClient,
  MisDatosDto,
} from '../../api-client';
import { mensajeError } from '../../core/auth/mensaje-error';
import { MiCuentaBancariaComponent } from '../cuenta-bancaria/mi-cuenta-bancaria.component';

@Component({
  selector: 'app-usuario-dashboard',
  imports: [FormsModule, DatePipe, DecimalPipe, MiCuentaBancariaComponent],
  templateUrl: './usuario-dashboard.component.html',
  styleUrl: './usuario-dashboard.component.css',
})
export class UsuarioDashboardComponent implements OnInit {
  private readonly cliente = inject(MisDatosClient);
  private readonly archivosCliente = inject(ArchivosClient);
  private readonly autenticacion = inject(AutenticacionClient);
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL, { optional: true }) ?? '';
  readonly datos = signal<MisDatosDto | null>(null);
  readonly estado = signal<EstadoEdicionDto | null>(null);
  readonly archivos = signal<ArchivoDto[]>([]);
  readonly cargando = signal(true);
  readonly ocupado = signal(false);
  readonly error = signal('');
  readonly aviso = signal('');
  readonly jsonValido = signal(true);
  readonly puedeEditar = computed(
    () => !!this.datos()?.puedeEditar && !!this.estado()?.puedeEditar && this.jsonValido(),
  );
  readonly observaciones = computed(() =>
    [...(this.datos()?.observaciones ?? [])].sort((a, b) => b.ronda - a.ronda),
  );
  readonly campos = [
    { clave: 'telefono', etiqueta: 'Teléfono', tipo: 'tel', autocompletar: 'tel' },
    { clave: 'direccion', etiqueta: 'Dirección', tipo: 'text', autocompletar: 'street-address' },
    { clave: 'ciudad', etiqueta: 'Ciudad', tipo: 'text', autocompletar: 'address-level2' },
  ];
  contacto: Record<string, string> = { telefono: '', direccion: '', ciudad: '' };
  private originales: Record<string, unknown> = {};
  correo = '';
  codigo = '';
  correoDestino = '';
  claveDocumento = '';
  readonly archivoSeleccionado = signal<File | null>(null);
  readonly avisoArchivo = signal('');

  get correoConfirmado(): boolean {
    return !!this.datos()?.correoVerificado && this.correo.trim() === this.datos()?.correo;
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    if (this.ocupado()) return;
    this.cargando.set(true);
    this.error.set('');
    forkJoin({
      datos: this.cliente.obtenerMisDatos(),
      estado: this.cliente.obtenerEstadoEdicion(),
      archivos: this.archivosCliente.listarMisArchivos(),
    })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: ({ datos, estado, archivos }) => {
          this.datos.set(datos);
          this.estado.set(estado);
          this.archivos.set(archivos);
          this.correo = datos.correo ?? '';
          try {
            const contenido: unknown = JSON.parse(datos.datosPersonalesJson || '{}');
            if (!contenido || typeof contenido !== 'object' || Array.isArray(contenido))
              throw new Error();
            this.originales = contenido as Record<string, unknown>;
            this.contacto = Object.fromEntries(
              this.campos.map(({ clave }) => [clave, String(this.originales[clave] ?? '')]),
            );
            this.jsonValido.set(true);
          } catch {
            this.jsonValido.set(false);
            this.error.set(
              'Los datos guardados no se pueden interpretar. Contacta a tu institución antes de modificarlos.',
            );
          }
        },
        error: (error: unknown) => {
          this.estado.set(null);
          this.error.set(
            mensajeError(error, 'No se pudo cargar la actualización. Intenta nuevamente.'),
          );
        },
      });
  }

  marcas(tipo: string, clave: string): string[] {
    return (this.observaciones()[0]?.marcas ?? [])
      .filter((marca) => marca.tipoDestino.toLowerCase() === tipo && marca.claveDestino === clave)
      .map((marca) => marca.texto);
  }

  private guardarDatos(): Observable<unknown> {
    return this.cliente.actualizarMisDatos({
      datosJson: JSON.stringify({ ...this.originales, ...this.contacto }),
    });
  }

  guardar(): void {
    if (!this.disponible()) return;
    this.realizar(this.guardarDatos(), () =>
      this.aviso.set('Borrador guardado. Puedes continuar después.'),
    );
  }

  enviar(): void {
    if (!this.disponible()) return;
    if (!this.datos()?.tratamientoDatosAceptado || !this.correoConfirmado) {
      this.error.set(
        'Verifica tu correo y completa la aceptación del aviso vigente antes de enviar.',
      );
      return;
    }
    const envio = this.guardarDatos().pipe(switchMap(() => this.cliente.enviarMisDatosARevision()));
    this.realizar(envio, () => {
      this.datos.update((datos) =>
        datos
          ? {
              ...datos,
              estadoActualizacion: 'Enviado',
              puedeEditar: false,
              tratamientoDatosAceptado: true,
            }
          : datos,
      );
      this.estado.update((estado) =>
        estado
          ? {
              ...estado,
              puedeEditar: false,
              mensaje: 'Actualización enviada a revisión. La edición está bloqueada.',
            }
          : estado,
      );
      this.aviso.set('Tu actualización se envió a revisión.');
    });
  }

  // PD-HDV-04 (spec-0003): con la actualización aprobada y la campaña abierta, la persona reabre
  // su actualización con una acción explícita. La API decide si se permite.
  iniciarNuevaActualizacion(): void {
    if (this.ocupado() || this.cargando() || !this.estado()?.puedeIniciarNuevaActualizacion) return;
    this.realizar(this.cliente.iniciarNuevaActualizacion(), () => {
      this.datos.update((datos) =>
        datos ? { ...datos, estadoActualizacion: 'Borrador', puedeEditar: true } : datos,
      );
      this.estado.update((estado) =>
        estado
          ? {
              ...estado,
              puedeEditar: true,
              puedeIniciarNuevaActualizacion: false,
              estadoActualizacion: 'Borrador',
              mensaje: 'Nueva actualización iniciada. Puedes editar tu información.',
            }
          : estado,
      );
      this.aviso.set('Nueva actualización iniciada. Revisa tus datos y vuelve a enviarlos.');
    });
  }

  solicitarCodigo(): void {
    if (!this.disponible() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.correo.trim())) return;
    const correo = this.correo.trim();
    this.realizar(this.autenticacion.enviarCodigoCorreo({ correo }), () => {
      this.correoDestino = correo;
      this.codigo = '';
      this.datos.update((datos) => (datos ? { ...datos, correo, correoVerificado: false } : datos));
      this.aviso.set('Código enviado. Es válido por 15 minutos; puedes solicitar uno nuevo.');
    });
  }

  verificarCorreo(): void {
    if (
      !this.disponible() ||
      !/^\d{6}$/.test(this.codigo) ||
      this.correo.trim() !== this.correoDestino
    )
      return;
    this.realizar(this.autenticacion.verificarCodigoCorreo({ codigo: this.codigo }), () => {
      this.datos.update((datos) =>
        datos ? { ...datos, correo: this.correoDestino, correoVerificado: true } : datos,
      );
      this.codigo = '';
      this.aviso.set('Correo verificado.');
    });
  }

  seleccionarArchivo(evento: Event): void {
    this.archivoSeleccionado.set(null);
    this.avisoArchivo.set('');
    if (!this.disponible()) return;
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    if (!archivo) return;
    if (
      !/\.(pdf|jpe?g|png)$/i.test(archivo.name) ||
      archivo.size === 0 ||
      archivo.size > 10 * 1024 * 1024
    ) {
      this.error.set('Selecciona un PDF, JPG o PNG no vacío de hasta 10 MB.');
      entrada.value = '';
      return;
    }
    this.error.set('');
    this.archivoSeleccionado.set(archivo);
    if (archivo.size >= 5 * 1024 * 1024)
      this.avisoArchivo.set(
        'Este archivo pesa 5 MB o más. La subida puede tardar; el máximo es 10 MB.',
      );
  }

  subirArchivo(entrada?: HTMLInputElement): void {
    const archivo = this.archivoSeleccionado();
    if (!this.disponible() || !archivo || !this.claveDocumento.trim()) return;
    this.realizar(
      this.archivosCliente.subirArchivo(this.claveDocumento.trim(), undefined, {
        data: archivo,
        fileName: archivo.name,
      }),
      (resultado) => {
        this.archivos.update((archivos) => [...archivos, resultado as ArchivoDto]);
        this.archivoSeleccionado.set(null);
        this.avisoArchivo.set('');
        if (entrada) entrada.value = '';
        this.aviso.set('Archivo subido.');
      },
    );
  }

  eliminarArchivo(archivo: ArchivoDto): void {
    if (!this.disponible()) return;
    this.realizar(this.archivosCliente.eliminarArchivo(archivo.id), () => {
      this.archivos.update((archivos) => archivos.filter((actual) => actual.id !== archivo.id));
      this.aviso.set('Archivo eliminado.');
    });
  }

  descargarArchivo(archivo: ArchivoDto): void {
    if (this.ocupado() || this.cargando()) return;
    this.realizar(
      this.http.get(`${this.base}/api/archivos/${encodeURIComponent(archivo.id)}/descargar`, {
        responseType: 'blob',
      }),
      (resultado) => {
        const enlace = document.createElement('a');
        const url = URL.createObjectURL(resultado as Blob);
        enlace.href = url;
        enlace.download = archivo.nombreOriginal;
        enlace.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
      },
    );
  }

  private disponible(): boolean {
    return this.puedeEditar() && !this.ocupado() && !this.cargando();
  }

  private realizar(accion: Observable<unknown>, exito: (resultado: unknown) => void): void {
    this.ocupado.set(true);
    this.error.set('');
    this.aviso.set('');
    accion.pipe(finalize(() => this.ocupado.set(false))).subscribe({
      next: exito,
      error: (error: unknown) =>
        this.error.set(
          mensajeError(
            error,
            'No se pudo completar la operación. Tus cambios siguen en el formulario; puedes reintentar.',
          ),
        ),
    });
  }
}
