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

public sealed class FlujoRevisionTests : IDisposable
{
    private readonly SqliteConnection _conexion;
    private readonly WebApplicationFactory<Program> _fabrica;
    private readonly HttpClient _cliente;

    public FlujoRevisionTests()
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

    private async Task<(Guid InstitucionId, Persona Persona1, Persona Persona2)> InicializarDatosPruebaAsync()
    {
        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();

        var institucionId = Guid.NewGuid();
        var inst = new Institucion(new InstitucionId(institucionId), "Institucion Test");
        db.Instituciones.Add(inst);

        var p1 = new Persona(
            Guid.NewGuid(),
            new InstitucionId(institucionId),
            "1700000001",
            RolUsuario.Usuario,
            "Usuario Uno",
            "usuario1@ejemplo.test",
            accesoHabilitado: true);

        var p2 = new Persona(
            Guid.NewGuid(),
            new InstitucionId(institucionId),
            "1700000002",
            RolUsuario.Usuario,
            "Usuario Dos",
            "usuario2@ejemplo.test",
            accesoHabilitado: true);

        var campana = new Campana(
            Guid.NewGuid(),
            new InstitucionId(institucionId),
            "Campaña 2026 Test",
            DateTime.UtcNow.AddDays(-5),
            DateTime.UtcNow.AddDays(5),
            activa: true);

        db.Personas.AddRange(p1, p2);
        db.Campanas.Add(campana);
        await db.SaveChangesAsync();

        return (institucionId, p1, p2);
    }

    [Fact]
    public async Task RF_DAT_001_Envio_sin_aceptar_tratamiento_falla_y_aceptacion_registra_fecha()
    {
        var (institucionId, p1, _) = await InicializarDatosPruebaAsync();

        // 1. Intentar enviar a revisión sin aceptar tratamiento de datos
        var requestEnvio = new HttpRequestMessage(HttpMethod.Post, "/api/mis-datos/enviar?documento=1700000001");
        requestEnvio.Headers.Add("X-Institucion-Id", institucionId.ToString());
        requestEnvio.Headers.Add("X-Actor", "1700000001");
        requestEnvio.Headers.Add("X-Rol", "Usuario");

        var respuestaEnvioFallido = await _cliente.SendAsync(requestEnvio);
        Assert.Equal(HttpStatusCode.BadRequest, respuestaEnvioFallido.StatusCode);
        var contenidoError = await respuestaEnvioFallido.Content.ReadAsStringAsync();
        Assert.Contains("tratamiento de datos", contenidoError, StringComparison.OrdinalIgnoreCase);

        // 2. Registrar la aceptación del tratamiento de datos
        var requestAceptar = new HttpRequestMessage(HttpMethod.Post, "/api/mis-datos/aceptar-tratamiento?documento=1700000001");
        requestAceptar.Headers.Add("X-Institucion-Id", institucionId.ToString());
        requestAceptar.Headers.Add("X-Actor", "1700000001");
        requestAceptar.Headers.Add("X-Rol", "Usuario");

        var respuestaAceptar = await _cliente.SendAsync(requestAceptar);
        Assert.Equal(HttpStatusCode.OK, respuestaAceptar.StatusCode);

        // 3. Verificar que se registró la aceptación con fecha
        var requestMisDatos = new HttpRequestMessage(HttpMethod.Get, "/api/mis-datos?documento=1700000001");
        requestMisDatos.Headers.Add("X-Institucion-Id", institucionId.ToString());
        requestMisDatos.Headers.Add("X-Actor", "1700000001");
        requestMisDatos.Headers.Add("X-Rol", "Usuario");

        var respuestaMisDatos = await _cliente.SendAsync(requestMisDatos);
        Assert.Equal(HttpStatusCode.OK, respuestaMisDatos.StatusCode);
        var misDatos = await respuestaMisDatos.Content.ReadFromJsonAsync<MisDatosDto>();
        Assert.NotNull(misDatos);
        Assert.True(misDatos.TratamientoDatosAceptado);
        Assert.NotNull(misDatos.FechaAceptacionTratamientoDatosUtc);
    }

    [Fact]
    public async Task RF_DAT_002_Usuario_no_puede_acceder_a_datos_de_otra_persona()
    {
        var (institucionId, _, _) = await InicializarDatosPruebaAsync();

        // Usuario "1700000001" intenta consultar datos de "1700000002"
        var requestConsultaAjena = new HttpRequestMessage(HttpMethod.Get, "/api/mis-datos?documento=1700000002");
        requestConsultaAjena.Headers.Add("X-Institucion-Id", institucionId.ToString());
        requestConsultaAjena.Headers.Add("X-Actor", "1700000001");
        requestConsultaAjena.Headers.Add("X-Rol", "Usuario");

        var respuesta = await _cliente.SendAsync(requestConsultaAjena);
        Assert.Equal(HttpStatusCode.Forbidden, respuesta.StatusCode);

        // Usuario "1700000001" intenta modificar datos de "1700000002"
        var requestModificarAjena = new HttpRequestMessage(HttpMethod.Put, "/api/mis-datos?documento=1700000002");
        requestModificarAjena.Headers.Add("X-Institucion-Id", institucionId.ToString());
        requestModificarAjena.Headers.Add("X-Actor", "1700000001");
        requestModificarAjena.Headers.Add("X-Rol", "Usuario");
        requestModificarAjena.Content = JsonContent.Create(new ActualizarDatosRequest("{\"malicioso\":true}"));

        var respuestaModificar = await _cliente.SendAsync(requestModificarAjena);
        Assert.Equal(HttpStatusCode.Forbidden, respuestaModificar.StatusCode);

        // Usuario "1700000001" intenta subir archivo a "1700000002"
        var requestArchivoAjena = new HttpRequestMessage(HttpMethod.Post, "/api/mis-datos/archivos?documento=1700000002");
        requestArchivoAjena.Headers.Add("X-Institucion-Id", institucionId.ToString());
        requestArchivoAjena.Headers.Add("X-Actor", "1700000001");
        requestArchivoAjena.Headers.Add("X-Rol", "Usuario");
        requestArchivoAjena.Content = JsonContent.Create(new SubirArchivoRequest("virus.pdf", "application/pdf", 1024));

        var respuestaArchivo = await _cliente.SendAsync(requestArchivoAjena);
        Assert.Equal(HttpStatusCode.Forbidden, respuestaArchivo.StatusCode);
    }

    [Fact]
    public async Task RF_FLU_001_Envio_a_revision_pasa_a_enviado_y_bloquea_edicion()
    {
        var (institucionId, _, _) = await InicializarDatosPruebaAsync();

        // Aceptar tratamiento
        var reqAceptar = new HttpRequestMessage(HttpMethod.Post, "/api/mis-datos/aceptar-tratamiento?documento=1700000001");
        reqAceptar.Headers.Add("X-Institucion-Id", institucionId.ToString());
        reqAceptar.Headers.Add("X-Actor", "1700000001");
        reqAceptar.Headers.Add("X-Rol", "Usuario");
        await _cliente.SendAsync(reqAceptar);

        // Guardar borrador previo
        var reqGuardar = new HttpRequestMessage(HttpMethod.Put, "/api/mis-datos?documento=1700000001");
        reqGuardar.Headers.Add("X-Institucion-Id", institucionId.ToString());
        reqGuardar.Headers.Add("X-Actor", "1700000001");
        reqGuardar.Headers.Add("X-Rol", "Usuario");
        reqGuardar.Content = JsonContent.Create(new ActualizarDatosRequest("{\"direccion\":\"Calle Test 123\"}"));
        var resGuardar = await _cliente.SendAsync(reqGuardar);
        Assert.Equal(HttpStatusCode.OK, resGuardar.StatusCode);

        // Enviar a revisión
        var reqEnviar = new HttpRequestMessage(HttpMethod.Post, "/api/mis-datos/enviar?documento=1700000001");
        reqEnviar.Headers.Add("X-Institucion-Id", institucionId.ToString());
        reqEnviar.Headers.Add("X-Actor", "1700000001");
        reqEnviar.Headers.Add("X-Rol", "Usuario");
        var resEnviar = await _cliente.SendAsync(reqEnviar);
        Assert.Equal(HttpStatusCode.OK, resEnviar.StatusCode);

        // Intentar modificar datos ahora que está Enviado -> Debe ser bloqueado
        var reqModificarBloqueado = new HttpRequestMessage(HttpMethod.Put, "/api/mis-datos?documento=1700000001");
        reqModificarBloqueado.Headers.Add("X-Institucion-Id", institucionId.ToString());
        reqModificarBloqueado.Headers.Add("X-Actor", "1700000001");
        reqModificarBloqueado.Headers.Add("X-Rol", "Usuario");
        reqModificarBloqueado.Content = JsonContent.Create(new ActualizarDatosRequest("{\"direccion\":\"Modificacion no permitida\"}"));
        var resModificar = await _cliente.SendAsync(reqModificarBloqueado);
        Assert.Equal(HttpStatusCode.BadRequest, resModificar.StatusCode);

        // Estado de edición debe indicar que no puede editar
        var reqEstado = new HttpRequestMessage(HttpMethod.Get, "/api/mis-datos/estado-edicion?documento=1700000001");
        reqEstado.Headers.Add("X-Institucion-Id", institucionId.ToString());
        reqEstado.Headers.Add("X-Actor", "1700000001");
        reqEstado.Headers.Add("X-Rol", "Usuario");
        var resEstado = await _cliente.SendAsync(reqEstado);
        Assert.Equal(HttpStatusCode.OK, resEstado.StatusCode);
        var estadoDto = await resEstado.Content.ReadFromJsonAsync<EstadoEdicionDto>();
        Assert.NotNull(estadoDto);
        Assert.False(estadoDto.PuedeEditar);
        Assert.Equal("Enviado", estadoDto.EstadoActualizacion);
    }

    [Fact]
    public async Task RF_FLU_002_Supervisor_aprueba_actualizacion_enviada()
    {
        var (institucionId, _, _) = await InicializarDatosPruebaAsync();

        // Enviar a revisión
        var reqAceptar = new HttpRequestMessage(HttpMethod.Post, "/api/mis-datos/aceptar-tratamiento?documento=1700000001");
        reqAceptar.Headers.Add("X-Institucion-Id", institucionId.ToString());
        reqAceptar.Headers.Add("X-Actor", "1700000001");
        reqAceptar.Headers.Add("X-Rol", "Usuario");
        await _cliente.SendAsync(reqAceptar);

        var reqEnviar = new HttpRequestMessage(HttpMethod.Post, "/api/mis-datos/enviar?documento=1700000001");
        reqEnviar.Headers.Add("X-Institucion-Id", institucionId.ToString());
        reqEnviar.Headers.Add("X-Actor", "1700000001");
        reqEnviar.Headers.Add("X-Rol", "Usuario");
        await _cliente.SendAsync(reqEnviar);

        // Supervisor aprueba
        var reqAprobar = new HttpRequestMessage(HttpMethod.Post, "/api/revision/1700000001/aprobar");
        reqAprobar.Headers.Add("X-Institucion-Id", institucionId.ToString());
        reqAprobar.Headers.Add("X-Actor", "supervisor_01");
        reqAprobar.Headers.Add("X-Rol", "Supervisor");

        var resAprobar = await _cliente.SendAsync(reqAprobar);
        Assert.Equal(HttpStatusCode.OK, resAprobar.StatusCode);

        // Verificar que el estado pasó a Aprobado
        var reqExpediente = new HttpRequestMessage(HttpMethod.Get, "/api/revision/1700000001");
        reqExpediente.Headers.Add("X-Institucion-Id", institucionId.ToString());
        reqExpediente.Headers.Add("X-Actor", "supervisor_01");
        reqExpediente.Headers.Add("X-Rol", "Supervisor");

        var resExpediente = await _cliente.SendAsync(reqExpediente);
        Assert.Equal(HttpStatusCode.OK, resExpediente.StatusCode);
        var exp = await resExpediente.Content.ReadFromJsonAsync<ExpedienteRevisionDto>();
        Assert.NotNull(exp);
        Assert.Equal("Aprobado", exp.EstadoActualizacion);
    }

    [Fact]
    public async Task RF_FLU_003_Supervisor_devuelve_con_observacion_y_marcas_opcionales()
    {
        var (institucionId, _, _) = await InicializarDatosPruebaAsync();

        // Enviar a revisión
        var reqAceptar = new HttpRequestMessage(HttpMethod.Post, "/api/mis-datos/aceptar-tratamiento?documento=1700000001");
        reqAceptar.Headers.Add("X-Institucion-Id", institucionId.ToString());
        reqAceptar.Headers.Add("X-Actor", "1700000001");
        reqAceptar.Headers.Add("X-Rol", "Usuario");
        await _cliente.SendAsync(reqAceptar);

        var reqEnviar = new HttpRequestMessage(HttpMethod.Post, "/api/mis-datos/enviar?documento=1700000001");
        reqEnviar.Headers.Add("X-Institucion-Id", institucionId.ToString());
        reqEnviar.Headers.Add("X-Actor", "1700000001");
        reqEnviar.Headers.Add("X-Rol", "Usuario");
        await _cliente.SendAsync(reqEnviar);

        // Devolución sin observación general debe fallar (RF-FLU-003)
        var reqDevolverVacio = new HttpRequestMessage(HttpMethod.Post, "/api/revision/1700000001/devolver");
        reqDevolverVacio.Headers.Add("X-Institucion-Id", institucionId.ToString());
        reqDevolverVacio.Headers.Add("X-Actor", "supervisor_01");
        reqDevolverVacio.Headers.Add("X-Rol", "Supervisor");
        reqDevolverVacio.Content = JsonContent.Create(new DevolverActualizacionRequest(string.Empty));

        var resDevolverVacio = await _cliente.SendAsync(reqDevolverVacio);
        Assert.Equal(HttpStatusCode.BadRequest, resDevolverVacio.StatusCode);

        // Devolución válida con observación general y marcas
        var reqDevolverValido = new HttpRequestMessage(HttpMethod.Post, "/api/revision/1700000001/devolver");
        reqDevolverValido.Headers.Add("X-Institucion-Id", institucionId.ToString());
        reqDevolverValido.Headers.Add("X-Actor", "supervisor_01");
        reqDevolverValido.Headers.Add("X-Rol", "Supervisor");
        reqDevolverValido.Content = JsonContent.Create(new DevolverActualizacionRequest(
            "Por favor corregir los datos señalados.",
            [
                new MarcaObservacionItem("campo", "telefono", "El número de teléfono debe ser celular."),
                new MarcaObservacionItem("archivo", "titulo_pdf", "El archivo debe ser legible.")
            ]));

        var resDevolverValido = await _cliente.SendAsync(reqDevolverValido);
        Assert.Equal(HttpStatusCode.OK, resDevolverValido.StatusCode);

        // Consultar observaciones por el usuario (RF-FLU-004)
        var reqObsUsuario = new HttpRequestMessage(HttpMethod.Get, "/api/mis-datos/observaciones?documento=1700000001");
        reqObsUsuario.Headers.Add("X-Institucion-Id", institucionId.ToString());
        reqObsUsuario.Headers.Add("X-Actor", "1700000001");
        reqObsUsuario.Headers.Add("X-Rol", "Usuario");

        var resObsUsuario = await _cliente.SendAsync(reqObsUsuario);
        Assert.Equal(HttpStatusCode.OK, resObsUsuario.StatusCode);
        var obsLista = await resObsUsuario.Content.ReadFromJsonAsync<List<ObservacionDto>>();
        Assert.NotNull(obsLista);
        Assert.Single(obsLista);
        Assert.Equal("Por favor corregir los datos señalados.", obsLista[0].Texto);
        Assert.Equal(2, obsLista[0].Marcas.Count);
    }

    [Fact]
    public async Task RF_FLU_004_Usuario_con_actualizacion_devuelta_puede_corregir_y_reenviar()
    {
        var (institucionId, _, _) = await InicializarDatosPruebaAsync();

        // 1. Aceptar tratamiento y enviar
        var reqAceptar = new HttpRequestMessage(HttpMethod.Post, "/api/mis-datos/aceptar-tratamiento?documento=1700000001");
        reqAceptar.Headers.Add("X-Institucion-Id", institucionId.ToString());
        reqAceptar.Headers.Add("X-Actor", "1700000001");
        reqAceptar.Headers.Add("X-Rol", "Usuario");
        await _cliente.SendAsync(reqAceptar);

        var reqEnviar1 = new HttpRequestMessage(HttpMethod.Post, "/api/mis-datos/enviar?documento=1700000001");
        reqEnviar1.Headers.Add("X-Institucion-Id", institucionId.ToString());
        reqEnviar1.Headers.Add("X-Actor", "1700000001");
        reqEnviar1.Headers.Add("X-Rol", "Usuario");
        await _cliente.SendAsync(reqEnviar1);

        // 2. Supervisor devuelve
        var reqDevolver = new HttpRequestMessage(HttpMethod.Post, "/api/revision/1700000001/devolver");
        reqDevolver.Headers.Add("X-Institucion-Id", institucionId.ToString());
        reqDevolver.Headers.Add("X-Actor", "supervisor_01");
        reqDevolver.Headers.Add("X-Rol", "Supervisor");
        reqDevolver.Content = JsonContent.Create(new DevolverActualizacionRequest("Corrija su teléfono."));
        await _cliente.SendAsync(reqDevolver);

        // 3. Usuario puede editar de nuevo (RF-FLU-004)
        var reqEditar = new HttpRequestMessage(HttpMethod.Put, "/api/mis-datos?documento=1700000001");
        reqEditar.Headers.Add("X-Institucion-Id", institucionId.ToString());
        reqEditar.Headers.Add("X-Actor", "1700000001");
        reqEditar.Headers.Add("X-Rol", "Usuario");
        reqEditar.Content = JsonContent.Create(new ActualizarDatosRequest("{\"telefono\":\"0991112233\"}"));

        var resEditar = await _cliente.SendAsync(reqEditar);
        Assert.Equal(HttpStatusCode.OK, resEditar.StatusCode);

        // 4. Usuario vuelve a enviar a revisión
        var reqEnviar2 = new HttpRequestMessage(HttpMethod.Post, "/api/mis-datos/enviar?documento=1700000001");
        reqEnviar2.Headers.Add("X-Institucion-Id", institucionId.ToString());
        reqEnviar2.Headers.Add("X-Actor", "1700000001");
        reqEnviar2.Headers.Add("X-Rol", "Usuario");

        var resEnviar2 = await _cliente.SendAsync(reqEnviar2);
        Assert.Equal(HttpStatusCode.OK, resEnviar2.StatusCode);
    }

    [Fact]
    public async Task RF_FLU_005_Solo_se_conserva_la_ultima_version_aprobada_sin_historico_de_datos()
    {
        var (institucionId, _, _) = await InicializarDatosPruebaAsync();

        // 1. Guardar versión 1, aceptar y enviar
        var reqAceptar = new HttpRequestMessage(HttpMethod.Post, "/api/mis-datos/aceptar-tratamiento?documento=1700000001");
        reqAceptar.Headers.Add("X-Institucion-Id", institucionId.ToString());
        reqAceptar.Headers.Add("X-Actor", "1700000001");
        reqAceptar.Headers.Add("X-Rol", "Usuario");
        await _cliente.SendAsync(reqAceptar);

        var reqGuardar1 = new HttpRequestMessage(HttpMethod.Put, "/api/mis-datos?documento=1700000001");
        reqGuardar1.Headers.Add("X-Institucion-Id", institucionId.ToString());
        reqGuardar1.Headers.Add("X-Actor", "1700000001");
        reqGuardar1.Headers.Add("X-Rol", "Usuario");
        reqGuardar1.Content = JsonContent.Create(new ActualizarDatosRequest("{\"version\":1}"));
        await _cliente.SendAsync(reqGuardar1);

        var reqEnviar = new HttpRequestMessage(HttpMethod.Post, "/api/mis-datos/enviar?documento=1700000001");
        reqEnviar.Headers.Add("X-Institucion-Id", institucionId.ToString());
        reqEnviar.Headers.Add("X-Actor", "1700000001");
        reqEnviar.Headers.Add("X-Rol", "Usuario");
        await _cliente.SendAsync(reqEnviar);

        // 2. Supervisor aprueba
        var reqAprobar = new HttpRequestMessage(HttpMethod.Post, "/api/revision/1700000001/aprobar");
        reqAprobar.Headers.Add("X-Institucion-Id", institucionId.ToString());
        reqAprobar.Headers.Add("X-Actor", "supervisor_01");
        reqAprobar.Headers.Add("X-Rol", "Supervisor");
        await _cliente.SendAsync(reqAprobar);

        // 3. Consultar expediente: solo muestra {"version":1} vigente
        var reqExp = new HttpRequestMessage(HttpMethod.Get, "/api/revision/1700000001");
        reqExp.Headers.Add("X-Institucion-Id", institucionId.ToString());
        reqExp.Headers.Add("X-Actor", "supervisor_01");
        reqExp.Headers.Add("X-Rol", "Supervisor");
        var resExp = await _cliente.SendAsync(reqExp);
        var exp = await resExp.Content.ReadFromJsonAsync<ExpedienteRevisionDto>();
        Assert.NotNull(exp);
        Assert.Equal("{\"version\":1}", exp.DatosPersonalesJson);
    }

    [Fact]
    public async Task RF_FLU_006_Supervisor_no_ve_borradores_ni_personas_de_otra_institucion()
    {
        var (institucionId, _, _) = await InicializarDatosPruebaAsync();

        // 1. La persona "1700000001" está en Borrador. La lista de pendientes no debe mostrarla
        var reqPendientes = new HttpRequestMessage(HttpMethod.Get, "/api/revision/pendientes");
        reqPendientes.Headers.Add("X-Institucion-Id", institucionId.ToString());
        reqPendientes.Headers.Add("X-Actor", "supervisor_01");
        reqPendientes.Headers.Add("X-Rol", "Supervisor");

        var resPendientes = await _cliente.SendAsync(reqPendientes);
        Assert.Equal(HttpStatusCode.OK, resPendientes.StatusCode);
        var pendientes = await resPendientes.Content.ReadFromJsonAsync<List<ResumenRevisionPendienteDto>>();
        Assert.NotNull(pendientes);
        Assert.Empty(pendientes);

        // 2. Si supervisor intenta consultar expediente de "1700000001" que está en borrador -> Error
        var reqExpBorrador = new HttpRequestMessage(HttpMethod.Get, "/api/revision/1700000001");
        reqExpBorrador.Headers.Add("X-Institucion-Id", institucionId.ToString());
        reqExpBorrador.Headers.Add("X-Actor", "supervisor_01");
        reqExpBorrador.Headers.Add("X-Rol", "Supervisor");

        var resExpBorrador = await _cliente.SendAsync(reqExpBorrador);
        Assert.Equal(HttpStatusCode.BadRequest, resExpBorrador.StatusCode);

        // 3. Supervisor de OTRA institución intenta consultar -> 404 o rechazo
        var otraInstitucionId = Guid.NewGuid();
        var reqOtraInst = new HttpRequestMessage(HttpMethod.Get, "/api/revision/1700000001");
        reqOtraInst.Headers.Add("X-Institucion-Id", otraInstitucionId.ToString());
        reqOtraInst.Headers.Add("X-Actor", "supervisor_externo");
        reqOtraInst.Headers.Add("X-Rol", "Supervisor");

        var resOtraInst = await _cliente.SendAsync(reqOtraInst);
        Assert.Equal(HttpStatusCode.NotFound, resOtraInst.StatusCode);
    }

    [Fact]
    public async Task RF_DAT_005_Auditoria_no_incluye_contrasenas_ni_datos_personales()
    {
        var (institucionId, _, _) = await InicializarDatosPruebaAsync();

        // Ejecutar acción de aceptar tratamiento y enviar
        var reqAceptar = new HttpRequestMessage(HttpMethod.Post, "/api/mis-datos/aceptar-tratamiento?documento=1700000001");
        reqAceptar.Headers.Add("X-Institucion-Id", institucionId.ToString());
        reqAceptar.Headers.Add("X-Actor", "1700000001");
        reqAceptar.Headers.Add("X-Rol", "Usuario");
        await _cliente.SendAsync(reqAceptar);

        // Consultar auditorías por supervisor
        var reqAuditoria = new HttpRequestMessage(HttpMethod.Get, "/api/auditoria");
        reqAuditoria.Headers.Add("X-Institucion-Id", institucionId.ToString());
        reqAuditoria.Headers.Add("X-Actor", "supervisor_01");
        reqAuditoria.Headers.Add("X-Rol", "Supervisor");

        var resAuditoria = await _cliente.SendAsync(reqAuditoria);
        Assert.Equal(HttpStatusCode.OK, resAuditoria.StatusCode);
        var auditorias = await resAuditoria.Content.ReadFromJsonAsync<List<AuditoriaDto>>();
        Assert.NotNull(auditorias);
        Assert.NotEmpty(auditorias);

        foreach (var aud in auditorias)
        {
            Assert.False(string.IsNullOrWhiteSpace(aud.Actor));
            Assert.False(string.IsNullOrWhiteSpace(aud.Accion));
            // Garantizar que ningún detalle contenga campos confidenciales de contraseñas
            Assert.DoesNotContain("password", aud.Detalle ?? "", StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("clave", aud.Detalle ?? "", StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("hash", aud.Detalle ?? "", StringComparison.OrdinalIgnoreCase);
        }
    }
}
