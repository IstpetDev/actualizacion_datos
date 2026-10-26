using System.Net;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Istpet.ActualizacionDatos.Infrastructure.Servicios;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Istpet.ActualizacionDatos.WebApi.Tests;

public sealed class ContratoOpenApiTests : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly WebApplicationFactory<Program> _fabrica;
    private readonly SqliteConnection _conexion = new("DataSource=:memory:");

    public ContratoOpenApiTests(WebApplicationFactory<Program> fabrica)
    {
        _conexion.Open();
        _fabrica = fabrica.WithWebHostBuilder(b => b.ConfigureServices(servicios =>
        {
            servicios.Remove(servicios.Single(d => d.ServiceType == typeof(DbContextOptions<AplicacionDbContext>)));
            servicios.AddDbContext<AplicacionDbContext>(o => o.UseSqlite(_conexion).UseSnakeCaseNamingConvention());
            using var proveedor = servicios.BuildServiceProvider();
            using var alcance = proveedor.CreateScope();
            var db = alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            db.Database.EnsureCreated();
            new CargadorCatalogos(new ServicioCatalogos(db), db)
                .CargarAsync(Path.Combine(AppContext.BaseDirectory, "catalogos")).GetAwaiter().GetResult();
        }));
    }

    public void Dispose()
    {
        _fabrica.Dispose();
        _conexion.Dispose();
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
