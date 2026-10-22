namespace Istpet.ActualizacionDatos.WebApi.Tests;

using System.IO.Compression;
using System.Net;
using System.Text;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Infrastructure.Multitenancy;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

public sealed class ExportacionesTests : IDisposable
{
    private readonly SqliteConnection _conexion;
    private readonly WebApplicationFactory<Program> _fabrica;
    private readonly HttpClient _cliente;

    public ExportacionesTests()
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

        _cliente = _fabrica.CreateClient();
    }

    public void Dispose()
    {
        _cliente.Dispose();
        _fabrica.Dispose();
        _conexion.Dispose();
    }

    private static HttpRequestMessage CrearRequest(
        HttpMethod metodo,
        string ruta,
        Guid instId,
        string actor,
        RolUsuario rol = RolUsuario.Admin)
    {
        var request = new HttpRequestMessage(metodo, ruta);
        request.Headers.Add("X-Institucion-Id", instId.ToString());
        request.Headers.Add("X-Actor", actor);
        request.Headers.Add("X-Rol", rol.ToString());
        return request;
    }

    private async Task<(Guid InstitucionId, Persona PersonaAprobada, Persona PersonaPendiente)> InicializarDatosExportacionAsync()
    {
        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        var almacen = scope.ServiceProvider.GetRequiredService<IAlmacenArchivos>();

        var institucionId = Guid.NewGuid();
        var inst = new Institucion(new InstitucionId(institucionId), "Instituto Central Tecnico");
        db.Instituciones.Add(inst);

        var pAprobada = new Persona(
            Guid.NewGuid(),
            new InstitucionId(institucionId),
            "1700000001",
            RolUsuario.Usuario,
            "Docente Aprobado",
            "docente.aprobado@ejemplo.test",
            accesoHabilitado: true,
            estadoActualizacion: EstadoActualizacion.Aprobado,
            tratamientoDatosAceptado: true,
            fechaAceptacionTratamientoDatosUtc: DateTime.UtcNow);

        var pPendiente = new Persona(
            Guid.NewGuid(),
            new InstitucionId(institucionId),
            "1700000002",
            RolUsuario.Usuario,
            "Estudiante Pendiente",
            "estudiante.pendiente@ejemplo.test",
            accesoHabilitado: true,
            estadoActualizacion: EstadoActualizacion.Borrador);

        db.Personas.AddRange(pAprobada, pPendiente);

        // Guardar archivo físico en disco para la persona aprobada
        var archivoId = Guid.NewGuid();
        var contenidoPdf = Encoding.UTF8.GetBytes("%PDF-1.4\nContenido ficticio de prueba");
        string rutaRelativa;
        using (var ms = new MemoryStream(contenidoPdf))
        {
            rutaRelativa = await almacen.GuardarAsync(
                new InstitucionId(institucionId),
                pAprobada.Id,
                archivoId,
                ms);
        }

        var archivoAdjunto = new ArchivoAdjunto(
            archivoId,
            new InstitucionId(institucionId),
            pAprobada.Id,
            "titulo_profesional.pdf",
            "application/pdf",
            contenidoPdf.Length,
            "hash_sha256_ficticio_1234567890abcdef",
            rutaRelativa);

        db.ArchivosAdjuntos.Add(archivoAdjunto);

        await db.SaveChangesAsync();

        return (institucionId, pAprobada, pPendiente);
    }

    [Fact]
    public async Task Admin_puede_descargar_zip_con_estructura_indice_y_archivos()
    {
        // Arrange
        var (instId, pAprobada, pPendiente) = await InicializarDatosExportacionAsync();
        var request = CrearRequest(HttpMethod.Get, "/api/exportaciones/zip", instId, "admin@ejemplo.test", RolUsuario.Admin);

        // Act
        var response = await _cliente.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/zip", response.Content.Headers.ContentType?.MediaType);
        Assert.NotNull(response.Content.Headers.ContentDisposition?.FileName);

        var bytes = await response.Content.ReadAsByteArrayAsync();
        using var zipStream = new MemoryStream(bytes);
        using var archive = new ZipArchive(zipStream, ZipArchiveMode.Read);

        // Verificar que existe index.md dentro de la carpeta raíz
        var indexEntry = archive.Entries.FirstOrDefault(e => e.FullName.EndsWith("/index.md", StringComparison.OrdinalIgnoreCase));
        Assert.NotNull(indexEntry);

        using (var reader = new StreamReader(indexEntry.Open(), Encoding.UTF8))
        {
            var contenidoIndice = await reader.ReadToEndAsync();
            Assert.Contains("Índice de Expedientes Consolidados", contenidoIndice, StringComparison.OrdinalIgnoreCase);
            Assert.Contains(pAprobada.Documento, contenidoIndice, StringComparison.Ordinal);
            // La persona pendiente NO debe estar en el índice
            Assert.DoesNotContain(pPendiente.Documento, contenidoIndice, StringComparison.Ordinal);
        }

        // Verificar que el archivo adjunto de la persona aprobada fue empaquetado en su subcarpeta
        var archivoDoc = archive.Entries.FirstOrDefault(e => e.FullName.Contains($"/{pAprobada.Documento}/titulo_profesional.pdf", StringComparison.OrdinalIgnoreCase));
        Assert.NotNull(archivoDoc);

        // Verificar que la persona pendiente no tiene archivos en el zip
        var archivosPendiente = archive.Entries.Where(e => e.FullName.Contains($"/{pPendiente.Documento}/", StringComparison.OrdinalIgnoreCase));
        Assert.Empty(archivosPendiente);

        // Verificar que se registró la auditoría en la base de datos (RF-DAT-004)
        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        var auditoria = await db.Auditorias.FirstOrDefaultAsync(a => a.Accion == "ExportacionZip");
        Assert.NotNull(auditoria);
        Assert.Equal("admin@ejemplo.test", auditoria.Actor);
    }

    [Fact]
    public async Task Admin_puede_descargar_excel_con_personas_aprobadas()
    {
        // Arrange
        var (instId, pAprobada, pPendiente) = await InicializarDatosExportacionAsync();
        var request = CrearRequest(HttpMethod.Get, "/api/exportaciones/excel", instId, "admin@ejemplo.test", RolUsuario.Admin);

        // Act
        var response = await _cliente.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", response.Content.Headers.ContentType?.MediaType);

        var bytes = await response.Content.ReadAsByteArrayAsync();
        using var ms = new MemoryStream(bytes);
        using var zip = new ZipArchive(ms, ZipArchiveMode.Read);

        // Validar formato OpenXML estándar
        Assert.NotNull(zip.GetEntry("[Content_Types].xml"));
        Assert.NotNull(zip.GetEntry("xl/workbook.xml"));
        var sheetEntry = zip.GetEntry("xl/worksheets/sheet1.xml");
        Assert.NotNull(sheetEntry);

        using (var reader = new StreamReader(sheetEntry.Open(), Encoding.UTF8))
        {
            var xmlContent = await reader.ReadToEndAsync();
            Assert.Contains(pAprobada.Documento, xmlContent, StringComparison.Ordinal);
            Assert.DoesNotContain(pPendiente.Documento, xmlContent, StringComparison.Ordinal);
        }

        // Verificar registro de auditoría
        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        var auditoria = await db.Auditorias.FirstOrDefaultAsync(a => a.Accion == "ExportacionExcel");
        Assert.NotNull(auditoria);
        Assert.Equal("admin@ejemplo.test", auditoria.Actor);
    }

    [Theory]
    [InlineData(RolUsuario.Supervisor)]
    [InlineData(RolUsuario.Usuario)]
    public async Task Supervisor_y_Usuario_reciben_403_Forbidden_al_intentar_exportar(RolUsuario rolNoAutorizado)
    {
        // Arrange
        var (instId, _, _) = await InicializarDatosExportacionAsync();

        var requestZip = CrearRequest(HttpMethod.Get, "/api/exportaciones/zip", instId, "no_autorizado@ejemplo.test", rolNoAutorizado);
        var responseZip = await _cliente.SendAsync(requestZip);

        var requestExcel = CrearRequest(HttpMethod.Get, "/api/exportaciones/excel", instId, "no_autorizado@ejemplo.test", rolNoAutorizado);
        var responseExcel = await _cliente.SendAsync(requestExcel);

        // Assert (RF-EXP-003)
        Assert.Equal(HttpStatusCode.Forbidden, responseZip.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, responseExcel.StatusCode);
    }

    [Fact]
    public async Task Peticion_sin_autenticacion_recibe_401_Unauthorized()
    {
        // Arrange: Petición sin headers de autenticación ni actor
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/exportaciones/zip");

        // Act
        var response = await _cliente.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Admin_no_puede_exportar_datos_de_otra_institucion_RF_EXP_004()
    {
        // Arrange
        var (instId, _, _) = await InicializarDatosExportacionAsync();
        var otraInstitucionId = Guid.NewGuid();

        // Intento de exportar la otra institución teniendo contexto institucional de instId
        var request = CrearRequest(HttpMethod.Get, $"/api/exportaciones/zip?institucionId={otraInstitucionId}", instId, "admin@ejemplo.test", RolUsuario.Admin);

        // Act
        var response = await _cliente.SendAsync(request);

        // Assert: 400 Bad Request por violación de aislamiento multitenant
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
