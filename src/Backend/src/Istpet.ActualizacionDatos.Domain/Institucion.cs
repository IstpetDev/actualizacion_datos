namespace Istpet.ActualizacionDatos.Domain;

public class Institucion
{
    public InstitucionId Id { get; private set; }
    public string Nombre { get; private set; }
    public bool Activa { get; private set; }
    public DateTime FechaCreacionUtc { get; private set; }

    private Institucion()
    {
        Id = null!;
        Nombre = null!;
    }

    public Institucion(InstitucionId id, string nombre, bool activa = true, DateTime? fechaCreacionUtc = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(nombre);
        Id = id ?? throw new ArgumentNullException(nameof(id));
        Nombre = nombre.Trim();
        Activa = activa;
        FechaCreacionUtc = fechaCreacionUtc ?? DateTime.UtcNow;
    }
}
