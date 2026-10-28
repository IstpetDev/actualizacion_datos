namespace Istpet.ActualizacionDatos.WebApi.Endpoints;

using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;

internal static class PersonalInstitucionalEndpoints
{
    public static void MapPersonalInstitucional(this IEndpointRouteBuilder app)
    {
        var global = app.MapGroup("/api/instituciones/{id:guid}/personal")
            .WithTags("PersonalInstitucional")
            .RequireAuthorization(politica => politica.RequireRole(nameof(RolUsuario.Superadmin)));

        var listarGlobal = global.MapGet("/", async (Guid id, IServicioInstituciones servicio, CancellationToken ct) =>
            Results.Ok(await servicio.ListarPersonalAsync(id, ct)))
            .WithName("ListarPersonalInstitucion")
            .Produces<List<PersonaDto>>();

        var asignarGlobal = global.MapPost("/", async (Guid id, AsignarPersonalInstitucionalRequest request, IServicioInstituciones servicio, CancellationToken ct) =>
            Results.Ok(await servicio.AsignarPersonalAsync(id, request, ct)))
            .WithName("AsignarPersonalInstitucion")
            .Produces<PersonaDto>();

        var supervisores = app.MapGroup("/api/personas/supervisores")
            .WithTags("Supervisores")
            .RequireAuthorization(politica => politica.RequireRole(nameof(RolUsuario.Admin)));

        var listarSupervisores = supervisores.MapGet("/", async (IContextoInstitucion contexto, IServicioInstituciones servicio, CancellationToken ct) =>
            Results.Ok(await servicio.ListarPersonalAsync(InstitucionActual(contexto), ct)))
            .WithName("ListarSupervisores")
            .Produces<List<PersonaDto>>();

        var asignarSupervisor = supervisores.MapPost("/", async (AsignarPersonalInstitucionalRequest request, IContextoInstitucion contexto, IServicioInstituciones servicio, CancellationToken ct) =>
            Results.Ok(await servicio.AsignarPersonalAsync(InstitucionActual(contexto), request, ct)))
            .WithName("AsignarSupervisor")
            .Produces<PersonaDto>();

        foreach (var endpoint in new[] { listarGlobal, asignarGlobal, listarSupervisores, asignarSupervisor })
        {
            endpoint.Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
                .Produces(StatusCodes.Status401Unauthorized)
                .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
                .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound)
                .Produces<MensajeRespuesta>(StatusCodes.Status409Conflict);
        }
    }

    private static Guid InstitucionActual(IContextoInstitucion contexto) => contexto.InstitucionId?.Valor
        ?? throw new ReglaNegocioException("No tiene permisos sin una institución activa.");
}
