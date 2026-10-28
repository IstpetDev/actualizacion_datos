namespace Istpet.ActualizacionDatos.WebApi.Endpoints;

using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

internal static class SeccionesEndpoints
{
    public static void MapSecciones(this IEndpointRouteBuilder app)
    {
        var grupo = app.MapGroup("/api/configuracion/secciones")
            .WithTags("ConfiguracionSecciones")
            .RequireAuthorization();

        grupo.MapGet("/", async (IServicioSecciones servicio, CancellationToken ct) =>
        {
            var resultado = await servicio.ListarConfiguracionAsync(ct);
            return Results.Ok(resultado);
        })
        .WithName("ListarSeccionesConfiguracion")
        .Produces<List<SeccionConfiguracionDto>>()
        .Produces<MensajeRespuesta>(StatusCodes.Status401Unauthorized)
        .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden);

        grupo.MapPut("/{codigo}", async (string codigo, CambiarEstadoSeccionRequest request, IServicioSecciones servicio, CancellationToken ct) =>
        {
            var resultado = await servicio.CambiarEstadoAsync(codigo, request.Habilitada, ct);
            return Results.Ok(resultado);
        })
        .WithName("CambiarEstadoSeccion")
        .Produces<SeccionConfiguracionDto>()
        .Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
        .Produces<MensajeRespuesta>(StatusCodes.Status401Unauthorized)
        .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
        .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound)
        .Produces<MensajeRespuesta>(StatusCodes.Status409Conflict);
    }
}
