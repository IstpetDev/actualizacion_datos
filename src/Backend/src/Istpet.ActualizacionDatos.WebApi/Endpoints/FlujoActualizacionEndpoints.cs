namespace Istpet.ActualizacionDatos.WebApi.Endpoints;

using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;

// Segunda campaña (PD-HDV-04, RF-FLU-005), T-06 (#32): la persona en «aprobado» pasa a «borrador»
// con una acción explícita y solo con campaña abierta. Solo sobre su propia actualización.
internal static class FlujoActualizacionEndpoints
{
    public static void MapFlujoActualizacion(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/mis-datos/iniciar-actualizacion", (HttpContext http, IContextoInstitucion contexto, IServicioDatosUsuario servicio, CancellationToken ct) =>
            {
                var documento = AccesoEndpoints.DocumentoActual(http, contexto);
                if (string.IsNullOrWhiteSpace(documento))
                {
                    return Task.FromResult(Results.Unauthorized());
                }

                return AccesoEndpoints.EjecutarAsync(async () =>
                {
                    await servicio.IniciarNuevaActualizacionAsync(documento, ct);
                    return Results.Ok(new MensajeRespuesta("Nueva actualización iniciada. Puede editar su información."));
                });
            })
            .WithTags("MisDatos")
            .WithName("IniciarNuevaActualizacion")
            .Produces<MensajeRespuesta>()
            .ProducesEscritura();
    }
}
