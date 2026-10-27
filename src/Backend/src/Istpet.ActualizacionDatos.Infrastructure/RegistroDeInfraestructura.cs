namespace Istpet.ActualizacionDatos.Infrastructure;

using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Documentos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Infrastructure.Documentos;
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
        servicios.AddSingleton(TimeProvider.System);
        servicios.AddScoped<ContextoInstitucion>();
        servicios.AddScoped<IContextoInstitucion>(sp => sp.GetRequiredService<ContextoInstitucion>());

        servicios.AddScoped<IServicioInstituciones, ServicioInstituciones>();
        servicios.AddScoped<IServicioPersonas, ServicioPersonas>();
        servicios.AddScoped<IServicioConfiguracionHojaDeVida, ServicioConfiguracionHojaDeVida>();
        servicios.AddScoped<IServicioCampanas, ServicioCampanas>();
        servicios.AddScoped<IEnviadorCorreo, EnviadorCorreoLog>();
        servicios.AddScoped<IServicioAutenticacion, ServicioAutenticacion>();
        servicios.AddScoped<IServicioProteccionDatos, ServicioProteccionDatos>();
        servicios.AddScoped<IServicioDatosUsuario, ServicioDatosUsuario>();
        servicios.AddScoped<IServicioRevision, ServicioRevision>();
        servicios.AddScoped<IServicioAuditoria, ServicioAuditoria>();
        servicios.AddScoped<IAlmacenArchivos, AlmacenArchivosDisco>();
        servicios.AddScoped<IServicioArchivos, ServicioArchivos>();
        servicios.AddScoped<IServicioCatalogos, ServicioCatalogos>();
        servicios.AddScoped<ValidadorCatalogos>();
        servicios.AddScoped<CargadorCatalogos>();
        servicios.AddScoped<IServicioExportacion, ServicioExportacion>();
        servicios.AddScoped<IServicioHojaDeVida, ServicioHojaDeVida>();
        servicios.AddScoped<IServicioSecciones, ServicioSecciones>();
        servicios.AddScoped<IServicioDocumentosPersonales, ServicioDocumentosPersonales>();
        servicios.AddScoped<IValidadorCompletitudEnvio, ValidadorCompletitudEnvio>();
        servicios.AddScoped<IReglaCompletitudEnvio, ReglaFichaPersonalObligatoria>();
        servicios.AddScoped<IReglaCompletitudEnvio, ReglaFormatosHojaDeVida>();
        servicios.AddScoped<IReglaCompletitudEnvio, ReglaFormacionAcademicaObligatoria>();
        servicios.AddScoped<IReglaCompletitudEnvio, ReglaReferenciasPersonalesObligatorias>();
        servicios.AddScoped<IReglaCompletitudEnvio, ReglaRespaldosItemsObligatorios>();
        servicios.AddScoped<IReglaCompletitudEnvio, ReglaDocumentosPersonalesObligatorios>();

        // ADR-0033: Motor nativo QuestPDF para generación de documentos de hoja de vida
        servicios.AddSingleton<IServicioGeneracionPdfHojaDeVida, GeneradorPdfHojaDeVida>();
        servicios.AddScoped<IArmadorDatosDocumento, ArmadorDatosDocumento>();
        servicios.AddScoped<IServicioDocumentoHojaDeVida, ServicioDocumentoHojaDeVida>();
        servicios.AddScoped<IServicioConfiguracionDocumento, ServicioConfiguracionDocumento>();
        servicios.AddScoped<IServicioPlantillasHojaDeVida, ServicioPlantillasHojaDeVida>();

        // ADR-0013: el protector guarda las claves en memoria durante toda la vida del proceso.
        servicios.AddSingleton<IProtectorCuentaBancaria, ProtectorCuentaBancariaAesGcm>();
        servicios.AddScoped<IServicioCuentaBancaria, ServicioCuentaBancaria>();
        servicios.AddScoped<IReglaCompletitudEnvio, ReglaCuentaBancariaObligatoria>();

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
