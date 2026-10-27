namespace Istpet.ActualizacionDatos.WebApi.Endpoints;

using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Servicios;

public static partial class CargaCatalogos
{
    public static async Task CargarCatalogosAsync(this WebApplication app, bool forzar = false)
    {
        // La generación OpenAPI ejecuta el entrypoint con un servidor simulado, sin base.
        if (System.Reflection.Assembly.GetEntryAssembly()?.GetName().Name == "GetDocument.Insider")
        {
            return;
        }
        var cargar = forzar || (app.Environment.IsDevelopment() && app.Configuration.GetValue<bool>("Catalogos:CargarAlInicio"));
        if (!cargar && !app.Environment.IsProduction())
        {
            return;
        }
        await using var alcance = app.Services.CreateAsyncScope();
        var cargador = alcance.ServiceProvider.GetRequiredService<CargadorCatalogos>();
        if (!cargar)
        {
            await cargador.VerificarDisponibilidadAsync();
            return;
        }

        var directorio = app.Configuration["Catalogos:Directorio"] ?? Path.Combine(AppContext.BaseDirectory, "catalogos");
        var resultados = await cargador.CargarAsync(directorio);
        foreach (var resultado in resultados)
        {
            RegistrarCarga(app.Logger, resultado.Tipo, resultado.Creados, resultado.Actualizados, resultado.SinCambios);
        }
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Catálogo {Tipo}: {Creados} creados, {Actualizados} actualizados, {SinCambios} sin cambios.")]
    private static partial void RegistrarCarga(ILogger logger, TipoCatalogo tipo, int creados, int actualizados, int sinCambios);
}
