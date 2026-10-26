namespace Istpet.ActualizacionDatos.Domain.HojaDeVida;

public sealed record DatosExperienciaLaboral(
    string Empleador,
    string Cargo,
    DateOnly FechaInicio,
    DateOnly? FechaFin = null,
    bool TrabajaActualmente = false,
    string? Ciudad = null,
    int? PaisId = null,
    string? Funciones = null);

// Experiencia laboral. Equivale a `certificados_experiencia_laboral` del sistema de
// origen; el certificado que allí se guardaba como ruta es aquí el archivo de respaldo.
public class ExperienciaLaboral : RegistroHojaDeVida
{
    public string Empleador { get; private set; }
    public string Cargo { get; private set; }
    public DateOnly FechaInicio { get; private set; }
    public DateOnly? FechaFin { get; private set; }
    public bool TrabajaActualmente { get; private set; }
    public string? Ciudad { get; private set; }
    public int? PaisId { get; private set; }
    public string? Funciones { get; private set; }

    private ExperienciaLaboral()
    {
        Empleador = null!;
        Cargo = null!;
    }

    public ExperienciaLaboral(Guid id, InstitucionId institucionId, Guid personaId, DatosExperienciaLaboral datos, DateTime? fechaUtc = null)
        : base(id, institucionId, personaId, fechaUtc)
    {
        Empleador = null!;
        Cargo = null!;
        Aplicar(datos);
    }

    public void Actualizar(DatosExperienciaLaboral datos, DateTime? fechaUtc = null)
    {
        Aplicar(datos);
        MarcarActualizado(fechaUtc);
    }

    private void Aplicar(DatosExperienciaLaboral datos)
    {
        ArgumentNullException.ThrowIfNull(datos);

        if (datos.TrabajaActualmente && datos.FechaFin is not null)
        {
            throw new ReglaNegocioException("Si trabaja actualmente en este lugar, no indique fecha de fin.");
        }

        if (!datos.TrabajaActualmente && datos.FechaFin is null)
        {
            throw new ReglaNegocioException("Indique la fecha de fin o marque que trabaja actualmente en este lugar.");
        }

        ValidarRangoFechas(datos.FechaInicio, datos.FechaFin);

        Empleador = Obligatorio(datos.Empleador, "empleador");
        Cargo = Obligatorio(datos.Cargo, "cargo");
        FechaInicio = datos.FechaInicio;
        FechaFin = datos.FechaFin;
        TrabajaActualmente = datos.TrabajaActualmente;
        Ciudad = Limpiar(datos.Ciudad);
        PaisId = datos.PaisId;
        Funciones = Limpiar(datos.Funciones);
    }
}
