namespace Istpet.ActualizacionDatos.WebApi.Tests.Integracion;

using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Multitenancy;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Istpet.ActualizacionDatos.Infrastructure.Servicios;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using Testcontainers.PostgreSql;

[Trait("Categoria", "Integracion")]
public sealed class PersonalInstitucionalIntegracionTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _contenedor = new PostgreSqlBuilder("postgres:17-alpine").Build();
    private readonly InstitucionId _a = InstitucionId.Nuevo();
    private readonly InstitucionId _b = InstitucionId.Nuevo();
    private readonly Guid _personaId = Guid.NewGuid();
    private readonly ContextoInstitucion _global = new(esSuperadmin: true, actorActual: "superadmin-ficticio", rolActual: RolUsuario.Superadmin);
    private ContextoInstitucion Admin => new(_a, actorActual: "admin-ficticio", rolActual: RolUsuario.Admin);

    private AplicacionDbContext CrearContexto(ContextoInstitucion contexto) => new(
        new DbContextOptionsBuilder<AplicacionDbContext>().UseNpgsql(_contenedor.GetConnectionString())
            .UseSnakeCaseNamingConvention().Options, contexto);

    public async Task InitializeAsync()
    {
        await _contenedor.StartAsync();
        await using var db = CrearContexto(_global);
        await db.Database.MigrateAsync();
        db.Instituciones.AddRange(new Institucion(_a, "Institución Ficticia A"), new Institucion(_b, "Institución Ficticia B"));
        db.Personas.AddRange(
            new Persona(_personaId, _a, "0000000000", nombre: "Persona Ficticia", correo: "persona@ejemplo.test",
                passwordHash: "hash-ficticio", debeCambiarContrasena: false, correoVerificado: true),
            new Persona(Guid.NewGuid(), _b, "0000000000", nombre: "Persona Ficticia B"));
        var ficha = new FichaPersonal(_a, _personaId);
        ficha.Actualizar(new DatosFichaPersonal(CallePrincipal: "Calle Ficticia"));
        db.FichasPersonales.Add(ficha);
        await db.SaveChangesAsync();
    }

    public async Task DisposeAsync() => await _contenedor.DisposeAsync();

    [Fact]
    public async Task PostgreSQL_persiste_roles_y_auditoria_con_identidad_estable_y_aislamiento()
    {
        await using (var db = CrearContexto(_global))
        {
            var servicio = new ServicioInstituciones(db, _global);
            var asignada = Assert.Single(await servicio.AsignarAdminsAsync(_a.Valor, new AsignarAdminsRequest([new AdminInicialRequest("0000000000")])));
            Assert.Equal(_personaId, asignada.Id);
            Assert.Equal("Admin", asignada.Rol);
            await servicio.AsignarPersonalAsync(_a.Valor, new("0000000000", "Supervisor"));
            var nueva = await servicio.AsignarPersonalAsync(_b.Valor, new("0000000002", "Admin", "Admin Ficticio"));
            Assert.Equal(_b.Valor, nueva.InstitucionId);
        }
        await using (var db = CrearContexto(Admin))
        {
            var servicio = new ServicioInstituciones(db, Admin);
            var asignada = await servicio.AsignarPersonalAsync(_a.Valor, new("0000000000", "Supervisor"));
            Assert.Equal(_personaId, asignada.Id);
            Assert.Single(await servicio.ListarPersonalAsync(_a.Valor));
            await Assert.ThrowsAsync<ReglaNegocioException>(() => servicio.AsignarPersonalAsync(_b.Valor, new("0000000000", "Supervisor")));
            await Assert.ThrowsAsync<ReglaNegocioException>(() => servicio.ListarPersonalAsync(_b.Valor));
        }
        await using var consulta = CrearContexto(_global);
        var persona = await consulta.Personas.SingleAsync(p => p.Id == _personaId);
        Assert.Equal(RolUsuario.Supervisor, persona.Rol);
        Assert.True(persona.AccesoHabilitado);
        Assert.Equal("Persona Ficticia", persona.Nombre);
        Assert.Equal("persona@ejemplo.test", persona.Correo);
        Assert.Equal("hash-ficticio", persona.PasswordHash);
        Assert.True(persona.CorreoVerificado);
        Assert.False(persona.DebeCambiarContrasena);
        Assert.Equal(RolUsuario.Usuario, (await consulta.Personas.SingleAsync(p => p.InstitucionId == _b && p.Documento == "0000000000")).Rol);
        Assert.Equal("Calle Ficticia", (await consulta.FichasPersonales.SingleAsync()).CallePrincipal);
        Assert.Equal(3, await consulta.Personas.CountAsync());
        var auditoria = await consulta.Auditorias.SingleAsync(a => a.Actor == "admin-ficticio" && a.Accion == "ASIGNAR_PERSONAL_INSTITUCIONAL");
        Assert.Equal(_a, auditoria.InstitucionId);
        Assert.Contains(_personaId.ToString(), auditoria.Detalle);
        Assert.DoesNotContain("persona@ejemplo.test", auditoria.Detalle);
        Assert.DoesNotContain("0000000000", auditoria.Detalle);
    }

    [Fact]
    public async Task PostgreSQL_fallo_real_de_auditoria_revierte_promocion_y_alta()
    {
        await using (var db = CrearContexto(_global))
            await db.Database.ExecuteSqlRawAsync("ALTER TABLE auditorias ADD CONSTRAINT fallo_roles_ficticio CHECK (accion <> 'ASIGNAR_PERSONAL_INSTITUCIONAL')");
        foreach (var documento in new[] { "0000000000", "0000000003" })
        {
            await using var db = CrearContexto(Admin);
            await Assert.ThrowsAsync<DbUpdateException>(() => new ServicioInstituciones(db, Admin)
                .AsignarPersonalAsync(_a.Valor, new(documento, "Supervisor")));
        }
        await using var consulta = CrearContexto(_global);
        var persona = await consulta.Personas.SingleAsync(p => p.Id == _personaId);
        Assert.Equal(RolUsuario.Usuario, persona.Rol);
        Assert.False(persona.AccesoHabilitado);
        Assert.False(await consulta.Personas.AnyAsync(p => p.Documento == "0000000003"));
        Assert.Empty(await consulta.Auditorias.ToListAsync());
    }

    [Fact]
    public async Task PostgreSQL_asignaciones_concurrentes_no_duplican_cuentas_y_auditan_cada_exito()
    {
        async Task<bool> AsignarAsync()
        {
            await using var db = CrearContexto(Admin);
            try
            {
                await new ServicioInstituciones(db, Admin).AsignarPersonalAsync(_a.Valor, new("0000000004", "Supervisor"));
                return true;
            }
            catch (DbUpdateException error)
            {
                Assert.Equal(PostgresErrorCodes.UniqueViolation, Assert.IsType<PostgresException>(error.InnerException).SqlState);
                return false;
            }
        }
        var resultados = await Task.WhenAll(AsignarAsync(), AsignarAsync(), AsignarAsync());
        Assert.Contains(true, resultados);
        await using var consulta = CrearContexto(_global);
        Assert.Equal(RolUsuario.Supervisor, (await consulta.Personas.SingleAsync(p => p.InstitucionId == _a && p.Documento == "0000000004")).Rol);
        Assert.Equal(resultados.Count(r => r), await consulta.Auditorias.CountAsync(a => a.Accion == "ASIGNAR_PERSONAL_INSTITUCIONAL"));
    }
}
