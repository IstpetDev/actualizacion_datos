namespace Istpet.ActualizacionDatos.Application.Servicios;

using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain;

public interface IServicioProteccionDatos
{
    Task<EstadoProteccionDatosDto> ObtenerEstadoAsync(Guid personaId, InstitucionId institucionId,
        RolUsuario rol, CancellationToken ct = default);
    Task<EstadoProteccionDatosDto> AceptarAsync(Guid personaId, InstitucionId institucionId,
        RolUsuario rol, AceptarAvisoRequest solicitud, CancellationToken ct = default);
    Task<AvisoInstitucionalDto> PublicarAsync(PublicarAvisoRequest solicitud, string? actor = null, CancellationToken ct = default);
    Task<List<AvisoInstitucionalDto>> ListarHistorialAsync(InstitucionId institucionId, CancellationToken ct = default);
}
