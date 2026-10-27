namespace Istpet.ActualizacionDatos.WebApi.Tests;

using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.WebApi.Middleware;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;
using Xunit;

public class ManejadorGlobalExcepcionesTests : IClassFixture<WebApplicationFactory<Program>>
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };
    private readonly WebApplicationFactory<Program> _factory;

    public ManejadorGlobalExcepcionesTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Regla_de_negocio_devuelve_400_con_cuerpo_uniforme()
    {
        var manejador = CrearManejador(esProduccion: true);
        var httpContext = new DefaultHttpContext();
        var stream = new MemoryStream();
        httpContext.Response.Body = stream;

        var ex = new ReglaNegocioException("La fecha de fin no puede ser anterior a la fecha de inicio.");
        var manejado = await manejador.TryHandleAsync(httpContext, ex, CancellationToken.None);

        Assert.True(manejado);
        Assert.Equal(StatusCodes.Status400BadRequest, httpContext.Response.StatusCode);

        stream.Seek(0, SeekOrigin.Begin);
        var respuesta = await JsonSerializer.DeserializeAsync<MensajeRespuesta>(stream, JsonOpts);
        Assert.NotNull(respuesta);
        Assert.Equal("La fecha de fin no puede ser anterior a la fecha de inicio.", respuesta.Mensaje);
        Assert.Equal("REGLA_NEGOCIO", respuesta.Codigo);
        Assert.False(string.IsNullOrWhiteSpace(respuesta.TraceId));
    }

    [Fact]
    public async Task Regla_de_negocio_fuera_de_periodo_devuelve_403()
    {
        var manejador = CrearManejador(esProduccion: true);
        var httpContext = new DefaultHttpContext();
        var stream = new MemoryStream();
        httpContext.Response.Body = stream;

        var ex = new ReglaNegocioException("La campaña está fuera del período de recepción.");
        var manejado = await manejador.TryHandleAsync(httpContext, ex, CancellationToken.None);

        Assert.True(manejado);
        Assert.Equal(StatusCodes.Status403Forbidden, httpContext.Response.StatusCode);

        stream.Seek(0, SeekOrigin.Begin);
        var respuesta = await JsonSerializer.DeserializeAsync<MensajeRespuesta>(stream, JsonOpts);
        Assert.NotNull(respuesta);
        Assert.Equal("La campaña está fuera del período de recepción.", respuesta.Mensaje);
        Assert.Equal("OPERACION_PROHIBIDA", respuesta.Codigo);
    }

    [Fact]
    public async Task Recurso_no_encontrado_devuelve_404()
    {
        var manejador = CrearManejador(esProduccion: true);
        var httpContext = new DefaultHttpContext();
        var stream = new MemoryStream();
        httpContext.Response.Body = stream;

        var ex = new RecursoNoEncontradoException("El título académico solicitado no existe.");
        var manejado = await manejador.TryHandleAsync(httpContext, ex, CancellationToken.None);

        Assert.True(manejado);
        Assert.Equal(StatusCodes.Status404NotFound, httpContext.Response.StatusCode);

        stream.Seek(0, SeekOrigin.Begin);
        var respuesta = await JsonSerializer.DeserializeAsync<MensajeRespuesta>(stream, JsonOpts);
        Assert.NotNull(respuesta);
        Assert.Equal("El título académico solicitado no existe.", respuesta.Mensaje);
        Assert.Equal("RECURSO_NO_ENCONTRADO", respuesta.Codigo);
    }

    [Fact]
    public async Task Argument_exception_devuelve_400_con_errores_por_campo()
    {
        var manejador = CrearManejador(esProduccion: true);
        var httpContext = new DefaultHttpContext();
        var stream = new MemoryStream();
        httpContext.Response.Body = stream;

        var ex = new ArgumentException("El campo documento no puede ser nulo o vacío.", "documento");
        var manejado = await manejador.TryHandleAsync(httpContext, ex, CancellationToken.None);

        Assert.True(manejado);
        Assert.Equal(StatusCodes.Status400BadRequest, httpContext.Response.StatusCode);

        stream.Seek(0, SeekOrigin.Begin);
        var respuesta = await JsonSerializer.DeserializeAsync<MensajeRespuesta>(stream, JsonOpts);
        Assert.NotNull(respuesta);
        Assert.Equal("PARAMETRO_INVALIDO", respuesta.Codigo);
        Assert.NotNull(respuesta.Errores);
        Assert.True(respuesta.Errores.ContainsKey("documento"));
    }

    [Fact]
    public async Task Violacion_de_clave_unica_devuelve_409_sin_sql_ni_stacktrace()
    {
        var manejador = CrearManejador(esProduccion: true);
        var httpContext = new DefaultHttpContext();
        var stream = new MemoryStream();
        httpContext.Response.Body = stream;

        var inner = new InvalidOperationException("UNIQUE constraint failed: personas.documento");
        var ex = new DbUpdateException("Error al actualizar la base de datos.", inner);
        var manejado = await manejador.TryHandleAsync(httpContext, ex, CancellationToken.None);

        Assert.True(manejado);
        Assert.Equal(StatusCodes.Status409Conflict, httpContext.Response.StatusCode);

        stream.Seek(0, SeekOrigin.Begin);
        var respuesta = await JsonSerializer.DeserializeAsync<MensajeRespuesta>(stream, JsonOpts);
        Assert.NotNull(respuesta);
        Assert.Equal("Ya existe un registro con los mismos datos clave en el sistema.", respuesta.Mensaje);
        Assert.Equal("CONFLICTO_UNICIDAD", respuesta.Codigo);
        Assert.DoesNotContain("UNIQUE constraint failed", respuesta.Mensaje);
    }

    [Fact]
    public async Task Excepcion_no_controlada_en_produccion_devuelve_500_generico_con_trace_id_sin_fugas()
    {
        var manejador = CrearManejador(esProduccion: true);
        var httpContext = new DefaultHttpContext();
        var stream = new MemoryStream();
        httpContext.Response.Body = stream;

        var ex = new InvalidOperationException("Falla catastrófica de conexión interna en el servidor.");
        var manejado = await manejador.TryHandleAsync(httpContext, ex, CancellationToken.None);

        Assert.True(manejado);
        Assert.Equal(StatusCodes.Status500InternalServerError, httpContext.Response.StatusCode);

        stream.Seek(0, SeekOrigin.Begin);
        var respuesta = await JsonSerializer.DeserializeAsync<MensajeRespuesta>(stream, JsonOpts);
        Assert.NotNull(respuesta);
        Assert.Equal("Ha ocurrido un error inesperado en el servidor.", respuesta.Mensaje);
        Assert.Equal("ERROR_INTERNO", respuesta.Codigo);
        Assert.False(string.IsNullOrWhiteSpace(respuesta.TraceId));
        Assert.DoesNotContain("catastrófica", respuesta.Mensaje);
    }

    [Fact]
    public async Task Ruta_inexistente_devuelve_404_con_cuerpo_json_uniforme()
    {
        using var client = _factory.CreateClient();
        var respuesta = await client.GetAsync(new Uri("/ruta-totalmente-inexistente-12345", UriKind.Relative));

        Assert.Equal(HttpStatusCode.NotFound, respuesta.StatusCode);
        var cuerpo = await respuesta.Content.ReadFromJsonAsync<MensajeRespuesta>();
        Assert.NotNull(cuerpo);
        Assert.Equal("El recurso solicitado no fue encontrado.", cuerpo.Mensaje);
        Assert.Equal("HTTP_404", cuerpo.Codigo);
        Assert.False(string.IsNullOrWhiteSpace(cuerpo.TraceId));
    }

    [Fact]
    public async Task Peticion_con_json_malformado_devuelve_400_con_mensaje_claro()
    {
        using var client = _factory.CreateClient();
        var contenido = new StringContent("{ \"documento\": \"123\", ", Encoding.UTF8, "application/json");
        var respuesta = await client.PostAsync(new Uri("/api/auth/login", UriKind.Relative), contenido);

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        var cuerpo = await respuesta.Content.ReadFromJsonAsync<MensajeRespuesta>();
        Assert.NotNull(cuerpo);
        Assert.False(string.IsNullOrWhiteSpace(cuerpo.Mensaje));
        Assert.NotEqual("Bad Request", cuerpo.Mensaje);
    }

    private static ManejadorGlobalExcepciones CrearManejador(bool esProduccion)
    {
        var logger = NullLogger<ManejadorGlobalExcepciones>.Instance;
        var env = new EntornoPrueba { EnvironmentName = esProduccion ? Environments.Production : Environments.Development };
        return new ManejadorGlobalExcepciones(logger, env);
    }

    private sealed class EntornoPrueba : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Production;
        public string ApplicationName { get; set; } = "Test";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } = null!;
    }
}
