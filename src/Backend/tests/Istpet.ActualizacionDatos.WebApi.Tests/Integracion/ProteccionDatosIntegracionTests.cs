namespace Istpet.ActualizacionDatos.WebApi.Tests.Integracion;

using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Infrastructure.Multitenancy;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Istpet.ActualizacionDatos.Infrastructure.Servicios;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;
using Testcontainers.PostgreSql;

[Trait("Categoria", "Integracion")]
public sealed class ProteccionDatosIntegracionTests
{
    [Fact]
    public async Task PostgreSQL_migra_legado_aisla_evidencia_y_serializa_aceptaciones_y_publicacion()
    {
        await using var contenedor = new PostgreSqlBuilder("postgres:17-alpine").Build();
        await contenedor.StartAsync();
        var opciones = new DbContextOptionsBuilder<AplicacionDbContext>()
            .UseNpgsql(contenedor.GetConnectionString()).UseSnakeCaseNamingConvention().Options;
        var contexto = new ContextoInstitucion(esSuperadmin: true);
        var reloj = new RelojProteccionDatosPrueba();
        await using var db = new AplicacionDbContext(opciones, contexto);
        await db.GetService<IMigrator>().MigrateAsync("20261026213124_ConfigurarDominiosCorreoInstitucional");
        var institucionA = InstitucionId.Nuevo();
        var institucionB = InstitucionId.Nuevo();
        db.Instituciones.AddRange(new Institucion(institucionA, "Institución Ficticia A"), new Institucion(institucionB, "Institución Ficticia B"));
        var persona = new Persona(Guid.NewGuid(), institucionA, "0000000000", accesoHabilitado: true,
            debeCambiarContrasena: false, tratamientoDatosAceptado: true,
            fechaAceptacionTratamientoDatosUtc: reloj.Ahora.UtcDateTime.AddYears(-1));
        db.Personas.Add(persona);
        await db.SaveChangesAsync();
        await db.Database.MigrateAsync();
        var servicio = new ServicioProteccionDatos(db, reloj);
        Assert.False((await servicio.ObtenerEstadoAsync(persona.Id, institucionA, persona.Rol)).Aceptado);
        Assert.Empty(await db.AceptacionesProteccionDatos.ToListAsync());
        Assert.True((await db.Personas.SingleAsync()).TratamientoDatosAceptado);

        PublicarAvisoRequest Solicitud(string version) => new(institucionA.Valor, version, "Aviso Ficticio",
            "Institución Ficticia", "CONTENIDO FICTICIO EXCLUSIVO DE PRUEBAS", "Confirmación ficticia",
            "https://institucion.ejemplo.test/avisos", "Acta ficticia", Enum.GetValues<RolUsuario>(),
            reloj.Ahora.UtcDateTime.AddMinutes(-1), null, true);
        await servicio.PublicarAsync(Solicitud("ficticia-1"));
        var avisoId = (await servicio.ObtenerEstadoAsync(persona.Id, institucionA, persona.Rol)).Aviso!.Id;

        async Task<EstadoProteccionDatosDto> AceptarEnContextoSeparado()
        {
            await using var independiente = new AplicacionDbContext(opciones, new ContextoInstitucion(institucionA));
            return await new ServicioProteccionDatos(independiente, reloj).AceptarAsync(persona.Id, institucionA,
                persona.Rol, new(avisoId, true));
        }
        var aceptaciones = await Task.WhenAll(AceptarEnContextoSeparado(), AceptarEnContextoSeparado(), AceptarEnContextoSeparado());
        Assert.All(aceptaciones, a => Assert.True(a.Aceptado));
        Assert.Single(aceptaciones.Select(a => a.FechaAceptacionUtc).Distinct());
        Assert.Equal(1, await db.AceptacionesProteccionDatos.CountAsync());
        Assert.Equal(DateTimeKind.Utc, (await db.AceptacionesProteccionDatos.SingleAsync()).FechaUtc.Kind);

        await using (var ajeno = new AplicacionDbContext(opciones, contexto))
        {
            ajeno.AceptacionesProteccionDatos.Add(new(institucionB, persona.Id, avisoId, reloj.Ahora.UtcDateTime));
            var error = await Assert.ThrowsAsync<DbUpdateException>(() => ajeno.SaveChangesAsync());
            Assert.Equal(PostgresErrorCodes.ForeignKeyViolation, ((PostgresException)error.InnerException!).SqlState);
        }
        await using (var duplicado = new AplicacionDbContext(opciones, contexto))
        {
            duplicado.AceptacionesProteccionDatos.Add(new(institucionA, persona.Id, avisoId, reloj.Ahora.UtcDateTime));
            var error = await Assert.ThrowsAsync<DbUpdateException>(() => duplicado.SaveChangesAsync());
            Assert.Equal(PostgresErrorCodes.UniqueViolation, ((PostgresException)error.InnerException!).SqlState);
        }
        await using (var aislado = new AplicacionDbContext(opciones, new ContextoInstitucion(institucionB)))
        {
            Assert.Empty(await aislado.AceptacionesProteccionDatos.ToListAsync());
            Assert.Empty(await aislado.AvisosProteccionDatos.ToListAsync());
        }
        await Assert.ThrowsAsync<ReglaNegocioException>(() => servicio.PublicarAsync(Solicitud("ficticia-1")));
        await Assert.ThrowsAsync<ArgumentException>(() => servicio.PublicarAsync(Solicitud("sin-autorizacion") with { AprobacionInstitucionalConfirmada = false }));

        reloj.Ahora = reloj.Ahora.AddHours(1);
        await servicio.PublicarAsync(Solicitud("ficticia-2"));
        Assert.False((await servicio.ObtenerEstadoAsync(persona.Id, institucionA, persona.Rol)).Aceptado);
        await Assert.ThrowsAsync<ProteccionDatosException>(AceptarEnContextoSeparado);
        Assert.Equal(2, await db.AvisosProteccionDatos.CountAsync());
        Assert.Equal(1, await db.AceptacionesProteccionDatos.CountAsync());

        var aviso = await db.AvisosProteccionDatos.SingleAsync(a => a.Id == avisoId);
        db.Entry(aviso).Property(a => a.Contenido).CurrentValue = "Intento ficticio de sobrescritura";
        await Assert.ThrowsAsync<InvalidOperationException>(() => db.SaveChangesAsync());
        db.ChangeTracker.Clear();
        db.AceptacionesProteccionDatos.Remove(await db.AceptacionesProteccionDatos.SingleAsync());
        await Assert.ThrowsAsync<InvalidOperationException>(() => db.SaveChangesAsync());
    }
}
