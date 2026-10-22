namespace Istpet.ActualizacionDatos.Application.Servicios;

using Istpet.ActualizacionDatos.Application.Modelos;

// RF-EXP-001 a 004 y RF-HDV-016. Implementa T-08 (#13). Solo admin.
// Solo personas en «aprobado»; las que están en otra actualización van a la hoja «pendientes» (PD-HDV-02).
// La cuenta bancaria va enmascarada (ADR-0013 dec. 5). Cada exportación queda en la auditoría.
public interface IServicioExportacion
{
    Task<ArchivoExportadoDto> ExportarExcelAsync(CancellationToken ct = default);
    Task<ArchivoExportadoDto> ExportarZipAsync(CancellationToken ct = default);
}
