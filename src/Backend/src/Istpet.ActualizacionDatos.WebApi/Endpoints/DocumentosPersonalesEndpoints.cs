namespace Istpet.ActualizacionDatos.WebApi.Endpoints;

using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;

// Documentos personales por requisito (RF-HDV-007, 008, 010, 015). Implementa T-03.
internal static class DocumentosPersonalesEndpoints
{
    public static void MapDocumentosPersonales(this IEndpointRouteBuilder app)
    {
        var grupo = app.MapGroup("/api/mis-datos/documentos").WithTags("DocumentosPersonales");

        grupo.MapGet("/", (HttpContext http, IContextoInstitucion contexto, IServicioDocumentosPersonales servicio, CancellationToken ct) =>
            DelDueno(http, contexto, async doc => Results.Ok(await servicio.ListarAsync(doc, ct))))
        .WithName("ListarMisDocumentosPersonales")
        .Produces<List<DocumentoRequeridoDto>>()
        .Produces(StatusCodes.Status401Unauthorized);

        grupo.MapPut("/{tipoDocumentoId:guid}", (Guid tipoDocumentoId, GuardarDocumentoPersonalRequest request, HttpContext http, IContextoInstitucion contexto, IServicioDocumentosPersonales servicio, CancellationToken ct) =>
            DelDueno(http, contexto, async doc => Results.Ok(await servicio.GuardarAsync(doc, tipoDocumentoId, request, ct))))
        .WithName("GuardarMiDocumentoPersonal")
        .Produces<DocumentoPersonalDto>()
        .ProducesEscritura()
        .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound);
    }

    private static Task<IResult> DelDueno(HttpContext http, IContextoInstitucion contexto, Func<string, Task<IResult>> accion)
    {
        var documento = AccesoEndpoints.DocumentoActual(http, contexto);
        return string.IsNullOrWhiteSpace(documento)
            ? Task.FromResult(Results.Unauthorized())
            : AccesoEndpoints.EjecutarAsync(() => accion(documento));
    }
}
