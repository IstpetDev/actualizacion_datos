namespace Istpet.ActualizacionDatos.WebApi.Tests;

using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

// Identidad, cookies, políticas de rol y protección de datos reales; sin autenticación por cabeceras de prueba.
public sealed class PersonalInstitucionalTests : IDisposable
{
    private const string ClaveFicticia = "ClaveFicticiaRoles129!";
    private readonly SqliteConnection _conexion = new("DataSource=:memory:");
    private readonly WebApplicationFactory<Program> _fabrica;
    private readonly InstitucionId _a = InstitucionId.Nuevo();
    private readonly InstitucionId _b = InstitucionId.Nuevo();
    private int _numero;

    public PersonalInstitucionalTests()
    {
        _conexion.Open();
        _fabrica = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Development");
            builder.ConfigureServices(servicios =>
            {
                servicios.Remove(servicios.Single(d => d.ServiceType == typeof(DbContextOptions<AplicacionDbContext>)));
                servicios.AddDbContext<AplicacionDbContext>(opciones => opciones.UseSqlite(_conexion).UseSnakeCaseNamingConvention());
                using var proveedor = servicios.BuildServiceProvider();
                using var scope = proveedor.CreateScope();
                scope.ServiceProvider.GetRequiredService<AplicacionDbContext>().Database.EnsureCreated();
            });
        });
    }

    public void Dispose() { _fabrica.Dispose(); _conexion.Dispose(); }

    private async Task<Persona> CuentaAsync(RolUsuario rol, InstitucionId? institucion = null, string? documento = null)
    {
        institucion ??= _a;
        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        if (!await db.Instituciones.AnyAsync(i => i.Id == institucion))
        {
            db.Instituciones.Add(new Institucion(institucion, "Institución Ficticia"));
            db.AvisosProteccionDatos.Add(new AvisoProteccionDatos(institucion, "ficticia-129", "Aviso Ficticio", "Responsable Ficticio",
                "Contenido ficticio exclusivo de pruebas", "Aceptación ficticia", "https://institucion.ejemplo.test/aviso",
                "Autorización ficticia", [RolUsuario.Usuario, RolUsuario.Supervisor, RolUsuario.Admin], DateTime.UtcNow.AddDays(-1)));
            await db.SaveChangesAsync();
        }
        var persona = new Persona(Guid.NewGuid(), institucion, documento ?? (++_numero).ToString("D10", CultureInfo.InvariantCulture),
            rol, "Persona Ficticia", "persona@ejemplo.test", accesoHabilitado: true, correoVerificado: true);
        persona.EstablecerPasswordHash(new PasswordHasher<Persona>().HashPassword(persona, ClaveFicticia), debeCambiarContrasena: false);
        db.Personas.Add(persona);
        var aviso = await db.AvisosProteccionDatos.IgnoreQueryFilters().SingleAsync(v => v.InstitucionId == institucion);
        db.AceptacionesProteccionDatos.Add(new AceptacionProteccionDatos(institucion, persona.Id, aviso.Id, DateTime.UtcNow));
        await db.SaveChangesAsync();
        return persona;
    }

    private HttpClient Cliente() => _fabrica.CreateClient(new WebApplicationFactoryClientOptions
    {
        BaseAddress = new Uri("https://localhost"),
        HandleCookies = true,
        AllowAutoRedirect = false
    });

    private async Task<HttpClient> SesionAsync(Persona persona)
    {
        var cliente = Cliente();
        var login = await cliente.PostAsJsonAsync("/api/auth/login", new LoginRequest(persona.Documento, ClaveFicticia, persona.InstitucionId.Valor));
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        return cliente;
    }

    [Fact]
    public async Task Superadmin_crea_ambos_roles_promueve_por_endpoint_antiguo_y_lista_solo_la_institucion()
    {
        var superadmin = await CuentaAsync(RolUsuario.Superadmin);
        var existente = await CuentaAsync(RolUsuario.Usuario, _b);
        using var cliente = await SesionAsync(superadmin);
        var ruta = $"/api/instituciones/{_b.Valor}/personal";
        foreach (var (documento, rol) in new[] { ("0000000101", "Admin"), ("0000000102", "Supervisor") })
        {
            var respuesta = await cliente.PostAsJsonAsync(ruta, new AsignarPersonalInstitucionalRequest(documento, rol, "Cuenta Ficticia", "nueva@ejemplo.test"));
            Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
            var persona = (await respuesta.Content.ReadFromJsonAsync<PersonaDto>())!;
            Assert.Equal(rol, persona.Rol);
            Assert.Equal(_b.Valor, persona.InstitucionId);
            Assert.True(persona.AccesoHabilitado);
        }
        var antigua = await cliente.PostAsJsonAsync($"/api/instituciones/{_b.Valor}/admins",
            new AsignarAdminsRequest([new AdminInicialRequest(existente.Documento)]));
        Assert.Equal(HttpStatusCode.OK, antigua.StatusCode);
        Assert.Equal("Admin", Assert.Single((await antigua.Content.ReadFromJsonAsync<List<PersonaDto>>())!).Rol);
        var listado = (await cliente.GetFromJsonAsync<List<PersonaDto>>(ruta))!;
        Assert.Equal(3, listado.Count);
        Assert.All(listado, p => Assert.Equal(_b.Valor, p.InstitucionId));
        Assert.Contains(listado, p => p.Id == existente.Id && p.Rol == "Admin");
        var cambio = await cliente.PostAsJsonAsync(ruta, new AsignarPersonalInstitucionalRequest(existente.Documento, "Supervisor"));
        Assert.Equal("Supervisor", (await cambio.Content.ReadFromJsonAsync<PersonaDto>())!.Rol);
        Assert.Equal(HttpStatusCode.NotFound, (await cliente.GetAsync($"/api/instituciones/{Guid.NewGuid()}/personal")).StatusCode);

        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        var nuevaCuenta = await db.Personas.IgnoreQueryFilters().SingleAsync(p => p.InstitucionId == _b && p.Documento == "0000000101");
        Assert.True(nuevaCuenta.DebeCambiarContrasena);
        Assert.Null(nuevaCuenta.PasswordHash);
    }

    [Fact]
    public async Task Admin_crea_y_promueve_supervisores_con_auditoria_y_cookie_de_usuario_recibe_el_rol_nuevo()
    {
        var admin = await CuentaAsync(RolUsuario.Admin);
        var usuario = await CuentaAsync(RolUsuario.Usuario);
        var homonimo = await CuentaAsync(RolUsuario.Usuario, _b, usuario.Documento);
        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            var ficha = new FichaPersonal(_a, usuario.Id);
            ficha.Actualizar(new DatosFichaPersonal(CallePrincipal: "Domicilio Ficticio"));
            db.FichasPersonales.Add(ficha);
            await db.SaveChangesAsync();
        }
        using var clienteUsuario = await SesionAsync(usuario);
        using var cliente = await SesionAsync(admin);
        var ruta = "/api/personas/supervisores";
        Assert.Equal(HttpStatusCode.OK, (await cliente.PostAsJsonAsync(ruta,
            new AsignarPersonalInstitucionalRequest("0000000201", "Supervisor", "Supervisor Ficticio"))).StatusCode);
        var promovida = await cliente.PostAsJsonAsync(ruta, new AsignarPersonalInstitucionalRequest(usuario.Documento, "Supervisor", "Nombre que no debe reemplazar", "otro@ejemplo.test"));
        Assert.Equal(HttpStatusCode.OK, promovida.StatusCode);
        Assert.Equal(usuario.Id, (await promovida.Content.ReadFromJsonAsync<PersonaDto>())!.Id);
        Assert.Equal(2, (await cliente.GetFromJsonAsync<List<PersonaDto>>(ruta))!.Count);
        Assert.Equal("Supervisor", (await clienteUsuario.GetFromJsonAsync<SesionUsuarioDto>("/api/auth/sesion"))!.Rol);
        Assert.Equal(HttpStatusCode.Forbidden, (await clienteUsuario.GetAsync(ruta)).StatusCode);

        using var verificar = _fabrica.Services.CreateScope();
        var consulta = verificar.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        var guardada = await consulta.Personas.IgnoreQueryFilters().SingleAsync(p => p.Id == usuario.Id);
        Assert.Equal(usuario.Nombre, guardada.Nombre);
        Assert.Equal(usuario.Correo, guardada.Correo);
        Assert.Equal(usuario.PasswordHash, guardada.PasswordHash);
        Assert.True(guardada.CorreoVerificado);
        Assert.Equal(RolUsuario.Usuario, (await consulta.Personas.IgnoreQueryFilters().SingleAsync(p => p.Id == homonimo.Id)).Rol);
        Assert.Equal("Domicilio Ficticio", (await consulta.FichasPersonales.IgnoreQueryFilters().SingleAsync()).CallePrincipal);
        Assert.Contains(await consulta.Auditorias.ToListAsync(), a => a.Accion == "ASIGNAR_PERSONAL_INSTITUCIONAL" && a.Actor == admin.Documento && a.InstitucionId == _a && a.Detalle!.Contains(usuario.Id.ToString(), StringComparison.Ordinal));
        Assert.Contains(await consulta.Auditorias.ToListAsync(), a => a.Accion == "LISTAR_PERSONAL_INSTITUCIONAL" && a.InstitucionId == _a);
    }

    [Theory]
    [InlineData(RolUsuario.Usuario)]
    [InlineData(RolUsuario.Supervisor)]
    public async Task Roles_sin_permiso_reciben_403_en_todas_las_operaciones(RolUsuario rol)
    {
        using var cliente = await SesionAsync(await CuentaAsync(rol));
        foreach (var ruta in new[] { "/api/personas/supervisores", $"/api/instituciones/{_a.Valor}/personal", $"/api/instituciones/{_a.Valor}/admins" })
        {
            Assert.Equal(HttpStatusCode.Forbidden, (await cliente.PostAsJsonAsync(ruta, new AsignarPersonalInstitucionalRequest("0000000301", "Admin"))).StatusCode);
        }
        foreach (var ruta in new[] { "/api/personas/supervisores", $"/api/instituciones/{_a.Valor}/personal", "/api/instituciones" })
            Assert.Equal(HttpStatusCode.Forbidden, (await cliente.GetAsync(ruta)).StatusCode);
    }

    [Fact]
    public async Task Anonimo_no_puede_listar_ni_asignar()
    {
        using var cliente = Cliente();
        foreach (var ruta in new[] { "/api/personas/supervisores", $"/api/instituciones/{_a.Valor}/personal" })
        {
            Assert.Equal(HttpStatusCode.Unauthorized, (await cliente.GetAsync(ruta)).StatusCode);
            Assert.Equal(HttpStatusCode.Unauthorized, (await cliente.PostAsJsonAsync(ruta, new AsignarPersonalInstitucionalRequest("0000000301", "Supervisor"))).StatusCode);
        }
    }

    [Fact]
    public async Task Admin_no_eleva_privilegios_ni_modifica_admins_ni_cambia_tenant_por_ruta_cabecera_o_cuerpo()
    {
        var admin = await CuentaAsync(RolUsuario.Admin);
        var otra = await CuentaAsync(RolUsuario.Usuario, _b);
        using var cliente = await SesionAsync(admin);
        var ruta = "/api/personas/supervisores";
        Assert.Equal(HttpStatusCode.Forbidden, (await cliente.PostAsJsonAsync(ruta, new AsignarPersonalInstitucionalRequest("0000000401", "Admin"))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await cliente.PostAsJsonAsync(ruta, new AsignarPersonalInstitucionalRequest(admin.Documento, "Supervisor"))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await cliente.PostAsJsonAsync($"/api/instituciones/{_b.Valor}/personal", new AsignarPersonalInstitucionalRequest(otra.Documento, "Supervisor"))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await cliente.PostAsJsonAsync($"/api/instituciones/{_a.Valor}/admins", new AsignarAdminsRequest([new AdminInicialRequest("0000000401")]))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await cliente.PostAsJsonAsync("/api/instituciones", new CrearInstitucionRequest("No crear"))).StatusCode);
        using var cabecera = new HttpRequestMessage(HttpMethod.Post, ruta) { Content = JsonContent.Create(new AsignarPersonalInstitucionalRequest(otra.Documento, "Supervisor")) };
        cabecera.Headers.Add("X-Institucion-Id", _b.Valor.ToString());
        Assert.Equal(HttpStatusCode.Forbidden, (await cliente.SendAsync(cabecera)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await cliente.PostAsJsonAsync(ruta, new { documento = "0000000401", rol = "Supervisor", institucionId = _b.Valor })).StatusCode);
        using var rolFalso = new HttpRequestMessage(HttpMethod.Get, $"/api/instituciones/{_b.Valor}/personal");
        rolFalso.Headers.Add("X-Rol", "Superadmin");
        Assert.Equal(HttpStatusCode.Forbidden, (await cliente.SendAsync(rolFalso)).StatusCode);
        Assert.Empty((await cliente.GetFromJsonAsync<List<PersonaDto>>(ruta))!);
    }

    [Theory]
    [InlineData("0000000501", "Superadmin", null, null)]
    [InlineData("0000000501", "Usuario", null, null)]
    [InlineData("0000000501", "3", null, null)]
    [InlineData("documento", "Supervisor", null, null)]
    [InlineData("", "Supervisor", null, null)]
    [InlineData("0000000501", "Supervisor", "Nombre\ninválido", null)]
    [InlineData("0000000501", "Supervisor", null, "no-es-correo")]
    public async Task Validacion_rechaza_sin_crear_cuentas(string documento, string rol, string? nombre, string? correo)
    {
        using var cliente = await SesionAsync(await CuentaAsync(RolUsuario.Superadmin));
        var ruta = $"/api/instituciones/{_a.Valor}/personal";
        Assert.Equal(HttpStatusCode.BadRequest, (await cliente.PostAsJsonAsync(ruta, new AsignarPersonalInstitucionalRequest(documento, rol, nombre, correo))).StatusCode);
        Assert.Empty((await cliente.GetFromJsonAsync<List<PersonaDto>>(ruta))!);
    }

    [Fact]
    public async Task Superadmin_no_modifica_otra_cuenta_superadmin()
    {
        var actor = await CuentaAsync(RolUsuario.Superadmin);
        var destino = await CuentaAsync(RolUsuario.Superadmin);
        using var cliente = await SesionAsync(actor);
        Assert.Equal(HttpStatusCode.Forbidden, (await cliente.PostAsJsonAsync($"/api/instituciones/{_a.Valor}/personal",
            new AsignarPersonalInstitucionalRequest(destino.Documento, "Admin"))).StatusCode);
    }
}
