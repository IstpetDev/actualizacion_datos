namespace Istpet.ActualizacionDatos.WebApi.Tests;

using System.Net;
using System.Net.Http.Json;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

// Issue #30 (T-02, T-03, T-04 de spec-0003):
// Secciones de la hoja de vida, respaldos, documentos personales y validación de completitud al enviar.
public sealed partial class HojaDeVidaTests : IDisposable
{
    private static readonly string[] NombresReferenciaFicticios = ["Cero", "Uno", "Dos", "Tres", "Cuatro", "Cinco", "Seis"];

    private const string Documento = "0000000040";
    private const string DocumentoAjeno = "0000000041";
    private const string Supervisor = "0000000049";

    private const int GradoLicenciatura = 61;
    private const int SexoHombre = 1;
    private const int EstadoCivilSoltero = 11;
    private const int TipoCuentaAhorros = 71;

    private readonly SqliteConnection _conexion;
    private readonly WebApplicationFactory<Program> _fabrica;
    private readonly HttpClient _cliente;

    public HojaDeVidaTests()
    {
        _conexion = new SqliteConnection("DataSource=:memory:");
        _conexion.Open();
        _fabrica = CrearFabrica(_conexion);
        _cliente = _fabrica.CreateClient();
    }

    public void Dispose()
    {
        _cliente.Dispose();
        _fabrica.Dispose();
        _conexion.Dispose();
    }

    private static WebApplicationFactory<Program> CrearFabrica(SqliteConnection conexion) =>
        new FabricaPruebas().WithWebHostBuilder(builder =>
        {
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
                    options.UseSqlite(conexion);
                    options.UseSnakeCaseNamingConvention();
                });

                using var sp = services.BuildServiceProvider();
                using var scope = sp.CreateScope();
                scope.ServiceProvider.GetRequiredService<AplicacionDbContext>().Database.EnsureCreated();
            });
        });

    private async Task<(Guid InstitucionId, Guid PersonaId, Guid PersonaAjenaId)> ConfigurarDatosInicialesAsync(
        bool campanaAbierta = true,
        EstadoActualizacion estado = EstadoActualizacion.Borrador)
    {
        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();

        var instId = Guid.NewGuid();
        var institucion = new Institucion(new InstitucionId(instId), "Instituto Ficticio Central");
        db.Instituciones.Add(institucion);

        var p1 = new Persona(
            Guid.NewGuid(),
            new InstitucionId(instId),
            Documento,
            RolUsuario.Usuario,
            "Docente Ficticio",
            "docente@ejemplo.test",
            accesoHabilitado: true, correoVerificado: true,
            estadoActualizacion: estado,
            tratamientoDatosAceptado: true);

        var p2 = new Persona(
            Guid.NewGuid(),
            new InstitucionId(instId),
            DocumentoAjeno,
            RolUsuario.Usuario,
            "Otro Docente",
            "otro@ejemplo.test",
            accesoHabilitado: true, correoVerificado: true,
            estadoActualizacion: EstadoActualizacion.Borrador,
            tratamientoDatosAceptado: true);

        var sup = new Persona(
            Guid.NewGuid(),
            new InstitucionId(instId),
            Supervisor,
            RolUsuario.Supervisor,
            "Supervisor Evaluador",
            "sup@ejemplo.test",
            accesoHabilitado: true, correoVerificado: true);

        var campana = new Campana(
            Guid.NewGuid(),
            new InstitucionId(instId),
            "Campaña 2026",
            campanaAbierta ? DateTime.UtcNow.AddDays(-2) : DateTime.UtcNow.AddDays(-30),
            campanaAbierta ? DateTime.UtcNow.AddDays(20) : DateTime.UtcNow.AddDays(-10),
            activa: true);

        db.Personas.AddRange(p1, p2, sup);
        db.Campanas.Add(campana);

        if (!await db.ElementosCatalogo.AnyAsync(e => e.Id == 1001))
        {
            db.ElementosCatalogo.Add(new ElementoCatalogo(1001, TipoCatalogo.Pais, "EC", "Ecuador"));
            db.ElementosCatalogo.Add(new ElementoCatalogo(1002, TipoCatalogo.Provincia, "PICHINCHA", "Pichincha", padreId: 1001));
            db.ElementosCatalogo.Add(new ElementoCatalogo(1003, TipoCatalogo.Canton, "QUITO", "Quito", padreId: 1002));
            db.ElementosCatalogo.Add(new ElementoCatalogo(1004, TipoCatalogo.Parroquia, "IÑAQUITO", "Iñaquito", padreId: 1003));
            db.ElementosCatalogo.Add(new ElementoCatalogo(1005, TipoCatalogo.Etnia, "MESTIZO", "Mestizo"));
        }

        await db.SaveChangesAsync();
        return (instId, p1.Id, p2.Id);
    }

    private async Task<ArchivoAdjunto> CrearArchivoAsync(Guid instId, Guid personaId, string nombre = "respaldo.pdf", string tipo = "application/pdf")
    {
        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();

        var archivo = new ArchivoAdjunto(
            Guid.NewGuid(),
            new InstitucionId(instId),
            personaId,
            nombre,
            tipo,
            2048,
            "hash" + Guid.NewGuid().ToString("N"),
            "rutas/" + nombre);

        db.ArchivosAdjuntos.Add(archivo);
        await db.SaveChangesAsync();
        return archivo;
    }

    private Task<HttpResponseMessage> EnviarAsync(
        HttpMethod metodo,
        string ruta,
        Guid instId,
        string documento,
        string rol = "Usuario",
        object? cuerpo = null)
    {
        var mensaje = new HttpRequestMessage(metodo, new Uri(ruta, UriKind.Relative));
        mensaje.Headers.Add("X-Institucion-Id", instId.ToString());
        mensaje.Headers.Add("X-Actor", documento);
        mensaje.Headers.Add("X-Rol", rol);
        if (cuerpo != null)
        {
            mensaje.Content = JsonContent.Create(cuerpo);
        }

        return _cliente.SendAsync(mensaje);
    }

    // ==========================================
    // PARTE 1: FICHA PERSONAL Y REGLAS DE RESPALDO (T-02)
    // ==========================================

    [Fact]
    public async Task Ficha_personal_actualizar_y_consultar_exitoso()
    {
        var (instId, _, _) = await ConfigurarDatosInicialesAsync();

        var request = new GuardarFichaPersonalRequest(
            PrimerNombre: "Carlos",
            PrimerApellido: "Paredes",
            SegundoApellido: "Gomez",
            SexoId: SexoHombre,
            FechaNacimiento: new DateOnly(1988, 5, 12),
            PaisNacimientoId: 1001,
            EstadoCivilId: EstadoCivilSoltero,
            PaisNacionalidadId: 1001,
            ParroquiaResidenciaId: 1004,
            CallePrincipal: "Av. Naciones Unidas",
            Celular: "0998765432",
            CorreoInstitucional: "carlos.paredes@ejemplo.test",
            EtniaId: 1005);

        var respuestaPut = await EnviarAsync(HttpMethod.Put, "/api/mis-datos/hoja-de-vida/ficha", instId, Documento, cuerpo: request);
        Assert.Equal(HttpStatusCode.OK, respuestaPut.StatusCode);

        var respuestaGet = await EnviarAsync(HttpMethod.Get, "/api/mis-datos/hoja-de-vida/ficha", instId, Documento);
        Assert.Equal(HttpStatusCode.OK, respuestaGet.StatusCode);
        var ficha = await respuestaGet.Content.ReadFromJsonAsync<FichaPersonalDto>();
        Assert.NotNull(ficha);
        Assert.Equal("Carlos", ficha.PrimerNombre);
        Assert.Equal("Paredes", ficha.PrimerApellido);
        Assert.Equal("0998765432", ficha.Celular);
        Assert.Equal(1005, ficha.EtniaId);
        Assert.Equal(1004, ficha.ParroquiaResidenciaId);
    }

    [Fact]
    public async Task Ficha_personal_actualizar_conserva_parroquia_residencia_en_guardados_subsecuentes()
    {
        var (instId, _, _) = await ConfigurarDatosInicialesAsync();

        var requestInicial = new GuardarFichaPersonalRequest(
            PrimerNombre: "Carlos",
            PrimerApellido: "Paredes",
            SexoId: SexoHombre,
            FechaNacimiento: new DateOnly(1988, 5, 12),
            PaisNacimientoId: 1001,
            EstadoCivilId: EstadoCivilSoltero,
            PaisNacionalidadId: 1001,
            ParroquiaResidenciaId: 1004,
            CallePrincipal: "Av. Naciones Unidas",
            Celular: "0998765432",
            CorreoInstitucional: "carlos.paredes@ejemplo.test");

        var respuesta1 = await EnviarAsync(HttpMethod.Put, "/api/mis-datos/hoja-de-vida/ficha", instId, Documento, cuerpo: requestInicial);
        Assert.Equal(HttpStatusCode.OK, respuesta1.StatusCode);
        var guardada1 = await respuesta1.Content.ReadFromJsonAsync<FichaPersonalDto>();
        Assert.NotNull(guardada1);
        Assert.Equal(1004, guardada1.ParroquiaResidenciaId);

        // Segundo guardado actualizando otro campo sin perder parroquia
        var requestModificado = requestInicial with { CallePrincipal = "Av. Amazonas 123" };
        var respuesta2 = await EnviarAsync(HttpMethod.Put, "/api/mis-datos/hoja-de-vida/ficha", instId, Documento, cuerpo: requestModificado);
        Assert.Equal(HttpStatusCode.OK, respuesta2.StatusCode);
        var guardada2 = await respuesta2.Content.ReadFromJsonAsync<FichaPersonalDto>();
        Assert.NotNull(guardada2);
        Assert.Equal(1004, guardada2.ParroquiaResidenciaId);
        Assert.Equal("Av. Amazonas 123", guardada2.CallePrincipal);

        // Consulta posterior confirma persistencia
        var respuestaGet = await EnviarAsync(HttpMethod.Get, "/api/mis-datos/hoja-de-vida/ficha", instId, Documento);
        Assert.Equal(HttpStatusCode.OK, respuestaGet.StatusCode);
        var ficha = await respuestaGet.Content.ReadFromJsonAsync<FichaPersonalDto>();
        Assert.NotNull(ficha);
        Assert.Equal(1004, ficha.ParroquiaResidenciaId);
    }

    [Fact]
    public async Task Ficha_personal_rechaza_etnia_con_tipo_de_catalogo_incorrecto()
    {
        var (instId, _, _) = await ConfigurarDatosInicialesAsync();

        // 1004 es Parroquia, no Etnia
        var request = new GuardarFichaPersonalRequest(
            PrimerNombre: "Carlos",
            PrimerApellido: "Paredes",
            SegundoApellido: "Gomez",
            SexoId: SexoHombre,
            FechaNacimiento: new DateOnly(1988, 5, 12),
            PaisNacimientoId: 1001,
            EstadoCivilId: EstadoCivilSoltero,
            PaisNacionalidadId: 1001,
            ParroquiaResidenciaId: 1004,
            CallePrincipal: "Av. Naciones Unidas",
            Celular: "0998765432",
            CorreoInstitucional: "carlos.paredes@ejemplo.test",
            EtniaId: 1004);

        var respuesta = await EnviarAsync(HttpMethod.Put, "/api/mis-datos/hoja-de-vida/ficha", instId, Documento, cuerpo: request);
        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        var error = await respuesta.Content.ReadAsStringAsync();
        Assert.Contains("Etnia", error);
    }

    [Fact]
    public async Task Asociar_foto_a_ficha_rechaza_pdf_y_archivo_de_otra_persona()
    {
        var (instId, p1Id, p2Id) = await ConfigurarDatosInicialesAsync();

        var pdfPropio = await CrearArchivoAsync(instId, p1Id, "doc.pdf", "application/pdf");
        var pngAjeno = await CrearArchivoAsync(instId, p2Id, "foto.png", "image/png");
        var pngPropio = await CrearArchivoAsync(instId, p1Id, "foto.png", "image/png");

        // 1. PDF propio rechazado para foto de perfil (RF-HDV-006)
        var reqPdf = new GuardarFichaPersonalRequest(
            PrimerNombre: "Carlos", PrimerApellido: "Paredes", SegundoApellido: "Gomez",
            SexoId: SexoHombre, FechaNacimiento: new DateOnly(1988, 5, 12),
            PaisNacimientoId: 1001, EstadoCivilId: EstadoCivilSoltero, PaisNacionalidadId: 1001,
            ParroquiaResidenciaId: 1004, CallePrincipal: "Calle 1", Celular: "0998765432",
            CorreoInstitucional: "carlos@ejemplo.test", FotoArchivoId: pdfPropio.Id);

        var resPdf = await EnviarAsync(HttpMethod.Put, "/api/mis-datos/hoja-de-vida/ficha", instId, Documento, cuerpo: reqPdf);
        Assert.Equal(HttpStatusCode.BadRequest, resPdf.StatusCode);
        var errPdf = await resPdf.Content.ReadAsStringAsync();
        Assert.Contains("PNG o JPG", errPdf);

        // 2. PNG ajeno rechazado (RF-HDV-006, RF-HDV-015: 404 para no filtrar existencia de id)
        var reqAjeno = new GuardarFichaPersonalRequest(
            PrimerNombre: "Carlos", PrimerApellido: "Paredes", SegundoApellido: "Gomez",
            SexoId: SexoHombre, FechaNacimiento: new DateOnly(1988, 5, 12),
            PaisNacimientoId: 1001, EstadoCivilId: EstadoCivilSoltero, PaisNacionalidadId: 1001,
            ParroquiaResidenciaId: 1004, CallePrincipal: "Calle 1", Celular: "0998765432",
            CorreoInstitucional: "carlos@ejemplo.test", FotoArchivoId: pngAjeno.Id);

        var resAjeno = await EnviarAsync(HttpMethod.Put, "/api/mis-datos/hoja-de-vida/ficha", instId, Documento, cuerpo: reqAjeno);
        Assert.Equal(HttpStatusCode.NotFound, resAjeno.StatusCode);
        var errAjeno = await resAjeno.Content.ReadAsStringAsync();
        Assert.Contains("no pertenece", errAjeno);

        // 3. PNG propio aceptado
        var reqPropio = new GuardarFichaPersonalRequest(
            PrimerNombre: "Carlos", PrimerApellido: "Paredes", SegundoApellido: "Gomez",
            SexoId: SexoHombre, FechaNacimiento: new DateOnly(1988, 5, 12),
            PaisNacimientoId: 1001, EstadoCivilId: EstadoCivilSoltero, PaisNacionalidadId: 1001,
            ParroquiaResidenciaId: 1004, CallePrincipal: "Calle 1", Celular: "0998765432",
            CorreoInstitucional: "carlos@ejemplo.test", FotoArchivoId: pngPropio.Id);

        var resPropio = await EnviarAsync(HttpMethod.Put, "/api/mis-datos/hoja-de-vida/ficha", instId, Documento, cuerpo: reqPropio);
        Assert.Equal(HttpStatusCode.OK, resPropio.StatusCode);
    }

    // ==========================================
    // SECCIONES MULTI-REGISTRO: CRUD Y AISLAMIENTO (RF-HDV-002, RF-HDV-015)
    // ==========================================

    [Fact]
    public async Task Titulos_academicos_ciclo_completo_y_proteccion_contra_archivo_ajeno()
    {
        var (instId, p1Id, p2Id) = await ConfigurarDatosInicialesAsync();

        var archivoPropio = await CrearArchivoAsync(instId, p1Id, "titulo.pdf");
        var archivoAjeno = await CrearArchivoAsync(instId, p2Id, "titulo_ajeno.pdf");

        // 1. Crear con archivo ajeno debe fallar con 404 (RF-HDV-015)
        var reqTituloAjeno = new GuardarTituloAcademicoRequest(
            NombreTitulo: "Licenciatura en Educación",
            GradoAcademicoId: GradoLicenciatura,
            NombreInstitucionOtra: "Universidad Nacional",
            ArchivoId: archivoAjeno.Id);

        var resFalla = await EnviarAsync(HttpMethod.Post, "/api/mis-datos/hoja-de-vida/titulos", instId, Documento, cuerpo: reqTituloAjeno);
        Assert.Equal(HttpStatusCode.NotFound, resFalla.StatusCode);

        // 2. Crear con archivo propio
        var reqTituloValido = new GuardarTituloAcademicoRequest(
            NombreTitulo: "Licenciatura en Educación",
            GradoAcademicoId: GradoLicenciatura,
            NombreInstitucionOtra: "Universidad Nacional",
            ArchivoId: archivoPropio.Id);

        var resCrear = await EnviarAsync(HttpMethod.Post, "/api/mis-datos/hoja-de-vida/titulos", instId, Documento, cuerpo: reqTituloValido);
        Assert.Equal(HttpStatusCode.Created, resCrear.StatusCode);
        var tituloCreado = await resCrear.Content.ReadFromJsonAsync<TituloAcademicoDto>();
        Assert.NotNull(tituloCreado);
        Assert.Equal("Licenciatura en Educación", tituloCreado.NombreTitulo);

        // 3. Modificar título
        var reqEditar = new GuardarTituloAcademicoRequest(
            NombreTitulo: "Licenciatura en Ciencias de la Educación",
            GradoAcademicoId: GradoLicenciatura,
            NombreInstitucionOtra: "Universidad Nacional Central",
            ArchivoId: archivoPropio.Id);

        var resEditar = await EnviarAsync(HttpMethod.Put, $"/api/mis-datos/hoja-de-vida/titulos/{tituloCreado.Id}", instId, Documento, cuerpo: reqEditar);
        Assert.Equal(HttpStatusCode.OK, resEditar.StatusCode);
        var tituloEditado = await resEditar.Content.ReadFromJsonAsync<TituloAcademicoDto>();
        Assert.NotNull(tituloEditado);
        Assert.Equal("Licenciatura en Ciencias de la Educación", tituloEditado.NombreTitulo);

        // 4. Otra persona intenta modificarlo -> 404 (RF-HDV-015)
        var resAjenoMod = await EnviarAsync(HttpMethod.Put, $"/api/mis-datos/hoja-de-vida/titulos/{tituloCreado.Id}", instId, DocumentoAjeno, cuerpo: reqEditar);
        Assert.Equal(HttpStatusCode.NotFound, resAjenoMod.StatusCode);

        // 5. Eliminar título
        var resBorrar = await EnviarAsync(HttpMethod.Delete, $"/api/mis-datos/hoja-de-vida/titulos/{tituloCreado.Id}", instId, Documento);
        Assert.Equal(HttpStatusCode.NoContent, resBorrar.StatusCode);

        // 6. Eliminarlo nuevamente -> 404
        var resBorrar404 = await EnviarAsync(HttpMethod.Delete, $"/api/mis-datos/hoja-de-vida/titulos/{tituloCreado.Id}", instId, Documento);
        Assert.Equal(HttpStatusCode.NotFound, resBorrar404.StatusCode);
    }

    [Fact]
    public async Task Referencias_maximo_cinco_por_tipo()
    {
        var (instId, _, _) = await ConfigurarDatosInicialesAsync();

        // Registrar 5 referencias de tipo Personal
        for (var i = 1; i <= 5; i++)
        {
            var req = new GuardarReferenciaRequest(
                Tipo: "personal",
                NombresApellidos: "Referencia Personal " + NombresReferenciaFicticios[i],
                Telefono: $"099111222{i}");

            var res = await EnviarAsync(HttpMethod.Post, "/api/mis-datos/hoja-de-vida/referencias", instId, Documento, cuerpo: req);
            Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        }

        // La 6ta referencia Personal debe rechazarse con 400
        var reqSexta = new GuardarReferenciaRequest(
            Tipo: "personal",
            NombresApellidos: "Sexta Referencia",
            Telefono: "0999999999");

        var resSexta = await EnviarAsync(HttpMethod.Post, "/api/mis-datos/hoja-de-vida/referencias", instId, Documento, cuerpo: reqSexta);
        Assert.Equal(HttpStatusCode.BadRequest, resSexta.StatusCode);
        var err = await resSexta.Content.ReadAsStringAsync();
        Assert.Contains("cinco referencias", err, StringComparison.OrdinalIgnoreCase);

        // Pero sí debe permitir una de tipo Familiar (hasta 5)
        var reqFamiliar = new GuardarReferenciaRequest(
            Tipo: "familiar",
            NombresApellidos: "Referencia Familiar Uno",
            Telefono: "0998887771");

        var resFam = await EnviarAsync(HttpMethod.Post, "/api/mis-datos/hoja-de-vida/referencias", instId, Documento, cuerpo: reqFamiliar);
        Assert.Equal(HttpStatusCode.Created, resFam.StatusCode);
    }

    [Fact]
    public async Task Bloqueo_de_edicion_en_enviado_o_fuera_de_campana()
    {
        // 1. Fuera de campaña -> 403 Forbidden (RF-CAM-003, RF-HDV-010)
        var (instCerrada, _, _) = await ConfigurarDatosInicialesAsync(campanaAbierta: false);
        var reqFicha = new GuardarFichaPersonalRequest(
            PrimerNombre: "Carlos", PrimerApellido: "Paredes", SegundoApellido: "Gomez",
            SexoId: SexoHombre, FechaNacimiento: new DateOnly(1988, 5, 12),
            PaisNacimientoId: 1001, EstadoCivilId: EstadoCivilSoltero, PaisNacionalidadId: 1001,
            ParroquiaResidenciaId: 1004, CallePrincipal: "Calle", Celular: "0991112233",
            CorreoInstitucional: "carlos@ejemplo.test");

        var resFueraCampana = await EnviarAsync(HttpMethod.Put, "/api/mis-datos/hoja-de-vida/ficha", instCerrada, Documento, cuerpo: reqFicha);
        Assert.Equal(HttpStatusCode.Forbidden, resFueraCampana.StatusCode);

        // 2. Estado Enviado -> 400 BadRequest (AsegurarEdicionPermitida)
        var (instEnviada, _, _) = await ConfigurarDatosInicialesAsync(campanaAbierta: true, estado: EstadoActualizacion.Enviado);
        var resEnviado = await EnviarAsync(HttpMethod.Put, "/api/mis-datos/hoja-de-vida/ficha", instEnviada, Documento, cuerpo: reqFicha);
        Assert.Equal(HttpStatusCode.BadRequest, resEnviado.StatusCode);
    }

    // ==========================================
    // PARTE 2: DOCUMENTOS PERSONALES SEGÚN REQUISITOS (T-03)
    // ==========================================

    [Fact]
    public async Task Documentos_personales_asociar_y_listar_por_requisito()
    {
        var (instId, p1Id, _) = await ConfigurarDatosInicialesAsync();

        // Configurar tipo de funcionario, tipo de documento y requisito
        Guid tipoDocId;
        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            var inst = new InstitucionId(instId);

            var tipoFunc = new TipoFuncionario(Guid.NewGuid(), inst, "DOC", "Docente Titular");
            db.TiposFuncionario.Add(tipoFunc);

            var persona = await db.Personas.IgnoreQueryFilters().SingleAsync(p => p.Id == p1Id);
            persona.AsignarTipoFuncionario(tipoFunc.Id);

            var tipoDoc = new TipoDocumento(Guid.NewGuid(), inst, "CEDULA", "Cédula de Ciudadanía");
            db.TiposDocumento.Add(tipoDoc);
            tipoDocId = tipoDoc.Id;

            var requisito = new RequisitoDocumento(Guid.NewGuid(), inst, tipoDoc.Id, tipoFunc.Id, esObligatorio: true);
            db.RequisitosDocumento.Add(requisito);

            await db.SaveChangesAsync();
        }

        // Consultar lista de documentos personales
        var resDocs = await EnviarAsync(HttpMethod.Get, "/api/mis-datos/documentos", instId, Documento);
        Assert.Equal(HttpStatusCode.OK, resDocs.StatusCode);
        var docs = await resDocs.Content.ReadFromJsonAsync<List<DocumentoRequeridoDto>>();
        Assert.NotNull(docs);
        var docCedula = Assert.Single(docs);
        Assert.Equal("CEDULA", docCedula.Codigo);
        Assert.True(docCedula.EsObligatorio);
        Assert.Null(docCedula.Registrado);

        // Asociar archivo al documento
        var archivoCedula = await CrearArchivoAsync(instId, p1Id, "cedula.pdf");
        var resPutDoc = await EnviarAsync(
            HttpMethod.Put,
            $"/api/mis-datos/documentos/{tipoDocId}",
            instId,
            Documento,
            cuerpo: new GuardarDocumentoPersonalRequest(archivoCedula.Id, NumeroDocumento: "1700000000"));

        Assert.Equal(HttpStatusCode.OK, resPutDoc.StatusCode);
        var docGuardado = await resPutDoc.Content.ReadFromJsonAsync<DocumentoPersonalDto>();
        Assert.NotNull(docGuardado);
        Assert.Equal(archivoCedula.Id, docGuardado.ArchivoId);

        // Volver a consultar y verificar que ya tiene archivo registrado
        var resDocs2 = await EnviarAsync(HttpMethod.Get, "/api/mis-datos/documentos", instId, Documento);
        var docs2 = await resDocs2.Content.ReadFromJsonAsync<List<DocumentoRequeridoDto>>();
        Assert.NotNull(docs2);
        Assert.Equal(archivoCedula.Id, docs2[0].Registrado?.ArchivoId);
    }

    // ==========================================
    // PARTE 3: VALIDACIÓN DE COMPLETITUD AL ENVIAR (T-04)
    // ==========================================

    [Fact]
    public async Task Enviar_con_datos_incompletos_responde_400_con_lista_de_faltantes()
    {
        var (instId, _, _) = await ConfigurarDatosInicialesAsync();

        // 1. Consultar faltantes directamente: debe indicar ficha incompleta, estudios y referencias
        var resFaltantes = await EnviarAsync(HttpMethod.Get, "/api/mis-datos/hoja-de-vida/faltantes", instId, Documento);
        Assert.Equal(HttpStatusCode.OK, resFaltantes.StatusCode);
        var faltantesDto = await resFaltantes.Content.ReadFromJsonAsync<ResultadoValidacionEnvioDto>();
        Assert.NotNull(faltantesDto);
        Assert.False(faltantesDto.Completo);
        Assert.NotEmpty(faltantesDto.Faltantes);

        // 2. Intentar enviar a revisión debe responder 400 Bad Request con EnvioIncompletoRespuesta
        var resEnviar = await EnviarAsync(HttpMethod.Post, "/api/mis-datos/enviar", instId, Documento);
        Assert.Equal(HttpStatusCode.BadRequest, resEnviar.StatusCode);
        var cuerpoError = await resEnviar.Content.ReadFromJsonAsync<EnvioIncompletoRespuesta>();
        Assert.NotNull(cuerpoError);
        Assert.Contains(cuerpoError.Faltantes, f => f.Seccion == "ficha");
        Assert.Contains(cuerpoError.Faltantes, f => f.Seccion == "formacion");
        Assert.Contains(cuerpoError.Faltantes, f => f.Seccion == "referencias");
    }

    [Fact]
    public async Task Enviar_completo_pasa_exitosamente_a_enviado()
    {
        var (instId, p1Id, _) = await ConfigurarDatosInicialesAsync();

        // 1. Llenar Ficha Personal completa
        var reqFicha = new GuardarFichaPersonalRequest(
            PrimerNombre: "Ana",
            PrimerApellido: "Martínez",
            SegundoApellido: "López",
            SexoId: SexoHombre,
            FechaNacimiento: new DateOnly(1985, 3, 20),
            PaisNacimientoId: 1001,
            EstadoCivilId: EstadoCivilSoltero,
            PaisNacionalidadId: 1001,
            ParroquiaResidenciaId: 1004,
            CallePrincipal: "Av. 10 de Agosto",
            Celular: "0991234567",
            CorreoInstitucional: "docente@ejemplo.test",
            EtniaId: 1005);
        var resFicha = await EnviarAsync(HttpMethod.Put, "/api/mis-datos/hoja-de-vida/ficha", instId, Documento, cuerpo: reqFicha);
        Assert.Equal(HttpStatusCode.OK, resFicha.StatusCode);

        // 2. Registrar Formación Académica con archivo adjunto
        var archivoTitulo = await CrearArchivoAsync(instId, p1Id, "titulo.pdf");
        var reqTitulo = new GuardarTituloAcademicoRequest(
            NombreTitulo: "Ingeniería en Sistemas",
            GradoAcademicoId: GradoLicenciatura,
            NombreInstitucionOtra: "Escuela Politécnica",
            ArchivoId: archivoTitulo.Id);
        var resTitulo = await EnviarAsync(HttpMethod.Post, "/api/mis-datos/hoja-de-vida/titulos", instId, Documento, cuerpo: reqTitulo);
        Assert.Equal(HttpStatusCode.Created, resTitulo.StatusCode);

        // 3. Registrar al menos dos referencias personales
        var ref1 = new GuardarReferenciaRequest("personal", "Referencia Uno", "0991111111");
        var ref2 = new GuardarReferenciaRequest("personal", "Referencia Dos", "0992222222");
        await EnviarAsync(HttpMethod.Post, "/api/mis-datos/hoja-de-vida/referencias", instId, Documento, cuerpo: ref1);
        await EnviarAsync(HttpMethod.Post, "/api/mis-datos/hoja-de-vida/referencias", instId, Documento, cuerpo: ref2);

        // 4. Registrar cuenta bancaria
        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            db.CuentasBancarias.Add(CuentaBancaria.RegistradaPorPersona(
                Guid.NewGuid(),
                new InstitucionId(instId),
                p1Id,
                new DatosCuentaBancaria(TipoCuentaAhorros, null, "Banco Pichincha", new NumeroCuentaProtegido("cifrado", "1234", "huella")),
                DateTime.UtcNow));
            await db.SaveChangesAsync();
        }

        // 5. Verificar que faltantes ahora esté completo
        var resFaltantes = await EnviarAsync(HttpMethod.Get, "/api/mis-datos/hoja-de-vida/faltantes", instId, Documento);
        Assert.Equal(HttpStatusCode.OK, resFaltantes.StatusCode);
        var faltantesDto = await resFaltantes.Content.ReadFromJsonAsync<ResultadoValidacionEnvioDto>();
        Assert.NotNull(faltantesDto);
        Assert.True(faltantesDto.Completo);
        Assert.Empty(faltantesDto.Faltantes);

        // 6. Enviar a revisión con éxito
        var resEnviar = await EnviarAsync(HttpMethod.Post, "/api/mis-datos/enviar", instId, Documento);
        Assert.Equal(HttpStatusCode.OK, resEnviar.StatusCode);

        // 7. Supervisor consulta la hoja de vida completa para revisión
        var resRevision = await EnviarAsync(
            HttpMethod.Get,
            $"/api/revision/{Documento}/hoja-de-vida",
            instId,
            Supervisor,
            rol: "Supervisor");

        Assert.Equal(HttpStatusCode.OK, resRevision.StatusCode);
        var hdvRevision = await resRevision.Content.ReadFromJsonAsync<HojaDeVidaDto>();
        Assert.NotNull(hdvRevision);
        Assert.Equal("Ana", hdvRevision.Ficha?.PrimerNombre);
        Assert.Single(hdvRevision.Titulos);
        Assert.Equal(2, hdvRevision.Referencias.Count);
    }
}
