namespace Istpet.ActualizacionDatos.WebApi.Endpoints;

using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Servicios;

public static class CatalogosEndpoints
{
    public static void MapCatalogos(this WebApplication app)
    {
        var grupo = app.MapGroup("/api/catalogos").WithTags("Catalogos").RequireAuthorization();
        grupo.MapGet("/{tipo}", async (string tipo, int? padreId, IServicioCatalogos servicio, CancellationToken ct) =>
        {
            if (!Enum.TryParse<TipoCatalogo>(tipo, ignoreCase: true, out var tipoCatalogo) || !Enum.IsDefined(tipoCatalogo))
            {
                return Results.BadRequest(new MensajeRespuesta("El tipo de catálogo no existe."));
            }

            try
            {
                return Results.Ok(await servicio.ConsultarAsync(tipoCatalogo, padreId, ct));
            }
            catch (ReglaNegocioException ex)
            {
                return Results.BadRequest(new MensajeRespuesta(ex.Message));
            }
        })
        .WithName("ConsultarCatalogo")
        .Produces<List<ElementoCatalogoDto>>()
        .Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status401Unauthorized);

        grupo.MapPost("/{tipo}/importar", async (string tipo, IFormFile archivo, IServicioCatalogos servicio, CancellationToken ct) =>
        {
            if (!Enum.TryParse<TipoCatalogo>(tipo, ignoreCase: true, out var tipoCatalogo) || !Enum.IsDefined(tipoCatalogo))
            {
                return Results.BadRequest(new MensajeRespuesta("El tipo de catálogo no existe."));
            }

            if (archivo.Length is <= 0 or > ServicioCatalogos.MaximoBytesCsv)
            {
                return Results.BadRequest(new MensajeRespuesta("Debe proporcionar un CSV no vacío de hasta 1 MiB."));
            }

            try
            {
                await using var contenido = archivo.OpenReadStream();
                return Results.Ok(await servicio.ImportarAsync(tipoCatalogo, contenido, ct));
            }
            catch (ReglaNegocioException ex)
            {
                return Results.BadRequest(new MensajeRespuesta(ex.Message));
            }
        })
        .RequireAuthorization(politica => politica.RequireRole(nameof(RolUsuario.Superadmin)))
        .DisableAntiforgery()
        .WithName("ImportarCatalogo")
        .Produces<ResultadoImportacionCatalogoDto>()
        .Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
        .Produces(StatusCodes.Status401Unauthorized)
        .Produces(StatusCodes.Status403Forbidden);
    }
}
