namespace Istpet.ActualizacionDatos.WebApi.Endpoints;

using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;

// Hoja de vida del usuario (RF-HDV-001 a 006, 009, 010, 015, 017, 020). Implementa T-02 (#30);
// /faltantes lo implementa T-04. El usuario solo opera sobre su propia hoja de vida: no hay parámetro
// «documento»; el supervisor y el admin la leen por /api/revision/{documento}/hoja-de-vida.
internal static class HojaDeVidaEndpoints
{
    public static void MapHojaDeVida(this IEndpointRouteBuilder app)
    {
        var grupo = app.MapGroup("/api/mis-datos/hoja-de-vida").WithTags("HojaDeVida");

        grupo.MapGet("/", (HttpContext http, IContextoInstitucion contexto, IServicioHojaDeVida servicio, CancellationToken ct) =>
            DelDueno(http, contexto, async doc => Results.Ok(await servicio.ObtenerAsync(doc, ct))))
        .WithName("ObtenerMiHojaDeVida")
        .Produces<HojaDeVidaDto>()
        .Produces(StatusCodes.Status401Unauthorized);

        grupo.MapGet("/ficha", (HttpContext http, IContextoInstitucion contexto, IServicioHojaDeVida servicio, CancellationToken ct) =>
            DelDueno(http, contexto, async doc =>
            {
                var hdv = await servicio.ObtenerAsync(doc, ct);
                return hdv.Ficha == null ? Results.NoContent() : Results.Ok(hdv.Ficha);
            }))
        .WithName("ObtenerMiFichaPersonal")
        .Produces<FichaPersonalDto>()
        .Produces(StatusCodes.Status204NoContent)
        .Produces(StatusCodes.Status401Unauthorized);

        grupo.MapPut("/ficha", (GuardarFichaPersonalRequest request, HttpContext http, IContextoInstitucion contexto, IServicioHojaDeVida servicio, CancellationToken ct) =>
            DelDueno(http, contexto, async doc => Results.Ok(await servicio.GuardarFichaAsync(doc, request, ct))))
        .WithName("GuardarMiFichaPersonal")
        .Produces<FichaPersonalDto>()
        .ProducesEscritura();

        // Titulos
        grupo.MapPost("/titulos", (GuardarTituloAcademicoRequest request, HttpContext http, IContextoInstitucion contexto, IServicioHojaDeVida servicio, CancellationToken ct) =>
            DelDueno(http, contexto, async doc =>
            {
                var res = await servicio.AgregarTituloAsync(doc, request, ct);
                return Results.Created($"/api/mis-datos/hoja-de-vida/titulos/{res.Id}", res);
            }))
        .WithName("AgregarTituloAcademico")
        .Produces<TituloAcademicoDto>(StatusCodes.Status201Created)
        .ProducesEscritura();

        grupo.MapPut("/titulos/{id:guid}", (Guid id, GuardarTituloAcademicoRequest request, HttpContext http, IContextoInstitucion contexto, IServicioHojaDeVida servicio, CancellationToken ct) =>
            DelDueno(http, contexto, async doc => Results.Ok(await servicio.ActualizarTituloAsync(doc, id, request, ct))))
        .WithName("ActualizarTituloAcademico")
        .Produces<TituloAcademicoDto>()
        .ProducesEscritura()
        .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound);

        grupo.MapDelete("/titulos/{id:guid}", (Guid id, HttpContext http, IContextoInstitucion contexto, IServicioHojaDeVida servicio, CancellationToken ct) =>
            DelDueno(http, contexto, async doc =>
            {
                await servicio.EliminarTituloAsync(doc, id, ct);
                return Results.NoContent();
            }))
        .WithName("EliminarTituloAcademico")
        .Produces(StatusCodes.Status204NoContent)
        .ProducesEscritura()
        .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound);

        // Titulos en curso
        grupo.MapPost("/titulos-en-curso", (GuardarTituloEnCursoRequest request, HttpContext http, IContextoInstitucion contexto, IServicioHojaDeVida servicio, CancellationToken ct) =>
            DelDueno(http, contexto, async doc =>
            {
                var res = await servicio.AgregarTituloEnCursoAsync(doc, request, ct);
                return Results.Created($"/api/mis-datos/hoja-de-vida/titulos-en-curso/{res.Id}", res);
            }))
        .WithName("AgregarTituloEnCurso")
        .Produces<TituloEnCursoDto>(StatusCodes.Status201Created)
        .ProducesEscritura();

        grupo.MapPut("/titulos-en-curso/{id:guid}", (Guid id, GuardarTituloEnCursoRequest request, HttpContext http, IContextoInstitucion contexto, IServicioHojaDeVida servicio, CancellationToken ct) =>
            DelDueno(http, contexto, async doc => Results.Ok(await servicio.ActualizarTituloEnCursoAsync(doc, id, request, ct))))
        .WithName("ActualizarTituloEnCurso")
        .Produces<TituloEnCursoDto>()
        .ProducesEscritura()
        .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound);

        grupo.MapDelete("/titulos-en-curso/{id:guid}", (Guid id, HttpContext http, IContextoInstitucion contexto, IServicioHojaDeVida servicio, CancellationToken ct) =>
            DelDueno(http, contexto, async doc =>
            {
                await servicio.EliminarTituloEnCursoAsync(doc, id, ct);
                return Results.NoContent();
            }))
        .WithName("EliminarTituloEnCurso")
        .Produces(StatusCodes.Status204NoContent)
        .ProducesEscritura()
        .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound);

        // Capacitaciones
        grupo.MapPost("/capacitaciones", (GuardarCapacitacionRequest request, HttpContext http, IContextoInstitucion contexto, IServicioHojaDeVida servicio, CancellationToken ct) =>
            DelDueno(http, contexto, async doc =>
            {
                var res = await servicio.AgregarCapacitacionAsync(doc, request, ct);
                return Results.Created($"/api/mis-datos/hoja-de-vida/capacitaciones/{res.Id}", res);
            }))
        .WithName("AgregarCapacitacion")
        .Produces<CapacitacionDto>(StatusCodes.Status201Created)
        .ProducesEscritura();

        grupo.MapPut("/capacitaciones/{id:guid}", (Guid id, GuardarCapacitacionRequest request, HttpContext http, IContextoInstitucion contexto, IServicioHojaDeVida servicio, CancellationToken ct) =>
            DelDueno(http, contexto, async doc => Results.Ok(await servicio.ActualizarCapacitacionAsync(doc, id, request, ct))))
        .WithName("ActualizarCapacitacion")
        .Produces<CapacitacionDto>()
        .ProducesEscritura()
        .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound);

        grupo.MapDelete("/capacitaciones/{id:guid}", (Guid id, HttpContext http, IContextoInstitucion contexto, IServicioHojaDeVida servicio, CancellationToken ct) =>
            DelDueno(http, contexto, async doc =>
            {
                await servicio.EliminarCapacitacionAsync(doc, id, ct);
                return Results.NoContent();
            }))
        .WithName("EliminarCapacitacion")
        .Produces(StatusCodes.Status204NoContent)
        .ProducesEscritura()
        .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound);

        // Experiencias
        grupo.MapPost("/experiencias", (GuardarExperienciaLaboralRequest request, HttpContext http, IContextoInstitucion contexto, IServicioHojaDeVida servicio, CancellationToken ct) =>
            DelDueno(http, contexto, async doc =>
            {
                var res = await servicio.AgregarExperienciaAsync(doc, request, ct);
                return Results.Created($"/api/mis-datos/hoja-de-vida/experiencias/{res.Id}", res);
            }))
        .WithName("AgregarExperienciaLaboral")
        .Produces<ExperienciaLaboralDto>(StatusCodes.Status201Created)
        .ProducesEscritura();

        grupo.MapPut("/experiencias/{id:guid}", (Guid id, GuardarExperienciaLaboralRequest request, HttpContext http, IContextoInstitucion contexto, IServicioHojaDeVida servicio, CancellationToken ct) =>
            DelDueno(http, contexto, async doc => Results.Ok(await servicio.ActualizarExperienciaAsync(doc, id, request, ct))))
        .WithName("ActualizarExperienciaLaboral")
        .Produces<ExperienciaLaboralDto>()
        .ProducesEscritura()
        .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound);

        grupo.MapDelete("/experiencias/{id:guid}", (Guid id, HttpContext http, IContextoInstitucion contexto, IServicioHojaDeVida servicio, CancellationToken ct) =>
            DelDueno(http, contexto, async doc =>
            {
                await servicio.EliminarExperienciaAsync(doc, id, ct);
                return Results.NoContent();
            }))
        .WithName("EliminarExperienciaLaboral")
        .Produces(StatusCodes.Status204NoContent)
        .ProducesEscritura()
        .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound);

        // Referencias
        grupo.MapPost("/referencias", (GuardarReferenciaRequest request, HttpContext http, IContextoInstitucion contexto, IServicioHojaDeVida servicio, CancellationToken ct) =>
            DelDueno(http, contexto, async doc =>
            {
                var res = await servicio.AgregarReferenciaAsync(doc, request, ct);
                return Results.Created($"/api/mis-datos/hoja-de-vida/referencias/{res.Id}", res);
            }))
        .WithName("AgregarReferencia")
        .Produces<ReferenciaDto>(StatusCodes.Status201Created)
        .ProducesEscritura();

        grupo.MapPut("/referencias/{id:guid}", (Guid id, GuardarReferenciaRequest request, HttpContext http, IContextoInstitucion contexto, IServicioHojaDeVida servicio, CancellationToken ct) =>
            DelDueno(http, contexto, async doc => Results.Ok(await servicio.ActualizarReferenciaAsync(doc, id, request, ct))))
        .WithName("ActualizarReferencia")
        .Produces<ReferenciaDto>()
        .ProducesEscritura()
        .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound);

        grupo.MapDelete("/referencias/{id:guid}", (Guid id, HttpContext http, IContextoInstitucion contexto, IServicioHojaDeVida servicio, CancellationToken ct) =>
            DelDueno(http, contexto, async doc =>
            {
                await servicio.EliminarReferenciaAsync(doc, id, ct);
                return Results.NoContent();
            }))
        .WithName("EliminarReferencia")
        .Produces(StatusCodes.Status204NoContent)
        .ProducesEscritura()
        .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound);

        grupo.MapGet("/faltantes", (HttpContext http, IContextoInstitucion contexto, IValidadorCompletitudEnvio validador, IServicioHojaDeVida servicioHojaDeVida, CancellationToken ct) =>
            DelDueno(http, contexto, async doc =>
            {
                var hdv = await servicioHojaDeVida.ObtenerAsync(doc, ct);
                var resultado = await validador.ValidarAsync(hdv.PersonaId, ct);
                return Results.Ok(resultado);
            }))
        .WithName("ObtenerFaltantesEnvio")
        .Produces<ResultadoValidacionEnvioDto>()
        .Produces(StatusCodes.Status401Unauthorized);

        // Lectura para la revisión (escenario 2). Mismo prefijo que las rutas de revisión de Program.cs.
        app.MapGet("/api/revision/{documento}/hoja-de-vida", (string documento, HttpContext http, IContextoInstitucion contexto, IServicioHojaDeVida servicio, CancellationToken ct) =>
                SoloRevision(http, contexto, async () =>
                {
                    var hdv = await servicio.ObtenerParaRevisionAsync(documento, ct);
                    return Results.Ok(hdv);
                }))
            .WithTags("Revision")
            .WithName("ObtenerHojaDeVidaParaRevision")
            .Produces<HojaDeVidaDto>()
            .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
            .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound);

        var grupoObligatorias = app.MapGroup("/api/mis-datos/capacitaciones-obligatorias").WithTags("CapacitacionesObligatorias");

        grupoObligatorias.MapGet("/", (HttpContext http, IContextoInstitucion contexto, IServicioHojaDeVida servicio, CancellationToken ct) =>
            DelDueno(http, contexto, async doc => Results.Ok(await servicio.ListarCapacitacionesObligatoriasAsync(doc, ct))))
            .WithName("ObtenerMisCapacitacionesObligatorias")
            .Produces<List<EstadoCapacitacionObligatoriaPersonaDto>>()
            .Produces(StatusCodes.Status401Unauthorized);

        grupoObligatorias.MapPost("/{id:guid}/vincular", (Guid id, VincularCapacitacionObligatoriaRequest request, HttpContext http, IContextoInstitucion contexto, IServicioHojaDeVida servicio, CancellationToken ct) =>
            DelDueno(http, contexto, async doc =>
            {
                await servicio.VincularCapacitacionObligatoriaAsync(doc, id, request, ct);
                return Results.Ok(new MensajeRespuesta("Capacitación vinculada a la obligación institucional."));
            }))
            .WithName("VincularCapacitacionObligatoria")
            .Produces<MensajeRespuesta>()
            .ProducesEscritura()
            .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound)
            .Produces<MensajeRespuesta>(StatusCodes.Status409Conflict);

        grupoObligatorias.MapPost("/{id:guid}/justificar-nuevo-ingreso", (Guid id, JustificarNuevoIngresoRequest request, HttpContext http, IContextoInstitucion contexto, IServicioHojaDeVida servicio, CancellationToken ct) =>
            DelDueno(http, contexto, async doc =>
            {
                await servicio.JustificarNuevoIngresoAsync(doc, id, request, ct);
                return Results.Ok(new MensajeRespuesta("Justificación de nuevo ingreso registrada."));
            }))
            .WithName("JustificarNuevoIngresoCapacitacionObligatoria")
            .Produces<MensajeRespuesta>()
            .ProducesEscritura()
            .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound)
            .Produces<MensajeRespuesta>(StatusCodes.Status409Conflict);
    }

    private static Task<IResult> DelDueno(HttpContext http, IContextoInstitucion contexto, Func<string, Task<IResult>> accion)
    {
        if (http.User.Identity?.IsAuthenticated == true && !http.User.IsInRole("Superadmin"))
        {
            var id = http.User.FindFirst("institucion_id")?.Value;
            if (!Guid.TryParse(id, out var institucionId) || contexto.InstitucionId?.Valor != institucionId || contexto.EsSuperadmin)
                return Task.FromResult(AccesoEndpoints.Prohibido("La institución debe corresponder a su sesión."));
        }
        var documento = AccesoEndpoints.DocumentoActual(http, contexto);
        return string.IsNullOrWhiteSpace(documento)
            ? Task.FromResult(Results.Unauthorized())
            : AccesoEndpoints.EjecutarAsync(() => accion(documento));
    }

    private static Task<IResult> SoloRevision(HttpContext http, IContextoInstitucion contexto, Func<Task<IResult>> accion) =>
        AccesoEndpoints.EsSupervisorOAdmin(http, contexto)
            ? AccesoEndpoints.EjecutarAsync(accion)
            : Task.FromResult(AccesoEndpoints.Prohibido("Solo el supervisor o el admin pueden revisar la hoja de vida."));

    /// <summary>Respuestas comunes de toda escritura del usuario: regla incumplida, fuera de campaña y sin sesión.</summary>
    internal static RouteHandlerBuilder ProducesEscritura(this RouteHandlerBuilder builder) =>
        builder
            .Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
            .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status401Unauthorized);
}
