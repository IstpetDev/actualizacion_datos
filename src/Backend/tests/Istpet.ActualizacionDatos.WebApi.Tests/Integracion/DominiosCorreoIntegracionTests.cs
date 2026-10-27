namespace Istpet.ActualizacionDatos.WebApi.Tests.Integracion;

using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Infrastructure.Multitenancy;
using Istpet.ActualizacionDatos.Infrastructure.Servicios;

public sealed partial class ConfiguracionHojaDeVidaIntegracionTests
{
    [Fact]
    public async Task PostgreSQL_migracion_persiste_dominios_y_conserva_aislamiento()
    {
        var a = InstitucionId.Nuevo(); var b = InstitucionId.Nuevo();
        await using (var db = CrearContexto(a))
        {
            db.Instituciones.AddRange(new Institucion(a, "Institución ficticia A"), new Institucion(b, "Institución ficticia B"));
            await db.SaveChangesAsync();
            var servicio = new ServicioConfiguracionHojaDeVida(db, new ContextoInstitucion(a));
            await servicio.GuardarDominiosCorreoAsync(new GuardarDominiosCorreoRequest(["ficticia-a.example"]));
        }
        await using var consultaA = CrearContexto(a);
        await using var consultaB = CrearContexto(b);
        Assert.Equal(["ficticia-a.example"], (await new ServicioConfiguracionHojaDeVida(consultaA, new ContextoInstitucion(a)).ObtenerPoliticaValidacionAsync()).DominiosCorreoPermitidos);
        Assert.Empty((await new ServicioConfiguracionHojaDeVida(consultaB, new ContextoInstitucion(b)).ObtenerPoliticaValidacionAsync()).DominiosCorreoPermitidos);
    }
}
