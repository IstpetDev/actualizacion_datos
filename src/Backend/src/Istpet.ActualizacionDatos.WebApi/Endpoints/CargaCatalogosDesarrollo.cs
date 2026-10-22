namespace Istpet.ActualizacionDatos.WebApi.Endpoints;

using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Servicios;

public static partial class CargaCatalogosDesarrollo
{
    public static async Task CargarCatalogosDesarrolloAsync(this WebApplication app)
    {
        if (!app.Environment.IsDevelopment() || !app.Configuration.GetValue<bool>("Catalogos:CargarAlInicio"))
        {
            return;
        }

        var directorio = app.Configuration["Catalogos:Directorio"]
            ?? throw new InvalidOperationException("Debe configurar Catalogos:Directorio para cargar los catálogos de desarrollo.");
        await using var alcance = app.Services.CreateAsyncScope();
        var cargador = alcance.ServiceProvider.GetRequiredService<CargadorCatalogosDesarrollo>();
        var resultados = await cargador.CargarAsync(directorio);
        foreach (var resultado in resultados)
        {
            RegistrarCarga(app.Logger, resultado.Tipo, resultado.Creados, resultado.Actualizados, resultado.SinCambios);
        }
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Catálogo {Tipo}: {Creados} creados, {Actualizados} actualizados, {SinCambios} sin cambios.")]
    private static partial void RegistrarCarga(ILogger logger, TipoCatalogo tipo, int creados, int actualizados, int sinCambios);
}
