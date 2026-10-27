namespace Istpet.ActualizacionDatos.Domain.Documentos;

/// <summary>
/// Plantilla global de hoja de vida administrada por el superadmin (RF-PLA-001, ADR-0032).
/// Contiene el borrador actual editable y el historial de versiones publicadas e inmutables.
/// </summary>
public class PlantillaHojaDeVida
{
    private readonly List<VersionPlantillaHojaDeVida> _versiones = new();

    public Guid Id { get; private set; }
    public string Nombre { get; private set; }
    public string? Descripcion { get; private set; }
    public string DisenoBase { get; private set; }
    public string ConfiguracionJson { get; private set; }
    public bool EsPredeterminada { get; private set; }
    public DateTime FechaCreacionUtc { get; private set; }
    public DateTime FechaActualizacionUtc { get; private set; }

    public IReadOnlyCollection<VersionPlantillaHojaDeVida> Versiones => _versiones.AsReadOnly();

    private PlantillaHojaDeVida()
    {
        Nombre = null!;
        DisenoBase = null!;
        ConfiguracionJson = null!;
    }

    public PlantillaHojaDeVida(
        Guid id,
        string nombre,
        string disenoBase,
        string configuracionJson,
        string? descripcion = null,
        bool esPredeterminada = false,
        DateTime? fechaCreacionUtc = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(nombre);
        ArgumentException.ThrowIfNullOrWhiteSpace(disenoBase);
        ArgumentException.ThrowIfNullOrWhiteSpace(configuracionJson);

        Id = id;
        Nombre = nombre.Trim();
        DisenoBase = disenoBase.Trim();
        ConfiguracionJson = configuracionJson;
        Descripcion = descripcion?.Trim();
        EsPredeterminada = esPredeterminada;
        FechaCreacionUtc = fechaCreacionUtc ?? DateTime.UtcNow;
        FechaActualizacionUtc = FechaCreacionUtc;
    }

    public void ActualizarBorrador(string nombre, string? descripcion, string configuracionJson, DateTime? fechaActualizacionUtc = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(nombre);
        ArgumentException.ThrowIfNullOrWhiteSpace(configuracionJson);

        Nombre = nombre.Trim();
        Descripcion = descripcion?.Trim();
        ConfiguracionJson = configuracionJson;
        FechaActualizacionUtc = fechaActualizacionUtc ?? DateTime.UtcNow;
    }

    public VersionPlantillaHojaDeVida PublicarVersion(string? descripcionCambio = null, DateTime? fechaPublicacionUtc = null)
    {
        var siguienteNumero = _versiones.Count == 0 ? 1 : _versiones.Max(v => v.NumeroVersion) + 1;

        var nuevaVersion = new VersionPlantillaHojaDeVida(
            id: Guid.NewGuid(),
            plantillaId: Id,
            numeroVersion: siguienteNumero,
            disenoBase: DisenoBase,
            configuracionJson: ConfiguracionJson,
            descripcionCambio: descripcionCambio,
            fechaPublicacionUtc: fechaPublicacionUtc);

        _versiones.Add(nuevaVersion);
        FechaActualizacionUtc = nuevaVersion.FechaPublicacionUtc;

        return nuevaVersion;
    }

    public void MarcarComoPredeterminada()
    {
        EsPredeterminada = true;
    }

    public void DesmarcarPredeterminada()
    {
        EsPredeterminada = false;
    }
}
