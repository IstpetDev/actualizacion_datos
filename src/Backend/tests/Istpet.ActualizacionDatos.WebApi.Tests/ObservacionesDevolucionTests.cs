namespace Istpet.ActualizacionDatos.WebApi.Tests;

using System.Net;
using System.Net.Http.Json;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

public sealed partial class HojaDeVidaTests
{
    [Fact]
    public async Task Observaciones_generales_y_dos_especificas_se_conservan_al_corregir_reenviar_y_aprobar()
    {
        var (institucion, personaId, _) = await ConfigurarDatosInicialesAsync(estado: EstadoActualizacion.Enviado);
        var tituloId = Guid.NewGuid();
        using (var scope = _fabrica.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
            var id = new InstitucionId(institucion);
            db.TitulosAcademicos.Add(new TituloAcademico(tituloId, id, personaId,
                new DatosTituloAcademico("Título Ficticio", GradoLicenciatura, NombreInstitucionOtra: "Institución Ficticia")));
            foreach (var seccion in Enum.GetValues<SeccionHojaDeVida>().Where(s => s != SeccionHojaDeVida.FichaPersonal))
                db.SeccionesInstitucion.Add(new SeccionInstitucion(id, seccion, false, "actor-ficticio"));
            await db.SaveChangesAsync();
        }
        var ficha = new GuardarFichaPersonalRequest(PrimerNombre: "Persona", PrimerApellido: "Ficticia", SexoId: SexoHombre,
            FechaNacimiento: new DateOnly(2000, 2, 29), EstadoCivilId: EstadoCivilSoltero,
            PaisNacimientoId: 1001, PaisNacionalidadId: 1001, ParroquiaResidenciaId: 1004,
            CallePrincipal: "Calle Ficticia", Celular: "0900000000", CorreoInstitucional: "persona@ejemplo.test");

        async Task<List<ObservacionDto>> HistorialAsync(bool supervisor = false)
        {
            var respuesta = await EnviarAsync(HttpMethod.Get,
                supervisor ? $"/api/revision/{Documento}" : "/api/mis-datos/observaciones",
                institucion, supervisor ? Supervisor : Documento, supervisor ? "Supervisor" : "Usuario");
            Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
            return supervisor ? (await respuesta.Content.ReadFromJsonAsync<ExpedienteRevisionDto>())!.Observaciones
                : (await respuesta.Content.ReadFromJsonAsync<List<ObservacionDto>>())!;
        }
        async Task CorregirYEnviarAsync(int ronda)
        {
            var guardar = await EnviarAsync(HttpMethod.Put, "/api/mis-datos/hoja-de-vida/ficha", institucion, Documento,
                cuerpo: ficha with { CallePrincipal = $"Calle Ficticia corregida {ronda}" });
            Assert.Equal(HttpStatusCode.OK, guardar.StatusCode);
            Assert.Equal(ronda, (await HistorialAsync()).Count);
            var enviar = await EnviarAsync(HttpMethod.Post, "/api/mis-datos/enviar", institucion, Documento);
            Assert.True(enviar.StatusCode == HttpStatusCode.OK, await enviar.Content.ReadAsStringAsync());
        }

        for (var ronda = 1; ronda <= 2; ronda++)
        {
            var devolver = await EnviarAsync(HttpMethod.Post, $"/api/revision/{Documento}/devolver", institucion, Supervisor, "Supervisor",
                new DevolverActualizacionRequest($"Indicación general ficticia de ronda {ronda}", [
                    new("campo", "datos_personales", $"Corrección ficticia de ficha {ronda}"),
                    new("item", $"titulo:{tituloId}", $"Corrección ficticia de título {ronda}")
                ]));
            Assert.Equal(HttpStatusCode.OK, devolver.StatusCode);
            var antes = await HistorialAsync();
            var paraSupervisor = await HistorialAsync(supervisor: true);
            Assert.Equal(ronda, antes.Count);
            Assert.Equal(antes.Select(o => o.Id), paraSupervisor.Select(o => o.Id));
            await CorregirYEnviarAsync(ronda);
            var despues = await HistorialAsync();
            var despuesSupervisor = await HistorialAsync(supervisor: true);
            foreach (var original in antes)
            {
                foreach (var actual in new[] { despues.Single(o => o.Id == original.Id), despuesSupervisor.Single(o => o.Id == original.Id) })
                {
                    Assert.Equal(original.Ronda, actual.Ronda);
                    Assert.Equal(Supervisor, actual.Autor);
                    Assert.Equal(original.FechaUtc, actual.FechaUtc);
                    Assert.Equal(original.Texto, actual.Texto);
                    Assert.Equal(2, actual.Marcas.Count);
                    Assert.Equal(original.Marcas.OrderBy(m => m.Id), actual.Marcas.OrderBy(m => m.Id));
                }
            }
        }
        var aprobar = await EnviarAsync(HttpMethod.Post, $"/api/revision/{Documento}/aprobar", institucion, Supervisor, "Supervisor");
        Assert.Equal(HttpStatusCode.OK, aprobar.StatusCode);
        Assert.Equal(2, (await HistorialAsync()).Count);
        Assert.Equal(4, (await HistorialAsync(supervisor: true)).Sum(o => o.Marcas.Count));
    }
}
