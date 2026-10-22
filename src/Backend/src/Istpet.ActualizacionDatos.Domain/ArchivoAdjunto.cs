namespace Istpet.ActualizacionDatos.Domain;

public class ArchivoAdjunto : EntidadInstitucional
{
    public Guid Id { get; private set; }
    public Guid PersonaId { get; private set; }
    public string NombreOriginal { get; private set; }
    public string TipoContenido { get; private set; }
    public long TamanoBytes { get; private set; }
    public string HashSha256 { get; private set; }
    public string RutaRelativa { get; private set; }
    public string? ClaveDestino { get; private set; }
    public DateTime FechaSubidaUtc { get; private set; }

    private ArchivoAdjunto()
    {
        NombreOriginal = null!;
        TipoContenido = null!;
        HashSha256 = null!;
        RutaRelativa = null!;
    }

    public ArchivoAdjunto(
        Guid id,
        InstitucionId institucionId,
        Guid personaId,
        string nombreOriginal,
        string tipoContenido,
        long tamanoBytes,
        string hashSha256,
        string rutaRelativa,
        string? claveDestino = null,
        DateTime? fechaSubidaUtc = null)
        : base(institucionId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(nombreOriginal);
        ArgumentException.ThrowIfNullOrWhiteSpace(tipoContenido);
        ArgumentException.ThrowIfNullOrWhiteSpace(hashSha256);
        ArgumentException.ThrowIfNullOrWhiteSpace(rutaRelativa);

        if (tamanoBytes <= 0)
        {
            throw new ArgumentException("El tamaño del archivo debe ser mayor a cero bytes.", nameof(tamanoBytes));
        }

        if (tamanoBytes > ValidadorFirmaArchivo.TamanoMaximoBytes)
        {
            throw new ReglaNegocioException($"El archivo supera el tamaño máximo permitido de 10 MB ({ValidadorFirmaArchivo.TamanoMaximoBytes} bytes).");
        }

        Id = id;
        PersonaId = personaId;
        NombreOriginal = Path.GetFileName(nombreOriginal.Trim());
        TipoContenido = tipoContenido.Trim().ToLowerInvariant();
        TamanoBytes = tamanoBytes;
        HashSha256 = hashSha256.Trim().ToLowerInvariant();
        RutaRelativa = rutaRelativa.Trim();
        ClaveDestino = string.IsNullOrWhiteSpace(claveDestino) ? null : claveDestino.Trim();
        FechaSubidaUtc = fechaSubidaUtc ?? DateTime.UtcNow;
    }
}
