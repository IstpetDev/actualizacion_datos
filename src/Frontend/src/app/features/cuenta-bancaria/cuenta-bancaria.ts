import { catchError, map, Observable, of, throwError } from 'rxjs';
import { ElementoCatalogoDto, SwaggerException } from '../../api-client';

// ADR-0013. Textos de estado de la API y su lectura para las personas.
export const ESTADOS_CUENTA: Record<string, string> = {
  'sin-registrar': 'Sin registrar',
  'sin-confirmar': 'Precargada de la nómina, sin confirmar',
  coincide: 'Coincide con la nómina',
  difiere: 'Difiere de la nómina',
  'sin-nomina': 'Registrada (la nómina no trae cuenta para comparar)',
};

export function textoEstadoCuenta(estado: string | undefined): string {
  return (estado && ESTADOS_CUENTA[estado]) || estado || '—';
}

/** La API responde 204 cuando no hay cuenta; el cliente generado lo trata como error. */
export function nuloSiNoHayContenido<T>(fuente: Observable<T>): Observable<T | null> {
  return fuente.pipe(
    catchError((error: unknown) =>
      error instanceof SwaggerException && error.status === 204
        ? of(null)
        : throwError(() => error),
    ),
  );
}

/**
 * Tipos de cuenta sembrados por la migración AgregarCuentaBancaria (ids estables). Se usan si el catálogo
 * aún no responde (la consulta de catálogos la implementa T-01, #29).
 */
export const TIPOS_CUENTA_SEMBRADOS: ElementoCatalogoDto[] = [
  {
    id: 51,
    tipo: 'TipoCuentaBancaria',
    codigo: 'AHORROS',
    nombre: 'Ahorros',
    padreId: undefined,
    codigoExterno: undefined,
    orden: 1,
  },
  {
    id: 52,
    tipo: 'TipoCuentaBancaria',
    codigo: 'CORRIENTE',
    nombre: 'Corriente',
    padreId: undefined,
    codigoExterno: undefined,
    orden: 2,
  },
];

export function catalogoOAlternativa(
  fuente: Observable<ElementoCatalogoDto[]>,
  alternativa: ElementoCatalogoDto[],
): Observable<ElementoCatalogoDto[]> {
  return fuente.pipe(
    map((lista) => (lista.length ? lista : alternativa)),
    catchError(() => of(alternativa)),
  );
}
