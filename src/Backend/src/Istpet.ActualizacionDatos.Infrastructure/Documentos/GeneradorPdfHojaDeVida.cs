namespace Istpet.ActualizacionDatos.Infrastructure.Documentos;

using Istpet.ActualizacionDatos.Application.Documentos;
using Istpet.ActualizacionDatos.Infrastructure.Documentos.Disenos;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

public sealed class GeneradorPdfHojaDeVida : IServicioGeneracionPdfHojaDeVida
{
    private static readonly Dictionary<string, IDisenoBaseHojaDeVida> DisenosRegistrados = new(StringComparer.OrdinalIgnoreCase)
    {
        [CatalogoCamposDocumento.DisenoClasico] = new DisenoClasico()
    };

    static GeneradorPdfHojaDeVida()
    {
        // ADR-0033: Configuración de licencia Community de QuestPDF para el sistema institucional.
        QuestPDF.Settings.License = LicenseType.Community;
        QuestPDF.Settings.ThrowOnMissingFontFamilies = false;
    }

    public byte[] Generar(DatosDocumentoHojaDeVida datos, MarcaDocumento marca, ConfiguracionPlantilla configuracion)
    {
        var validacion = ValidadorConfiguracionPlantilla.Validar(configuracion);
        if (!validacion.EsValida)
        {
            throw new ArgumentException($"La configuración de plantilla no es válida: {string.Join("; ", validacion.Errores)}", nameof(configuracion));
        }

        if (!DisenosRegistrados.TryGetValue(configuracion.DisenoBase, out var disenoBase))
        {
            throw new NotSupportedException($"El diseño base '{configuracion.DisenoBase}' no se encuentra implementado.");
        }

        var documento = Document.Create(contenedor =>
        {
            disenoBase.Componer(contenedor, datos, marca, configuracion);
        });

        return documento.GeneratePdf();
    }
}
