namespace Istpet.ActualizacionDatos.WebApi.Endpoints;

using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;

// Catálogos compartidos (RF-HDV-014, ADR-0010 dec. 5). Implementa T-01 (#29).
// {tipo} es el nombre de TipoCatalogo sin distinguir mayúsculas (p. ej. "Parroquia", "estadocivil").
internal static class CatalogosEndpoints
{
    private const string Tarea = "T-01 (#29)";

    public static void MapCatalogos(this IEndpointRouteBuilder app)
    {
        var grupo = app.MapGroup("/api/catalogos").WithTags("Catalogos");

        grupo.MapGet("/{tipo}", (string tipo, int? padreId, HttpContext http, IContextoInstitucion contexto) =>
            {
                if (string.IsNullOrWhiteSpace(AccesoEndpoints.DocumentoActual(http, contexto)))
                {
                    return Results.Unauthorized();
                }

                return TipoValido(tipo) ? AccesoEndpoints.NoImplementado(Tarea) : TipoDesconocido(tipo);
            })
            .WithName("ListarCatalogo")
            .Produces<List<ElementoCatalogoDto>>()
            .Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized);

        grupo.MapPost("/{tipo}/importar", (string tipo, IFormFile archivo, HttpContext http, IContextoInstitucion contexto) =>
            {
                if (!AccesoEndpoints.EsSuperadmin(http, contexto))
                {
                    return AccesoEndpoints.Prohibido("Solo el superadmin puede importar catálogos.");
                }

                return TipoValido(tipo) ? AccesoEndpoints.NoImplementado(Tarea) : TipoDesconocido(tipo);
            })
            .WithName("ImportarCatalogo")
            .DisableAntiforgery()
            .Produces<ResultadoImportacionCatalogoDto>()
            .Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
            .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden);
    }

    /// <summary>Acepta el nombre del enum; rechaza números para que la ruta no dependa del valor interno.</summary>
    internal static bool IntentarLeerTipo(string tipo, out TipoCatalogo valor) =>
        Enum.TryParse(tipo, ignoreCase: true, out valor) &&
        !int.TryParse(tipo, out _) &&
        Enum.IsDefined(valor);

    private static bool TipoValido(string tipo) => IntentarLeerTipo(tipo, out _);

    private static IResult TipoDesconocido(string tipo) =>
        Results.BadRequest(new MensajeRespuesta($"El catálogo «{tipo}» no existe."));
}
