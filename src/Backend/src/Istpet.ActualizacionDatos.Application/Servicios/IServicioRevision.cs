namespace Istpet.ActualizacionDatos.Application.Servicios;

using Istpet.ActualizacionDatos.Application.Modelos;

public interface IServicioRevision
{
    Task<List<ResumenRevisionPendienteDto>> ListarPendientesRevisionAsync(CancellationToken ct = default);
    Task<ExpedienteRevisionDto> ObtenerExpedienteParaRevisionAsync(string documento, string actorSupervisor, CancellationToken ct = default);
    Task AprobarActualizacionAsync(string documento, string supervisor, CancellationToken ct = default);
    Task DevolverActualizacionAsync(string documento, DevolverActualizacionRequest request, string supervisor, CancellationToken ct = default);
}
