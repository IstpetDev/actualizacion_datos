namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Microsoft.Extensions.Configuration;

public class AlmacenArchivosDisco : IAlmacenArchivos
{
    private readonly string _rutaRaiz;

    public AlmacenArchivosDisco(IConfiguration configuracion)
    {
        var configurada = configuracion["Almacenamiento:RutaRaiz"];
        _rutaRaiz = !string.IsNullOrWhiteSpace(configurada)
            ? Path.GetFullPath(configurada.Trim())
            : Path.Combine(AppContext.BaseDirectory, "almacen_archivos");

        if (!Directory.Exists(_rutaRaiz))
        {
            Directory.CreateDirectory(_rutaRaiz);
        }
    }

    private string ObtenerRutaFisica(InstitucionId institucionId, Guid personaId, Guid archivoId)
    {
        var carpetaPersona = Path.Combine(_rutaRaiz, institucionId.Valor.ToString(), personaId.ToString());
        var rutaCompleta = Path.GetFullPath(Path.Combine(carpetaPersona, $"{archivoId}.bin"));

        // Seguridad contra Path Traversal: asegurar que esté dentro de _rutaRaiz
        if (!rutaCompleta.StartsWith(_rutaRaiz, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Ruta de archivo no válida fuera de la raíz de almacenamiento.");
        }

        return rutaCompleta;
    }

    public async Task<string> GuardarAsync(InstitucionId institucionId, Guid personaId, Guid archivoId, Stream contenido, CancellationToken ct = default)
    {
        var rutaFisica = ObtenerRutaFisica(institucionId, personaId, archivoId);
        var directorio = Path.GetDirectoryName(rutaFisica)!;

        if (!Directory.Exists(directorio))
        {
            Directory.CreateDirectory(directorio);
        }

        await using (var archivoStream = new FileStream(rutaFisica, FileMode.Create, FileAccess.Write, FileShare.None, bufferSize: 81920, useAsync: true))
        {
            await contenido.CopyToAsync(archivoStream, ct);
        }

        var rutaRelativa = Path.Combine(institucionId.Valor.ToString(), personaId.ToString(), $"{archivoId}.bin")
            .Replace('\\', '/');

        return rutaRelativa;
    }

    public Task<Stream?> AbrirAsync(InstitucionId institucionId, Guid personaId, Guid archivoId, CancellationToken ct = default)
    {
        var rutaFisica = ObtenerRutaFisica(institucionId, personaId, archivoId);
        if (!File.Exists(rutaFisica))
        {
            return Task.FromResult<Stream?>(null);
        }

        Stream stream = new FileStream(rutaFisica, FileMode.Open, FileAccess.Read, FileShare.Read, bufferSize: 81920, useAsync: true);
        return Task.FromResult<Stream?>(stream);
    }

    public Task<bool> EliminarAsync(InstitucionId institucionId, Guid personaId, Guid archivoId, CancellationToken ct = default)
    {
        var rutaFisica = ObtenerRutaFisica(institucionId, personaId, archivoId);
        if (!File.Exists(rutaFisica))
        {
            return Task.FromResult(false);
        }

        File.Delete(rutaFisica);
        return Task.FromResult(true);
    }

    public Task<bool> ExisteAsync(InstitucionId institucionId, Guid personaId, Guid archivoId, CancellationToken ct = default)
    {
        var rutaFisica = ObtenerRutaFisica(institucionId, personaId, archivoId);
        return Task.FromResult(File.Exists(rutaFisica));
    }
}
