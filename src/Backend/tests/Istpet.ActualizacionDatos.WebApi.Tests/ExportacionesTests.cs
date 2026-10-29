namespace Istpet.ActualizacionDatos.WebApi.Tests;

using System.IO.Compression;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Infrastructure.Multitenancy;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Istpet.ActualizacionDatos.Infrastructure.Servicios;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

public sealed partial class ExportacionesTests : IDisposable
{
    private readonly SqliteConnection _conexion;
    private readonly WebApplicationFactory<Program> _fabrica;
    private readonly HttpClient _cliente;

    public ExportacionesTests()
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

        // RF-PLA-013: Verificar que el PDF de hoja de vida de la persona aprobada fue incluido en el ZIP
        var pdfDoc = archive.Entries.FirstOrDefault(e => e.FullName.Contains($"/{pAprobada.Documento}/hoja-de-vida.pdf", StringComparison.OrdinalIgnoreCase));
        Assert.NotNull(pdfDoc);

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
            Assert.Contains("Correo Personal", xmlContent, StringComparison.Ordinal);
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

    [Theory]
    [InlineData("../../etc/passwd", "passwd")]
    [InlineData(@"..\..\evil.pdf", "evil.pdf")]
    [InlineData("/abs/ruta.pdf", "ruta.pdf")]
    [InlineData(@"C:\x\y.pdf", "y.pdf")]
    [InlineData("titulo_profesional.pdf", "titulo_profesional.pdf")]
    [InlineData("archivo\ncon\r\nsaltos\u0007.pdf", "archivoconsaltos.pdf")]
    [InlineData("archivo`con`comillas.pdf", "archivo`con`comillas.pdf")]
    public void SanearNombreArchivoZip_convierte_rutas_y_caracteres_peligrosos_en_hoja_segura(
        string nombreOriginal,
        string esperado)
    {
        var archivoId = Guid.Parse("11111111-2222-3333-4444-555555555555");

        var resultado = ServicioExportacion.SanearNombreArchivoZip(nombreOriginal, archivoId);

        Assert.Equal(esperado, resultado);
        Assert.DoesNotContain("..", resultado, StringComparison.Ordinal);
        Assert.DoesNotContain("/", resultado, StringComparison.Ordinal);
        Assert.DoesNotContain(@"\", resultado, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(".")]
    [InlineData("..")]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("\r\n\t\0")]
    [InlineData("../../../")]
    [InlineData(@"..\..\..")]
    public void SanearNombreArchivoZip_usa_id_bin_cuando_queda_vacio_o_punto(string nombreInvalido)
    {
        var archivoId = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");

        var resultado = ServicioExportacion.SanearNombreArchivoZip(nombreInvalido, archivoId);

        Assert.Equal($"{archivoId}.bin", resultado);
    }

    [Fact]
    public void Dos_archivos_con_el_mismo_nombre_saneado_conservan_nombres_distintos()
    {
        var archivoId1 = Guid.Parse("10000000-0000-0000-0000-000000000001");
        var archivoId2 = Guid.Parse("10000000-0000-0000-0000-000000000002");
        var nombresUsados = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        var saneado1 = ServicioExportacion.SanearNombreArchivoZip(@"..\..\documento.pdf", archivoId1);
        var unico1 = ServicioExportacion.GenerarNombreArchivoUnico(saneado1, nombresUsados);

        var saneado2 = ServicioExportacion.SanearNombreArchivoZip("/otra/ruta/documento.pdf", archivoId2);
        var unico2 = ServicioExportacion.GenerarNombreArchivoUnico(saneado2, nombresUsados);

        Assert.Equal("documento.pdf", unico1);
        Assert.Equal("documento_2.pdf", unico2);
    }

    [Fact]
    public void FormatearCodigoEnLineaMarkdown_escapa_comillas_invertidas_y_saltos_de_linea()
    {
        var conComillas = ServicioExportacion.FormatearCodigoEnLineaMarkdown("mi`archivo`raro.pdf");
        Assert.Equal("``mi`archivo`raro.pdf``", conComillas);

        var conSaltos = ServicioExportacion.FormatearCodigoEnLineaMarkdown("linea1\r\nlinea2\nfinal.pdf");
        Assert.DoesNotContain("\r", conSaltos, StringComparison.Ordinal);
        Assert.DoesNotContain("\n", conSaltos, StringComparison.Ordinal);
        Assert.Equal("`linea1 linea2 final.pdf`", conSaltos);
    }

    [Fact]
    public async Task ExportarZip_sanea_nombres_maliciosos_colisiones_e_indice_markdown()
    {
        // Arrange
        Guid institucionId;
        var documentoOriginal = @"..\..\1700000099";
        var idPunto = Guid.Parse("20000000-0000-0000-0000-000000000001");
        var idDoblePunto = Guid.Parse("20000000-0000-0000-0000-000000000002");

        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            var almacen = scope.ServiceProvider.GetRequiredService<IAlmacenArchivos>();

            institucionId = Guid.NewGuid();
            var inst = new Institucion(new InstitucionId(institucionId), "Instituto Pruebas Zip");
            db.Instituciones.Add(inst);

            var persona = new Persona(
                Guid.NewGuid(),
                new InstitucionId(institucionId),
                documentoOriginal,
                RolUsuario.Usuario,
                "Persona Prueba Seguridad",
                "seguridad.ficticia@ejemplo.test",
                accesoHabilitado: true,
                estadoActualizacion: EstadoActualizacion.Aprobado,
                tratamientoDatosAceptado: true,
                fechaAceptacionTratamientoDatosUtc: DateTime.UtcNow);

            db.Personas.Add(persona);

            var casos = new (Guid Id, string NombreBruto)[]
            {
                (Guid.NewGuid(), "../../etc/passwd"),
                (Guid.NewGuid(), @"..\..\evil.pdf"),
                (Guid.NewGuid(), @"C:\carpeta\evil.pdf"),
                (Guid.NewGuid(), "/abs/ruta.pdf"),
                (idPunto, "."),
                (idDoblePunto, ".."),
                (Guid.NewGuid(), "nombre\ncon\r\nsaltos\u0007.pdf"),
                (Guid.NewGuid(), "reporte`con`backticks.pdf"),
                (Guid.NewGuid(), "certificado_normal.pdf"),
            };

            var contenidoPdf = Encoding.UTF8.GetBytes("%PDF-1.4\nContenido ficticio");

            foreach (var (archivoId, nombreBruto) in casos)
            {
                using var ms = new MemoryStream(contenidoPdf);
                var rutaRelativa = await almacen.GuardarAsync(
                    new InstitucionId(institucionId),
                    persona.Id,
                    archivoId,
                    ms);

                var adjunto = new ArchivoAdjunto(
                    archivoId,
                    new InstitucionId(institucionId),
                    persona.Id,
                    "temporal.pdf",
                    "application/pdf",
                    contenidoPdf.Length,
                    "hash_sha256_ficticio_1234567890abcdef",
                    rutaRelativa);

                db.ArchivosAdjuntos.Add(adjunto);
                // Simular valor persistido directamente sin pasar por Path.GetFileName de la plataforma actual
                db.Entry(adjunto).Property(a => a.NombreOriginal).CurrentValue = nombreBruto;
            }

            await db.SaveChangesAsync();
        }

        var request = CrearRequest(HttpMethod.Get, "/api/exportaciones/zip", institucionId, "admin@ejemplo.test", RolUsuario.Admin);

        // Act
        var response = await _cliente.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var bytes = await response.Content.ReadAsByteArrayAsync();
        using var zipStream = new MemoryStream(bytes);
        using var archive = new ZipArchive(zipStream, ZipArchiveMode.Read);

        var indexEntry = archive.Entries.Single(e => e.FullName.EndsWith("/index.md", StringComparison.Ordinal));
        var carpetaRaiz = indexEntry.FullName[..^"/index.md".Length];
        var prefijoPersonaEsperado = $"{carpetaRaiz}/1700000099/";

        var entradasArchivos = archive.Entries.Where(e => e != indexEntry && !e.FullName.EndsWith("/hoja-de-vida.html", StringComparison.Ordinal) && !e.FullName.EndsWith("/hoja-de-vida.pdf", StringComparison.Ordinal)).ToList();
        Assert.Equal(9, entradasArchivos.Count);

        foreach (var entry in archive.Entries)
        {
            Assert.DoesNotContain("..", entry.FullName, StringComparison.Ordinal);
            Assert.DoesNotContain(@"\", entry.FullName, StringComparison.Ordinal);

            if (entry != indexEntry)
            {
                Assert.StartsWith(prefijoPersonaEsperado, entry.FullName, StringComparison.Ordinal);
                var restoRuta = entry.FullName[prefijoPersonaEsperado.Length..];
                Assert.DoesNotContain("/", restoRuta, StringComparison.Ordinal);
            }
        }

        var nombresHojas = entradasArchivos.Select(e => e.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);
        Assert.Contains("passwd", nombresHojas);
        Assert.Contains("evil.pdf", nombresHojas);
        Assert.Contains("evil_2.pdf", nombresHojas);
        Assert.Contains("ruta.pdf", nombresHojas);
        Assert.Contains($"{idPunto}.bin", nombresHojas);
        Assert.Contains($"{idDoblePunto}.bin", nombresHojas);
        Assert.Contains("nombreconsaltos.pdf", nombresHojas);
        Assert.Contains("reporte`con`backticks.pdf", nombresHojas);
        Assert.Contains("certificado_normal.pdf", nombresHojas);

        using var reader = new StreamReader(indexEntry.Open(), Encoding.UTF8);
        var contenidoIndice = await reader.ReadToEndAsync();
        Assert.Contains("``reporte`con`backticks.pdf``", contenidoIndice, StringComparison.Ordinal);
        Assert.Contains("`nombre con saltos.pdf`", contenidoIndice, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Admin_exportar_excel_incluye_hoja_y_columna_de_capacitaciones_obligatorias_RF_CAP_011()
    {
        // Arrange
        var (instId, pAprobada, _) = await InicializarDatosExportacionAsync();

        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            var ob = new Istpet.ActualizacionDatos.Domain.HojaDeVida.CapacitacionObligatoria(
                Guid.NewGuid(),
                new InstitucionId(instId),
                "Seguridad y Salud en el Trabajo 2026",
                "ISTPET",
                20,
                new DateOnly(2026, 4, 10));

            db.CapacitacionesObligatorias.Add(ob);

            var cap = new Istpet.ActualizacionDatos.Domain.HojaDeVida.Capacitacion(
                Guid.NewGuid(),
                new InstitucionId(instId),
                pAprobada.Id,
                new Istpet.ActualizacionDatos.Domain.HojaDeVida.DatosCapacitacion(
                    "Seguridad y Salud en el Trabajo 2026",
                    "ISTPET",
                    NumeroHoras: 20,
                    CapacitacionObligatoriaId: ob.Id));

            db.Capacitaciones.Add(cap);
            await db.SaveChangesAsync();
        }

        var request = CrearRequest(HttpMethod.Get, "/api/exportaciones/excel", instId, "admin@ejemplo.test", RolUsuario.Admin);

        // Act
        var response = await _cliente.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var bytes = await response.Content.ReadAsByteArrayAsync();
        using var ms = new MemoryStream(bytes);
        using var zip = new ZipArchive(ms, ZipArchiveMode.Read);

        // Validar hoja 1 y hoja 2
        var sheet1 = zip.GetEntry("xl/worksheets/sheet1.xml");
        Assert.NotNull(sheet1);
        using (var reader = new StreamReader(sheet1.Open(), Encoding.UTF8))
        {
            var contenido = await reader.ReadToEndAsync();
            Assert.Contains("Capacitaciones Obligatorias", contenido, StringComparison.Ordinal);
            Assert.Contains(pAprobada.Documento, contenido, StringComparison.Ordinal);
        }

        var sheet2 = zip.GetEntry("xl/worksheets/sheet2.xml");
        Assert.NotNull(sheet2);
        using (var reader = new StreamReader(sheet2.Open(), Encoding.UTF8))
        {
            var contenido = await reader.ReadToEndAsync();
            Assert.Contains("Seguridad y Salud en el Trabajo 2026", contenido, StringComparison.Ordinal);
            Assert.Contains(pAprobada.Documento, contenido, StringComparison.Ordinal);
            Assert.Contains("Aprobada", contenido, StringComparison.Ordinal);
        }
    }

    [Fact]
    public async Task Admin_exportar_excel_incluye_borradores_incompletos_cuando_la_campana_vencio_RF_CAP_016()
    {
        // Arrange
        Guid instId;
        Persona pBorrador;

        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            instId = Guid.NewGuid();
            var inst = new Institucion(new InstitucionId(instId), "Instituto Campana Vencida");
            db.Instituciones.Add(inst);

            // Campaña vencida
            var campana = new Campana(
                Guid.NewGuid(),
                new InstitucionId(instId),
                "Campaña 2025 Pasada",
                DateTime.UtcNow.AddDays(-30),
                DateTime.UtcNow.AddDays(-5),
                activa: true);
            db.Campanas.Add(campana);

            pBorrador = new Persona(
                Guid.NewGuid(),
                new InstitucionId(instId),
                "1700000095",
                RolUsuario.Usuario,
                "Docente Incompleto",
                "docente.incompleto@ejemplo.test",
                accesoHabilitado: true,
                estadoActualizacion: EstadoActualizacion.Borrador);

            db.Personas.Add(pBorrador);
            await db.SaveChangesAsync();
        }

        var request = CrearRequest(HttpMethod.Get, "/api/exportaciones/excel", instId, "admin@ejemplo.test", RolUsuario.Admin);

        // Act
        var response = await _cliente.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var bytes = await response.Content.ReadAsByteArrayAsync();
        using var ms = new MemoryStream(bytes);
        using var zip = new ZipArchive(ms, ZipArchiveMode.Read);

        var sheet1 = zip.GetEntry("xl/worksheets/sheet1.xml");
        Assert.NotNull(sheet1);
        using var reader = new StreamReader(sheet1.Open(), Encoding.UTF8);
        var contenido = await reader.ReadToEndAsync();
        Assert.Contains(pBorrador.Documento, contenido, StringComparison.Ordinal);
        Assert.Contains("Incompleto, no enviado", contenido, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Admin_puede_ver_borrador_incompleto_post_campana_y_supervisor_consulta_solo_lectura_ADR_0039()
    {
        // Arrange
        Guid instId;
        string documentoBorrador = "1700000096";

        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            instId = Guid.NewGuid();
            var inst = new Institucion(new InstitucionId(instId), "Instituto Revision Post Campana");
            db.Instituciones.Add(inst);

            var campana = new Campana(
                Guid.NewGuid(),
                new InstitucionId(instId),
                "Campaña Cerrada 2025",
                DateTime.UtcNow.AddDays(-40),
                DateTime.UtcNow.AddDays(-2),
                activa: true);
            db.Campanas.Add(campana);

            var p = new Persona(
                Guid.NewGuid(),
                new InstitucionId(instId),
                documentoBorrador,
                RolUsuario.Usuario,
                "Usuario Borrador Post Campana",
                "borrador.post@ejemplo.test",
                accesoHabilitado: true,
                estadoActualizacion: EstadoActualizacion.Borrador);

            db.Personas.Add(p);
            await db.SaveChangesAsync();
        }

        // 1. Supervisor consulta el borrador -> 200 OK en modo solo lectura (ADR-0039)
        var reqSupervisor = CrearRequest(HttpMethod.Get, $"/api/revision/{documentoBorrador}", instId, "supervisor@ejemplo.test", RolUsuario.Supervisor);
        var resSupervisor = await _cliente.SendAsync(reqSupervisor);
        Assert.Equal(HttpStatusCode.OK, resSupervisor.StatusCode);

        // Supervisor no puede aprobar el borrador -> 400 Bad Request
        var reqAprobar = CrearRequest(HttpMethod.Post, $"/api/revision/{documentoBorrador}/aprobar", instId, "supervisor@ejemplo.test", RolUsuario.Supervisor);
        var resAprobar = await _cliente.SendAsync(reqAprobar);
        Assert.Equal(HttpStatusCode.BadRequest, resAprobar.StatusCode);

        // 2. Admin intenta ver el borrador -> 200 OK con marca 'Incompleto, no enviado'
        var reqAdmin = CrearRequest(HttpMethod.Get, $"/api/revision/{documentoBorrador}", instId, "admin@ejemplo.test", RolUsuario.Admin);
        var resAdmin = await _cliente.SendAsync(reqAdmin);
        Assert.Equal(HttpStatusCode.OK, resAdmin.StatusCode);

        var dto = await resAdmin.Content.ReadFromJsonAsync<ExpedienteRevisionDto>();
        Assert.NotNull(dto);
        Assert.Equal(documentoBorrador, dto.Documento);
        Assert.Equal("Incompleto, no enviado", dto.EstadoActualizacion);

        // 3. Auditoría registrada
        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            var auditoria = await db.Auditorias.FirstOrDefaultAsync(a => a.Accion == "ConsultaBorradorIncompletoPostCampana");
            Assert.NotNull(auditoria);
            Assert.Equal("admin@ejemplo.test", auditoria.Actor);
        }
    }
}
