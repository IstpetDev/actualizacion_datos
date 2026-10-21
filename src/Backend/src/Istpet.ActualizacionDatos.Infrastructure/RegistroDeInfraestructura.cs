namespace Istpet.ActualizacionDatos.Infrastructure;

using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Infrastructure.Multitenancy;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

public static class RegistroDeInfraestructura
{
    public static IServiceCollection AgregarInfraestructura(
        this IServiceCollection servicios,
        IConfiguration configuracion)
    {
        servicios.AddScoped<ContextoInstitucion>();
        servicios.AddScoped<IContextoInstitucion>(sp => sp.GetRequiredService<ContextoInstitucion>());

        var connectionString = configuracion.GetConnectionString("Default");

        servicios.AddDbContext<AplicacionDbContext>((sp, options) =>
        {
            options.UseSnakeCaseNamingConvention();

            if (!string.IsNullOrWhiteSpace(connectionString))
            {
                options.UseNpgsql(connectionString);
            }
        });

        return servicios;
    }
}
