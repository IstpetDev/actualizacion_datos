namespace Istpet.ActualizacionDatos.WebApi.Tests;

using System.Net;
using System.Net.Http.Json;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

public sealed class AutenticacionTests : IDisposable
{
    private readonly SqliteConnection _conexion;
    private readonly WebApplicationFactory<Program> _fabrica;
    private readonly HttpClient _cliente;

    public AutenticacionTests()
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

    private async Task<(Institucion inst, Persona persona)> SembrarUsuarioAsync(
        string documento = "1700000001",
        bool accesoHabilitado = true,
        string? passwordHash = null)
    {
        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();

        var institucionId = InstitucionId.Nuevo();
        var institucion = new Institucion(institucionId, "Instituto Tecnológico de Prueba");
        db.Instituciones.Add(institucion);

        var persona = new Persona(
            Guid.NewGuid(),
            institucionId,
            documento,
            RolUsuario.Usuario,
            "Usuario Inventado",
            "usuario.inventado@ejemplo.test",
            accesoHabilitado: accesoHabilitado,
            passwordHash: passwordHash);

        db.Personas.Add(persona);
        await db.SaveChangesAsync();

        return (institucion, persona);
    }

    [Fact]
    public async Task RF_ACC_002_Login_inicial_con_cedula_obliga_a_cambiar_clave_y_bloquea_otros_endpoints()
    {
        await SembrarUsuarioAsync("1700000011", accesoHabilitado: true);

        // 1. Iniciar sesión con clave igual a la cédula
        var loginResponse = await _cliente.PostAsJsonAsync("/api/auth/login", new LoginRequest("1700000011", "1700000011"));
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);

        var resultado = await loginResponse.Content.ReadFromJsonAsync<ResultadoLoginDto>();
        Assert.NotNull(resultado);
        Assert.Empty(resultado.Documento);
        Assert.Null(resultado.Nombre);
        Assert.Null(resultado.Correo);
        Assert.True(resultado.DebeCambiarContrasena);

        // 2. Intentar llamar a otro endpoint estando en estado debeCambiarContrasena -> 403 Forbidden
        var campanaResponse = await _cliente.GetAsync("/api/campanas");
        Assert.Equal(HttpStatusCode.Forbidden, campanaResponse.StatusCode);
    }

    [Fact]
    public async Task RF_ACC_003_Rechazar_cambio_de_clave_si_es_igual_al_documento_o_menor_a_8_caracteres()
    {
        await SembrarUsuarioAsync("1700000022", accesoHabilitado: true);

        // Iniciar sesión
        await _cliente.PostAsJsonAsync("/api/auth/login", new LoginRequest("1700000022", "1700000022"));

        // Intentar con clave igual al documento
        var respIgual = await _cliente.PostAsJsonAsync("/api/auth/cambiar-clave", new CambiarContrasenaRequest(null, "1700000022"));
        Assert.Equal(HttpStatusCode.BadRequest, respIgual.StatusCode);

        // Intentar con clave menor a 8 caracteres
        var respCorta = await _cliente.PostAsJsonAsync("/api/auth/cambiar-clave", new CambiarContrasenaRequest(null, "12345"));
        Assert.Equal(HttpStatusCode.BadRequest, respCorta.StatusCode);

        // Cambiar clave con valor válido
        var respValida = await _cliente.PostAsJsonAsync("/api/auth/cambiar-clave", new CambiarContrasenaRequest(null, "ClaveValida2026!"));
        Assert.Equal(HttpStatusCode.OK, respValida.StatusCode);

        // Ahora el endpoint protegido ya no devuelve 403
        var campanaResponse = await _cliente.GetAsync("/api/campanas");
        Assert.NotEqual(HttpStatusCode.Forbidden, campanaResponse.StatusCode);
    }

    [Fact]
    public async Task RF_ACC_004_Documento_inexistente_o_no_habilitado_responde_mensaje_generico_sin_revelar_existencia()
    {
        // 1. Documento inexistente
        var respInexistente = await _cliente.PostAsJsonAsync("/api/auth/login", new LoginRequest("9999999999", "CualquierClave"));
        Assert.Equal(HttpStatusCode.Unauthorized, respInexistente.StatusCode);

        var msgInexistente = await respInexistente.Content.ReadFromJsonAsync<MensajeRespuesta>();
        Assert.Equal("Credenciales incorrectas o usuario no habilitado.", msgInexistente?.Mensaje);

        // 2. Documento existente pero acceso deshabilitado
        await SembrarUsuarioAsync("1700000033", accesoHabilitado: false);
        var respDeshabilitado = await _cliente.PostAsJsonAsync("/api/auth/login", new LoginRequest("1700000033", "1700000033"));
        Assert.Equal(HttpStatusCode.Unauthorized, respDeshabilitado.StatusCode);

        var msgDeshabilitado = await respDeshabilitado.Content.ReadFromJsonAsync<MensajeRespuesta>();
        Assert.Equal("Credenciales incorrectas o usuario no habilitado.", msgDeshabilitado?.Mensaje);
    }

    [Fact]
    public async Task RF_ACC_005_Envio_y_verificacion_de_codigo_al_correo()
    {
        await SembrarUsuarioAsync("1700000044", accesoHabilitado: true);

        await _cliente.PostAsJsonAsync("/api/auth/login", new LoginRequest("1700000044", "1700000044"));
        await _cliente.PostAsJsonAsync("/api/auth/cambiar-clave", new CambiarContrasenaRequest(null, "ClaveValida2026!"));

        // Enviar código de verificación
        var respEnviar = await _cliente.PostAsJsonAsync("/api/auth/enviar-codigo-correo", new EnviarCodigoCorreoRequest("persona.nueva@ejemplo.test"));
        Assert.Equal(HttpStatusCode.OK, respEnviar.StatusCode);

        // Verificar con código erróneo
        var respErroneo = await _cliente.PostAsJsonAsync("/api/auth/verificar-codigo-correo", new VerificarCodigoCorreoRequest("000000"));
        Assert.Equal(HttpStatusCode.BadRequest, respErroneo.StatusCode);

        // Obtener la entidad de la base para leer el hash generado y validarlo directamente
        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        var persona = await db.Personas.IgnoreQueryFilters().FirstAsync(p => p.Documento == "1700000044");
        Assert.NotNull(persona.CodigoVerificacionCorreoHash);
        Assert.False(persona.CorreoVerificado);
    }

    [Fact]
    public async Task RF_DAT_004_y_RF_DAT_005_Auditoria_registra_inicios_sin_guardar_contrasenas()
    {
        const string contrasenaSecreta = "MiPasswordSuperSecreto2026!";
        await SembrarUsuarioAsync("1700000055", accesoHabilitado: true);

        // Intento fallido con contraseña secreta
        await _cliente.PostAsJsonAsync("/api/auth/login", new LoginRequest("1700000055", contrasenaSecreta));

        // Intento exitoso
        await _cliente.PostAsJsonAsync("/api/auth/login", new LoginRequest("1700000055", "1700000055"));

        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        var auditorias = await db.Auditorias.ToListAsync();

        Assert.NotEmpty(auditorias);
        Assert.Contains(auditorias, a => a.Accion == "InicioDeSesionFallido");
        Assert.Contains(auditorias, a => a.Accion == "InicioDeSesionExitoso");

        // RF-DAT-005: Verificar que la contraseña secreta no figure en ningún campo de auditoría
        foreach (var aud in auditorias)
        {
            Assert.DoesNotContain(contrasenaSecreta, aud.Detalle ?? string.Empty, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain(contrasenaSecreta, aud.Actor, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain(contrasenaSecreta, aud.Accion, StringComparison.OrdinalIgnoreCase);
        }
    }

    [Fact]
    public async Task Bloqueo_tras_5_intentos_fallidos_bloquea_por_15_minutos()
    {
        await SembrarUsuarioAsync("1700000066", accesoHabilitado: true);

        // Realizar 5 intentos fallidos
        for (var i = 0; i < 5; i++)
        {
            var fail = await _cliente.PostAsJsonAsync("/api/auth/login", new LoginRequest("1700000066", "ClaveErronea" + i));
            Assert.Equal(HttpStatusCode.Unauthorized, fail.StatusCode);
        }

        // El 6to intento, incluso con la clave correcta inicial, es rechazado
        var intentoBloqueado = await _cliente.PostAsJsonAsync("/api/auth/login", new LoginRequest("1700000066", "1700000066"));
        Assert.Equal(HttpStatusCode.Unauthorized, intentoBloqueado.StatusCode);

        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        var persona = await db.Personas.IgnoreQueryFilters().FirstAsync(p => p.Documento == "1700000066");
        Assert.True(persona.EstaBloqueado(DateTime.UtcNow));
    }

    [Fact]
    public async Task Login_y_sesion_incluyen_nombre_de_la_institucion_activa()
    {
        await SembrarUsuarioAsync("1700000077", accesoHabilitado: true);

        // 1. Iniciar sesión
        var loginResponse = await _cliente.PostAsJsonAsync("/api/auth/login", new LoginRequest("1700000077", "1700000077"));
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);

        var loginDto = await loginResponse.Content.ReadFromJsonAsync<ResultadoLoginDto>();
        Assert.NotNull(loginDto);
        Assert.Equal("Instituto Tecnológico de Prueba", loginDto.InstitucionNombre);

        // 2. Consultar sesión actual
        var sesionResponse = await _cliente.GetAsync("/api/auth/sesion");
        Assert.Equal(HttpStatusCode.OK, sesionResponse.StatusCode);

        var sesionDto = await sesionResponse.Content.ReadFromJsonAsync<SesionUsuarioDto>();
        Assert.NotNull(sesionDto);
        Assert.Equal("Instituto Tecnológico de Prueba", sesionDto.InstitucionNombre);
    }
}
