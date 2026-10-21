namespace Istpet.ActualizacionDatos.WebApi.Tests.Integracion;

using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Infrastructure.Multitenancy;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Testcontainers.PostgreSql;

[Trait("Categoria", "Integracion")]
public sealed class FiltroInstitucionIntegracionTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _contenedor = new PostgreSqlBuilder("postgres:17-alpine").Build();

    public async Task InitializeAsync()
    {
        await _contenedor.StartAsync();

        var opciones = new DbContextOptionsBuilder<AplicacionDbContext>()
            .UseNpgsql(_contenedor.GetConnectionString())
            .UseSnakeCaseNamingConvention()
            .Options;

        await using var contextoMigrador = new AplicacionDbContext(
            opciones,
            new ContextoInstitucion(null, esSuperadmin: true));

        await contextoMigrador.Database.MigrateAsync();
    }

    public async Task DisposeAsync()
    {
        await _contenedor.DisposeAsync();
    }

    private DbContextOptions<AplicacionDbContext> CrearOpciones()
    {
        return new DbContextOptionsBuilder<AplicacionDbContext>()
            .UseNpgsql(_contenedor.GetConnectionString())
            .UseSnakeCaseNamingConvention()
            .Options;
    }

    [Fact]
    public async Task Consulta_de_institucion_A_nunca_devuelve_datos_de_institucion_B()
    {
        var opciones = CrearOpciones();

        var idA = InstitucionId.Nuevo();
        var idB = InstitucionId.Nuevo();

        var institucionA = new Institucion(idA, "Instituto Alpha");
        var institucionB = new Institucion(idB, "Instituto Beta");

        var campanaA1 = new Campana(
            Guid.NewGuid(),
            idA,
            "Campaña Alpha 1",
            new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 1, 31, 0, 0, 0, DateTimeKind.Utc));

        var campanaA2 = new Campana(
            Guid.NewGuid(),
            idA,
            "Campaña Alpha 2",
            new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 2, 28, 0, 0, 0, DateTimeKind.Utc));

        var campanaB1 = new Campana(
            Guid.NewGuid(),
            idB,
            "Campaña Beta 1",
            new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 3, 31, 0, 0, 0, DateTimeKind.Utc));

        // Sembrar datos con contexto de superadmin (bypass para poblar)
        await using (var contextoSembrado = new AplicacionDbContext(
            opciones,
            new ContextoInstitucion(null, esSuperadmin: true)))
        {
            contextoSembrado.Instituciones.AddRange(institucionA, institucionB);
            contextoSembrado.Campanas.AddRange(campanaA1, campanaA2, campanaB1);
            await contextoSembrado.SaveChangesAsync();
        }

        // 1. Consulta como Institución A: sólo debe ver campanas de Alpha
        await using (var contextoA = new AplicacionDbContext(
            opciones,
            new ContextoInstitucion(idA, esSuperadmin: false)))
        {
            var campanasAlpha = await contextoA.Campanas.ToListAsync();

            Assert.Equal(2, campanasAlpha.Count);
            Assert.All(campanasAlpha, c => Assert.Equal(idA, c.InstitucionId));
            Assert.Contains(campanasAlpha, c => c.Id == campanaA1.Id);
            Assert.Contains(campanasAlpha, c => c.Id == campanaA2.Id);

            // Incluso consultando directamente por el id conocido de Beta, el filtro global lo oculta (RF-MUL-003)
            var intentoAccesoBeta = await contextoA.Campanas.FirstOrDefaultAsync(c => c.Id == campanaB1.Id);
            Assert.Null(intentoAccesoBeta);
        }

        // 2. Consulta como Institución B: sólo debe ver campanas de Beta
        await using (var contextoB = new AplicacionDbContext(
            opciones,
            new ContextoInstitucion(idB, esSuperadmin: false)))
        {
            var campanasBeta = await contextoB.Campanas.ToListAsync();

            Assert.Single(campanasBeta);
            Assert.Equal(idB, campanasBeta[0].InstitucionId);
            Assert.Equal(campanaB1.Id, campanasBeta[0].Id);

            var intentoAccesoAlpha = await contextoB.Campanas.FirstOrDefaultAsync(c => c.Id == campanaA1.Id);
            Assert.Null(intentoAccesoAlpha);
        }

        // 3. Consulta como Superadmin: debe poder ver todas las instituciones
        await using (var contextoSuperadmin = new AplicacionDbContext(
            opciones,
            new ContextoInstitucion(null, esSuperadmin: true)))
        {
            var todas = await contextoSuperadmin.Campanas.ToListAsync();

            Assert.Equal(3, todas.Count);
        }
    }

    [Fact]
    public async Task Usuario_sin_institucion_y_sin_superadmin_no_recibe_datos()
    {
        var opciones = CrearOpciones();
        var id = InstitucionId.Nuevo();

        var institucion = new Institucion(id, "Instituto Gama");
        var campana = new Campana(
            Guid.NewGuid(),
            id,
            "Campaña Gama",
            new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 1, 15, 0, 0, 0, DateTimeKind.Utc));

        await using (var contextoSembrado = new AplicacionDbContext(
            opciones,
            new ContextoInstitucion(null, esSuperadmin: true)))
        {
            contextoSembrado.Instituciones.Add(institucion);
            contextoSembrado.Campanas.Add(campana);
            await contextoSembrado.SaveChangesAsync();
        }

        await using (var contextoSinAsignacion = new AplicacionDbContext(
            opciones,
            new ContextoInstitucion(institucionId: null, esSuperadmin: false)))
        {
            var resultado = await contextoSinAsignacion.Campanas.ToListAsync();

            Assert.Empty(resultado);
        }
    }
}
