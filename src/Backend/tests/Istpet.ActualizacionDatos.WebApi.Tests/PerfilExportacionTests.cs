namespace Istpet.ActualizacionDatos.WebApi.Tests;

using System.IO.Compression;
using System.Net;
using Istpet.ActualizacionDatos.Application.Validacion;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

public sealed partial class ExportacionesTests
{
    [Fact]
    public async Task Perfil_generado_coincide_en_CV_y_Excel_sin_legado_ni_HTML_inyectado_ni_datos_ajenos()
    {
        var datos = await InicializarDatosExportacionAsync();
        var institucion = new InstitucionId(datos.InstitucionId);
        using (var alcance = _fabrica.Services.CreateScope())
        {
            var db = alcance.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            var ficha = new FichaPersonal(institucion, datos.PersonaAprobada.Id);
            ficha.Actualizar(new DatosFichaPersonal(PrimerNombre: "Nombre Ficticio", PrimerApellido: "Apellido Ficticio", Perfil: "PERFIL HISTORICO FICTICIO"));
            db.FichasPersonales.Add(ficha);
            db.TitulosAcademicos.Add(new TituloAcademico(Guid.NewGuid(), institucion, datos.PersonaAprobada.Id, new DatosTituloAcademico("Título <script>ficticio</script>", 61, NombreInstitucionOtra: "Institución Ficticia")));
            db.CuentasBancarias.Add(CuentaBancaria.RegistradaPorPersona(Guid.NewGuid(), institucion, datos.PersonaAprobada.Id, new DatosCuentaBancaria(71, null, "Banco Ficticio", new NumeroCuentaProtegido("cifrado-ficticio", "0001", "huella-ficticia")), DateTime.UtcNow));
            var ajena = InstitucionId.Nuevo();
            db.Instituciones.Add(new Institucion(ajena, "Institución Ficticia Ajena"));
            var personaAjena = new Persona(Guid.NewGuid(), ajena, "0000000088", RolUsuario.Usuario, "PERSONA AJENA FICTICIA", estadoActualizacion: EstadoActualizacion.Aprobado);
            db.Personas.Add(personaAjena);
            db.TitulosAcademicos.Add(new TituloAcademico(Guid.NewGuid(), ajena, personaAjena.Id, new DatosTituloAcademico("TITULO AJENO FICTICIO", 61, NombreInstitucionOtra: "Institución Ficticia Ajena")));
            await db.SaveChangesAsync();
        }
        var esperado = PerfilProfesional.Generar(1, 0, 0, 0);
        var zip = await _cliente.SendAsync(CrearRequest(HttpMethod.Get, "/api/exportaciones/zip", datos.InstitucionId, "admin-ficticio"));
        Assert.Equal(HttpStatusCode.OK, zip.StatusCode);
        using (var archivo = new ZipArchive(new MemoryStream(await zip.Content.ReadAsByteArrayAsync()), ZipArchiveMode.Read))
        {
            var cv = Assert.Single(archivo.Entries, e => e.FullName.EndsWith("/hoja-de-vida.html", StringComparison.Ordinal));
            using var lector = new StreamReader(cv.Open());
            var html = await lector.ReadToEndAsync();
            Assert.Contains(System.Text.Encodings.Web.HtmlEncoder.Default.Encode(esperado), html);
            Assert.Contains("&lt;script&gt;", html);
            Assert.DoesNotContain("<script>", html);
            Assert.DoesNotContain("HISTORICO", html);
            Assert.DoesNotContain("AJENO", html);
            Assert.DoesNotContain("cifrado-ficticio", html);
            Assert.Contains("******0001", html);
        }
        var excel = await _cliente.SendAsync(CrearRequest(HttpMethod.Get, "/api/exportaciones/excel", datos.InstitucionId, "admin-ficticio"));
        Assert.Equal(HttpStatusCode.OK, excel.StatusCode);
        using var libro = new ZipArchive(new MemoryStream(await excel.Content.ReadAsByteArrayAsync()), ZipArchiveMode.Read);
        using var hoja = new StreamReader(libro.GetEntry("xl/worksheets/sheet1.xml")!.Open());
        var contenido = await hoja.ReadToEndAsync();
        Assert.Contains("Perfil profesional generado", contenido);
        Assert.Contains(esperado, contenido);
        Assert.DoesNotContain("HISTORICO", contenido);
        Assert.DoesNotContain("AJENO", contenido);
    }
}
