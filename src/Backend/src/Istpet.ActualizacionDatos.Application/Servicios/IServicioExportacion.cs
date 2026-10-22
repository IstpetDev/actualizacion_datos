using Istpet.ActualizacionDatos.Application.Modelos;

namespace Istpet.ActualizacionDatos.Application.Servicios;

/// <summary>
/// Contrato del servicio de exportación de datos y expedientes de la institución.
/// </summary>
public interface IServicioExportacion
{
    /// <summary>
    /// Genera un archivo .zip estructurado con la carpeta raíz &lt;institucion&gt;_&lt;fecha&gt;_datos/,
    /// el índice index.md y los documentos adjuntos de las personas con datos aprobados.
    /// </summary>
    Task<DescargaArchivoDto> ExportarZipAsync(Guid? institucionId = null, CancellationToken ct = default);

    /// <summary>
    /// Genera un reporte en hoja de cálculo Excel (.xlsx) con los datos aprobados de las personas de la institución.
    /// </summary>
    Task<DescargaArchivoDto> ExportarExcelAsync(Guid? institucionId = null, CancellationToken ct = default);
}
