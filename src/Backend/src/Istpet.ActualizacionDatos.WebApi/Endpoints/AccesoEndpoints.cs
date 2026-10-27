namespace Istpet.ActualizacionDatos.WebApi.Endpoints;

using System.Security.Claims;
using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Application.Validacion;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;

// Ayudas compartidas por los archivos de Endpoints/ (spec-0003, T-00). Repiten la resolución de actor
// y de rol que usa Program.cs, para que cada grupo nuevo no dependa de funciones locales de ese archivo.
internal static class AccesoEndpoints
{
    public static string? DocumentoActual(HttpContext httpContext, IContextoInstitucion contexto) =>
        httpContext.User.FindFirst(ClaimTypes.Name)?.Value ?? contexto.ActorActual;

    public static RolUsuario? RolActual(HttpContext httpContext, IContextoInstitucion contexto)
    {
        if (contexto.RolActual != null)
        {
            return contexto.RolActual;
        }

        var claimRol = httpContext.User.FindFirst(ClaimTypes.Role)?.Value;
        return !string.IsNullOrEmpty(claimRol) && Enum.TryParse<RolUsuario>(claimRol, ignoreCase: true, out var rol)
            ? rol
            : null;
    }

    public static bool EsSupervisorOAdmin(HttpContext httpContext, IContextoInstitucion contexto) =>
        RolActual(httpContext, contexto) is RolUsuario.Supervisor or RolUsuario.Admin or RolUsuario.Superadmin;

    public static bool EsAdmin(HttpContext httpContext, IContextoInstitucion contexto) =>
        RolActual(httpContext, contexto) is RolUsuario.Admin or RolUsuario.Superadmin;

    public static bool EsSuperadmin(HttpContext httpContext, IContextoInstitucion contexto) =>
        RolActual(httpContext, contexto) is RolUsuario.Superadmin;

    public static IResult Prohibido(string mensaje) =>
        Results.Json(new MensajeRespuesta(mensaje), statusCode: StatusCodes.Status403Forbidden);

    /// <summary>Respuesta de los endpoints cuyo servicio aún no existe. Cada tarea la reemplaza al implementar.</summary>
    public static IResult NoImplementado(string tarea) =>
        Results.Json(
            new MensajeRespuesta($"Endpoint definido en el contrato de spec-0003; se implementa en {tarea}."),
            statusCode: StatusCodes.Status501NotImplemented);

    /// <summary>
    /// Traduce las excepciones de la capa de aplicación al contrato de errores de plan.md:
    /// recurso ajeno o inexistente → 404; envío incompleto → 400 con faltantes; fuera de campaña → 403;
    /// cualquier otra regla → 400 con su mensaje.
    /// </summary>
    public static async Task<IResult> EjecutarAsync(Func<Task<IResult>> accion)
    {
        try
        {
            return await accion();
        }
        catch (ValidacionCamposException ex)
        {
            return Results.BadRequest(new MensajeRespuesta(ex.Message, "VALIDACION_CAMPOS", ex.Errores));
        }
        catch (RecursoNoEncontradoException ex)
        {
            return Results.NotFound(new MensajeRespuesta(ex.Message));
        }
        catch (CuentaBancariaNoDisponibleException ex)
        {
            return Results.Json(new MensajeRespuesta(ex.Message), statusCode: StatusCodes.Status503ServiceUnavailable);
        }
        catch (EnvioIncompletoException ex)
        {
            return Results.BadRequest(new EnvioIncompletoRespuesta(ex.Message, [.. ex.Faltantes]));
        }
        catch (SeccionNoDisponibleException ex)
        {
            return Results.Json(new MensajeRespuesta(ex.Message, "SECCION_NO_DISPONIBLE"), statusCode: StatusCodes.Status409Conflict);
        }
        catch (ReglaNegocioException ex) when (ex.Message.Contains("no puede cerrarse", StringComparison.OrdinalIgnoreCase))
        {
            return Results.Json(new MensajeRespuesta(ex.Message, "SECCION_NO_MODIFICABLE"), statusCode: StatusCodes.Status409Conflict);
        }
        catch (ReglaNegocioException ex) when (ex.Message.Contains("fuera del período", StringComparison.OrdinalIgnoreCase))
        {
            return Prohibido(ex.Message);
        }
        catch (ReglaNegocioException ex)
        {
            return Results.BadRequest(new MensajeRespuesta(ex.Message));
        }
    }
}
