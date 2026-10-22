namespace Istpet.ActualizacionDatos.Domain;

public class Observacion : EntidadInstitucional
{
    public Guid Id { get; private set; }
    public Guid PersonaId { get; private set; }
    public int Ronda { get; private set; }
    public string Autor { get; private set; }
    public string Texto { get; private set; }
    public DateTime FechaUtc { get; private set; }
    public List<MarcaObservacion> Marcas { get; private set; } = new();

    private Observacion()
    {
        Autor = null!;
        Texto = null!;
    }

    public Observacion(
        Guid id,
        InstitucionId institucionId,
        Guid personaId,
        int ronda,
        string autor,
        string texto,
        DateTime? fechaUtc = null,
        IEnumerable<MarcaObservacion>? marcas = null)
        : base(institucionId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(autor);
        if (string.IsNullOrWhiteSpace(texto))
        {
            throw new ReglaNegocioException("La observación general es obligatoria para devolver una actualización.");
        }

        Id = id;
        PersonaId = personaId;
        Ronda = ronda;
        Autor = autor.Trim();
        Texto = texto.Trim();
        FechaUtc = fechaUtc ?? DateTime.UtcNow;

        if (marcas != null)
        {
            Marcas.AddRange(marcas);
        }
    }

    public void AgregarMarca(MarcaObservacion marca)
    {
        ArgumentNullException.ThrowIfNull(marca);
        Marcas.Add(marca);
    }
}
