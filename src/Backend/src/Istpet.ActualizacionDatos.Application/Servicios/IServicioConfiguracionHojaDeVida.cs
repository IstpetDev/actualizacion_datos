namespace Istpet.ActualizacionDatos.Application.Servicios;

using Istpet.ActualizacionDatos.Application.Modelos;

// RF-HDV-012, 013, 015. Implementa T-05 (#31). Solo admin de la institución.
// El código es único dentro de la institución y se guarda en mayúsculas.
public interface IServicioConfiguracionHojaDeVida
{
    Task<List<TipoFuncionarioDto>> ListarTiposFuncionarioAsync(CancellationToken ct = default);
    Task<TipoFuncionarioDto> CrearTipoFuncionarioAsync(GuardarTipoFuncionarioRequest request, CancellationToken ct = default);
    Task<TipoFuncionarioDto> ActualizarTipoFuncionarioAsync(Guid id, GuardarTipoFuncionarioRequest request, CancellationToken ct = default);
    /// <summary>Da de baja mediante Activo=false y conserva las referencias existentes.</summary>
    Task EliminarTipoFuncionarioAsync(Guid id, CancellationToken ct = default);

    Task<List<TipoDocumentoDto>> ListarTiposDocumentoAsync(CancellationToken ct = default);
    Task<TipoDocumentoDto> CrearTipoDocumentoAsync(GuardarTipoDocumentoRequest request, CancellationToken ct = default);
    Task<TipoDocumentoDto> ActualizarTipoDocumentoAsync(Guid id, GuardarTipoDocumentoRequest request, CancellationToken ct = default);
    /// <summary>Da de baja mediante Activo=false y conserva las referencias existentes.</summary>
    Task EliminarTipoDocumentoAsync(Guid id, CancellationToken ct = default);

    Task<List<RequisitoDocumentoDto>> ListarRequisitosAsync(CancellationToken ct = default);
    Task<RequisitoDocumentoDto> CrearRequisitoAsync(GuardarRequisitoDocumentoRequest request, CancellationToken ct = default);
    Task<RequisitoDocumentoDto> ActualizarRequisitoAsync(Guid id, GuardarRequisitoDocumentoRequest request, CancellationToken ct = default);
    /// <summary>Da de baja mediante Activo=false y conserva las referencias existentes.</summary>
    Task EliminarRequisitoAsync(Guid id, CancellationToken ct = default);

    /// <summary>Asigna o quita (nulo) el tipo de funcionario; el tipo debe ser de la misma institución.</summary>
    Task AsignarTipoFuncionarioAsync(Guid personaId, AsignarTipoFuncionarioRequest request, CancellationToken ct = default);

    /// <summary>Asigna o quita masivamente el tipo de funcionario a un conjunto de personas o a las personas sin tipo.</summary>
    Task<ResultadoAsignacionTipoMasivoDto> AsignarTipoFuncionarioMasivoAsync(AsignarTipoFuncionarioMasivoRequest request, CancellationToken ct = default);
}
