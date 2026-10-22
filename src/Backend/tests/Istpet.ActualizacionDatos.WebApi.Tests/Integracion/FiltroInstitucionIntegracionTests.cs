namespace Istpet.ActualizacionDatos.WebApi.Tests.Integracion;

using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
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

    // RF-HDV-015 (spec-0003): las tablas de la hoja de vida quedan aisladas por institución.
    [Fact]
    public async Task Hoja_de_vida_de_institucion_A_no_es_visible_desde_institucion_B()
    {
        var opciones = CrearOpciones();

        var idA = InstitucionId.Nuevo();
        var idB = InstitucionId.Nuevo();
        var personaA = new Persona(Guid.NewGuid(), idA, "0000000001");
        var personaB = new Persona(Guid.NewGuid(), idB, "0000000002");

        // Catálogo compartido: un nivel y un grado ficticios (ids fuera del rango de la semilla).
        var nivel = new ElementoCatalogo(9101, TipoCatalogo.NivelAcademico, "NIVEL_PRUEBA", "Nivel de prueba");
        var grado = new ElementoCatalogo(9102, TipoCatalogo.GradoAcademico, "GRADO_PRUEBA", "Grado de prueba", padreId: nivel.Id);

        var tituloA = new TituloAcademico(
            Guid.NewGuid(),
            idA,
            personaA.Id,
            new DatosTituloAcademico("Título ficticio A", grado.Id, NombreInstitucionOtra: "Universidad Ficticia"));
        var tituloB = new TituloAcademico(
            Guid.NewGuid(),
            idB,
            personaB.Id,
            new DatosTituloAcademico("Título ficticio B", grado.Id, NombreInstitucionOtra: "Universidad Ficticia"));
        var tipoDocumentoA = new TipoDocumento(Guid.NewGuid(), idA, "CEDULA", "Cédula");
        var tipoDocumentoB = new TipoDocumento(Guid.NewGuid(), idB, "CEDULA", "Cédula");

        await using (var contextoSembrado = new AplicacionDbContext(
            opciones,
            new ContextoInstitucion(null, esSuperadmin: true)))
        {
            contextoSembrado.Instituciones.AddRange(
                new Institucion(idA, "Instituto Delta"),
                new Institucion(idB, "Instituto Épsilon"));
            contextoSembrado.Personas.AddRange(personaA, personaB);
            contextoSembrado.ElementosCatalogo.AddRange(nivel, grado);
            contextoSembrado.TitulosAcademicos.AddRange(tituloA, tituloB);
            contextoSembrado.FichasPersonales.AddRange(
                new FichaPersonal(idA, personaA.Id),
                new FichaPersonal(idB, personaB.Id));
            contextoSembrado.TiposDocumento.AddRange(tipoDocumentoA, tipoDocumentoB);
            await contextoSembrado.SaveChangesAsync();
        }

        await using (var contextoB = new AplicacionDbContext(
            opciones,
            new ContextoInstitucion(idB, esSuperadmin: false)))
        {
            var titulos = await contextoB.TitulosAcademicos.ToListAsync();
            Assert.Single(titulos);
            Assert.Equal(tituloB.Id, titulos[0].Id);

            // Con el id conocido de la otra institución, el filtro global lo oculta.
            Assert.Null(await contextoB.TitulosAcademicos.FirstOrDefaultAsync(t => t.Id == tituloA.Id));
            Assert.Null(await contextoB.FichasPersonales.FirstOrDefaultAsync(f => f.PersonaId == personaA.Id));
            Assert.Null(await contextoB.TiposDocumento.FirstOrDefaultAsync(t => t.Id == tipoDocumentoA.Id));

            // El catálogo es compartido: se ve desde cualquier institución.
            Assert.NotNull(await contextoB.ElementosCatalogo.FirstOrDefaultAsync(e => e.Id == grado.Id));
        }
    }

    // ADR-0010, decisión 9: un solo documento vigente por persona y tipo.
    [Fact]
    public async Task Base_rechaza_dos_documentos_del_mismo_tipo_para_una_persona()
    {
        var opciones = CrearOpciones();
        var id = InstitucionId.Nuevo();
        var persona = new Persona(Guid.NewGuid(), id, "0000000003");
        var tipo = new TipoDocumento(Guid.NewGuid(), id, "CERT_VOTACION", "Certificado de votación");

        await using var contexto = new AplicacionDbContext(
            opciones,
            new ContextoInstitucion(null, esSuperadmin: true));

        contexto.Instituciones.Add(new Institucion(id, "Instituto Zeta"));
        contexto.Personas.Add(persona);
        contexto.TiposDocumento.Add(tipo);
        contexto.DocumentosPersonales.AddRange(
            new DocumentoPersonal(Guid.NewGuid(), id, persona.Id, tipo.Id, new DatosDocumentoPersonal()),
            new DocumentoPersonal(Guid.NewGuid(), id, persona.Id, tipo.Id, new DatosDocumentoPersonal()));

        await Assert.ThrowsAsync<DbUpdateException>(() => contexto.SaveChangesAsync());
    }

    // ADR-0013 (#45): la cuenta de A no se ve desde B, una cuenta por persona y la base exige un solo origen de banco.
    [Fact]
    public async Task Cuenta_bancaria_aislada_unica_por_persona_y_con_banco_coherente()
    {
        var opciones = CrearOpciones();
        var idA = InstitucionId.Nuevo();
        var idB = InstitucionId.Nuevo();
        var personaA = new Persona(Guid.NewGuid(), idA, "0000000040");
        var numero = new NumeroCuentaProtegido("v1.cifrado-ficticio", "1234", new string('a', 64));
        var datos = new DatosCuentaBancaria(51, null, "Banco ficticio", numero);

        await using (var semilla = new AplicacionDbContext(opciones, new ContextoInstitucion(null, esSuperadmin: true)))
        {
            semilla.Instituciones.AddRange(new Institucion(idA, "Instituto A"), new Institucion(idB, "Instituto B"));
            semilla.Personas.Add(personaA);
            semilla.CuentasBancarias.Add(CuentaBancaria.DesdeNomina(Guid.NewGuid(), idA, personaA.Id, datos, DateTime.UtcNow));
            await semilla.SaveChangesAsync();
        }

        await using (var desdeB = new AplicacionDbContext(opciones, new ContextoInstitucion(idB, esSuperadmin: false)))
        {
            Assert.Empty(await desdeB.CuentasBancarias.ToListAsync());
        }

        await using (var desdeA = new AplicacionDbContext(opciones, new ContextoInstitucion(idA, esSuperadmin: false)))
        {
            var cuenta = await desdeA.CuentasBancarias.SingleAsync();
            Assert.Equal(EstadoCuentaBancaria.SinConfirmar, cuenta.Estado);
            Assert.Equal("1234", cuenta.UltimosDigitos);

            desdeA.CuentasBancarias.Add(CuentaBancaria.RegistradaPorPersona(Guid.NewGuid(), idA, personaA.Id, datos, DateTime.UtcNow));
            await Assert.ThrowsAsync<DbUpdateException>(() => desdeA.SaveChangesAsync());
        }

        // El dominio ya lo impide; la base lo impide también si alguien escribe por fuera de la aplicación.
        await using var directo = new AplicacionDbContext(opciones, new ContextoInstitucion(null, esSuperadmin: true));
        await Assert.ThrowsAsync<Npgsql.PostgresException>(() => directo.Database.ExecuteSqlRawAsync(
            "UPDATE cuentas_bancarias SET nombre_banco_otro = NULL"));
    }
}
