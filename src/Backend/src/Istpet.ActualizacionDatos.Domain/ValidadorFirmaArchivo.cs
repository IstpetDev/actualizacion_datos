namespace Istpet.ActualizacionDatos.Domain;

public static class ValidadorFirmaArchivo
{
    public const long TamanoMaximoBytes = 10 * 1024 * 1024; // 10 MB según ADR-0006

    private static readonly byte[] MagicPdf = [0x25, 0x50, 0x44, 0x46]; // %PDF
    private static readonly byte[] MagicPng = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]; // \x89PNG\r\n\x1a\n
    private static readonly byte[] MagicJpg = [0xFF, 0xD8, 0xFF];

    private static readonly HashSet<string> ExtensionesPermitidas = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf",
        ".jpg",
        ".jpeg",
        ".png"
    };

    public static bool EsExtensionPermitida(string nombreArchivo)
    {
        if (string.IsNullOrWhiteSpace(nombreArchivo))
        {
            return false;
        }

        var extension = Path.GetExtension(nombreArchivo);
        return !string.IsNullOrEmpty(extension) && ExtensionesPermitidas.Contains(extension);
    }

    public static string ObtenerMimeTypePorExtension(string extension)
    {
        return extension.ToLowerInvariant() switch
        {
            ".pdf" => "application/pdf",
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            _ => "application/octet-stream"
        };
    }

    public static bool ValidarFirmaContenido(string nombreArchivo, ReadOnlySpan<byte> encabezadoBytes)
    {
        var extension = Path.GetExtension(nombreArchivo)?.ToLowerInvariant();
        if (string.IsNullOrEmpty(extension) || !ExtensionesPermitidas.Contains(extension))
        {
            return false;
        }

        return extension switch
        {
            ".pdf" => TienePrefijo(encabezadoBytes, MagicPdf),
            ".png" => TienePrefijo(encabezadoBytes, MagicPng),
            ".jpg" or ".jpeg" => TienePrefijo(encabezadoBytes, MagicJpg),
            _ => false
        };
    }

    private static bool TienePrefijo(ReadOnlySpan<byte> contenido, byte[] patron)
    {
        if (contenido.Length < patron.Length)
        {
            return false;
        }

        return contenido[..patron.Length].SequenceEqual(patron);
    }
}
