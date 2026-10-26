namespace Istpet.ActualizacionDatos.Application.Servicios;

using Istpet.ActualizacionDatos.Application.Modelos;

public interface IServicioAutenticacion
{
    Task<ResultadoLoginDto> IniciarSesionAsync(LoginRequest request, CancellationToken ct = default);
    Task CambiarContrasenaAsync(string documento, CambiarContrasenaRequest request, CancellationToken ct = default);
    Task EnviarCodigoCorreoAsync(string documento, EnviarCodigoCorreoRequest request, CancellationToken ct = default);
    Task VerificarCodigoCorreoAsync(string documento, VerificarCodigoCorreoRequest request, CancellationToken ct = default);
    Task<SesionUsuarioDto?> ObtenerSesionActualAsync(string documento, CancellationToken ct = default);
}
