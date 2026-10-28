namespace Istpet.ActualizacionDatos.WebApi.Tests.Integracion;

using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Application.Validacion;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Multitenancy;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Istpet.ActualizacionDatos.Infrastructure.Servicios;
using Microsoft.EntityFrameworkCore;
using Testcontainers.PostgreSql;

[Trait("Categoria", "Integracion")]
public sealed class FichaPersonalIntegracionTests : IAsyncLifetime
{
    private const string Documento = "0000000000";
    private readonly PostgreSqlContainer _contenedor = new PostgreSqlBuilder("postgres:17-alpine").Build();
    private readonly InstitucionId _institucion = InstitucionId.Nuevo();
    private readonly InstitucionId _otra = InstitucionId.Nuevo();
    private readonly Guid _personaId = Guid.NewGuid();
    private readonly Guid _fotoId = Guid.NewGuid();

    private AplicacionDbContext CrearContexto(InstitucionId? institucion = null) => new(
        new DbContextOptionsBuilder<AplicacionDbContext>()
            .UseNpgsql(_contenedor.GetConnectionString()).UseSnakeCaseNamingConvention().Options,
        new ContextoInstitucion(institucion ?? _institucion));

    private static ServicioHojaDeVida CrearServicio(AplicacionDbContext db, InstitucionId institucion) => new(
        db, new ServicioCampanas(db, new ContextoInstitucion(institucion)),
        new ValidadorCatalogos(db), new ServicioSecciones(db, new ContextoInstitucion(institucion)));

    public async Task InitializeAsync()
    {
        await _contenedor.StartAsync();
        await using var db = CrearContexto();
        await db.Database.MigrateAsync();
        db.Instituciones.AddRange(new Institucion(_institucion, "Institución ficticia A"), new Institucion(_otra, "Institución ficticia B"));
        db.Personas.AddRange(
            new Persona(_personaId, _institucion, Documento, nombre: "Nombre ficticio anterior", correo: "acceso@ejemplo.test", correoVerificado: true),
            new Persona(Guid.NewGuid(), _otra, Documento, nombre: "Persona ficticia ajena"));
        db.Campanas.AddRange(
            new Campana(Guid.NewGuid(), _institucion, "Campaña ficticia A", DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1), activa: true),
            new Campana(Guid.NewGuid(), _otra, "Campaña ficticia B", DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1), activa: true));
        db.ElementosCatalogo.AddRange(
            new ElementoCatalogo(9001, TipoCatalogo.Pais, "PAIS-FICTICIO", "País ficticio"),
            new ElementoCatalogo(9002, TipoCatalogo.Provincia, "PROVINCIA-FICTICIA", "Provincia ficticia", 9001),
            new ElementoCatalogo(9003, TipoCatalogo.Canton, "CANTON-FICTICIO", "Cantón ficticio", 9002),
            new ElementoCatalogo(9004, TipoCatalogo.Parroquia, "PARROQUIA-FICTICIA", "Parroquia ficticia", 9003),
            new ElementoCatalogo(9005, TipoCatalogo.NacionalidadIndigena, "NACIONALIDAD-FICTICIA", "Nacionalidad ficticia"),
            new ElementoCatalogo(9006, TipoCatalogo.Discapacidad, "DISCAPACIDAD-FICTICIA", "Discapacidad ficticia"),
            new ElementoCatalogo(9007, TipoCatalogo.Etnia, "ETNIA-FICTICIA", "Etnia ficticia"));
        db.ArchivosAdjuntos.Add(new ArchivoAdjunto(_fotoId, _institucion, _personaId, "foto-ficticia.png", "image/png", 10, "hash-ficticio", "pruebas/foto-ficticia.png"));
        await db.SaveChangesAsync();
    }

    public async Task DisposeAsync() => await _contenedor.DisposeAsync();

    private GuardarFichaPersonalRequest SolicitudCompleta() => new(
        PrimerNombre: "  Perso\u0301na  ", SegundoNombre: "Prueba", PrimerApellido: "Ficticia", SegundoApellido: "Ensayo",
        SexoId: 1, FechaNacimiento: new DateOnly(2000, 2, 29), EstadoCivilId: 11, TipoSangreId: 21,
        EtniaId: 9007, NacionalidadIndigenaId: 9005, PaisNacionalidadId: 9001, PaisNacimientoId: 9001,
        ParroquiaNacimientoId: 9004, ParroquiaResidenciaId: 9004, CallePrincipal: "Calle ficticia principal",
        CalleSecundaria: "Calle ficticia secundaria", NumeroCasa: "CASA-FICTICIA", ReferenciaDomicilio: "Referencia ficticia",
        CodigoPostal: "000001", TelefonoConvencional: "020000000", Celular: "0900000000",
        CorreoInstitucional: "persona@ejemplo.test", DiscapacidadId: 9006, PorcentajeDiscapacidad: 35,
        NumeroCarnetDiscapacidad: "CARNE-FICTICIO", FotoArchivoId: _fotoId);

    private async Task GuardarAsync(GuardarFichaPersonalRequest solicitud)
    {
        await using var db = CrearContexto();
        await CrearServicio(db, _institucion).GuardarFichaAsync(Documento, solicitud);
    }

    private async Task ComprobarPersistenciaAsync(GuardarFichaPersonalRequest esperado, string? nombre)
    {
        await using var db = CrearContexto();
        var ficha = await db.FichasPersonales.AsNoTracking().SingleAsync();
        var leida = await CrearServicio(db, _institucion).ObtenerFichaAsync(Documento);
        Assert.NotNull(leida);
        Assert.Equal(_personaId, ficha.PersonaId);
        // Cada campo del contrato debe sobrevivir tanto en la tabla como en una nueva lectura del servicio.
        foreach (var campo in typeof(GuardarFichaPersonalRequest).GetProperties())
        {
            Assert.Equal(campo.GetValue(esperado), typeof(FichaPersonal).GetProperty(campo.Name)!.GetValue(ficha));
            Assert.Equal(campo.GetValue(esperado), typeof(FichaPersonalDto).GetProperty(campo.Name)!.GetValue(leida));
        }
        var persona = await db.Personas.AsNoTracking().SingleAsync();
        Assert.Equal(nombre, persona.Nombre);
        Assert.Equal("acceso@ejemplo.test", persona.Correo);
        Assert.True(persona.CorreoVerificado);
    }

    [Fact]
    public async Task PostgreSQL_persiste_todos_los_campos_y_nombre_en_dos_guardados_y_aisla_instituciones()
    {
        var solicitud = SolicitudCompleta();
        await GuardarAsync(solicitud);
        var normalizada = solicitud with { PrimerNombre = "Persóna" };
        await ComprobarPersistenciaAsync(normalizada, "Ficticia Ensayo Persóna Prueba");
        await GuardarAsync(normalizada);
        await ComprobarPersistenciaAsync(normalizada, "Ficticia Ensayo Persóna Prueba");

        await using (var otra = CrearContexto(_otra))
        {
            Assert.Empty(await otra.FichasPersonales.ToListAsync());
            Assert.Null(await CrearServicio(otra, _otra).ObtenerFichaAsync(Documento));
            Assert.Equal("Persona ficticia ajena", (await otra.Personas.SingleAsync()).Nombre);
            await Assert.ThrowsAsync<RecursoNoEncontradoException>(() => CrearServicio(otra, _otra).GuardarFichaAsync(Documento, normalizada));
        }

        var actualizada = normalizada with { PrimerNombre = "Otra", PorcentajeDiscapacidad = 50, CallePrincipal = "Calle ficticia nueva" };
        await GuardarAsync(actualizada);
        await ComprobarPersistenciaAsync(actualizada, "Ficticia Ensayo Otra Prueba");

        var vacia = new GuardarFichaPersonalRequest();
        await GuardarAsync(vacia);
        await ComprobarPersistenciaAsync(vacia, null);
    }

    [Fact]
    public async Task PostgreSQL_admite_los_cuatro_nombres_con_su_longitud_maxima()
    {
        var solicitud = SolicitudCompleta() with
        {
            PrimerNombre = new string('A', 100),
            SegundoNombre = new string('B', 100),
            PrimerApellido = new string('C', 100),
            SegundoApellido = new string('D', 100)
        };
        await GuardarAsync(solicitud);
        var nombre = $"{solicitud.PrimerApellido} {solicitud.SegundoApellido} {solicitud.PrimerNombre} {solicitud.SegundoNombre}";
        Assert.Equal(403, nombre.Length);
        await ComprobarPersistenciaAsync(solicitud, nombre);
    }

    [Fact]
    public async Task PostgreSQL_rechazos_y_fallo_de_escritura_no_dejan_guardados_parciales()
    {
        var solicitud = SolicitudCompleta() with { PrimerNombre = "Persona" };
        await GuardarAsync(solicitud);

        await using (var db = CrearContexto())
        {
            await Assert.ThrowsAsync<ValidacionCamposException>(() => CrearServicio(db, _institucion)
                .GuardarFichaAsync(Documento, solicitud with { PrimerNombre = "Cambio", PorcentajeDiscapacidad = 101 }));
        }
        await using (var db = CrearContexto())
        {
            await Assert.ThrowsAsync<ReglaNegocioException>(() => CrearServicio(db, _institucion)
                .GuardarFichaAsync(Documento, solicitud with { PrimerNombre = "Cambio", DiscapacidadId = 9004 }));
        }
        await using (var db = CrearContexto())
        {
            // Provoca un fallo real en Personas después de preparar cambios válidos para ambas tablas.
            await db.Database.ExecuteSqlRawAsync("ALTER TABLE personas ADD CONSTRAINT nombre_sin_fallo_ficticio CHECK (nombre NOT LIKE '%Fallo%')");
            await Assert.ThrowsAsync<DbUpdateException>(() => CrearServicio(db, _institucion)
                .GuardarFichaAsync(Documento, solicitud with { PrimerNombre = "Fallo", CallePrincipal = "No debe persistir" }));
        }
        await ComprobarPersistenciaAsync(solicitud, "Ficticia Ensayo Persona Prueba");
    }
}
