namespace Istpet.ActualizacionDatos.WebApi.Endpoints;

using System.Security.Claims;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.WebApi.Middleware;

public static class ProteccionDatosEndpoints
{
    public static void MapProteccionDatos(this WebApplication app)
    {
        app.MapGet("/api/proteccion-datos/aviso", async (HttpContext contexto, IServicioProteccionDatos servicio, CancellationToken ct) =>
        {
            var (persona, institucion, rol) = Identidad(contexto);
            var estado = await servicio.ObtenerEstadoAsync(persona, institucion, rol, ct);
            return !estado.Aceptado && estado.Aviso == null
                ? Results.Json(new MensajeRespuesta(estado.Mensaje!, "AVISO_PROTECCION_DATOS_NO_DISPONIBLE"), statusCode: StatusCodes.Status503ServiceUnavailable)
                : Results.Ok(estado);
        })
        .WithName("ObtenerAvisoProteccionDatos").WithTags("ProteccionDatos")
        .WithMetadata(new PasoAccesoProteccionDatos()).RequireAuthorization()
        .Produces<EstadoProteccionDatosDto>()
        .Produces<MensajeRespuesta>(StatusCodes.Status503ServiceUnavailable)
        .Produces(StatusCodes.Status401Unauthorized).Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden);

        // Se conserva una sola ruta de aceptación, ahora explícita y versionada.
        app.MapPost("/api/mis-datos/aceptar-tratamiento", async (AceptarAvisoRequest solicitud, HttpContext contexto, IServicioProteccionDatos servicio, CancellationToken ct) =>
        {
            if (contexto.Request.Query.ContainsKey("documento"))
                return Results.BadRequest(new MensajeRespuesta("La aceptación solo puede registrarse para la persona autenticada, sin parámetro documento."));
            var (persona, institucion, rol) = Identidad(contexto);
            return Results.Ok(await servicio.AceptarAsync(persona, institucion, rol, solicitud, ct));
        })
        .WithName("AceptarTratamientoDatos").WithTags("ProteccionDatos")
        .WithMetadata(new PasoAccesoProteccionDatos()).RequireAuthorization()
        .Produces<EstadoProteccionDatosDto>()
        .Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
        .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
        .Produces<MensajeRespuesta>(StatusCodes.Status409Conflict)
        .Produces<MensajeRespuesta>(StatusCodes.Status503ServiceUnavailable)
        .Produces(StatusCodes.Status401Unauthorized);
    }

    private static (Guid Persona, InstitucionId Institucion, RolUsuario Rol) Identidad(HttpContext contexto) => (
        Guid.Parse(contexto.User.FindFirstValue(ClaimTypes.NameIdentifier)!),
        new(Guid.Parse(contexto.User.FindFirstValue("institucion_id")!)),
        Enum.Parse<RolUsuario>(contexto.User.FindFirstValue(ClaimTypes.Role)!));
}
