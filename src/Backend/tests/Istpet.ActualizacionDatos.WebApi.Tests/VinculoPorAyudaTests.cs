namespace Istpet.ActualizacionDatos.WebApi.Tests;

using System.Net;
using System.Net.Http.Json;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

/// <summary>
/// Pruebas para T-05 (Issue #92, RF-CAP-018): Vínculo por ayuda de capacitaciones obligatorias por supervisor o admin.
/// </summary>
public sealed class VinculoPorAyudaTests : IDisposable
{
    private readonly SqliteConnection _conexion;
    private readonly WebApplicationFactory<Program> _fabrica;
    private readonly HttpClient _cliente;

    public VinculoPorAyudaTests()
    {
        _conexion = new SqliteConnection("DataSource=:memory:");
        _conexion.Open();

        _fabrica = new FabricaPruebas().WithWebHostBuilder(builder =>
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

    private async Task<(Guid InstitucionId, Persona Persona, Capacitacion Capacitacion, CapacitacionObligatoria Obligatoria)> InicializarEscenarioAsync()
    {
        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();

        var institucionId = Guid.NewGuid();
        var inst = new Institucion(new InstitucionId(institucionId), "Institución de Prueba Vínculo");
        db.Instituciones.Add(inst);

        var persona = new Persona(
            Guid.NewGuid(),
            new InstitucionId(institucionId),
            "1700000010",
            RolUsuario.Usuario,
            "Docente Ficticio Uno",
            "docente1@prueba.test",
            accesoHabilitado: true);
        persona.AceptarTratamientoDatos(DateTime.UtcNow.AddHours(-1));
        persona.EnviarARevision(DateTime.UtcNow.AddMinutes(-30));
        db.Personas.Add(persona);

        var obligatoria = new CapacitacionObligatoria(
            Guid.NewGuid(),
            new InstitucionId(institucionId),
            "Didáctica Activa Ficticia",
            "ISTPET",
            horasEsperadas: 40,
            fechaRealizacion: new DateOnly(2026, 3, 1),
            tipoFuncionarioId: null,
            activo: true,
            orden: 1);
        db.CapacitacionesObligatorias.Add(obligatoria);

        var capacitacion = new Capacitacion(
            Guid.NewGuid(),
            new InstitucionId(institucionId),
            persona.Id,
            new DatosCapacitacion(
                NombreEvento: "Curso de Didáctica en Línea",
                InstitucionOrganizadora: "Plataforma Educativa Ficticia",
                NumeroHoras: 40,
                FechaInicio: new DateOnly(2025, 5, 1),
                FechaFin: new DateOnly(2025, 5, 20)));
        db.Capacitaciones.Add(capacitacion);

        await db.SaveChangesAsync();

        return (institucionId, persona, capacitacion, obligatoria);
    }

    [Fact]
    public async Task Supervisor_y_admin_pueden_vincular_por_ayuda_capacitacion_existente_a_obligatoria_pendiente()
    {
        var (instId, persona, cap, obligatoria) = await InicializarEscenarioAsync();

        var request = new VincularCapacitacionObligatoriaRequest(cap.Id);
        var req = new HttpRequestMessage(HttpMethod.Post, $"/api/revision/{persona.Documento}/capacitaciones-obligatorias/{obligatoria.Id}/vincular")
        {
            Content = JsonContent.Create(request)
        };
        req.Headers.Add("X-Institucion-Id", instId.ToString());
        req.Headers.Add("X-Actor", "supervisor_01");
        req.Headers.Add("X-Rol", "Supervisor");

        var res = await _cliente.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        // La persona ahora ve la obligatoria como 'cargada'
        var reqUsuario = new HttpRequestMessage(HttpMethod.Get, "/api/mis-datos/capacitaciones-obligatorias");
        reqUsuario.Headers.Add("X-Institucion-Id", instId.ToString());
        reqUsuario.Headers.Add("X-Actor", persona.Documento);
        reqUsuario.Headers.Add("X-Rol", "Usuario");

        var resUsuario = await _cliente.SendAsync(reqUsuario);
        Assert.Equal(HttpStatusCode.OK, resUsuario.StatusCode);
        var obligatorias = await resUsuario.Content.ReadFromJsonAsync<List<EstadoCapacitacionObligatoriaPersonaDto>>();
        Assert.NotNull(obligatorias);
        var item = Assert.Single(obligatorias);
        Assert.Equal("cargada", item.Estado);
        Assert.Equal(cap.Id, item.CapacitacionId);
    }

    [Fact]
    public async Task Vinculo_por_ayuda_solo_vincula_y_no_modifica_otros_datos()
    {
        var (instId, persona, cap, obligatoria) = await InicializarEscenarioAsync();

        var request = new VincularCapacitacionObligatoriaRequest(cap.Id);
        var req = new HttpRequestMessage(HttpMethod.Post, $"/api/revision/{persona.Documento}/capacitaciones-obligatorias/{obligatoria.Id}/vincular")
        {
            Content = JsonContent.Create(request)
        };
        req.Headers.Add("X-Institucion-Id", instId.ToString());
        req.Headers.Add("X-Actor", "admin_01");
        req.Headers.Add("X-Rol", "Admin");

        var res = await _cliente.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        var capDb = await db.Capacitaciones.IgnoreQueryFilters().FirstAsync(c => c.Id == cap.Id);

        Assert.Equal(obligatoria.Id, capDb.CapacitacionObligatoriaId);
        Assert.Equal("Curso de Didáctica en Línea", capDb.NombreEvento);
        Assert.Equal("Plataforma Educativa Ficticia", capDb.InstitucionOrganizadora);
        Assert.Equal(40, capDb.NumeroHoras);
    }

    [Fact]
    public async Task Vinculo_por_ayuda_con_actualizacion_aprobada_responde_409()
    {
        var (instId, persona, cap, obligatoria) = await InicializarEscenarioAsync();

        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            var p = await db.Personas.IgnoreQueryFilters().FirstAsync(x => x.Id == persona.Id);
            p.AprobarActualizacion(DateTime.UtcNow);
            await db.SaveChangesAsync();
        }

        var request = new VincularCapacitacionObligatoriaRequest(cap.Id);
        var req = new HttpRequestMessage(HttpMethod.Post, $"/api/revision/{persona.Documento}/capacitaciones-obligatorias/{obligatoria.Id}/vincular")
        {
            Content = JsonContent.Create(request)
        };
        req.Headers.Add("X-Institucion-Id", instId.ToString());
        req.Headers.Add("X-Actor", "supervisor_01");
        req.Headers.Add("X-Rol", "Supervisor");

        var res = await _cliente.SendAsync(req);
        Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);
    }

    [Fact]
    public async Task Vinculo_por_ayuda_con_capacitacion_de_otra_persona_o_ya_vinculada_responde_409()
    {
        var (instId, persona, _, obligatoria) = await InicializarEscenarioAsync();

        Guid capOtraPersonaId;
        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            var otraPersona = new Persona(
                Guid.NewGuid(),
                new InstitucionId(instId),
                "1700000099",
                RolUsuario.Usuario,
                "Docente Ficticio Dos",
                "docente2@prueba.test",
                accesoHabilitado: true);
            db.Personas.Add(otraPersona);

            var capOtra = new Capacitacion(
                Guid.NewGuid(),
                new InstitucionId(instId),
                otraPersona.Id,
                new DatosCapacitacion("Curso Ajeno Ficticio", "Org Ficticia"));
            db.Capacitaciones.Add(capOtra);
            await db.SaveChangesAsync();
            capOtraPersonaId = capOtra.Id;
        }

        var request = new VincularCapacitacionObligatoriaRequest(capOtraPersonaId);
        var req = new HttpRequestMessage(HttpMethod.Post, $"/api/revision/{persona.Documento}/capacitaciones-obligatorias/{obligatoria.Id}/vincular")
        {
            Content = JsonContent.Create(request)
        };
        req.Headers.Add("X-Institucion-Id", instId.ToString());
        req.Headers.Add("X-Actor", "supervisor_01");
        req.Headers.Add("X-Rol", "Supervisor");

        var res = await _cliente.SendAsync(req);
        Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);
    }

    [Fact]
    public async Task Vinculo_por_ayuda_con_persona_o_capacitacion_de_otra_institucion_responde_404()
    {
        var (_, persona, cap, obligatoria) = await InicializarEscenarioAsync();
        var otraInstitucionId = Guid.NewGuid();

        var request = new VincularCapacitacionObligatoriaRequest(cap.Id);
        var req = new HttpRequestMessage(HttpMethod.Post, $"/api/revision/{persona.Documento}/capacitaciones-obligatorias/{obligatoria.Id}/vincular")
        {
            Content = JsonContent.Create(request)
        };
        req.Headers.Add("X-Institucion-Id", otraInstitucionId.ToString());
        req.Headers.Add("X-Actor", "supervisor_ext");
        req.Headers.Add("X-Rol", "Supervisor");

        var res = await _cliente.SendAsync(req);
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task Usuario_no_puede_ejecutar_vinculo_por_ayuda_responde_403()
    {
        var (instId, persona, cap, obligatoria) = await InicializarEscenarioAsync();

        var request = new VincularCapacitacionObligatoriaRequest(cap.Id);
        var req = new HttpRequestMessage(HttpMethod.Post, $"/api/revision/{persona.Documento}/capacitaciones-obligatorias/{obligatoria.Id}/vincular")
        {
            Content = JsonContent.Create(request)
        };
        req.Headers.Add("X-Institucion-Id", instId.ToString());
        req.Headers.Add("X-Actor", persona.Documento);
        req.Headers.Add("X-Rol", "Usuario");

        var res = await _cliente.SendAsync(req);
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Fact]
    public async Task Vinculo_por_ayuda_registra_auditoria_sin_datos_personales_sensibles()
    {
        var (instId, persona, cap, obligatoria) = await InicializarEscenarioAsync();

        var request = new VincularCapacitacionObligatoriaRequest(cap.Id);
        var req = new HttpRequestMessage(HttpMethod.Post, $"/api/revision/{persona.Documento}/capacitaciones-obligatorias/{obligatoria.Id}/vincular")
        {
            Content = JsonContent.Create(request)
        };
        req.Headers.Add("X-Institucion-Id", instId.ToString());
        req.Headers.Add("X-Actor", "supervisor_audit");
        req.Headers.Add("X-Rol", "Supervisor");

        var res = await _cliente.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        var auditoria = await db.Auditorias.IgnoreQueryFilters()
            .FirstOrDefaultAsync(a => a.Accion == "VinculoPorAyudaCapacitacion" && a.Actor == "supervisor_audit");

        Assert.NotNull(auditoria);
        Assert.Equal(persona.InstitucionId, auditoria.InstitucionId);
        Assert.False(string.IsNullOrWhiteSpace(auditoria.Detalle));
        // No contiene contraseñas ni datos sensibles
        Assert.DoesNotContain("Clave", auditoria.Detalle, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Password", auditoria.Detalle, StringComparison.OrdinalIgnoreCase);
    }
}
