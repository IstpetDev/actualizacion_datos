namespace Istpet.ActualizacionDatos.WebApi.Endpoints;

using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;

// Cuenta bancaria (RF-HDV-025 a 027, ADR-0013). T-10 (#45).
// El número completo solo sale por /numero, para su dueño, y cada lectura se audita.
internal static class CuentaBancariaEndpoints
{
    public static void MapCuentaBancaria(this IEndpointRouteBuilder app)
    {
        var mia = app.MapGroup("/api/mis-datos/cuenta-bancaria").WithTags("CuentaBancaria");

        mia.MapGet("/", (HttpContext http, IContextoInstitucion contexto, IServicioCuentaBancaria servicio, CancellationToken ct) =>
                DelDueno(http, contexto, async documento =>
                {
                    var cuenta = await servicio.ObtenerMiaAsync(documento, ct);
                    return cuenta == null ? Results.NoContent() : Results.Ok(cuenta);
                }))
            .WithName("ObtenerMiCuentaBancaria")
            .Produces<CuentaBancariaDto>()
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces<MensajeRespuesta>(StatusCodes.Status503ServiceUnavailable);

        mia.MapPut("/", (GuardarCuentaBancariaRequest request, HttpContext http, IContextoInstitucion contexto, IServicioCuentaBancaria servicio, CancellationToken ct) =>
                DelDueno(http, contexto, async documento => Results.Ok(await servicio.GuardarMiaAsync(documento, request, ct))))
            .WithName("GuardarMiCuentaBancaria")
            .Produces<CuentaBancariaDto>()
            .ProducesEscritura()
            .Produces<MensajeRespuesta>(StatusCodes.Status503ServiceUnavailable);

        mia.MapPost("/confirmar", (HttpContext http, IContextoInstitucion contexto, IServicioCuentaBancaria servicio, CancellationToken ct) =>
                DelDueno(http, contexto, async documento => Results.Ok(await servicio.ConfirmarMiaAsync(documento, ct))))
            .WithName("ConfirmarMiCuentaBancaria")
            .Produces<CuentaBancariaDto>()
            .ProducesEscritura()
            .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound);

        mia.MapGet("/numero", (HttpContext http, IContextoInstitucion contexto, IServicioCuentaBancaria servicio, CancellationToken ct) =>
                DelDueno(http, contexto, async documento =>
                {
                    var numero = await servicio.LeerMiNumeroAsync(documento, ct);
                    http.Response.Headers.CacheControl = "no-store";
                    return Results.Ok(numero);
                }))
            .WithName("LeerMiNumeroCuentaBancaria")
            .Produces<NumeroCuentaCompletoDto>()
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
            .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound)
            .Produces<MensajeRespuesta>(StatusCodes.Status503ServiceUnavailable);

        // Supervisor y admin: estado y últimos dígitos, nunca el número completo (ADR-0013 dec. 4).
        app.MapGet("/api/revision/cuentas-bancarias", (HttpContext http, IContextoInstitucion contexto, IServicioCuentaBancaria servicio, CancellationToken ct) =>
                SoloRevision(http, contexto, async () => Results.Ok(await servicio.ListarEstadosAsync(ct))))
            .WithTags("Revision")
            .WithName("ListarEstadosCuentasBancarias")
            .Produces<List<EstadoCuentaPersonaDto>>()
            .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden);

        app.MapGet("/api/revision/{documento}/cuenta-bancaria", (string documento, HttpContext http, IContextoInstitucion contexto, IServicioCuentaBancaria servicio, CancellationToken ct) =>
                SoloRevision(http, contexto, async () =>
                {
                    var cuenta = await servicio.ObtenerParaRevisionAsync(documento, ct);
                    return cuenta == null ? Results.NoContent() : Results.Ok(cuenta);
                }))
            .WithTags("Revision")
            .WithName("ObtenerCuentaBancariaParaRevision")
            .Produces<CuentaBancariaDto>()
            .Produces(StatusCodes.Status204NoContent)
            .Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
            .Produces<MensajeRespuesta>(StatusCodes.Status404NotFound);
    }

    private static Task<IResult> DelDueno(HttpContext http, IContextoInstitucion contexto, Func<string, Task<IResult>> accion)
    {
        var documento = AccesoEndpoints.DocumentoActual(http, contexto);
        return string.IsNullOrWhiteSpace(documento)
            ? Task.FromResult(Results.Unauthorized())
            : AccesoEndpoints.EjecutarAsync(() => accion(documento));
    }

    private static Task<IResult> SoloRevision(HttpContext http, IContextoInstitucion contexto, Func<Task<IResult>> accion) =>
        AccesoEndpoints.EsSupervisorOAdmin(http, contexto)
            ? AccesoEndpoints.EjecutarAsync(accion)
            : Task.FromResult(AccesoEndpoints.Prohibido("Solo el supervisor o el admin pueden revisar cuentas bancarias."));
}
