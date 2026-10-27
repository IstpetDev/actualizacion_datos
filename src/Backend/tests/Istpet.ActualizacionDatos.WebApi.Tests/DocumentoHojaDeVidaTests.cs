namespace Istpet.ActualizacionDatos.WebApi.Tests;

using System.Net;
using System.Net.Http.Json;
using Istpet.ActualizacionDatos.Application.Documentos;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.Documentos;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using UglyToad.PdfPig;

public sealed class DocumentoHojaDeVidaTests : IDisposable
{
    private readonly SqliteConnection _conexion = new("DataSource=:memory:");
    private readonly WebApplicationFactory<Program> _fabrica;
    private readonly HttpClient _cliente;
    private int _numeroPersona;
    private readonly InstitucionId _institucion = InstitucionId.Nuevo();

    public DocumentoHojaDeVidaTests()
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

    private async Task<Persona> CrearYAutenticarAsync(RolUsuario rol, InstitucionId? institucion = null, EstadoActualizacion estado = EstadoActualizacion.Aprobado)
    {
        institucion ??= _institucion;
        using var alcance = _fabrica.Services.CreateScope();
        var db = alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>();

        if (!await db.Instituciones.AnyAsync(i => i.Id == institucion))
        {
            db.Instituciones.Add(new Institucion(institucion, "Institución de pruebas de descarga"));
        }

        var persona = new Persona(
            Guid.NewGuid(),
            institucion,
            (++_numeroPersona).ToString("D10", System.Globalization.CultureInfo.InvariantCulture),
            rol,
            "Usuario Prueba Descarga",
            "usuario.descarga@ejemplo.test",
            accesoHabilitado: true,
            estadoActualizacion: estado);

        persona.EstablecerPasswordHash(
            new PasswordHasher<Persona>().HashPassword(persona, "ClaveDescarga123!"),
            debeCambiarContrasena: false);

        var ficha = new FichaPersonal(institucion, persona.Id);
        ficha.Actualizar(new DatosFichaPersonal(
            PrimerNombre: "Usuario",
            PrimerApellido: "Prueba",
            FechaNacimiento: new DateOnly(1988, 3, 20),
            Celular: "0991234567"));

        db.Personas.Add(persona);
        db.FichasPersonales.Add(ficha);
        await db.SaveChangesAsync();

        var respuesta = await _cliente.PostAsJsonAsync("/api/auth/login", new LoginRequest(persona.Documento, "ClaveDescarga123!"));
        Assert.True(respuesta.StatusCode == HttpStatusCode.OK, await respuesta.Content.ReadAsStringAsync());

        return persona;
    }

    [Fact]
    public async Task Admin_DescargaPdfPersona_Retorna200_Y_RegistraAuditoriaSinPii()
    {
        var admin = await CrearYAutenticarAsync(RolUsuario.Admin);

        Persona personaObjetivo;
        using (var alcance = _fabrica.Services.CreateScope())
        {
            var db = alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            personaObjetivo = new Persona(
                Guid.NewGuid(),
                _institucion,
                "0000000099",
                RolUsuario.Usuario,
                "Docente Evaluado",
                accesoHabilitado: true,
                estadoActualizacion: EstadoActualizacion.Aprobado);
            db.Personas.Add(personaObjetivo);
            await db.SaveChangesAsync();
        }

        var respuesta = await _cliente.GetAsync($"/api/personas/{personaObjetivo.Id}/documento-hoja-de-vida");
        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        Assert.Equal("application/pdf", respuesta.Content.Headers.ContentType?.MediaType);

        var bytes = await respuesta.Content.ReadAsByteArrayAsync();
        Assert.NotEmpty(bytes);

        // Validar que el PDF es válido y se puede abrir con PdfPig
        using var pdf = PdfDocument.Open(bytes);
        Assert.True(pdf.NumberOfPages >= 1);

        // Verificar registro de auditoría (RF-PLA-016)
        using (var alcance = _fabrica.Services.CreateScope())
        {
            var db = alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            var auditoria = await db.Auditorias
                .Where(a => a.Accion == "DocumentoHojaDeVida.Descargar" && a.InstitucionId == _institucion)
                .FirstOrDefaultAsync();

            Assert.NotNull(auditoria);
            Assert.Contains(personaObjetivo.Id.ToString(), auditoria.Detalle ?? string.Empty);
            Assert.DoesNotContain(personaObjetivo.Documento, auditoria.Detalle ?? string.Empty);
        }
    }

    [Fact]
    public async Task Admin_DescargarPersonaOtraInstitucion_Retorna404()
    {
        await CrearYAutenticarAsync(RolUsuario.Admin);

        var otraInstitucion = InstitucionId.Nuevo();
        Guid idOtraPersona;
        using (var alcance = _fabrica.Services.CreateScope())
        {
            var db = alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            db.Instituciones.Add(new Institucion(otraInstitucion, "Otra Institución"));
            var personaAjena = new Persona(
                Guid.NewGuid(),
                otraInstitucion,
                "0000000088",
                RolUsuario.Usuario,
                "Persona Ajena",
                accesoHabilitado: true);
            db.Personas.Add(personaAjena);
            await db.SaveChangesAsync();
            idOtraPersona = personaAjena.Id;
        }

        var respuesta = await _cliente.GetAsync($"/api/personas/{idOtraPersona}/documento-hoja-de-vida");
        Assert.Equal(HttpStatusCode.NotFound, respuesta.StatusCode);
    }

    [Fact]
    public async Task Usuario_DescargarMiDocumento_EnBorrador_LlevaMarcaDeAguaVistaPrevia()
    {
        // Persona en borrador
        var persona = await CrearYAutenticarAsync(RolUsuario.Usuario, estado: EstadoActualizacion.Borrador);

        var respuesta = await _cliente.GetAsync("/api/mis-datos/documento-hoja-de-vida");
        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        Assert.Equal("application/pdf", respuesta.Content.Headers.ContentType?.MediaType);

        var bytes = await respuesta.Content.ReadAsByteArrayAsync();
        using var pdf = PdfDocument.Open(bytes);

        // Verificar que el texto de vista previa está presente (RF-PLA-012)
        var textoTotal = string.Join(" ", pdf.GetPages().Select(p => p.Text));
        Assert.Contains("Vista previa", textoTotal, StringComparison.OrdinalIgnoreCase);
    }
}
