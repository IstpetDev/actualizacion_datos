namespace Istpet.ActualizacionDatos.Application.Modelos;

public sealed record MarcaObservacionItem(
    string TipoDestino,
    string ClaveDestino,
    string Texto);

public sealed record DevolverActualizacionRequest(
    string ObservacionGeneral,
    List<MarcaObservacionItem>? Marcas = null);

public sealed record MarcaObservacionDto(
    Guid Id,
    string TipoDestino,
    string ClaveDestino,
    string Texto);

public sealed record ObservacionDto(
    Guid Id,
    int Ronda,
    string Autor,
    string Texto,
    DateTime FechaUtc,
    List<MarcaObservacionDto> Marcas);

public sealed record ResumenRevisionPendienteDto(
    Guid Id,
    string Documento,
    string? Nombre,
    string? Correo,
    string EstadoActualizacion,
    DateTime FechaCreacionUtc);

public sealed record ExpedienteRevisionDto(
    Guid Id,
    Guid InstitucionId,
    string Documento,
    string? Nombre,
    string? Correo,
    string EstadoActualizacion,
    string? DatosPersonalesJson,
    bool TratamientoDatosAceptado,
    DateTime? FechaAceptacionTratamientoDatosUtc,
    List<ObservacionDto> Observaciones);

public sealed record MisDatosDto(
    Guid Id,
    Guid InstitucionId,
    string Documento,
    string? Nombre,
    string? Correo,
    bool CorreoVerificado,
    string EstadoActualizacion,
    string? DatosPersonalesJson,
    bool TratamientoDatosAceptado,
    DateTime? FechaAceptacionTratamientoDatosUtc,
    bool PuedeEditar,
    string MensajeEstado,
    List<ObservacionDto> Observaciones);

public sealed record AuditoriaDto(
    Guid Id,
    string Actor,
    string Accion,
    Guid? InstitucionId,
    DateTime FechaUtc,
    string? Detalle);
