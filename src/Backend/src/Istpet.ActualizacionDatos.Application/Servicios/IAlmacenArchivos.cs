namespace Istpet.ActualizacionDatos.Application.Servicios;

using Istpet.ActualizacionDatos.Domain;

public interface IAlmacenArchivos
{
    Task<string> GuardarAsync(InstitucionId institucionId, Guid personaId, Guid archivoId, Stream contenido, CancellationToken ct = default);
    Task<Stream?> AbrirAsync(InstitucionId institucionId, Guid personaId, Guid archivoId, CancellationToken ct = default);
    Task<bool> EliminarAsync(InstitucionId institucionId, Guid personaId, Guid archivoId, CancellationToken ct = default);
    Task<bool> ExisteAsync(InstitucionId institucionId, Guid personaId, Guid archivoId, CancellationToken ct = default);
}
