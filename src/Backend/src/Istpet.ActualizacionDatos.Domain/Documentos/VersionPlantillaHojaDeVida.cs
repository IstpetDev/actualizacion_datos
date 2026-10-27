namespace Istpet.ActualizacionDatos.Domain.Documentos;

/// <summary>
/// Versión inmutable y publicada de una plantilla global (RF-PLA-002, ADR-0032).
/// Una vez publicada no puede ser modificada; cambios posteriores generan una nueva versión.
/// </summary>
public class VersionPlantillaHojaDeVida
{
    public Guid Id { get; private set; }
    public Guid PlantillaId { get; private set; }
    public int NumeroVersion { get; private set; }
    public string DisenoBase { get; private set; }
    public string ConfiguracionJson { get; private set; }
    public string? DescripcionCambio { get; private set; }
    public DateTime FechaPublicacionUtc { get; private set; }

    private VersionPlantillaHojaDeVida()
    {
        DisenoBase = null!;
        ConfiguracionJson = null!;
    }

    public VersionPlantillaHojaDeVida(
        Guid id,
        Guid plantillaId,
        int numeroVersion,
        string disenoBase,
        string configuracionJson,
        string? descripcionCambio = null,
        DateTime? fechaPublicacionUtc = null)
    {
        if (numeroVersion <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(numeroVersion), "El número de versión debe ser mayor a cero.");
        }

        ArgumentException.ThrowIfNullOrWhiteSpace(disenoBase);
        ArgumentException.ThrowIfNullOrWhiteSpace(configuracionJson);

        Id = id;
        PlantillaId = plantillaId;
        NumeroVersion = numeroVersion;
        DisenoBase = disenoBase.Trim();
        ConfiguracionJson = configuracionJson;
        DescripcionCambio = descripcionCambio?.Trim();
        FechaPublicacionUtc = fechaPublicacionUtc ?? DateTime.UtcNow;
    }
}
