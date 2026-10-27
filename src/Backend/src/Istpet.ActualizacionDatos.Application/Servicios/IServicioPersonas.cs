namespace Istpet.ActualizacionDatos.Application.Servicios;

using Istpet.ActualizacionDatos.Application.Modelos;

public interface IServicioPersonas
{
    Task<ResultadoCargaPersonasDto> CargarPersonasAsync(CargarPersonasRequest request, CancellationToken ct = default);
    Task<ResultadoCargaPersonasDto> CargarDesdeArchivoAsync(Stream stream, string nombreArchivo, CancellationToken ct = default);
    Task<List<PersonaDto>> ListarPersonasAsync(CancellationToken ct = default);
    Task<ResultadoCambioAccesoDto> CambiarAccesoAsync(CambiarAccesoPersonasRequest request, CancellationToken ct = default);
}
