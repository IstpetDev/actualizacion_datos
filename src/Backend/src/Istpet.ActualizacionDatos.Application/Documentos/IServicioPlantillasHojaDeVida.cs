namespace Istpet.ActualizacionDatos.Application.Documentos;

public interface IServicioPlantillasHojaDeVida
{
    Task<List<PlantillaResumenDto>> ListarPlantillasAsync(bool soloPublicadas = false, CancellationToken ct = default);
    Task<PlantillaDetalleDto> ObtenerPlantillaPorIdAsync(Guid id, CancellationToken ct = default);
    Task<PlantillaDetalleDto> CrearPlantillaAsync(CrearPlantillaDto dto, CancellationToken ct = default);
    Task<PlantillaDetalleDto> ActualizarPlantillaAsync(Guid id, ActualizarPlantillaDto dto, CancellationToken ct = default);
    Task<VersionPlantillaDto> PublicarVersionAsync(Guid id, PublicarVersionDto dto, CancellationToken ct = default);
    Task MarcarComoPredeterminadaAsync(Guid id, CancellationToken ct = default);
}
