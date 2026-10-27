namespace Istpet.ActualizacionDatos.WebApi.Tests;

using System.Net;
using System.Net.Http.Json;
using System.Text;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Istpet.ActualizacionDatos.Infrastructure.Servicios;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

public sealed class CatalogosTests : IDisposable
{
    private readonly SqliteConnection _conexion = new("DataSource=:memory:");
    private readonly WebApplicationFactory<Program> _fabrica;
    private readonly HttpClient _cliente;
    private const string Cabecera = "codigo,nombre,codigo_padre,codigo_externo\n";

    public CatalogosTests()
    {
        _conexion.Open();
        _fabrica = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(servicios =>
            {
                var opciones = servicios.Single(d => d.ServiceType == typeof(DbContextOptions<AplicacionDbContext>));
                servicios.Remove(opciones);
                servicios.AddDbContext<AplicacionDbContext>(opciones => opciones.UseSqlite(_conexion).UseSnakeCaseNamingConvention());
                using var proveedor = servicios.BuildServiceProvider();
                using var alcance = proveedor.CreateScope();
                alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>().Database.EnsureCreated();
            });
        });
        _cliente = _fabrica.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
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
        var institucion = new Institucion(InstitucionId.Nuevo(), "Institución ficticia de catálogos");
        var persona = new Persona(Guid.NewGuid(), institucion.Id, "0000000000", rol, "Persona ficticia", "catalogos@ejemplo.test", accesoHabilitado: true);
        persona.EstablecerPasswordHash(new PasswordHasher<Persona>().HashPassword(persona, "ClaveFicticiaCatalogos29"), debeCambiarContrasena: false);
        db.Instituciones.Add(institucion);
        db.Personas.Add(persona);
        await db.SaveChangesAsync();
        var respuesta = await _cliente.PostAsJsonAsync("/api/auth/login", new LoginRequest(persona.Documento, "ClaveFicticiaCatalogos29"));
        Assert.True(respuesta.IsSuccessStatusCode, await respuesta.Content.ReadAsStringAsync());
    }

    private Task<HttpResponseMessage> ImportarAsync(TipoCatalogo tipo, string filas)
    {
        var contenido = new MultipartFormDataContent();
        contenido.Add(new ByteArrayContent(Encoding.UTF8.GetBytes(Cabecera + filas)), "archivo", "catalogo-ficticio.csv");
        return _cliente.PostAsync($"/api/catalogos/{tipo}/importar", contenido);
    }

    [Fact]
    public async Task Importar_dos_veces_no_duplica_y_actualizar_conserva_ids()
    {
        await AutenticarAsync(RolUsuario.Superadmin);
        var primera = await ImportarAsync(TipoCatalogo.Pais, "FICTICIO,País ficticio,,EXT-FICTICIO\n");
        Assert.Equal(HttpStatusCode.OK, primera.StatusCode);
        var inicial = await _cliente.GetFromJsonAsync<List<ElementoCatalogoDto>>("/api/catalogos/Pais");
        var segunda = await ImportarAsync(TipoCatalogo.Pais, " ficticio ,País ficticio,,EXT-FICTICIO\n");
        var resumen = await segunda.Content.ReadFromJsonAsync<ResultadoImportacionCatalogoDto>();
        Assert.NotNull(resumen);
        Assert.Equal(0, resumen.Creados);
        Assert.Equal(1, resumen.SinCambios);
        var actualizar = await ImportarAsync(TipoCatalogo.Pais, "FICTICIO,País ficticio corregido,,EXT-FICTICIO\n");
        Assert.Equal(HttpStatusCode.OK, actualizar.StatusCode);
        var final = await _cliente.GetFromJsonAsync<List<ElementoCatalogoDto>>("/api/catalogos/Pais");
        var elemento = Assert.Single(final!);
        Assert.Equal(Assert.Single(inicial!).Id, elemento.Id);
        Assert.True(elemento.Id >= 1000);
        Assert.Equal("País ficticio corregido", elemento.Nombre);
    }

    [Fact]
    public async Task Padre_de_otro_tipo_rechaza_todo_el_archivo()
    {
        await AutenticarAsync(RolUsuario.Superadmin);
        await ImportarAsync(TipoCatalogo.Pais, "PAIS_FICTICIO,País ficticio,,\n");
        await ImportarAsync(TipoCatalogo.Provincia, "PROV_FICTICIA,Provincia ficticia,PAIS_FICTICIO,\n");
        var respuesta = await ImportarAsync(TipoCatalogo.Canton, "CANTON_VALIDO,Cantón ficticio válido,PROV_FICTICIA,\nCANTON_INVALIDO,Cantón ficticio inválido,PAIS_FICTICIO,\n");
        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        Assert.Empty((await _cliente.GetFromJsonAsync<List<ElementoCatalogoDto>>("/api/catalogos/Canton"))!);
    }

    [Fact]
    public async Task PadreId_filtra_activos_y_orden_y_el_catalogo_es_compartido()
    {
        await AutenticarAsync(RolUsuario.Superadmin);
        await ImportarAsync(TipoCatalogo.Pais, "PAIS_A,País ficticio A,,\nPAIS_B,País ficticio B,,\n");
        await ImportarAsync(TipoCatalogo.Provincia, "PROV_B,Provincia ficticia B,PAIS_A,\nPROV_A,Provincia ficticia A,PAIS_A,\nPROV_C,Provincia ficticia C,PAIS_B,\n");
        var ordenadas = await _cliente.GetFromJsonAsync<List<ElementoCatalogoDto>>("/api/catalogos/Provincia");
        Assert.Collection(ordenadas!, p => Assert.Equal("PROV_B", p.Codigo), p => Assert.Equal("PROV_A", p.Codigo), p => Assert.Equal("PROV_C", p.Codigo));
        using (var alcance = _fabrica.Services.CreateScope())
        {
            var db = alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            (await db.ElementosCatalogo.SingleAsync(e => e.Codigo == "PROV_B")).Desactivar();
            await db.SaveChangesAsync();
        }
        var paises = await _cliente.GetFromJsonAsync<List<ElementoCatalogoDto>>("/api/catalogos/Pais");
        var padreId = paises!.Single(p => p.Codigo == "PAIS_A").Id;
        var provincias = await _cliente.GetFromJsonAsync<List<ElementoCatalogoDto>>($"/api/catalogos/Provincia?padreId={padreId}");
        Assert.Equal("PROV_A", Assert.Single(provincias!).Codigo);
        var sinFiltro = await _cliente.GetFromJsonAsync<List<ElementoCatalogoDto>>("/api/catalogos/Provincia");
        Assert.Collection(sinFiltro!, p => Assert.Equal("PROV_A", p.Codigo), p => Assert.Equal("PROV_C", p.Codigo));
        Assert.Empty((await _cliente.GetFromJsonAsync<List<ElementoCatalogoDto>>("/api/catalogos/Provincia?padreId=999999"))!);
    }

    [Theory]
    [InlineData(RolUsuario.Usuario)]
    [InlineData(RolUsuario.Supervisor)]
    [InlineData(RolUsuario.Admin)]
    public async Task Roles_autenticados_consultan_pero_no_importan_ni_suplantando_cabeceras(RolUsuario rol)
    {
        await AutenticarAsync(rol);
        Assert.Equal(HttpStatusCode.OK, (await _cliente.GetAsync("/api/catalogos/Sexo")).StatusCode);
        _cliente.DefaultRequestHeaders.Add("X-Rol", "Superadmin");
        var respuesta = await ImportarAsync(TipoCatalogo.Pais, "FICTICIO,País ficticio,,\n");
        Assert.Equal(HttpStatusCode.Forbidden, respuesta.StatusCode);
    }

    [Fact]
    public async Task Sin_cookie_no_se_consulta_ni_importa_aunque_indique_X_Rol()
    {
        _cliente.DefaultRequestHeaders.Add("X-Rol", "Superadmin");
        Assert.Equal(HttpStatusCode.Unauthorized, (await _cliente.GetAsync("/api/catalogos/Pais")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await ImportarAsync(TipoCatalogo.Pais, "FICTICIO,País ficticio,,\n")).StatusCode);
    }

    [Theory]
    [InlineData("Desconocido")]
    [InlineData("999")]
    [InlineData("Provincia,Canton")]
    [InlineData("Pais?padreId=-1")]
    public async Task Consulta_con_tipo_o_filtro_invalido_devuelve_400(string ruta)
    {
        await AutenticarAsync(RolUsuario.Usuario);
        Assert.Equal(HttpStatusCode.BadRequest, (await _cliente.GetAsync($"/api/catalogos/{ruta}")).StatusCode);
    }

    [Fact]
    public async Task CSV_con_comillas_BOM_acentos_y_CRLF_se_interpreta_sin_perder_texto()
    {
        await AutenticarAsync(RolUsuario.Superadmin);
        using var contenido = new MultipartFormDataContent();
        contenido.Add(new ByteArrayContent(Encoding.UTF8.GetBytes("\uFEFF\"codigo\",\"nombre\",\"codigo_padre\",\"codigo_externo\"\r\nFICTICIO,\"País ficticio, con acento y \"\"comillas\"\"\",,EXT\r\n")), "archivo", "ficticio.csv");
        Assert.Equal(HttpStatusCode.OK, (await _cliente.PostAsync("/api/catalogos/Pais/importar", contenido)).StatusCode);
        var pais = Assert.Single((await _cliente.GetFromJsonAsync<List<ElementoCatalogoDto>>("/api/catalogos/Pais"))!);
        Assert.Equal("País ficticio, con acento y \"comillas\"", pais.Nombre);
    }

    [Theory]
    [InlineData("FICTICIO,País ficticio,,\n ficticio ,Duplicado ficticio,,\n")]
    [InlineData("FICTICIO,\"comilla sin cerrar,,\n")]
    [InlineData("FICTICIO,País ficticio,\n")]
    [InlineData("FICTICIO,País ficticio,PADRE_PROHIBIDO,\n")]
    public async Task CSV_invalido_no_deja_cambios_parciales(string filas)
    {
        await AutenticarAsync(RolUsuario.Superadmin);
        Assert.Equal(HttpStatusCode.BadRequest, (await ImportarAsync(TipoCatalogo.Pais, filas)).StatusCode);
        Assert.Empty((await _cliente.GetFromJsonAsync<List<ElementoCatalogoDto>>("/api/catalogos/Pais"))!);
    }

    [Fact]
    public async Task Importacion_no_modifica_semillas_ni_reactiva_inactivos()
    {
        await AutenticarAsync(RolUsuario.Superadmin);
        Assert.Equal(HttpStatusCode.BadRequest, (await ImportarAsync(TipoCatalogo.Sexo, "HOMBRE,Nombre ficticio modificado,,\n")).StatusCode);
        await ImportarAsync(TipoCatalogo.Pais, "FICTICIO,País ficticio,,\n");
        using (var alcance = _fabrica.Services.CreateScope())
        {
            var db = alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            (await db.ElementosCatalogo.SingleAsync(e => e.Codigo == "FICTICIO")).Desactivar();
            await db.SaveChangesAsync();
        }

        Assert.Equal(HttpStatusCode.OK, (await ImportarAsync(TipoCatalogo.Pais, "FICTICIO,País ficticio corregido,,\n")).StatusCode);
        Assert.Empty((await _cliente.GetFromJsonAsync<List<ElementoCatalogoDto>>("/api/catalogos/Pais"))!);
        var sexos = await _cliente.GetFromJsonAsync<List<ElementoCatalogoDto>>("/api/catalogos/Sexo");
        Assert.Equal("Hombre", sexos!.Single(e => e.Id == 1).Nombre);
    }

    [Theory]
    [InlineData("", "País ficticio", "")]
    [InlineData("FICTICIO", "", "")]
    [InlineData("CODIGO_MAYOR_QUE_CINCUENTA_CARACTERES_PARA_RECHAZAR_IMPORTACION", "País ficticio", "")]
    [InlineData("FICTICIO", "País ficticio", "CODIGO_EXTERNO_MAYOR_QUE_CINCUENTA_CARACTERES_PARA_RECHAZAR")]
    public async Task Columnas_invalidas_se_rechazan(string codigo, string nombre, string externo)
    {
        await AutenticarAsync(RolUsuario.Superadmin);
        Assert.Equal(HttpStatusCode.BadRequest, (await ImportarAsync(TipoCatalogo.Pais, $"{codigo},{nombre},,{externo}\n")).StatusCode);
    }

    [Fact]
    public async Task Rechaza_CSV_vacio_cabecera_incorrecta_tamano_excesivo_y_utf8_invalido()
    {
        await AutenticarAsync(RolUsuario.Superadmin);
        List<byte[]> contenidos =
        [
            [],
            Encoding.UTF8.GetBytes("cabecera,incorrecta\n"),
            new byte[ServicioCatalogos.MaximoBytesCsv + 1],
            [0xFF, 0xFE, 0xFF],
        ];
        foreach (var bytes in contenidos)
        {
            using var formulario = new MultipartFormDataContent();
            formulario.Add(new ByteArrayContent(bytes), "archivo", "catalogo-ficticio.csv");
            Assert.Equal(HttpStatusCode.BadRequest, (await _cliente.PostAsync("/api/catalogos/Pais/importar", formulario)).StatusCode);
        }
    }

    [Fact]
    public void Produccion_rechaza_arranque_sin_catalogos_aunque_se_active_la_opcion_de_desarrollo()
    {
        using var produccion = _fabrica.WithWebHostBuilder(builder => builder
            .UseEnvironment("Production")
            .UseSetting("Catalogos:CargarAlInicio", "true")
            .UseSetting("Catalogos:Directorio", "/directorio-ficticio-inexistente"));
        var error = Assert.Throws<InvalidOperationException>(() => produccion.CreateClient());
        Assert.Contains("Catálogos obligatorios incompletos", error.Message, StringComparison.Ordinal);
        Assert.Contains("Banco", error.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Validador_rechaza_tipo_incorrecto_inactivo_o_inexistente()
    {
        using var alcance = _fabrica.Services.CreateScope();
        var validador = alcance.ServiceProvider.GetRequiredService<ValidadorCatalogos>();
        await validador.ValidarAsync(1, TipoCatalogo.Sexo);
        await Assert.ThrowsAsync<ReglaNegocioException>(() => validador.ValidarAsync(1, TipoCatalogo.Pais));
        var db = alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        (await db.ElementosCatalogo.SingleAsync(e => e.Id == 1)).Desactivar();
        await db.SaveChangesAsync();
        await Assert.ThrowsAsync<ReglaNegocioException>(() => validador.ValidarAsync(1, TipoCatalogo.Sexo));
        await Assert.ThrowsAsync<ReglaNegocioException>(() => validador.ValidarAsync(999999, TipoCatalogo.Sexo));
    }
}
