namespace Istpet.ActualizacionDatos.WebApi.Endpoints;

using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain;

// Exportación (RF-EXP-001 a 004, RF-HDV-016). Implementa T-08 (#13).
// Solo admin: el supervisor y el usuario reciben 403 también por la API (RF-EXP-003).
// El superadmin queda fuera hasta que se decida PD-13 de spec-0001.
internal static class ExportacionEndpoints
{
    private const string Tarea = "T-08 (#13)";

    public static void MapExportacion(this IEndpointRouteBuilder app)
    {
        var grupo = app.MapGroup("/api/exportacion").WithTags("Exportacion");

        grupo.MapGet("/excel", (HttpContext http, IContextoInstitucion contexto) => SoloAdmin(http, contexto))
            .WithName("ExportarExcel")
            .Produces(StatusCodes.Status200OK, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden);

        grupo.MapGet("/zip", (HttpContext http, IContextoInstitucion contexto) => SoloAdmin(http, contexto))
            .WithName("ExportarZip")
            .Produces(StatusCodes.Status200OK, contentType: "application/zip")
            .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden);
    }

    private static IResult SoloAdmin(HttpContext http, IContextoInstitucion contexto) =>
        AccesoEndpoints.RolActual(http, contexto) == RolUsuario.Admin
            ? AccesoEndpoints.NoImplementado(Tarea)
            : AccesoEndpoints.Prohibido("Solo el admin de la institución puede exportar.");
}
