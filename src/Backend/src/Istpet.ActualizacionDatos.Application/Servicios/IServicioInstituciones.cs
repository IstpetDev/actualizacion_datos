namespace Istpet.ActualizacionDatos.Application.Servicios;

using Istpet.ActualizacionDatos.Application.Modelos;

public interface IServicioInstituciones
{
    Task<InstitucionDto> CrearInstitucionAsync(CrearInstitucionRequest request, CancellationToken ct = default);
    Task<List<InstitucionDto>> ListarInstitucionesAsync(CancellationToken ct = default);
    Task<InstitucionDto?> ObtenerInstitucionPorIdAsync(Guid id, CancellationToken ct = default);
    Task<List<PersonaDto>> AsignarAdminsAsync(Guid institucionId, AsignarAdminsRequest request, CancellationToken ct = default);
    Task<List<PersonaDto>> ListarPersonalAsync(Guid institucionId, CancellationToken ct = default);
    Task<PersonaDto> AsignarPersonalAsync(Guid institucionId, AsignarPersonalInstitucionalRequest request, CancellationToken ct = default);
    Task<List<PersonaDto>> HabilitarPersonasAsync(Guid institucionId, HabilitarPersonasRequest request, CancellationToken ct = default);
}
