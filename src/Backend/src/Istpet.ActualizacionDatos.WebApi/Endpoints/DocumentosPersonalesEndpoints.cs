namespace Istpet.ActualizacionDatos.WebApi.Endpoints;

using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Modelos;

// Documentos personales por requisito (RF-HDV-007, 008, 010, 015). Implementa T-03.
internal static class DocumentosPersonalesEndpoints
{
    private const string Tarea = "T-03";

    public static void MapDocumentosPersonales(this IEndpointRouteBuilder app)
    {
        var grupo = app.MapGroup("/api/mis-datos/documentos").WithTags("DocumentosPersonales");

        grupo.MapGet("/", (HttpContext http, IContextoInstitucion contexto) => DelUsuario(http, contexto))
            .WithName("ListarMisDocumentosPersonales")
            .Produces<List<DocumentoRequeridoDto>>()
            .Produces(StatusCodes.Status401Unauthorized);

        grupo.MapPut("/{tipoDocumentoId:guid}", (Guid tipoDocumentoId, GuardarDocumentoPersonalRequest request, HttpContext http, IContextoInstitucion contexto) => DelUsuario(http, contexto))
            .WithName("GuardarMiDocumentoPersonal")
            .Produces<DocumentoPersonalDto>()
            .ProducesEscritura()
            .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound);
    }

    private static IResult DelUsuario(HttpContext http, IContextoInstitucion contexto) =>
        string.IsNullOrWhiteSpace(AccesoEndpoints.DocumentoActual(http, contexto))
            ? Results.Unauthorized()
            : AccesoEndpoints.NoImplementado(Tarea);
}
