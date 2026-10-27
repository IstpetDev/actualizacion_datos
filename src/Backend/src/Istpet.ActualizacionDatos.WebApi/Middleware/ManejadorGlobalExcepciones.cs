namespace Istpet.ActualizacionDatos.WebApi.Middleware;

using System.Diagnostics;
using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Npgsql;

public sealed partial class ManejadorGlobalExcepciones(
    ILogger<ManejadorGlobalExcepciones> logger,
    IHostEnvironment environment) : IExceptionHandler
{
    [LoggerMessage(LogLevel.Error, "Error no controlado [{TraceId}] en {Metodo} {Ruta}: {MensajeError}")]
    private static partial void LogErrorNoControlado(
        ILogger logger,
        Exception ex,
        string traceId,
        string metodo,
        string ruta,
        string mensajeError);

    [LoggerMessage(LogLevel.Warning, "Error controlado {StatusCode} [{TraceId}] en {Metodo} {Ruta}: {MensajeError}")]
    private static partial void LogErrorControlado(
        ILogger logger,
        int statusCode,
        string traceId,
        string metodo,
        string ruta,
        string mensajeError);

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var traceId = Activity.Current?.Id ?? httpContext.TraceIdentifier;
        var (statusCode, mensaje, codigo, errores) = DeterminarRespuesta(exception, traceId);

        if (statusCode >= StatusCodes.Status500InternalServerError)
        {
            LogErrorNoControlado(
                logger,
                exception,
                traceId,
                httpContext.Request.Method,
                httpContext.Request.Path,
                exception.Message);
        }
        else
        {
            LogErrorControlado(
                logger,
                statusCode,
                traceId,
                httpContext.Request.Method,
                httpContext.Request.Path,
                exception.Message);
        }

        httpContext.Response.StatusCode = statusCode;
        httpContext.Response.ContentType = "application/json";

        var respuesta = new MensajeRespuesta(mensaje, codigo, errores, traceId);
        await httpContext.Response.WriteAsJsonAsync(respuesta, cancellationToken);

        return true;
    }

    private (int StatusCode, string Mensaje, string? Codigo, Dictionary<string, string[]>? Errores) DeterminarRespuesta(Exception exception, string traceId)
    {
        return exception switch
        {
            ProteccionDatosException ex => (
                ex.Codigo == "AVISO_PROTECCION_DATOS_NO_DISPONIBLE" ? StatusCodes.Status503ServiceUnavailable :
                ex.Codigo == "VERSION_AVISO_CAMBIADA" ? StatusCodes.Status409Conflict : StatusCodes.Status403Forbidden,
                ex.Message, ex.Codigo, null),
            RecursoNoEncontradoException ex => (
                StatusCodes.Status404NotFound,
                ex.Message,
                "RECURSO_NO_ENCONTRADO",
                null),

            CuentaBancariaNoDisponibleException ex => (
                StatusCodes.Status503ServiceUnavailable,
                ex.Message,
                "SERVICIO_NO_DISPONIBLE",
                null),

            EnvioIncompletoException ex => (
                StatusCodes.Status400BadRequest,
                ex.Message,
                "ENVIO_INCOMPLETO",
                ex.Faltantes?.Count > 0 ? new Dictionary<string, string[]> { ["faltantes"] = ex.Faltantes.Select(f => $"{f.Seccion}: {f.Mensaje}").ToArray() } : null),

            ReglaNegocioException ex when ex.Message.Contains("fuera del período", StringComparison.OrdinalIgnoreCase) ||
                                          ex.Message.Contains("no tiene permisos", StringComparison.OrdinalIgnoreCase) => (
                StatusCodes.Status403Forbidden,
                ex.Message,
                "OPERACION_PROHIBIDA",
                null),

            ReglaNegocioException ex => (
                StatusCodes.Status400BadRequest,
                ex.Message,
                "REGLA_NEGOCIO",
                null),

            ArgumentException ex => (
                StatusCodes.Status400BadRequest,
                ex.Message,
                "PARAMETRO_INVALIDO",
                ex.ParamName != null ? new Dictionary<string, string[]> { [ex.ParamName] = [ex.Message] } : null),

            BadHttpRequestException => (
                StatusCodes.Status400BadRequest,
                "El formato de los datos enviados en la petición es inválido.",
                "FORMATO_INVALIDO",
                null),

            DbUpdateException ex when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation } ||
                                       (ex.InnerException != null && ex.InnerException.Message.Contains("UNIQUE constraint failed", StringComparison.OrdinalIgnoreCase))) => (
                StatusCodes.Status409Conflict,
                "Ya existe un registro con los mismos datos clave en el sistema.",
                "CONFLICTO_UNICIDAD",
                null),

            DbUpdateException ex when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.ForeignKeyViolation } ||
                                       (ex.InnerException != null && ex.InnerException.Message.Contains("FOREIGN KEY constraint failed", StringComparison.OrdinalIgnoreCase))) => (
                StatusCodes.Status400BadRequest,
                "La operación hace referencia a un registro relacionado que no existe.",
                "REFERENCIA_INVALIDA",
                null),

            _ => (
                StatusCodes.Status500InternalServerError,
                environment.IsDevelopment()
                    ? $"Ha ocurrido un error inesperado: {exception.Message}"
                    : "Ha ocurrido un error inesperado en el servidor.",
                "ERROR_INTERNO",
                null)
        };
    }
}
