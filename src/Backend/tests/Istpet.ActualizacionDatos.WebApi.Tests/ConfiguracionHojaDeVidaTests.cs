namespace Istpet.ActualizacionDatos.WebApi.Tests;

using System.Net;
using System.Net.Http.Json;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

public sealed class ConfiguracionHojaDeVidaTests : IDisposable
{
    private readonly SqliteConnection _conexion = new("DataSource=:memory:");
    private readonly WebApplicationFactory<Program> _fabrica;
    private readonly HttpClient _cliente;
    private int _numeroPersona;
    private readonly InstitucionId _institucion = InstitucionId.Nuevo();

    public ConfiguracionHojaDeVidaTests()
    {
        _conexion.Open();
        _fabrica = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
            builder.ConfigureServices(servicios =>
            {
                servicios.Remove(servicios.Single(d => d.ServiceType == typeof(DbContextOptions<AplicacionDbContext>)));
                servicios.AddDbContext<AplicacionDbContext>(opciones => opciones.UseSqlite(_conexion).UseSnakeCaseNamingConvention());
                using var proveedor = servicios.BuildServiceProvider();
                using var alcance = proveedor.CreateScope();
                alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>().Database.EnsureCreated();
            }));
        _cliente = _fabrica.CreateClient();
    }

    public void Dispose()
    {
        _cliente.Dispose();
        _fabrica.Dispose();
        _conexion.Dispose();
    }

    private async Task<Guid> AutenticarAsync(RolUsuario rol = RolUsuario.Admin, InstitucionId? institucion = null)
    {
        institucion ??= _institucion;
        using var alcance = _fabrica.Services.CreateScope();
        var db = alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        if (!await db.Instituciones.AnyAsync(i => i.Id == institucion))
        {
            db.Instituciones.Add(new Institucion(institucion, "Institución ficticia de configuración"));
        }
        var persona = new Persona(Guid.NewGuid(), institucion, (++_numeroPersona).ToString("D10", System.Globalization.CultureInfo.InvariantCulture), rol, "Persona ficticia", accesoHabilitado: true);
        persona.EstablecerPasswordHash(new PasswordHasher<Persona>().HashPassword(persona, "ClaveFicticiaConfiguracion31"), debeCambiarContrasena: false);
        db.Personas.Add(persona);
        await db.SaveChangesAsync();
        var respuesta = await _cliente.PostAsJsonAsync("/api/auth/login", new LoginRequest(persona.Documento, "ClaveFicticiaConfiguracion31"));
        Assert.True(respuesta.StatusCode == HttpStatusCode.OK, await respuesta.Content.ReadAsStringAsync());
        return persona.Id;
    }

    [Fact]
    public async Task Admin_crea_tipo_normalizado_y_rechaza_duplicado()
    {
        await AutenticarAsync();
        var respuesta = await _cliente.PostAsJsonAsync("/api/configuracion/tipos-funcionario", new GuardarTipoFuncionarioRequest(" docente ", "Docente", true));
        Assert.Equal(HttpStatusCode.Created, respuesta.StatusCode);
        var tipo = await respuesta.Content.ReadFromJsonAsync<TipoFuncionarioDto>();
        Assert.Equal("DOCENTE", tipo!.Codigo);
        Assert.Equal(HttpStatusCode.BadRequest, (await _cliente.PostAsJsonAsync("/api/configuracion/tipos-funcionario", new GuardarTipoFuncionarioRequest("Docente", "Otro"))).StatusCode);
    }

    public static TheoryData<string, string> Rutas => new()
    {
        { "GET", "/api/configuracion/tipos-funcionario" },
        { "POST", "/api/configuracion/tipos-funcionario" },
        { "PUT", "/api/configuracion/tipos-funcionario/00000000-0000-0000-0000-000000000001" },
        { "DELETE", "/api/configuracion/tipos-funcionario/00000000-0000-0000-0000-000000000001" },
        { "GET", "/api/configuracion/tipos-documento" },
        { "POST", "/api/configuracion/tipos-documento" },
        { "PUT", "/api/configuracion/tipos-documento/00000000-0000-0000-0000-000000000001" },
        { "DELETE", "/api/configuracion/tipos-documento/00000000-0000-0000-0000-000000000001" },
        { "GET", "/api/configuracion/requisitos" },
        { "POST", "/api/configuracion/requisitos" },
        { "PUT", "/api/configuracion/requisitos/00000000-0000-0000-0000-000000000001" },
        { "DELETE", "/api/configuracion/requisitos/00000000-0000-0000-0000-000000000001" },
        { "PUT", "/api/personas/00000000-0000-0000-0000-000000000001/tipo-funcionario" },
    };

    [Theory]
    [MemberData(nameof(Rutas))]
    public async Task Solo_admin_y_superadmin_incluso_con_cabeceras_suplantadas(string metodo, string ruta)
    {
        async Task<HttpResponseMessage> Enviar() => await _cliente.SendAsync(new HttpRequestMessage(new HttpMethod(metodo), ruta)
        {
            Content = metodo is "POST" or "PUT" ? JsonContent.Create(new { }) : null,
        });
        _cliente.DefaultRequestHeaders.Add("X-Rol", "Superadmin");
        Assert.Equal(HttpStatusCode.Unauthorized, (await Enviar()).StatusCode);
        await AutenticarAsync(RolUsuario.Usuario);
        Assert.Equal(HttpStatusCode.Forbidden, (await Enviar()).StatusCode);
        await AutenticarAsync(RolUsuario.Supervisor);
        Assert.Equal(HttpStatusCode.Forbidden, (await Enviar()).StatusCode);
    }

    private async Task<TipoFuncionarioDto> CrearFuncionarioAsync(string codigo = "DOCENTE")
    {
        var respuesta = await _cliente.PostAsJsonAsync("/api/configuracion/tipos-funcionario", new GuardarTipoFuncionarioRequest(codigo, "Docente", true));
        Assert.Equal(HttpStatusCode.Created, respuesta.StatusCode);
        return (await respuesta.Content.ReadFromJsonAsync<TipoFuncionarioDto>())!;
    }

    private async Task<TipoDocumentoDto> CrearDocumentoAsync(string codigo = "CEDULA")
    {
        var respuesta = await _cliente.PostAsJsonAsync("/api/configuracion/tipos-documento", new GuardarTipoDocumentoRequest(codigo, "Documento ficticio"));
        Assert.Equal(HttpStatusCode.Created, respuesta.StatusCode);
        return (await respuesta.Content.ReadFromJsonAsync<TipoDocumentoDto>())!;
    }

    [Theory]
    [InlineData(RolUsuario.Admin)]
    [InlineData(RolUsuario.Superadmin)]
    public async Task CRUD_y_requisitos_para_todos_y_por_tipo_conservan_referencias(RolUsuario rol)
    {
        var personaId = await AutenticarAsync(rol);
        var funcionario = await CrearFuncionarioAsync();
        var documento = await CrearDocumentoAsync();
        var paraTodos = new GuardarRequisitoDocumentoRequest(documento.Id);
        var respuesta = await _cliente.PostAsJsonAsync("/api/configuracion/requisitos", paraTodos);
        Assert.Equal(HttpStatusCode.Created, respuesta.StatusCode);
        var requisito = (await respuesta.Content.ReadFromJsonAsync<RequisitoDocumentoDto>())!;
        Assert.Null(requisito.TipoFuncionarioId);
        Assert.True(requisito.EsObligatorio);
        Assert.Equal(HttpStatusCode.BadRequest, (await _cliente.PostAsJsonAsync("/api/configuracion/requisitos", paraTodos)).StatusCode);
        var porTipo = paraTodos with { TipoFuncionarioId = funcionario.Id };
        var respuestaTipo = await _cliente.PostAsJsonAsync("/api/configuracion/requisitos", porTipo);
        Assert.Equal(HttpStatusCode.Created, respuestaTipo.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await _cliente.PostAsJsonAsync("/api/configuracion/requisitos", porTipo)).StatusCode);
        Assert.Equal(2, (await _cliente.GetFromJsonAsync<List<RequisitoDocumentoDto>>("/api/configuracion/requisitos"))!.Count);

        var tipoActualizado = await _cliente.PutAsJsonAsync($"/api/configuracion/tipos-funcionario/{funcionario.Id}", new GuardarTipoFuncionarioRequest("docente", "Docente actualizado", true));
        Assert.Equal("Docente actualizado", (await tipoActualizado.Content.ReadFromJsonAsync<TipoFuncionarioDto>())!.Nombre);
        var docActualizado = await _cliente.PutAsJsonAsync($"/api/configuracion/tipos-documento/{documento.Id}", new GuardarTipoDocumentoRequest("CEDULA", "Documento actualizado", "Descripción ficticia", true, 3));
        var docDto = (await docActualizado.Content.ReadFromJsonAsync<TipoDocumentoDto>())!;
        Assert.Equal(3, docDto.Orden);
        Assert.True(docDto.TieneVencimiento);
        Assert.Equal(HttpStatusCode.OK, (await _cliente.PutAsJsonAsync($"/api/configuracion/requisitos/{requisito.Id}", paraTodos with { EsObligatorio = false })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _cliente.PutAsJsonAsync($"/api/personas/{personaId}/tipo-funcionario", new AsignarTipoFuncionarioRequest(funcionario.Id))).StatusCode);
        Assert.Equal(funcionario.Id, await TipoAsignadoAsync(personaId));
        Assert.Equal(HttpStatusCode.OK, (await _cliente.PutAsJsonAsync($"/api/personas/{personaId}/tipo-funcionario", new AsignarTipoFuncionarioRequest(null))).StatusCode);
        Assert.Null(await TipoAsignadoAsync(personaId));

        Assert.Equal(HttpStatusCode.NoContent, (await _cliente.DeleteAsync($"/api/configuracion/requisitos/{requisito.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await _cliente.DeleteAsync($"/api/configuracion/tipos-documento/{documento.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await _cliente.DeleteAsync($"/api/configuracion/tipos-funcionario/{funcionario.Id}")).StatusCode);
        Assert.False(Assert.Single((await _cliente.GetFromJsonAsync<List<TipoDocumentoDto>>("/api/configuracion/tipos-documento"))!).Activo);
        Assert.False(Assert.Single((await _cliente.GetFromJsonAsync<List<TipoFuncionarioDto>>("/api/configuracion/tipos-funcionario"))!).Activo);
        Assert.False((await _cliente.GetFromJsonAsync<List<RequisitoDocumentoDto>>("/api/configuracion/requisitos"))!.Single(r => r.Id == requisito.Id).Activo);
        Assert.Equal(HttpStatusCode.BadRequest, (await _cliente.PutAsJsonAsync($"/api/personas/{personaId}/tipo-funcionario", new AsignarTipoFuncionarioRequest(funcionario.Id))).StatusCode);
    }

    private async Task<Guid?> TipoAsignadoAsync(Guid personaId)
    {
        using var alcance = _fabrica.Services.CreateScope();
        var db = alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        return (await db.Personas.IgnoreQueryFilters().SingleAsync(p => p.Id == personaId)).TipoFuncionarioId;
    }

    [Theory]
    [InlineData(RolUsuario.Admin)]
    [InlineData(RolUsuario.Superadmin)]
    public async Task Dos_instituciones_reutilizan_codigos_sin_ver_ni_modificar_datos_ajenos(RolUsuario rol)
    {
        var personaAjena = await AutenticarAsync();
        var funcionarioAjeno = await CrearFuncionarioAsync();
        var documentoAjeno = await CrearDocumentoAsync();
        var respuesta = await _cliente.PostAsJsonAsync("/api/configuracion/requisitos", new GuardarRequisitoDocumentoRequest(documentoAjeno.Id));
        var requisitoAjeno = (await respuesta.Content.ReadFromJsonAsync<RequisitoDocumentoDto>())!;
        var personaPropia = await AutenticarAsync(rol, InstitucionId.Nuevo());
        Assert.Empty((await _cliente.GetFromJsonAsync<List<TipoDocumentoDto>>("/api/configuracion/tipos-documento"))!);
        Assert.Empty((await _cliente.GetFromJsonAsync<List<TipoFuncionarioDto>>("/api/configuracion/tipos-funcionario"))!);
        Assert.Empty((await _cliente.GetFromJsonAsync<List<RequisitoDocumentoDto>>("/api/configuracion/requisitos"))!);
        await CrearFuncionarioAsync();
        var propio = await CrearDocumentoAsync();
        Assert.Equal(HttpStatusCode.BadRequest, (await _cliente.PostAsJsonAsync("/api/configuracion/tipos-documento", new GuardarTipoDocumentoRequest(" cedula ", "Duplicado"))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _cliente.PostAsJsonAsync("/api/configuracion/requisitos", new GuardarRequisitoDocumentoRequest(documentoAjeno.Id))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _cliente.PostAsJsonAsync("/api/configuracion/requisitos", new GuardarRequisitoDocumentoRequest(propio.Id, funcionarioAjeno.Id))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _cliente.PutAsJsonAsync($"/api/personas/{personaPropia}/tipo-funcionario", new AsignarTipoFuncionarioRequest(funcionarioAjeno.Id))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _cliente.PutAsJsonAsync($"/api/personas/{personaAjena}/tipo-funcionario", new AsignarTipoFuncionarioRequest(null))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _cliente.PutAsJsonAsync($"/api/configuracion/tipos-funcionario/{funcionarioAjeno.Id}", new GuardarTipoFuncionarioRequest("DOCENTE", "Intento ajeno"))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _cliente.PutAsJsonAsync($"/api/configuracion/tipos-documento/{documentoAjeno.Id}", new GuardarTipoDocumentoRequest("CEDULA", "Intento ajeno"))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _cliente.PutAsJsonAsync($"/api/configuracion/requisitos/{requisitoAjeno.Id}", new GuardarRequisitoDocumentoRequest(propio.Id))).StatusCode);
        foreach (var (ruta, id) in new[] { ("tipos-funcionario", funcionarioAjeno.Id), ("tipos-documento", documentoAjeno.Id), ("requisitos", requisitoAjeno.Id) })
        {
            Assert.Equal(HttpStatusCode.NotFound, (await _cliente.DeleteAsync($"/api/configuracion/{ruta}/{id}")).StatusCode);
        }
        Assert.Null(await TipoAsignadoAsync(personaPropia));
    }

    [Fact]
    public async Task Admin_no_puede_suplantar_institucion_ni_superadmin_por_cabecera()
    {
        await AutenticarAsync();
        _cliente.DefaultRequestHeaders.Add("X-Institucion-Id", Guid.NewGuid().ToString());
        Assert.Equal(HttpStatusCode.Forbidden, (await _cliente.GetAsync("/api/configuracion/tipos-documento")).StatusCode);
        _cliente.DefaultRequestHeaders.Remove("X-Institucion-Id");
        _cliente.DefaultRequestHeaders.Add("X-Rol", "Superadmin");
        Assert.Equal(HttpStatusCode.Forbidden, (await _cliente.GetAsync("/api/configuracion/tipos-documento")).StatusCode);
    }

    [Theory]
    [InlineData(null, "Nombre ficticio")]
    [InlineData("", "Nombre ficticio")]
    [InlineData("   ", "Nombre ficticio")]
    [InlineData("CODIGO", null)]
    [InlineData("CODIGO", "   ")]
    public async Task Codigo_y_nombre_obligatorios(string? codigo, string? nombre)
    {
        await AutenticarAsync();
        Assert.Equal(HttpStatusCode.BadRequest, (await _cliente.PostAsJsonAsync("/api/configuracion/tipos-funcionario", new { codigo, nombre })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await _cliente.PostAsJsonAsync("/api/configuracion/tipos-documento", new { codigo, nombre })).StatusCode);
    }

    [Fact]
    public async Task Valida_longitudes_claves_estables_y_reactivacion()
    {
        await AutenticarAsync();
        Assert.Equal(HttpStatusCode.BadRequest, (await _cliente.PostAsJsonAsync("/api/configuracion/tipos-funcionario", new GuardarTipoFuncionarioRequest(new string('X', 51), "Tipo"))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await _cliente.PostAsJsonAsync("/api/configuracion/tipos-documento", new GuardarTipoDocumentoRequest("CODIGO", new string('X', 151)))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await _cliente.PostAsJsonAsync("/api/configuracion/tipos-documento", new GuardarTipoDocumentoRequest("CODIGO", "Tipo", new string('X', 501)))).StatusCode);
        var funcionario = await CrearFuncionarioAsync();
        var documento = await CrearDocumentoAsync();
        var peticion = new GuardarRequisitoDocumentoRequest(documento.Id);
        var respuesta = await _cliente.PostAsJsonAsync("/api/configuracion/requisitos", peticion);
        var requisito = (await respuesta.Content.ReadFromJsonAsync<RequisitoDocumentoDto>())!;
        Assert.Equal(HttpStatusCode.BadRequest, (await _cliente.PutAsJsonAsync($"/api/configuracion/tipos-funcionario/{funcionario.Id}", new GuardarTipoFuncionarioRequest("OTRO", "Tipo"))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await _cliente.PutAsJsonAsync($"/api/configuracion/tipos-documento/{documento.Id}", new GuardarTipoDocumentoRequest("OTRO", "Tipo"))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await _cliente.PutAsJsonAsync($"/api/configuracion/requisitos/{requisito.Id}", peticion with { TipoFuncionarioId = funcionario.Id })).StatusCode);
        await _cliente.DeleteAsync($"/api/configuracion/tipos-documento/{documento.Id}");
        Assert.Equal(HttpStatusCode.BadRequest, (await _cliente.PutAsJsonAsync($"/api/configuracion/requisitos/{requisito.Id}", peticion)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _cliente.PutAsJsonAsync($"/api/configuracion/tipos-documento/{documento.Id}", new GuardarTipoDocumentoRequest("CEDULA", "Documento reactivado"))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _cliente.PutAsJsonAsync($"/api/configuracion/requisitos/{requisito.Id}", peticion)).StatusCode);
    }


    [Fact]
    public async Task Cinco_documentos_aprobados_aplican_sin_tipo_de_funcionario()
    {
        await AutenticarAsync();
        await CrearFuncionarioAsync();
        string[] codigos = ["CEDULA", "PAPELETA_VOTACION", "ANTECEDENTES_PENALES", "DECLARACION_JURAMENTADA", "MECANIZADO_IESS"];
        foreach (var codigo in codigos)
        {
            var tipo = await CrearDocumentoAsync(codigo);
            Assert.Equal(HttpStatusCode.Created, (await _cliente.PostAsJsonAsync("/api/configuracion/requisitos", new GuardarRequisitoDocumentoRequest(tipo.Id))).StatusCode);
        }
        var persona = await AutenticarAsync(RolUsuario.Usuario);
        Assert.Null(await TipoAsignadoAsync(persona));
        var documentos = (await _cliente.GetFromJsonAsync<List<DocumentoRequeridoDto>>("/api/mis-datos/documentos"))!;
        Assert.Equal(codigos.Order(), documentos.Select(d => d.Codigo).Order());
        Assert.All(documentos, d => Assert.True(d.EsObligatorio));
    }

}
