namespace Istpet.ActualizacionDatos.Domain;

public sealed class AceptacionProteccionDatos : EntidadInstitucional
{
    public Guid PersonaId { get; private set; }
    public Guid AvisoId { get; private set; }
    public DateTime FechaUtc { get; private set; }

    private AceptacionProteccionDatos() { }

    public AceptacionProteccionDatos(InstitucionId institucionId, Guid personaId, Guid avisoId, DateTime fechaUtc)
        : base(institucionId)
    {
        if (personaId == Guid.Empty || avisoId == Guid.Empty || fechaUtc.Kind != DateTimeKind.Utc)
            throw new ArgumentException("La aceptación requiere persona, aviso y fecha UTC válidos.");
        PersonaId = personaId;
        AvisoId = avisoId;
        FechaUtc = fechaUtc;
    }
}
