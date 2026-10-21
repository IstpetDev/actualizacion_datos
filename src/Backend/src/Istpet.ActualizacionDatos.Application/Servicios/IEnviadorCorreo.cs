namespace Istpet.ActualizacionDatos.Application.Servicios;

public interface IEnviadorCorreo
{
    Task EnviarCodigoVerificacionAsync(string correoDestino, string codigo, CancellationToken ct = default);
}
