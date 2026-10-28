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

    private static (ByteArrayContent Content, byte[] Bytes) CrearJpgValidoConBytes(string payload = "foto-ficticia")
    {
        var cabecera = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0 };
        var textoBytes = Encoding.UTF8.GetBytes(payload);
        var todos = cabecera.Concat(textoBytes).ToArray();
        var content = new ByteArrayContent(todos);
        content.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        return (content, todos);
    }

    private static (ByteArrayContent Content, byte[] Bytes) CrearPngValidoConBytes(string payload = "png-ficticio")
    {
        var cabecera = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };
        var textoBytes = Encoding.UTF8.GetBytes(payload);
        var todos = cabecera.Concat(textoBytes).ToArray();
        var content = new ByteArrayContent(todos);
        content.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        return (content, todos);
    }

    private static (ByteArrayContent Content, byte[] Bytes) CrearPdfValidoConBytes(string payload = "pdf-ficticio")
    {
        var cabecera = Encoding.UTF8.GetBytes("%PDF-1.4\n");
        var textoBytes = Encoding.UTF8.GetBytes(payload);
        var todos = cabecera.Concat(textoBytes).ToArray();
        var content = new ByteArrayContent(todos);
        content.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        return (content, todos);
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

    [Fact]
    public async Task Descarga_de_archivos_ficticios_jpg_png_y_pdf_conserva_bytes_nombre_tamano_y_mimetype_exactos()
    {
        var (instId, u1, _, _) = await InicializarDatosPruebaAsync();

        var archivosAProbar = new (string Nombre, string MimeEsperado, ByteArrayContent Content, byte[] BytesOriginales)[]
        {
            ("perfil-ficticio.jpg", "image/jpeg", CrearJpgValidoConBytes("jpg-content-123").Content, CrearJpgValidoConBytes("jpg-content-123").Bytes),
            ("captura-ficticia.png", "image/png", CrearPngValidoConBytes("png-content-456").Content, CrearPngValidoConBytes("png-content-456").Bytes),
            ("antecedentes-ficticios.pdf", "application/pdf", CrearPdfValidoConBytes("pdf-content-789").Content, CrearPdfValidoConBytes("pdf-content-789").Bytes)
        };

        foreach (var (nombre, mimeEsperado, content, bytesEsperados) in archivosAProbar)
        {
            using var form = new MultipartFormDataContent();
            form.Add(content, "archivo", nombre);
            var reqSubida = CrearRequest(HttpMethod.Post, $"/api/archivos/subir?claveDestino=doc_{Path.GetFileNameWithoutExtension(nombre)}", instId, u1.Documento);
            reqSubida.Content = form;
            var rSubida = await _cliente.SendAsync(reqSubida);
            Assert.Equal(HttpStatusCode.OK, rSubida.StatusCode);

            var dto = await rSubida.Content.ReadFromJsonAsync<ArchivoDto>();
            Assert.NotNull(dto);
            Assert.Equal(nombre, dto.NombreOriginal);
            Assert.Equal(mimeEsperado, dto.TipoContenido);
            Assert.Equal(bytesEsperados.Length, dto.TamanoBytes);

            // Descargar y validar integridad estricta de bytes
            var reqDescarga = CrearRequest(HttpMethod.Get, $"/api/archivos/{dto.Id}/descargar", instId, u1.Documento);
            var rDescarga = await _cliente.SendAsync(reqDescarga);
            Assert.Equal(HttpStatusCode.OK, rDescarga.StatusCode);
            Assert.Equal(mimeEsperado, rDescarga.Content.Headers.ContentType?.MediaType);
            Assert.Contains(nombre, rDescarga.Content.Headers.ContentDisposition?.FileNameStar ?? rDescarga.Content.Headers.ContentDisposition?.FileName ?? "");

            var bytesDescargados = await rDescarga.Content.ReadAsByteArrayAsync();
            Assert.Equal(bytesEsperados.Length, bytesDescargados.Length);
            Assert.True(bytesEsperados.SequenceEqual(bytesDescargados), $"Los bytes descargados de {nombre} no coinciden con los originales.");
        }
    }

    [Fact]
    public async Task ListarArchivosExpediente_no_incluye_adjuntos_duplicados_reemplazados_y_clasifica_areas()
    {
        var (instId, u1, _, sup) = await InicializarDatosPruebaAsync();

        // 1. Subir primera foto (que luego será reemplazada) sin clave
        Guid fotoViejaId;
        using (var form1 = new MultipartFormDataContent())
        {
            var (jpg, _) = CrearJpgValidoConBytes("foto-vieja");
            form1.Add(jpg, "archivo", "foto_antigua.jpg");
            var req1 = CrearRequest(HttpMethod.Post, "/api/archivos/subir", instId, u1.Documento);
            req1.Content = form1;
            var r1 = await _cliente.SendAsync(req1);
            var d1 = await r1.Content.ReadFromJsonAsync<ArchivoDto>();
            fotoViejaId = d1!.Id;
        }

        // 2. Subir segunda foto (la definitiva) y asociarla a la ficha
        Guid fotoNuevaId;
        using (var form2 = new MultipartFormDataContent())
        {
            var (jpg, _) = CrearJpgValidoConBytes("foto-nueva");
            form2.Add(jpg, "archivo", "foto_vigente.jpg");
            var req2 = CrearRequest(HttpMethod.Post, "/api/archivos/subir?claveDestino=foto:perfil", instId, u1.Documento);
            req2.Content = form2;
            var r2 = await _cliente.SendAsync(req2);
            var d2 = await r2.Content.ReadFromJsonAsync<ArchivoDto>();
            fotoNuevaId = d2!.Id;
        }

        // Asociar fotoNueva a FichaPersonal en la base de datos
        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            var ficha = new FichaPersonal(new InstitucionId(instId), u1.Id);
            ficha.AsociarFoto(fotoNuevaId);
            db.FichasPersonales.Add(ficha);

            // Asociar también un título con respaldo
            var (pdf, _) = CrearPdfValidoConBytes("titulo-ing");
            var archTitulo = new ArchivoAdjunto(
                Guid.NewGuid(),
                new InstitucionId(instId),
                u1.Id,
                "titulo_ingenieria.pdf",
                "application/pdf",
                100,
                "sha-ficticio",
                "rutas/titulo.bin",
                null,
                DateTime.UtcNow);
            db.ArchivosAdjuntos.Add(archTitulo);

            var titulo = new TituloAcademico(
                Guid.NewGuid(),
                new InstitucionId(instId),
                u1.Id,
                new DatosTituloAcademico("Ingeniería en Sistemas", 1, NombreInstitucionOtra: "Universidad Ficticia"));
            titulo.AsociarArchivo(archTitulo.Id);
            db.TitulosAcademicos.Add(titulo);

            await db.SaveChangesAsync();
        }

        // 3. Supervisor consulta expediente de u1
        var reqExp = CrearRequest(HttpMethod.Get, $"/api/revision/{u1.Documento}/archivos", instId, sup.Documento, RolUsuario.Supervisor);
        var rExp = await _cliente.SendAsync(reqExp);
        Assert.Equal(HttpStatusCode.OK, rExp.StatusCode);

        var archivos = await rExp.Content.ReadFromJsonAsync<List<ArchivoDto>>();
        Assert.NotNull(archivos);

        // La foto vieja no debe aparecer como duplicada en la lista del expediente
        Assert.DoesNotContain(archivos, a => a.Id == fotoViejaId);

        // La foto nueva y el título sí deben aparecer
        var fotoItem = archivos.FirstOrDefault(a => a.Id == fotoNuevaId);
        Assert.NotNull(fotoItem);
        Assert.Equal("Fotografía Personal", fotoItem.ClaveDestino);
        Assert.True(fotoItem.FechaSubidaUtc <= DateTime.UtcNow);

        var tituloItem = archivos.FirstOrDefault(a => a.NombreOriginal == "titulo_ingenieria.pdf");
        Assert.NotNull(tituloItem);
        Assert.Equal("Formación Académica: Ingeniería en Sistemas", tituloItem.ClaveDestino);
    }
}
