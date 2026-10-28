namespace Istpet.ActualizacionDatos.Application.Servicios;

using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;

// RF-HDV-009, 018, 019, 023, 024 y, con T-10, la cuenta bancaria (PD-HDV-17). Implementa T-04.
// Es el único lugar donde vive la obligatoriedad (ADR-0009): el dominio solo protege coherencias.
public interface IValidadorCompletitudEnvio
{
    Task<ResultadoValidacionEnvioDto> ValidarAsync(Guid personaId, CancellationToken ct = default);
}

/// <summary>
/// Una regla de completitud. El validador ejecuta todas las registradas en el contenedor y junta sus faltantes;
/// ignora las de secciones cerradas (ADR-0028, spec-0010).
/// </summary>
public interface IReglaCompletitudEnvio
{
    SeccionHojaDeVida? Seccion => null;
    Task<IReadOnlyList<FaltanteEnvioDto>> EvaluarAsync(Guid personaId, CancellationToken ct = default);
}

/// <summary>El envío a revisión falló por datos faltantes. La API responde 400 con EnvioIncompletoRespuesta.</summary>
public sealed class EnvioIncompletoException : ReglaNegocioException
{
    public EnvioIncompletoException(IReadOnlyList<FaltanteEnvioDto> faltantes)
        : base("La hoja de vida está incompleta. Revise los datos faltantes antes de enviarla.")
    {
        Faltantes = faltantes;
    }

    public IReadOnlyList<FaltanteEnvioDto> Faltantes { get; }
}

/// <summary>
/// El recurso no existe para quien lo pide: de otra institución, de otra persona o inexistente.
/// La API responde 404, no 403, para no confirmar que existe (plan.md, «Errores y permisos»).
/// </summary>
public sealed class RecursoNoEncontradoException : ReglaNegocioException
{
    public RecursoNoEncontradoException(string mensaje)
        : base(mensaje)
    {
    }
}

/// <summary>
/// La operación entra en conflicto con el estado actual del recurso (ej. nombre repetido o modificación no permitida).
/// La API responde 409 Conflict.
/// </summary>
public sealed class ConflictoEstadoException : ReglaNegocioException
{
    public ConflictoEstadoException(string mensaje)
        : base(mensaje)
    {
    }
}
