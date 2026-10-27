namespace Istpet.ActualizacionDatos.WebApi.Tests;

using System.Net;
using System.Net.Http.Json;
using Istpet.ActualizacionDatos.Application.Documentos;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.Documentos;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

public sealed class ConfiguracionDocumentoTests : IDisposable
{
    private readonly SqliteConnection _conexion = new("DataSource=:memory:");
    private readonly WebApplicationFactory<Program> _fabrica;
    private readonly HttpClient _cliente;
    private int _numeroPersona;
    private readonly InstitucionId _institucion = InstitucionId.Nuevo();

    public ConfiguracionDocumentoTests()
    {
        _conexion.Open();
        _fabrica = new FabricaPruebas().WithWebHostBuilder(builder =>
            builder.ConfigureServices(servicios =>
            {
                servicios.Remove(servicios.Single(d => d.ServiceType == typeof(DbContextOptions<AplicacionDbContext>)));
                servicios.AddDbContext<AplicacionDbContext>(opciones => opciones.UseSqlite(_conexion).UseSnakeCaseNamingConvention());
                using var proveedor = servicios.BuildServiceProvider();
                using var alcance = proveedor.CreateScope();
                var db = alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>();
                db.Database.EnsureCreated();
                if (!db.PlantillasHojaDeVida.Any())
                {
                    var plantilla = new PlantillaHojaDeVida(
                        Guid.Parse("11111111-1111-1111-1111-111111111111"),
                        "Plantilla Institucional Clásica",
                        "clasico",
                        System.Text.Json.JsonSerializer.Serialize(ConfiguracionPlantilla.Predeterminada()),
                        "Plantilla inicial",
                        esPredeterminada: true);
                    var v1 = plantilla.PublicarVersion("Versión 1 inicial");
                    db.PlantillasHojaDeVida.Add(plantilla);
                    db.VersionesPlantillaHojaDeVida.Add(v1);
                    db.SaveChanges();
                }
            }));
        _cliente = _fabrica.CreateClient();
    }

    public void Dispose()
    {
        _cliente.Dispose();
        _fabrica.Dispose();
        _conexion.Dispose();
    }

    private async Task AutenticarAsync(RolUsuario rol = RolUsuario.Admin, InstitucionId? institucion = null)
    {
        institucion ??= _institucion;
        using var alcance = _fabrica.Services.CreateScope();
        var db = alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>();

        if (!await db.Instituciones.AnyAsync(i => i.Id == institucion))
        {
            db.Instituciones.Add(new Institucion(institucion, "Institución ficticia de prueba"));
        }

        var persona = new Persona(
            Guid.NewGuid(),
            institucion,
            (++_numeroPersona).ToString("D10", System.Globalization.CultureInfo.InvariantCulture),
            rol,
            "Usuario ficticio de prueba",
            accesoHabilitado: true);

        persona.EstablecerPasswordHash(
            new PasswordHasher<Persona>().HashPassword(persona, "ClaveSegura123!"),
            debeCambiarContrasena: false);

        db.Personas.Add(persona);
        await db.SaveChangesAsync();

        var respuesta = await _cliente.PostAsJsonAsync("/api/auth/login", new LoginRequest(persona.Documento, "ClaveSegura123!"));
        Assert.True(respuesta.StatusCode == HttpStatusCode.OK, await respuesta.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task ObtenerConfiguracion_SinConfiguracionPropia_DevuelvePredeterminadaNeutraYBanderaFalsa()
    {
        await AutenticarAsync(RolUsuario.Admin);

        var respuesta = await _cliente.GetAsync("/api/configuracion/documento-hoja-de-vida");
        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);

        var config = await respuesta.Content.ReadFromJsonAsync<ConfiguracionDocumentoDto>();
        Assert.NotNull(config);
        Assert.False(config.TieneConfiguracionPropia);
        Assert.Equal(_institucion.Valor, config.InstitucionId);
        Assert.Equal(MarcaDocumento.Neutra.ColorPrimario, config.ColorPrimario);
        Assert.Equal(MarcaDocumento.Neutra.ColorSecundario, config.ColorSecundario);
    }

    [Fact]
    public async Task ActualizarMarca_ConColoresValidos_GuardaYAuditaSinPii()
    {
        await AutenticarAsync(RolUsuario.Admin);

        var dto = new ActualizarMarcaDto(
            NombreVisible: "Instituto Ficticio de Tecnología",
            LogoArchivoId: null,
            PortadaArchivoId: null,
            ColorPrimario: "#112233",
            ColorSecundario: "#445566",
            Lema: "Innovación y Desarrollo",
            TextoCompromiso: "Me comprometo a culminar las labores asignadas.");

        var respuesta = await _cliente.PutAsJsonAsync("/api/configuracion/documento-hoja-de-vida/marca", dto);
        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);

        var config = await respuesta.Content.ReadFromJsonAsync<ConfiguracionDocumentoDto>();
        Assert.NotNull(config);
        Assert.True(config.TieneConfiguracionPropia);
        Assert.Equal("#112233", config.ColorPrimario);
        Assert.Equal("#445566", config.ColorSecundario);
        Assert.Equal("Instituto Ficticio de Tecnología", config.NombreVisible);
        Assert.Equal("Innovación y Desarrollo", config.Lema);

        using var alcance = _fabrica.Services.CreateScope();
        var db = alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        var auditoria = await db.Auditorias
            .Where(a => a.Accion == "ConfiguracionDocumento.ActualizarMarca" && a.InstitucionId == _institucion)
            .FirstOrDefaultAsync();

        Assert.NotNull(auditoria);
        Assert.DoesNotContain("0000000000", auditoria.Detalle ?? string.Empty);
    }

    [Fact]
    public async Task ActualizarMarca_ColorInvalido_Retorna400()
    {
        await AutenticarAsync(RolUsuario.Admin);

        var dto = new ActualizarMarcaDto(
            NombreVisible: "Instituto Ficticio",
            LogoArchivoId: null,
            PortadaArchivoId: null,
            ColorPrimario: "rojo",
            ColorSecundario: "#ZZZZZZ",
            Lema: null,
            TextoCompromiso: null);

        var respuesta = await _cliente.PutAsJsonAsync("/api/configuracion/documento-hoja-de-vida/marca", dto);
        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task ElegirPlantilla_Y_AceptarNuevaVersion()
    {
        Guid plantillaId;
        using (var alcance = _fabrica.Services.CreateScope())
        {
            var db = alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            var plantilla = await db.PlantillasHojaDeVida.FirstAsync();
            plantillaId = plantilla.Id;
        }

        await AutenticarAsync(RolUsuario.Admin);

        var elegirDto = new ElegirPlantillaDto(plantillaId);
        var respElegir = await _cliente.PutAsJsonAsync("/api/configuracion/documento-hoja-de-vida/plantilla", elegirDto);
        Assert.Equal(HttpStatusCode.OK, respElegir.StatusCode);

        var configActual = await respElegir.Content.ReadFromJsonAsync<ConfiguracionDocumentoDto>();
        Assert.NotNull(configActual);
        Assert.False(configActual.HayNuevaVersionDisponible);

        // Simulamos que el superadmin publica una versión 2
        using (var alcance = _fabrica.Services.CreateScope())
        {
            var db = alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            var plantilla = await db.PlantillasHojaDeVida.Include(p => p.Versiones).FirstAsync(p => p.Id == plantillaId);
            plantilla.PublicarVersion("Versión 2 con ajustes de maquetación.");
            await db.SaveChangesAsync();
        }

        // Consultamos de nuevo: debe alertar que hay una nueva versión disponible pero mantener la actual
        var respGet = await _cliente.GetAsync("/api/configuracion/documento-hoja-de-vida");
        Assert.Equal(HttpStatusCode.OK, respGet.StatusCode);
        var configConNueva = await respGet.Content.ReadFromJsonAsync<ConfiguracionDocumentoDto>();
        Assert.NotNull(configConNueva);
        Assert.True(configConNueva.HayNuevaVersionDisponible);
        Assert.Equal(1, configConNueva.NumeroVersion);
        Assert.Equal(2, configConNueva.UltimoNumeroVersionDisponible);

        // El admin acepta la nueva versión
        var respAceptar = await _cliente.PostAsync("/api/configuracion/documento-hoja-de-vida/aceptar-version", null);
        Assert.Equal(HttpStatusCode.OK, respAceptar.StatusCode);
        var configActualizada = await respAceptar.Content.ReadFromJsonAsync<ConfiguracionDocumentoDto>();
        Assert.NotNull(configActualizada);
        Assert.False(configActualizada.HayNuevaVersionDisponible);
        Assert.Equal(2, configActualizada.NumeroVersion);
    }

    [Fact]
    public async Task Usuario_NoAdmin_Recibe403()
    {
        await AutenticarAsync(RolUsuario.Usuario);

        var respuesta = await _cliente.GetAsync("/api/configuracion/documento-hoja-de-vida");
        Assert.Equal(HttpStatusCode.Forbidden, respuesta.StatusCode);
    }
}
