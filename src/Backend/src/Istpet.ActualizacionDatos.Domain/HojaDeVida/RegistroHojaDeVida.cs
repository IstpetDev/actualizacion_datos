namespace Istpet.ActualizacionDatos.Domain.HojaDeVida;

// ADR-0010, decisiones 3 y 10: todo registro de la hoja de vida pertenece a una
// institución y a una persona, y puede tener un archivo de respaldo (ADR-0006).
public abstract class RegistroHojaDeVida : EntidadInstitucional
{
    public Guid Id { get; protected set; }
    public Guid PersonaId { get; protected set; }
    public Guid? ArchivoId { get; protected set; }
    public DateTime FechaActualizacionUtc { get; protected set; }

    protected RegistroHojaDeVida()
    {
    }

    protected RegistroHojaDeVida(Guid id, InstitucionId institucionId, Guid personaId, DateTime? fechaUtc)
        : base(institucionId)
    {
        if (personaId == Guid.Empty)
        {
            throw new ArgumentException("La persona es obligatoria.", nameof(personaId));
        }

        Id = id;
        PersonaId = personaId;
        FechaActualizacionUtc = fechaUtc ?? DateTime.UtcNow;
    }

    public void AsociarArchivo(Guid? archivoId, DateTime? fechaUtc = null)
    {
        ArchivoId = archivoId;
        MarcarActualizado(fechaUtc);
    }

    protected void MarcarActualizado(DateTime? fechaUtc)
    {
        FechaActualizacionUtc = fechaUtc ?? DateTime.UtcNow;
    }

    protected static string? Limpiar(string? valor) =>
        string.IsNullOrWhiteSpace(valor) ? null : valor.Trim();

    protected static string Obligatorio(string? valor, string nombreCampo)
    {
        if (string.IsNullOrWhiteSpace(valor))
        {
            throw new ReglaNegocioException($"El campo {nombreCampo} es obligatorio.");
        }

        return valor.Trim();
    }

    protected static void ValidarRangoFechas(DateOnly? inicio, DateOnly? fin)
    {
        if (inicio is not null && fin is not null && fin < inicio)
        {
            throw new ReglaNegocioException("La fecha de fin no puede ser anterior a la fecha de inicio.");
        }
    }
}
