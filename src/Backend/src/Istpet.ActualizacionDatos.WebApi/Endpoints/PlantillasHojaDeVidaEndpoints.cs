namespace Istpet.ActualizacionDatos.WebApi.Endpoints;

using Istpet.ActualizacionDatos.Application.Documentos;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain;

internal static class PlantillasHojaDeVidaEndpoints
{
    public static void MapPlantillasHojaDeVida(this IEndpointRouteBuilder app)
    {
        var grupo = app.MapGroup("/api/plantillas-hoja-de-vida")
            .WithTags("PlantillasHojaDeVida")
            .RequireAuthorization();

        grupo.MapGet("/", async (bool? soloPublicadas, IServicioPlantillasHojaDeVida servicio, CancellationToken ct) =>
            await AccesoEndpoints.EjecutarAsync(async () =>
                Results.Ok(await servicio.ListarPlantillasAsync(soloPublicadas ?? false, ct))))
            .RequireAuthorization(politica => politica.RequireRole(nameof(RolUsuario.Admin), nameof(RolUsuario.Superadmin)))
            .WithName("ListarPlantillasHojaDeVida")
            .Produces<List<PlantillaResumenDto>>()
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden);

        grupo.MapGet("/{id:guid}", async (Guid id, IServicioPlantillasHojaDeVida servicio, CancellationToken ct) =>
            await AccesoEndpoints.EjecutarAsync(async () =>
                Results.Ok(await servicio.ObtenerPlantillaPorIdAsync(id, ct))))
            .RequireAuthorization(politica => politica.RequireRole(nameof(RolUsuario.Admin), nameof(RolUsuario.Superadmin)))
            .WithName("ObtenerPlantillaHojaDeVida")
            .Produces<PlantillaDetalleDto>()
            .Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
            .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound);

        var grupoAdminGlobal = grupo.MapGroup("/")
            .RequireAuthorization(politica => politica.RequireRole(nameof(RolUsuario.Superadmin)));

        grupoAdminGlobal.MapPost("/", async (CrearPlantillaDto request, IServicioPlantillasHojaDeVida servicio, CancellationToken ct) =>
            await AccesoEndpoints.EjecutarAsync(async () =>
            {
                var creada = await servicio.CrearPlantillaAsync(request, ct);
                return Results.Created($"/api/plantillas-hoja-de-vida/{creada.Id}", creada);
            }))
            .WithName("CrearPlantillaHojaDeVida")
            .Produces<PlantillaDetalleDto>(StatusCodes.Status201Created)
            .Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden);

        grupoAdminGlobal.MapPut("/{id:guid}", async (Guid id, ActualizarPlantillaDto request, IServicioPlantillasHojaDeVida servicio, CancellationToken ct) =>
            await AccesoEndpoints.EjecutarAsync(async () =>
                Results.Ok(await servicio.ActualizarPlantillaAsync(id, request, ct))))
            .WithName("ActualizarPlantillaHojaDeVida")
            .Produces<PlantillaDetalleDto>()
            .Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
            .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound);

        grupoAdminGlobal.MapPost("/{id:guid}/publicar", async (Guid id, PublicarVersionDto request, IServicioPlantillasHojaDeVida servicio, CancellationToken ct) =>
            await AccesoEndpoints.EjecutarAsync(async () =>
                Results.Ok(await servicio.PublicarVersionAsync(id, request, ct))))
            .WithName("PublicarVersionPlantilla")
            .Produces<VersionPlantillaDto>()
            .Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
            .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound);

        grupoAdminGlobal.MapPost("/{id:guid}/predeterminada", async (Guid id, IServicioPlantillasHojaDeVida servicio, CancellationToken ct) =>
            await AccesoEndpoints.EjecutarAsync(async () =>
            {
                await servicio.MarcarComoPredeterminadaAsync(id, ct);
                return Results.Ok(new MensajeRespuesta("Plantilla marcada como predeterminada global."));
            }))
            .WithName("MarcarPlantillaPredeterminada")
            .Produces<MensajeRespuesta>()
            .Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
            .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound);
    }
}
