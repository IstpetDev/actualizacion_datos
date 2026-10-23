namespace Istpet.ActualizacionDatos.WebApi.Tests;

using System.IO.Compression;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Multitenancy;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

public sealed class Spec0001E2ETests : IDisposable
{
    private readonly SqliteConnection _conexion;
    private readonly WebApplicationFactory<Program> _fabrica;
    private readonly HttpClient _cliente;

    public Spec0001E2ETests()
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

    private static async Task AgregarHojaDeVidaCompletaAsync(AplicacionDbContext db, Guid institucionId, Guid personaId, string correo)
    {
        if (!await db.ElementosCatalogo.AnyAsync(e => e.Id == 903))
        {
            db.ElementosCatalogo.Add(new ElementoCatalogo(903, TipoCatalogo.Pais, "EC", "Ecuador"));
            db.ElementosCatalogo.Add(new ElementoCatalogo(906, TipoCatalogo.Provincia, "PICHINCHA", "Pichincha", padreId: 903));
            db.ElementosCatalogo.Add(new ElementoCatalogo(907, TipoCatalogo.Canton, "QUITO", "Quito", padreId: 906));
            db.ElementosCatalogo.Add(new ElementoCatalogo(905, TipoCatalogo.Parroquia, "PARROQUIA1", "Parroquia 1", padreId: 907));
        }

        var ficha = new FichaPersonal(new InstitucionId(institucionId), personaId);
        ficha.Actualizar(new DatosFichaPersonal(
            PrimerNombre: "Usuario",
            PrimerApellido: "Uno",
            SegundoApellido: "Test",
            SexoId: 1,
            FechaNacimiento: new DateOnly(1990, 1, 1),
            PaisNacimientoId: 903,
            EstadoCivilId: 11,
            PaisNacionalidadId: 903,
            ParroquiaResidenciaId: 905,
            CallePrincipal: "Av. Principal",
            Celular: "0991234567",
            CorreoInstitucional: correo));
        db.FichasPersonales.Add(ficha);

        var archivoTitulo = new ArchivoAdjunto(
            Guid.NewGuid(),
            new InstitucionId(institucionId),
            personaId,
            "respaldo.pdf",
            "application/pdf",
            1024,
            "hash123",
            "ruta/respaldo.pdf");
        db.ArchivosAdjuntos.Add(archivoTitulo);

        var titulo = new TituloAcademico(Guid.NewGuid(), new InstitucionId(institucionId), personaId,
            new DatosTituloAcademico("Primaria", 61, NombreInstitucionOtra: "Universidad"));
        titulo.AsociarArchivo(archivoTitulo.Id);
        db.TitulosAcademicos.Add(titulo);

        db.ReferenciasPersonales.Add(new ReferenciaPersonal(Guid.NewGuid(), new InstitucionId(institucionId), personaId,
            new DatosReferencia(TipoReferencia.Personal, "Ref Uno", "0991111111")));
        db.ReferenciasPersonales.Add(new ReferenciaPersonal(Guid.NewGuid(), new InstitucionId(institucionId), personaId,
            new DatosReferencia(TipoReferencia.Personal, "Ref Dos", "0992222222")));

        db.CuentasBancarias.Add(CuentaBancaria.RegistradaPorPersona(
            Guid.NewGuid(),
            new InstitucionId(institucionId),
            personaId,
            new DatosCuentaBancaria(71, null, "Banco Pichincha", new NumeroCuentaProtegido("cifrado", "1234", "huella")),
            DateTime.UtcNow));
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

    [Fact]
    public async Task E2E_01_Escenario_1_Primer_ingreso_actualizacion_y_bloqueo_al_enviar()
    {
        // Preparación: institución, persona ficticia y campaña abierta
        var instId = Guid.NewGuid();
        var personaId = Guid.NewGuid();
        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            db.Instituciones.Add(new Institucion(new InstitucionId(instId), "Instituto Ficticio Central"));
            db.Personas.Add(new Persona(
                personaId,
                new InstitucionId(instId),
                "1700000001",
                RolUsuario.Usuario,
                "Docente Ficticio Uno",
                "docente1@ejemplo.test",
                accesoHabilitado: true));
            db.Campanas.Add(new Campana(
                Guid.NewGuid(),
                new InstitucionId(instId),
                "Campaña E2E 2026",
                DateTime.UtcNow.AddDays(-5),
                DateTime.UtcNow.AddDays(5),
                activa: true));
            await AgregarHojaDeVidaCompletaAsync(db, instId, personaId, "docente1@ejemplo.test");
            await db.SaveChangesAsync();
        }

        // 1. RF-ACC-002: Iniciar sesión con cédula como usuario y contraseña inicial
        var loginResp = await _cliente.PostAsJsonAsync("/api/auth/login", new LoginRequest("1700000001", "1700000001"));
        Assert.Equal(HttpStatusCode.OK, loginResp.StatusCode);
        var loginDto = await loginResp.Content.ReadFromJsonAsync<ResultadoLoginDto>();
        Assert.NotNull(loginDto);
        Assert.True(loginDto.DebeCambiarContrasena);

        // 2. RF-ACC-002: Intentar llamar a otro endpoint antes de cambiar contraseña -> 403
        var reqBloqueadoPreviaClave = CrearRequest(HttpMethod.Get, "/api/campanas", instId, "1700000001", RolUsuario.Usuario);
        var respBloqueado = await _cliente.SendAsync(reqBloqueadoPreviaClave);
        Assert.Equal(HttpStatusCode.Forbidden, respBloqueado.StatusCode);

        // 3. RF-ACC-003: Rechazo si clave nueva == usuario o < 8 caracteres
        var respClaveIgual = await _cliente.PostAsJsonAsync("/api/auth/cambiar-clave", new CambiarContrasenaRequest(null, "1700000001"));
        Assert.Equal(HttpStatusCode.BadRequest, respClaveIgual.StatusCode);

        var respClaveCorta = await _cliente.PostAsJsonAsync("/api/auth/cambiar-clave", new CambiarContrasenaRequest(null, "12345"));
        Assert.Equal(HttpStatusCode.BadRequest, respClaveCorta.StatusCode);

        // 4. RF-ACC-003: Cambio de contraseña válido
        var respCambioExitoso = await _cliente.PostAsJsonAsync("/api/auth/cambiar-clave", new CambiarContrasenaRequest(null, "ClaveSegura2026!"));
        Assert.Equal(HttpStatusCode.OK, respCambioExitoso.StatusCode);

        // 5. RF-ACC-005: Enviar y verificar código de confirmación de correo
        var respEnvioCodigo = await _cliente.PostAsJsonAsync("/api/auth/enviar-codigo-correo", new EnviarCodigoCorreoRequest("docente1@ejemplo.test"));
        Assert.Equal(HttpStatusCode.OK, respEnvioCodigo.StatusCode);

        // 6. RF-CAM-002: Campaña abierta permite editar datos
        var reqGuardarBorrador = CrearRequest(
            HttpMethod.Put,
            "/api/mis-datos?documento=1700000001",
            instId,
            "1700000001",
            RolUsuario.Usuario,
            new ActualizarDatosRequest("{\"telefono\":\"0991234567\",\"direccion\":\"Av. Universitaria 123\"}"));
        var respGuardar = await _cliente.SendAsync(reqGuardarBorrador);
        Assert.Equal(HttpStatusCode.OK, respGuardar.StatusCode);

        // 7. RF-CAM-002, RF-DAT-003: Subir archivo con clave destino
        using var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent("%PDF-1.4 documento ficticio"u8.ToArray()), "archivo", "cedula.pdf");
        var reqSubir = new HttpRequestMessage(HttpMethod.Post, "/api/archivos/subir?documento=1700000001&claveDestino=cedula");
        reqSubir.Headers.Add("X-Institucion-Id", instId.ToString());
        reqSubir.Headers.Add("X-Actor", "1700000001");
        reqSubir.Headers.Add("X-Rol", "Usuario");
        reqSubir.Content = form;
        var respSubir = await _cliente.SendAsync(reqSubir);
        Assert.Equal(HttpStatusCode.OK, respSubir.StatusCode);

        // 8. RF-DAT-001: Envío sin aceptar tratamiento de datos falla
        var reqEnviarSinConsentimiento = CrearRequest(HttpMethod.Post, "/api/mis-datos/enviar?documento=1700000001", instId, "1700000001", RolUsuario.Usuario);
        var respEnvioSinConsentimiento = await _cliente.SendAsync(reqEnviarSinConsentimiento);
        Assert.Equal(HttpStatusCode.BadRequest, respEnvioSinConsentimiento.StatusCode);

        // 9. RF-DAT-001: Aceptar explícitamente el tratamiento de datos y verificar registro de fecha
        var reqAceptarTratamiento = CrearRequest(HttpMethod.Post, "/api/mis-datos/aceptar-tratamiento?documento=1700000001", instId, "1700000001", RolUsuario.Usuario);
        var respAceptar = await _cliente.SendAsync(reqAceptarTratamiento);
        Assert.Equal(HttpStatusCode.OK, respAceptar.StatusCode);

        // 10. RF-FLU-001: Enviar a revisión -> estado "Enviado" y bloqueo de edición
        var reqEnviar = CrearRequest(HttpMethod.Post, "/api/mis-datos/enviar?documento=1700000001", instId, "1700000001", RolUsuario.Usuario);
        var respEnviar = await _cliente.SendAsync(reqEnviar);
        Assert.Equal(HttpStatusCode.OK, respEnviar.StatusCode);

        // 11. RF-FLU-001: Intento de modificación posterior bloqueado
        var reqEditarBloqueado = CrearRequest(
            HttpMethod.Put,
            "/api/mis-datos?documento=1700000001",
            instId,
            "1700000001",
            RolUsuario.Usuario,
            new ActualizarDatosRequest("{\"telefono\":\"0999999999\"}"));
        var respEditarBloqueado = await _cliente.SendAsync(reqEditarBloqueado);
        Assert.Equal(HttpStatusCode.BadRequest, respEditarBloqueado.StatusCode);

        // 12. RF-DAT-002: Usuario no puede consultar datos de otra persona
        var reqConsultaAjena = CrearRequest(HttpMethod.Get, "/api/mis-datos?documento=1700000002", instId, "1700000001", RolUsuario.Usuario);
        var respConsultaAjena = await _cliente.SendAsync(reqConsultaAjena);
        Assert.Equal(HttpStatusCode.Forbidden, respConsultaAjena.StatusCode);
    }

    [Fact]
    public async Task E2E_02_Escenario_2_Revision_devolucion_con_observaciones_y_aprobacion()
    {
        var instId = Guid.NewGuid();
        var instBId = Guid.NewGuid();
        var persona1Id = Guid.NewGuid();

        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            db.Instituciones.Add(new Institucion(new InstitucionId(instId), "Instituto Alpha"));
            db.Instituciones.Add(new Institucion(new InstitucionId(instBId), "Instituto Beta"));

            var p1 = new Persona(
                persona1Id,
                new InstitucionId(instId),
                "1700000001",
                RolUsuario.Usuario,
                "Docente Alpha",
                "docente.alpha@ejemplo.test",
                accesoHabilitado: true);
            p1.ActualizarBorrador("{\"telefono\":\"0990000000\"}");
            p1.AceptarTratamientoDatos(DateTime.UtcNow);
            p1.EnviarARevision(DateTime.UtcNow);

            var supervisorA = new Persona(
                Guid.NewGuid(),
                new InstitucionId(instId),
                "1700000098",
                RolUsuario.Supervisor,
                "Supervisor Alpha",
                "supervisor.alpha@ejemplo.test",
                accesoHabilitado: true);

            var supervisorB = new Persona(
                Guid.NewGuid(),
                new InstitucionId(instBId),
                "1700000097",
                RolUsuario.Supervisor,
                "Supervisor Beta",
                "supervisor.beta@ejemplo.test",
                accesoHabilitado: true);

            db.Personas.AddRange(p1, supervisorA, supervisorB);
            await AgregarHojaDeVidaCompletaAsync(db, instId, persona1Id, "docente.alpha@ejemplo.test");
            db.Campanas.Add(new Campana(
                Guid.NewGuid(),
                new InstitucionId(instId),
                "Campaña Alpha 2026",
                DateTime.UtcNow.AddDays(-5),
                DateTime.UtcNow.AddDays(5),
                activa: true));

            await db.SaveChangesAsync();
        }

        // 1. RF-FLU-002, RF-FLU-006: Supervisor A lista expedientes en estado Enviado
        var reqListarExpedientes = CrearRequest(HttpMethod.Get, "/api/revision/pendientes", instId, "1700000098", RolUsuario.Supervisor);
        var respListar = await _cliente.SendAsync(reqListarExpedientes);
        Assert.Equal(HttpStatusCode.OK, respListar.StatusCode);
        var expedientes = await respListar.Content.ReadFromJsonAsync<List<ResumenRevisionPendienteDto>>();
        Assert.NotNull(expedientes);
        Assert.Contains(expedientes, e => e.Documento == "1700000001");

        // 2. RF-FLU-006, RF-MUL-003: Supervisor de institución B no puede ver expedientes de A
        var reqListarBeta = CrearRequest(HttpMethod.Get, "/api/revision/pendientes", instBId, "1700000097", RolUsuario.Supervisor);
        var respListarBeta = await _cliente.SendAsync(reqListarBeta);
        Assert.Equal(HttpStatusCode.OK, respListarBeta.StatusCode);
        var expedientesBeta = await respListarBeta.Content.ReadFromJsonAsync<List<ResumenRevisionPendienteDto>>();
        Assert.NotNull(expedientesBeta);
        Assert.DoesNotContain(expedientesBeta, e => e.Documento == "1700000001");

        // 3. RF-FLU-003: Devolución sin observación es rechazada
        var reqDevolverVacio = CrearRequest(
            HttpMethod.Post,
            "/api/revision/1700000001/devolver",
            instId,
            "1700000098",
            RolUsuario.Supervisor,
            new DevolverActualizacionRequest("", null));
        var respDevolverVacio = await _cliente.SendAsync(reqDevolverVacio);
        Assert.Equal(HttpStatusCode.BadRequest, respDevolverVacio.StatusCode);

        // 4. RF-FLU-003: Supervisor devuelve con observación y marcas por campo
        var reqDevolver = CrearRequest(
            HttpMethod.Post,
            "/api/revision/1700000001/devolver",
            instId,
            "1700000098",
            RolUsuario.Supervisor,
            new DevolverActualizacionRequest(
                "Favor corregir el número de teléfono celular.",
                new List<MarcaObservacionItem>
                {
                    new("campo", "telefono", "El número debe incluir 10 dígitos.")
                }));
        var respDevolver = await _cliente.SendAsync(reqDevolver);
        Assert.Equal(HttpStatusCode.OK, respDevolver.StatusCode);

        // 5. RF-FLU-003: Usuario consulta observaciones y las visualiza con su ronda y marcas
        var reqObservaciones = CrearRequest(HttpMethod.Get, "/api/mis-datos/observaciones?documento=1700000001", instId, "1700000001", RolUsuario.Usuario);
        var respObservaciones = await _cliente.SendAsync(reqObservaciones);
        Assert.Equal(HttpStatusCode.OK, respObservaciones.StatusCode);
        var listaObservaciones = await respObservaciones.Content.ReadFromJsonAsync<List<ObservacionDto>>();
        Assert.NotNull(listaObservaciones);
        Assert.Single(listaObservaciones);
        Assert.Equal("Favor corregir el número de teléfono celular.", listaObservaciones[0].Texto);
        Assert.Single(listaObservaciones[0].Marcas);
        Assert.Equal("telefono", listaObservaciones[0].Marcas[0].ClaveDestino);

        // 6. RF-FLU-004: Usuario en estado Devuelto puede editar y corregir
        var reqCorregir = CrearRequest(
            HttpMethod.Put,
            "/api/mis-datos?documento=1700000001",
            instId,
            "1700000001",
            RolUsuario.Usuario,
            new ActualizarDatosRequest("{\"telefono\":\"0991234567\"}"));
        var respCorregir = await _cliente.SendAsync(reqCorregir);
        Assert.Equal(HttpStatusCode.OK, respCorregir.StatusCode);

        // 7. RF-FLU-004: Usuario vuelve a enviar a revisión
        var reqReenviar = CrearRequest(HttpMethod.Post, "/api/mis-datos/enviar?documento=1700000001", instId, "1700000001", RolUsuario.Usuario);
        var respReenviar = await _cliente.SendAsync(reqReenviar);
        Assert.Equal(HttpStatusCode.OK, respReenviar.StatusCode);

        // 8. RF-FLU-002: Supervisor aprueba actualización
        var reqAprobar = CrearRequest(HttpMethod.Post, "/api/revision/1700000001/aprobar", instId, "1700000098", RolUsuario.Supervisor);
        var respAprobar = await _cliente.SendAsync(reqAprobar);
        Assert.Equal(HttpStatusCode.OK, respAprobar.StatusCode);

        // Comprobar estado Aprobado
        var reqEstado = CrearRequest(HttpMethod.Get, "/api/mis-datos/estado-edicion?documento=1700000001", instId, "1700000001", RolUsuario.Usuario);
        var respEstado = await _cliente.SendAsync(reqEstado);
        var estadoDto = await respEstado.Content.ReadFromJsonAsync<EstadoEdicionDto>();
        Assert.NotNull(estadoDto);
        Assert.Equal("Aprobado", estadoDto.EstadoActualizacion);
    }

    [Fact]
    public async Task E2E_03_Escenario_3_Exportacion_Excel_y_Zip_permisos_y_auditoria()
    {
        var instId = Guid.NewGuid();
        var instBId = Guid.NewGuid();

        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            var almacen = scope.ServiceProvider.GetRequiredService<IAlmacenArchivos>();

            var instA = new Institucion(new InstitucionId(instId), "Instituto Tecnológico Central");
            var instB = new Institucion(new InstitucionId(instBId), "Instituto Foráneo");
            db.Instituciones.AddRange(instA, instB);

            var pAprobada = new Persona(
                Guid.NewGuid(),
                new InstitucionId(instId),
                "1700000001",
                RolUsuario.Usuario,
                "Perez Gomez Juan Carlos",
                "juan.perez@ejemplo.test",
                accesoHabilitado: true);
            pAprobada.ActualizarBorrador("{\"telefono\":\"0991112233\"}");
            pAprobada.AceptarTratamientoDatos(DateTime.UtcNow);
            pAprobada.EnviarARevision(DateTime.UtcNow);
            pAprobada.AprobarActualizacion(DateTime.UtcNow);

            var pBeta = new Persona(
                Guid.NewGuid(),
                new InstitucionId(instBId),
                "1700000090",
                RolUsuario.Usuario,
                "Docente Beta Foráneo",
                "beta@ejemplo.test",
                accesoHabilitado: true);
            pBeta.ActualizarBorrador("{\"telefono\":\"0987654321\"}");
            pBeta.AceptarTratamientoDatos(DateTime.UtcNow);
            pBeta.EnviarARevision(DateTime.UtcNow);
            pBeta.AprobarActualizacion(DateTime.UtcNow);

            db.Personas.AddRange(pAprobada, pBeta);
            await db.SaveChangesAsync();

            // Adjuntar un archivo físico a la persona aprobada
            using var stream = new MemoryStream(Encoding.UTF8.GetBytes("%PDF-1.4 contenido de prueba"));
            var archivoId = Guid.NewGuid();
            var ruta = await almacen.GuardarAsync(new InstitucionId(instId), pAprobada.Id, archivoId, stream);
            var adjunto = new ArchivoAdjunto(
                archivoId,
                new InstitucionId(instId),
                pAprobada.Id,
                "cedula_juan.pdf",
                "application/pdf",
                stream.Length,
                "a" + new string('0', 63),
                ruta,
                claveDestino: "cedula");
            db.ArchivosAdjuntos.Add(adjunto);
            await db.SaveChangesAsync();
        }

        // 1. RF-EXP-003: Supervisor y Usuario reciben 403 Forbidden al intentar exportar
        var reqExpUsuario = CrearRequest(HttpMethod.Get, "/api/exportaciones/excel", instId, "1700000001", RolUsuario.Usuario);
        var respExpUsuario = await _cliente.SendAsync(reqExpUsuario);
        Assert.Equal(HttpStatusCode.Forbidden, respExpUsuario.StatusCode);

        var reqExpSupervisor = CrearRequest(HttpMethod.Get, "/api/exportaciones/zip", instId, "1700000098", RolUsuario.Supervisor);
        var respExpSupervisor = await _cliente.SendAsync(reqExpSupervisor);
        Assert.Equal(HttpStatusCode.Forbidden, respExpSupervisor.StatusCode);

        // 2. RF-EXP-001, RF-EXP-004: Admin de institución genera exportación Excel
        var reqExpExcel = CrearRequest(HttpMethod.Get, "/api/exportaciones/excel", instId, "1700000099", RolUsuario.Admin);
        var respExpExcel = await _cliente.SendAsync(reqExpExcel);
        Assert.Equal(HttpStatusCode.OK, respExpExcel.StatusCode);
        Assert.Equal("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", respExpExcel.Content.Headers.ContentType?.MediaType);
        var excelBytes = await respExpExcel.Content.ReadAsByteArrayAsync();
        Assert.NotEmpty(excelBytes);

        // 3. RF-EXP-002, RF-EXP-004: Admin genera exportación ZIP con estructura ordenada
        var reqExpZip = CrearRequest(HttpMethod.Get, "/api/exportaciones/zip", instId, "1700000099", RolUsuario.Admin);
        var respExpZip = await _cliente.SendAsync(reqExpZip);
        Assert.Equal(HttpStatusCode.OK, respExpZip.StatusCode);
        Assert.Equal("application/zip", respExpZip.Content.Headers.ContentType?.MediaType);

        var zipBytes = await respExpZip.Content.ReadAsByteArrayAsync();
        using var zipStream = new MemoryStream(zipBytes);
        using var archivoZip = new ZipArchive(zipStream, ZipArchiveMode.Read);

        // Verificar índice y carpeta de la persona
        var entradaIndice = archivoZip.Entries.FirstOrDefault(e => e.FullName.EndsWith(".md", StringComparison.OrdinalIgnoreCase));
        Assert.NotNull(entradaIndice);
        Assert.Contains("instituto_tecnologico_central", entradaIndice.FullName, StringComparison.OrdinalIgnoreCase);

        // RF-EXP-004: No contiene carpetas ni datos de la persona de la institución B
        Assert.DoesNotContain(archivoZip.Entries, e => e.FullName.Contains("1700000090"));

        // 4. RF-DAT-004, RF-DAT-005: Verificar auditoría de exportación sin contraseñas
        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            var auditorias = await db.Auditorias.ToListAsync();

            Assert.Contains(auditorias, a => a.Accion == "ExportacionExcel");
            Assert.Contains(auditorias, a => a.Accion == "ExportacionZip");

            foreach (var aud in auditorias)
            {
                Assert.DoesNotContain("Clave", aud.Detalle ?? string.Empty, StringComparison.OrdinalIgnoreCase);
                Assert.DoesNotContain("Password", aud.Detalle ?? string.Empty, StringComparison.OrdinalIgnoreCase);
            }
        }
    }

    [Fact]
    public async Task E2E_04_Escenario_4_Alta_de_institucion_carga_de_nomina_y_aislamiento_multitenant()
    {
        // 1. RF-MUL-001: Superadmin crea institución Alpha con administrador
        var reqCrearInstAlpha = new HttpRequestMessage(HttpMethod.Post, "/api/instituciones")
        {
            Content = JsonContent.Create(new CrearInstitucionRequest(
                "Instituto Tecnológico Nacional",
                new List<AdminInicialRequest>
                {
                    new("1700000099", "Admin Nacional", "admin@nacional.ejemplo.test")
                }))
        };
        var respCrearInst = await _cliente.SendAsync(reqCrearInstAlpha);
        Assert.Equal(HttpStatusCode.Created, respCrearInst.StatusCode);
        var instCreada = await respCrearInst.Content.ReadFromJsonAsync<InstitucionDto>();
        Assert.NotNull(instCreada);
        var instAlphaId = instCreada.Id;

        // 2. RF-ACC-001: Admin carga lista de personas con documento, nombres y correo
        var reqCarga = CrearRequest(
            HttpMethod.Post,
            "/api/personas/cargar",
            instAlphaId,
            "1700000099",
            RolUsuario.Admin,
            new CargarPersonasRequest(new List<PersonaCargaItem>
            {
                new("1710000001", "Docente Primero", Correo: "primero@ejemplo.test"),
                new("1710000002", "Docente Segundo", Correo: "segundo@ejemplo.test"),
                new("1710000001", "Docente Primero Duplicado", Correo: "primero@ejemplo.test") // Duplicado intencional para verificar deduplicación (PD-09)
            }));

        var respCarga = await _cliente.SendAsync(reqCarga);
        Assert.Equal(HttpStatusCode.OK, respCarga.StatusCode);
        var resumenCarga = await respCarga.Content.ReadFromJsonAsync<ResultadoCargaPersonasDto>();
        Assert.NotNull(resumenCarga);
        Assert.Equal(3, resumenCarga.TotalRecibidos);
        Assert.Equal(2, resumenCarga.TotalCargados);
        Assert.Equal(1, resumenCarga.TotalRechazados);
        Assert.Equal(0, resumenCarga.TotalDuplicadosOmitidos);

        // Subida de segunda nómina que incluye a persona ya existente (se omite como duplicado PD-09)
        var reqCargaSegunda = CrearRequest(
            HttpMethod.Post,
            "/api/personas/cargar",
            instAlphaId,
            "1700000099",
            RolUsuario.Admin,
            new CargarPersonasRequest(new List<PersonaCargaItem>
            {
                new("1710000001", "Docente Primero Reingreso", Correo: "primero@ejemplo.test")
            }));
        var respCargaSegunda = await _cliente.SendAsync(reqCargaSegunda);
        Assert.Equal(HttpStatusCode.OK, respCargaSegunda.StatusCode);
        var resumenSegunda = await respCargaSegunda.Content.ReadFromJsonAsync<ResultadoCargaPersonasDto>();
        Assert.NotNull(resumenSegunda);
        Assert.Equal(1, resumenSegunda.TotalDuplicadosOmitidos);
        Assert.Equal(0, resumenSegunda.TotalCargados);

        // 3. RF-ACC-004: Intento de inicio de sesión con documento no cargado responde genérico
        var respLoginInexistente = await _cliente.PostAsJsonAsync("/api/auth/login", new LoginRequest("9999999999", "CualquierClave"));
        Assert.Equal(HttpStatusCode.Unauthorized, respLoginInexistente.StatusCode);
        var msgError = await respLoginInexistente.Content.ReadFromJsonAsync<MensajeRespuesta>();
        Assert.Equal("Credenciales incorrectas o usuario no habilitado.", msgError?.Mensaje);

        // 4. RF-MUL-002, RF-ACC-004: Persona recién cargada no tiene acceso habilitado hasta que el superadmin/admin la habilite
        var respLoginAntesDeHabilitar = await _cliente.PostAsJsonAsync("/api/auth/login", new LoginRequest("1710000001", "1710000001"));
        Assert.Equal(HttpStatusCode.Unauthorized, respLoginAntesDeHabilitar.StatusCode);

        // Superadmin habilita el acceso de la persona cargada (RF-MUL-002)
        var reqHabilitar = new HttpRequestMessage(HttpMethod.Post, $"/api/instituciones/{instAlphaId}/habilitar-personas")
        {
            Content = JsonContent.Create(new HabilitarPersonasRequest(Documentos: new List<string> { "1710000001" }))
        };
        var respHabilitar = await _cliente.SendAsync(reqHabilitar);
        Assert.Equal(HttpStatusCode.OK, respHabilitar.StatusCode);

        // Una vez habilitada, la persona puede autenticarse con su documento (RF-MUL-002, RF-ACC-002)
        var respLoginCargado = await _cliente.PostAsJsonAsync("/api/auth/login", new LoginRequest("1710000001", "1710000001"));
        Assert.Equal(HttpStatusCode.OK, respLoginCargado.StatusCode);
        var loginDto = await respLoginCargado.Content.ReadFromJsonAsync<ResultadoLoginDto>();
        Assert.NotNull(loginDto);
        Assert.True(loginDto.DebeCambiarContrasena);

        // 5. RF-MUL-004: Auditoría registra creación de institución y habilitación de personas
        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            var auditorias = await db.Auditorias.ToListAsync();
            Assert.Contains(auditorias, a => a.Accion == "CREAR_INSTITUCION");
            Assert.Contains(auditorias, a => a.Accion == "HABILITAR_PERSONAS");
        }
    }

    [Fact]
    public async Task E2E_05_Reglas_de_campana_fechas_invalida_y_conservacion_de_borrador()
    {
        var instId = Guid.NewGuid();
        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            db.Instituciones.Add(new Institucion(new InstitucionId(instId), "Instituto Campanas"));
            db.Personas.Add(new Persona(
                Guid.NewGuid(),
                new InstitucionId(instId),
                "1700000001",
                RolUsuario.Usuario,
                "Docente Campana",
                "docente.campana@ejemplo.test",
                accesoHabilitado: true));
            await db.SaveChangesAsync();
        }

        // 1. RF-CAM-001: Crear campaña con fecha de fin anterior a inicio es rechazada
        var reqCampanaInvalida = CrearRequest(
            HttpMethod.Post,
            "/api/campanas",
            instId,
            "1700000099",
            RolUsuario.Admin,
            new CrearCampanaRequest(
                "Campaña Inválida",
                DateTime.UtcNow.AddDays(5),
                DateTime.UtcNow.AddDays(1)));
        var respCampanaInvalida = await _cliente.SendAsync(reqCampanaInvalida);
        Assert.Equal(HttpStatusCode.BadRequest, respCampanaInvalida.StatusCode);

        // 2. RF-CAM-003, RF-CAM-004: Sin campaña abierta (o expirada), datos en solo lectura
        var reqGuardarSinCampana = CrearRequest(
            HttpMethod.Put,
            "/api/mis-datos?documento=1700000001",
            instId,
            "1700000001",
            RolUsuario.Usuario,
            new ActualizarDatosRequest("{\"telefono\":\"0991112222\"}"));
        var respGuardarSinCampana = await _cliente.SendAsync(reqGuardarSinCampana);
        Assert.Equal(HttpStatusCode.Forbidden, respGuardarSinCampana.StatusCode);

        // 3. Subida de archivos fuera de campaña también rechazada
        using var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent("%PDF-1.4 prueba"u8.ToArray()), "archivo", "titulo.pdf");
        var reqSubirSinCampana = new HttpRequestMessage(HttpMethod.Post, "/api/archivos/subir?documento=1700000001");
        reqSubirSinCampana.Headers.Add("X-Institucion-Id", instId.ToString());
        reqSubirSinCampana.Headers.Add("X-Actor", "1700000001");
        reqSubirSinCampana.Headers.Add("X-Rol", "Usuario");
        reqSubirSinCampana.Content = form;
        var respSubirSinCampana = await _cliente.SendAsync(reqSubirSinCampana);
        Assert.Equal(HttpStatusCode.Forbidden, respSubirSinCampana.StatusCode);

        // 4. RF-CAM-004: El estado se conserva en borrador y no se envía solo
        var reqEstado = CrearRequest(HttpMethod.Get, "/api/mis-datos/estado-edicion?documento=1700000001", instId, "1700000001", RolUsuario.Usuario);
        var respEstado = await _cliente.SendAsync(reqEstado);
        Assert.Equal(HttpStatusCode.OK, respEstado.StatusCode);
        var estadoDto = await respEstado.Content.ReadFromJsonAsync<EstadoEdicionDto>();
        Assert.NotNull(estadoDto);
        Assert.Equal("Borrador", estadoDto.EstadoActualizacion);
        Assert.False(estadoDto.PuedeEditar);
    }
}
