namespace Istpet.ActualizacionDatos.Infrastructure.Documentos.Disenos;

using Istpet.ActualizacionDatos.Application.Documentos;
using QuestPDF.Infrastructure;

public interface IDisenoBaseHojaDeVida
{
    string CodigoDiseno { get; }
    void Componer(IDocumentContainer contenedor, DatosDocumentoHojaDeVida datos, MarcaDocumento marca, ConfiguracionPlantilla configuracion);
}
