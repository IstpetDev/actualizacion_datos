namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;

public sealed class CargadorCatalogosDesarrollo(IServicioCatalogos servicio)
{
    public async Task<List<ResultadoImportacionCatalogoDto>> CargarAsync(string directorio, CancellationToken ct = default)
    {
        // El enum declara cada padre antes que sus hijos. Las listas cortas ya pertenecen a la migración.
        var tipos = Enum.GetValues<TipoCatalogo>()
            .Where(t => t is not (TipoCatalogo.Sexo or TipoCatalogo.EstadoCivil or TipoCatalogo.TipoSangre or TipoCatalogo.TipoCapacitacion))
            .ToArray();
        foreach (var tipo in tipos)
        {
            if (!File.Exists(Path.Combine(directorio, $"{tipo}.csv")))
            {
                throw new InvalidOperationException($"Falta el catálogo de desarrollo {tipo}.csv en el directorio configurado.");
            }
        }

        var resultados = new List<ResultadoImportacionCatalogoDto>();
        foreach (var tipo in tipos)
        {
            await using var contenido = File.OpenRead(Path.Combine(directorio, $"{tipo}.csv"));
            resultados.Add(await servicio.ImportarAsync(tipo, contenido, ct));
        }

        return resultados;
    }
}
