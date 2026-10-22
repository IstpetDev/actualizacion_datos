namespace Istpet.ActualizacionDatos.Domain.HojaDeVida;

public enum TipoParticipacionCapacitacion
{
    Asistente = 1,
    Aprobado = 2,
    Facilitador = 3
}

public sealed record DatosCapacitacion(
    string NombreEvento,
    string InstitucionOrganizadora,
    int? TipoCapacitacionId = null,
    TipoParticipacionCapacitacion TipoParticipacion = TipoParticipacionCapacitacion.Asistente,
    DateOnly? FechaInicio = null,
    DateOnly? FechaFin = null,
    int? NumeroHoras = null,
    string? Lugar = null,
    bool FinanciadaPorInstitucion = false);

// Capacitación, curso, seminario o congreso. Equivale a `cursos_profesores` del
// sistema de origen (no a `cursos`, que allí son los niveles de una carrera).
public class Capacitacion : RegistroHojaDeVida
{
    public string NombreEvento { get; private set; }
    public string InstitucionOrganizadora { get; private set; }
    public int? TipoCapacitacionId { get; private set; }
    public TipoParticipacionCapacitacion TipoParticipacion { get; private set; }
    public DateOnly? FechaInicio { get; private set; }
    public DateOnly? FechaFin { get; private set; }
    public int? NumeroHoras { get; private set; }
    public string? Lugar { get; private set; }
    public bool FinanciadaPorInstitucion { get; private set; }

    private Capacitacion()
    {
        NombreEvento = null!;
        InstitucionOrganizadora = null!;
    }

    public Capacitacion(Guid id, InstitucionId institucionId, Guid personaId, DatosCapacitacion datos, DateTime? fechaUtc = null)
        : base(id, institucionId, personaId, fechaUtc)
    {
        NombreEvento = null!;
        InstitucionOrganizadora = null!;
        Aplicar(datos);
    }

    public void Actualizar(DatosCapacitacion datos, DateTime? fechaUtc = null)
    {
        Aplicar(datos);
        MarcarActualizado(fechaUtc);
    }

    private void Aplicar(DatosCapacitacion datos)
    {
        ArgumentNullException.ThrowIfNull(datos);
        ValidarRangoFechas(datos.FechaInicio, datos.FechaFin);

        if (datos.NumeroHoras is <= 0)
        {
            throw new ReglaNegocioException("El número de horas debe ser mayor a cero.");
        }

        NombreEvento = Obligatorio(datos.NombreEvento, "nombre del evento");
        InstitucionOrganizadora = Obligatorio(datos.InstitucionOrganizadora, "institución organizadora");
        TipoCapacitacionId = datos.TipoCapacitacionId;
        TipoParticipacion = datos.TipoParticipacion;
        FechaInicio = datos.FechaInicio;
        FechaFin = datos.FechaFin;
        NumeroHoras = datos.NumeroHoras;
        Lugar = Limpiar(datos.Lugar);
        FinanciadaPorInstitucion = datos.FinanciadaPorInstitucion;
    }
}
