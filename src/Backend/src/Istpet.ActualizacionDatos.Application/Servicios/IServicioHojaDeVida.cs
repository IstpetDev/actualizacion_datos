namespace Istpet.ActualizacionDatos.Application.Servicios;

using Istpet.ActualizacionDatos.Application.Modelos;

// RF-HDV-001 a 006, 010, 015, 017, 020. Implementa T-02 (#30).
// Reglas comunes a toda escritura:
// - Persona.AsegurarEdicionPermitida() antes de cambiar (RF-HDV-010).
// - Campaña abierta, como el resto de /api/mis-datos (RF-CAM-003).
// - Catálogos validados con IValidadorCatalogos (RF-HDV-001).
// - ArchivoId debe ser un archivo de la misma persona (RF-HDV-006).
// - Un id de otra institución o de otra persona se trata como inexistente: RecursoNoEncontradoException (404).
public interface IServicioHojaDeVida
{
    Task<HojaDeVidaDto> ObtenerAsync(string documento, CancellationToken ct = default);

    Task<FichaPersonalDto> GuardarFichaAsync(string documento, GuardarFichaPersonalRequest request, CancellationToken ct = default);

    Task<TituloAcademicoDto> AgregarTituloAsync(string documento, GuardarTituloAcademicoRequest request, CancellationToken ct = default);
    Task<TituloAcademicoDto> ActualizarTituloAsync(string documento, Guid id, GuardarTituloAcademicoRequest request, CancellationToken ct = default);
    Task EliminarTituloAsync(string documento, Guid id, CancellationToken ct = default);

    Task<TituloEnCursoDto> AgregarTituloEnCursoAsync(string documento, GuardarTituloEnCursoRequest request, CancellationToken ct = default);
    Task<TituloEnCursoDto> ActualizarTituloEnCursoAsync(string documento, Guid id, GuardarTituloEnCursoRequest request, CancellationToken ct = default);
    Task EliminarTituloEnCursoAsync(string documento, Guid id, CancellationToken ct = default);

    Task<CapacitacionDto> AgregarCapacitacionAsync(string documento, GuardarCapacitacionRequest request, CancellationToken ct = default);
    Task<CapacitacionDto> ActualizarCapacitacionAsync(string documento, Guid id, GuardarCapacitacionRequest request, CancellationToken ct = default);
    Task EliminarCapacitacionAsync(string documento, Guid id, CancellationToken ct = default);

    Task<ExperienciaLaboralDto> AgregarExperienciaAsync(string documento, GuardarExperienciaLaboralRequest request, CancellationToken ct = default);
    Task<ExperienciaLaboralDto> ActualizarExperienciaAsync(string documento, Guid id, GuardarExperienciaLaboralRequest request, CancellationToken ct = default);
    Task EliminarExperienciaAsync(string documento, Guid id, CancellationToken ct = default);

    /// <summary>Máximo cinco referencias por tipo (RF-HDV-017, PD-HDV-13).</summary>
    Task<ReferenciaDto> AgregarReferenciaAsync(string documento, GuardarReferenciaRequest request, CancellationToken ct = default);
    Task<ReferenciaDto> ActualizarReferenciaAsync(string documento, Guid id, GuardarReferenciaRequest request, CancellationToken ct = default);
    Task EliminarReferenciaAsync(string documento, Guid id, CancellationToken ct = default);

    Task<List<EstadoCapacitacionObligatoriaPersonaDto>> ListarCapacitacionesObligatoriasAsync(string documento, CancellationToken ct = default);
    Task VincularCapacitacionObligatoriaAsync(string documento, Guid obligatoriaId, VincularCapacitacionObligatoriaRequest request, CancellationToken ct = default);
    Task JustificarNuevoIngresoAsync(string documento, Guid obligatoriaId, JustificarNuevoIngresoRequest request, CancellationToken ct = default);

    Task<HojaDeVidaDto> ObtenerParaRevisionAsync(string documento, CancellationToken ct = default);
}
