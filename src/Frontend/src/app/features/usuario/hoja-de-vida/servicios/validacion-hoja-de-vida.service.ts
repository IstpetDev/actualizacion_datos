import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { ConfiguracionClient, PoliticaValidacionDto } from '../../../../api-client';
import { extraerErroresCampos } from '../../../../core/auth/mensaje-error';

export type ErroresCampos = Record<string, string[]>;

/** Evalúa la política publicada por la API; el servidor conserva la autoridad. */
export function validarCampos(
  datos: object,
  seccion: string,
  politica: PoliticaValidacionDto,
): ErroresCampos {
  const errores: ErroresCampos = {};
  const valores = datos as Record<string, unknown>;
  const fecha = (campo: string): string => {
    const valor = valores[campo];
    return valor instanceof Date
      ? Number.isNaN(valor.getTime())
        ? 'invalida'
        : valor.toISOString().slice(0, 10)
      : String(valor ?? '').slice(0, 10);
  };
  const error = (campo: string, motivo: string) => {
    errores[campo] = [motivo];
  };
  for (const [campo, regla] of Object.entries(politica.reglas?.[seccion] ?? {})) {
    const valor = valores[campo];
    if (valor === undefined || valor === null || valor === '') continue;
    const texto = String(valor)
      .normalize('NFC')
      .replace(/^ +| +$/g, '');
    const tieneControles = Array.from(String(valor).replace(/\r\n/g, '\n')).some((c) => {
      const codigo = c.charCodeAt(0);
      return (
        (codigo <= 31 || (codigo >= 127 && codigo <= 159)) && !(regla.multilinea && c === '\n')
      );
    });
    if (tieneControles) error(campo, 'No se permiten caracteres de control.');
    else if (texto.length === 0) continue;
    else if (regla.maximoCaracteres != null && texto.length > regla.maximoCaracteres)
      error(campo, `Use como máximo ${regla.maximoCaracteres} caracteres.`);
    else if (regla.patron && !new RegExp(regla.patron, 'u').test(texto)) {
      const mensajes: Record<string, string> = {
        celular: 'Use 10 dígitos que empiecen con 09.',
        telefonoConvencional: 'Use 9 dígitos con prefijo del 02 al 07.',
        telefono:
          'Indique un celular de 10 dígitos con 09 o un convencional de 9 con prefijo del 02 al 07.',
        codigoPostal: 'Use solamente entre 1 y 6 dígitos.',
        correoInstitucional: 'Indique un correo válido con una sola @.',
        correoPersonal: 'Indique un correo válido con una sola @.',
        montoBeca: 'Indique un monto no negativo con hasta 16 enteros y 2 decimales.',
      };
      error(
        campo,
        mensajes[campo] ??
          'Use letras, espacios, tildes, apóstrofe o guion, sin números ni otros símbolos.',
      );
    } else if (
      regla.minimo != null &&
      (!Number.isFinite(Number(valor)) ||
        Number(valor) < regla.minimo ||
        (regla.maximo != null && Number(valor) > regla.maximo) ||
        (regla.entero && !Number.isInteger(Number(valor))))
    )
      error(
        campo,
        regla.entero
          ? `Indique un número entero entre ${regla.minimo} y ${regla.maximo}.`
          : 'Indique un monto no negativo con hasta 16 enteros y 2 decimales.',
      );
    else if (regla.tipo === 'nacimiento') {
      const min = fechaPolitica(politica.fechaNacimientoMinima),
        max = fechaPolitica(politica.fechaNacimientoMaxima);
      const dia = fecha(campo);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(dia) ||
        Number.isNaN(Date.parse(dia)) ||
        dia < min ||
        dia > max ||
        new Date(dia).toISOString().slice(0, 10) !== dia
      )
        error(
          campo,
          'La fecha debe ser desde 1900 y corresponder a una persona con 18 años cumplidos.',
        );
    } else if (regla.tipo === 'correo' || regla.tipo === 'correo_personal') {
      const partes = texto.split('@');
      const dominio =
        /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
      if (
        partes.length !== 2 ||
        partes[0].length > 64 ||
        !/[A-Za-z]/.test(partes[1]) ||
        partes[1].length > 253 ||
        !dominio.test(partes[1])
      )
        error(campo, 'Indique un correo válido con una sola @.');
      else if (
        regla.tipo === 'correo' &&
        politica.dominiosCorreoPermitidos?.length &&
        !politica.dominiosCorreoPermitidos.some((d) => d.toLowerCase() === partes[1].toLowerCase())
      )
        error(
          campo,
          `Use su correo ${politica.dominiosCorreoPermitidos.map((d) => '@' + d).join(' o ')}.`,
        );
    } else if (regla.tipo === 'cuenta' && !/^[0-9]{6,20}$/.test(texto.replace(/[ -]/g, '')))
      error(campo, 'Indique entre 6 y 20 dígitos; se permiten espacios y guiones.');
  }
  for (const [inicio, fin] of seccion === 'titulo'
    ? [['fechaObtencion', 'fechaRegistroSenescyt']]
    : seccion === 'tituloEnCurso'
      ? [['fechaInicio', 'fechaFinEstimada']]
      : ['capacitacion', 'experiencia'].includes(seccion)
        ? [['fechaInicio', 'fechaFin']]
        : []) {
    if (fecha(inicio) && fecha(fin) && fecha(fin) < fecha(inicio))
      error(fin, 'La fecha de fin no puede ser anterior al inicio.');
  }
  if (
    seccion === 'documento' &&
    fecha('fechaEmision') &&
    fecha('fechaVencimiento') &&
    fecha('fechaVencimiento') < fecha('fechaEmision')
  )
    error(
      'fechaVencimiento',
      'La fecha de vencimiento no puede ser anterior a la fecha de emisión.',
    );
  if (seccion === 'experiencia') {
    if (valores['trabajaActualmente'] && fecha('fechaFin'))
      error('fechaFin', 'Si trabaja actualmente, deje vacía la fecha de fin.');
    if (!valores['trabajaActualmente'] && !fecha('fechaFin'))
      error('fechaFin', 'Indique fecha de fin o marque que trabaja actualmente.');
  }
  return errores;
}

export function fechaPolitica(fecha: Date | undefined): string {
  return fecha ? new Date(fecha).toISOString().slice(0, 10) : '';
}

export function normalizarCodigoSeccion(clave: string): string {
  switch (clave) {
    case 'ficha-personal':
      return 'ficha';
    case 'formacion-academica':
      return 'formacion';
    case 'experiencia-laboral':
      return 'experiencia';
    case 'documentos-personales':
      return 'documentos';
    default:
      return clave;
  }
}

export function estaSeccionAbierta(clave: string, seccionesAbiertas: string[]): boolean {
  const normalizada = normalizarCodigoSeccion(clave);
  return seccionesAbiertas.includes(normalizada) || seccionesAbiertas.includes(clave);
}

@Injectable({ providedIn: 'root' })
export class ValidacionHojaDeVidaService {
  private readonly cliente = inject(ConfiguracionClient);
  readonly politica = signal<PoliticaValidacionDto | null>(null);
  readonly errorCarga = signal('');
  readonly erroresServidor = signal<ErroresCampos>({});
  readonly seccionesAbiertas = signal<string[] | null>(null);
  private datosRechazados = '';

  private readonly formularios = new Map<string, () => boolean>();
  registrarFormulario(clave: string, invalido: () => boolean, destruccion: DestroyRef): void {
    this.formularios.set(clave, invalido);
    destruccion.onDestroy(() => this.formularios.delete(clave));
  }

  actualizarSeccionesAbiertas(secciones: string[] | null | undefined): void {
    this.seccionesAbiertas.set(secciones ?? null);
  }

  hayErrores(seccionesAbiertas?: string[]): boolean {
    if (!this.politica()) return true;
    const abiertas = seccionesAbiertas ?? this.seccionesAbiertas();
    for (const [clave, invalido] of this.formularios.entries()) {
      if (abiertas && !estaSeccionAbierta(clave, abiertas)) {
        continue;
      }
      if (invalido()) return true;
    }
    return false;
  }
  constructor() {
    this.cargar();
  }
  cargar(): void {
    this.errorCarga.set('');
    this.cliente.obtenerPoliticaValidacion().subscribe({
      next: (politica) => this.politica.set(politica),
      error: () =>
        this.errorCarga.set('No se pudieron cargar las reglas de validación. Vuelva a intentar.'),
    });
  }
  errores(datos: object, seccion: string): ErroresCampos {
    const politica = this.politica();
    const errores = politica ? validarCampos(datos, seccion, politica) : {};
    if (JSON.stringify(datos) === this.datosRechazados)
      Object.assign(errores, this.erroresServidor());
    return errores;
  }
  mensaje(datos: object, seccion: string, campo: string): string {
    return this.errores(datos, seccion)[campo]?.join(' ') ?? '';
  }
  invalido(datos: object, seccion: string): boolean {
    return !this.politica() || Object.keys(this.errores(datos, seccion)).length > 0;
  }
  registrarError(error: unknown, datos: object): void {
    this.datosRechazados = JSON.stringify(datos);
    this.erroresServidor.set(extraerErroresCampos(error));
    this.cargar();
  }
}
