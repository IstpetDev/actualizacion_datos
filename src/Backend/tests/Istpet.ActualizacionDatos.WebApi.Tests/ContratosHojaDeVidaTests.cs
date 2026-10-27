namespace Istpet.ActualizacionDatos.WebApi.Tests;

using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Istpet.ActualizacionDatos.Application.Modelos;
using Microsoft.AspNetCore.Mvc.Testing;

// spec-0003, T-00 (#42): los grupos de endpoints existen, aplican el rol que fija plan.md y responden 501
// hasta que cada tarea los implemente. Cuando una tarea implementa su grupo, cambia su fila de 501
// por las pruebas de comportamiento de su servicio.
public sealed class ContratosHojaDeVidaTests : IClassFixture<FabricaPruebas>
{
    private const string DocumentoUsuario = "0000000000";
    private const string Id = "00000000-0000-0000-0000-000000000001";

    private readonly WebApplicationFactory<Program> _fabrica;

    public ContratosHojaDeVidaTests(FabricaPruebas fabrica)
    {
        _fabrica = fabrica;
    }

    public static TheoryData<string, string> RutasDelUsuario => new()
    {
        { "GET", "/api/mis-datos/hoja-de-vida" },
        { "GET", "/api/mis-datos/hoja-de-vida/ficha" },
        { "PUT", "/api/mis-datos/hoja-de-vida/ficha" },
        { "POST", "/api/mis-datos/hoja-de-vida/titulos" },
        { "PUT", $"/api/mis-datos/hoja-de-vida/titulos/{Id}" },
        { "DELETE", $"/api/mis-datos/hoja-de-vida/titulos/{Id}" },
        { "POST", "/api/mis-datos/hoja-de-vida/titulos-en-curso" },
        { "PUT", $"/api/mis-datos/hoja-de-vida/titulos-en-curso/{Id}" },
        { "DELETE", $"/api/mis-datos/hoja-de-vida/titulos-en-curso/{Id}" },
        { "POST", "/api/mis-datos/hoja-de-vida/capacitaciones" },
        { "PUT", $"/api/mis-datos/hoja-de-vida/capacitaciones/{Id}" },
        { "DELETE", $"/api/mis-datos/hoja-de-vida/capacitaciones/{Id}" },
        { "POST", "/api/mis-datos/hoja-de-vida/experiencias" },
        { "PUT", $"/api/mis-datos/hoja-de-vida/experiencias/{Id}" },
        { "DELETE", $"/api/mis-datos/hoja-de-vida/experiencias/{Id}" },
        { "POST", "/api/mis-datos/hoja-de-vida/referencias" },
        { "PUT", $"/api/mis-datos/hoja-de-vida/referencias/{Id}" },
        { "DELETE", $"/api/mis-datos/hoja-de-vida/referencias/{Id}" },
        { "GET", "/api/mis-datos/hoja-de-vida/faltantes" },
        { "GET", "/api/mis-datos/documentos" },
        { "PUT", $"/api/mis-datos/documentos/{Id}" },
    };

    [Theory]
    [MemberData(nameof(RutasDelUsuario))]
    public async Task Ruta_del_usuario_sin_sesion_responde_401(string metodo, string ruta)
    {
        var respuesta = await EnviarAsync(metodo, ruta, rol: null, actor: null);

        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
    }

    [Fact]
    public async Task Revision_de_hoja_de_vida_solo_supervisor_o_admin()
    {
        var respuesta = await EnviarAsync("GET", $"/api/revision/{DocumentoUsuario}/hoja-de-vida", "Usuario", "0000000003");

        Assert.Equal(HttpStatusCode.Forbidden, respuesta.StatusCode);
    }

    [Fact]
    public async Task El_documento_openapi_publica_todas_las_operaciones_de_la_hoja_de_vida()
    {
        using var cliente = _fabrica.CreateClient();
        using var documento = JsonDocument.Parse(await cliente.GetStringAsync(new Uri("/openapi/v1.json", UriKind.Relative)));

        var operaciones = documento.RootElement.GetProperty("paths").EnumerateObject()
            .SelectMany(ruta => ruta.Value.EnumerateObject())
            .Where(op => op.Value.TryGetProperty("operationId", out _))
            .Select(op => op.Value.GetProperty("operationId").GetString())
            .ToHashSet();

        string[] esperadas =
        [
            "ObtenerMiHojaDeVida", "ObtenerMiFichaPersonal", "GuardarMiFichaPersonal", "ObtenerFaltantesEnvio",
            "AgregarTituloAcademico", "ActualizarTituloAcademico", "EliminarTituloAcademico",
            "AgregarTituloEnCurso", "ActualizarTituloEnCurso", "EliminarTituloEnCurso",
            "AgregarCapacitacion", "ActualizarCapacitacion", "EliminarCapacitacion",
            "AgregarExperienciaLaboral", "ActualizarExperienciaLaboral", "EliminarExperienciaLaboral",
            "AgregarReferencia", "ActualizarReferencia", "EliminarReferencia",
            "ObtenerHojaDeVidaParaRevision",
            "ListarMisDocumentosPersonales", "GuardarMiDocumentoPersonal",
            "IniciarNuevaActualizacion",
            "ListarTiposFuncionario", "CrearTipoFuncionario", "ActualizarTipoFuncionario",
            "ListarTiposDocumento", "CrearTipoDocumento", "ActualizarTipoDocumento",
            "ListarRequisitosDocumento", "CrearRequisitoDocumento", "ActualizarRequisitoDocumento",
            "AsignarTipoFuncionario", "EliminarTipoFuncionario", "EliminarTipoDocumento", "EliminarRequisitoDocumento",
        ];

        var faltantes = esperadas.Except(operaciones).ToList();
        Assert.True(faltantes.Count == 0, $"Operaciones ausentes del contrato: {string.Join(", ", faltantes)}");
    }

    private async Task<HttpResponseMessage> EnviarAsync(string metodo, string ruta, string? rol, string? actor)
    {
        using var cliente = _fabrica.CreateClient();
        using var peticion = new HttpRequestMessage(new HttpMethod(metodo), ruta);

        if (metodo is "POST" or "PUT")
        {
            peticion.Content = new StringContent("{}", Encoding.UTF8, "application/json");
        }

        if (rol != null)
        {
            peticion.Headers.Add("X-Rol", rol);
        }

        if (actor != null)
        {
            peticion.Headers.Add("X-Actor", actor);
        }

        return await cliente.SendAsync(peticion);
    }
}
