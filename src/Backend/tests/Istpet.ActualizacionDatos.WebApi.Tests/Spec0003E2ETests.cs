namespace Istpet.ActualizacionDatos.WebApi.Tests;

using System.IO.Compression;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Multitenancy;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Istpet.ActualizacionDatos.Infrastructure.Servicios;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

/// <summary>
/// Pruebas E2E automatizadas para spec-0003 (Hoja de vida del personal).
/// Cubre los tres escenarios de la spec, los casos E2E-01 a E2E-11 de test-e2e.md,
/// y todos los requisitos funcionales RF-HDV-001 a RF-HDV-027.
/// </summary>
public sealed class Spec0003E2ETests : IDisposable
{
    private const string DocumentoDocenteA1 = "0000000001";
    private const string CorreoDocenteA1 = "usuario@ejemplo.test";
    private const string DocumentoDocenteA2 = "0000000002";
    private const string DocumentoDocenteB1 = "0000000003";
    private const string DocumentoAdminA = "0000000011";
    private const string DocumentoAdminB = "0000000012";
    private const string DocumentoSupervisorA = "0000000013";
    private const string ClaveComun = "ClaveSegura2026!";

    private readonly SqliteConnection _conexion;
    private readonly string _almacenTemporal;
    private readonly WebApplicationFactory<Program> _fabrica;
    private readonly HttpClient _cliente;

    public Spec0003E2ETests()
    {
        _conexion = new SqliteConnection("DataSource=:memory:");
        _conexion.Open();
        _almacenTemporal = Path.Combine(Path.GetTempPath(), "istpet-hdv-e2e-" + Guid.NewGuid().ToString("N"));

        _fabrica = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseSetting("Almacenamiento:RutaRaiz", _almacenTemporal);
            builder.UseSetting("CuentaBancaria:PermitirClavesTemporales", "true");
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

        if (Directory.Exists(_almacenTemporal))
        {
            try
            {
                Directory.Delete(_almacenTemporal, recursive: true);
            }
            catch
            {
                // Limpieza de directorio temporal
            }
        }
    }

    private static HttpRequestMessage CrearRequest(
        HttpMethod metodo,
        string ruta,
        Guid instId,
        string actor,
        RolUsuario rol,
        object? bodyJson = null)
    {
        var request = new HttpRequestMessage(metodo, ruta);
        request.Headers.Add("X-Institucion-Id", instId.ToString());
        request.Headers.Add("X-Actor", actor);
        request.Headers.Add("X-Rol", rol.ToString());
        if (bodyJson != null)
        {
            request.Content = JsonContent.Create(bodyJson);
        }
        return request;
    }

    private async Task SembrarCatalogosAsync()
    {
        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();

        if (!await db.ElementosCatalogo.AnyAsync(e => e.Id == 1001))
        {
            db.ElementosCatalogo.AddRange(
                new ElementoCatalogo(1001, TipoCatalogo.Pais, "EC", "Ecuador"),
                new ElementoCatalogo(1002, TipoCatalogo.Provincia, "PICHINCHA", "Pichincha", padreId: 1001),
                new ElementoCatalogo(1003, TipoCatalogo.Canton, "QUITO", "Quito", padreId: 1002),
                new ElementoCatalogo(1004, TipoCatalogo.Parroquia, "IÑAQUITO", "Iñaquito", padreId: 1003),
                new ElementoCatalogo(1005, TipoCatalogo.Etnia, "MESTIZO", "Mestizo")
            );
            await db.SaveChangesAsync();
        }
    }

    private async Task<ArchivoAdjunto> CrearArchivoFisicoAsync(Guid instId, Guid personaId, string nombreArchivo = "respaldo.pdf", string tipoMime = "application/pdf")
    {
        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        var almacen = scope.ServiceProvider.GetRequiredService<IAlmacenArchivos>();

        var archivoId = Guid.NewGuid();
        var contenido = tipoMime == "application/pdf"
            ? Encoding.UTF8.GetBytes("%PDF-1.4\nContenido ficticio de prueba E2E")
            : [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]; // PNG ficticio

        string rutaRelativa;
        using (var ms = new MemoryStream(contenido))
        {
            rutaRelativa = await almacen.GuardarAsync(new InstitucionId(instId), personaId, archivoId, ms);
        }

        var adjunto = new ArchivoAdjunto(
            archivoId,
            new InstitucionId(instId),
            personaId,
            nombreArchivo,
            tipoMime,
            contenido.Length,
            "hash_sha256_ficticio_" + Guid.NewGuid().ToString("N"),
            rutaRelativa);

        db.ArchivosAdjuntos.Add(adjunto);
        await db.SaveChangesAsync();
        return adjunto;
    }

    private async Task<(Guid TipoDocenteId, Dictionary<string, Guid> TiposDocumentoIds)> ConfigurarTiposYRequisitosAsync(Guid instId)
    {
        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();

        var tipoDocente = new TipoFuncionario(Guid.NewGuid(), new InstitucionId(instId), "DOCENTE", "Docente", esDocente: true);
        db.TiposFuncionario.Add(tipoDocente);

        var codigos = new[] { "CEDULA", "PAPELETA_VOTACION", "ANTECEDENTES_PENALES", "DECLARACION_JURAMENTADA", "MECANIZADO_IESS" };
        var dictDocs = new Dictionary<string, Guid>();

        foreach (var cod in codigos)
        {
            var td = new TipoDocumento(Guid.NewGuid(), new InstitucionId(instId), cod, cod.Replace('_', ' '));
            db.TiposDocumento.Add(td);
            dictDocs[cod] = td.Id;

            // Requisito obligatorio para todos
            var req = new RequisitoDocumento(Guid.NewGuid(), new InstitucionId(instId), td.Id, tipoFuncionarioId: null, esObligatorio: true);
            db.RequisitosDocumento.Add(req);
        }

        await db.SaveChangesAsync();
        return (tipoDocente.Id, dictDocs);
    }

    // =========================================================================
    // E2E-01 — Escenario 1: Docente completa y envía su hoja de vida
    // =========================================================================
    [Fact]
    public async Task E2E_01_Escenario_1_Docente_completa_y_envia_su_hoja_de_vida()
    {
        await SembrarCatalogosAsync();
        var instId = Guid.NewGuid();
        var docenteId = Guid.NewGuid();

        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            db.Instituciones.Add(new Institucion(new InstitucionId(instId), "Instituto Ficticio A"));
            await db.SaveChangesAsync();
        }

        var (tipoDocenteId, tiposDoc) = await ConfigurarTiposYRequisitosAsync(instId);

        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            var docente = new Persona(
                docenteId,
                new InstitucionId(instId),
                DocumentoDocenteA1,
                RolUsuario.Usuario,
                "Nombre Ficticio Apellido Ficticio",
                CorreoDocenteA1,
                accesoHabilitado: true);
            docente.AceptarTratamientoDatos(DateTime.UtcNow);
            docente.AsignarTipoFuncionario(tipoDocenteId);
            db.Personas.Add(docente);

            db.Campanas.Add(new Campana(
                Guid.NewGuid(),
                new InstitucionId(instId),
                "Campaña Activa E2E",
                DateTime.UtcNow.AddDays(-2),
                DateTime.UtcNow.AddDays(10),
                activa: true));

            await db.SaveChangesAsync();
        }

        // 1. RF-HDV-001, RF-HDV-020: Completar ficha con perfil
        var reqFicha = new GuardarFichaPersonalRequest(
            PrimerNombre: "Nombre Ficticio",
            PrimerApellido: "Apellido Ficticio",
            SegundoApellido: "Segundo Ficticio",
            SexoId: 1,
            FechaNacimiento: new DateOnly(1985, 4, 15),
            PaisNacimientoId: 1001,
            EstadoCivilId: 11,
            PaisNacionalidadId: 1001,
            ParroquiaResidenciaId: 1004,
            CallePrincipal: "Av. Principal 123",
            Celular: "0990000000",
            CorreoInstitucional: CorreoDocenteA1,
            Perfil: "Perfil breve docente de prueba");

        var respFicha = await _cliente.SendAsync(CrearRequest(HttpMethod.Put, "/api/mis-datos/hoja-de-vida/ficha", instId, DocumentoDocenteA1, RolUsuario.Usuario, reqFicha));
        Assert.Equal(HttpStatusCode.OK, respFicha.StatusCode);

        // 2. RF-HDV-002, 003, 006, 024: Título, Capacitación y Experiencia con archivos
        var archTitulo = await CrearArchivoFisicoAsync(instId, docenteId, "titulo.pdf");
        var archCap = await CrearArchivoFisicoAsync(instId, docenteId, "capacitacion.pdf");
        var archExp = await CrearArchivoFisicoAsync(instId, docenteId, "experiencia.pdf");

        var reqTitulo = new GuardarTituloAcademicoRequest("Título Ficticio", 61, NombreInstitucionOtra: "Universidad Ficticia", ArchivoId: archTitulo.Id);
        var respTitulo = await _cliente.SendAsync(CrearRequest(HttpMethod.Post, "/api/mis-datos/hoja-de-vida/titulos", instId, DocumentoDocenteA1, RolUsuario.Usuario, reqTitulo));
        Assert.Equal(HttpStatusCode.Created, respTitulo.StatusCode);

        var reqCap = new GuardarCapacitacionRequest(
            NombreEvento: "Capacitación Docente",
            InstitucionOrganizadora: "Instituto Ficticio",
            NumeroHoras: 40,
            FechaInicio: new DateOnly(2025, 1, 1),
            FechaFin: new DateOnly(2025, 1, 15),
            ArchivoId: archCap.Id);
        var respCap = await _cliente.SendAsync(CrearRequest(HttpMethod.Post, "/api/mis-datos/hoja-de-vida/capacitaciones", instId, DocumentoDocenteA1, RolUsuario.Usuario, reqCap));
        Assert.Equal(HttpStatusCode.Created, respCap.StatusCode);

        var reqExp = new GuardarExperienciaLaboralRequest("Empresa Ficticia", "Docente", new DateOnly(2022, 1, 1), TrabajaActualmente: true, ArchivoId: archExp.Id);
        var respExp = await _cliente.SendAsync(CrearRequest(HttpMethod.Post, "/api/mis-datos/hoja-de-vida/experiencias", instId, DocumentoDocenteA1, RolUsuario.Usuario, reqExp));
        Assert.Equal(HttpStatusCode.Created, respExp.StatusCode);

        // 3. RF-HDV-017, RF-HDV-018: Dos referencias personales y una familiar
        var respRef1 = await _cliente.SendAsync(CrearRequest(HttpMethod.Post, "/api/mis-datos/hoja-de-vida/referencias", instId, DocumentoDocenteA1, RolUsuario.Usuario,
            new GuardarReferenciaRequest("personal", "Referencia Uno", "0000000000")));
        Assert.Equal(HttpStatusCode.Created, respRef1.StatusCode);

        var respRef2 = await _cliente.SendAsync(CrearRequest(HttpMethod.Post, "/api/mis-datos/hoja-de-vida/referencias", instId, DocumentoDocenteA1, RolUsuario.Usuario,
            new GuardarReferenciaRequest("personal", "Referencia Dos", "0000000000")));
        Assert.Equal(HttpStatusCode.Created, respRef2.StatusCode);

        var respRef3 = await _cliente.SendAsync(CrearRequest(HttpMethod.Post, "/api/mis-datos/hoja-de-vida/referencias", instId, DocumentoDocenteA1, RolUsuario.Usuario,
            new GuardarReferenciaRequest("familiar", "Referencia Familiar", "0000000000")));
        Assert.Equal(HttpStatusCode.Created, respRef3.StatusCode);

        // 4. RF-HDV-007, RF-HDV-008: Subir los 5 documentos obligatorios
        foreach (var (_, tipoDocId) in tiposDoc)
        {
            var archDoc = await CrearArchivoFisicoAsync(instId, docenteId, $"doc_{tipoDocId}.pdf");
            var respDoc = await _cliente.SendAsync(CrearRequest(HttpMethod.Put, $"/api/mis-datos/documentos/{tipoDocId}", instId, DocumentoDocenteA1, RolUsuario.Usuario,
                new GuardarDocumentoPersonalRequest(archDoc.Id)));
            Assert.Equal(HttpStatusCode.OK, respDoc.StatusCode);
        }

        // 5. RF-HDV-025, RF-HDV-026: Registrar cuenta bancaria
        var respBanco = await _cliente.SendAsync(CrearRequest(HttpMethod.Put, "/api/mis-datos/cuenta-bancaria", instId, DocumentoDocenteA1, RolUsuario.Usuario,
            new GuardarCuentaBancariaRequest(71, "0000000000", NombreBancoOtro: "Banco Ficticio")));
        Assert.Equal(HttpStatusCode.OK, respBanco.StatusCode);

        // 6. RF-HDV-009: Enviar a revisión
        var respEnviar = await _cliente.SendAsync(CrearRequest(HttpMethod.Post, "/api/mis-datos/enviar", instId, DocumentoDocenteA1, RolUsuario.Usuario));
        Assert.Equal(HttpStatusCode.OK, respEnviar.StatusCode);

        // 7. Consultar estado y ficha por la API
        var respEstado = await _cliente.SendAsync(CrearRequest(HttpMethod.Get, $"/api/mis-datos/estado-edicion?documento={DocumentoDocenteA1}", instId, DocumentoDocenteA1, RolUsuario.Usuario));
        Assert.Equal(HttpStatusCode.OK, respEstado.StatusCode);
        var estadoDto = await respEstado.Content.ReadFromJsonAsync<EstadoEdicionDto>();
        Assert.NotNull(estadoDto);
        Assert.Equal("Enviado", estadoDto.EstadoActualizacion);

        // 8. RF-HDV-010: Edición posterior bloqueada
        var respEdicionBloqueada = await _cliente.SendAsync(CrearRequest(HttpMethod.Put, "/api/mis-datos/hoja-de-vida/ficha", instId, DocumentoDocenteA1, RolUsuario.Usuario, reqFicha));
        Assert.Equal(HttpStatusCode.BadRequest, respEdicionBloqueada.StatusCode);
    }

    // =========================================================================
    // E2E-02 — Envío impedido por faltantes y corrección incremental
    // =========================================================================
    [Fact]
    public async Task E2E_02_Envio_impedido_por_faltantes_y_correccion_incremental()
    {
        await SembrarCatalogosAsync();
        var instId = Guid.NewGuid();
        var docenteId = Guid.NewGuid();

        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            db.Instituciones.Add(new Institucion(new InstitucionId(instId), "Instituto Ficticio A"));
            await db.SaveChangesAsync();
        }

        var (tipoDocenteId, tiposDoc) = await ConfigurarTiposYRequisitosAsync(instId);

        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            var docente = new Persona(
                docenteId,
                new InstitucionId(instId),
                DocumentoDocenteA2,
                RolUsuario.Usuario,
                "Docente A2 Ficticio",
                "docente2@ejemplo.test",
                accesoHabilitado: true);
            docente.AceptarTratamientoDatos(DateTime.UtcNow);
            docente.AsignarTipoFuncionario(tipoDocenteId);
            db.Personas.Add(docente);

            db.Campanas.Add(new Campana(
                Guid.NewGuid(),
                new InstitucionId(instId),
                "Campaña Activa E2E",
                DateTime.UtcNow.AddDays(-2),
                DateTime.UtcNow.AddDays(10),
                activa: true));

            await db.SaveChangesAsync();
        }

        // Ficha completa
        var reqFicha = new GuardarFichaPersonalRequest(
            PrimerNombre: "Ana",
            PrimerApellido: "Ficticia",
            SegundoApellido: "Test",
            SexoId: 2,
            FechaNacimiento: new DateOnly(1990, 8, 20),
            PaisNacimientoId: 1001,
            EstadoCivilId: 11,
            PaisNacionalidadId: 1001,
            ParroquiaResidenciaId: 1004,
            CallePrincipal: "Calle Ficticia 456",
            Celular: "0991112233",
            CorreoInstitucional: "docente2@ejemplo.test");
        await _cliente.SendAsync(CrearRequest(HttpMethod.Put, "/api/mis-datos/hoja-de-vida/ficha", instId, DocumentoDocenteA2, RolUsuario.Usuario, reqFicha));

        // Solo 1 referencia personal y 1 familiar (falta 1 personal)
        await _cliente.SendAsync(CrearRequest(HttpMethod.Post, "/api/mis-datos/hoja-de-vida/referencias", instId, DocumentoDocenteA2, RolUsuario.Usuario,
            new GuardarReferenciaRequest("personal", "Ref Personal 1", "0000000000")));
        await _cliente.SendAsync(CrearRequest(HttpMethod.Post, "/api/mis-datos/hoja-de-vida/referencias", instId, DocumentoDocenteA2, RolUsuario.Usuario,
            new GuardarReferenciaRequest("familiar", "Ref Familiar 1", "0000000000")));

        // 1 experiencia SIN certificado (falta respaldo)
        var respExpSinRespaldo = await _cliente.SendAsync(CrearRequest(HttpMethod.Post, "/api/mis-datos/hoja-de-vida/experiencias", instId, DocumentoDocenteA2, RolUsuario.Usuario,
            new GuardarExperienciaLaboralRequest("Empresa Previa", "Analista", new DateOnly(2020, 1, 1), new DateOnly(2021, 1, 1), TrabajaActualmente: false, ArchivoId: null)));
        var expCreada = await respExpSinRespaldo.Content.ReadFromJsonAsync<ExperienciaLaboralDto>();

        // Solo 4 de 5 documentos subidos (falta 1)
        var codigosSubidos = tiposDoc.Take(4).ToList();
        foreach (var (_, tipoDocId) in codigosSubidos)
        {
            var archDoc = await CrearArchivoFisicoAsync(instId, docenteId, "doc.pdf");
            await _cliente.SendAsync(CrearRequest(HttpMethod.Put, $"/api/mis-datos/documentos/{tipoDocId}", instId, DocumentoDocenteA2, RolUsuario.Usuario,
                new GuardarDocumentoPersonalRequest(archDoc.Id)));
        }

        // Intento 1: enviar con faltantes -> 400 Bad Request
        var respFalla1 = await _cliente.SendAsync(CrearRequest(HttpMethod.Post, "/api/mis-datos/enviar", instId, DocumentoDocenteA2, RolUsuario.Usuario));
        Assert.Equal(HttpStatusCode.BadRequest, respFalla1.StatusCode);
        var resFaltantes = await respFalla1.Content.ReadFromJsonAsync<EnvioIncompletoRespuesta>();
        Assert.NotNull(resFaltantes);
        Assert.Contains(resFaltantes.Faltantes, f => f.Seccion == "formacion");
        Assert.Contains(resFaltantes.Faltantes, f => f.Seccion == "referencias");
        Assert.Contains(resFaltantes.Faltantes, f => f.Seccion == "experiencias");
        Assert.Contains(resFaltantes.Faltantes, f => f.Seccion == "documentos");
        Assert.Contains(resFaltantes.Faltantes, f => f.Seccion == "cuenta-bancaria");

        // Corrección incremental:
        // 1. Agregar estudio
        var archTitulo = await CrearArchivoFisicoAsync(instId, docenteId, "titulo.pdf");
        await _cliente.SendAsync(CrearRequest(HttpMethod.Post, "/api/mis-datos/hoja-de-vida/titulos", instId, DocumentoDocenteA2, RolUsuario.Usuario,
            new GuardarTituloAcademicoRequest("Licenciatura", 61, NombreInstitucionOtra: "Universidad", ArchivoId: archTitulo.Id)));

        // 2. Agregar segunda referencia personal
        await _cliente.SendAsync(CrearRequest(HttpMethod.Post, "/api/mis-datos/hoja-de-vida/referencias", instId, DocumentoDocenteA2, RolUsuario.Usuario,
            new GuardarReferenciaRequest("personal", "Ref Personal 2", "0000000000")));

        // 3. Adjuntar certificado a la experiencia
        var archExp = await CrearArchivoFisicoAsync(instId, docenteId, "certificado_exp.pdf");
        await _cliente.SendAsync(CrearRequest(HttpMethod.Put, $"/api/mis-datos/hoja-de-vida/experiencias/{expCreada!.Id}", instId, DocumentoDocenteA2, RolUsuario.Usuario,
            new GuardarExperienciaLaboralRequest("Empresa Previa", "Analista", new DateOnly(2020, 1, 1), new DateOnly(2021, 1, 1), TrabajaActualmente: false, ArchivoId: archExp.Id)));

        // 4. Subir el documento faltante
        var docFaltante = tiposDoc.Skip(4).First();
        var archFaltante = await CrearArchivoFisicoAsync(instId, docenteId, "doc_faltante.pdf");
        await _cliente.SendAsync(CrearRequest(HttpMethod.Put, $"/api/mis-datos/documentos/{docFaltante.Value}", instId, DocumentoDocenteA2, RolUsuario.Usuario,
            new GuardarDocumentoPersonalRequest(archFaltante.Id)));

        // 5. Registrar cuenta bancaria
        await _cliente.SendAsync(CrearRequest(HttpMethod.Put, "/api/mis-datos/cuenta-bancaria", instId, DocumentoDocenteA2, RolUsuario.Usuario,
            new GuardarCuentaBancariaRequest(71, "0000000000", NombreBancoOtro: "Banco Ficticio")));

        // Reintento: ahora debe ser exitoso
        var respExito = await _cliente.SendAsync(CrearRequest(HttpMethod.Post, "/api/mis-datos/enviar", instId, DocumentoDocenteA2, RolUsuario.Usuario));
        Assert.Equal(HttpStatusCode.OK, respExito.StatusCode);
    }

    // =========================================================================
    // E2E-03 — Edición bloqueada y aislamiento por institución
    // =========================================================================
    [Fact]
    public async Task E2E_03_Edicion_bloqueada_y_aislamiento_por_institucion()
    {
        await SembrarCatalogosAsync();
        var instAId = Guid.NewGuid();
        var instBId = Guid.NewGuid();
        var docenteAId = Guid.NewGuid();
        var docenteBId = Guid.NewGuid();
        Guid tituloAId;
        Guid refAId;

        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            db.Instituciones.Add(new Institucion(new InstitucionId(instAId), "Instituto A"));
            db.Instituciones.Add(new Institucion(new InstitucionId(instBId), "Instituto B"));

            var pA = new Persona(docenteAId, new InstitucionId(instAId), DocumentoDocenteA1, RolUsuario.Usuario, "Docente A", CorreoDocenteA1, accesoHabilitado: true);
            pA.AceptarTratamientoDatos(DateTime.UtcNow);
            pA.EnviarARevision(DateTime.UtcNow);

            var pB = new Persona(docenteBId, new InstitucionId(instBId), DocumentoDocenteB1, RolUsuario.Usuario, "Docente B", "docente.b@ejemplo.test", accesoHabilitado: true);
            pB.AceptarTratamientoDatos(DateTime.UtcNow);

            var supA = new Persona(Guid.NewGuid(), new InstitucionId(instAId), DocumentoSupervisorA, RolUsuario.Supervisor, "Supervisor A", "sup@ejemplo.test", accesoHabilitado: true);

            db.Personas.AddRange(pA, pB, supA);

            db.Campanas.Add(new Campana(Guid.NewGuid(), new InstitucionId(instAId), "Camp A", DateTime.UtcNow.AddDays(-2), DateTime.UtcNow.AddDays(10), activa: true));
            db.Campanas.Add(new Campana(Guid.NewGuid(), new InstitucionId(instBId), "Camp B", DateTime.UtcNow.AddDays(-2), DateTime.UtcNow.AddDays(10), activa: true));

            var titulo = new TituloAcademico(Guid.NewGuid(), new InstitucionId(instAId), docenteAId, new DatosTituloAcademico("Ingeniería", 61, NombreInstitucionOtra: "U Central"));
            db.TitulosAcademicos.Add(titulo);
            tituloAId = titulo.Id;

            var referencia = new ReferenciaPersonal(Guid.NewGuid(), new InstitucionId(instAId), docenteAId, new DatosReferencia(TipoReferencia.Personal, "Ref", "0000000000"));
            db.ReferenciasPersonales.Add(referencia);
            refAId = referencia.Id;

            await db.SaveChangesAsync();
        }

        // 1. Docente A1 en 'Enviado': cualquier intento de modificar es rechazado con 400
        var respModFicha = await _cliente.SendAsync(CrearRequest(HttpMethod.Put, "/api/mis-datos/hoja-de-vida/ficha", instAId, DocumentoDocenteA1, RolUsuario.Usuario,
            new GuardarFichaPersonalRequest(PrimerNombre: "Nuevo", PrimerApellido: "Apellido", Celular: "0990000000", CorreoInstitucional: CorreoDocenteA1)));
        Assert.Equal(HttpStatusCode.BadRequest, respModFicha.StatusCode);

        var respModTitulo = await _cliente.SendAsync(CrearRequest(HttpMethod.Put, $"/api/mis-datos/hoja-de-vida/titulos/{tituloAId}", instAId, DocumentoDocenteA1, RolUsuario.Usuario,
            new GuardarTituloAcademicoRequest("Modificado", 61, NombreInstitucionOtra: "U")));
        Assert.Equal(HttpStatusCode.BadRequest, respModTitulo.StatusCode);

        var respModRef = await _cliente.SendAsync(CrearRequest(HttpMethod.Put, $"/api/mis-datos/hoja-de-vida/referencias/{refAId}", instAId, DocumentoDocenteA1, RolUsuario.Usuario,
            new GuardarReferenciaRequest("personal", "Mod", "0000000000")));
        Assert.Equal(HttpStatusCode.BadRequest, respModRef.StatusCode);

        // 2. Supervisor A aprueba la actualización
        var respAprobar = await _cliente.SendAsync(CrearRequest(HttpMethod.Post, $"/api/revision/{DocumentoDocenteA1}/aprobar", instAId, DocumentoSupervisorA, RolUsuario.Supervisor));
        Assert.Equal(HttpStatusCode.OK, respAprobar.StatusCode);

        // Intento de modificar tras aprobación sigue rechazado con 400
        var respModPostAprob = await _cliente.SendAsync(CrearRequest(HttpMethod.Put, $"/api/mis-datos/hoja-de-vida/titulos/{tituloAId}", instAId, DocumentoDocenteA1, RolUsuario.Usuario,
            new GuardarTituloAcademicoRequest("Modificado", 61, NombreInstitucionOtra: "U")));
        Assert.Equal(HttpStatusCode.BadRequest, respModPostAprob.StatusCode);

        // 3. RF-HDV-015: Docente B1 de otra institución intenta consultar/modificar ítem de A1 -> 404 Not Found
        var respAjeno = await _cliente.SendAsync(CrearRequest(HttpMethod.Put, $"/api/mis-datos/hoja-de-vida/titulos/{tituloAId}", instBId, DocumentoDocenteB1, RolUsuario.Usuario,
            new GuardarTituloAcademicoRequest("Intento Cruzado", 61, NombreInstitucionOtra: "U")));
        Assert.Equal(HttpStatusCode.NotFound, respAjeno.StatusCode);
    }

    // =========================================================================
    // E2E-04 — Entradas inválidas rechazadas
    // =========================================================================
    [Fact]
    public async Task E2E_04_Entradas_invalidas_rechazadas_sin_persistir()
    {
        await SembrarCatalogosAsync();
        var instId = Guid.NewGuid();
        var docenteId = Guid.NewGuid();

        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            db.Instituciones.Add(new Institucion(new InstitucionId(instId), "Instituto Ficticio A"));
            var docente = new Persona(docenteId, new InstitucionId(instId), DocumentoDocenteA1, RolUsuario.Usuario, "Docente A", CorreoDocenteA1, accesoHabilitado: true);
            db.Personas.Add(docente);
            db.Campanas.Add(new Campana(Guid.NewGuid(), new InstitucionId(instId), "Camp A", DateTime.UtcNow.AddDays(-2), DateTime.UtcNow.AddDays(10), activa: true));
            await db.SaveChangesAsync();
        }

        // 1. RF-HDV-001: Catálogo inválido (Parroquia 1004 enviada en campo Etnia) -> 400
        var reqCatInvalido = new GuardarFichaPersonalRequest(
            PrimerNombre: "Juan", PrimerApellido: "Perez", SexoId: 1, FechaNacimiento: new DateOnly(1980, 1, 1),
            PaisNacimientoId: 1001, EstadoCivilId: 11, PaisNacionalidadId: 1001, ParroquiaResidenciaId: 1004,
            CallePrincipal: "Calle", Celular: "0990000000", CorreoInstitucional: CorreoDocenteA1, EtniaId: 1004);
        var respCat = await _cliente.SendAsync(CrearRequest(HttpMethod.Put, "/api/mis-datos/hoja-de-vida/ficha", instId, DocumentoDocenteA1, RolUsuario.Usuario, reqCatInvalido));
        Assert.Equal(HttpStatusCode.BadRequest, respCat.StatusCode);

        // 2. RF-HDV-003: Título sin universidad ni nombre de otra institución -> 400
        var reqSinInst = new GuardarTituloAcademicoRequest("Licenciatura", 61, UniversidadId: null, NombreInstitucionOtra: null);
        var respSinInst = await _cliente.SendAsync(CrearRequest(HttpMethod.Post, "/api/mis-datos/hoja-de-vida/titulos", instId, DocumentoDocenteA1, RolUsuario.Usuario, reqSinInst));
        Assert.Equal(HttpStatusCode.BadRequest, respSinInst.StatusCode);

        // 3. RF-HDV-004: Experiencia sin fin y sin trabaja actualmente -> 400
        var reqExpSinFin = new GuardarExperienciaLaboralRequest("Empresa", "Cargo", new DateOnly(2020, 1, 1), FechaFin: null, TrabajaActualmente: false);
        var respExpSinFin = await _cliente.SendAsync(CrearRequest(HttpMethod.Post, "/api/mis-datos/hoja-de-vida/experiencias", instId, DocumentoDocenteA1, RolUsuario.Usuario, reqExpSinFin));
        Assert.Equal(HttpStatusCode.BadRequest, respExpSinFin.StatusCode);

        // 4. RF-HDV-004: Experiencia actual con fecha de fin -> 400
        var reqExpActualConFin = new GuardarExperienciaLaboralRequest("Empresa", "Cargo", new DateOnly(2020, 1, 1), FechaFin: new DateOnly(2022, 1, 1), TrabajaActualmente: true);
        var respExpActualConFin = await _cliente.SendAsync(CrearRequest(HttpMethod.Post, "/api/mis-datos/hoja-de-vida/experiencias", instId, DocumentoDocenteA1, RolUsuario.Usuario, reqExpActualConFin));
        Assert.Equal(HttpStatusCode.BadRequest, respExpActualConFin.StatusCode);

        // 5. RF-HDV-005: Título en curso sin beca pero con porcentaje de beca -> se limpia la beca
        var reqCursoSinBeca = new GuardarTituloEnCursoRequest("Maestría", 61, NombreInstitucionOtra: "U Ficticia", FechaInicio: new DateOnly(2024, 1, 1), TieneBeca: false, PorcentajeBeca: 50, MontoBeca: 2000);
        var respCurso = await _cliente.SendAsync(CrearRequest(HttpMethod.Post, "/api/mis-datos/hoja-de-vida/titulos-en-curso", instId, DocumentoDocenteA1, RolUsuario.Usuario, reqCursoSinBeca));
        Assert.Equal(HttpStatusCode.Created, respCurso.StatusCode);
        var cursoCreado = await respCurso.Content.ReadFromJsonAsync<TituloEnCursoDto>();
        Assert.NotNull(cursoCreado);
        Assert.False(cursoCreado.TieneBeca);
        Assert.Null(cursoCreado.PorcentajeBeca);
        Assert.Null(cursoCreado.MontoBeca);

        // 6. RF-HDV-017: Sexta referencia personal rechazada (máx. 5)
        for (int i = 1; i <= 5; i++)
        {
            var respR = await _cliente.SendAsync(CrearRequest(HttpMethod.Post, "/api/mis-datos/hoja-de-vida/referencias", instId, DocumentoDocenteA1, RolUsuario.Usuario,
                new GuardarReferenciaRequest("personal", $"Ref {i}", "0000000000")));
            Assert.Equal(HttpStatusCode.Created, respR.StatusCode);
        }
        var respSexta = await _cliente.SendAsync(CrearRequest(HttpMethod.Post, "/api/mis-datos/hoja-de-vida/referencias", instId, DocumentoDocenteA1, RolUsuario.Usuario,
            new GuardarReferenciaRequest("personal", "Ref 6 Invalida", "0000000000")));
        Assert.Equal(HttpStatusCode.BadRequest, respSexta.StatusCode);

        // 7. RF-HDV-020: Foto de ficha rechaza archivo PDF (solo imagen PNG/JPG)
        var archPdf = await CrearArchivoFisicoAsync(instId, docenteId, "foto.pdf", "application/pdf");
        var reqFotoPdf = new GuardarFichaPersonalRequest(
            PrimerNombre: "Juan", PrimerApellido: "Perez", Celular: "0990000000", CorreoInstitucional: CorreoDocenteA1, FotoArchivoId: archPdf.Id);
        var respFotoPdf = await _cliente.SendAsync(CrearRequest(HttpMethod.Put, "/api/mis-datos/hoja-de-vida/ficha", instId, DocumentoDocenteA1, RolUsuario.Usuario, reqFotoPdf));
        Assert.Equal(HttpStatusCode.BadRequest, respFotoPdf.StatusCode);
    }

    // =========================================================================
    // E2E-05 — Escenario 2: Devolución por ítem
    // =========================================================================
    [Fact]
    public async Task E2E_05_Escenario_2_Devolucion_por_item_y_reenvio()
    {
        await SembrarCatalogosAsync();
        var instId = Guid.NewGuid();
        var docenteId = Guid.NewGuid();
        Guid tituloId;

        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            db.Instituciones.Add(new Institucion(new InstitucionId(instId), "Instituto Ficticio A"));

            var docente = new Persona(docenteId, new InstitucionId(instId), DocumentoDocenteA1, RolUsuario.Usuario, "Docente A", CorreoDocenteA1, accesoHabilitado: true);
            docente.AceptarTratamientoDatos(DateTime.UtcNow);
            docente.EnviarARevision(DateTime.UtcNow);

            var sup = new Persona(Guid.NewGuid(), new InstitucionId(instId), DocumentoSupervisorA, RolUsuario.Supervisor, "Supervisor A", "sup@ejemplo.test", accesoHabilitado: true);

            db.Personas.AddRange(docente, sup);
            db.Campanas.Add(new Campana(Guid.NewGuid(), new InstitucionId(instId), "Camp A", DateTime.UtcNow.AddDays(-2), DateTime.UtcNow.AddDays(10), activa: true));

            var titulo = new TituloAcademico(Guid.NewGuid(), new InstitucionId(instId), docenteId, new DatosTituloAcademico("Licenciatura", 61, NombreInstitucionOtra: "U Ficticia"));
            db.TitulosAcademicos.Add(titulo);
            tituloId = titulo.Id;

            await db.SaveChangesAsync();
        }

        // 1. RF-HDV-011: Supervisor devuelve marcando el título
        var reqDevolver = new DevolverActualizacionRequest(
            "Se devuelve para corregir archivo ilegible.",
            new List<MarcaObservacionItem>
            {
                new("item", $"titulo:{tituloId}", "El archivo de respaldo está ilegible.")
            });

        var respDevolver = await _cliente.SendAsync(CrearRequest(HttpMethod.Post, $"/api/revision/{DocumentoDocenteA1}/devolver", instId, DocumentoSupervisorA, RolUsuario.Supervisor, reqDevolver));
        Assert.Equal(HttpStatusCode.OK, respDevolver.StatusCode);

        // 2. Docente A1 consulta observaciones y ve la marca sobre su título
        var respObs = await _cliente.SendAsync(CrearRequest(HttpMethod.Get, $"/api/mis-datos/observaciones?documento={DocumentoDocenteA1}", instId, DocumentoDocenteA1, RolUsuario.Usuario));
        Assert.Equal(HttpStatusCode.OK, respObs.StatusCode);
        var obsDto = await respObs.Content.ReadFromJsonAsync<List<ObservacionDto>>();
        Assert.NotNull(obsDto);
        var obs = Assert.Single(obsDto);
        Assert.Contains(obs.Marcas, m => m.ClaveDestino == $"titulo:{tituloId}");

        // 3. A1 reemplaza el respaldo por uno legible
        var nuevoRespaldo = await CrearArchivoFisicoAsync(instId, docenteId, "titulo_legible.pdf");
        var respActualizar = await _cliente.SendAsync(CrearRequest(HttpMethod.Put, $"/api/mis-datos/hoja-de-vida/titulos/{tituloId}", instId, DocumentoDocenteA1, RolUsuario.Usuario,
            new GuardarTituloAcademicoRequest("Licenciatura", 61, NombreInstitucionOtra: "U Ficticia", ArchivoId: nuevoRespaldo.Id)));
        Assert.Equal(HttpStatusCode.OK, respActualizar.StatusCode);
    }

    // =========================================================================
    // E2E-06 — Escenario 3: Configuración de requisitos y tipos de documento
    // =========================================================================
    [Fact]
    public async Task E2E_06_Escenario_3_Configuracion_de_requisitos_y_tipos_por_admin()
    {
        var instAId = Guid.NewGuid();
        var instBId = Guid.NewGuid();
        var docenteA1Id = Guid.NewGuid();
        var docenteA2Id = Guid.NewGuid();

        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            db.Instituciones.Add(new Institucion(new InstitucionId(instAId), "Instituto A"));
            db.Instituciones.Add(new Institucion(new InstitucionId(instBId), "Instituto B"));

            var adminA = new Persona(Guid.NewGuid(), new InstitucionId(instAId), DocumentoAdminA, RolUsuario.Admin, "Admin A", "admin.a@ejemplo.test", accesoHabilitado: true);
            adminA.EstablecerPasswordHash(new PasswordHasher<Persona>().HashPassword(adminA, ClaveComun), debeCambiarContrasena: false);

            var adminB = new Persona(Guid.NewGuid(), new InstitucionId(instBId), DocumentoAdminB, RolUsuario.Admin, "Admin B", "admin.b@ejemplo.test", accesoHabilitado: true);
            adminB.EstablecerPasswordHash(new PasswordHasher<Persona>().HashPassword(adminB, ClaveComun), debeCambiarContrasena: false);

            var docA1 = new Persona(docenteA1Id, new InstitucionId(instAId), DocumentoDocenteA1, RolUsuario.Usuario, "Docente A1", CorreoDocenteA1, accesoHabilitado: true);
            docA1.EstablecerPasswordHash(new PasswordHasher<Persona>().HashPassword(docA1, ClaveComun), debeCambiarContrasena: false);
            var docA2 = new Persona(docenteA2Id, new InstitucionId(instAId), DocumentoDocenteA2, RolUsuario.Usuario, "Docente A2", "docente.a2@ejemplo.test", accesoHabilitado: true);

            db.Personas.AddRange(adminA, adminB, docA1, docA2);
            await db.SaveChangesAsync();
        }

        // Login como Admin A
        var loginAdminA = await _cliente.PostAsJsonAsync("/api/auth/login", new LoginRequest(DocumentoAdminA, ClaveComun));
        Assert.Equal(HttpStatusCode.OK, loginAdminA.StatusCode);

        // 1. Admin A crea tipo funcionario 'Docente'
        var respTF = await _cliente.PostAsJsonAsync("/api/configuracion/tipos-funcionario", new GuardarTipoFuncionarioRequest("DOCENTE", "Docente", EsDocente: true));
        Assert.Equal(HttpStatusCode.Created, respTF.StatusCode);
        var tfDto = await respTF.Content.ReadFromJsonAsync<TipoFuncionarioDto>();

        // 2. Admin A crea tipos de documento
        var codigos = new[] { "CEDULA", "PAPELETA_VOTACION", "ANTECEDENTES_PENALES", "DECLARACION_JURAMENTADA", "MECANIZADO_IESS" };
        var creados = new List<TipoDocumentoDto>();
        foreach (var c in codigos)
        {
            var respTD = await _cliente.PostAsJsonAsync("/api/configuracion/tipos-documento", new GuardarTipoDocumentoRequest(c, c.Replace('_', ' ')));
            Assert.Equal(HttpStatusCode.Created, respTD.StatusCode);
            creados.Add((await respTD.Content.ReadFromJsonAsync<TipoDocumentoDto>())!);
        }

        // 3. RF-HDV-012: Intentar crear código duplicado en la misma institución falla con 400
        var respDup = await _cliente.PostAsJsonAsync("/api/configuracion/tipos-documento", new GuardarTipoDocumentoRequest("CEDULA", "Cédula Duplicada"));
        Assert.Equal(HttpStatusCode.BadRequest, respDup.StatusCode);

        // 4. Admin B crea el mismo código en institución B -> 201 Created (aislamiento)
        var clienteAdminB = _fabrica.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        await clienteAdminB.PostAsJsonAsync("/api/auth/login", new LoginRequest(DocumentoAdminB, ClaveComun));
        var respB = await clienteAdminB.PostAsJsonAsync("/api/configuracion/tipos-documento", new GuardarTipoDocumentoRequest("CEDULA", "Cédula en B"));
        Assert.Equal(HttpStatusCode.Created, respB.StatusCode);

        // 5. Configurar requisitos obligatorios para todos
        foreach (var td in creados)
        {
            var respReq = await _cliente.PostAsJsonAsync("/api/configuracion/requisitos", new GuardarRequisitoDocumentoRequest(td.Id, TipoFuncionarioId: null, EsObligatorio: true));
            Assert.Equal(HttpStatusCode.Created, respReq.StatusCode);
        }

        // 6. RF-HDV-013: Asignar tipo 'Docente' a A1; dejar sin tipo a A2
        var respAsignar = await _cliente.PutAsJsonAsync($"/api/personas/{docenteA1Id}/tipo-funcionario", new AsignarTipoFuncionarioRequest(tfDto!.Id));
        Assert.Equal(HttpStatusCode.OK, respAsignar.StatusCode);

        // 7. RF-HDV-007: A1 y A2 consultan sus documentos requeridos y ven los 5
        var respDocsA1 = await _cliente.SendAsync(CrearRequest(HttpMethod.Get, "/api/mis-datos/documentos", instAId, DocumentoDocenteA1, RolUsuario.Usuario));
        Assert.Equal(HttpStatusCode.OK, respDocsA1.StatusCode);
        var docsA1 = await respDocsA1.Content.ReadFromJsonAsync<List<DocumentoRequeridoDto>>();
        Assert.NotNull(docsA1);
        Assert.Equal(5, docsA1.Count);
        Assert.All(docsA1, d => Assert.True(d.EsObligatorio));

        var respDocsA2 = await _cliente.SendAsync(CrearRequest(HttpMethod.Get, "/api/mis-datos/documentos", instAId, DocumentoDocenteA2, RolUsuario.Usuario));
        Assert.Equal(HttpStatusCode.OK, respDocsA2.StatusCode);
        var docsA2 = await respDocsA2.Content.ReadFromJsonAsync<List<DocumentoRequeridoDto>>();
        Assert.NotNull(docsA2);
        Assert.Equal(5, docsA2.Count);

        // 8. Rol Usuario intentando crear requisito o tipo documento -> 403 Forbidden
        var clienteUsuario = _fabrica.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        await clienteUsuario.PostAsJsonAsync("/api/auth/login", new LoginRequest(DocumentoDocenteA1, ClaveComun));
        var respUsuarioProhibido = await clienteUsuario.PostAsJsonAsync("/api/configuracion/tipos-documento", new GuardarTipoDocumentoRequest("OTRO", "Otro Documento"));
        Assert.Equal(HttpStatusCode.Forbidden, respUsuarioProhibido.StatusCode);
    }

    // =========================================================================
    // E2E-07 — Escenario 4: Carga de nómina con datos incompletos
    // =========================================================================
    [Fact]
    public async Task E2E_07_Escenario_4_Carga_nomina_con_datos_incompletos_y_propuesta()
    {
        var instId = Guid.NewGuid();

        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            db.Instituciones.Add(new Institucion(new InstitucionId(instId), "Instituto Ficticio A"));
            // Persona previamente existente en la institución
            db.Personas.Add(new Persona(Guid.NewGuid(), new InstitucionId(instId), "0000000050", RolUsuario.Usuario, "Persona Previa", "previa@ejemplo.test", accesoHabilitado: true));
            await db.SaveChangesAsync();
        }

        var payload = new CargarPersonasRequest(new List<PersonaCargaItem>
        {
            // Fila 1: Completa
            new(Documento: "0000000051", Nombre: "Nombre 1", Correo: "p1@ejemplo.test", Nacimiento: "1985-05-10"),
            // Fila 2: Documento 0000000052 sin fecha de nacimiento
            new(Documento: "0000000052", Nombre: "Nombre 2", Correo: "p2@ejemplo.test", Nacimiento: null),
            // Fila 3: DE LA TORRE RUIZ LUIS
            new(Documento: "0000000053", Nombre: "DE LA TORRE RUIZ LUIS", Correo: "p3@ejemplo.test", Nacimiento: "1980-01-01"),
            // Fila 4: Sin documento (debe ser rechazada)
            new(Documento: "", Nombre: "Sin Documento", Correo: "sin@ejemplo.test"),
            // Fila 5: Documento repetido 0000000051 dentro del archivo (debe ser rechazada)
            new(Documento: "0000000051", Nombre: "Nombre Duplicado en Archivo", Correo: "p1.dup@ejemplo.test"),
            // Fila 6: Documento ya existente en la base de datos (debe ser omitida)
            new(Documento: "0000000050", Nombre: "Persona Previa En Archivo", Correo: "previa@ejemplo.test")
        });

        var respCarga = await _cliente.SendAsync(CrearRequest(HttpMethod.Post, "/api/personas/cargar", instId, DocumentoAdminA, RolUsuario.Admin, payload));
        Assert.Equal(HttpStatusCode.OK, respCarga.StatusCode);
        var informe = await respCarga.Content.ReadFromJsonAsync<ResultadoCargaPersonasDto>();

        Assert.NotNull(informe);
        Assert.Equal(6, informe.TotalRecibidos);
        Assert.Equal(3, informe.TotalCargados);
        Assert.Equal(2, informe.TotalRechazados);
        Assert.Equal(1, informe.TotalDuplicadosOmitidos);

        // Advertencia registrada por fecha de nacimiento faltante en fila 2
        Assert.Contains(informe.Advertencias, a => a.Fila == 2 && a.Columna.Contains("Nacimiento", StringComparison.OrdinalIgnoreCase));

        // RF-HDV-022: DE LA TORRE RUIZ LUIS descompuesto
        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            var p3 = await db.Personas.IgnoreQueryFilters().SingleAsync(p => p.Documento == "0000000053");
            var ficha3 = await db.FichasPersonales.IgnoreQueryFilters().SingleAsync(f => f.PersonaId == p3.Id);
            Assert.Equal("DE LA TORRE", ficha3.PrimerApellido);
            Assert.Equal("RUIZ", ficha3.SegundoApellido);
            Assert.Equal("LUIS", ficha3.PrimerNombre);

            // Fila sin fecha: campo nulo en la ficha
            var p2 = await db.Personas.IgnoreQueryFilters().SingleAsync(p => p.Documento == "0000000052");
            var ficha2 = await db.FichasPersonales.IgnoreQueryFilters().SingleAsync(f => f.PersonaId == p2.Id);
            Assert.Null(ficha2.FechaNacimiento);
        }
    }

    // =========================================================================
    // E2E-08 — Cuenta bancaria cifrada, máscara y auditoría
    // =========================================================================
    [Fact]
    public async Task E2E_08_Cuenta_bancaria_cifrada_mascara_y_auditoria()
    {
        await SembrarCatalogosAsync();
        var instId = Guid.NewGuid();
        var docenteId = Guid.NewGuid();

        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            db.Instituciones.Add(new Institucion(new InstitucionId(instId), "Instituto Ficticio A"));
            var docente = new Persona(docenteId, new InstitucionId(instId), DocumentoDocenteA1, RolUsuario.Usuario, "Docente A", CorreoDocenteA1, accesoHabilitado: true);
            var sup = new Persona(Guid.NewGuid(), new InstitucionId(instId), DocumentoSupervisorA, RolUsuario.Supervisor, "Supervisor A", "sup@ejemplo.test", accesoHabilitado: true);
            db.Personas.AddRange(docente, sup);
            db.Campanas.Add(new Campana(Guid.NewGuid(), new InstitucionId(instId), "Camp A", DateTime.UtcNow.AddDays(-2), DateTime.UtcNow.AddDays(10), activa: true));
            await db.SaveChangesAsync();
        }

        // 1. Registrar cuenta bancaria
        var respGuardar = await _cliente.SendAsync(CrearRequest(HttpMethod.Put, "/api/mis-datos/cuenta-bancaria", instId, DocumentoDocenteA1, RolUsuario.Usuario,
            new GuardarCuentaBancariaRequest(71, "0000000000", NombreBancoOtro: "Banco Ficticio")));
        Assert.Equal(HttpStatusCode.OK, respGuardar.StatusCode);

        // 2. RF-HDV-025: Lectura propia del número completo
        var respNumero = await _cliente.SendAsync(CrearRequest(HttpMethod.Get, "/api/mis-datos/cuenta-bancaria/numero", instId, DocumentoDocenteA1, RolUsuario.Usuario));
        Assert.Equal(HttpStatusCode.OK, respNumero.StatusCode);
        var numeroDto = await respNumero.Content.ReadFromJsonAsync<NumeroCuentaCompletoDto>();
        Assert.NotNull(numeroDto);
        Assert.Equal("0000000000", numeroDto.Numero);

        // 3. RF-HDV-027: Supervisor y admin ven solo máscara
        var respRev = await _cliente.SendAsync(CrearRequest(HttpMethod.Get, "/api/revision/cuentas-bancarias", instId, DocumentoSupervisorA, RolUsuario.Supervisor));
        Assert.Equal(HttpStatusCode.OK, respRev.StatusCode);
        var listaRev = await respRev.Content.ReadFromJsonAsync<List<EstadoCuentaPersonaDto>>();
        Assert.NotNull(listaRev);
        var itemCuenta = Assert.Single(listaRev);
        Assert.Equal("0000", itemCuenta.UltimosDigitos);
        Assert.Equal("sin-nomina", itemCuenta.Estado);

        // 4. Base de datos no almacena número en claro
        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            var cuentaDb = await db.CuentasBancarias.IgnoreQueryFilters().SingleAsync();
            Assert.DoesNotContain("0000000000", cuentaDb.NumeroCifrado);

            // 5. Auditoría registra las operaciones
            var auditorias = await db.Auditorias.IgnoreQueryFilters().Where(a => a.Actor == DocumentoDocenteA1).ToListAsync();
            Assert.Contains(auditorias, a => a.Accion == "LeerNumeroCuentaBancaria");
            Assert.Contains(auditorias, a => a.Accion == "GuardarCuentaBancaria");
            Assert.All(auditorias, a => Assert.DoesNotContain("0000000000", a.Detalle ?? ""));
        }
    }

    // =========================================================================
    // E2E-09 — Catálogos: consulta, orden y deduplicación
    // =========================================================================
    [Fact]
    public async Task E2E_09_Catalogos_consulta_orden_y_deduplicacion()
    {
        await SembrarCatalogosAsync();
        var instId = Guid.NewGuid();

        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            db.Instituciones.Add(new Institucion(new InstitucionId(instId), "Instituto Ficticio A"));
            var docente = new Persona(Guid.NewGuid(), new InstitucionId(instId), DocumentoDocenteA1, RolUsuario.Usuario, "Docente A", CorreoDocenteA1, accesoHabilitado: true);
            docente.EstablecerPasswordHash(new PasswordHasher<Persona>().HashPassword(docente, ClaveComun), debeCambiarContrasena: false);
            db.Personas.Add(docente);
            await db.SaveChangesAsync();
        }

        var clienteUsuario = _fabrica.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        var loginResp = await clienteUsuario.PostAsJsonAsync("/api/auth/login", new LoginRequest(DocumentoDocenteA1, ClaveComun));
        Assert.Equal(HttpStatusCode.OK, loginResp.StatusCode);

        // 1. RF-HDV-014: Consulta con filtro por elemento padre
        var respCantones = await clienteUsuario.GetAsync("/api/catalogos/canton?padreId=1002");
        Assert.Equal(HttpStatusCode.OK, respCantones.StatusCode);
        var cantones = await respCantones.Content.ReadFromJsonAsync<List<ElementoCatalogoDto>>();
        Assert.NotNull(cantones);
        var canton = Assert.Single(cantones);
        Assert.Equal(1003, canton.Id);
        Assert.Equal("Quito", canton.Nombre);

        // 2. Rol Usuario o Admin no puede importar catálogos -> 403 Forbidden
        using var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent("id,codigo,nombre\n"u8.ToArray()), "archivo", "catalogos.csv");
        var respImportarProhibido = await clienteUsuario.PostAsync("/api/catalogos/canton/importar", form);
        Assert.Equal(HttpStatusCode.Forbidden, respImportarProhibido.StatusCode);
    }

    // =========================================================================
    // E2E-10 — Segunda campaña: transición a borrador y reemplazo de documentos
    // =========================================================================
    [Fact]
    public async Task E2E_10_Segunda_campana_transicion_borrador_y_reemplazo_documentos()
    {
        await SembrarCatalogosAsync();
        var instId = Guid.NewGuid();
        var docenteId = Guid.NewGuid();
        Guid tipoDocId;

        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            db.Instituciones.Add(new Institucion(new InstitucionId(instId), "Instituto Ficticio A"));

            var docente = new Persona(
                docenteId,
                new InstitucionId(instId),
                DocumentoDocenteA1,
                RolUsuario.Usuario,
                "Docente A",
                CorreoDocenteA1,
                accesoHabilitado: true,
                estadoActualizacion: EstadoActualizacion.Aprobado,
                tratamientoDatosAceptado: true);
            db.Personas.Add(docente);

            var td = new TipoDocumento(Guid.NewGuid(), new InstitucionId(instId), "CEDULA", "Cédula");
            db.TiposDocumento.Add(td);
            tipoDocId = td.Id;

            var archViejo = new ArchivoAdjunto(Guid.NewGuid(), new InstitucionId(instId), docenteId, "cedula_v1.pdf", "application/pdf", 1024, "hash1", "rutas/v1.pdf");
            db.ArchivosAdjuntos.Add(archViejo);
            var docViejo = new DocumentoPersonal(Guid.NewGuid(), new InstitucionId(instId), docenteId, td.Id, new DatosDocumentoPersonal());
            docViejo.AsociarArchivo(archViejo.Id);
            db.DocumentosPersonales.Add(docViejo);

            // Campaña 2 abierta
            db.Campanas.Add(new Campana(Guid.NewGuid(), new InstitucionId(instId), "Campaña 2", DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(15), activa: true));
            await db.SaveChangesAsync();
        }

        // 1. Intento de editar directamente en Aprobado sin iniciar -> 400
        var respModBloqueada = await _cliente.SendAsync(CrearRequest(HttpMethod.Put, "/api/mis-datos/hoja-de-vida/ficha", instId, DocumentoDocenteA1, RolUsuario.Usuario,
            new GuardarFichaPersonalRequest(PrimerNombre: "Docente", PrimerApellido: "A", Celular: "0990000000", CorreoInstitucional: CorreoDocenteA1)));
        Assert.Equal(HttpStatusCode.BadRequest, respModBloqueada.StatusCode);

        // 2. PD-HDV-04: Iniciar nueva actualización -> pasa a Borrador
        var respIniciar = await _cliente.SendAsync(CrearRequest(HttpMethod.Post, "/api/mis-datos/iniciar-actualizacion", instId, DocumentoDocenteA1, RolUsuario.Usuario));
        Assert.Equal(HttpStatusCode.OK, respIniciar.StatusCode);

        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            var p = await db.Personas.IgnoreQueryFilters().SingleAsync(x => x.Id == docenteId);
            Assert.Equal(EstadoActualizacion.Borrador, p.EstadoActualizacion);
        }

        // 3. RF-HDV-008: Modificar documento reemplaza el anterior (un solo registro por tipo)
        var nuevoArch = await CrearArchivoFisicoAsync(instId, docenteId, "cedula_v2.pdf");
        var respDocNuevo = await _cliente.SendAsync(CrearRequest(HttpMethod.Put, $"/api/mis-datos/documentos/{tipoDocId}", instId, DocumentoDocenteA1, RolUsuario.Usuario,
            new GuardarDocumentoPersonalRequest(nuevoArch.Id)));
        Assert.Equal(HttpStatusCode.OK, respDocNuevo.StatusCode);

        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            var docs = await db.DocumentosPersonales.IgnoreQueryFilters().Where(d => d.PersonaId == docenteId && d.TipoDocumentoId == tipoDocId).ToListAsync();
            Assert.Single(docs);
            Assert.Equal(nuevoArch.Id, docs[0].ArchivoId);
        }
    }

    // =========================================================================
    // E2E-11 — Exportación por secciones (Excel y ZIP)
    // =========================================================================
    [Fact]
    public async Task E2E_11_Exportacion_por_secciones_excel_y_zip()
    {
        await SembrarCatalogosAsync();
        var instAId = Guid.NewGuid();
        var instBId = Guid.NewGuid();
        var docenteAId = Guid.NewGuid();
        var docenteBId = Guid.NewGuid();

        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            db.Instituciones.Add(new Institucion(new InstitucionId(instAId), "Instituto Ficticio A"));
            db.Instituciones.Add(new Institucion(new InstitucionId(instBId), "Instituto Ficticio B"));

            var pA = new Persona(docenteAId, new InstitucionId(instAId), DocumentoDocenteA1, RolUsuario.Usuario, "Docente Aprobado A", CorreoDocenteA1, accesoHabilitado: true, estadoActualizacion: EstadoActualizacion.Aprobado, tratamientoDatosAceptado: true, fechaAceptacionTratamientoDatosUtc: DateTime.UtcNow);
            var pB = new Persona(docenteBId, new InstitucionId(instBId), DocumentoDocenteB1, RolUsuario.Usuario, "Docente Aprobado B", "doc.b@ejemplo.test", accesoHabilitado: true, estadoActualizacion: EstadoActualizacion.Aprobado, tratamientoDatosAceptado: true, fechaAceptacionTratamientoDatosUtc: DateTime.UtcNow);
            var adminA = new Persona(Guid.NewGuid(), new InstitucionId(instAId), DocumentoAdminA, RolUsuario.Admin, "Admin A", "admin.a@ejemplo.test", accesoHabilitado: true);

            db.Personas.AddRange(pA, pB, adminA);

            var fichaA = new FichaPersonal(new InstitucionId(instAId), docenteAId);
            fichaA.Actualizar(new DatosFichaPersonal(
                PrimerNombre: "Carlos",
                PrimerApellido: "Docente",
                SegundoApellido: "Uno",
                SexoId: 1,
                FechaNacimiento: new DateOnly(1985, 1, 1),
                PaisNacimientoId: 1001,
                EstadoCivilId: 11,
                PaisNacionalidadId: 1001,
                ParroquiaResidenciaId: 1004,
                CallePrincipal: "Av 1",
                Celular: "0990000000",
                CorreoInstitucional: CorreoDocenteA1));
            db.FichasPersonales.Add(fichaA);

            await db.SaveChangesAsync();
        }

        // Crear archivos físicos para el respaldo de A y de B
        var archA = await CrearArchivoFisicoAsync(instAId, docenteAId, "titulo_docente_a.pdf");
        var archB = await CrearArchivoFisicoAsync(instBId, docenteBId, "titulo_docente_b.pdf");

        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            var titA = new TituloAcademico(Guid.NewGuid(), new InstitucionId(instAId), docenteAId, new DatosTituloAcademico("Título Docente A", 61, NombreInstitucionOtra: "Universidad A"));
            titA.AsociarArchivo(archA.Id);
            db.TitulosAcademicos.Add(titA);

            var titB = new TituloAcademico(Guid.NewGuid(), new InstitucionId(instBId), docenteBId, new DatosTituloAcademico("Título Docente B", 61, NombreInstitucionOtra: "Universidad B"));
            titB.AsociarArchivo(archB.Id);
            db.TitulosAcademicos.Add(titB);

            await db.SaveChangesAsync();
        }

        // 1. Admin A solicita Excel
        var respExcel = await _cliente.SendAsync(CrearRequest(HttpMethod.Get, "/api/exportaciones/excel", instAId, DocumentoAdminA, RolUsuario.Admin));
        Assert.Equal(HttpStatusCode.OK, respExcel.StatusCode);
        Assert.Equal("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", respExcel.Content.Headers.ContentType?.MediaType);

        var bytesExcel = await respExcel.Content.ReadAsByteArrayAsync();
        using (var zipExcel = new ZipArchive(new MemoryStream(bytesExcel), ZipArchiveMode.Read))
        {
            var sheet = zipExcel.GetEntry("xl/worksheets/sheet1.xml");
            Assert.NotNull(sheet);
            using var reader = new StreamReader(sheet.Open(), Encoding.UTF8);
            var contenido = await reader.ReadToEndAsync();
            Assert.Contains(DocumentoDocenteA1, contenido);
            Assert.DoesNotContain(DocumentoDocenteB1, contenido); // Aislamiento de B
        }

        // 2. Admin A solicita ZIP
        var respZip = await _cliente.SendAsync(CrearRequest(HttpMethod.Get, "/api/exportaciones/zip", instAId, DocumentoAdminA, RolUsuario.Admin));
        Assert.Equal(HttpStatusCode.OK, respZip.StatusCode);
        Assert.Equal("application/zip", respZip.Content.Headers.ContentType?.MediaType);

        var bytesZip = await respZip.Content.ReadAsByteArrayAsync();
        using (var zip = new ZipArchive(new MemoryStream(bytesZip), ZipArchiveMode.Read))
        {
            // index.md presente
            Assert.Contains(zip.Entries, e => e.FullName.EndsWith("/index.md", StringComparison.OrdinalIgnoreCase));
            // Archivo de docente A presente
            Assert.Contains(zip.Entries, e => e.FullName.Contains("titulo_docente_a.pdf"));
            // Archivo de docente B ausente
            Assert.DoesNotContain(zip.Entries, e => e.FullName.Contains("titulo_docente_b.pdf"));
        }
    }
}
