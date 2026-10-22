namespace Istpet.ActualizacionDatos.Application.Servicios;

using Istpet.ActualizacionDatos.Application.Modelos;

public interface IServicioCampanas
{
    Task<CampanaDto> CrearCampanaAsync(CrearCampanaRequest request, CancellationToken ct = default);
    Task<List<CampanaDto>> ListarCampanasAsync(CancellationToken ct = default);
    Task<CampanaDto?> ObtenerCampanaActivaAsync(CancellationToken ct = default);
    Task<EstadoEdicionDto> ObtenerEstadoEdicionAsync(string documento, CancellationToken ct = default);
    Task ActualizarDatosUsuarioAsync(string documento, ActualizarDatosRequest request, CancellationToken ct = default);
}
