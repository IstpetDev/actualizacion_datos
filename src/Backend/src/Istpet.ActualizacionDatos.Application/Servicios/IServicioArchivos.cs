namespace Istpet.ActualizacionDatos.Application.Servicios;

using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain;

public interface IServicioArchivos
{
    Task<ArchivoDto> SubirArchivoAsync(string documento, string nombreOriginal, string tipoContenido, Stream contenido, string? claveDestino = null, CancellationToken ct = default);
    Task<DescargaArchivoDto> ObtenerArchivoParaDescargaAsync(Guid archivoId, string actorSolicitante, RolUsuario rolSolicitante, CancellationToken ct = default);
    Task<List<ArchivoDto>> ListarArchivosPersonaAsync(string documento, CancellationToken ct = default);
    Task EliminarArchivoAsync(Guid archivoId, string documento, CancellationToken ct = default);
}
