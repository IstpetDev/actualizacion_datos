namespace Istpet.ActualizacionDatos.Domain.HojaDeVida;

public sealed record DatosTituloAcademico(
    string NombreTitulo,
    int GradoAcademicoId,
    int? UniversidadId = null,
    string? NombreInstitucionOtra = null,
    int? CampoDetalladoUnescoId = null,
    string? NumeroRegistroSenescyt = null,
    DateOnly? FechaObtencion = null,
    DateOnly? FechaRegistroSenescyt = null);

// Título obtenido. Equivale a `titulos_profesores` del sistema de origen.
// Si la institución que lo otorgó no está en el catálogo de universidades
// (p. ej. una del exterior), se escribe su nombre en NombreInstitucionOtra.
public class TituloAcademico : RegistroHojaDeVida
{
    public string NombreTitulo { get; private set; }
    public int GradoAcademicoId { get; private set; }
    public int? UniversidadId { get; private set; }
    public string? NombreInstitucionOtra { get; private set; }
    public int? CampoDetalladoUnescoId { get; private set; }
    public string? NumeroRegistroSenescyt { get; private set; }
    public DateOnly? FechaObtencion { get; private set; }
    public DateOnly? FechaRegistroSenescyt { get; private set; }

    private TituloAcademico()
    {
        NombreTitulo = null!;
    }

    public TituloAcademico(Guid id, InstitucionId institucionId, Guid personaId, DatosTituloAcademico datos, DateTime? fechaUtc = null)
        : base(id, institucionId, personaId, fechaUtc)
    {
        NombreTitulo = null!;
        Aplicar(datos);
    }

    public void Actualizar(DatosTituloAcademico datos, DateTime? fechaUtc = null)
    {
        Aplicar(datos);
        MarcarActualizado(fechaUtc);
    }

    private void Aplicar(DatosTituloAcademico datos)
    {
        ArgumentNullException.ThrowIfNull(datos);

        if (datos.UniversidadId is null && string.IsNullOrWhiteSpace(datos.NombreInstitucionOtra))
        {
            throw new ReglaNegocioException("Indique la universidad o el nombre de la institución que otorgó el título.");
        }

        if (datos.FechaObtencion is not null && datos.FechaRegistroSenescyt is not null &&
            datos.FechaRegistroSenescyt < datos.FechaObtencion)
        {
            throw new ReglaNegocioException("La fecha de registro no puede ser anterior a la fecha de obtención del título.");
        }

        NombreTitulo = Obligatorio(datos.NombreTitulo, "nombre del título");
        GradoAcademicoId = datos.GradoAcademicoId;
        UniversidadId = datos.UniversidadId;
        NombreInstitucionOtra = datos.UniversidadId is null ? Limpiar(datos.NombreInstitucionOtra) : null;
        CampoDetalladoUnescoId = datos.CampoDetalladoUnescoId;
        NumeroRegistroSenescyt = Limpiar(datos.NumeroRegistroSenescyt);
        FechaObtencion = datos.FechaObtencion;
        FechaRegistroSenescyt = datos.FechaRegistroSenescyt;
    }
}
