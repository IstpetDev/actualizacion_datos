namespace Istpet.ActualizacionDatos.WebApi.Tests.Integracion;

using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Multitenancy;
using Istpet.ActualizacionDatos.Infrastructure.Servicios;
using Microsoft.EntityFrameworkCore;
using Npgsql;

public sealed partial class ConfiguracionHojaDeVidaIntegracionTests
{
    [Fact]
    public async Task PostgreSQL_subindices_seccion_unicidad_parcial_nulls_not_distinct_y_fk_items()
    {
        var inst = InstitucionId.Nuevo();
        var personaId = Guid.NewGuid();
        await using (var db = CrearContexto(inst))
        {
            db.Instituciones.Add(new Institucion(inst, "Institución ficticia subíndices"));
            db.Personas.Add(new Persona(personaId, inst, "0000099101", RolUsuario.Usuario, "Docente Ficticio", accesoHabilitado: true));
            await db.SaveChangesAsync();
        }

        Guid subindiceId;
        await using (var db = CrearContexto(inst))
        {
            var servicio = new ServicioConfiguracionHojaDeVida(db, new ContextoInstitucion(inst));
            var creado = await servicio.CrearSubindiceSeccionAsync(
                new GuardarSubindiceSeccionRequest("experiencia", "Títulos 3er Nivel", "Respaldo de tercer nivel"));
            subindiceId = creado.Id;
        }

        // Índice único parcial con NULLS NOT DISTINCT rechaza duplicado activo directo en PostgreSQL
        await using (var duplicado = CrearContexto(inst))
        {
            duplicado.SubindicesSeccion.Add(new SubindiceSeccion(
                Guid.NewGuid(),
                inst,
                SeccionHojaDeVida.ExperienciaLaboral,
                "Títulos 3er Nivel"));
            var error = await Assert.ThrowsAsync<DbUpdateException>(() => duplicado.SaveChangesAsync());
            Assert.Equal(PostgresErrorCodes.UniqueViolation, Assert.IsType<PostgresException>(error.InnerException).SqlState);
        }

        // Asociar ítem real de experiencia al subíndice y verificar que al desactivar se permite crear otro activo con igual nombre
        await using (var db = CrearContexto(inst))
        {
            var exp = new ExperienciaLaboral(
                Guid.NewGuid(),
                inst,
                personaId,
                new DatosExperienciaLaboral("Instituto Ficticio", "Docente", new DateOnly(2024, 1, 1), TrabajaActualmente: true));
            exp.AsociarSubindice(subindiceId);
            db.ExperienciasLaborales.Add(exp);
            await db.SaveChangesAsync();

            var servicio = new ServicioConfiguracionHojaDeVida(db, new ContextoInstitucion(inst));
            await servicio.EliminarSubindiceSeccionAsync(subindiceId);

            var recreado = await servicio.CrearSubindiceSeccionAsync(
                new GuardarSubindiceSeccionRequest("experiencia", "Títulos 3er Nivel", "Nueva versión activa"));
            Assert.NotEqual(subindiceId, recreado.Id);
            Assert.True(recreado.Activo);
        }

        await using var verificacion = CrearContexto(inst);
        var persistida = await verificacion.ExperienciasLaborales.SingleAsync(e => e.PersonaId == personaId);
        Assert.Equal(subindiceId, persistida.SubindiceSeccionId);
    }
}
