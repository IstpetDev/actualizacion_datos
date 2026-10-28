namespace Istpet.ActualizacionDatos.Application.Servicios;

using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;

public static class CodigosSeccion
{
    public const string Ficha = "ficha";
    public const string Formacion = "formacion";
    public const string Capacitaciones = "capacitaciones";
    public const string Experiencia = "experiencia";
    public const string Referencias = "referencias";
    public const string Documentos = "documentos";
    public const string CuentaBancaria = "cuenta-bancaria";

    public static readonly IReadOnlyList<SeccionHojaDeVida> Todas =
    [
        SeccionHojaDeVida.FichaPersonal,
        SeccionHojaDeVida.FormacionAcademica,
        SeccionHojaDeVida.Capacitaciones,
        SeccionHojaDeVida.ExperienciaLaboral,
        SeccionHojaDeVida.Referencias,
        SeccionHojaDeVida.DocumentosPersonales,
        SeccionHojaDeVida.CuentaBancaria
    ];

    public static string ObtenerCodigo(SeccionHojaDeVida seccion) => seccion switch
    {
        SeccionHojaDeVida.FichaPersonal => Ficha,
        SeccionHojaDeVida.FormacionAcademica => Formacion,
        SeccionHojaDeVida.Capacitaciones => Capacitaciones,
        SeccionHojaDeVida.ExperienciaLaboral => Experiencia,
        SeccionHojaDeVida.Referencias => Referencias,
        SeccionHojaDeVida.DocumentosPersonales => Documentos,
        SeccionHojaDeVida.CuentaBancaria => CuentaBancaria,
        _ => seccion.ToString().ToLowerInvariant()
    };

    public static string ObtenerNombre(SeccionHojaDeVida seccion) => seccion switch
    {
        SeccionHojaDeVida.FichaPersonal => "Ficha personal",
        SeccionHojaDeVida.FormacionAcademica => "Formación académica",
        SeccionHojaDeVida.Capacitaciones => "Capacitaciones",
        SeccionHojaDeVida.ExperienciaLaboral => "Experiencia laboral",
        SeccionHojaDeVida.Referencias => "Referencias",
        SeccionHojaDeVida.DocumentosPersonales => "Documentos personales",
        SeccionHojaDeVida.CuentaBancaria => "Cuenta bancaria",
        _ => seccion.ToString()
    };

    public static bool IntentarParsear(string? codigo, out SeccionHojaDeVida seccion)
    {
        seccion = default;
        if (string.IsNullOrWhiteSpace(codigo)) return false;

        var normalizado = codigo.Trim().ToLowerInvariant();
        switch (normalizado)
        {
            case Ficha:
            case "fichapersonal":
            case "ficha-personal":
                seccion = SeccionHojaDeVida.FichaPersonal;
                return true;
            case Formacion:
            case "formacionacademica":
            case "formacion-academica":
            case "titulos":
            case "titulos-en-curso":
                seccion = SeccionHojaDeVida.FormacionAcademica;
                return true;
            case Capacitaciones:
            case "capacitacion":
                seccion = SeccionHojaDeVida.Capacitaciones;
                return true;
            case Experiencia:
            case "experiencialaboral":
            case "experiencia-laboral":
            case "experiencias":
                seccion = SeccionHojaDeVida.ExperienciaLaboral;
                return true;
            case Referencias:
            case "referencia":
                seccion = SeccionHojaDeVida.Referencias;
                return true;
            case Documentos:
            case "documentospersonales":
            case "documentos-personales":
            case "documento":
                seccion = SeccionHojaDeVida.DocumentosPersonales;
                return true;
            case CuentaBancaria:
            case "cuentabancaria":
            case "cuenta_bancaria":
            case "cuenta":
                seccion = SeccionHojaDeVida.CuentaBancaria;
                return true;
            default:
                return false;
        }
    }
}

public interface IServicioSecciones
{
    Task<bool> EstaAbiertaAsync(InstitucionId institucionId, SeccionHojaDeVida seccion, CancellationToken ct = default);
    Task<IReadOnlySet<SeccionHojaDeVida>> ObtenerSeccionesAbiertasAsync(InstitucionId institucionId, CancellationToken ct = default);
    Task<List<SeccionConfiguracionDto>> ListarConfiguracionAsync(CancellationToken ct = default);
    Task<SeccionConfiguracionDto> CambiarEstadoAsync(string codigo, bool habilitada, CancellationToken ct = default);
}
