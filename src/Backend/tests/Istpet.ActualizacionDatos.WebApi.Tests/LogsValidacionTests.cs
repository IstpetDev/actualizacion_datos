namespace Istpet.ActualizacionDatos.WebApi.Tests;

using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Logging;

public sealed partial class HojaDeVidaTests
{
    private sealed class RegistroSeguroPrueba : ILoggerProvider, ILogger
    {
        public ConcurrentQueue<string> Mensajes { get; } = new();
        public ILogger CreateLogger(string categoryName) => this;
        public void Dispose() { }
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
            => Mensajes.Enqueue(formatter(state, exception) + exception?.ToString());
    }

    [Fact]
    public async Task Logs_no_incluyen_valores_personales_en_errores_de_formato_o_JSON()
    {
        var datos = await ConfigurarDatosInicialesAsync();
        using var registro = new RegistroSeguroPrueba();
        using var fabrica = _fabrica.WithWebHostBuilder(b => b.ConfigureLogging(l => l.AddProvider(registro).SetMinimumLevel(LogLevel.Debug)));
        using var cliente = fabrica.CreateClient();
        cliente.DefaultRequestHeaders.Add("X-Institucion-Id", datos.InstitucionId.ToString());
        cliente.DefaultRequestHeaders.Add("X-Actor", Documento);
        cliente.DefaultRequestHeaders.Add("X-Rol", "Usuario");
        foreach (var campo in new[] { "celular", "fechaNacimiento", "porcentajeDiscapacidad", "perfil" })
        {
            var respuesta = await cliente.PutAsJsonAsync("/api/mis-datos/hoja-de-vida/ficha", new Dictionary<string, string> { [campo] = "VALOR-PRIVADO-FICTICIO" });
            Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
            Assert.DoesNotContain("VALOR-PRIVADO-FICTICIO", await respuesta.Content.ReadAsStringAsync());
        }
        Assert.NotEmpty(registro.Mensajes);
        Assert.All(registro.Mensajes, m => Assert.DoesNotContain("VALOR-PRIVADO-FICTICIO", m));
    }
}
