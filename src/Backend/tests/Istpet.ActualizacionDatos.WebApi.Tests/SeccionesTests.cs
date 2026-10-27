namespace Istpet.ActualizacionDatos.WebApi.Tests;

using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Multitenancy;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

// Spec-0010: Liberación de secciones por fases y ADR-0028.
public sealed class SeccionesTests : IDisposable
{
    private const string AdminDoc = "0000000001";
    private const string SupervisorDoc = "0000000002";
    private const string UsuarioDoc = "0000000003";

    private readonly SqliteConnection _conexion;
    private readonly WebApplicationFactory<Program> _fabrica;
    private readonly HttpClient _cliente;

    public SeccionesTests()
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

    private async Task<Guid> CrearInstitucionAsync()
    {
        var instId = Guid.NewGuid();
        await using var db = Contexto(instId);
        var id = new InstitucionId(instId);
        db.Instituciones.Add(new Institucion(id, "Institución de Prueba " + instId.ToString("N")[..6]));

        db.Personas.Add(new Persona(Guid.NewGuid(), id, AdminDoc, RolUsuario.Admin, "Admin Ficticio", "admin@ejemplo.test", accesoHabilitado: true));
        db.Personas.Add(new Persona(Guid.NewGuid(), id, SupervisorDoc, RolUsuario.Supervisor, "Supervisor Ficticio", "supervisor@ejemplo.test", accesoHabilitado: true));
        db.Personas.Add(new Persona(Guid.NewGuid(), id, UsuarioDoc, RolUsuario.Usuario, "Usuario Ficticio", "usuario@ejemplo.test", accesoHabilitado: true, estadoActualizacion: EstadoActualizacion.Borrador));

        db.Campanas.Add(new Campana(Guid.NewGuid(), id, "Campaña Activa", DateTime.UtcNow.AddDays(-1), DateTime.UtcNow.AddDays(10), activa: true));

        // Catálogos básicos necesarios
        if (!await db.ElementosCatalogo.AnyAsync(e => e.Id == 1))
        {
            db.ElementosCatalogo.AddRange(
                new ElementoCatalogo(1, TipoCatalogo.Sexo, "M", "Masculino"),
                new ElementoCatalogo(11, TipoCatalogo.EstadoCivil, "SOLTERO", "Soltero/a"),
                new ElementoCatalogo(21, TipoCatalogo.TipoSangre, "OPOS", "O+"),
                new ElementoCatalogo(31, TipoCatalogo.Pais, "EC", "Ecuador"),
                new ElementoCatalogo(41, TipoCatalogo.Provincia, "PICH", "Pichincha", padreId: 31),
                new ElementoCatalogo(51, TipoCatalogo.Canton, "QUITO", "Quito", padreId: 41),
                new ElementoCatalogo(61, TipoCatalogo.Parroquia, "IQUITO", "Iñaquito", padreId: 51),
                new ElementoCatalogo(71, TipoCatalogo.TipoCuentaBancaria, "AHORROS", "Ahorros"),
                new ElementoCatalogo(80, TipoCatalogo.NivelAcademico, "TERCER_NIVEL", "Tercer Nivel"),
                new ElementoCatalogo(81, TipoCatalogo.GradoAcademico, "LICENCIATURA", "Licenciatura", padreId: 80)
            );
        }

        await db.SaveChangesAsync();
        return instId;
    }

    private AplicacionDbContext Contexto(Guid inst, bool superadmin = false) =>
        new(new DbContextOptionsBuilder<AplicacionDbContext>().UseSqlite(_conexion).UseSnakeCaseNamingConvention().Options,
            new ContextoInstitucion(new InstitucionId(inst), esSuperadmin: superadmin));

    private static HttpRequestMessage Peticion(HttpMethod metodo, string ruta, Guid inst, string actor, RolUsuario rol = RolUsuario.Usuario)
    {
        var request = new HttpRequestMessage(metodo, ruta);
        request.Headers.Add("X-Institucion-Id", inst.ToString());
        request.Headers.Add("X-Actor", actor);
        request.Headers.Add("X-Rol", rol.ToString());
        return request;
    }

    private async Task<HttpResponseMessage> EnviarAsync(HttpMethod metodo, string ruta, Guid inst, string actor, RolUsuario rol = RolUsuario.Usuario, object? body = null)
    {
        using var peticion = Peticion(metodo, ruta, inst, actor, rol);
        if (body != null)
        {
            peticion.Content = JsonContent.Create(body);
        }
        return await _cliente.SendAsync(peticion);
    }

    [Fact]
    public async Task Sin_sesion_responde_401()
    {
        var resp = await _cliente.GetAsync("/api/configuracion/secciones");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    [Fact]
    public async Task Usuario_y_supervisor_reciben_403_al_listar_o_cambiar_secciones()
    {
        var inst = await CrearInstitucionAsync();

        var getUsuario = await EnviarAsync(HttpMethod.Get, "/api/configuracion/secciones", inst, UsuarioDoc, RolUsuario.Usuario);
        Assert.Equal(HttpStatusCode.Forbidden, getUsuario.StatusCode);

        var getSupervisor = await EnviarAsync(HttpMethod.Get, "/api/configuracion/secciones", inst, SupervisorDoc, RolUsuario.Supervisor);
        Assert.Equal(HttpStatusCode.Forbidden, getSupervisor.StatusCode);

        var putUsuario = await EnviarAsync(HttpMethod.Put, "/api/configuracion/secciones/formacion", inst, UsuarioDoc, RolUsuario.Usuario, new CambiarEstadoSeccionRequest(false));
        Assert.Equal(HttpStatusCode.Forbidden, putUsuario.StatusCode);
    }

    [Fact]
    public async Task Admin_de_institucion_lista_siete_secciones_inicialmente_abiertas()
    {
        var inst = await CrearInstitucionAsync();

        var resp = await EnviarAsync(HttpMethod.Get, "/api/configuracion/secciones", inst, AdminDoc, RolUsuario.Admin);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var lista = await resp.Content.ReadFromJsonAsync<List<SeccionConfiguracionDto>>();
        Assert.NotNull(lista);
        Assert.Equal(7, lista.Count);
        Assert.All(lista, s => Assert.True(s.Habilitada));
    }

    [Fact]
    public async Task Admin_cierra_y_abre_seccion_modifica_estado_y_se_audita_sin_datos_personales()
    {
        var inst = await CrearInstitucionAsync();

        // Cerrar formación
        var putResp = await EnviarAsync(HttpMethod.Put, "/api/configuracion/secciones/formacion", inst, AdminDoc, RolUsuario.Admin, new CambiarEstadoSeccionRequest(false));
        Assert.Equal(HttpStatusCode.OK, putResp.StatusCode);
        var actualizada = await putResp.Content.ReadFromJsonAsync<SeccionConfiguracionDto>();
        Assert.NotNull(actualizada);
        Assert.Equal("formacion", actualizada.Codigo);
        Assert.False(actualizada.Habilitada);

        // Verificar listado
        var getResp = await EnviarAsync(HttpMethod.Get, "/api/configuracion/secciones", inst, AdminDoc, RolUsuario.Admin);
        var lista = await getResp.Content.ReadFromJsonAsync<List<SeccionConfiguracionDto>>();
        var formacion = lista!.First(s => s.Codigo == "formacion");
        Assert.False(formacion.Habilitada);

        // Verificar auditoría
        await using var db = Contexto(inst);
        var auditorias = await db.Auditorias.Where(a => a.Accion == "SECCION_DESHABILITADA").ToListAsync();
        Assert.Single(auditorias);
        Assert.Contains("formacion", auditorias[0].Detalle);
        Assert.DoesNotContain(AdminDoc, auditorias[0].Detalle); // sin datos personales en detalle
    }

    [Fact]
    public async Task Intentar_cerrar_ficha_personal_responde_409()
    {
        var inst = await CrearInstitucionAsync();

        var resp = await EnviarAsync(HttpMethod.Put, "/api/configuracion/secciones/ficha", inst, AdminDoc, RolUsuario.Admin, new CambiarEstadoSeccionRequest(false));
        Assert.Equal(HttpStatusCode.Conflict, resp.StatusCode);
    }

    [Fact]
    public async Task Seccion_inexistente_responde_404()
    {
        var inst = await CrearInstitucionAsync();

        var resp = await EnviarAsync(HttpMethod.Put, "/api/configuracion/secciones/inexistente_xyz", inst, AdminDoc, RolUsuario.Admin, new CambiarEstadoSeccionRequest(false));
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    [Fact]
    public async Task Superadmin_puede_listar_y_cambiar_secciones_por_api()
    {
        var inst = await CrearInstitucionAsync();

        var getResp = await EnviarAsync(HttpMethod.Get, "/api/configuracion/secciones", inst, "superadmin", RolUsuario.Superadmin);
        Assert.Equal(HttpStatusCode.OK, getResp.StatusCode);

        var putResp = await EnviarAsync(HttpMethod.Put, "/api/configuracion/secciones/referencias", inst, "superadmin", RolUsuario.Superadmin, new CambiarEstadoSeccionRequest(false));
        Assert.Equal(HttpStatusCode.OK, putResp.StatusCode);
    }

    [Fact]
    public async Task Aislamiento_multiinstitucional_cambio_en_inst_A_no_afecta_inst_B()
    {
        var instA = await CrearInstitucionAsync();
        var instB = await CrearInstitucionAsync();

        // En instA se cierra experiencia
        await EnviarAsync(HttpMethod.Put, "/api/configuracion/secciones/experiencia", instA, AdminDoc, RolUsuario.Admin, new CambiarEstadoSeccionRequest(false));

        // En instB experiencia sigue abierta
        var respB = await EnviarAsync(HttpMethod.Get, "/api/configuracion/secciones", instB, AdminDoc, RolUsuario.Admin);
        var listaB = await respB.Content.ReadFromJsonAsync<List<SeccionConfiguracionDto>>();
        var expB = listaB!.First(s => s.Codigo == "experiencia");
        Assert.True(expB.Habilitada);
    }

    [Fact]
    public async Task Escrituras_en_secciones_cerradas_responden_409()
    {
        var inst = await CrearInstitucionAsync();

        // Cerrar secciones
        await EnviarAsync(HttpMethod.Put, "/api/configuracion/secciones/formacion", inst, AdminDoc, RolUsuario.Admin, new CambiarEstadoSeccionRequest(false));
        await EnviarAsync(HttpMethod.Put, "/api/configuracion/secciones/capacitaciones", inst, AdminDoc, RolUsuario.Admin, new CambiarEstadoSeccionRequest(false));
        await EnviarAsync(HttpMethod.Put, "/api/configuracion/secciones/experiencia", inst, AdminDoc, RolUsuario.Admin, new CambiarEstadoSeccionRequest(false));
        await EnviarAsync(HttpMethod.Put, "/api/configuracion/secciones/referencias", inst, AdminDoc, RolUsuario.Admin, new CambiarEstadoSeccionRequest(false));
        await EnviarAsync(HttpMethod.Put, "/api/configuracion/secciones/documentos", inst, AdminDoc, RolUsuario.Admin, new CambiarEstadoSeccionRequest(false));
        await EnviarAsync(HttpMethod.Put, "/api/configuracion/secciones/cuenta-bancaria", inst, AdminDoc, RolUsuario.Admin, new CambiarEstadoSeccionRequest(false));

        // 1. Título
        var reqTitulo = new GuardarTituloAcademicoRequest("Licenciado Ficticio", 81);
        var respTitulo = await EnviarAsync(HttpMethod.Post, "/api/mis-datos/hoja-de-vida/titulos", inst, UsuarioDoc, RolUsuario.Usuario, reqTitulo);
        Assert.Equal(HttpStatusCode.Conflict, respTitulo.StatusCode);

        // 2. Capacitación
        var reqCap = new GuardarCapacitacionRequest("Curso Ficticio", "Inst Ficticia", null, "asistente", new DateOnly(2023, 1, 1), new DateOnly(2023, 1, 10), 40);
        var respCap = await EnviarAsync(HttpMethod.Post, "/api/mis-datos/hoja-de-vida/capacitaciones", inst, UsuarioDoc, RolUsuario.Usuario, reqCap);
        Assert.Equal(HttpStatusCode.Conflict, respCap.StatusCode);

        // 3. Experiencia
        var reqExp = new GuardarExperienciaLaboralRequest("Empresa Ficticia", "Analista", new DateOnly(2021, 1, 1), new DateOnly(2022, 1, 1), false, "Quito");
        var respExp = await EnviarAsync(HttpMethod.Post, "/api/mis-datos/hoja-de-vida/experiencias", inst, UsuarioDoc, RolUsuario.Usuario, reqExp);
        Assert.Equal(HttpStatusCode.Conflict, respExp.StatusCode);

        // 4. Referencia
        var reqRef = new GuardarReferenciaRequest("personal", "Persona Amiga", "0990000000");
        var respRef = await EnviarAsync(HttpMethod.Post, "/api/mis-datos/hoja-de-vida/referencias", inst, UsuarioDoc, RolUsuario.Usuario, reqRef);
        Assert.Equal(HttpStatusCode.Conflict, respRef.StatusCode);

        // 5. Cuenta Bancaria
        var reqCuenta = new GuardarCuentaBancariaRequest(71, "0000001234", NombreBancoOtro: "Banco Ficticio");
        var respCuenta = await EnviarAsync(HttpMethod.Put, "/api/mis-datos/cuenta-bancaria", inst, UsuarioDoc, RolUsuario.Usuario, reqCuenta);
        Assert.Equal(HttpStatusCode.Conflict, respCuenta.StatusCode);

        // 6. Subir archivo con claveDestino de sección cerrada
        using var multiContent = new MultipartFormDataContent();
        var streamContent = new ByteArrayContent(new byte[] { 0x25, 0x50, 0x44, 0x46, 0x2D }); // %PDF-
        streamContent.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        multiContent.Add(streamContent, "archivo", "titulo.pdf");

        using var peticionArchivo = Peticion(HttpMethod.Post, "/api/archivos/subir?claveDestino=titulo:ficticio", inst, UsuarioDoc, RolUsuario.Usuario);
        peticionArchivo.Content = multiContent;
        var respArchivo = await _cliente.SendAsync(peticionArchivo);
        Assert.Equal(HttpStatusCode.Conflict, respArchivo.StatusCode);
    }

    [Fact]
    public async Task HojaDeVida_incluye_seccionesAbiertas()
    {
        var inst = await CrearInstitucionAsync();

        // Cerrar capacitaciones y experiencia
        await EnviarAsync(HttpMethod.Put, "/api/configuracion/secciones/capacitaciones", inst, AdminDoc, RolUsuario.Admin, new CambiarEstadoSeccionRequest(false));
        await EnviarAsync(HttpMethod.Put, "/api/configuracion/secciones/experiencia", inst, AdminDoc, RolUsuario.Admin, new CambiarEstadoSeccionRequest(false));

        var resp = await EnviarAsync(HttpMethod.Get, "/api/mis-datos/hoja-de-vida", inst, UsuarioDoc, RolUsuario.Usuario);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var hdv = await resp.Content.ReadFromJsonAsync<HojaDeVidaDto>();
        Assert.NotNull(hdv);
        Assert.NotNull(hdv.SeccionesAbiertas);
        Assert.Contains("ficha", hdv.SeccionesAbiertas);
        Assert.Contains("formacion", hdv.SeccionesAbiertas);
        Assert.Contains("referencias", hdv.SeccionesAbiertas);
        Assert.Contains("documentos", hdv.SeccionesAbiertas);
        Assert.Contains("cuenta-bancaria", hdv.SeccionesAbiertas);
        Assert.DoesNotContain("capacitaciones", hdv.SeccionesAbiertas);
        Assert.DoesNotContain("experiencia", hdv.SeccionesAbiertas);
    }

    [Fact]
    public async Task Abrir_seccion_no_cambia_estado_de_persona_enviada()
    {
        var inst = await CrearInstitucionAsync();

        // Marcar usuario como Enviado
        await using (var db = Contexto(inst))
        {
            var p = await db.Personas.SingleAsync(x => x.Documento == UsuarioDoc);
            p.AceptarTratamientoDatos(DateTime.UtcNow);
            p.EnviarARevision(DateTime.UtcNow);
            await db.SaveChangesAsync();
        }

        // Admin abre o cierra sección
        await EnviarAsync(HttpMethod.Put, "/api/configuracion/secciones/formacion", inst, AdminDoc, RolUsuario.Admin, new CambiarEstadoSeccionRequest(true));

        await using (var db = Contexto(inst))
        {
            var p = await db.Personas.SingleAsync(x => x.Documento == UsuarioDoc);
            Assert.Equal(EstadoActualizacion.Enviado, p.EstadoActualizacion);
        }
    }

    [Fact]
    public async Task Completitud_envio_ignora_secciones_cerradas()
    {
        var inst = await CrearInstitucionAsync();

        // Con todas las secciones abiertas, faltan formación y referencias
        var respInicial = await EnviarAsync(HttpMethod.Get, "/api/mis-datos/hoja-de-vida/faltantes", inst, UsuarioDoc, RolUsuario.Usuario);
        Assert.Equal(HttpStatusCode.OK, respInicial.StatusCode);
        var faltantesInicial = await respInicial.Content.ReadFromJsonAsync<ResultadoValidacionEnvioDto>();
        Assert.NotNull(faltantesInicial);
        Assert.False(faltantesInicial.Completo);
        Assert.Contains(faltantesInicial.Faltantes, f => f.Codigo == "formacion.minimo-estudios");
        Assert.Contains(faltantesInicial.Faltantes, f => f.Codigo == "referencias.minimo-personales");

        // Cerrar formación y referencias
        await EnviarAsync(HttpMethod.Put, "/api/configuracion/secciones/formacion", inst, AdminDoc, RolUsuario.Admin, new CambiarEstadoSeccionRequest(false));
        await EnviarAsync(HttpMethod.Put, "/api/configuracion/secciones/referencias", inst, AdminDoc, RolUsuario.Admin, new CambiarEstadoSeccionRequest(false));

        // Ahora faltantes no deben incluir formación ni referencias
        var respFiltrada = await EnviarAsync(HttpMethod.Get, "/api/mis-datos/hoja-de-vida/faltantes", inst, UsuarioDoc, RolUsuario.Usuario);
        Assert.Equal(HttpStatusCode.OK, respFiltrada.StatusCode);
        var faltantesFiltrada = await respFiltrada.Content.ReadFromJsonAsync<ResultadoValidacionEnvioDto>();
        Assert.NotNull(faltantesFiltrada);
        Assert.DoesNotContain(faltantesFiltrada.Faltantes, f => f.Codigo == "formacion.minimo-estudios");
        Assert.DoesNotContain(faltantesFiltrada.Faltantes, f => f.Codigo == "referencias.minimo-personales");
    }

    [Fact]
    public async Task Listar_secciones_calcula_avance_correctamente()
    {
        var inst = await CrearInstitucionAsync();

        var resp = await EnviarAsync(HttpMethod.Get, "/api/configuracion/secciones", inst, AdminDoc, RolUsuario.Admin);
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var listado = await resp.Content.ReadFromJsonAsync<List<SeccionConfiguracionDto>>();
        Assert.NotNull(listado);
        Assert.Equal(7, listado.Count);

        // En la institución de prueba hay 3 personas en total
        foreach (var seccion in listado)
        {
            Assert.Equal(3, seccion.TotalPersonas);
            Assert.Equal(seccion.TotalPersonas, seccion.PersonasCompletas + seccion.PersonasIncompletas);
        }
    }
}
