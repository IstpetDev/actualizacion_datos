namespace Istpet.ActualizacionDatos.Application.Modelos;

// ADR-0013. Fuera de la pantalla del dueño nunca viaja el número completo: solo la máscara y los últimos cuatro dígitos.

/// <summary>Estado: "sin-confirmar", "coincide", "difiere" o "sin-nomina".</summary>
public sealed record CuentaBancariaDto(
    Guid Id,
    int TipoCuentaId,
    string? TipoCuenta,
    int? BancoId,
    string Banco,
    string NumeroEnmascarado,
    string UltimosDigitos,
    string Estado,
    DateTime FechaActualizacionUtc);

/// <summary>Numero admite espacios y guiones; se guardan solo los dígitos. BancoId o NombreBancoOtro, no ambos.</summary>
public sealed record GuardarCuentaBancariaRequest(
    int TipoCuentaId,
    string Numero,
    int? BancoId = null,
    string? NombreBancoOtro = null);

public sealed record NumeroCuentaCompletoDto(
    string Numero);

/// <summary>Estado: "sin-registrar", "sin-confirmar", "coincide", "difiere" o "sin-nomina".</summary>
public sealed record EstadoCuentaPersonaDto(
    Guid PersonaId,
    string Documento,
    string? Nombre,
    string Estado,
    string? Banco,
    string? TipoCuenta,
    string? UltimosDigitos);

/// <summary>Cuenta que trae la nómina, ya traducida a catálogo por la carga (T-09).</summary>
public sealed record CuentaNominaPropuesta(
    int TipoCuentaId,
    string Numero,
    int? BancoId = null,
    string? NombreBancoOtro = null);
