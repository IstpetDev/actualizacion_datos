namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using System.Security.Cryptography;
using System.Text.Json;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

// ADR-0021: mismo importador en desarrollo y en el comando de despliegue.
public sealed class CargadorCatalogos(IServicioCatalogos servicio, AplicacionDbContext db)
{
    public async Task<List<ResultadoImportacionCatalogoDto>> CargarAsync(string directorio, CancellationToken ct = default)
    {
        // El enum declara los padres antes que sus hijos. Universidad recibe dos archivos.
        var archivos = Enum.GetValues<TipoCatalogo>()
            .Where(t => t is not (TipoCatalogo.Sexo or TipoCatalogo.EstadoCivil or TipoCatalogo.TipoSangre
                or TipoCatalogo.TipoCapacitacion or TipoCatalogo.TipoCuentaBancaria))
            .SelectMany(t => t == TipoCatalogo.Universidad
                ? new[] { (Tipo: t, Archivo: $"{t}.csv"), (Tipo: t, Archivo: "InstitutosSuperiores.csv") }
                : [(Tipo: t, Archivo: $"{t}.csv")]).ToArray();
        var rutaManifiesto = Path.Combine(directorio, "fuentes.json");
        if (!File.Exists(rutaManifiesto))
        {
            throw new InvalidOperationException("Falta el manifiesto de catálogos fuentes.json.");
        }

        using var manifiesto = JsonDocument.Parse(await File.ReadAllTextAsync(rutaManifiesto, ct));
        var hashes = manifiesto.RootElement.GetProperty("archivos").EnumerateArray()
            .ToDictionary(a => a.GetProperty("archivo").GetString()!, a => a.GetProperty("sha256").GetString()!, StringComparer.Ordinal);
        // Validar todos los recursos antes de escribir; nunca descargar fuentes en ejecución.
        foreach (var (_, archivo) in archivos)
        {
            var ruta = Path.Combine(directorio, archivo);
            if (!File.Exists(ruta) || !hashes.TryGetValue(archivo, out var esperado))
            {
                throw new InvalidOperationException($"Falta el catálogo {archivo} o su entrada en fuentes.json.");
            }
            await using var contenido = File.OpenRead(ruta);
            var hash = Convert.ToHexString(await SHA256.HashDataAsync(contenido, ct));
            if (!hash.Equals(esperado, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException($"El catálogo {archivo} no coincide con el SHA-256 de fuentes.json.");
            }
        }

        var resultados = new List<ResultadoImportacionCatalogoDto>();
        foreach (var (tipo, archivo) in archivos)
        {
            await using var contenido = File.OpenRead(Path.Combine(directorio, archivo));
            resultados.Add(await servicio.ImportarAsync(tipo, contenido, ct));
        }
        await VerificarDisponibilidadAsync(ct);
        return resultados;
    }

    public async Task VerificarDisponibilidadAsync(CancellationToken ct = default)
    {
        var activos = await db.ElementosCatalogo.AsNoTracking().Where(e => e.Activo)
            .Select(e => new { e.Id, e.Tipo, e.Codigo, e.PadreId }).ToListAsync(ct);
        var presentes = activos.Select(e => e.Tipo).ToHashSet();
        var faltantes = Enum.GetValues<TipoCatalogo>().Where(t => !presentes.Contains(t)).Select(t => t.ToString()).ToList();
        var ecuador = activos.SingleOrDefault(e => e.Tipo == TipoCatalogo.Pais && e.Codigo == "218");
        if (ecuador is null)
        {
            faltantes.Add("Pais: Ecuador (218)");
        }
        else
        {
            var padres = new HashSet<int> { ecuador.Id };
            foreach (var tipo in new[] { TipoCatalogo.Provincia, TipoCatalogo.Canton, TipoCatalogo.Parroquia })
            {
                padres = activos.Where(e => e.Tipo == tipo && e.PadreId.HasValue && padres.Contains(e.PadreId.Value)).Select(e => e.Id).ToHashSet();
                if (padres.Count == 0)
                {
                    faltantes.Add($"{tipo}: relación con Ecuador");
                }
            }
            if (!activos.Any(e => e.Tipo == TipoCatalogo.Universidad && e.PadreId == ecuador.Id))
            {
                faltantes.Add("Universidad: relación con Ecuador");
            }
        }
        foreach (var tipo in new[] { TipoCatalogo.GradoAcademico, TipoCatalogo.CampoEspecificoUnesco, TipoCatalogo.CampoDetalladoUnesco })
        {
            var padres = activos.Where(e => e.Tipo == ElementoCatalogo.TipoPadre(tipo)).Select(e => e.Id).ToHashSet();
            if (!activos.Any(e => e.Tipo == tipo && e.PadreId.HasValue && padres.Contains(e.PadreId.Value)))
            {
                faltantes.Add($"{tipo}: relación con {ElementoCatalogo.TipoPadre(tipo)}");
            }
        }
        if (faltantes.Count > 0)
        {
            throw new InvalidOperationException($"Catálogos obligatorios incompletos: {string.Join(", ", faltantes)}. Ejecute --cargar-catalogos tras las migraciones y corrija los estados inactivos explícitamente.");
        }
    }
}
