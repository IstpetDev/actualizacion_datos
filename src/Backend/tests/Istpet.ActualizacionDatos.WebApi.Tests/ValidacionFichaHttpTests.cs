namespace Istpet.ActualizacionDatos.WebApi.Tests;

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Validacion;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

public sealed partial class HojaDeVidaTests
{
    [Theory]
    [InlineData("perfil", "texto ficticio")]
    [InlineData("perfil", "")]
    [InlineData("perfil", null)]
    [InlineData("codigoPostal", "170306ssssss")]
    [InlineData("celular", "0800000000")]
    [InlineData("telefonoConvencional", "02000000")]
    [InlineData("primerNombre", "Ficticio1")]
    [InlineData("segundoNombre", "Ficticio@ ")]
    [InlineData("primerApellido", "Ficticio2")]
    [InlineData("segundoApellido", "Ficticio/")]
    [InlineData("fechaNacimiento", "1899-12-31")]
    [InlineData("fechaNacimiento", "2026-02-30")]
    [InlineData("porcentajeDiscapacidad", "abc")]
    [InlineData("correoInstitucional", "a@b@institucion-ficticia.example")]
    public async Task API_rechaza_por_campo_sin_guardar_ni_hacer_eco(string campo, string? valor)
    {
        var datos = await ConfigurarDatosInicialesAsync();
        var respuesta = await EnviarAsync(HttpMethod.Put, "/api/mis-datos/hoja-de-vida/ficha", datos.InstitucionId, Documento,
            cuerpo: new Dictionary<string, string?> { [campo] = valor });
        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        var error = (await respuesta.Content.ReadFromJsonAsync<MensajeRespuesta>())!;
        Assert.Contains(campo, error.Errores!.Keys);
        if (!string.IsNullOrEmpty(valor)) Assert.DoesNotContain(valor, JsonSerializer.Serialize(error));
        var ficha = await EnviarAsync(HttpMethod.Get, "/api/mis-datos/hoja-de-vida/ficha", datos.InstitucionId, Documento);
        Assert.Equal(HttpStatusCode.NoContent, ficha.StatusCode);
    }

    [Fact]
    public async Task API_guarda_borrador_valido_normaliza_y_rechaza_dominio_ajeno_sin_afectar_otra_institucion()
    {
        var a = await ConfigurarDatosInicialesAsync();
        var b = await ConfigurarDatosInicialesAsync();
        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            (await db.Instituciones.SingleAsync(i => i.Id == new InstitucionId(a.InstitucionId))).ConfigurarDominiosCorreo(["institucion-ficticia.example"]);
            (await db.Instituciones.SingleAsync(i => i.Id == new InstitucionId(b.InstitucionId))).ConfigurarDominiosCorreo(["otra-ficticia.example"]);
            await db.SaveChangesAsync();
        }
        var valido = new GuardarFichaPersonalRequest(PrimerNombre: "  Ficcio\u0301n  ", PrimerApellido: "D’Ensayo", Celular: "0900000000", TelefonoConvencional: "020000000", CodigoPostal: "000001", FechaNacimiento: new DateOnly(2000, 2, 29), CorreoInstitucional: "PERSONA@INSTITUCION-FICTICIA.EXAMPLE", CorreoPersonal: "personal.ficticio@correo-personal.org");
        var guardar = await EnviarAsync(HttpMethod.Put, "/api/mis-datos/hoja-de-vida/ficha", a.InstitucionId, Documento, cuerpo: valido);
        Assert.Equal(HttpStatusCode.OK, guardar.StatusCode);
        var guardado = await guardar.Content.ReadFromJsonAsync<FichaPersonalDto>();
        Assert.Equal("Ficción", guardado!.PrimerNombre);
        Assert.Equal("personal.ficticio@correo-personal.org", guardado.CorreoPersonal);
        var rechazado = await EnviarAsync(HttpMethod.Put, "/api/mis-datos/hoja-de-vida/ficha", a.InstitucionId, Documento, cuerpo: valido with { CorreoInstitucional = "persona@otra-ficticia.example" });
        Assert.Equal(HttpStatusCode.BadRequest, rechazado.StatusCode);
        Assert.Contains("@institucion-ficticia.example", (await rechazado.Content.ReadFromJsonAsync<MensajeRespuesta>())!.Errores!["correoInstitucional"][0]);
        var otro = await EnviarAsync(HttpMethod.Put, "/api/mis-datos/hoja-de-vida/ficha", b.InstitucionId, Documento, cuerpo: valido with { CorreoInstitucional = "persona@otra-ficticia.example" });
        Assert.Equal(HttpStatusCode.OK, otro.StatusCode);
        var leer = await EnviarAsync(HttpMethod.Get, "/api/mis-datos/hoja-de-vida/ficha", a.InstitucionId, Documento);
        var leido = await leer.Content.ReadFromJsonAsync<FichaPersonalDto>();
        Assert.Equal(valido.CorreoInstitucional, leido!.CorreoInstitucional);
        Assert.Equal("personal.ficticio@correo-personal.org", leido.CorreoPersonal);
    }

    [Fact]
    public async Task Datos_historicos_se_pueden_leer_pero_envio_identifica_el_campo_y_perfil_se_ignora()
    {
        var datos = await ConfigurarDatosInicialesAsync();
        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            var ficha = new FichaPersonal(new InstitucionId(datos.InstitucionId), datos.PersonaId);
            ficha.Actualizar(new DatosFichaPersonal(Celular: "telefono-antiguo", CodigoPostal: "antiguo", Perfil: "PERFIL HISTORICO FICTICIO"));
            db.FichasPersonales.Add(ficha);
            await db.SaveChangesAsync();
        }
        var leer = await EnviarAsync(HttpMethod.Get, "/api/mis-datos/hoja-de-vida/", datos.InstitucionId, Documento);
        var hdv = (await leer.Content.ReadFromJsonAsync<HojaDeVidaDto>())!;
        Assert.Equal(PerfilProfesional.Generar(0, 0, 0, 0), hdv.Ficha!.Perfil);
        Assert.DoesNotContain("HISTORICO", await leer.Content.ReadAsStringAsync());
        var faltantes = await EnviarAsync(HttpMethod.Get, "/api/mis-datos/hoja-de-vida/faltantes", datos.InstitucionId, Documento);
        var resultado = (await faltantes.Content.ReadFromJsonAsync<ResultadoValidacionEnvioDto>())!;
        Assert.Contains(resultado.Faltantes, f => f.Codigo == "formato.celular" && f.Seccion == "ficha");
        Assert.Contains(resultado.Faltantes, f => f.Codigo == "formato.codigoPostal");
    }
    [Theory]
    [InlineData("1", true)]
    [InlineData("24", true)]
    [InlineData("0", false)]
    [InlineData("-1", false)]
    [InlineData("1.5", false)]
    [InlineData("2147483648", false)]
    [InlineData("\"horas\"", false)]
    public async Task API_valida_horas_y_tipos_JSON_sin_romper_el_contrato(string horasJson, bool valido)
    {
        var datos = await ConfigurarDatosInicialesAsync();
        var horas = JsonDocument.Parse(horasJson).RootElement.Clone();
        var respuesta = await EnviarAsync(HttpMethod.Post, "/api/mis-datos/hoja-de-vida/capacitaciones", datos.InstitucionId, Documento,
            cuerpo: new { nombreEvento = "Curso Ficticio", institucionOrganizadora = "Institución Ficticia", numeroHoras = horas });
        Assert.Equal(valido ? HttpStatusCode.Created : HttpStatusCode.BadRequest, respuesta.StatusCode);
        if (!valido) Assert.Contains("numeroHoras", (await respuesta.Content.ReadFromJsonAsync<MensajeRespuesta>())!.Errores!.Keys);
    }

}

public sealed partial class ConfiguracionHojaDeVidaTests
{
    [Fact]
    public async Task Dominios_configurables_por_admin_aislados_y_no_admiten_suplantacion_por_headers()
    {
        await AutenticarAsync();
        var vacia = (await _cliente.GetFromJsonAsync<PoliticaValidacionDto>("/api/configuracion/politica-validacion"))!;
        Assert.Empty(vacia.DominiosCorreoPermitidos);
        var guardar = await _cliente.PutAsJsonAsync("/api/configuracion/correo-institucional", new GuardarDominiosCorreoRequest(["@INSTITUCION-FICTICIA.EXAMPLE", "institucion-ficticia.example"]));
        Assert.Equal(HttpStatusCode.OK, guardar.StatusCode);
        Assert.Equal(["institucion-ficticia.example"], (await guardar.Content.ReadFromJsonAsync<PoliticaValidacionDto>())!.DominiosCorreoPermitidos);
        var otra = InstitucionId.Nuevo();
        await AutenticarAsync(institucion: otra);
        Assert.Empty((await _cliente.GetFromJsonAsync<PoliticaValidacionDto>("/api/configuracion/politica-validacion"))!.DominiosCorreoPermitidos);
        _cliente.DefaultRequestHeaders.Add("X-Institucion-Id", _institucion.Valor.ToString());
        Assert.Equal(HttpStatusCode.Forbidden, (await _cliente.GetAsync("/api/configuracion/politica-validacion")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await _cliente.PutAsJsonAsync("/api/configuracion/correo-institucional", new GuardarDominiosCorreoRequest([]))).StatusCode);
    }

    [Theory]
    [InlineData("*.ficticia.example")]
    [InlineData("a@b@ficticia.example")]
    [InlineData("ficticia.example:80")]
    public async Task Admin_recibe_400_con_campo_al_configurar_dominios_invalidos(string dominio)
    {
        await AutenticarAsync();
        var respuesta = await _cliente.PutAsJsonAsync("/api/configuracion/correo-institucional", new GuardarDominiosCorreoRequest([dominio]));
        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
        Assert.Contains("dominiosCorreoPermitidos", (await respuesta.Content.ReadFromJsonAsync<MensajeRespuesta>())!.Errores!.Keys);
    }

    [Fact]
    public async Task Usuario_consulta_su_politica_pero_no_puede_cambiar_dominios()
    {
        await AutenticarAsync(RolUsuario.Usuario);
        Assert.Equal(HttpStatusCode.OK, (await _cliente.GetAsync("/api/configuracion/politica-validacion")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await _cliente.PutAsJsonAsync("/api/configuracion/correo-institucional", new GuardarDominiosCorreoRequest([]))).StatusCode);
    }
}
