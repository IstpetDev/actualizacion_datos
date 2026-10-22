namespace Istpet.ActualizacionDatos.Domain.HojaDeVida;

public sealed record DatosTituloEnCurso(
    string NombrePrograma,
    int GradoAcademicoId,
    int? UniversidadId = null,
    string? NombreInstitucionOtra = null,
    int? CampoDetalladoUnescoId = null,
    DateOnly? FechaInicio = null,
    DateOnly? FechaFinEstimada = null,
    bool TieneBeca = false,
    int? TipoBecaId = null,
    int? FinanciamientoBecaId = null,
    int? PorcentajeBeca = null,
    decimal? MontoBeca = null);

// Estudios en curso. Equivale a `titulos_en_curso` del sistema de origen.
// El archivo de respaldo es, por ejemplo, el certificado de matrícula.
public class TituloEnCurso : RegistroHojaDeVida
{
    public string NombrePrograma { get; private set; }
    public int GradoAcademicoId { get; private set; }
    public int? UniversidadId { get; private set; }
    public string? NombreInstitucionOtra { get; private set; }
    public int? CampoDetalladoUnescoId { get; private set; }
    public DateOnly? FechaInicio { get; private set; }
    public DateOnly? FechaFinEstimada { get; private set; }
    public bool TieneBeca { get; private set; }
    public int? TipoBecaId { get; private set; }
    public int? FinanciamientoBecaId { get; private set; }
    public int? PorcentajeBeca { get; private set; }
    public decimal? MontoBeca { get; private set; }

    private TituloEnCurso()
    {
        NombrePrograma = null!;
    }

    public TituloEnCurso(Guid id, InstitucionId institucionId, Guid personaId, DatosTituloEnCurso datos, DateTime? fechaUtc = null)
        : base(id, institucionId, personaId, fechaUtc)
    {
        NombrePrograma = null!;
        Aplicar(datos);
    }

    public void Actualizar(DatosTituloEnCurso datos, DateTime? fechaUtc = null)
    {
        Aplicar(datos);
        MarcarActualizado(fechaUtc);
    }

    private void Aplicar(DatosTituloEnCurso datos)
    {
        ArgumentNullException.ThrowIfNull(datos);

        if (datos.UniversidadId is null && string.IsNullOrWhiteSpace(datos.NombreInstitucionOtra))
        {
            throw new ReglaNegocioException("Indique la universidad o el nombre de la institución donde cursa el programa.");
        }

        ValidarRangoFechas(datos.FechaInicio, datos.FechaFinEstimada);

        if (datos.PorcentajeBeca is < 0 or > 100)
        {
            throw new ReglaNegocioException("El porcentaje de beca debe estar entre 0 y 100.");
        }

        if (datos.MontoBeca is < 0)
        {
            throw new ReglaNegocioException("El monto de la beca no puede ser negativo.");
        }

        NombrePrograma = Obligatorio(datos.NombrePrograma, "nombre del programa");
        GradoAcademicoId = datos.GradoAcademicoId;
        UniversidadId = datos.UniversidadId;
        NombreInstitucionOtra = datos.UniversidadId is null ? Limpiar(datos.NombreInstitucionOtra) : null;
        CampoDetalladoUnescoId = datos.CampoDetalladoUnescoId;
        FechaInicio = datos.FechaInicio;
        FechaFinEstimada = datos.FechaFinEstimada;

        // Sin beca no se guardan datos de beca, para no dejar valores huérfanos.
        TieneBeca = datos.TieneBeca;
        TipoBecaId = datos.TieneBeca ? datos.TipoBecaId : null;
        FinanciamientoBecaId = datos.TieneBeca ? datos.FinanciamientoBecaId : null;
        PorcentajeBeca = datos.TieneBeca ? datos.PorcentajeBeca : null;
        MontoBeca = datos.TieneBeca ? datos.MontoBeca : null;
    }
}
