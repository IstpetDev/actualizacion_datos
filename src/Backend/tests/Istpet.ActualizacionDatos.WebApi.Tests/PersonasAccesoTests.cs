namespace Istpet.ActualizacionDatos.WebApi.Tests;

using System.Net;
using System.Net.Http.Json;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

public sealed class PersonasAccesoTests : IDisposable
{
    private readonly SqliteConnection _conexion;
    private readonly WebApplicationFactory<Program> _fabrica;
    private readonly HttpClient _cliente;

    public PersonasAccesoTests()
    {
        _conexion = new SqliteConnection("DataSource=:memory:");
        _conexion.Open();

        _fabrica = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
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

        _cliente = _fabrica.CreateClient(new WebApplicationFactoryClientOptions
        {
            HandleCookies = true
        });
    }

    public void Dispose()
    {
        _cliente.Dispose();
        _fabrica.Dispose();
        _conexion.Dispose();
    }

    private async Task<(Institucion inst, Persona persona)> SembrarPersonaAsync(
        string documento,
        RolUsuario rol = RolUsuario.Usuario,
        bool accesoHabilitado = true,
        InstitucionId? instId = null)
    {
        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();

        var idInst = instId ?? new InstitucionId(Guid.Parse("a0000000-0000-0000-0000-000000000001"));
        var institucion = await db.Instituciones.IgnoreQueryFilters().FirstOrDefaultAsync(i => i.Id == idInst);
        if (institucion == null)
        {
            institucion = new Institucion(idInst, "Institución de Prueba", true);
            db.Instituciones.Add(institucion);
            await db.SaveChangesAsync();
        }

        var persona = new Persona(
            Guid.NewGuid(),
            idInst,
            documento,
            rol: rol,
            nombre: $"Nombre {documento}",
            correo: $"{documento}@ejemplo.test",
            accesoHabilitado: accesoHabilitado);

        db.Personas.Add(persona);
        await db.SaveChangesAsync();

        return (institucion, persona);
    }

    [Fact]
    public async Task Admin_puede_habilitar_y_deshabilitar_acceso_individual_con_auditoria()
    {
        var (inst, persona) = await SembrarPersonaAsync("1700000101", RolUsuario.Usuario, accesoHabilitado: true);

        // 1. Deshabilitar
        var requestDeshabilitar = new CambiarAccesoPersonasRequest(Habilitar: false, PersonaIds: [persona.Id]);
        var reqMsg = new HttpRequestMessage(HttpMethod.Post, "/api/personas/acceso")
        {
            Content = JsonContent.Create(requestDeshabilitar)
        };
        reqMsg.Headers.Add("X-Institucion-Id", inst.Id.Valor.ToString());
        reqMsg.Headers.Add("X-Actor", "1700000999");
        reqMsg.Headers.Add("X-Rol", "Admin");

        var responseDeshabilitar = await _cliente.SendAsync(reqMsg);
        Assert.Equal(HttpStatusCode.OK, responseDeshabilitar.StatusCode);

        var resultadoDesh = await responseDeshabilitar.Content.ReadFromJsonAsync<ResultadoCambioAccesoDto>();
        Assert.NotNull(resultadoDesh);
        Assert.Equal(1, resultadoDesh.Cambiadas);
        Assert.Equal(0, resultadoDesh.YaEnEstado);

        // Verificar en BD
        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            var pBd = await db.Personas.IgnoreQueryFilters().FirstAsync(p => p.Id == persona.Id);
            Assert.False(pBd.AccesoHabilitado);

            var aud = await db.Auditorias.FirstOrDefaultAsync(a => a.Accion == "DESHABILITAR_ACCESO");
            Assert.NotNull(aud);
            Assert.Equal("1700000999", aud.Actor);
            Assert.Contains("Deshabilitado el acceso a 1 persona", aud.Detalle);
        }

        // 2. Habilitar de nuevo
        var requestHabilitar = new CambiarAccesoPersonasRequest(Habilitar: true, PersonaIds: [persona.Id]);
        var reqMsgHab = new HttpRequestMessage(HttpMethod.Post, "/api/personas/acceso")
        {
            Content = JsonContent.Create(requestHabilitar)
        };
        reqMsgHab.Headers.Add("X-Institucion-Id", inst.Id.Valor.ToString());
        reqMsgHab.Headers.Add("X-Actor", "1700000999");
        reqMsgHab.Headers.Add("X-Rol", "Admin");

        var responseHabilitar = await _cliente.SendAsync(reqMsgHab);
        Assert.Equal(HttpStatusCode.OK, responseHabilitar.StatusCode);

        var resultadoHab = await responseHabilitar.Content.ReadFromJsonAsync<ResultadoCambioAccesoDto>();
        Assert.NotNull(resultadoHab);
        Assert.Equal(1, resultadoHab.Cambiadas);
        Assert.Equal(0, resultadoHab.YaEnEstado);

        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            var pBd = await db.Personas.IgnoreQueryFilters().FirstAsync(p => p.Id == persona.Id);
            Assert.True(pBd.AccesoHabilitado);

            var audHab = await db.Auditorias.FirstOrDefaultAsync(a => a.Accion == "HABILITAR_ACCESO");
            Assert.NotNull(audHab);
        }
    }

    [Fact]
    public async Task Operacion_sobre_personas_que_ya_estan_en_ese_estado_se_cuenta_en_yaEnEstado()
    {
        var (inst, persona) = await SembrarPersonaAsync("1700000202", RolUsuario.Usuario, accesoHabilitado: true);

        var request = new CambiarAccesoPersonasRequest(Habilitar: true, PersonaIds: [persona.Id]);
        var reqMsg = new HttpRequestMessage(HttpMethod.Post, "/api/personas/acceso")
        {
            Content = JsonContent.Create(request)
        };
        reqMsg.Headers.Add("X-Institucion-Id", inst.Id.Valor.ToString());
        reqMsg.Headers.Add("X-Actor", "1700000999");
        reqMsg.Headers.Add("X-Rol", "Admin");

        var response = await _cliente.SendAsync(reqMsg);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var resultado = await response.Content.ReadFromJsonAsync<ResultadoCambioAccesoDto>();
        Assert.NotNull(resultado);
        Assert.Equal(0, resultado.Cambiadas);
        Assert.Equal(1, resultado.YaEnEstado);
    }

    [Fact]
    public async Task No_puede_deshabilitar_a_administradores_ni_supervisores()
    {
        var (inst, admin) = await SembrarPersonaAsync("1700000301", RolUsuario.Admin, accesoHabilitado: true);
        var (_, supervisor) = await SembrarPersonaAsync("1700000302", RolUsuario.Supervisor, accesoHabilitado: true);
        var (_, usuario) = await SembrarPersonaAsync("1700000303", RolUsuario.Usuario, accesoHabilitado: true);

        var request = new CambiarAccesoPersonasRequest(
            Habilitar: false,
            PersonaIds: [admin.Id, supervisor.Id, usuario.Id]);

        var reqMsg = new HttpRequestMessage(HttpMethod.Post, "/api/personas/acceso")
        {
            Content = JsonContent.Create(request)
        };
        reqMsg.Headers.Add("X-Institucion-Id", inst.Id.Valor.ToString());
        reqMsg.Headers.Add("X-Actor", "1700000301"); // El mismo admin
        reqMsg.Headers.Add("X-Rol", "Admin");

        var response = await _cliente.SendAsync(reqMsg);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var resultado = await response.Content.ReadFromJsonAsync<ResultadoCambioAccesoDto>();
        Assert.NotNull(resultado);
        // Solo el usuario debió ser cambiado
        Assert.Equal(1, resultado.Cambiadas);
        Assert.Equal(0, resultado.YaEnEstado);

        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();

        var adminBd = await db.Personas.IgnoreQueryFilters().FirstAsync(p => p.Id == admin.Id);
        var supervisorBd = await db.Personas.IgnoreQueryFilters().FirstAsync(p => p.Id == supervisor.Id);
        var usuarioBd = await db.Personas.IgnoreQueryFilters().FirstAsync(p => p.Id == usuario.Id);

        Assert.True(adminBd.AccesoHabilitado, "El admin no debe poder ser deshabilitado.");
        Assert.True(supervisorBd.AccesoHabilitado, "El supervisor no debe poder ser deshabilitado.");
        Assert.False(usuarioBd.AccesoHabilitado, "El usuario común sí debe ser deshabilitado.");
    }

    [Fact]
    public async Task Operacion_masiva_todas_solo_afecta_a_usuarios_de_la_misma_institucion()
    {
        var inst1 = new InstitucionId(Guid.Parse("a0000000-0000-0000-0000-000000000001"));
        var inst2 = new InstitucionId(Guid.Parse("a0000000-0000-0000-0000-000000000002"));

        var (_, u1) = await SembrarPersonaAsync("1700000401", RolUsuario.Usuario, accesoHabilitado: true, instId: inst1);
        var (_, u2) = await SembrarPersonaAsync("1700000402", RolUsuario.Usuario, accesoHabilitado: true, instId: inst1);
        var (_, uOtraInst) = await SembrarPersonaAsync("1700000403", RolUsuario.Usuario, accesoHabilitado: true, instId: inst2);

        // Admin de inst1 deshabilita todas
        var request = new CambiarAccesoPersonasRequest(Habilitar: false, Todas: true);
        var reqMsg = new HttpRequestMessage(HttpMethod.Post, "/api/personas/acceso")
        {
            Content = JsonContent.Create(request)
        };
        reqMsg.Headers.Add("X-Institucion-Id", inst1.Valor.ToString());
        reqMsg.Headers.Add("X-Actor", "1700000999");
        reqMsg.Headers.Add("X-Rol", "Admin");

        var response = await _cliente.SendAsync(reqMsg);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var resultado = await response.Content.ReadFromJsonAsync<ResultadoCambioAccesoDto>();
        Assert.NotNull(resultado);
        Assert.Equal(2, resultado.Cambiadas);

        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();

        var p1 = await db.Personas.IgnoreQueryFilters().FirstAsync(p => p.Id == u1.Id);
        var p2 = await db.Personas.IgnoreQueryFilters().FirstAsync(p => p.Id == u2.Id);
        var pOtra = await db.Personas.IgnoreQueryFilters().FirstAsync(p => p.Id == uOtraInst.Id);

        Assert.False(p1.AccesoHabilitado);
        Assert.False(p2.AccesoHabilitado);
        Assert.True(pOtra.AccesoHabilitado, "Persona de otra institución no debe ser alterada.");
    }

    [Fact]
    public async Task Usuario_no_admin_recibe_403_prohibido()
    {
        var (inst, persona) = await SembrarPersonaAsync("1700000501", RolUsuario.Usuario, accesoHabilitado: true);

        var request = new CambiarAccesoPersonasRequest(Habilitar: false, PersonaIds: [persona.Id]);
        var reqMsg = new HttpRequestMessage(HttpMethod.Post, "/api/personas/acceso")
        {
            Content = JsonContent.Create(request)
        };
        reqMsg.Headers.Add("X-Institucion-Id", inst.Id.Valor.ToString());
        reqMsg.Headers.Add("X-Actor", "1700000501");
        reqMsg.Headers.Add("X-Rol", "Usuario");

        var response = await _cliente.SendAsync(reqMsg);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Sesion_abierta_se_invalida_cuando_el_usuario_es_deshabilitado()
    {
        // 1. Sembrar usuario con contraseña igual al documento
        var (inst, persona) = await SembrarPersonaAsync("1700000601", RolUsuario.Usuario, accesoHabilitado: true);

        // 2. Iniciar sesión con cookie real
        var clienteUsuario = _fabrica.CreateClient(new WebApplicationFactoryClientOptions
        {
            HandleCookies = true
        });

        var loginResp = await clienteUsuario.PostAsJsonAsync("/api/auth/login", new LoginRequest("1700000601", "1700000601"));
        Assert.Equal(HttpStatusCode.OK, loginResp.StatusCode);

        // 3. Verificar que sesion actual responde 200
        var sesionResp = await clienteUsuario.GetAsync("/api/auth/sesion");
        Assert.Equal(HttpStatusCode.OK, sesionResp.StatusCode);

        // 4. Admin deshabilita al usuario
        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            var pBd = await db.Personas.IgnoreQueryFilters().FirstAsync(p => p.Id == persona.Id);
            pBd.DeshabilitarAcceso();
            await db.SaveChangesAsync();
        }

        // 5. El usuario intenta hacer una nueva petición autenticada: OnValidatePrincipal y ObtenerSesionActual rechazan
        var sesionPostDesh = await clienteUsuario.GetAsync("/api/auth/sesion");
        Assert.Equal(HttpStatusCode.Unauthorized, sesionPostDesh.StatusCode);
    }
}
