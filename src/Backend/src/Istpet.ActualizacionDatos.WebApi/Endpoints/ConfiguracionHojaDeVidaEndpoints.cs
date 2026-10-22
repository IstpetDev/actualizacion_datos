namespace Istpet.ActualizacionDatos.WebApi.Endpoints;

using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Modelos;

// Configuración del admin (RF-HDV-012, 013, 015). Implementa T-05 (#31).
internal static class ConfiguracionHojaDeVidaEndpoints
{
    private const string Tarea = "T-05 (#31)";

    public static void MapConfiguracionHojaDeVida(this IEndpointRouteBuilder app)
    {
        var grupo = app.MapGroup("/api/configuracion").WithTags("Configuracion");

        MapRecurso<GuardarTipoFuncionarioRequest, TipoFuncionarioDto>(grupo, "tipos-funcionario", "TiposFuncionario", "TipoFuncionario");
        MapRecurso<GuardarTipoDocumentoRequest, TipoDocumentoDto>(grupo, "tipos-documento", "TiposDocumento", "TipoDocumento");
        MapRecurso<GuardarRequisitoDocumentoRequest, RequisitoDocumentoDto>(grupo, "requisitos", "RequisitosDocumento", "RequisitoDocumento");

        app.MapPut("/api/personas/{id:guid}/tipo-funcionario", (Guid id, AsignarTipoFuncionarioRequest request, HttpContext http, IContextoInstitucion contexto) => SoloAdmin(http, contexto))
            .WithTags("Personas")
            .WithName("AsignarTipoFuncionario")
            .Produces<MensajeRespuesta>()
            .Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
            .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
            .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound);
    }

    private static void MapRecurso<TRequest, TDto>(RouteGroupBuilder grupo, string ruta, string plural, string singular)
    {
        grupo.MapGet($"/{ruta}", (HttpContext http, IContextoInstitucion contexto) => SoloAdmin(http, contexto))
            .WithName($"Listar{plural}")
            .Produces<List<TDto>>()
            .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden);

        grupo.MapPost($"/{ruta}", (TRequest request, HttpContext http, IContextoInstitucion contexto) => SoloAdmin(http, contexto))
            .WithName($"Crear{singular}")
            .Produces<TDto>(StatusCodes.Status201Created)
            .Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
            .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden);

        grupo.MapPut($"/{ruta}/{{id:guid}}", (Guid id, TRequest request, HttpContext http, IContextoInstitucion contexto) => SoloAdmin(http, contexto))
            .WithName($"Actualizar{singular}")
            .Produces<TDto>()
            .Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
            .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
            .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound);
    }

    private static IResult SoloAdmin(HttpContext http, IContextoInstitucion contexto) =>
        AccesoEndpoints.EsAdmin(http, contexto)
            ? AccesoEndpoints.NoImplementado(Tarea)
            : AccesoEndpoints.Prohibido("Solo el admin de la institución puede configurar la hoja de vida.");
}
