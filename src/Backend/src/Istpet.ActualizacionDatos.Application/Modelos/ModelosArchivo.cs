namespace Istpet.ActualizacionDatos.Application.Modelos;

public sealed record ArchivoDto(
    Guid Id,
    Guid InstitucionId,
    Guid PersonaId,
    string NombreOriginal,
    string TipoContenido,
    long TamanoBytes,
    string HashSha256,
    string? ClaveDestino,
    DateTime FechaSubidaUtc);

public sealed record DescargaArchivoDto(
    Stream Contenido,
    string TipoContenido,
    string NombreOriginal);

public sealed record RetirarArchivoSupervisorRequest(
    string Motivo);
