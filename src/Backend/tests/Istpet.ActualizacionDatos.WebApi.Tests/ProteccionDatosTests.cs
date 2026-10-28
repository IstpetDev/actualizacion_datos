namespace Istpet.ActualizacionDatos.WebApi.Tests;

using System.Data.Common;
using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;

// Cookies, contexto institucional y servicio de protección REALES; sin FabricaPruebas ni política simulada.
public sealed class ProteccionDatosTests : IDisposable
{
    private const string Clave = "ClaveFicticiaProteccion29";
    private readonly SqliteConnection _conexion = new("DataSource=:memory:");
    private readonly WebApplicationFactory<Program> _fabrica;
    private readonly RelojProteccionDatosPrueba _reloj = new();
    private readonly FallosProteccionDatosPrueba _fallos = new();
    private int _numero;

    public ProteccionDatosTests()
    {
        _conexion.Open();
        _fabrica = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Development");
            builder.ConfigureServices(servicios =>
            {
                servicios.Remove(servicios.Single(d => d.ServiceType == typeof(DbContextOptions<AplicacionDbContext>)));
                servicios.AddSingleton<TimeProvider>(_reloj);
                servicios.AddDbContext<AplicacionDbContext>(opciones => opciones.UseSqlite(_conexion)
                    .UseSnakeCaseNamingConvention().AddInterceptors(_fallos));
                using var proveedor = servicios.BuildServiceProvider();
                using var scope = proveedor.CreateScope();
                scope.ServiceProvider.GetRequiredService<AplicacionDbContext>().Database.EnsureCreated();
            });
        });
    }

    public void Dispose() { _fabrica.Dispose(); _conexion.Dispose(); }

    private HttpClient Cliente() => _fabrica.CreateClient(new WebApplicationFactoryClientOptions
    {
        BaseAddress = new Uri("https://localhost"),
        HandleCookies = true,
        AllowAutoRedirect = false
    });

    private async Task<Persona> CuentaAsync(RolUsuario rol = RolUsuario.Usuario, InstitucionId? institucion = null,
        bool cambiarClave = false, bool aceptacionAntigua = false, string? documento = null, bool correoVerificado = false)
    {
        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        institucion ??= InstitucionId.Nuevo();
        if (!await db.Instituciones.AnyAsync(i => i.Id == institucion)) db.Instituciones.Add(new(institucion, "Institución Ficticia"));
        var persona = new Persona(Guid.NewGuid(), institucion,
            documento ?? (++_numero).ToString("D10", CultureInfo.InvariantCulture), rol,
            "Persona Ficticia", "persona@ejemplo.test", accesoHabilitado: true,
            tratamientoDatosAceptado: aceptacionAntigua, correoVerificado: correoVerificado,
            fechaAceptacionTratamientoDatosUtc: aceptacionAntigua ? _reloj.Ahora.UtcDateTime.AddYears(-1) : null);
        persona.EstablecerPasswordHash(new PasswordHasher<Persona>().HashPassword(persona, Clave), cambiarClave);
        db.Personas.Add(persona);
        await db.SaveChangesAsync();
        return persona;
    }

    private async Task PublicarAsync(Persona persona, string version = "ficticia-1", RolUsuario[]? roles = null,
        DateTime? hasta = null)
    {
        using var scope = _fabrica.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<IServicioProteccionDatos>().PublicarAsync(new(
            persona.InstitucionId.Valor, version, "Aviso Ficticio de Prueba", "Institución Ficticia",
            "CONTENIDO FICTICIO EXCLUSIVO DE PRUEBAS\nFinalidad ficticia; no usar como aviso legal.",
            "Confirmación ficticia exclusiva de pruebas", "https://institucion.ejemplo.test/avisos",
            "Autorización ficticia de prueba", roles ?? Enum.GetValues<RolUsuario>(),
            _reloj.Ahora.UtcDateTime.AddMinutes(-1), hasta, true));
    }

    private static async Task<ResultadoLoginDto> LoginAsync(HttpClient cliente, Persona persona)
    {
        var respuesta = await cliente.PostAsJsonAsync("/api/auth/login", new LoginRequest(persona.Documento, Clave, persona.InstitucionId.Valor));
        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        return (await respuesta.Content.ReadFromJsonAsync<ResultadoLoginDto>())!;
    }

    private static async Task<EstadoProteccionDatosDto> EstadoAsync(HttpClient cliente) =>
        (await cliente.GetFromJsonAsync<EstadoProteccionDatosDto>("/api/proteccion-datos/aviso"))!;

    private static Task<HttpResponseMessage> AceptarAsync(HttpClient cliente, Guid avisoId, bool acepta = true) =>
        cliente.PostAsJsonAsync("/api/mis-datos/aceptar-tratamiento", new AceptarAvisoRequest(avisoId, acepta));

    private async Task<int> EvidenciasAsync()
    {
        using var scope = _fabrica.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AplicacionDbContext>().AceptacionesProteccionDatos.IgnoreQueryFilters().CountAsync();
    }

    [Theory]
    [InlineData(RolUsuario.Usuario)]
    [InlineData(RolUsuario.Supervisor)]
    [InlineData(RolUsuario.Admin)]
    public async Task Cada_rol_acepta_su_aviso_sin_recibir_perfil_previamente(RolUsuario rol)
    {
        var persona = await CuentaAsync(rol);
        await PublicarAsync(persona);
        using var cliente = Cliente();
        var login = await LoginAsync(cliente, persona);
        Assert.True(login.RequiereAceptarProteccionDatos);
        Assert.Empty(login.Documento);
        Assert.Null(login.Nombre);
        Assert.Null(login.Correo);
        var sesion = (await cliente.GetFromJsonAsync<SesionUsuarioDto>("/api/auth/sesion"))!;
        Assert.Empty(sesion.Documento);
        Assert.Null(sesion.Correo);
        var estado = await EstadoAsync(cliente);
        Assert.False(estado.Aceptado);
        Assert.Equal("ficticia-1", estado.Aviso!.Version);
        Assert.Equal(HttpStatusCode.OK, (await AceptarAsync(cliente, estado.Aviso.Id)).StatusCode);
        sesion = (await cliente.GetFromJsonAsync<SesionUsuarioDto>("/api/auth/sesion"))!;
        Assert.False(sesion.RequiereAceptarProteccionDatos);
        Assert.Equal(persona.Documento, sesion.Documento);
        Assert.Equal(1, await EvidenciasAsync());
    }

    [Fact]
    public async Task Cambio_de_clave_precede_al_aviso_y_el_correo_no_se_puede_capturar_antes_de_aceptar()
    {
        var persona = await CuentaAsync(cambiarClave: true);
        await PublicarAsync(persona);
        using var cliente = Cliente();
        Assert.True((await LoginAsync(cliente, persona)).DebeCambiarContrasena);
        Assert.Equal(HttpStatusCode.Forbidden, (await cliente.GetAsync("/api/proteccion-datos/aviso")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await cliente.PostAsJsonAsync("/api/auth/cambiar-clave", new CambiarContrasenaRequest(null, "OtraClaveFicticia30"))).StatusCode);
        var estado = await EstadoAsync(cliente);
        Assert.Equal(HttpStatusCode.Forbidden, (await cliente.PostAsJsonAsync("/api/auth/enviar-codigo-correo", new EnviarCodigoCorreoRequest("otra@ejemplo.test"))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await AceptarAsync(cliente, estado.Aviso!.Id)).StatusCode);
        Assert.False((await cliente.GetFromJsonAsync<SesionUsuarioDto>("/api/auth/sesion"))!.CorreoVerificado);
    }

    public static TheoryData<string, string> Operaciones => new()
    {
        { "GET", "/api/mis-datos" }, { "PUT", "/api/mis-datos" },
        { "GET", "/api/mis-datos/hoja-de-vida" }, { "PUT", "/api/mis-datos/hoja-de-vida/ficha" },
        { "GET", "/api/mis-datos/cuenta-bancaria" }, { "GET", "/api/archivos/mis-archivos" },
        { "POST", "/api/archivos/subir" }, { "GET", "/api/archivos/00000000-0000-0000-0000-000000000001/descargar" },
        { "DELETE", "/api/archivos/00000000-0000-0000-0000-000000000001" },
        { "POST", "/api/mis-datos/enviar" }, { "GET", "/api/revision/pendientes" },
        { "GET", "/api/exportaciones/zip" }, { "GET", "/api/personas" },
        { "POST", "/api/campanas" }, { "GET", "/api/ruta-futura" }
    };

    [Theory]
    [MemberData(nameof(Operaciones))]
    public async Task API_bloquea_operaciones_de_negocio_antes_de_ejecutarlas(string metodo, string ruta)
    {
        var persona = await CuentaAsync();
        await PublicarAsync(persona);
        using var cliente = Cliente();
        await LoginAsync(cliente, persona);
        using var peticion = new HttpRequestMessage(new HttpMethod(metodo), ruta) { Content = JsonContent.Create(new { }) };
        var respuesta = await cliente.SendAsync(peticion);
        Assert.Equal(HttpStatusCode.Forbidden, respuesta.StatusCode);
        Assert.Equal("ACEPTACION_PROTECCION_DATOS_PENDIENTE", (await respuesta.Content.ReadFromJsonAsync<MensajeRespuesta>())!.Codigo);
        Assert.Equal(0, await EvidenciasAsync());
    }

    [Fact]
    public async Task Rechazo_cierre_y_reingreso_no_crean_aceptacion_y_la_confirmacion_debe_ser_explicita()
    {
        var persona = await CuentaAsync();
        await PublicarAsync(persona);
        using var cliente = Cliente();
        await LoginAsync(cliente, persona);
        var aviso = (await EstadoAsync(cliente)).Aviso!;
        Assert.Equal(HttpStatusCode.BadRequest, (await AceptarAsync(cliente, aviso.Id, false)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await cliente.PostAsync("/api/mis-datos/aceptar-tratamiento", null)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await cliente.PostAsync("/api/auth/logout", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await cliente.GetAsync("/api/proteccion-datos/aviso")).StatusCode);
        Assert.True((await LoginAsync(cliente, persona)).RequiereAceptarProteccionDatos);
        Assert.Equal(0, await EvidenciasAsync());
    }

    [Fact]
    public async Task Aceptacion_idempotente_conserva_fecha_UTC_e_institucion_entre_sesiones()
    {
        var persona = await CuentaAsync();
        await PublicarAsync(persona);
        using var cliente = Cliente();
        await LoginAsync(cliente, persona);
        var avisoId = (await EstadoAsync(cliente)).Aviso!.Id;
        var primera = (await (await AceptarAsync(cliente, avisoId)).Content.ReadFromJsonAsync<EstadoProteccionDatosDto>())!;
        _reloj.Ahora = _reloj.Ahora.AddMinutes(3);
        var segunda = (await (await AceptarAsync(cliente, avisoId)).Content.ReadFromJsonAsync<EstadoProteccionDatosDto>())!;
        Assert.Equal(primera.FechaAceptacionUtc, segunda.FechaAceptacionUtc);
        Assert.Equal(DateTimeKind.Utc, segunda.FechaAceptacionUtc!.Value.Kind);
        await cliente.PostAsync("/api/auth/logout", null);
        Assert.False((await LoginAsync(cliente, persona)).RequiereAceptarProteccionDatos);
        Assert.Equal(1, await EvidenciasAsync());
        using var scope = _fabrica.Services.CreateScope();
        var evidencia = await scope.ServiceProvider.GetRequiredService<AplicacionDbContext>().AceptacionesProteccionDatos.IgnoreQueryFilters().SingleAsync();
        Assert.Equal(persona.Id, evidencia.PersonaId);
        Assert.Equal(persona.InstitucionId, evidencia.InstitucionId);
        Assert.Equal(avisoId, evidencia.AvisoId);
    }

    [Fact]
    public async Task Nueva_version_bloquea_sesion_abierta_y_no_admite_la_version_anterior()
    {
        var persona = await CuentaAsync();
        await PublicarAsync(persona);
        using var cliente = Cliente();
        await LoginAsync(cliente, persona);
        var anterior = (await EstadoAsync(cliente)).Aviso!.Id;
        await AceptarAsync(cliente, anterior);
        _reloj.Ahora = _reloj.Ahora.AddHours(1);
        await PublicarAsync(persona, "ficticia-2");
        Assert.Equal(HttpStatusCode.Forbidden, (await cliente.GetAsync("/api/mis-datos")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await AceptarAsync(cliente, anterior)).StatusCode);
        var estado = await EstadoAsync(cliente);
        Assert.False(estado.Aceptado);
        Assert.Equal("ficticia-2", estado.Aviso!.Version);
        Assert.Equal(1, await EvidenciasAsync());
        Assert.Equal(HttpStatusCode.OK, (await AceptarAsync(cliente, estado.Aviso.Id)).StatusCode);
        Assert.Equal(2, await EvidenciasAsync());
    }

    [Fact]
    public async Task Falta_vencimiento_y_ambiguedad_de_aviso_bloquean_sin_impedir_logout()
    {
        var persona = await CuentaAsync();
        using var cliente = Cliente();
        await LoginAsync(cliente, persona);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await cliente.GetAsync("/api/proteccion-datos/aviso")).StatusCode);
        await PublicarAsync(persona, hasta: _reloj.Ahora.UtcDateTime.AddMinutes(1));
        _reloj.Ahora = _reloj.Ahora.AddMinutes(2);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await cliente.GetAsync("/api/proteccion-datos/aviso")).StatusCode);
        await PublicarAsync(persona, "ficticia-2");
        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            db.AvisosProteccionDatos.Add(new(persona.InstitucionId, "configuracion-ficticia-ambigua", "Aviso Ficticio", "Institución Ficticia",
                "Contenido ficticio", "Confirmación ficticia", "https://institucion.ejemplo.test/avisos", "Acta ficticia",
                [persona.Rol], _reloj.Ahora.UtcDateTime.AddMinutes(-1)));
            await db.SaveChangesAsync();
        }
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await cliente.GetAsync("/api/proteccion-datos/aviso")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await cliente.GetAsync("/api/mis-datos")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await cliente.PostAsync("/api/auth/logout", null)).StatusCode);
        Assert.Equal(0, await EvidenciasAsync());
    }

    [Fact]
    public async Task Fallos_reales_de_lectura_y_guardado_no_liberan_el_acceso_ni_persisten_evidencia()
    {
        var persona = await CuentaAsync();
        await PublicarAsync(persona);
        using var cliente = Cliente();
        await LoginAsync(cliente, persona);
        var avisoId = (await EstadoAsync(cliente)).Aviso!.Id;
        _fallos.FallarLectura = true;
        Assert.Equal(HttpStatusCode.InternalServerError, (await cliente.GetAsync("/api/proteccion-datos/aviso")).StatusCode);
        Assert.Equal(HttpStatusCode.InternalServerError, (await cliente.GetAsync("/api/mis-datos")).StatusCode);
        _fallos.FallarLectura = false;
        _fallos.FallarGuardado = true;
        Assert.Equal(HttpStatusCode.InternalServerError, (await AceptarAsync(cliente, avisoId)).StatusCode);
        _fallos.FallarGuardado = false;
        Assert.Equal(0, await EvidenciasAsync());
        Assert.False((await EstadoAsync(cliente)).Aceptado);
        Assert.Equal(HttpStatusCode.Forbidden, (await cliente.GetAsync("/api/mis-datos")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await AceptarAsync(cliente, avisoId)).StatusCode);
        Assert.Equal(1, await EvidenciasAsync());
    }

    [Fact]
    public async Task Mismo_documento_en_dos_instituciones_no_comparte_aceptacion_ni_permite_suplantacion()
    {
        var a = await CuentaAsync(documento: "0000000000");
        var b = await CuentaAsync(documento: "0000000000");
        await PublicarAsync(a);
        await PublicarAsync(b);
        using var clienteA = Cliente();
        using var clienteB = Cliente();
        await LoginAsync(clienteA, a);
        await LoginAsync(clienteB, b);
        var avisoA = (await EstadoAsync(clienteA)).Aviso!.Id;
        var avisoB = (await EstadoAsync(clienteB)).Aviso!.Id;
        Assert.Equal(HttpStatusCode.Conflict, (await AceptarAsync(clienteA, avisoB)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await AceptarAsync(clienteA, avisoA)).StatusCode);
        Assert.True((await clienteB.GetFromJsonAsync<SesionUsuarioDto>("/api/auth/sesion"))!.RequiereAceptarProteccionDatos);
        Assert.Equal(HttpStatusCode.BadRequest, (await clienteA.PostAsJsonAsync("/api/mis-datos/aceptar-tratamiento?documento=0000000001", new AceptarAvisoRequest(avisoA, true))).StatusCode);
        clienteA.DefaultRequestHeaders.Add("X-Institucion-Id", b.InstitucionId.Valor.ToString());
        Assert.Equal(HttpStatusCode.Forbidden, (await clienteA.GetAsync("/api/proteccion-datos/aviso")).StatusCode);
        using var sinSesion = Cliente();
        sinSesion.DefaultRequestHeaders.Add("X-Actor", a.Documento);
        sinSesion.DefaultRequestHeaders.Add("X-Institucion-Id", a.InstitucionId.Valor.ToString());
        sinSesion.DefaultRequestHeaders.Add("X-Rol", "Superadmin");
        Assert.Equal(HttpStatusCode.Unauthorized, (await sinSesion.GetAsync("/api/personas")).StatusCode);
        Assert.Equal(1, await EvidenciasAsync());
    }

    [Fact]
    public async Task Aceptacion_antigua_no_autoriza_y_servicio_de_envio_revalida_sin_crear_registros()
    {
        var persona = await CuentaAsync(aceptacionAntigua: true, correoVerificado: true);
        await PublicarAsync(persona);
        using var cliente = Cliente();
        Assert.True((await LoginAsync(cliente, persona)).RequiereAceptarProteccionDatos);
        Assert.Equal(HttpStatusCode.Forbidden, (await cliente.PostAsync("/api/mis-datos/enviar", null)).StatusCode);
        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        db.Campanas.Add(new(Guid.NewGuid(), persona.InstitucionId, "Campaña Ficticia", DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1)));
        await Spec0001E2ETests.AgregarHojaDeVidaCompletaAsync(db, persona.InstitucionId.Valor, persona.Id, persona.Correo!);
        await db.SaveChangesAsync();
        var contexto = scope.ServiceProvider.GetRequiredService<Istpet.ActualizacionDatos.Infrastructure.Multitenancy.ContextoInstitucion>();
        contexto.InstitucionId = persona.InstitucionId;
        await Assert.ThrowsAsync<Istpet.ActualizacionDatos.Application.ProteccionDatosException>(() =>
            scope.ServiceProvider.GetRequiredService<IServicioDatosUsuario>().EnviarARevisionAsync(persona.Documento));
        Assert.Equal(0, await EvidenciasAsync());
        await AceptarAsync(cliente, (await EstadoAsync(cliente)).Aviso!.Id);
        Assert.Equal(HttpStatusCode.OK, (await cliente.PostAsync("/api/mis-datos/enviar", null)).StatusCode);
        Assert.Equal(1, await EvidenciasAsync());
        Assert.Equal(EstadoActualizacion.Enviado, (await db.Personas.IgnoreQueryFilters().AsNoTracking().SingleAsync()).EstadoActualizacion);
    }

    [Fact]
    public async Task No_hay_fallback_a_otro_rol_y_aceptar_no_habilita_una_cuenta_revocada()
    {
        var persona = await CuentaAsync(RolUsuario.Admin);
        await PublicarAsync(persona, roles: [RolUsuario.Usuario]);
        using var cliente = Cliente();
        await LoginAsync(cliente, persona);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await cliente.GetAsync("/api/proteccion-datos/aviso")).StatusCode);
        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            (await db.Personas.IgnoreQueryFilters().SingleAsync()).DeshabilitarAcceso();
            await db.SaveChangesAsync();
        }
        Assert.Equal(HttpStatusCode.Unauthorized, (await cliente.GetAsync("/api/proteccion-datos/aviso")).StatusCode);
        Assert.Equal(0, await EvidenciasAsync());
    }

    [Fact]
    public async Task Superadmin_accede_y_administra_instituciones_sin_aviso_mientras_roles_institucionales_siguen_protegidos()
    {
        // 1. Arranque en frío: ningún aviso publicado en ninguna institución; Superadmin entra con cambio obligatorio de clave.
        var superadmin = await CuentaAsync(RolUsuario.Superadmin, cambiarClave: true, documento: "0000000099");
        using var clienteSuperadmin = Cliente();

        var loginSuperadmin = await LoginAsync(clienteSuperadmin, superadmin);
        Assert.True(loginSuperadmin.DebeCambiarContrasena);
        Assert.False(loginSuperadmin.RequiereAceptarProteccionDatos);
        Assert.Empty(loginSuperadmin.Documento);

        // El cambio obligatorio de contraseña se sigue aplicando a Superadmin antes de abrir el panel global.
        Assert.Equal(HttpStatusCode.Forbidden, (await clienteSuperadmin.GetAsync("/api/instituciones")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await clienteSuperadmin.PostAsJsonAsync(
            "/api/auth/cambiar-clave", new CambiarContrasenaRequest(null, "NuevaClaveSuperadmin99"))).StatusCode);

        var sesionSuperadmin = (await clienteSuperadmin.GetFromJsonAsync<SesionUsuarioDto>("/api/auth/sesion"))!;
        Assert.False(sesionSuperadmin.DebeCambiarContrasena);
        Assert.False(sesionSuperadmin.RequiereAceptarProteccionDatos);
        Assert.Equal(superadmin.Documento, sesionSuperadmin.Documento);
        Assert.Equal(nameof(RolUsuario.Superadmin), sesionSuperadmin.Rol);

        // 2. Si consulta el endpoint de aviso (p. ej. botón «Volver a cargar el aviso»), recibe estado habilitado sin aviso ni evidencia artificial.
        var estadoAvisoSuperadmin = await EstadoAsync(clienteSuperadmin);
        Assert.True(estadoAvisoSuperadmin.Aceptado);
        Assert.Null(estadoAvisoSuperadmin.Aviso);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await AceptarAsync(clienteSuperadmin, Guid.NewGuid())).StatusCode);

        // 3. Superadmin abre el panel global, lista y crea instituciones, asigna admins, consulta plantillas y administra otra institución.
        var listadoInicial = await clienteSuperadmin.GetFromJsonAsync<List<InstitucionDto>>("/api/instituciones");
        Assert.NotNull(listadoInicial);
        Assert.Single(listadoInicial!);

        var respuestaCrear = await clienteSuperadmin.PostAsJsonAsync("/api/instituciones", new CrearInstitucionRequest(
            "Instituto Superior Ficticio Inicial",
            [new AdminInicialRequest("1700000091", "Admin Inicial Ficticio", "admin.inicial@ejemplo.test")]));
        Assert.Equal(HttpStatusCode.Created, respuestaCrear.StatusCode);
        var nuevaInstitucion = (await respuestaCrear.Content.ReadFromJsonAsync<InstitucionDto>())!;

        Assert.Equal(HttpStatusCode.OK, (await clienteSuperadmin.PostAsJsonAsync(
            $"/api/instituciones/{nuevaInstitucion.Id}/admins",
            new AsignarAdminsRequest([new AdminInicialRequest("1700000092", "Segundo Admin Ficticio", "admin2@ejemplo.test")]))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await clienteSuperadmin.GetAsync("/api/plantillas-hoja-de-vida")).StatusCode);

        using var peticionTipos = new HttpRequestMessage(HttpMethod.Get, "/api/configuracion/tipos-funcionario");
        peticionTipos.Headers.Add("X-Institucion-Id", nuevaInstitucion.Id.ToString());
        Assert.Equal(HttpStatusCode.OK, (await clienteSuperadmin.SendAsync(peticionTipos)).StatusCode);

        using var peticionSecciones = new HttpRequestMessage(HttpMethod.Get, "/api/configuracion/secciones");
        peticionSecciones.Headers.Add("X-Institucion-Id", nuevaInstitucion.Id.ToString());
        Assert.Equal(HttpStatusCode.OK, (await clienteSuperadmin.SendAsync(peticionSecciones)).StatusCode);

        using var peticionDocConfig = new HttpRequestMessage(HttpMethod.Get, "/api/configuracion/documento-hoja-de-vida");
        peticionDocConfig.Headers.Add("X-Institucion-Id", nuevaInstitucion.Id.ToString());
        Assert.Equal(HttpStatusCode.OK, (await clienteSuperadmin.SendAsync(peticionDocConfig)).StatusCode);

        using var peticionInstInvalida = new HttpRequestMessage(HttpMethod.Get, "/api/configuracion/secciones");
        peticionInstInvalida.Headers.Add("X-Institucion-Id", "no-es-un-guid");
        Assert.Equal(HttpStatusCode.BadRequest, (await clienteSuperadmin.SendAsync(peticionInstInvalida)).StatusCode);

        using var peticionSuplantarActor = new HttpRequestMessage(HttpMethod.Get, "/api/instituciones");
        peticionSuplantarActor.Headers.Add("X-Actor", "1700000091");
        Assert.Equal(HttpStatusCode.Forbidden, (await clienteSuperadmin.SendAsync(peticionSuplantarActor)).StatusCode);

        // 4. La exigencia del aviso se conserva íntegra para Admin, Supervisor y Usuario en la institución recién creada sin aviso.
        using var clienteAdmin = Cliente();
        var loginAdminResp = await clienteAdmin.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("1700000091", "1700000091", nuevaInstitucion.Id));
        Assert.Equal(HttpStatusCode.OK, loginAdminResp.StatusCode);
        var loginAdmin = (await loginAdminResp.Content.ReadFromJsonAsync<ResultadoLoginDto>())!;
        Assert.True(loginAdmin.DebeCambiarContrasena);
        Assert.True(loginAdmin.RequiereAceptarProteccionDatos);
        Assert.Equal(HttpStatusCode.OK, (await clienteAdmin.PostAsJsonAsync(
            "/api/auth/cambiar-clave", new CambiarContrasenaRequest(null, "NuevaClaveAdminInicial91"))).StatusCode);

        var sesionAdmin = (await clienteAdmin.GetFromJsonAsync<SesionUsuarioDto>("/api/auth/sesion"))!;
        Assert.True(sesionAdmin.RequiereAceptarProteccionDatos);
        Assert.Empty(sesionAdmin.Documento);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await clienteAdmin.GetAsync("/api/proteccion-datos/aviso")).StatusCode);
        var bloqueoAdmin = await clienteAdmin.GetAsync("/api/personas");
        Assert.Equal(HttpStatusCode.Forbidden, bloqueoAdmin.StatusCode);
        Assert.Equal("ACEPTACION_PROTECCION_DATOS_PENDIENTE", (await bloqueoAdmin.Content.ReadFromJsonAsync<MensajeRespuesta>())!.Codigo);

        foreach (var rolInstitucional in new[] { RolUsuario.Supervisor, RolUsuario.Usuario })
        {
            var cuenta = await CuentaAsync(rolInstitucional, new InstitucionId(nuevaInstitucion.Id));
            using var clienteRol = Cliente();
            Assert.True((await LoginAsync(clienteRol, cuenta)).RequiereAceptarProteccionDatos);
            Assert.Equal(HttpStatusCode.ServiceUnavailable, (await clienteRol.GetAsync("/api/proteccion-datos/aviso")).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await clienteRol.GetAsync("/api/mis-datos")).StatusCode);
        }

        Assert.Equal(0, await EvidenciasAsync());
    }

    [Fact]
    public async Task Aceptar_no_sustituye_la_verificacion_de_correo_al_enviar()
    {
        var persona = await CuentaAsync();
        await PublicarAsync(persona);
        using var cliente = Cliente();
        await LoginAsync(cliente, persona);
        await AceptarAsync(cliente, (await EstadoAsync(cliente)).Aviso!.Id);
        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            db.Campanas.Add(new(Guid.NewGuid(), persona.InstitucionId, "Campaña Ficticia", DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(1)));
            await db.SaveChangesAsync();
        }
        var respuesta = await cliente.PostAsync("/api/mis-datos/enviar", null);
        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        Assert.Contains("verificar su correo", (await respuesta.Content.ReadFromJsonAsync<MensajeRespuesta>())!.Mensaje, StringComparison.Ordinal);
        Assert.Equal(1, await EvidenciasAsync());
    }

    [Fact]
    public async Task Superadmin_gestiona_y_publica_aviso_institucional_desbloqueando_usuarios_con_auditoria()
    {
        // 1. Superadmin autenticado
        var superadmin = await CuentaAsync(RolUsuario.Superadmin, cambiarClave: false, documento: "0000000099");
        using var clienteSuperadmin = Cliente();
        await LoginAsync(clienteSuperadmin, superadmin);

        // 2. Crear nueva institución
        var respuestaCrear = await clienteSuperadmin.PostAsJsonAsync("/api/instituciones", new CrearInstitucionRequest(
            "Instituto Tecnológico Ficticio Para Políticas",
            [new AdminInicialRequest("1700000095", "Admin Institucional Ficticio", "admin.inst@ejemplo.test")]));
        Assert.Equal(HttpStatusCode.Created, respuestaCrear.StatusCode);
        var nuevaInst = (await respuestaCrear.Content.ReadFromJsonAsync<InstitucionDto>())!;

        // 3. Usuario no superadmin no puede consultar ni publicar en endpoints de superadmin
        var adminSinPermiso = await CuentaAsync(RolUsuario.Admin, cambiarClave: false, documento: "1700000095");
        using var clienteAdminSinPermiso = Cliente();
        await LoginAsync(clienteAdminSinPermiso, adminSinPermiso);

        var getProhibido = await clienteAdminSinPermiso.GetAsync($"/api/superadmin/instituciones/{nuevaInst.Id}/avisos-proteccion-datos");
        Assert.Equal(HttpStatusCode.Forbidden, getProhibido.StatusCode);

        // 4. Superadmin consulta historial inicial: lista vacía
        var historialInicial = await clienteSuperadmin.GetFromJsonAsync<List<AvisoInstitucionalDto>>(
            $"/api/superadmin/instituciones/{nuevaInst.Id}/avisos-proteccion-datos");
        Assert.NotNull(historialInicial);
        Assert.Empty(historialInicial!);

        // 5. Rechazo ante falta de confirmación explícita
        var solicitudSinConfirmar = new PublicarAvisoInstitucionalRequest(
            "1.0.0",
            "Política Institucional Ficticia",
            "Rectorado / Oficial Ficticio",
            "Texto íntegro ficticio del aviso legal para pruebas.",
            "Acepto voluntariamente el tratamiento de mis datos.",
            "https://institucion.test/aviso",
            "Resolución Rectoral 2026-001",
            [RolUsuario.Usuario, RolUsuario.Supervisor, RolUsuario.Admin],
            _reloj.Ahora.UtcDateTime,
            null,
            AprobacionInstitucionalConfirmada: false);

        var respSinConfirmar = await clienteSuperadmin.PostAsJsonAsync(
            $"/api/superadmin/instituciones/{nuevaInst.Id}/avisos-proteccion-datos", solicitudSinConfirmar);
        Assert.Equal(HttpStatusCode.BadRequest, respSinConfirmar.StatusCode);

        // 6. Publicación exitosa por superadmin
        var solicitudValida = solicitudSinConfirmar with { AprobacionInstitucionalConfirmada = true };
        var respPublicar = await clienteSuperadmin.PostAsJsonAsync(
            $"/api/superadmin/instituciones/{nuevaInst.Id}/avisos-proteccion-datos", solicitudValida);
        Assert.Equal(HttpStatusCode.Created, respPublicar.StatusCode);
        var publicado = (await respPublicar.Content.ReadFromJsonAsync<AvisoInstitucionalDto>())!;
        Assert.Equal("1.0.0", publicado.Version);
        Assert.True(publicado.EsVigente);
        Assert.Equal(3, publicado.RolesDestinatarios.Length);

        // 7. Intento de publicar versión duplicada es rechazado
        var respDuplicada = await clienteSuperadmin.PostAsJsonAsync(
            $"/api/superadmin/instituciones/{nuevaInst.Id}/avisos-proteccion-datos", solicitudValida);
        Assert.Equal(HttpStatusCode.BadRequest, respDuplicada.StatusCode);

        // 8. Superadmin consulta historial actualizado
        var historialConAviso = await clienteSuperadmin.GetFromJsonAsync<List<AvisoInstitucionalDto>>(
            $"/api/superadmin/instituciones/{nuevaInst.Id}/avisos-proteccion-datos");
        Assert.NotNull(historialConAviso);
        Assert.Single(historialConAviso!);
        Assert.True(historialConAviso![0].EsVigente);

        // 9. Desbloqueo: Admin de la institución ahora puede consultar y aceptar el aviso
        using var clienteAdminNuevo = Cliente();
        await clienteAdminNuevo.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("1700000095", "1700000095", nuevaInst.Id));
        await clienteAdminNuevo.PostAsJsonAsync("/api/auth/cambiar-clave",
            new CambiarContrasenaRequest(null, "ClaveAdmin95Segura"));

        var estadoAdmin = await clienteAdminNuevo.GetFromJsonAsync<EstadoProteccionDatosDto>("/api/proteccion-datos/aviso");
        Assert.NotNull(estadoAdmin);
        Assert.False(estadoAdmin!.Aceptado);
        Assert.NotNull(estadoAdmin.Aviso);
        Assert.Equal("1.0.0", estadoAdmin.Aviso!.Version);

        var respAceptar = await clienteAdminNuevo.PostAsJsonAsync("/api/mis-datos/aceptar-tratamiento",
            new AceptarAvisoRequest(estadoAdmin.Aviso.Id, true));
        Assert.Equal(HttpStatusCode.OK, respAceptar.StatusCode);

        // Ahora admin accede sin bloqueo
        var personasResp = await clienteAdminNuevo.GetAsync("/api/personas");
        Assert.Equal(HttpStatusCode.OK, personasResp.StatusCode);

        // 10. Verificación de auditoría del actor superadmin
        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            var audit = await db.Auditorias
                .SingleOrDefaultAsync(a => a.Accion == "PUBLICAR_AVISO_PROTECCION_DATOS" && a.InstitucionId == new InstitucionId(nuevaInst.Id));
            Assert.NotNull(audit);
            Assert.Equal("0000000099", audit!.Actor);
            Assert.Contains("1.0.0", audit.Detalle);
        }
    }

    [Fact]
    public async Task Superadmin_consultar_institucion_inexistente_retorna_not_found()
    {
        var superadmin = await CuentaAsync(RolUsuario.Superadmin, cambiarClave: false, documento: "0000000099");
        using var clienteSuperadmin = Cliente();
        await LoginAsync(clienteSuperadmin, superadmin);

        var idInexistente = Guid.NewGuid();
        var resp = await clienteSuperadmin.GetAsync($"/api/superadmin/instituciones/{idInexistente}/avisos-proteccion-datos");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }
}

internal sealed class RelojProteccionDatosPrueba : TimeProvider
{
    public DateTimeOffset Ahora { get; set; } = new(2026, 10, 27, 12, 0, 0, TimeSpan.Zero);
    public override DateTimeOffset GetUtcNow() => Ahora;
}

internal sealed class FallosProteccionDatosPrueba : DbCommandInterceptor, ISaveChangesInterceptor
{
    public bool FallarLectura { get; set; }
    public bool FallarGuardado { get; set; }

    public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(DbCommand command,
        CommandEventData eventData, InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
    {
        if (FallarLectura && command.CommandText.Contains("avisos_proteccion_datos", StringComparison.Ordinal))
            throw new InvalidOperationException("Fallo ficticio de lectura del aviso.");
        return ValueTask.FromResult(result);
    }

    public ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData,
        InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        if (FallarGuardado && eventData.Context!.ChangeTracker.Entries<AceptacionProteccionDatos>().Any(e => e.State == EntityState.Added))
            throw new InvalidOperationException("Fallo ficticio de persistencia de la aceptación.");
        return ValueTask.FromResult(result);
    }
}
