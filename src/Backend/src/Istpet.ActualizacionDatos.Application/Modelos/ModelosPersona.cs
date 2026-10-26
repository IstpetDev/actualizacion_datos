namespace Istpet.ActualizacionDatos.Application.Modelos;

public sealed record NombresDivididos(
    string? PrimerApellido,
    string? SegundoApellido,
    string? PrimerNombre,
    string? SegundoNombre,
    bool RequiereConfirmacion);

public sealed record PersonaCargaItem(
    string Documento,
    string? Nombre = null,
    string? CargoTrabajo = null,
    string? Nacimiento = null,
    string? EstadoCivil = null,
    string? Nacionalidad = null,
    string? Direccion = null,
    string? Sangre = null,
    string? Telefono2 = null,
    string? Correo = null,
    string? Edad = null,
    string? Estudios = null,
    string? Ciudad = null,
    string? FecIngreso = null,
    string? TipoCuentaBanco = null,
    string? Banco = null,
    string? NumCuentaBanco = null,
    string? TipoFuncionarioCodigo = null);

public sealed record CargarPersonasRequest(
    List<PersonaCargaItem> Personas);

public sealed record AdvertenciaCargaDto(
    int Fila,
    string Columna,
    string Motivo);

public sealed record RechazoCargaDto(
    int Fila,
    string Motivo,
    string? DocumentoAnonimizado = null);

public sealed record ResultadoCargaPersonasDto(
    int TotalRecibidos,
    int TotalCargados,
    int TotalRechazados,
    int TotalDuplicadosOmitidos,
    List<AdvertenciaCargaDto> Advertencias,
    List<RechazoCargaDto> Rechazos,
    List<string> DocumentosCargados,
    int TotalExistentesHabilitados = 0);

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
    DateTime FechaCreacionUtc,
    bool TieneFicha = false);
