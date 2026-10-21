namespace Istpet.ActualizacionDatos.Application.Modelos;

public sealed record PersonaCargaItem(
    string Documento,
    string? Nombre = null,
    string? Correo = null);

public sealed record CargarPersonasRequest(
    List<PersonaCargaItem> Personas);

public sealed record ResultadoCargaPersonasDto(
    int TotalRecibidos,
    int TotalCargados,
    int TotalDuplicadosOmitidos,
    List<string> DocumentosCargados);

public sealed record HabilitarPersonasRequest(
    List<string>? Documentos = null,
    List<Guid>? PersonaIds = null,
    bool HabilitarTodos = false);

public sealed record PersonaDto(
    Guid Id,
    Guid InstitucionId,
    string Documento,
    string? Nombre,
    string? Correo,
    string Rol,
    bool AccesoHabilitado,
    string EstadoActualizacion,
    DateTime FechaCreacionUtc);
