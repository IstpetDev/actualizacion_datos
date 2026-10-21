namespace Istpet.ActualizacionDatos.Domain;

public abstract class EntidadInstitucional : IEntidadInstitucional
{
    public InstitucionId InstitucionId { get; protected set; } = null!;

    protected EntidadInstitucional()
    {
    }

    protected EntidadInstitucional(InstitucionId institucionId)
    {
        InstitucionId = institucionId ?? throw new ArgumentNullException(nameof(institucionId));
    }
}
