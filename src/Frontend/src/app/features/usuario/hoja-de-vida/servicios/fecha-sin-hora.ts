// NSwag representa DateOnly como Date en las interfaces. JSON debe conservar yyyy-MM-dd.
export function fechaSinHora(valor: string): Date | undefined {
  if (!valor) return undefined;
  const fecha = new Date(valor);
  fecha.toJSON = () => fecha.toISOString().slice(0, 10);
  return fecha;
}
