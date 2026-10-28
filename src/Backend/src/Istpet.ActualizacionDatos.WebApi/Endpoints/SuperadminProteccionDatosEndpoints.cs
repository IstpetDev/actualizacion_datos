namespace Istpet.ActualizacionDatos.WebApi.Endpoints;

using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;

internal static class SuperadminProteccionDatosEndpoints
{
    public static void MapSuperadminProteccionDatos(this IEndpointRouteBuilder app)
    {
        var grupo = app.MapGroup("/api/superadmin/instituciones/{id:guid}/avisos-proteccion-datos")
            .WithTags("SuperadminProteccionDatos")
            .RequireAuthorization(politica => politica.RequireRole(nameof(RolUsuario.Superadmin)));

        grupo.MapGet("/", async (Guid id, IServicioProteccionDatos servicio, CancellationToken ct) =>
            await AccesoEndpoints.EjecutarAsync(async () =>
                Results.Ok(await servicio.ListarHistorialAsync(new InstitucionId(id), ct))))
            .WithName("ListarAvisosProteccionDatosInstitucion")
            .Produces<List<AvisoInstitucionalDto>>()
            .Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
            .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound);

        grupo.MapPost("/", async (Guid id, PublicarAvisoInstitucionalRequest request, HttpContext contexto, IServicioProteccionDatos servicio, IContextoInstitucion contextoInstitucion, CancellationToken ct) =>
            await AccesoEndpoints.EjecutarAsync(async () =>
            {
                var actor = AccesoEndpoints.DocumentoActual(contexto, contextoInstitucion) ?? "superadmin";
                var solicitud = new PublicarAvisoRequest(
                    id,
                    request.Version,
                    request.Titulo,
                    request.Responsable,
                    request.Contenido,
                    request.DeclaracionAceptacion,
                    request.FuenteOficial,
                    request.EvidenciaAprobacion,
                    request.RolesDestinatarios,
                    request.VigenteDesdeUtc,
                    request.VigenteHastaUtc,
                    request.AprobacionInstitucionalConfirmada);

                var publicado = await servicio.PublicarAsync(solicitud, actor, ct);
                return Results.Created($"/api/superadmin/instituciones/{id}/avisos-proteccion-datos", publicado);
            }))
            .WithName("PublicarAvisoProteccionDatosInstitucion")
            .Produces<AvisoInstitucionalDto>(StatusCodes.Status201Created)
            .Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
            .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound);
    }
}
