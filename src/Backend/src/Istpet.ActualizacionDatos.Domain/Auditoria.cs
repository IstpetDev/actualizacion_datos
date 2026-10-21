namespace Istpet.ActualizacionDatos.Domain;

public class Auditoria
{
    public Guid Id { get; private set; }
    public string Actor { get; private set; }
    public string Accion { get; private set; }
    public InstitucionId? InstitucionId { get; private set; }
    public DateTime FechaUtc { get; private set; }
    public string? Detalle { get; private set; }

    private Auditoria()
    {
        Actor = null!;
        Accion = null!;
    }

    public Auditoria(
        Guid id,
        string actor,
        string accion,
        InstitucionId? institucionId = null,
        DateTime? fechaUtc = null,
        string? detalle = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actor);
        ArgumentException.ThrowIfNullOrWhiteSpace(accion);

        Id = id;
        Actor = actor.Trim();
        Accion = accion.Trim();
        InstitucionId = institucionId;
        FechaUtc = fechaUtc ?? DateTime.UtcNow;
        Detalle = detalle;
    }
}
