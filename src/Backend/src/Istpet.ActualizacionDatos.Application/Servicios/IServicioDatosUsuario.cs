namespace Istpet.ActualizacionDatos.Application.Servicios;

using Istpet.ActualizacionDatos.Application.Modelos;

public interface IServicioDatosUsuario
{
    Task<MisDatosDto> ObtenerMisDatosAsync(string documento, CancellationToken ct = default);
    Task EnviarARevisionAsync(string documento, CancellationToken ct = default);

    /// <summary>PD-HDV-04: pasa de «aprobado» a «borrador» con campaña abierta (segunda campaña, RF-FLU-005).</summary>
    Task IniciarNuevaActualizacionAsync(string documento, CancellationToken ct = default);

    Task<List<ObservacionDto>> ObtenerObservacionesAsync(string documento, CancellationToken ct = default);
}
