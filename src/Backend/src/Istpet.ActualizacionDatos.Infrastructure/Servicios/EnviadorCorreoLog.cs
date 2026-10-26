namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using Istpet.ActualizacionDatos.Application.Servicios;
using Microsoft.Extensions.Logging;

public partial class EnviadorCorreoLog : IEnviadorCorreo
{
    private readonly ILogger<EnviadorCorreoLog> _logger;

    public EnviadorCorreoLog(ILogger<EnviadorCorreoLog> logger)
    {
        _logger = logger;
    }

    public Task EnviarCodigoVerificacionAsync(string correoDestino, string codigo, CancellationToken ct = default)
    {
        // En desarrollo y pruebas, se escribe en log sin almacenar contraseña ni exponer datos en producción (ADR-0007).
        LogCodigoGenerado(_logger, correoDestino);
        return Task.CompletedTask;
    }

    [LoggerMessage(
        EventId = 1001,
        Level = LogLevel.Information,
        Message = "Envío de código de verificación a {CorreoDestino}: [CÓDIGO GENERADO]")]
    private static partial void LogCodigoGenerado(ILogger logger, string correoDestino);
}
