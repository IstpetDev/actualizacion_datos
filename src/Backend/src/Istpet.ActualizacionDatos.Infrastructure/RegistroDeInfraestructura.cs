namespace Istpet.ActualizacionDatos.Infrastructure;

using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Infrastructure.Multitenancy;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Istpet.ActualizacionDatos.Infrastructure.Servicios;
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

        servicios.AddScoped<IServicioInstituciones, ServicioInstituciones>();
        servicios.AddScoped<IServicioPersonas, ServicioPersonas>();
        servicios.AddScoped<IServicioCampanas, ServicioCampanas>();
        servicios.AddScoped<IEnviadorCorreo, EnviadorCorreoLog>();
        servicios.AddScoped<IServicioAutenticacion, ServicioAutenticacion>();

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
