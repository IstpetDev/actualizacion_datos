namespace Istpet.ActualizacionDatos.Application.Servicios;

using Istpet.ActualizacionDatos.Application.Modelos;

// RF-HDV-007, 008, 010, 015. Implementa T-03.
public interface IServicioDocumentosPersonales
{
    /// <summary>
    /// Tipos de documento activos que aplican a la persona: requisitos de su tipo de funcionario
    /// y los de «todos» (TipoFuncionarioId nulo), con lo que ya registró.
    /// </summary>
    Task<List<DocumentoRequeridoDto>> ListarAsync(string documento, CancellationToken ct = default);

    /// <summary>Registra o reemplaza el documento de ese tipo: uno por persona y tipo (RF-HDV-008).</summary>
    Task<DocumentoPersonalDto> GuardarAsync(string documento, Guid tipoDocumentoId, GuardarDocumentoPersonalRequest request, CancellationToken ct = default);
}
