namespace Istpet.ActualizacionDatos.WebApi.Endpoints;

using Istpet.ActualizacionDatos.Application.Documentos;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain;

internal static class DocumentoHojaDeVidaEndpoints
{
    public static void MapDocumentoHojaDeVida(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/personas/{id:guid}/documento-hoja-de-vida", async (Guid id, IServicioDocumentoHojaDeVida servicio, CancellationToken ct) =>
            await AccesoEndpoints.EjecutarAsync(async () =>
            {
                var descarga = await servicio.ObtenerDocumentoPersonaAsync(id, ct);
                return Results.File(descarga.Contenido, descarga.TipoContenido, descarga.NombreOriginal);
            }))
            .RequireAuthorization(politica => politica.RequireRole(nameof(RolUsuario.Admin), nameof(RolUsuario.Supervisor), nameof(RolUsuario.Superadmin)))
            .WithTags("Personas")
            .WithName("DescargarDocumentoHojaDeVidaPersona")
            .Produces(StatusCodes.Status200OK, contentType: "application/pdf")
            .Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
            .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound);

        app.MapGet("/api/mis-datos/documento-hoja-de-vida", async (IServicioDocumentoHojaDeVida servicio, CancellationToken ct) =>
            await AccesoEndpoints.EjecutarAsync(async () =>
            {
                var descarga = await servicio.ObtenerMiDocumentoAsync(ct);
                return Results.File(descarga.Contenido, descarga.TipoContenido, descarga.NombreOriginal);
            }))
            .RequireAuthorization(politica => politica.RequireRole(nameof(RolUsuario.Admin), nameof(RolUsuario.Supervisor), nameof(RolUsuario.Superadmin)))
            .WithTags("MisDatos")
            .WithName("DescargarMiDocumentoHojaDeVida")
            .Produces(StatusCodes.Status200OK, contentType: "application/pdf")
            .Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
            .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound);
    }
}
