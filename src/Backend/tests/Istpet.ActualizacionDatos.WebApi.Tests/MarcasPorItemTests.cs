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
/// Pruebas para T-07 (Issue #43, RF-HDV-011, RF-HDV-015): Marcas por ítem en la devolución.
/// </summary>
public sealed class MarcasPorItemTests : IDisposable
{
    private readonly SqliteConnection _conexion;
    private readonly WebApplicationFactory<Program> _fabrica;
    private readonly HttpClient _cliente;

    public MarcasPorItemTests()
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

    private async Task<(Guid InstitucionId, Persona Persona1, Persona Persona2, TituloAcademico TituloP1, Capacitacion CapP1, ExperienciaLaboral ExpP1, ReferenciaPersonal RefP1, TituloAcademico TituloP2)> InicializarEscenarioAsync()
    {
        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();

        var institucionId = Guid.NewGuid();
        var inst = new Institucion(new InstitucionId(institucionId), "Institucion Test T07");
        db.Instituciones.Add(inst);

        var p1 = new Persona(
            Guid.NewGuid(),
            new InstitucionId(institucionId),
            "1700000001",
            RolUsuario.Usuario,
            "Docente Uno",
            "docente1@ejemplo.test",
            accesoHabilitado: true);

        var p2 = new Persona(
            Guid.NewGuid(),
            new InstitucionId(institucionId),
            "1700000002",
            RolUsuario.Usuario,
            "Docente Dos",
            "docente2@ejemplo.test",
            accesoHabilitado: true);

        var campana = new Campana(
            Guid.NewGuid(),
            new InstitucionId(institucionId),
            "Campaña T-07",
            DateTime.UtcNow.AddDays(-2),
            DateTime.UtcNow.AddDays(2),
            activa: true);

        p1.AceptarTratamientoDatos(DateTime.UtcNow.AddMinutes(-15));
        p2.AceptarTratamientoDatos(DateTime.UtcNow.AddMinutes(-10));
        p1.EnviarARevision(DateTime.UtcNow.AddMinutes(-10));
        p2.EnviarARevision(DateTime.UtcNow.AddMinutes(-5));

        db.Personas.AddRange(p1, p2);
        db.Campanas.Add(campana);

        var tituloP1 = new TituloAcademico(
            Guid.NewGuid(),
            new InstitucionId(institucionId),
            p1.Id,
            new DatosTituloAcademico(
                NombreTitulo: "Ingeniería en Sistemas",
                GradoAcademicoId: 1,
                NombreInstitucionOtra: "Universidad Central",
                NumeroRegistroSenescyt: "1234-5678"));

        var capP1 = new Capacitacion(
            Guid.NewGuid(),
            new InstitucionId(institucionId),
            p1.Id,
            new DatosCapacitacion(
                NombreEvento: "Curso de C#",
                InstitucionOrganizadora: "Platzi",
                NumeroHoras: 40,
                FechaInicio: new DateOnly(2025, 1, 1),
                FechaFin: new DateOnly(2025, 1, 15)));

        var expP1 = new ExperienciaLaboral(
            Guid.NewGuid(),
            new InstitucionId(institucionId),
            p1.Id,
            new DatosExperienciaLaboral(
                Empleador: "Empresa Tech",
                Cargo: "Desarrollador",
                FechaInicio: new DateOnly(2020, 1, 1),
                TrabajaActualmente: true));

        var refP1 = new ReferenciaPersonal(
            Guid.NewGuid(),
            new InstitucionId(institucionId),
            p1.Id,
            new DatosReferencia(
                Tipo: TipoReferencia.Personal,
                NombresApellidos: "Carlos Referencia",
                Telefono: "0991112233"));

        var tituloP2 = new TituloAcademico(
            Guid.NewGuid(),
            new InstitucionId(institucionId),
            p2.Id,
            new DatosTituloAcademico(
                NombreTitulo: "Licenciatura en Educación",
                GradoAcademicoId: 1,
                NombreInstitucionOtra: "Universidad Técnica",
                NumeroRegistroSenescyt: "9876-5432"));

        db.TitulosAcademicos.AddRange(tituloP1, tituloP2);
        db.Capacitaciones.Add(capP1);
        db.ExperienciasLaborales.Add(expP1);
        db.ReferenciasPersonales.Add(refP1);

        await db.SaveChangesAsync();

        return (institucionId, p1, p2, tituloP1, capP1, expP1, refP1, tituloP2);
    }

    [Fact]
    public async Task RF_HDV_011_Marca_con_clave_de_item_existente_agrega_marca_tipo_item()
    {
        var (instId, p1, _, titulo, cap, exp, referencia, _) = await InicializarEscenarioAsync();

        var request = new DevolverActualizacionRequest(
            "Se devuelven observaciones en sus ítems registrados.",
            new List<MarcaObservacionItem>
            {
                new("item", $"titulo:{titulo.Id}", "El número de registro de SENESCYT no coincide con el archivo."),
                new("item", $"capacitacion:{cap.Id}", "El certificado de capacitación no tiene las horas visibles."),
                new("item", $"experiencia:{exp.Id}", "Favor adjuntar el certificado laboral actualizado."),
                new("item", $"referencia:{referencia.Id}", "El teléfono de la referencia no contesta.")
            });

        var req = new HttpRequestMessage(HttpMethod.Post, $"/api/revision/{p1.Documento}/devolver")
        {
            Content = JsonContent.Create(request)
        };
        req.Headers.Add("X-Institucion-Id", instId.ToString());
        req.Headers.Add("X-Actor", "supervisor_01");
        req.Headers.Add("X-Rol", "Supervisor");

        var res = await _cliente.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        // Verificar que en base de datos las marcas tienen TipoDestino == TipoDestinoMarca.Item
        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();

        var marcas = await db.MarcasObservacion.ToListAsync();
        Assert.Equal(4, marcas.Count);
        Assert.All(marcas, m => Assert.Equal(TipoDestinoMarca.Item, m.TipoDestino));
        Assert.Contains(marcas, m => m.ClaveDestino == $"titulo:{titulo.Id}");
        Assert.Contains(marcas, m => m.ClaveDestino == $"capacitacion:{cap.Id}");
        Assert.Contains(marcas, m => m.ClaveDestino == $"experiencia:{exp.Id}");
        Assert.Contains(marcas, m => m.ClaveDestino == $"referencia:{referencia.Id}");
    }

    [Fact]
    public async Task RF_HDV_011_Marca_con_clave_de_otra_persona_o_inexistente_es_rechazada()
    {
        var (instId, p1, _, _, _, _, _, tituloP2) = await InicializarEscenarioAsync();

        // 1. Intentar marcar el título de Persona 2 en la devolución de Persona 1
        var reqOtraPersona = new HttpRequestMessage(HttpMethod.Post, $"/api/revision/{p1.Documento}/devolver")
        {
            Content = JsonContent.Create(new DevolverActualizacionRequest(
                "Observación",
                new List<MarcaObservacionItem>
                {
                    new("item", $"titulo:{tituloP2.Id}", "Este título no es suyo.")
                }))
        };
        reqOtraPersona.Headers.Add("X-Institucion-Id", instId.ToString());
        reqOtraPersona.Headers.Add("X-Actor", "supervisor_01");
        reqOtraPersona.Headers.Add("X-Rol", "Supervisor");

        var resOtra = await _cliente.SendAsync(reqOtraPersona);
        Assert.Equal(HttpStatusCode.BadRequest, resOtra.StatusCode);
        var errOtra = await resOtra.Content.ReadFromJsonAsync<MensajeRespuesta>();
        Assert.Contains("no existe o no pertenece", errOtra?.Mensaje ?? "");

        // 2. Intentar marcar con un GUID inventado
        var reqInexistente = new HttpRequestMessage(HttpMethod.Post, $"/api/revision/{p1.Documento}/devolver")
        {
            Content = JsonContent.Create(new DevolverActualizacionRequest(
                "Observación",
                new List<MarcaObservacionItem>
                {
                    new("item", $"titulo:{Guid.NewGuid()}", "Ítem fantasma.")
                }))
        };
        reqInexistente.Headers.Add("X-Institucion-Id", instId.ToString());
        reqInexistente.Headers.Add("X-Actor", "supervisor_01");
        reqInexistente.Headers.Add("X-Rol", "Supervisor");

        var resInex = await _cliente.SendAsync(reqInexistente);
        Assert.Equal(HttpStatusCode.BadRequest, resInex.StatusCode);

        // 3. Clave sin formato tipo:id
        var reqFormato = new HttpRequestMessage(HttpMethod.Post, $"/api/revision/{p1.Documento}/devolver")
        {
            Content = JsonContent.Create(new DevolverActualizacionRequest(
                "Observación",
                new List<MarcaObservacionItem>
                {
                    new("item", "clave_invalida_sin_separador", "Formato inválido.")
                }))
        };
        reqFormato.Headers.Add("X-Institucion-Id", instId.ToString());
        reqFormato.Headers.Add("X-Actor", "supervisor_01");
        reqFormato.Headers.Add("X-Rol", "Supervisor");

        var resFormato = await _cliente.SendAsync(reqFormato);
        Assert.Equal(HttpStatusCode.BadRequest, resFormato.StatusCode);
    }

    [Fact]
    public async Task RF_HDV_011_Usuario_ve_la_marca_sobre_el_item_en_mis_datos_observaciones()
    {
        var (instId, p1, _, titulo, _, _, _, _) = await InicializarEscenarioAsync();

        // 1. Supervisor devuelve con marca de ítem
        var reqDevolver = new HttpRequestMessage(HttpMethod.Post, $"/api/revision/{p1.Documento}/devolver")
        {
            Content = JsonContent.Create(new DevolverActualizacionRequest(
                "Corrija el título por favor.",
                new List<MarcaObservacionItem>
                {
                    new("item", $"titulo:{titulo.Id}", "Verificar fecha de grado y SENESCYT.")
                }))
        };
        reqDevolver.Headers.Add("X-Institucion-Id", instId.ToString());
        reqDevolver.Headers.Add("X-Actor", "supervisor_01");
        reqDevolver.Headers.Add("X-Rol", "Supervisor");
        var resDev = await _cliente.SendAsync(reqDevolver);
        Assert.Equal(HttpStatusCode.OK, resDev.StatusCode);

        // 2. Usuario consulta GET /api/mis-datos/observaciones
        var reqObs = new HttpRequestMessage(HttpMethod.Get, $"/api/mis-datos/observaciones?documento={p1.Documento}");
        reqObs.Headers.Add("X-Institucion-Id", instId.ToString());
        reqObs.Headers.Add("X-Actor", p1.Documento);
        reqObs.Headers.Add("X-Rol", "Usuario");

        var resObs = await _cliente.SendAsync(reqObs);
        Assert.Equal(HttpStatusCode.OK, resObs.StatusCode);

        var observaciones = await resObs.Content.ReadFromJsonAsync<List<ObservacionDto>>();
        Assert.NotNull(observaciones);
        Assert.NotEmpty(observaciones);

        var primeraObs = observaciones[0];
        Assert.Single(primeraObs.Marcas);
        var marca = primeraObs.Marcas[0];
        Assert.Equal("item", marca.TipoDestino);
        Assert.Equal($"titulo:{titulo.Id}", marca.ClaveDestino);
        Assert.Equal("Verificar fecha de grado y SENESCYT.", marca.Texto);
    }

    [Fact]
    public async Task RF_HDV_015_Aislamiento_supervisor_otra_institucion_no_marca_ni_ve_item()
    {
        var (instId, p1, _, titulo, _, _, _, _) = await InicializarEscenarioAsync();
        var otraInstitucionId = Guid.NewGuid();

        // 1. Supervisor de otra institución no puede ver la hoja de vida
        var reqVerOtraInst = new HttpRequestMessage(HttpMethod.Get, $"/api/revision/{p1.Documento}/hoja-de-vida");
        reqVerOtraInst.Headers.Add("X-Institucion-Id", otraInstitucionId.ToString());
        reqVerOtraInst.Headers.Add("X-Actor", "supervisor_ext");
        reqVerOtraInst.Headers.Add("X-Rol", "Supervisor");

        var resVer = await _cliente.SendAsync(reqVerOtraInst);
        Assert.Equal(HttpStatusCode.NotFound, resVer.StatusCode);

        // 2. Supervisor de otra institución no puede devolver ni marcar
        var reqDevolverOtraInst = new HttpRequestMessage(HttpMethod.Post, $"/api/revision/{p1.Documento}/devolver")
        {
            Content = JsonContent.Create(new DevolverActualizacionRequest(
                "Rechazo indebido",
                new List<MarcaObservacionItem>
                {
                    new("item", $"titulo:{titulo.Id}", "Intento de marcar de otra institución")
                }))
        };
        reqDevolverOtraInst.Headers.Add("X-Institucion-Id", otraInstitucionId.ToString());
        reqDevolverOtraInst.Headers.Add("X-Actor", "supervisor_ext");
        reqDevolverOtraInst.Headers.Add("X-Rol", "Supervisor");

        var resDev = await _cliente.SendAsync(reqDevolverOtraInst);
        Assert.Equal(HttpStatusCode.BadRequest, resDev.StatusCode);
    }
}
