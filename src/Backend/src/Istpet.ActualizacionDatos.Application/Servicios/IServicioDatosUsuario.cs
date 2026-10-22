namespace Istpet.ActualizacionDatos.Application.Servicios;

using Istpet.ActualizacionDatos.Application.Modelos;

public interface IServicioDatosUsuario
{
    Task<MisDatosDto> ObtenerMisDatosAsync(string documento, CancellationToken ct = default);
    Task AceptarTratamientoDatosAsync(string documento, CancellationToken ct = default);
    Task EnviarARevisionAsync(string documento, CancellationToken ct = default);
    Task<List<ObservacionDto>> ObtenerObservacionesAsync(string documento, CancellationToken ct = default);
}
