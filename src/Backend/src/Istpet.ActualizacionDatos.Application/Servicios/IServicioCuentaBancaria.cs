namespace Istpet.ActualizacionDatos.Application.Servicios;

using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;

// RF-HDV-025 a 027, ADR-0013. T-10 (#45).
public interface IServicioCuentaBancaria
{
    /// <summary>Cuenta de la persona, enmascarada. Nulo si no tiene.</summary>
    Task<CuentaBancariaDto?> ObtenerMiaAsync(string documento, CancellationToken ct = default);

    /// <summary>Número completo, solo para su dueño. Cada lectura queda en la auditoría, sin el número (ADR-0013 dec. 4 y 6).</summary>
    Task<NumeroCuentaCompletoDto> LeerMiNumeroAsync(string documento, CancellationToken ct = default);

    /// <summary>Registra o corrige la cuenta. Solo en borrador o devuelto y con campaña abierta.</summary>
    Task<CuentaBancariaDto> GuardarMiaAsync(string documento, GuardarCuentaBancariaRequest request, CancellationToken ct = default);

    /// <summary>Confirma sin cambios la cuenta precargada desde la nómina (RF-HDV-026).</summary>
    Task<CuentaBancariaDto> ConfirmarMiaAsync(string documento, CancellationToken ct = default);

    /// <summary>Cuenta de otra persona de la institución, enmascarada (supervisor y admin).</summary>
    Task<CuentaBancariaDto?> ObtenerParaRevisionAsync(string documento, CancellationToken ct = default);

    /// <summary>Estado de cuenta de cada persona de la institución, sin número (RF-HDV-027).</summary>
    Task<List<EstadoCuentaPersonaDto>> ListarEstadosAsync(CancellationToken ct = default);

    /// <summary>
    /// Para la carga de nómina (T-09): guarda la cuenta de la nómina como propuesta «sin confirmar».
    /// Si la persona ya tiene cuenta, no la sobrescribe (ADR-0012) y devuelve false.
    /// </summary>
    Task<bool> RegistrarPropuestaNominaAsync(Guid personaId, CuentaNominaPropuesta propuesta, CancellationToken ct = default);
}

/// <summary>
/// Cifrado autenticado y huella con clave (ADR-0013 dec. 3). Las claves viven fuera de la base y del
/// repositorio (configuración «CuentaBancaria», .env del servidor según ADR-0011).
/// </summary>
public interface IProtectorCuentaBancaria
{
    bool EstaConfigurado { get; }

    NumeroCuentaProtegido Proteger(string numeroNormalizado);

    string Descifrar(string numeroCifrado);
}

/// <summary>La cuenta bancaria no está disponible porque faltan las claves. La API responde 503.</summary>
public sealed class CuentaBancariaNoDisponibleException : ReglaNegocioException
{
    public CuentaBancariaNoDisponibleException()
        : base("La cuenta bancaria no está disponible: el servidor no tiene configuradas las claves de cifrado.")
    {
    }
}

public static class NumeroCuentaBancaria
{
    public const int LargoMinimo = 6;
    public const int LargoMaximo = 20;

    /// <summary>
    /// Deja solo los dígitos (acepta espacios y guiones al escribir) y exige entre 6 y 20.
    /// Las cuentas de Ecuador tienen 10 dígitos en su mayoría; el rango admite otros formatos sin inventar uno.
    /// </summary>
    public static string Normalizar(string? numero)
    {
        var limpio = new string((numero ?? string.Empty).Where(c => c is not (' ' or '-')).ToArray());
        if (limpio.Length is < LargoMinimo or > LargoMaximo || !limpio.All(char.IsAsciiDigit))
        {
            throw new ReglaNegocioException($"El número de cuenta debe tener entre {LargoMinimo} y {LargoMaximo} dígitos.");
        }

        return limpio;
    }
}
