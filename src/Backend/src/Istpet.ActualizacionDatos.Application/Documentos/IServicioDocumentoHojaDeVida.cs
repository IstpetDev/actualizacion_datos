namespace Istpet.ActualizacionDatos.Application.Documentos;

using Istpet.ActualizacionDatos.Application.Modelos;

public interface IServicioDocumentoHojaDeVida
{
    Task<DescargaArchivoDto> ObtenerDocumentoPersonaAsync(Guid personaId, CancellationToken ct = default);
    Task<DescargaArchivoDto> ObtenerMiDocumentoAsync(CancellationToken ct = default);
}
