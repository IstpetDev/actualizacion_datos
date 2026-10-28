namespace Istpet.ActualizacionDatos.Application.Documentos;

using Istpet.ActualizacionDatos.Domain;

public interface IArmadorDatosDocumento
{
    Task<DatosDocumentoHojaDeVida> ArmarDatosPersonaAsync(Guid personaId, InstitucionId institucionId, CancellationToken ct = default);
}
