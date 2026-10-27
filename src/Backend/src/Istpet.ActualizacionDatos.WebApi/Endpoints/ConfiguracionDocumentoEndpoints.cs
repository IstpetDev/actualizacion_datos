namespace Istpet.ActualizacionDatos.WebApi.Endpoints;

using System.Security.Claims;
using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Documentos;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain;

internal static class ConfiguracionDocumentoEndpoints
{
    public static void MapConfiguracionDocumento(this IEndpointRouteBuilder app)
    {
        var grupo = app.MapGroup("/api/configuracion/documento-hoja-de-vida")
            .WithTags("ConfiguracionDocumento")
            .RequireAuthorization(politica => politica.RequireRole(nameof(RolUsuario.Admin), nameof(RolUsuario.Superadmin)));

        grupo.MapGet("/", (HttpContext http, IContextoInstitucion contexto, IServicioConfiguracionDocumento servicio, CancellationToken ct) =>
            EnInstitucion(http, contexto, async () => Results.Ok(await servicio.ObtenerConfiguracionAsync(ct))))
            .WithName("ObtenerConfiguracionDocumento")
            .Produces<ConfiguracionDocumentoDto>()
            .Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden);

        grupo.MapPut("/marca", (ActualizarMarcaDto request, HttpContext http, IContextoInstitucion contexto, IServicioConfiguracionDocumento servicio, CancellationToken ct) =>
            EnInstitucion(http, contexto, async () => Results.Ok(await servicio.ActualizarMarcaAsync(request, ct))))
            .WithName("ActualizarMarcaDocumento")
            .Produces<ConfiguracionDocumentoDto>()
            .Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden);

        grupo.MapPut("/plantilla", (ElegirPlantillaDto request, HttpContext http, IContextoInstitucion contexto, IServicioConfiguracionDocumento servicio, CancellationToken ct) =>
            EnInstitucion(http, contexto, async () => Results.Ok(await servicio.ElegirPlantillaAsync(request, ct))))
            .WithName("ElegirPlantillaDocumento")
            .Produces<ConfiguracionDocumentoDto>()
            .Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden);

        grupo.MapPost("/aceptar-version", (HttpContext http, IContextoInstitucion contexto, IServicioConfiguracionDocumento servicio, CancellationToken ct) =>
            EnInstitucion(http, contexto, async () => Results.Ok(await servicio.AceptarNuevaVersionAsync(ct))))
            .WithName("AceptarVersionDocumento")
            .Produces<ConfiguracionDocumentoDto>()
            .Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden);
    }

    private static Task<IResult> EnInstitucion(HttpContext http, IContextoInstitucion contexto, Func<Task<IResult>> accion)
    {
        var institucionSesion = http.User.FindFirstValue("institucion_id");
        if (!http.User.IsInRole(nameof(RolUsuario.Superadmin)) &&
            (!Guid.TryParse(institucionSesion, out var institucionId) || contexto.InstitucionId?.Valor != institucionId || contexto.EsSuperadmin))
        {
            return Task.FromResult(AccesoEndpoints.Prohibido("Solo puede configurar su propia institución."));
        }

        return AccesoEndpoints.EjecutarAsync(accion);
    }
}
