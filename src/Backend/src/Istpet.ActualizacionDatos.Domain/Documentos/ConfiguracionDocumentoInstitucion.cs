namespace Istpet.ActualizacionDatos.Domain.Documentos;

using System.Text.RegularExpressions;

/// <summary>
/// Configuración de marca e identidad visual de la institución para el documento de hoja de vida (RF-PLA-004, ADR-0032).
/// Define los atributos institucionales y la versión de plantilla seleccionada por la institución.
/// </summary>
public class ConfiguracionDocumentoInstitucion : EntidadInstitucional
{
    private static readonly Regex RegexColorHex = new(@"^#([0-9A-Fa-f]{6})$", RegexOptions.Compiled);

    public Guid? PlantillaId { get; private set; }
    public Guid? VersionPlantillaId { get; private set; }
    public string? NombreVisible { get; private set; }
    public Guid? LogoArchivoId { get; private set; }
    public Guid? PortadaArchivoId { get; private set; }
    public string ColorPrimario { get; private set; } = "#1A365D";
    public string ColorSecundario { get; private set; } = "#2B6CB0";
    public string? Lema { get; private set; }
    public string? TextoCompromiso { get; private set; }
    public DateTime FechaActualizacionUtc { get; private set; }

    private ConfiguracionDocumentoInstitucion()
    {
    }

    public ConfiguracionDocumentoInstitucion(InstitucionId institucionId, DateTime? fechaUtc = null)
        : base(institucionId)
    {
        FechaActualizacionUtc = fechaUtc ?? DateTime.UtcNow;
    }

    public void ActualizarMarca(
        string? nombreVisible,
        Guid? logoArchivoId,
        Guid? portadaArchivoId,
        string colorPrimario,
        string colorSecundario,
        string? lema,
        string? textoCompromiso,
        DateTime? fechaUtc = null)
    {
        if (string.IsNullOrWhiteSpace(colorPrimario) || !RegexColorHex.IsMatch(colorPrimario))
        {
            throw new ReglaNegocioException($"El color primario '{colorPrimario}' debe ser un código hexadecimal válido (#RRGGBB).");
        }

        if (string.IsNullOrWhiteSpace(colorSecundario) || !RegexColorHex.IsMatch(colorSecundario))
        {
            throw new ReglaNegocioException($"El color secundario '{colorSecundario}' debe ser un código hexadecimal válido (#RRGGBB).");
        }

        NombreVisible = string.IsNullOrWhiteSpace(nombreVisible) ? null : nombreVisible.Trim();
        LogoArchivoId = logoArchivoId;
        PortadaArchivoId = portadaArchivoId;
        ColorPrimario = colorPrimario.Trim();
        ColorSecundario = colorSecundario.Trim();
        Lema = string.IsNullOrWhiteSpace(lema) ? null : lema.Trim();
        TextoCompromiso = string.IsNullOrWhiteSpace(textoCompromiso) ? null : textoCompromiso.Trim();
        FechaActualizacionUtc = fechaUtc ?? DateTime.UtcNow;
    }

    public void ElegirPlantilla(Guid plantillaId, Guid versionPlantillaId, DateTime? fechaUtc = null)
    {
        PlantillaId = plantillaId;
        VersionPlantillaId = versionPlantillaId;
        FechaActualizacionUtc = fechaUtc ?? DateTime.UtcNow;
    }
}
