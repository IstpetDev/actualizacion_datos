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
public sealed partial class ConfiguracionHojaDeVidaIntegracionTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _contenedor = new PostgreSqlBuilder("postgres:17-alpine").Build();

    private AplicacionDbContext CrearContexto(InstitucionId institucion) => new(
        new DbContextOptionsBuilder<AplicacionDbContext>()
            .UseNpgsql(_contenedor.GetConnectionString()).UseSnakeCaseNamingConvention().Options,
        new ContextoInstitucion(institucion));

    public async Task InitializeAsync()
    {
        await _contenedor.StartAsync();
        await using var db = CrearContexto(InstitucionId.Nuevo());
        await db.Database.MigrateAsync();
    }

    public async Task DisposeAsync() => await _contenedor.DisposeAsync();

    [Fact]
    public async Task PostgreSQL_preserva_unicidad_concurrente_y_requisito_para_todos_por_institucion()
    {
        var institucion = InstitucionId.Nuevo();
        var otra = InstitucionId.Nuevo();
        await using (var db = CrearContexto(institucion))
        {
            db.Instituciones.AddRange(new Institucion(institucion, "Institución ficticia A"), new Institucion(otra, "Institución ficticia B"));
            await db.SaveChangesAsync();
        }

        async Task<bool> CrearTipoAsync()
        {
            await using var db = CrearContexto(institucion);
            var servicio = new ServicioConfiguracionHojaDeVida(db, new ContextoInstitucion(institucion));
            try
            {
                await servicio.CrearTipoDocumentoAsync(new GuardarTipoDocumentoRequest("CEDULA", "Documento ficticio"));
                return true;
            }
            catch (ReglaNegocioException)
            {
                return false;
            }
        }
        Assert.Single(await Task.WhenAll(CrearTipoAsync(), CrearTipoAsync(), CrearTipoAsync()), creado => creado);

        await using var consulta = CrearContexto(institucion);
        var configuracion = new ServicioConfiguracionHojaDeVida(consulta, new ContextoInstitucion(institucion));
        var documento = Assert.Single(await configuracion.ListarTiposDocumentoAsync());
        await configuracion.CrearRequisitoAsync(new GuardarRequisitoDocumentoRequest(documento.Id));
        // Se salta la comprobación previa del servicio para verificar NULLS NOT DISTINCT en la base real.
        await using (var duplicado = CrearContexto(institucion))
        {
            duplicado.RequisitosDocumento.Add(new RequisitoDocumento(Guid.NewGuid(), institucion, documento.Id));
            var error = await Assert.ThrowsAsync<DbUpdateException>(() => duplicado.SaveChangesAsync());
            Assert.Equal(PostgresErrorCodes.UniqueViolation, Assert.IsType<PostgresException>(error.InnerException).SqlState);
        }
        await using var dbOtra = CrearContexto(otra);
        var servicioOtra = new ServicioConfiguracionHojaDeVida(dbOtra, new ContextoInstitucion(otra));
        Assert.Empty(await servicioOtra.ListarTiposDocumentoAsync());
        Assert.Empty(await servicioOtra.ListarRequisitosAsync());
        var docOtra = await servicioOtra.CrearTipoDocumentoAsync(new GuardarTipoDocumentoRequest("CEDULA", "Documento ficticio B"));
        await servicioOtra.CrearRequisitoAsync(new GuardarRequisitoDocumentoRequest(docOtra.Id));
        Assert.Single(await servicioOtra.ListarRequisitosAsync());
    }
}
