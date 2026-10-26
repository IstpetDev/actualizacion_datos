using System.Net;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Istpet.ActualizacionDatos.WebApi.Tests;

public class ContratoOpenApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _fabrica;

    public ContratoOpenApiTests(WebApplicationFactory<Program> fabrica)
    {
        _fabrica = fabrica;
    }

    [Fact]
    public async Task En_produccion_el_documento_openapi_no_se_expone()
    {
        using var produccion = _fabrica.WithWebHostBuilder(b => b.UseEnvironment("Production"));
        using var cliente = produccion.CreateClient();

        var respuesta = await cliente.GetAsync(new Uri("/openapi/v1.json", UriKind.Relative));

        Assert.Equal(HttpStatusCode.NotFound, respuesta.StatusCode);
    }

    [Fact]
    public async Task En_produccion_la_interfaz_scalar_no_se_expone()
    {
        using var produccion = _fabrica.WithWebHostBuilder(b => b.UseEnvironment("Production"));
        using var cliente = produccion.CreateClient();

        var respuesta = await cliente.GetAsync(new Uri("/scalar/v1", UriKind.Relative));

        Assert.Equal(HttpStatusCode.NotFound, respuesta.StatusCode);
    }

    [Fact]
    public async Task En_desarrollo_la_interfaz_scalar_responde_200()
    {
        using var desarrollo = _fabrica.WithWebHostBuilder(b => b.UseEnvironment("Development"));
        using var cliente = desarrollo.CreateClient();

        var respuesta = await cliente.GetAsync(new Uri("/scalar/v1", UriKind.Relative));

        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
    }

    [Fact]
    public async Task En_produccion_salud_sigue_respondiendo_200()
    {
        using var produccion = _fabrica.WithWebHostBuilder(b => b.UseEnvironment("Production"));
        using var cliente = produccion.CreateClient();

        var respuesta = await cliente.GetAsync(new Uri("/health", UriKind.Relative));

        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
    }
}
