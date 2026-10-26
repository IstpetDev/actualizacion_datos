namespace Istpet.ActualizacionDatos.Infrastructure.Persistence;

using Istpet.ActualizacionDatos.Infrastructure.Multitenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

public class AplicacionDbContextFactory : IDesignTimeDbContextFactory<AplicacionDbContext>
{
    public AplicacionDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<AplicacionDbContext>();
        optionsBuilder.UseNpgsql("Host=localhost;Database=actualizacion_datos_diseno");
        optionsBuilder.UseSnakeCaseNamingConvention();

        return new AplicacionDbContext(
            optionsBuilder.Options,
            new ContextoInstitucion(null, esSuperadmin: true));
    }
}
