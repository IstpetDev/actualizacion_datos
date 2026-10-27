namespace Istpet.ActualizacionDatos.WebApi;

using System.Text.Json;
using Istpet.ActualizacionDatos.Application.Modelos;
using Microsoft.AspNetCore.Diagnostics;

// Respuesta acotada a errores de enlace JSON. Nunca registra excepciones que puedan contener datos personales.
public sealed class ValidacionJsonHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is not BadHttpRequestException { StatusCode: 400 } malaPeticion) return false;
        var json = malaPeticion.InnerException as JsonException;
        var campo = json?.Path?.TrimStart('$', '.') ?? "solicitud";
        if (string.IsNullOrEmpty(campo)) campo = "solicitud";
        var motivo = campo.Equals("perfil", StringComparison.OrdinalIgnoreCase)
            ? "El perfil se genera automáticamente y no se admite en la solicitud."
            : "Revise el formato y el tipo de dato de este campo.";
        httpContext.Response.StatusCode = 400;
        await httpContext.Response.WriteAsJsonAsync(new MensajeRespuesta("Revise los campos indicados.", "VALIDACION_CAMPOS",
            new() { [campo] = [motivo] }, httpContext.TraceIdentifier), cancellationToken);
        return true;
    }
}
