namespace Istpet.ActualizacionDatos.Application.Servicios;

using Istpet.ActualizacionDatos.Application.Modelos;

public interface IServicioAuditoria
{
    Task<List<AuditoriaDto>> ListarAuditoriasAsync(CancellationToken ct = default);
}
