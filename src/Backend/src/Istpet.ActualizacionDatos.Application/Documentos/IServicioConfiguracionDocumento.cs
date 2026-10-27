namespace Istpet.ActualizacionDatos.Application.Documentos;

public interface IServicioConfiguracionDocumento
{
    Task<ConfiguracionDocumentoDto> ObtenerConfiguracionAsync(CancellationToken ct = default);
    Task<ConfiguracionDocumentoDto> ActualizarMarcaAsync(ActualizarMarcaDto dto, CancellationToken ct = default);
    Task<ConfiguracionDocumentoDto> ElegirPlantillaAsync(ElegirPlantillaDto dto, CancellationToken ct = default);
    Task<ConfiguracionDocumentoDto> AceptarNuevaVersionAsync(CancellationToken ct = default);
}
