/**
 * Utilidad de normalización y búsqueda tolerante a mayúsculas, minúsculas,
 * tildes y diacríticos (ADR-0042, #164).
 */

/**
 * Normaliza una cadena para búsquedas: remueve marcas diacríticas (tildes, diéresis),
 * convierte a minúsculas y recorta espacios en los extremos.
 */
export function normalizarParaBusqueda(texto: string | null | undefined): string {
  if (!texto) return '';
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Comprueba si un texto objetivo contiene el término de búsqueda,
 * ignorando mayúsculas, minúsculas, tildes y diacríticos.
 */
export function coincideBusqueda(
  texto: string | null | undefined,
  termino: string | null | undefined,
): boolean {
  if (!termino || !termino.trim()) return true;
  if (!texto) return false;
  return normalizarParaBusqueda(texto).includes(normalizarParaBusqueda(termino));
}

/**
 * Filtra un catálogo de elementos en memoria por su nombre de forma insensible
 * a mayúsculas y acentos, asegurando que el elemento actualmente seleccionado
 * permanezca visible para no romper el binding de formulario.
 */
export function filtrarCatalogo<T extends { id?: number | string | null; nombre?: string | null }>(
  elementos: T[] | null | undefined,
  termino: string | null | undefined,
  valorSeleccionadoId?: number | string | null,
): T[] {
  const lista = elementos ?? [];
  if (!termino || !termino.trim()) return lista;

  const terminoNorm = normalizarParaBusqueda(termino);
  return lista.filter((item) => {
    if (
      valorSeleccionadoId !== undefined &&
      valorSeleccionadoId !== null &&
      item.id === valorSeleccionadoId
    ) {
      return true;
    }
    return normalizarParaBusqueda(item.nombre).includes(terminoNorm);
  });
}
