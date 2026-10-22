namespace Istpet.ActualizacionDatos.WebApi.Endpoints;

using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Modelos;

// Hoja de vida del usuario (RF-HDV-001 a 006, 009, 010, 015, 017, 020). Implementa T-02 (#30);
// /faltantes lo implementa T-04. El usuario solo opera sobre su propia hoja de vida: no hay parámetro
// «documento»; el supervisor y el admin la leen por /api/revision/{documento}/hoja-de-vida.
internal static class HojaDeVidaEndpoints
{
    private const string TareaItems = "T-02 (#30)";
    private const string TareaFaltantes = "T-04 (#30)";

    public static void MapHojaDeVida(this IEndpointRouteBuilder app)
    {
        var grupo = app.MapGroup("/api/mis-datos/hoja-de-vida").WithTags("HojaDeVida");

        grupo.MapGet("/", (HttpContext http, IContextoInstitucion contexto) => DelUsuario(http, contexto, TareaItems))
            .WithName("ObtenerMiHojaDeVida")
            .Produces<HojaDeVidaDto>()
            .Produces(StatusCodes.Status401Unauthorized);

        grupo.MapGet("/ficha", (HttpContext http, IContextoInstitucion contexto) => DelUsuario(http, contexto, TareaItems))
            .WithName("ObtenerMiFichaPersonal")
            .Produces<FichaPersonalDto>()
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status401Unauthorized);

        grupo.MapPut("/ficha", (GuardarFichaPersonalRequest request, HttpContext http, IContextoInstitucion contexto) => DelUsuario(http, contexto, TareaItems))
            .WithName("GuardarMiFichaPersonal")
            .Produces<FichaPersonalDto>()
            .ProducesEscritura();

        MapSeccion<GuardarTituloAcademicoRequest, TituloAcademicoDto>(grupo, "titulos", "TituloAcademico");
        MapSeccion<GuardarTituloEnCursoRequest, TituloEnCursoDto>(grupo, "titulos-en-curso", "TituloEnCurso");
        MapSeccion<GuardarCapacitacionRequest, CapacitacionDto>(grupo, "capacitaciones", "Capacitacion");
        MapSeccion<GuardarExperienciaLaboralRequest, ExperienciaLaboralDto>(grupo, "experiencias", "ExperienciaLaboral");
        MapSeccion<GuardarReferenciaRequest, ReferenciaDto>(grupo, "referencias", "Referencia");

        grupo.MapGet("/faltantes", (HttpContext http, IContextoInstitucion contexto) => DelUsuario(http, contexto, TareaFaltantes))
            .WithName("ObtenerFaltantesEnvio")
            .Produces<ResultadoValidacionEnvioDto>()
            .Produces(StatusCodes.Status401Unauthorized);

        // Lectura para la revisión (escenario 2). Mismo prefijo que las rutas de revisión de Program.cs.
        app.MapGet("/api/revision/{documento}/hoja-de-vida", (string documento, HttpContext http, IContextoInstitucion contexto) =>
                AccesoEndpoints.EsSupervisorOAdmin(http, contexto)
                    ? AccesoEndpoints.NoImplementado(TareaItems)
                    : AccesoEndpoints.Prohibido("Solo el supervisor o el admin pueden revisar la hoja de vida."))
            .WithTags("Revision")
            .WithName("ObtenerHojaDeVidaParaRevision")
            .Produces<HojaDeVidaDto>()
            .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
            .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound);
    }

    private static void MapSeccion<TRequest, TDto>(RouteGroupBuilder grupo, string ruta, string nombre)
    {
        grupo.MapPost($"/{ruta}", (TRequest request, HttpContext http, IContextoInstitucion contexto) => DelUsuario(http, contexto, TareaItems))
            .WithName($"Agregar{nombre}")
            .Produces<TDto>(StatusCodes.Status201Created)
            .ProducesEscritura();

        grupo.MapPut($"/{ruta}/{{id:guid}}", (Guid id, TRequest request, HttpContext http, IContextoInstitucion contexto) => DelUsuario(http, contexto, TareaItems))
            .WithName($"Actualizar{nombre}")
            .Produces<TDto>()
            .ProducesEscritura()
            .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound);

        grupo.MapDelete($"/{ruta}/{{id:guid}}", (Guid id, HttpContext http, IContextoInstitucion contexto) => DelUsuario(http, contexto, TareaItems))
            .WithName($"Eliminar{nombre}")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesEscritura()
            .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound);
    }

    private static IResult DelUsuario(HttpContext http, IContextoInstitucion contexto, string tarea) =>
        string.IsNullOrWhiteSpace(AccesoEndpoints.DocumentoActual(http, contexto))
            ? Results.Unauthorized()
            : AccesoEndpoints.NoImplementado(tarea);

    /// <summary>Respuestas comunes de toda escritura del usuario: regla incumplida, fuera de campaña y sin sesión.</summary>
    internal static RouteHandlerBuilder ProducesEscritura(this RouteHandlerBuilder builder) =>
        builder
            .Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
            .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status401Unauthorized);
}
