namespace Istpet.ActualizacionDatos.WebApi.Tests;

using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

public sealed class SeguridadInfraestructuraTests : IDisposable
{
    private readonly SqliteConnection _conexion;
    private readonly string _directorioArchivos;

    public SeguridadInfraestructuraTests()
    {
        _conexion = new SqliteConnection("DataSource=:memory:");
        _conexion.Open();
        _directorioArchivos = Path.Combine(Path.GetTempPath(), "istpet-seguridad-" + Guid.NewGuid().ToString("N"));
    }

    public void Dispose()
    {
        _conexion.Dispose();
        if (Directory.Exists(_directorioArchivos))
        {
            try { Directory.Delete(_directorioArchivos, recursive: true); } catch { }
        }
    }

    private WebApplicationFactory<Program> CrearFabrica(string? cookieSecurePolicy = null)
    {
        return new FabricaPruebas().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Development");
            builder.ConfigureAppConfiguration((_, config) =>
            {
                var dict = new Dictionary<string, string?>
                {
                    ["Almacenamiento:RutaRaiz"] = _directorioArchivos
                };
                if (cookieSecurePolicy != null)
                {
                    dict["Autenticacion:CookieSecurePolicy"] = cookieSecurePolicy;
                }
                config.AddInMemoryCollection(dict);
            });

            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AplicacionDbContext>));
                if (descriptor != null)
                {
                    services.Remove(descriptor);
                }

                services.AddDbContext<AplicacionDbContext>((_, options) =>
                {
                    options.UseSqlite(_conexion);
                    options.UseSnakeCaseNamingConvention();
                });

                var sp = services.BuildServiceProvider();
                using var scope = sp.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
                db.Database.EnsureCreated();
            });
        });
    }

    private static async Task<(InstitucionId instId, string documento)> SembrarUsuarioYCampanaAsync(
        WebApplicationFactory<Program> fabrica,
        string documento = "1700000099",
        string? clave = null)
    {
        using var scope = fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();

        var institucionId = InstitucionId.Nuevo();
        var institucion = new Institucion(institucionId, "Instituto Tecnológico Ficticio");
        db.Instituciones.Add(institucion);

        var campana = new Campana(
            Guid.NewGuid(),
            institucionId,
            "Campaña Activa Ficticia",
            DateTime.UtcNow.AddDays(-1),
            DateTime.UtcNow.AddDays(1),
            activa: true);
        db.Campanas.Add(campana);

        var persona = new Persona(
            Guid.NewGuid(),
            institucionId,
            documento,
            RolUsuario.Usuario,
            "Docente Ficticio",
            "docente.ficticio@ejemplo.test",
            accesoHabilitado: true);

        if (clave != null)
        {
            persona.EstablecerPasswordHash(new PasswordHasher<Persona>().HashPassword(persona, clave), debeCambiarContrasena: false);
        }

        db.Personas.Add(persona);
        await db.SaveChangesAsync();

        return (institucionId, documento);
    }

    [Fact]
    public async Task Con_Politica_Always_Cookie_Siempre_Tiene_Atributo_Secure()
    {
        using var fabrica = CrearFabrica("Always");
        await SembrarUsuarioYCampanaAsync(fabrica, "1700000091");

        using var cliente = fabrica.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });

        var respuesta = await cliente.PostAsJsonAsync("/api/auth/login", new LoginRequest("1700000091", "1700000091"));
        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);

        Assert.True(respuesta.Headers.Contains("Set-Cookie"), "Debe devolver cabecera Set-Cookie");
        var cookieHeader = string.Join("; ", respuesta.Headers.GetValues("Set-Cookie"));

        Assert.Contains("istpet_auth", cookieHeader);
        Assert.Contains("httponly", cookieHeader, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=strict", cookieHeader, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("secure", cookieHeader, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Con_Forwarded_Proto_Https_UseForwardedHeaders_Aplica_Https_Y_Secure()
    {
        using var fabrica = CrearFabrica("SameAsRequest");
        await SembrarUsuarioYCampanaAsync(fabrica, "1700000092");

        using var cliente = fabrica.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });

        var peticion = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
        {
            Content = JsonContent.Create(new LoginRequest("1700000092", "1700000092"))
        };
        peticion.Headers.Add("X-Forwarded-Proto", "https");
        peticion.Headers.Add("X-Forwarded-For", "203.0.113.195");

        var respuesta = await cliente.SendAsync(peticion);
        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);

        Assert.True(respuesta.Headers.Contains("Set-Cookie"));
        var cookieHeader = string.Join("; ", respuesta.Headers.GetValues("Set-Cookie"));
        Assert.Contains("secure", cookieHeader, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Con_Forwarded_Proto_Http_Y_SameAsRequest_No_Agrega_Secure()
    {
        using var fabrica = CrearFabrica("SameAsRequest");
        await SembrarUsuarioYCampanaAsync(fabrica, "1700000093");

        using var cliente = fabrica.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });

        var peticion = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
        {
            Content = JsonContent.Create(new LoginRequest("1700000093", "1700000093"))
        };
        peticion.Headers.Add("X-Forwarded-Proto", "http");

        var respuesta = await cliente.SendAsync(peticion);
        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);

        Assert.True(respuesta.Headers.Contains("Set-Cookie"));
        var cookieHeader = string.Join("; ", respuesta.Headers.GetValues("Set-Cookie"));
        Assert.DoesNotContain("secure", cookieHeader, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Recorrido_Completo_Mismo_Origen_Cookie_Segura_Login_Sesion_Y_Archivos()
    {
        using var fabrica = CrearFabrica("Always");
        var (instId, doc) = await SembrarUsuarioYCampanaAsync(fabrica, "1700000094", clave: "ClaveFicticia123!");

        // Cliente que maneja cookies para simular el navegador en el mismo origen HTTPS
        using var cliente = fabrica.CreateClient(new WebApplicationFactoryClientOptions
        {
            HandleCookies = true,
            BaseAddress = new Uri("https://localhost")
        });

        // 1. Login con datos ficticios
        var loginPeticion = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
        {
            Content = JsonContent.Create(new LoginRequest(doc, "ClaveFicticia123!"))
        };
        loginPeticion.Headers.Add("X-Forwarded-Proto", "https");
        var loginRespuesta = await cliente.SendAsync(loginPeticion);
        Assert.Equal(HttpStatusCode.OK, loginRespuesta.StatusCode);

        // 2. Comprobar que cookie devuelta tiene flags seguros
        var cookieHeader = string.Join("; ", loginRespuesta.Headers.GetValues("Set-Cookie"));
        Assert.Contains("istpet_auth", cookieHeader);
        Assert.Contains("httponly", cookieHeader, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=strict", cookieHeader, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("secure", cookieHeader, StringComparison.OrdinalIgnoreCase);

        // 3. Consultar sesión autenticada con la cookie
        var sesionRespuesta = await cliente.GetAsync("/api/auth/sesion");
        Assert.Equal(HttpStatusCode.OK, sesionRespuesta.StatusCode);

        // 4. Subir archivo mediante la sesión autenticada
        var contenidoPdf = "%PDF-1.4\nContenido ficticio para prueba de infraestructura";
        using var form = new MultipartFormDataContent();
        var archivoContent = new ByteArrayContent(Encoding.UTF8.GetBytes(contenidoPdf));
        archivoContent.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        form.Add(archivoContent, "archivo", "cedula_ficticia.pdf");

        var subirPeticion = new HttpRequestMessage(HttpMethod.Post, "/api/archivos/subir?claveDestino=cedula_frontal")
        {
            Content = form
        };
        subirPeticion.Headers.Add("X-Actor", doc);
        subirPeticion.Headers.Add("X-Institucion-Id", instId.Valor.ToString());
        subirPeticion.Headers.Add("X-Rol", "Usuario");

        var subirRespuesta = await cliente.SendAsync(subirPeticion);
        Assert.Equal(HttpStatusCode.OK, subirRespuesta.StatusCode);

        var archivoDto = await subirRespuesta.Content.ReadFromJsonAsync<ArchivoDto>();
        Assert.NotNull(archivoDto);
        Assert.NotEqual(Guid.Empty, archivoDto.Id);

        // 5. Descargar y verificar lectura del archivo subido
        var descargarPeticion = new HttpRequestMessage(HttpMethod.Get, $"/api/archivos/{archivoDto.Id}/descargar");
        descargarPeticion.Headers.Add("X-Actor", doc);
        descargarPeticion.Headers.Add("X-Institucion-Id", instId.Valor.ToString());
        descargarPeticion.Headers.Add("X-Rol", "Usuario");

        var descargarRespuesta = await cliente.SendAsync(descargarPeticion);
        Assert.Equal(HttpStatusCode.OK, descargarRespuesta.StatusCode);
        var bytesDescargados = await descargarRespuesta.Content.ReadAsByteArrayAsync();
        Assert.Equal(contenidoPdf, Encoding.UTF8.GetString(bytesDescargados));

        // 6. Cierre de sesión (logout)
        var logoutRespuesta = await cliente.PostAsync("/api/auth/logout", new StringContent(""));
        var logoutCuerpo = await logoutRespuesta.Content.ReadAsStringAsync();
        Assert.True(logoutRespuesta.IsSuccessStatusCode, $"Logout falló con status {logoutRespuesta.StatusCode}: {logoutCuerpo}");

        // 7. Acceso posterior sin sesión debe retornar 401
        var postLogoutRespuesta = await cliente.GetAsync("/api/auth/sesion");
        Assert.Equal(HttpStatusCode.Unauthorized, postLogoutRespuesta.StatusCode);
    }
}
