namespace Istpet.ActualizacionDatos.Application.Documentos;

using System.Text.RegularExpressions;

/// <summary>
/// Atributos de marca institucional para personalizar la generación del documento (RF-PLA-004, ADR-0032).
/// </summary>
public sealed record MarcaDocumento(
    string NombreVisible,
    string ColorPrimario,
    string ColorSecundario,
    string? Lema = null,
    string? TextoCompromiso = null,
    byte[]? LogoBytes = null,
    byte[]? PortadaBytes = null)
{
    private static readonly Regex RegexColorHex = new(@"^#([0-9A-Fa-f]{6})$", RegexOptions.Compiled);

    public static bool EsColorHexValido(string? color) =>
        !string.IsNullOrWhiteSpace(color) && RegexColorHex.IsMatch(color);

    /// <summary>
    /// Marca neutra predeterminada utilizada cuando una institución no ha configurado aún su identidad (RF-PLA-018).
    /// </summary>
    public static MarcaDocumento Neutra => new(
        NombreVisible: "Institución Educativa",
        ColorPrimario: "#1A365D",
        ColorSecundario: "#2B6CB0",
        Lema: "Actualización de Datos y Hoja de Vida",
        TextoCompromiso: "Declaro bajo juramento que los datos contenidos en este documento son fidedignos y de mi exclusiva responsabilidad.");
}
