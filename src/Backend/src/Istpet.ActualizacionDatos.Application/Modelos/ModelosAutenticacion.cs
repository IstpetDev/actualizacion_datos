namespace Istpet.ActualizacionDatos.Application.Modelos;

public sealed record LoginRequest(
    string Documento,
    string Contrasena,
    Guid? InstitucionId = null);

public sealed record ResultadoLoginDto(
    Guid Id,
    Guid InstitucionId,
    string Documento,
    string? Nombre,
    string? Correo,
    string Rol,
    bool DebeCambiarContrasena,
    bool CorreoVerificado);

public sealed record CambiarContrasenaRequest(
    string? ContrasenaActual,
    string NuevaContrasena);

public sealed record EnviarCodigoCorreoRequest(
    string Correo);

public sealed record VerificarCodigoCorreoRequest(
    string Codigo);

public sealed record SesionUsuarioDto(
    Guid Id,
    Guid InstitucionId,
    string Documento,
    string? Nombre,
    string? Correo,
    string Rol,
    bool DebeCambiarContrasena,
    bool CorreoVerificado);
