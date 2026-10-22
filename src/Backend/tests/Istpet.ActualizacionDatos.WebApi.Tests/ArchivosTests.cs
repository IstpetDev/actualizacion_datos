namespace Istpet.ActualizacionDatos.WebApi.Tests;

using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Infrastructure.Multitenancy;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

public sealed class ArchivosTests : IDisposable
{
    private readonly SqliteConnection _conexion;
    private readonly WebApplicationFactory<Program> _fabrica;
    private readonly HttpClient _cliente;

    public ArchivosTests()
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

        _cliente = _fabrica.CreateClient();
    }

    public void Dispose()
    {
        _cliente.Dispose();
        _fabrica.Dispose();
        _conexion.Dispose();
    }

    private async Task<(Guid InstitucionId, Persona Usuario1, Persona Usuario2, Persona Supervisor)> InicializarDatosPruebaAsync(bool campanaActiva = true)
    {
        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();

        var institucionId = Guid.NewGuid();
        var inst = new Institucion(new InstitucionId(institucionId), "Institucion Test Archivos");
        db.Instituciones.Add(inst);

        var u1 = new Persona(
            Guid.NewGuid(),
            new InstitucionId(institucionId),
            "1700000001",
            RolUsuario.Usuario,
            "Usuario Uno",
            "usuario1@ejemplo.test",
            accesoHabilitado: true);

        var u2 = new Persona(
            Guid.NewGuid(),
            new InstitucionId(institucionId),
            "1700000002",
            RolUsuario.Usuario,
            "Usuario Dos",
            "usuario2@ejemplo.test",
            accesoHabilitado: true);

        var sup = new Persona(
            Guid.NewGuid(),
            new InstitucionId(institucionId),
            "1700000009",
            RolUsuario.Supervisor,
            "Supervisor Test",
            "supervisor@ejemplo.test",
            accesoHabilitado: true);

        if (campanaActiva)
        {
            var campana = new Campana(
                Guid.NewGuid(),
                new InstitucionId(institucionId),
                "Campaña 2026 Test",
                DateTime.UtcNow.AddDays(-5),
                DateTime.UtcNow.AddDays(5),
                activa: true);
            db.Campanas.Add(campana);
        }

        db.Personas.AddRange(u1, u2, sup);
        await db.SaveChangesAsync();

        return (institucionId, u1, u2, sup);
    }

    private static HttpRequestMessage CrearRequest(
        HttpMethod metodo,
        string ruta,
        Guid instId,
        string actor,
        RolUsuario rol = RolUsuario.Usuario)
    {
        var request = new HttpRequestMessage(metodo, ruta);
        request.Headers.Add("X-Institucion-Id", instId.ToString());
        request.Headers.Add("X-Actor", actor);
        request.Headers.Add("X-Rol", rol.ToString());
        return request;
    }

    private static ByteArrayContent CrearPdfValido(string contenido = "Documento de prueba")
    {
        var cabecera = "%PDF-1.4\n";
        var bytes = Encoding.UTF8.GetBytes(cabecera + contenido);
        var content = new ByteArrayContent(bytes);
        content.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        return content;
    }

    [Fact]
    public async Task Subir_archivo_valido_en_campana_activa_retorna_200_y_guarda_metadatos()
    {
        var (instId, u1, _, _) = await InicializarDatosPruebaAsync();

        using var form = new MultipartFormDataContent();
        form.Add(CrearPdfValido(), "archivo", "cedula.pdf");

        var request = CrearRequest(HttpMethod.Post, "/api/archivos/subir?claveDestino=cedula_frontal", instId, u1.Documento);
        request.Content = form;

        var respuesta = await _cliente.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);

        var archivoDto = await respuesta.Content.ReadFromJsonAsync<ArchivoDto>();
        Assert.NotNull(archivoDto);
        Assert.Equal("cedula.pdf", archivoDto.NombreOriginal);
        Assert.Equal("application/pdf", archivoDto.TipoContenido);
        Assert.Equal("cedula_frontal", archivoDto.ClaveDestino);
        Assert.False(string.IsNullOrWhiteSpace(archivoDto.HashSha256));
    }

    [Fact]
    public async Task Subir_archivo_con_tamano_mayor_a_10MB_retorna_400()
    {
        var (instId, u1, _, _) = await InicializarDatosPruebaAsync();

        // 10 MB + 1 byte
        var bytesGigantes = new byte[10 * 1024 * 1024 + 1];
        var cabecera = Encoding.ASCII.GetBytes("%PDF-1.4");
        Array.Copy(cabecera, bytesGigantes, cabecera.Length);

        using var form = new MultipartFormDataContent();
        var content = new ByteArrayContent(bytesGigantes);
        content.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        form.Add(content, "archivo", "muy_pesado.pdf");

        var request = CrearRequest(HttpMethod.Post, "/api/archivos/subir", instId, u1.Documento);
        request.Content = form;

        var respuesta = await _cliente.SendAsync(request);
        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);

        var error = await respuesta.Content.ReadFromJsonAsync<MensajeRespuesta>();
        Assert.NotNull(error);
        Assert.Contains("supera el tamaño máximo", error.Mensaje);
    }

    [Fact]
    public async Task Subir_archivo_con_tipo_o_firma_invalida_retorna_400()
    {
        var (instId, u1, _, _) = await InicializarDatosPruebaAsync();

        var bytesFalsos = Encoding.UTF8.GetBytes("Este archivo es texto simple y no tiene %PDF al inicio.");
        using var form = new MultipartFormDataContent();
        var content = new ByteArrayContent(bytesFalsos);
        content.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        form.Add(content, "archivo", "falso.pdf");

        var request = CrearRequest(HttpMethod.Post, "/api/archivos/subir", instId, u1.Documento);
        request.Content = form;

        var respuesta = await _cliente.SendAsync(request);
        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);

        var error = await respuesta.Content.ReadFromJsonAsync<MensajeRespuesta>();
        Assert.NotNull(error);
        Assert.Contains("El contenido del archivo no coincide", error.Mensaje);
    }

    [Fact]
    public async Task Subir_archivo_fuera_de_campana_retorna_403()
    {
        var (instId, u1, _, _) = await InicializarDatosPruebaAsync(campanaActiva: false);

        using var form = new MultipartFormDataContent();
        form.Add(CrearPdfValido(), "archivo", "cedula.pdf");

        var request = CrearRequest(HttpMethod.Post, "/api/archivos/subir", instId, u1.Documento);
        request.Content = form;

        var respuesta = await _cliente.SendAsync(request);
        Assert.Equal(HttpStatusCode.Forbidden, respuesta.StatusCode);

        var error = await respuesta.Content.ReadFromJsonAsync<MensajeRespuesta>();
        Assert.NotNull(error);
        Assert.Contains("fuera del período", error.Mensaje);
    }

    [Fact]
    public async Task Subir_archivo_en_estado_enviado_o_aprobado_retorna_400()
    {
        var (instId, u1, _, _) = await InicializarDatosPruebaAsync();

        // Ponemos a la persona en Enviado
        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            var p = await db.Personas.IgnoreQueryFilters().FirstAsync(x => x.Id == u1.Id);
            p.AceptarTratamientoDatos(DateTime.UtcNow);
            p.EnviarARevision(DateTime.UtcNow);
            await db.SaveChangesAsync();
        }

        using var form = new MultipartFormDataContent();
        form.Add(CrearPdfValido(), "archivo", "cedula.pdf");

        var request = CrearRequest(HttpMethod.Post, "/api/archivos/subir", instId, u1.Documento);
        request.Content = form;

        var respuesta = await _cliente.SendAsync(request);
        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);

        var error = await respuesta.Content.ReadFromJsonAsync<MensajeRespuesta>();
        Assert.NotNull(error);
        Assert.Contains("mientras la solicitud está en revisión", error.Mensaje);
    }

    [Fact]
    public async Task Reemplazar_archivo_con_misma_claveDestino_elimina_anterior_y_conserva_nuevo()
    {
        var (instId, u1, _, _) = await InicializarDatosPruebaAsync();

        // Primer archivo
        using (var form1 = new MultipartFormDataContent())
        {
            form1.Add(CrearPdfValido("version 1"), "archivo", "cedula_v1.pdf");
            var req1 = CrearRequest(HttpMethod.Post, "/api/archivos/subir?claveDestino=cedula_frontal", instId, u1.Documento);
            req1.Content = form1;
            var r1 = await _cliente.SendAsync(req1);
            Assert.Equal(HttpStatusCode.OK, r1.StatusCode);
        }

        // Segundo archivo con la misma clave de destino
        using (var form2 = new MultipartFormDataContent())
        {
            form2.Add(CrearPdfValido("version 2"), "archivo", "cedula_v2.pdf");
            var req2 = CrearRequest(HttpMethod.Post, "/api/archivos/subir?claveDestino=cedula_frontal", instId, u1.Documento);
            req2.Content = form2;
            var r2 = await _cliente.SendAsync(req2);
            Assert.Equal(HttpStatusCode.OK, r2.StatusCode);
        }

        var reqLista = CrearRequest(HttpMethod.Get, "/api/archivos/mis-archivos", instId, u1.Documento);
        var rLista = await _cliente.SendAsync(reqLista);
        Assert.Equal(HttpStatusCode.OK, rLista.StatusCode);

        var lista = await rLista.Content.ReadFromJsonAsync<List<ArchivoDto>>();
        Assert.NotNull(lista);
        Assert.Single(lista);
        Assert.Equal("cedula_v2.pdf", lista[0].NombreOriginal);
    }

    [Fact]
    public async Task Descargar_archivo_propio_retorna_200_con_headers_de_seguridad()
    {
        var (instId, u1, _, _) = await InicializarDatosPruebaAsync();

        // Subir archivo
        using var form = new MultipartFormDataContent();
        form.Add(CrearPdfValido("Contenido secreto propio"), "archivo", "mi_cedula.pdf");
        var reqSubida = CrearRequest(HttpMethod.Post, "/api/archivos/subir", instId, u1.Documento);
        reqSubida.Content = form;
        var rSubida = await _cliente.SendAsync(reqSubida);
        var subido = await rSubida.Content.ReadFromJsonAsync<ArchivoDto>();
        Assert.NotNull(subido);

        // Descargar archivo
        var reqDescarga = CrearRequest(HttpMethod.Get, $"/api/archivos/{subido.Id}/descargar", instId, u1.Documento);
        var rDescarga = await _cliente.SendAsync(reqDescarga);
        Assert.Equal(HttpStatusCode.OK, rDescarga.StatusCode);
        Assert.Equal("application/pdf", rDescarga.Content.Headers.ContentType?.MediaType);
        Assert.Equal("nosniff", rDescarga.Headers.GetValues("X-Content-Type-Options").FirstOrDefault());
        Assert.NotNull(rDescarga.Content.Headers.ContentDisposition);
        Assert.Equal("attachment", rDescarga.Content.Headers.ContentDisposition.DispositionType);

        var bytes = await rDescarga.Content.ReadAsByteArrayAsync();
        Assert.True(bytes.Length > 0);
        Assert.StartsWith("%PDF-1.4", Encoding.UTF8.GetString(bytes));
    }

    [Fact]
    public async Task Descargar_archivo_de_otro_usuario_como_usuario_comun_retorna_403()
    {
        var (instId, u1, u2, _) = await InicializarDatosPruebaAsync();

        // Usuario 1 sube archivo
        using var form = new MultipartFormDataContent();
        form.Add(CrearPdfValido("Archivo personal u1"), "archivo", "u1_cedula.pdf");
        var reqSubida = CrearRequest(HttpMethod.Post, "/api/archivos/subir", instId, u1.Documento);
        reqSubida.Content = form;
        var rSubida = await _cliente.SendAsync(reqSubida);
        var subido = await rSubida.Content.ReadFromJsonAsync<ArchivoDto>();
        Assert.NotNull(subido);

        // Usuario 2 intenta descargar archivo de Usuario 1 -> RF-DAT-002: 403 Forbidden
        var reqDescarga = CrearRequest(HttpMethod.Get, $"/api/archivos/{subido.Id}/descargar", instId, u2.Documento, RolUsuario.Usuario);
        var rDescarga = await _cliente.SendAsync(reqDescarga);
        Assert.Equal(HttpStatusCode.Forbidden, rDescarga.StatusCode);
    }

    [Fact]
    public async Task Descargar_archivo_como_supervisor_misma_institucion_retorna_200_y_registra_auditoria()
    {
        var (instId, u1, _, sup) = await InicializarDatosPruebaAsync();

        // Usuario 1 sube archivo
        using var form = new MultipartFormDataContent();
        form.Add(CrearPdfValido("Documento para supervisor"), "archivo", "doc_u1.pdf");
        var reqSubida = CrearRequest(HttpMethod.Post, "/api/archivos/subir", instId, u1.Documento);
        reqSubida.Content = form;
        var rSubida = await _cliente.SendAsync(reqSubida);
        var subido = await rSubida.Content.ReadFromJsonAsync<ArchivoDto>();
        Assert.NotNull(subido);

        // Supervisor descarga el archivo
        var reqDescarga = CrearRequest(HttpMethod.Get, $"/api/archivos/{subido.Id}/descargar", instId, sup.Documento, RolUsuario.Supervisor);
        var rDescarga = await _cliente.SendAsync(reqDescarga);
        Assert.Equal(HttpStatusCode.OK, rDescarga.StatusCode);

        // Verificar que se haya registrado en auditoría (RF-DAT-004)
        using var scope = _fabrica.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
        var auditoria = await db.Auditorias.IgnoreQueryFilters().FirstOrDefaultAsync(a => a.Accion == "DescargaArchivo" && a.Actor == sup.Documento);
        Assert.NotNull(auditoria);
        Assert.Contains(subido.Id.ToString(), auditoria.Detalle);
    }

    [Fact]
    public async Task Supervisor_puede_listar_archivos_de_expediente()
    {
        var (instId, u1, _, sup) = await InicializarDatosPruebaAsync();

        // Usuario 1 sube un archivo
        using var form = new MultipartFormDataContent();
        form.Add(CrearPdfValido("Archivo 1"), "archivo", "doc1.pdf");
        var reqSubida = CrearRequest(HttpMethod.Post, "/api/archivos/subir?claveDestino=doc1", instId, u1.Documento);
        reqSubida.Content = form;
        await _cliente.SendAsync(reqSubida);

        // Supervisor consulta archivos de Usuario 1
        var reqConsulta = CrearRequest(HttpMethod.Get, $"/api/revision/{u1.Documento}/archivos", instId, sup.Documento, RolUsuario.Supervisor);
        var respuesta = await _cliente.SendAsync(reqConsulta);
        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);

        var lista = await respuesta.Content.ReadFromJsonAsync<List<ArchivoDto>>();
        Assert.NotNull(lista);
        Assert.Single(lista);
        Assert.Equal("doc1.pdf", lista[0].NombreOriginal);
    }

    [Fact]
    public async Task Eliminar_archivo_propio_en_borrador_retorna_200_y_lo_remueve()
    {
        var (instId, u1, _, _) = await InicializarDatosPruebaAsync();

        using var form = new MultipartFormDataContent();
        form.Add(CrearPdfValido("Contenido temporal"), "archivo", "temp.pdf");
        var reqSubida = CrearRequest(HttpMethod.Post, "/api/archivos/subir", instId, u1.Documento);
        reqSubida.Content = form;
        var rSubida = await _cliente.SendAsync(reqSubida);
        var subido = await rSubida.Content.ReadFromJsonAsync<ArchivoDto>();
        Assert.NotNull(subido);

        // Eliminar
        var reqEliminar = CrearRequest(HttpMethod.Delete, $"/api/archivos/{subido.Id}", instId, u1.Documento);
        var rEliminar = await _cliente.SendAsync(reqEliminar);
        Assert.Equal(HttpStatusCode.OK, rEliminar.StatusCode);

        // Verificar que ya no aparezca en mis archivos
        var reqLista = CrearRequest(HttpMethod.Get, "/api/archivos/mis-archivos", instId, u1.Documento);
        var rLista = await _cliente.SendAsync(reqLista);
        var lista = await rLista.Content.ReadFromJsonAsync<List<ArchivoDto>>();
        Assert.NotNull(lista);
        Assert.Empty(lista);
    }
}
