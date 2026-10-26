namespace Istpet.ActualizacionDatos.Domain.Tests;

using System.Text;
using Istpet.ActualizacionDatos.Domain;

public class ValidadorFirmaArchivoTests
{
    [Theory]
    [InlineData("documento.pdf")]
    [InlineData("DOCUMENTO.PDF")]
    [InlineData("imagen.jpg")]
    [InlineData("IMAGEN.JPEG")]
    [InlineData("captura.png")]
    [InlineData("CAPTURA.PNG")]
    public void EsExtensionPermitida_con_extensiones_validas_retorna_true(string nombreArchivo)
    {
        Assert.True(ValidadorFirmaArchivo.EsExtensionPermitida(nombreArchivo));
    }

    [Theory]
    [InlineData("script.exe")]
    [InlineData("documento.docx")]
    [InlineData("comprimido.zip")]
    [InlineData("archivo.html")]
    [InlineData("archivo.js")]
    [InlineData("archivo_sin_extension")]
    [InlineData("")]
    public void EsExtensionPermitida_con_extensiones_invalidas_retorna_false(string nombreArchivo)
    {
        Assert.False(ValidadorFirmaArchivo.EsExtensionPermitida(nombreArchivo));
    }

    [Fact]
    public void ValidarFirmaContenido_con_pdf_valido_retorna_true()
    {
        var bytesPdf = Encoding.ASCII.GetBytes("%PDF-1.7 Contenido simulado de prueba");
        Assert.True(ValidadorFirmaArchivo.ValidarFirmaContenido("documento.pdf", bytesPdf));
    }

    [Fact]
    public void ValidarFirmaContenido_con_png_valido_retorna_true()
    {
        var bytesPng = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00 };
        Assert.True(ValidadorFirmaArchivo.ValidarFirmaContenido("imagen.png", bytesPng));
    }

    [Fact]
    public void ValidarFirmaContenido_con_jpg_valido_retorna_true()
    {
        var bytesJpg = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46 };
        Assert.True(ValidadorFirmaArchivo.ValidarFirmaContenido("foto.jpg", bytesJpg));
    }

    [Fact]
    public void ValidarFirmaContenido_con_archivo_falso_o_renombrado_retorna_false()
    {
        // Un archivo ejecutable MZ renombrado a PDF
        var bytesExe = Encoding.ASCII.GetBytes("MZ\x90\x00\x03\x00\x00\x00");
        Assert.False(ValidadorFirmaArchivo.ValidarFirmaContenido("malware.pdf", bytesExe));

        // Un archivo de texto simple simulando ser PNG
        var bytesTexto = Encoding.UTF8.GetBytes("Esto es solo texto plano y no un png");
        Assert.False(ValidadorFirmaArchivo.ValidarFirmaContenido("falso.png", bytesTexto));
    }

    [Fact]
    public void ValidarFirmaContenido_con_bytes_vacios_retorna_false()
    {
        Assert.False(ValidadorFirmaArchivo.ValidarFirmaContenido("vacio.pdf", Array.Empty<byte>()));
    }

    [Theory]
    [InlineData(".pdf", "application/pdf")]
    [InlineData(".jpg", "image/jpeg")]
    [InlineData(".jpeg", "image/jpeg")]
    [InlineData(".png", "image/png")]
    [InlineData(".xyz", "application/octet-stream")]
    public void ObtenerMimeTypePorExtension_retorna_mime_esperado(string extension, string esperado)
    {
        Assert.Equal(esperado, ValidadorFirmaArchivo.ObtenerMimeTypePorExtension(extension));
    }
}
