using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Istpet.ActualizacionDatos.WebApi.Tests;

public class SaludTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _fabrica;

    public SaludTests(WebApplicationFactory<Program> fabrica)
    {
        _fabrica = fabrica;
    }

    [Fact]
    public async Task Salud_responde_200_sin_autenticar()
    {
        using var cliente = _fabrica.CreateClient();

        var respuesta = await cliente.GetAsync(new Uri("/health", UriKind.Relative));

        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
    }

    [Fact]
    public async Task Salud_no_expone_version_ni_conexion()
    {
        using var cliente = _fabrica.CreateClient();

        var cuerpo = await cliente.GetStringAsync(new Uri("/health", UriKind.Relative));

        Assert.Equal("{\"estado\":\"ok\"}", cuerpo);
    }
}
