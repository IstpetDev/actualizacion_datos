namespace Istpet.ActualizacionDatos.Application.Modelos;

public sealed record AdminInicialRequest(
    string Documento,
    string? Nombre = null,
    string? Correo = null);

public sealed record CrearInstitucionRequest(
    string Nombre,
    List<AdminInicialRequest>? Admins = null);

public sealed record AsignarAdminsRequest(
    List<AdminInicialRequest> Admins);

[System.Text.Json.Serialization.JsonUnmappedMemberHandling(System.Text.Json.Serialization.JsonUnmappedMemberHandling.Disallow)]
public sealed record AsignarPersonalInstitucionalRequest(
    string Documento,
    string Rol,
    string? Nombre = null,
    string? Correo = null);

public sealed record InstitucionDto(
    Guid Id,
    string Nombre,
    bool Activa,
    DateTime FechaCreacionUtc);

public sealed record GuardarDominiosCorreoRequest(string[] DominiosCorreoPermitidos);
