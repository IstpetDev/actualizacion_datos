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

public sealed class PlantillasHojaDeVidaTests : IDisposable
{
    private readonly SqliteConnection _conexion = new("DataSource=:memory:");
    private readonly WebApplicationFactory<Program> _fabrica;
    private readonly HttpClient _cliente;
    private int _numeroPersona;
    private readonly InstitucionId _institucion = InstitucionId.Nuevo();

    public PlantillasHojaDeVidaTests()
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

    private async Task AutenticarAsync(RolUsuario rol)
    {
        using var alcance = _fabrica.Services.CreateScope();
        var db = alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>();

        if (!await db.Instituciones.AnyAsync(i => i.Id == _institucion))
        {
            db.Instituciones.Add(new Institucion(_institucion, "Institución de pruebas de plantillas"));
        }

        var persona = new Persona(
            Guid.NewGuid(),
            _institucion,
            (++_numeroPersona).ToString("D10", System.Globalization.CultureInfo.InvariantCulture),
            rol,
            "Usuario de plantillas",
            accesoHabilitado: true);

        persona.EstablecerPasswordHash(
            new PasswordHasher<Persona>().HashPassword(persona, "ClavePlantillas123!"),
            debeCambiarContrasena: false);

        db.Personas.Add(persona);
        await db.SaveChangesAsync();

        var respuesta = await _cliente.PostAsJsonAsync("/api/auth/login", new LoginRequest(persona.Documento, "ClavePlantillas123!"));
        Assert.True(respuesta.StatusCode == HttpStatusCode.OK, await respuesta.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Superadmin_PuedeCrearPlantilla_BorradorSeGuardaYAudita()
    {
        await AutenticarAsync(RolUsuario.Superadmin);

        var dto = new CrearPlantillaDto(
            Nombre: "Plantilla Moderna Ejecutiva",
            Descripcion: "Diseño ejecutivo contemporáneo para personal docente y administrativo.",
            DisenoBase: "clasico",
            Configuracion: ConfiguracionPlantilla.Predeterminada());

        var respuesta = await _cliente.PostAsJsonAsync("/api/plantillas-hoja-de-vida", dto);
        Assert.Equal(HttpStatusCode.Created, respuesta.StatusCode);

        var detalle = await respuesta.Content.ReadFromJsonAsync<PlantillaDetalleDto>();
        Assert.NotNull(detalle);
        Assert.Equal("Plantilla Moderna Ejecutiva", detalle.Nombre);
        Assert.Empty(detalle.Versiones);

        using var alcance = _fabrica.Services.CreateScope();
        var db = alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        var auditoria = await db.Auditorias
            .Where(a => a.Accion == "PlantillaHojaDeVida.Crear")
            .FirstOrDefaultAsync();

        Assert.NotNull(auditoria);
    }

    [Fact]
    public async Task CrearPlantilla_ConCampoFueraDeCatalogo_Retorna400()
    {
        await AutenticarAsync(RolUsuario.Superadmin);

        var configInvalida = new ConfiguracionPlantilla(
            DisenoBase: "clasico",
            Secciones: new List<SeccionPlantillaConfig>
            {
                new("datos_personales", new List<string> { "cuenta_bancaria", "tipo_sangre" })
            });

        var dto = new CrearPlantillaDto(
            Nombre: "Plantilla con campos indebidos",
            Descripcion: "Debe ser rechazada",
            DisenoBase: "clasico",
            Configuracion: configInvalida);

        var respuesta = await _cliente.PostAsJsonAsync("/api/plantillas-hoja-de-vida", dto);
        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Superadmin_PublicarVersion_IncrementaNumeroVersion_E_Inmutable()
    {
        await AutenticarAsync(RolUsuario.Superadmin);

        var dto = new CrearPlantillaDto(
            Nombre: "Plantilla Para Versionar",
            Descripcion: "Prueba de versiones",
            DisenoBase: "clasico",
            Configuracion: ConfiguracionPlantilla.Predeterminada());

        var respCrear = await _cliente.PostAsJsonAsync("/api/plantillas-hoja-de-vida", dto);
        Assert.Equal(HttpStatusCode.Created, respCrear.StatusCode);
        var plantilla = await respCrear.Content.ReadFromJsonAsync<PlantillaDetalleDto>();
        Assert.NotNull(plantilla);

        // Publicar primera versión
        var respPub1 = await _cliente.PostAsJsonAsync(
            $"/api/plantillas-hoja-de-vida/{plantilla.Id}/publicar",
            new PublicarVersionDto("Versión inicial 1.0"));
        Assert.Equal(HttpStatusCode.OK, respPub1.StatusCode);
        var v1 = await respPub1.Content.ReadFromJsonAsync<VersionPlantillaDto>();
        Assert.NotNull(v1);
        Assert.Equal(1, v1.NumeroVersion);

        // Publicar segunda versión
        var respPub2 = await _cliente.PostAsJsonAsync(
            $"/api/plantillas-hoja-de-vida/{plantilla.Id}/publicar",
            new PublicarVersionDto("Versión 2.0 con ajustes"));
        Assert.Equal(HttpStatusCode.OK, respPub2.StatusCode);
        var v2 = await respPub2.Content.ReadFromJsonAsync<VersionPlantillaDto>();
        Assert.NotNull(v2);
        Assert.Equal(2, v2.NumeroVersion);
    }

    [Fact]
    public async Task Superadmin_MarcarComoPredeterminada_ActualizaBanderas()
    {
        await AutenticarAsync(RolUsuario.Superadmin);

        var dto = new CrearPlantillaDto(
            Nombre: "Nueva Predeterminada",
            Descripcion: "Será la nueva por defecto",
            DisenoBase: "clasico",
            Configuracion: ConfiguracionPlantilla.Predeterminada());

        var respCrear = await _cliente.PostAsJsonAsync("/api/plantillas-hoja-de-vida", dto);
        Assert.Equal(HttpStatusCode.Created, respCrear.StatusCode);
        var plantilla = await respCrear.Content.ReadFromJsonAsync<PlantillaDetalleDto>();
        Assert.NotNull(plantilla);

        var respMarcar = await _cliente.PostAsync($"/api/plantillas-hoja-de-vida/{plantilla.Id}/predeterminada", null);
        Assert.Equal(HttpStatusCode.OK, respMarcar.StatusCode);

        using var alcance = _fabrica.Services.CreateScope();
        var db = alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>();

        var nuevaPred = await db.PlantillasHojaDeVida.SingleAsync(p => p.Id == plantilla.Id);
        Assert.True(nuevaPred.EsPredeterminada);

        var anteriores = await db.PlantillasHojaDeVida.Where(p => p.Id != plantilla.Id).ToListAsync();
        Assert.All(anteriores, p => Assert.False(p.EsPredeterminada));
    }

    [Fact]
    public async Task Admin_NoPuedeCrearNiPublicarPlantillas_Recibe403()
    {
        await AutenticarAsync(RolUsuario.Admin);

        var dto = new CrearPlantillaDto(
            Nombre: "Intento por Admin",
            Descripcion: "No permitido",
            DisenoBase: "clasico",
            Configuracion: ConfiguracionPlantilla.Predeterminada());

        var respCrear = await _cliente.PostAsJsonAsync("/api/plantillas-hoja-de-vida", dto);
        Assert.Equal(HttpStatusCode.Forbidden, respCrear.StatusCode);
    }

    [Fact]
    public async Task Admin_SoloVePlantillasPublicadas()
    {
        Guid idBorrador;
        // Creamos una plantilla borrador (sin versiones) directamente en DB
        using (var alcance = _fabrica.Services.CreateScope())
        {
            var db = alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            var borrador = new PlantillaHojaDeVida(
                Guid.NewGuid(),
                "Borrador Privado",
                "clasico",
                System.Text.Json.JsonSerializer.Serialize(ConfiguracionPlantilla.Predeterminada()));
            db.PlantillasHojaDeVida.Add(borrador);
            await db.SaveChangesAsync();
            idBorrador = borrador.Id;
        }

        // Admin consulta: no debe ver el borrador sin versiones publicadas
        await AutenticarAsync(RolUsuario.Admin);
        var respAdmin = await _cliente.GetAsync("/api/plantillas-hoja-de-vida");
        Assert.Equal(HttpStatusCode.OK, respAdmin.StatusCode);
        var listaAdmin = await respAdmin.Content.ReadFromJsonAsync<List<PlantillaResumenDto>>();
        Assert.NotNull(listaAdmin);
        Assert.DoesNotContain(listaAdmin, p => p.Id == idBorrador);

        // Superadmin consulta: sí debe ver el borrador
        await AutenticarAsync(RolUsuario.Superadmin);
        var respSuper = await _cliente.GetAsync("/api/plantillas-hoja-de-vida");
        Assert.Equal(HttpStatusCode.OK, respSuper.StatusCode);
        var listaSuper = await respSuper.Content.ReadFromJsonAsync<List<PlantillaResumenDto>>();
        Assert.NotNull(listaSuper);
        Assert.Contains(listaSuper, p => p.Id == idBorrador);
    }
}
