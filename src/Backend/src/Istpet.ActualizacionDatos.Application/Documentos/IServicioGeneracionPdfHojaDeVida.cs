namespace Istpet.ActualizacionDatos.Application.Documentos;

/// <summary>
/// Contrato del motor de generación de PDF para la hoja de vida (ADR-0032, ADR-0033).
/// </summary>
public interface IServicioGeneracionPdfHojaDeVida
{
    byte[] Generar(DatosDocumentoHojaDeVida datos, MarcaDocumento marca, ConfiguracionPlantilla configuracion);
}
