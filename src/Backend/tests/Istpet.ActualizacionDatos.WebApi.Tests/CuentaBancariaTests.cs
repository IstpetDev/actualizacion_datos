namespace Istpet.ActualizacionDatos.WebApi.Tests;

using System.Net;
using System.Net.Http.Json;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Multitenancy;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Istpet.ActualizacionDatos.Infrastructure.Servicios;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

// Issue #45 (T-10): RF-HDV-025 a 027 y ADR-0013. Solo cuentas ficticias evidentes (ADR-0013 dec. 8).
public sealed class CuentaBancariaTests : IDisposable
{
    private const string Documento = "0000000030";
    private const string OtroDocumento = "0000000031";
    private const string Supervisor = "0000000039";
    private const string NumeroNomina = "0000001234";
    private const string NumeroOtro = "0000005678";
    private const int Ahorros = 71;
    private const int Corriente = 72;
    private const int EstadoCivilSoltero = 11;

    private readonly SqliteConnection _conexion;
    private readonly WebApplicationFactory<Program> _fabrica;
    private readonly HttpClient _cliente;

    public CuentaBancariaTests()
        : this(clavesTemporales: true)
    {
    }

    private CuentaBancariaTests(bool clavesTemporales)
    {
        _conexion = new SqliteConnection("DataSource=:memory:");
        _conexion.Open();
        _fabrica = CrearFabrica(_conexion, clavesTemporales);
        _cliente = _fabrica.CreateClient();
    }

    public void Dispose()
    {
        _cliente.Dispose();
        _fabrica.Dispose();
        _conexion.Dispose();
    }

    private static WebApplicationFactory<Program> CrearFabrica(SqliteConnection conexion, bool clavesTemporales) =>
        new FabricaPruebas().WithWebHostBuilder(builder =>
        {
            // Sin claves configuradas: o claves temporales (desarrollo) o 503.
            builder.UseSetting("CuentaBancaria:PermitirClavesTemporales", clavesTemporales ? "true" : "false");
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

    // ---------- Casos simples ----------

    [Fact]
    public async Task Sin_sesion_responde_401()
    {
        var respuesta = await _cliente.GetAsync(new Uri("/api/mis-datos/cuenta-bancaria", UriKind.Relative));

        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
    }

    [Fact]
    public async Task Sin_cuenta_responde_204_y_leer_el_numero_responde_404()
    {
        var inst = await CrearInstitucionAsync();

        Assert.Equal(HttpStatusCode.NoContent, (await EnviarAsync(HttpMethod.Get, "/api/mis-datos/cuenta-bancaria", inst, Documento)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await EnviarAsync(HttpMethod.Get, "/api/mis-datos/cuenta-bancaria/numero", inst, Documento)).StatusCode);
    }

    [Fact]
    public async Task Registrar_cuenta_propia_la_guarda_cifrada_enmascarada_y_auditada()
    {
        var inst = await CrearInstitucionAsync();

        var respuesta = await GuardarAsync(inst, Documento, new GuardarCuentaBancariaRequest(Ahorros, "0000-001 234", NombreBancoOtro: "Banco ficticio"));

        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        var cuenta = (await respuesta.Content.ReadFromJsonAsync<CuentaBancariaDto>())!;
        Assert.Equal("sin-nomina", cuenta.Estado);
        Assert.Equal("******1234", cuenta.NumeroEnmascarado);
        Assert.Equal("Banco ficticio", cuenta.Banco);
        Assert.Equal("Ahorros", cuenta.TipoCuenta);
        Assert.DoesNotContain(NumeroNomina, await respuesta.Content.ReadAsStringAsync(), StringComparison.Ordinal);

        await using var db = Contexto(inst);
        var guardada = await db.CuentasBancarias.SingleAsync();
        Assert.DoesNotContain(NumeroNomina, guardada.NumeroCifrado, StringComparison.Ordinal);
        var auditoria = await db.Auditorias.SingleAsync(a => a.Accion == "GuardarCuentaBancaria");
        Assert.DoesNotContain(NumeroNomina, auditoria.Detalle, StringComparison.Ordinal);
    }

    // ---------- Lectura del número completo ----------

    [Fact]
    public async Task El_dueno_lee_el_numero_completo_sin_cache_y_cada_lectura_se_audita_sin_el_numero()
    {
        var inst = await CrearInstitucionAsync();
        await GuardarAsync(inst, Documento, new GuardarCuentaBancariaRequest(Ahorros, NumeroNomina, NombreBancoOtro: "Banco ficticio"));

        var primera = await EnviarAsync(HttpMethod.Get, "/api/mis-datos/cuenta-bancaria/numero", inst, Documento);
        var segunda = await EnviarAsync(HttpMethod.Get, "/api/mis-datos/cuenta-bancaria/numero", inst, Documento);

        Assert.Equal(HttpStatusCode.OK, primera.StatusCode);
        Assert.Equal(NumeroNomina, (await primera.Content.ReadFromJsonAsync<NumeroCuentaCompletoDto>())!.Numero);
        Assert.True(primera.Headers.CacheControl?.NoStore);
        Assert.Equal(HttpStatusCode.OK, segunda.StatusCode);

        await using var db = Contexto(inst);
        var lecturas = await db.Auditorias.Where(a => a.Accion == "LeerNumeroCuentaBancaria").ToListAsync();
        Assert.Equal(2, lecturas.Count);
        Assert.All(lecturas, a => Assert.DoesNotContain(NumeroNomina, a.Detalle, StringComparison.Ordinal));
    }

    [Fact]
    public async Task Otra_persona_no_puede_leer_un_numero_ajeno_solo_el_suyo()
    {
        var inst = await CrearInstitucionAsync();
        await AgregarPersonaAsync(inst, OtroDocumento, RolUsuario.Usuario);
        await GuardarAsync(inst, Documento, new GuardarCuentaBancariaRequest(Ahorros, NumeroNomina, NombreBancoOtro: "Banco ficticio"));

        var respuesta = await EnviarAsync(HttpMethod.Get, $"/api/mis-datos/cuenta-bancaria/numero?documento={Documento}", inst, OtroDocumento);

        Assert.Equal(HttpStatusCode.NotFound, respuesta.StatusCode);
    }

    // ---------- Validaciones ----------

    private static readonly GuardarCuentaBancariaRequest[] SolicitudesInvalidas =
    [
        new GuardarCuentaBancariaRequest(Ahorros, "00000O1234", NombreBancoOtro: "Banco ficticio"),
        new GuardarCuentaBancariaRequest(Ahorros, "12345", NombreBancoOtro: "Banco ficticio"),
        new GuardarCuentaBancariaRequest(EstadoCivilSoltero, NumeroNomina, NombreBancoOtro: "Banco ficticio"),
        new GuardarCuentaBancariaRequest(999, NumeroNomina, NombreBancoOtro: "Banco ficticio"),
        new GuardarCuentaBancariaRequest(Ahorros, NumeroNomina),
        new GuardarCuentaBancariaRequest(Ahorros, NumeroNomina, BancoId: Corriente),
        new GuardarCuentaBancariaRequest(Ahorros, NumeroNomina, BancoId: 2000, NombreBancoOtro: "Banco ficticio"),
    ];

    // 0 letra en el número · 1 muy corto · 2 tipo de otro catálogo · 3 tipo inexistente · 4 sin banco ·
    // 5 banco que es un tipo de cuenta · 6 banco del catálogo y escrito a la vez
    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(2)]
    [InlineData(3)]
    [InlineData(4)]
    [InlineData(5)]
    [InlineData(6)]
    public async Task Solicitud_invalida_responde_400_y_no_guarda(int caso)
    {
        var inst = await CrearInstitucionAsync();

        var respuesta = await GuardarAsync(inst, Documento, SolicitudesInvalidas[caso]);

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        await using var db = Contexto(inst);
        Assert.False(await db.CuentasBancarias.AnyAsync());
    }

    [Fact]
    public async Task Banco_del_catalogo_se_acepta()
    {
        var inst = await CrearInstitucionAsync();
        await using (var db = Contexto(inst))
        {
            db.ElementosCatalogo.Add(new ElementoCatalogo(1500, TipoCatalogo.Banco, "BANCO_FICTICIO", "Banco Ficticio S.A."));
            await db.SaveChangesAsync();
        }

        var respuesta = await GuardarAsync(inst, Documento, new GuardarCuentaBancariaRequest(Corriente, NumeroNomina, BancoId: 1500));

        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        var cuenta = (await respuesta.Content.ReadFromJsonAsync<CuentaBancariaDto>())!;
        Assert.Equal("Banco Ficticio S.A.", cuenta.Banco);
        Assert.Equal("Corriente", cuenta.TipoCuenta);
    }

    // ---------- Bloqueos de edición ----------

    [Theory]
    [InlineData(EstadoActualizacion.Enviado)]
    [InlineData(EstadoActualizacion.Aprobado)]
    public async Task Fuera_de_borrador_o_devuelto_no_se_modifica(EstadoActualizacion estado)
    {
        var inst = await CrearInstitucionAsync(estado: estado);

        var respuesta = await GuardarAsync(inst, Documento, new GuardarCuentaBancariaRequest(Ahorros, NumeroNomina, NombreBancoOtro: "Banco ficticio"));

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        Assert.Contains("revisión", (await respuesta.Content.ReadFromJsonAsync<MensajeRespuesta>())!.Mensaje, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Sin_campana_abierta_responde_403_pero_se_puede_consultar()
    {
        var inst = await CrearInstitucionAsync(campanaAbierta: false);

        var guardar = await GuardarAsync(inst, Documento, new GuardarCuentaBancariaRequest(Ahorros, NumeroNomina, NombreBancoOtro: "Banco ficticio"));
        var consultar = await EnviarAsync(HttpMethod.Get, "/api/mis-datos/cuenta-bancaria", inst, Documento);

        Assert.Equal(HttpStatusCode.Forbidden, guardar.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, consultar.StatusCode);
    }

    // ---------- Nómina: propuesta, confirmación y comparación (RF-HDV-026) ----------

    [Fact]
    public async Task Propuesta_de_nomina_se_confirma_o_se_corrige_y_el_estado_sigue_la_comparacion()
    {
        var inst = await CrearInstitucionAsync();
        Assert.True(await RegistrarPropuestaAsync(inst, Documento, NumeroNomina));

        Assert.Equal("sin-confirmar", (await ObtenerMiaAsync(inst, Documento)).Estado);

        var confirmar = await EnviarAsync(HttpMethod.Post, "/api/mis-datos/cuenta-bancaria/confirmar", inst, Documento);
        Assert.Equal(HttpStatusCode.OK, confirmar.StatusCode);
        Assert.Equal("coincide", (await confirmar.Content.ReadFromJsonAsync<CuentaBancariaDto>())!.Estado);

        await GuardarAsync(inst, Documento, new GuardarCuentaBancariaRequest(Ahorros, NumeroOtro, NombreBancoOtro: "Banco ficticio"));
        var difiere = await ObtenerMiaAsync(inst, Documento);
        Assert.Equal("difiere", difiere.Estado);
        Assert.Equal("5678", difiere.UltimosDigitos);

        await GuardarAsync(inst, Documento, new GuardarCuentaBancariaRequest(Ahorros, NumeroNomina, NombreBancoOtro: "Banco ficticio"));
        Assert.Equal("coincide", (await ObtenerMiaAsync(inst, Documento)).Estado);

        // Nunca se guardan dos copias del número: solo el cifrado vigente y la huella de la nómina.
        await using var db = Contexto(inst);
        var cuenta = await db.CuentasBancarias.SingleAsync();
        Assert.Equal(cuenta.HuellaNomina, cuenta.HuellaNumero);
        Assert.DoesNotContain(NumeroNomina, cuenta.NumeroCifrado, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Confirmar_sin_propuesta_pendiente_responde_400_y_sin_cuenta_404()
    {
        var inst = await CrearInstitucionAsync();
        Assert.Equal(HttpStatusCode.NotFound, (await EnviarAsync(HttpMethod.Post, "/api/mis-datos/cuenta-bancaria/confirmar", inst, Documento)).StatusCode);

        await GuardarAsync(inst, Documento, new GuardarCuentaBancariaRequest(Ahorros, NumeroNomina, NombreBancoOtro: "Banco ficticio"));

        Assert.Equal(HttpStatusCode.BadRequest, (await EnviarAsync(HttpMethod.Post, "/api/mis-datos/cuenta-bancaria/confirmar", inst, Documento)).StatusCode);
    }

    [Fact]
    public async Task La_nomina_no_sobrescribe_una_cuenta_ya_registrada_por_la_persona()
    {
        var inst = await CrearInstitucionAsync();
        await GuardarAsync(inst, Documento, new GuardarCuentaBancariaRequest(Ahorros, NumeroOtro, NombreBancoOtro: "Banco ficticio"));

        Assert.False(await RegistrarPropuestaAsync(inst, Documento, NumeroNomina));

        var cuenta = await ObtenerMiaAsync(inst, Documento);
        Assert.Equal("sin-nomina", cuenta.Estado);
        Assert.Equal("5678", cuenta.UltimosDigitos);
    }

    // ---------- Supervisor y admin (RF-HDV-027) ----------

    [Fact]
    public async Task Supervisor_ve_estado_y_ultimos_digitos_de_cada_persona_sin_el_numero()
    {
        var inst = await CrearInstitucionAsync();
        await AgregarPersonaAsync(inst, OtroDocumento, RolUsuario.Usuario);
        await RegistrarPropuestaAsync(inst, Documento, NumeroNomina);

        var lista = await EnviarAsync(HttpMethod.Get, "/api/revision/cuentas-bancarias", inst, Supervisor, RolUsuario.Supervisor);
        var detalle = await EnviarAsync(HttpMethod.Get, $"/api/revision/{Documento}/cuenta-bancaria", inst, Supervisor, RolUsuario.Supervisor);
        var sinCuenta = await EnviarAsync(HttpMethod.Get, $"/api/revision/{OtroDocumento}/cuenta-bancaria", inst, Supervisor, RolUsuario.Supervisor);

        Assert.Equal(HttpStatusCode.OK, lista.StatusCode);
        var estados = (await lista.Content.ReadFromJsonAsync<List<EstadoCuentaPersonaDto>>())!;
        Assert.Equal(2, estados.Count); // solo rol usuario: el supervisor no aparece
        Assert.Equal("sin-confirmar", estados.Single(e => e.Documento == Documento).Estado);
        Assert.Equal("1234", estados.Single(e => e.Documento == Documento).UltimosDigitos);
        Assert.Equal("sin-registrar", estados.Single(e => e.Documento == OtroDocumento).Estado);
        Assert.Equal(HttpStatusCode.OK, detalle.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, sinCuenta.StatusCode);

        foreach (var cuerpo in new[] { await lista.Content.ReadAsStringAsync(), await detalle.Content.ReadAsStringAsync() })
        {
            Assert.DoesNotContain(NumeroNomina, cuerpo, StringComparison.Ordinal);
        }
    }

    [Fact]
    public async Task El_usuario_no_entra_a_la_revision_de_cuentas()
    {
        var inst = await CrearInstitucionAsync();

        Assert.Equal(HttpStatusCode.Forbidden, (await EnviarAsync(HttpMethod.Get, "/api/revision/cuentas-bancarias", inst, Documento)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await EnviarAsync(HttpMethod.Get, $"/api/revision/{Documento}/cuenta-bancaria", inst, Documento)).StatusCode);
    }

    [Fact]
    public async Task Aislamiento_un_supervisor_de_otra_institucion_no_ve_la_cuenta()
    {
        var instA = await CrearInstitucionAsync();
        var instB = await CrearInstitucionAsync(documentoUsuario: OtroDocumento);
        await RegistrarPropuestaAsync(instA, Documento, NumeroNomina);

        var detalle = await EnviarAsync(HttpMethod.Get, $"/api/revision/{Documento}/cuenta-bancaria", instB, Supervisor, RolUsuario.Supervisor);
        var lista = await EnviarAsync(HttpMethod.Get, "/api/revision/cuentas-bancarias", instB, Supervisor, RolUsuario.Supervisor);

        Assert.Equal(HttpStatusCode.NotFound, detalle.StatusCode);
        var estados = (await lista.Content.ReadFromJsonAsync<List<EstadoCuentaPersonaDto>>())!;
        Assert.Equal(new[] { OtroDocumento }, estados.Select(e => e.Documento));
        Assert.Equal("sin-registrar", estados[0].Estado);
    }

    // ---------- Completitud al enviar (PD-HDV-17), regla para el validador de T-04 ----------

    [Fact]
    public async Task Regla_de_completitud_pide_registrar_o_confirmar_la_cuenta()
    {
        var inst = await CrearInstitucionAsync();
        await AgregarPersonaAsync(inst, OtroDocumento, RolUsuario.Usuario);
        await RegistrarPropuestaAsync(inst, OtroDocumento, NumeroNomina);

        Assert.Equal("cuenta-bancaria.sin-registrar", Assert.Single(await EvaluarReglaAsync(inst, Documento)).Codigo);
        Assert.Equal("cuenta-bancaria.sin-confirmar", Assert.Single(await EvaluarReglaAsync(inst, OtroDocumento)).Codigo);

        await GuardarAsync(inst, Documento, new GuardarCuentaBancariaRequest(Ahorros, NumeroOtro, NombreBancoOtro: "Banco ficticio"));
        Assert.Empty(await EvaluarReglaAsync(inst, Documento));
    }

    [Fact]
    public void La_regla_queda_registrada_para_el_validador()
    {
        using var scope = _fabrica.Services.CreateScope();

        var reglas = scope.ServiceProvider.GetServices<IReglaCompletitudEnvio>();

        Assert.Contains(reglas, r => r is ReglaCuentaBancariaObligatoria);
    }

    // ---------- Sin claves configuradas ----------

    [Fact]
    public async Task Sin_claves_y_sin_claves_temporales_responde_503()
    {
        using var conexion = new SqliteConnection("DataSource=:memory:");
        conexion.Open();
        using var fabrica = CrearFabrica(conexion, clavesTemporales: false);
        using var cliente = fabrica.CreateClient();
        var inst = Guid.NewGuid();
        using (var scope = fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            SembrarInstitucion(db, inst, Documento, EstadoActualizacion.Borrador, campanaAbierta: true);
            await db.SaveChangesAsync();
        }

        using var guardar = Peticion(HttpMethod.Put, "/api/mis-datos/cuenta-bancaria", inst, Documento);
        guardar.Content = JsonContent.Create(new GuardarCuentaBancariaRequest(Ahorros, NumeroNomina, NombreBancoOtro: "Banco ficticio"));
        using var leer = Peticion(HttpMethod.Get, "/api/mis-datos/cuenta-bancaria/numero", inst, Documento);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await cliente.SendAsync(guardar)).StatusCode);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await cliente.SendAsync(leer)).StatusCode);
    }

    // ---------- Ayudas ----------

    private async Task<Guid> CrearInstitucionAsync(
        EstadoActualizacion estado = EstadoActualizacion.Borrador,
        bool campanaAbierta = true,
        string documentoUsuario = Documento)
    {
        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        var inst = Guid.NewGuid();
        SembrarInstitucion(db, inst, documentoUsuario, estado, campanaAbierta);
        await db.SaveChangesAsync();
        return inst;
    }

    private static void SembrarInstitucion(AplicacionDbContext db, Guid inst, string documentoUsuario, EstadoActualizacion estado, bool campanaAbierta)
    {
        var id = new InstitucionId(inst);
        db.Instituciones.Add(new Institucion(id, "Institución ficticia " + inst.ToString("N")[..6]));
        db.Personas.Add(new Persona(Guid.NewGuid(), id, documentoUsuario, RolUsuario.Usuario, "Persona Ficticia", "usuario30@ejemplo.test",
            accesoHabilitado: true, estadoActualizacion: estado));
        db.Personas.Add(new Persona(Guid.NewGuid(), id, Supervisor, RolUsuario.Supervisor, "Supervisor Ficticio", "supervisor@ejemplo.test",
            accesoHabilitado: true));
        db.Campanas.Add(new Campana(Guid.NewGuid(), id, "Campaña ficticia",
            campanaAbierta ? DateTime.UtcNow.AddDays(-1) : DateTime.UtcNow.AddDays(-30),
            campanaAbierta ? DateTime.UtcNow.AddDays(10) : DateTime.UtcNow.AddDays(-20),
            activa: true));
    }

    private async Task AgregarPersonaAsync(Guid inst, string documento, RolUsuario rol)
    {
        await using var db = Contexto(inst);
        db.Personas.Add(new Persona(Guid.NewGuid(), new InstitucionId(inst), documento, rol, "Otra Persona Ficticia", "usuario31@ejemplo.test", accesoHabilitado: true));
        await db.SaveChangesAsync();
    }

    /// <summary>Lo que hará la carga de nómina (T-09): usa el servicio con el contexto de la institución.</summary>
    private async Task<bool> RegistrarPropuestaAsync(Guid inst, string documento, string numero)
    {
        await using var db = Contexto(inst);
        var persona = await db.Personas.SingleAsync(p => p.Documento == documento);
        using var scope = _fabrica.Services.CreateScope();
        var servicio = new ServicioCuentaBancaria(
            db,
            scope.ServiceProvider.GetRequiredService<IProtectorCuentaBancaria>(),
            new ServicioCampanas(db, new ContextoInstitucion(new InstitucionId(inst), esSuperadmin: false)));

        var creada = await servicio.RegistrarPropuestaNominaAsync(persona.Id, new CuentaNominaPropuesta(Ahorros, numero, NombreBancoOtro: "Banco ficticio"));
        await db.SaveChangesAsync();
        return creada;
    }

    private async Task<IReadOnlyList<FaltanteEnvioDto>> EvaluarReglaAsync(Guid inst, string documento)
    {
        await using var db = Contexto(inst);
        var persona = await db.Personas.SingleAsync(p => p.Documento == documento);
        return await new ReglaCuentaBancariaObligatoria(db).EvaluarAsync(persona.Id);
    }

    private async Task<CuentaBancariaDto> ObtenerMiaAsync(Guid inst, string documento)
    {
        var respuesta = await EnviarAsync(HttpMethod.Get, "/api/mis-datos/cuenta-bancaria", inst, documento);
        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
        return (await respuesta.Content.ReadFromJsonAsync<CuentaBancariaDto>())!;
    }

    private async Task<HttpResponseMessage> GuardarAsync(Guid inst, string documento, GuardarCuentaBancariaRequest solicitud)
    {
        using var peticion = Peticion(HttpMethod.Put, "/api/mis-datos/cuenta-bancaria", inst, documento);
        peticion.Content = JsonContent.Create(solicitud);
        return await _cliente.SendAsync(peticion);
    }

    private AplicacionDbContext Contexto(Guid inst) =>
        new(new DbContextOptionsBuilder<AplicacionDbContext>().UseSqlite(_conexion).UseSnakeCaseNamingConvention().Options,
            new ContextoInstitucion(new InstitucionId(inst), esSuperadmin: false));

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
