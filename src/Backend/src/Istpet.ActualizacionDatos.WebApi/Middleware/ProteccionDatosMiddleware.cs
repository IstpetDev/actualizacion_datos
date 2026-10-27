namespace Istpet.ActualizacionDatos.WebApi.Middleware;

using System.Security.Claims;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Microsoft.AspNetCore.Authorization;

// Solo los pasos explícitos del acceso reciben esta excepción al bloqueo de negocio.
public sealed class PasoAccesoProteccionDatos;

public sealed class ProteccionDatosMiddleware(RequestDelegate siguiente)
{
    public async Task InvokeAsync(HttpContext contexto, IServicioProteccionDatos servicio)
    {
        if (!contexto.Request.Path.StartsWithSegments("/api") ||
            contexto.GetEndpoint()?.Metadata.GetMetadata<IAllowAnonymous>() != null)
        {
            await siguiente(contexto);
            return;
        }

        if (contexto.User.Identity?.IsAuthenticated != true ||
            !Guid.TryParse(contexto.User.FindFirstValue(ClaimTypes.NameIdentifier), out var personaId) ||
            !Guid.TryParse(contexto.User.FindFirstValue("institucion_id"), out var institucionId) ||
            !Enum.TryParse<RolUsuario>(contexto.User.FindFirstValue(ClaimTypes.Role), out var rol) || !Enum.IsDefined(rol))
        {
            contexto.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        if (contexto.GetEndpoint()?.Metadata.GetMetadata<PasoAccesoProteccionDatos>() == null)
        {
            var estado = await servicio.ObtenerEstadoAsync(personaId, new(institucionId), rol, contexto.RequestAborted);
            if (!estado.Aceptado)
            {
                contexto.Response.StatusCode = StatusCodes.Status403Forbidden;
                await contexto.Response.WriteAsJsonAsync(new MensajeRespuesta(
                    "Debe aceptar el aviso vigente de protección de datos antes de continuar.",
                    "ACEPTACION_PROTECCION_DATOS_PENDIENTE"), contexto.RequestAborted);
                return;
            }
        }
        await siguiente(contexto);
    }
}
