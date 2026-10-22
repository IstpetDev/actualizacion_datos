namespace Istpet.ActualizacionDatos.WebApi.Endpoints;

using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Modelos;

// Segunda campaña (PD-HDV-04, RF-FLU-005). Implementa T-06 (#32): la persona en «aprobado» pasa a
// «borrador» con una acción explícita y solo con campaña abierta.
internal static class FlujoActualizacionEndpoints
{
    private const string Tarea = "T-06 (#32)";

    public static void MapFlujoActualizacion(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/mis-datos/iniciar-actualizacion", (HttpContext http, IContextoInstitucion contexto) =>
                string.IsNullOrWhiteSpace(AccesoEndpoints.DocumentoActual(http, contexto))
                    ? Results.Unauthorized()
                    : AccesoEndpoints.NoImplementado(Tarea))
            .WithTags("MisDatos")
            .WithName("IniciarNuevaActualizacion")
            .Produces<MensajeRespuesta>()
            .ProducesEscritura();
    }
}
