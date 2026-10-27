namespace Istpet.ActualizacionDatos.WebApi.Endpoints;

using System.Security.Claims;
using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Application.Validacion;
using Istpet.ActualizacionDatos.Domain;

internal static class ConfiguracionHojaDeVidaEndpoints
{
    public static void MapConfiguracionHojaDeVida(this IEndpointRouteBuilder app)
    {
        var grupo = app.MapGroup("/api/configuracion").WithTags("Configuracion")
            .RequireAuthorization(politica => politica.RequireRole(nameof(RolUsuario.Admin), nameof(RolUsuario.Superadmin)));

        app.MapGet("/api/configuracion/politica-validacion", (HttpContext http, IContextoInstitucion contexto, IServicioConfiguracionHojaDeVida servicio, CancellationToken ct) =>
            EnInstitucion(http, contexto, async () => Results.Ok(await servicio.ObtenerPoliticaValidacionAsync(ct))))
            .RequireAuthorization().WithTags("Configuracion").WithName("ObtenerPoliticaValidacion")
            .Produces<PoliticaValidacionDto>().Produces<MensajeRespuesta>(400).Produces(401).Produces<MensajeRespuesta>(403);
        grupo.MapPut("/correo-institucional", (GuardarDominiosCorreoRequest request, HttpContext http, IContextoInstitucion contexto, IServicioConfiguracionHojaDeVida servicio, CancellationToken ct) =>
            EnInstitucion(http, contexto, async () => Results.Ok(await servicio.GuardarDominiosCorreoAsync(request, ct))))
            .WithName("GuardarDominiosCorreo").Produces<PoliticaValidacionDto>().Produces<MensajeRespuesta>(400).Produces(401).Produces<MensajeRespuesta>(403);

        MapRecurso<GuardarTipoFuncionarioRequest, TipoFuncionarioDto>(grupo, "tipos-funcionario", "TiposFuncionario", "TipoFuncionario",
            (s, ct) => s.ListarTiposFuncionarioAsync(ct), (s, r, ct) => s.CrearTipoFuncionarioAsync(r, ct),
            (s, id, r, ct) => s.ActualizarTipoFuncionarioAsync(id, r, ct), (s, id, ct) => s.EliminarTipoFuncionarioAsync(id, ct), t => t.Id);
        MapRecurso<GuardarTipoDocumentoRequest, TipoDocumentoDto>(grupo, "tipos-documento", "TiposDocumento", "TipoDocumento",
            (s, ct) => s.ListarTiposDocumentoAsync(ct), (s, r, ct) => s.CrearTipoDocumentoAsync(r, ct),
            (s, id, r, ct) => s.ActualizarTipoDocumentoAsync(id, r, ct), (s, id, ct) => s.EliminarTipoDocumentoAsync(id, ct), t => t.Id);
        MapRecurso<GuardarRequisitoDocumentoRequest, RequisitoDocumentoDto>(grupo, "requisitos", "RequisitosDocumento", "RequisitoDocumento",
            (s, ct) => s.ListarRequisitosAsync(ct), (s, r, ct) => s.CrearRequisitoAsync(r, ct),
            (s, id, r, ct) => s.ActualizarRequisitoAsync(id, r, ct), (s, id, ct) => s.EliminarRequisitoAsync(id, ct), r => r.Id);

        app.MapPut("/api/personas/{id:guid}/tipo-funcionario", (Guid id, AsignarTipoFuncionarioRequest request, HttpContext http, IContextoInstitucion contexto, IServicioConfiguracionHojaDeVida servicio, CancellationToken ct) =>
                EnInstitucion(http, contexto, async () =>
                {
                    await servicio.AsignarTipoFuncionarioAsync(id, request, ct);
                    return Results.Ok(new MensajeRespuesta("Tipo de funcionario actualizado."));
                }))
            .RequireAuthorization(politica => politica.RequireRole(nameof(RolUsuario.Admin), nameof(RolUsuario.Superadmin)))
            .WithTags("Personas")
            .WithName("AsignarTipoFuncionario")
            .Produces<MensajeRespuesta>()
            .Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
            .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound);

        app.MapPost("/api/personas/asignar-tipo-masivo", (AsignarTipoFuncionarioMasivoRequest request, HttpContext http, IContextoInstitucion contexto, IServicioConfiguracionHojaDeVida servicio, CancellationToken ct) =>
                EnInstitucion(http, contexto, async () =>
                {
                    var resultado = await servicio.AsignarTipoFuncionarioMasivoAsync(request, ct);
                    return Results.Ok(resultado);
                }))
            .RequireAuthorization(politica => politica.RequireRole(nameof(RolUsuario.Admin), nameof(RolUsuario.Superadmin)))
            .WithTags("Personas")
            .WithName("AsignarTipoFuncionarioMasivo")
            .Produces<ResultadoAsignacionTipoMasivoDto>()
            .Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
            .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound);
    }

    private static void MapRecurso<TRequest, TDto>(RouteGroupBuilder grupo, string ruta, string plural, string singular,
        Func<IServicioConfiguracionHojaDeVida, CancellationToken, Task<List<TDto>>> listar,
        Func<IServicioConfiguracionHojaDeVida, TRequest, CancellationToken, Task<TDto>> crear,
        Func<IServicioConfiguracionHojaDeVida, Guid, TRequest, CancellationToken, Task<TDto>> actualizar,
        Func<IServicioConfiguracionHojaDeVida, Guid, CancellationToken, Task> eliminar,
        Func<TDto, Guid> obtenerId)
    {
        grupo.MapGet($"/{ruta}", (HttpContext http, IContextoInstitucion contexto, IServicioConfiguracionHojaDeVida servicio, CancellationToken ct) =>
                EnInstitucion(http, contexto, async () => Results.Ok(await listar(servicio, ct))))
            .WithName($"Listar{plural}")
            .Produces<List<TDto>>()
            .Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden);

        grupo.MapPost($"/{ruta}", (TRequest request, HttpContext http, IContextoInstitucion contexto, IServicioConfiguracionHojaDeVida servicio, CancellationToken ct) =>
                EnInstitucion(http, contexto, async () =>
                {
                    var dto = await crear(servicio, request, ct);
                    return Results.Created($"/api/configuracion/{ruta}/{obtenerId(dto)}", dto);
                }))
            .WithName($"Crear{singular}")
            .Produces<TDto>(StatusCodes.Status201Created)
            .Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
            .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound);

        grupo.MapPut($"/{ruta}/{{id:guid}}", (Guid id, TRequest request, HttpContext http, IContextoInstitucion contexto, IServicioConfiguracionHojaDeVida servicio, CancellationToken ct) =>
                EnInstitucion(http, contexto, async () => Results.Ok(await actualizar(servicio, id, request, ct))))
            .WithName($"Actualizar{singular}")
            .Produces<TDto>()
            .Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
            .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound);

        grupo.MapDelete($"/{ruta}/{{id:guid}}", (Guid id, HttpContext http, IContextoInstitucion contexto, IServicioConfiguracionHojaDeVida servicio, CancellationToken ct) =>
                EnInstitucion(http, contexto, async () =>
                {
                    await eliminar(servicio, id, ct);
                    return Results.NoContent();
                }))
            .WithName($"Eliminar{singular}")
            .WithSummary("Da de baja el registro (Activo=false) conservando sus referencias.")
            .Produces(StatusCodes.Status204NoContent)
            .Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
            .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound);
    }

    private static Task<IResult> EnInstitucion(HttpContext http, IContextoInstitucion contexto, Func<Task<IResult>> accion)
    {
        // Los permisos proceden de la cookie. Un admin no puede seleccionar otra institución por cabecera.
        var institucionSesion = http.User.FindFirstValue("institucion_id");
        if (!http.User.IsInRole(nameof(RolUsuario.Superadmin)) &&
            (!Guid.TryParse(institucionSesion, out var institucionId) || contexto.InstitucionId?.Valor != institucionId || contexto.EsSuperadmin))
        {
            return Task.FromResult(AccesoEndpoints.Prohibido("Solo puede configurar su propia institución."));
        }
        return AccesoEndpoints.EjecutarAsync(accion);
    }
}
