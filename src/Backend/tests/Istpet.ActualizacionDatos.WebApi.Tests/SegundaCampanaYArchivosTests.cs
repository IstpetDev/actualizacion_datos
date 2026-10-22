namespace Istpet.ActualizacionDatos.WebApi.Tests;

using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Multitenancy;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

// Issue #32 (T-06 de spec-0003):
// 1. PD-HDV-04 / RF-FLU-005: la persona aprobada inicia otra actualización con campaña abierta.
// 2. ADR-0006: al aprobar se eliminan los archivos sustituidos (base y disco).
// 3. Una sola vía de subida: la ruta de metadatos sin archivo ya no existe (ver FlujoRevisionTests).
public sealed class SegundaCampanaYArchivosTests : IDisposable
{
    private const string Documento = "0000000020";
    private const string OtroDocumento = "0000000021";
    private const string Supervisor = "0000000029";

    private readonly SqliteConnection _conexion;
    private readonly string _almacen;
    private readonly WebApplicationFactory<Program> _fabrica;
    private readonly HttpClient _cliente;

    public SegundaCampanaYArchivosTests()
    {
        _conexion = new SqliteConnection("DataSource=:memory:");
        _conexion.Open();
        _almacen = Path.Combine(Path.GetTempPath(), "istpet-pruebas-" + Guid.NewGuid().ToString("N"));

        _fabrica = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseSetting("Almacenamiento:RutaRaiz", _almacen);
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

                using var sp = services.BuildServiceProvider();
                using var scope = sp.CreateScope();
                scope.ServiceProvider.GetRequiredService<AplicacionDbContext>().Database.EnsureCreated();
            });
        });

        _cliente = _fabrica.CreateClient();
    }

    public void Dispose()
    {
        _cliente.Dispose();
        _fabrica.Dispose();
        _conexion.Dispose();
        if (Directory.Exists(_almacen))
        {
            Directory.Delete(_almacen, recursive: true);
        }
    }

    // ---------- 1. Iniciar una nueva actualización ----------

    [Fact]
    public async Task Sin_sesion_responde_401()
    {
        var respuesta = await _cliente.PostAsync(new Uri("/api/mis-datos/iniciar-actualizacion", UriKind.Relative), null);

        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
    }

    [Fact]
    public async Task Aprobado_con_campana_abierta_vuelve_a_borrador_puede_editar_y_queda_auditado()
    {
        var inst = await CrearInstitucionAsync(EstadoActualizacion.Aprobado);

        var antes = await ObtenerEstadoEdicionAsync(inst, Documento);
        Assert.False(antes.PuedeEditar);
        Assert.True(antes.PuedeIniciarNuevaActualizacion);

        var respuesta = await EnviarAsync(HttpMethod.Post, "/api/mis-datos/iniciar-actualizacion", inst, Documento);

        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        Assert.Equal(EstadoActualizacion.Borrador, await EstadoDeAsync(inst, Documento));

        var despues = await ObtenerEstadoEdicionAsync(inst, Documento);
        Assert.True(despues.PuedeEditar);
        Assert.False(despues.PuedeIniciarNuevaActualizacion);

        using var guardar = Peticion(HttpMethod.Put, "/api/mis-datos", inst, Documento);
        guardar.Content = JsonContent.Create(new ActualizarDatosRequest("{\"telefono\":\"0990000000\"}"));
        Assert.Equal(HttpStatusCode.OK, (await _cliente.SendAsync(guardar)).StatusCode);

        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        Assert.True(await db.Auditorias.IgnoreQueryFilters().AnyAsync(a => a.Accion == "IniciarNuevaActualizacion" && a.Actor == Documento));
    }

    [Fact]
    public async Task Aprobado_sin_campana_abierta_responde_403_y_no_cambia_el_estado()
    {
        var inst = await CrearInstitucionAsync(EstadoActualizacion.Aprobado, campanaAbierta: false);

        var estado = await ObtenerEstadoEdicionAsync(inst, Documento);
        Assert.False(estado.PuedeIniciarNuevaActualizacion);

        var respuesta = await EnviarAsync(HttpMethod.Post, "/api/mis-datos/iniciar-actualizacion", inst, Documento);

        Assert.Equal(HttpStatusCode.Forbidden, respuesta.StatusCode);
        Assert.Equal(EstadoActualizacion.Aprobado, await EstadoDeAsync(inst, Documento));
    }

    [Theory]
    [InlineData(EstadoActualizacion.Borrador)]
    [InlineData(EstadoActualizacion.Enviado)]
    [InlineData(EstadoActualizacion.Devuelto)]
    public async Task Fuera_de_aprobado_responde_400_y_no_cambia_el_estado(EstadoActualizacion estado)
    {
        var inst = await CrearInstitucionAsync(estado);

        var respuesta = await EnviarAsync(HttpMethod.Post, "/api/mis-datos/iniciar-actualizacion", inst, Documento);

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        var cuerpo = await respuesta.Content.ReadFromJsonAsync<MensajeRespuesta>();
        Assert.Contains("aprobada", cuerpo!.Mensaje, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(estado, await EstadoDeAsync(inst, Documento));
    }

    [Fact]
    public async Task Solo_reabre_la_propia_actualizacion_y_solo_en_su_institucion()
    {
        // Misma cédula ficticia aprobada en dos instituciones, y una segunda persona aprobada en la primera.
        var instA = await CrearInstitucionAsync(EstadoActualizacion.Aprobado);
        var instB = await CrearInstitucionAsync(EstadoActualizacion.Aprobado);
        await AgregarPersonaAsync(instA, OtroDocumento, EstadoActualizacion.Aprobado);

        var respuesta = await EnviarAsync(HttpMethod.Post, "/api/mis-datos/iniciar-actualizacion", instA, Documento);

        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        Assert.Equal(EstadoActualizacion.Borrador, await EstadoDeAsync(instA, Documento));
        Assert.Equal(EstadoActualizacion.Aprobado, await EstadoDeAsync(instA, OtroDocumento));
        Assert.Equal(EstadoActualizacion.Aprobado, await EstadoDeAsync(instB, Documento));
    }

    // ---------- 2. Limpieza de archivos al aprobar ----------

    [Fact]
    public async Task Al_aprobar_se_eliminan_solo_los_archivos_sin_uso_de_esa_persona()
    {
        var inst = await CrearInstitucionAsync(EstadoActualizacion.Borrador);
        await AgregarPersonaAsync(inst, OtroDocumento, EstadoActualizacion.Borrador);

        var respaldoTitulo = await SubirAsync(inst, Documento, clave: null);      // lo usa un título
        var sinUso = await SubirAsync(inst, Documento, clave: null);              // subido y nunca asociado
        var foto = await SubirPngAsync(inst, Documento);                           // foto de la ficha
        var documentoPersonal = await SubirAsync(inst, Documento, clave: null);   // respaldo de documento personal
        var conClave = await SubirAsync(inst, Documento, clave: "cedula");        // flujo por clave (spec-0002)
        var deOtraPersona = await SubirAsync(inst, OtroDocumento, clave: null);   // sin uso, pero de otra persona

        await AsociarAHojaDeVidaAsync(inst, Documento, respaldoTitulo, foto, documentoPersonal);
        await EnviarARevisionAsync(inst, Documento);

        var aprobar = await EnviarAsync(HttpMethod.Post, $"/api/revision/{Documento}/aprobar", inst, Supervisor, RolUsuario.Supervisor);
        Assert.Equal(HttpStatusCode.OK, aprobar.StatusCode);

        Assert.False(await ExisteEnBaseAsync(sinUso.Id));
        Assert.False(File.Exists(RutaEnDisco(inst, sinUso)));

        foreach (var vigente in new[] { respaldoTitulo, foto, documentoPersonal, conClave, deOtraPersona })
        {
            Assert.True(await ExisteEnBaseAsync(vigente.Id), $"Se borró {vigente.NombreOriginal} de la base.");
            Assert.True(File.Exists(RutaEnDisco(inst, vigente)), $"Se borró {vigente.NombreOriginal} del disco.");
        }

        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        var auditoria = await db.Auditorias.IgnoreQueryFilters().SingleAsync(a => a.Accion == "EliminarArchivosSustituidos");
        Assert.Contains("1 archivo", auditoria.Detalle, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Aprobar_sin_archivos_sustituidos_no_borra_nada_ni_registra_limpieza()
    {
        var inst = await CrearInstitucionAsync(EstadoActualizacion.Borrador);
        var respaldo = await SubirAsync(inst, Documento, clave: null);
        await AsociarAHojaDeVidaAsync(inst, Documento, respaldo, foto: null, documentoPersonal: null);
        await EnviarARevisionAsync(inst, Documento);

        var aprobar = await EnviarAsync(HttpMethod.Post, $"/api/revision/{Documento}/aprobar", inst, Supervisor, RolUsuario.Supervisor);

        Assert.Equal(HttpStatusCode.OK, aprobar.StatusCode);
        Assert.True(await ExisteEnBaseAsync(respaldo.Id));
        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        Assert.False(await db.Auditorias.IgnoreQueryFilters().AnyAsync(a => a.Accion == "EliminarArchivosSustituidos"));
    }

    // ---------- 3. Ciclo completo de dos campañas ----------

    [Fact]
    public async Task Ciclo_completo_aprobar_reabrir_reemplazar_respaldo_y_volver_a_aprobar()
    {
        var inst = await CrearInstitucionAsync(EstadoActualizacion.Borrador);

        // Primera campaña: título con su respaldo, aprobado.
        var respaldoV1 = await SubirAsync(inst, Documento, clave: null);
        var tituloId = await AsociarAHojaDeVidaAsync(inst, Documento, respaldoV1, foto: null, documentoPersonal: null);
        await EnviarARevisionAsync(inst, Documento);
        Assert.Equal(HttpStatusCode.OK, (await EnviarAsync(HttpMethod.Post, $"/api/revision/{Documento}/aprobar", inst, Supervisor, RolUsuario.Supervisor)).StatusCode);
        Assert.True(await ExisteEnBaseAsync(respaldoV1.Id));

        // Segunda campaña: reabre, sube un respaldo nuevo y lo asocia al mismo título.
        Assert.Equal(HttpStatusCode.OK, (await EnviarAsync(HttpMethod.Post, "/api/mis-datos/iniciar-actualizacion", inst, Documento)).StatusCode);
        var respaldoV2 = await SubirAsync(inst, Documento, clave: null);
        await CambiarRespaldoDelTituloAsync(tituloId, respaldoV2.Id);

        // Mientras no se apruebe, el respaldo anterior sigue existiendo.
        Assert.True(await ExisteEnBaseAsync(respaldoV1.Id));
        Assert.True(File.Exists(RutaEnDisco(inst, respaldoV1)));

        await EnviarARevisionAsync(inst, Documento);
        Assert.Equal(HttpStatusCode.OK, (await EnviarAsync(HttpMethod.Post, $"/api/revision/{Documento}/aprobar", inst, Supervisor, RolUsuario.Supervisor)).StatusCode);

        Assert.False(await ExisteEnBaseAsync(respaldoV1.Id));
        Assert.False(File.Exists(RutaEnDisco(inst, respaldoV1)));
        Assert.True(await ExisteEnBaseAsync(respaldoV2.Id));
        Assert.True(File.Exists(RutaEnDisco(inst, respaldoV2)));
        Assert.Equal(EstadoActualizacion.Aprobado, await EstadoDeAsync(inst, Documento));
    }

    // ---------- Ayudas ----------

    private async Task<Guid> CrearInstitucionAsync(EstadoActualizacion estado, bool campanaAbierta = true)
    {
        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        var inst = Guid.NewGuid();
        db.Instituciones.Add(new Institucion(new InstitucionId(inst), "Institución ficticia " + inst.ToString("N")[..6]));
        db.Personas.Add(new Persona(Guid.NewGuid(), new InstitucionId(inst), Documento, RolUsuario.Usuario, "Persona Ficticia",
            "usuario20@ejemplo.test", accesoHabilitado: true, estadoActualizacion: estado, tratamientoDatosAceptado: true));
        db.Personas.Add(new Persona(Guid.NewGuid(), new InstitucionId(inst), Supervisor, RolUsuario.Supervisor, "Supervisor Ficticio",
            "supervisor@ejemplo.test", accesoHabilitado: true));
        db.Campanas.Add(new Campana(Guid.NewGuid(), new InstitucionId(inst), "Campaña ficticia",
            campanaAbierta ? DateTime.UtcNow.AddDays(-1) : DateTime.UtcNow.AddDays(-30),
            campanaAbierta ? DateTime.UtcNow.AddDays(10) : DateTime.UtcNow.AddDays(-20),
            activa: true));
        await db.SaveChangesAsync();
        return inst;
    }

    private async Task AgregarPersonaAsync(Guid inst, string documento, EstadoActualizacion estado)
    {
        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        db.Personas.Add(new Persona(Guid.NewGuid(), new InstitucionId(inst), documento, RolUsuario.Usuario, "Otra Persona Ficticia",
            "usuario21@ejemplo.test", accesoHabilitado: true, estadoActualizacion: estado, tratamientoDatosAceptado: true));
        await db.SaveChangesAsync();
    }

    /// <summary>
    /// Mientras T-02 y T-03 no publiquen sus endpoints, los ítems se escriben directo en la base:
    /// lo que se prueba aquí es la limpieza al aprobar, no la API de la hoja de vida.
    /// </summary>
    private async Task<Guid> AsociarAHojaDeVidaAsync(Guid inst, string documento, ArchivoDto respaldoTitulo, ArchivoDto? foto, ArchivoDto? documentoPersonal)
    {
        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        var institucion = new InstitucionId(inst);
        var persona = await db.Personas.IgnoreQueryFilters().SingleAsync(p => p.InstitucionId == institucion && p.Documento == documento);

        if (!await db.ElementosCatalogo.AnyAsync(e => e.Id == 903))
        {
            db.ElementosCatalogo.Add(new ElementoCatalogo(903, TipoCatalogo.Pais, "EC", "Ecuador"));
            db.ElementosCatalogo.Add(new ElementoCatalogo(906, TipoCatalogo.Provincia, "PICHINCHA", "Pichincha", padreId: 903));
            db.ElementosCatalogo.Add(new ElementoCatalogo(907, TipoCatalogo.Canton, "QUITO", "Quito", padreId: 906));
            db.ElementosCatalogo.Add(new ElementoCatalogo(905, TipoCatalogo.Parroquia, "PARROQUIA1", "Parroquia 1", padreId: 907));
        }

        var titulo = new TituloAcademico(Guid.NewGuid(), institucion, persona.Id,
            new DatosTituloAcademico("Primaria", 61, NombreInstitucionOtra: "Instituto ficticio"));
        titulo.AsociarArchivo(respaldoTitulo.Id);
        db.TitulosAcademicos.Add(titulo);

        var ficha = await db.FichasPersonales.FirstOrDefaultAsync(f => f.PersonaId == persona.Id);
        if (ficha == null)
        {
            ficha = new FichaPersonal(institucion, persona.Id);
            db.FichasPersonales.Add(ficha);
        }
        ficha.Actualizar(new DatosFichaPersonal(
            PrimerNombre: "Persona",
            PrimerApellido: "Ficticia",
            SegundoApellido: "Test",
            SexoId: 1,
            FechaNacimiento: new DateOnly(1990, 1, 1),
            PaisNacimientoId: 903,
            EstadoCivilId: 11,
            PaisNacionalidadId: 903,
            ParroquiaResidenciaId: 905,
            CallePrincipal: "Av. Principal",
            Celular: "0991234567",
            CorreoInstitucional: persona.Correo));

        if (foto != null)
        {
            ficha.AsociarFoto(foto.Id);
        }

        db.ReferenciasPersonales.Add(new ReferenciaPersonal(Guid.NewGuid(), institucion, persona.Id,
            new DatosReferencia(TipoReferencia.Personal, "Ref Uno", "0991111111")));
        db.ReferenciasPersonales.Add(new ReferenciaPersonal(Guid.NewGuid(), institucion, persona.Id,
            new DatosReferencia(TipoReferencia.Personal, "Ref Dos", "0992222222")));

        var cuenta = await db.CuentasBancarias.FirstOrDefaultAsync(c => c.PersonaId == persona.Id);
        if (cuenta == null)
        {
            db.CuentasBancarias.Add(CuentaBancaria.RegistradaPorPersona(
                Guid.NewGuid(),
                institucion,
                persona.Id,
                new DatosCuentaBancaria(71, null, "Banco Pichincha", new NumeroCuentaProtegido("cifrado", "1234", "huella")),
                DateTime.UtcNow));
        }

        if (documentoPersonal != null)
        {
            var tipo = new TipoDocumento(Guid.NewGuid(), institucion, "CEDULA", "Cédula");
            db.TiposDocumento.Add(tipo);
            var doc = new DocumentoPersonal(Guid.NewGuid(), institucion, persona.Id, tipo.Id, new DatosDocumentoPersonal());
            doc.AsociarArchivo(documentoPersonal.Id);
            db.DocumentosPersonales.Add(doc);
        }

        await db.SaveChangesAsync();
        return titulo.Id;
    }

    private async Task CambiarRespaldoDelTituloAsync(Guid tituloId, Guid archivoId)
    {
        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        var titulo = await db.TitulosAcademicos.IgnoreQueryFilters().SingleAsync(t => t.Id == tituloId);
        titulo.AsociarArchivo(archivoId);
        await db.SaveChangesAsync();
    }

    private async Task EnviarARevisionAsync(Guid inst, string documento)
    {
        var respuesta = await EnviarAsync(HttpMethod.Post, "/api/mis-datos/enviar", inst, documento);
        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
    }

    private Task<ArchivoDto> SubirAsync(Guid inst, string documento, string? clave) =>
        SubirContenidoAsync(inst, documento, clave, "respaldo.pdf", Encoding.UTF8.GetBytes("%PDF-1.4\nrespaldo ficticio " + Guid.NewGuid()), "application/pdf");

    private Task<ArchivoDto> SubirPngAsync(Guid inst, string documento)
    {
        byte[] png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D];
        return SubirContenidoAsync(inst, documento, null, "foto.png", png, "image/png");
    }

    private async Task<ArchivoDto> SubirContenidoAsync(Guid inst, string documento, string? clave, string nombre, byte[] bytes, string tipo)
    {
        using var formulario = new MultipartFormDataContent();
        using var contenido = new ByteArrayContent(bytes);
        contenido.Headers.ContentType = new MediaTypeHeaderValue(tipo);
        formulario.Add(contenido, "archivo", nombre);

        var ruta = clave == null ? "/api/archivos/subir" : $"/api/archivos/subir?claveDestino={clave}";
        using var peticion = Peticion(HttpMethod.Post, ruta, inst, documento);
        peticion.Content = formulario;

        var respuesta = await _cliente.SendAsync(peticion);
        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        return (await respuesta.Content.ReadFromJsonAsync<ArchivoDto>())!;
    }

    private string RutaEnDisco(Guid inst, ArchivoDto archivo) =>
        Path.Combine(_almacen, inst.ToString(), archivo.PersonaId.ToString(), $"{archivo.Id}.bin");

    private async Task<bool> ExisteEnBaseAsync(Guid archivoId)
    {
        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        return await db.ArchivosAdjuntos.IgnoreQueryFilters().AnyAsync(a => a.Id == archivoId);
    }

    private async Task<EstadoActualizacion> EstadoDeAsync(Guid inst, string documento)
    {
        await using var db = new AplicacionDbContext(
            new DbContextOptionsBuilder<AplicacionDbContext>().UseSqlite(_conexion).UseSnakeCaseNamingConvention().Options,
            new ContextoInstitucion(new InstitucionId(inst), esSuperadmin: false));
        return (await db.Personas.SingleAsync(p => p.Documento == documento)).EstadoActualizacion;
    }

    private async Task<EstadoEdicionDto> ObtenerEstadoEdicionAsync(Guid inst, string documento)
    {
        var respuesta = await EnviarAsync(HttpMethod.Get, "/api/mis-datos/estado-edicion", inst, documento);
        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        return (await respuesta.Content.ReadFromJsonAsync<EstadoEdicionDto>())!;
    }

    private async Task<HttpResponseMessage> EnviarAsync(HttpMethod metodo, string ruta, Guid inst, string actor, RolUsuario rol = RolUsuario.Usuario)
    {
        using var peticion = Peticion(metodo, ruta, inst, actor, rol);
        return await _cliente.SendAsync(peticion);
    }

    private static HttpRequestMessage Peticion(HttpMethod metodo, string ruta, Guid inst, string actor, RolUsuario rol = RolUsuario.Usuario)
    {
        var peticion = new HttpRequestMessage(metodo, ruta);
        peticion.Headers.Add("X-Institucion-Id", inst.ToString());
        peticion.Headers.Add("X-Actor", actor);
        peticion.Headers.Add("X-Rol", rol.ToString());
        return peticion;
    }
}
