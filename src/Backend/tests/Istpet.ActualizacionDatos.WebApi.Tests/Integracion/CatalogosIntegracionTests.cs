namespace Istpet.ActualizacionDatos.WebApi.Tests.Integracion;

using System.Text;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Istpet.ActualizacionDatos.Infrastructure.Servicios;
using Microsoft.EntityFrameworkCore;
using Testcontainers.PostgreSql;

[Trait("Categoria", "Integracion")]
public sealed class CatalogosIntegracionTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _contenedor = new PostgreSqlBuilder("postgres:17-alpine").Build();

    private DbContextOptions<AplicacionDbContext> Opciones() => new DbContextOptionsBuilder<AplicacionDbContext>()
        .UseNpgsql(_contenedor.GetConnectionString()).UseSnakeCaseNamingConvention().Options;

    public async Task InitializeAsync()
    {
        await _contenedor.StartAsync();
        await using var db = new AplicacionDbContext(Opciones());
        await db.Database.MigrateAsync();
    }

    public async Task DisposeAsync() => await _contenedor.DisposeAsync();

    [Fact]
    public async Task Catalogos_versionados_cargan_completos_y_reiniciar_no_duplica()
    {
        var directorio = new DirectoryInfo(AppContext.BaseDirectory);
        while (directorio is not null && !Directory.Exists(Path.Combine(directorio.FullName, "data", "catalogos")))
        {
            directorio = directorio.Parent;
        }

        Assert.NotNull(directorio);
        var ruta = Path.Combine(directorio.FullName, "data", "catalogos");
        await using var db = new AplicacionDbContext(Opciones());
        var cargador = new CargadorCatalogosDesarrollo(new ServicioCatalogos(db));
        var primera = await cargador.CargarAsync(ruta);
        var ids = await db.ElementosCatalogo.AsNoTracking().Select(e => e.Id).OrderBy(id => id).ToListAsync();
        var segunda = await cargador.CargarAsync(ruta);
        Assert.Equal(15, primera.Count);
        Assert.All(segunda, r => { Assert.Equal(0, r.Creados); Assert.Equal(0, r.Actualizados); });
        Assert.Equal(ids, await db.ElementosCatalogo.AsNoTracking().Select(e => e.Id).OrderBy(id => id).ToListAsync());
        var elementos = await db.ElementosCatalogo.AsNoTracking().ToListAsync();
        Assert.Equal(2104, elementos.Count);
        Assert.Equal(27, elementos.Count(e => e.Id < 1000));
        Assert.All(elementos.Where(e => e.PadreId.HasValue), hijo =>
        {
            var padre = elementos.Single(e => e.Id == hijo.PadreId);
            Assert.Equal(ElementoCatalogo.TipoPadre(hijo.Tipo), padre.Tipo);
        });
        Assert.All(Enum.GetValues<TipoCatalogo>(), tipo => Assert.Contains(elementos, e => e.Tipo == tipo));
        Assert.Contains(elementos, e => e.Id == 61 && e.Tipo == TipoCatalogo.GradoAcademico && e.PadreId == 51);
        Assert.Contains(elementos, e => e.Id == 62 && e.Tipo == TipoCatalogo.GradoAcademico && e.PadreId == 52);
        Assert.Contains(elementos, e => e.Id == 48 && e.Codigo == "INSTRUCCION_PROFESIONAL");
    }

    [Fact]
    public async Task Importaciones_concurrentes_reservan_ids_unicos_y_no_duplican_codigos()
    {
        const string csv = "codigo,nombre,codigo_padre,codigo_externo\nPAIS_FICTICIO,País ficticio,,EXT-FICTICIO\n";
        async Task Importar()
        {
            await using var db = new AplicacionDbContext(Opciones());
            using var contenido = new MemoryStream(Encoding.UTF8.GetBytes(csv));
            await new ServicioCatalogos(db).ImportarAsync(TipoCatalogo.Pais, contenido);
        }

        await Task.WhenAll(Importar(), Importar(), Importar());
        await using var consulta = new AplicacionDbContext(Opciones());
        var paises = await consulta.ElementosCatalogo.Where(e => e.Tipo == TipoCatalogo.Pais).ToListAsync();
        Assert.True(Assert.Single(paises).Id >= 1000);
    }
}
