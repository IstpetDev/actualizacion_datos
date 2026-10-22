namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using System.Security.Cryptography;
using System.Text;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

/// <summary>
/// ADR-0013, decisión 3: AES-256-GCM (cifrado autenticado) para el número y HMAC-SHA256 para la huella.
/// Claves en configuración: CuentaBancaria:ClaveCifrado y CuentaBancaria:ClaveHuella, en Base64, de 32 bytes
/// o más (la de cifrado, exactamente 32). En el servidor llegan por variables de entorno desde el .env (ADR-0011);
/// nunca desde el repositorio. Si faltan, la funcionalidad responde 503, salvo que
/// CuentaBancaria:PermitirClavesTemporales sea true (solo desarrollo y pruebas): entonces se generan claves
/// en memoria y lo cifrado se pierde al reiniciar.
/// Formato guardado: "v1." + Base64(nonce[12] | cifrado | etiqueta[16]). El prefijo permite rotar el formato.
/// </summary>
public sealed partial class ProtectorCuentaBancariaAesGcm : IProtectorCuentaBancaria
{
    private const string Version = "v1";
    private const int LargoNonce = 12;
    private const int LargoEtiqueta = 16;
    private static readonly byte[] DatosAsociados = "istpet:cuenta-bancaria:v1"u8.ToArray();

    private readonly byte[]? _claveCifrado;
    private readonly byte[]? _claveHuella;

    public ProtectorCuentaBancariaAesGcm(IConfiguration configuracion, ILogger<ProtectorCuentaBancariaAesGcm> logger)
    {
        var cifrado = LeerClave(configuracion["CuentaBancaria:ClaveCifrado"], largoExacto: 32);
        var huella = LeerClave(configuracion["CuentaBancaria:ClaveHuella"], largoExacto: null);

        if (cifrado != null && huella != null)
        {
            _claveCifrado = cifrado;
            _claveHuella = huella;
            return;
        }

        if (string.Equals(configuracion["CuentaBancaria:PermitirClavesTemporales"], "true", StringComparison.OrdinalIgnoreCase))
        {
            _claveCifrado = RandomNumberGenerator.GetBytes(32);
            _claveHuella = RandomNumberGenerator.GetBytes(32);
            LogClavesTemporales(logger);
            return;
        }

        LogSinClaves(logger);
    }

    public bool EstaConfigurado => _claveCifrado != null && _claveHuella != null;

    public NumeroCuentaProtegido Proteger(string numeroNormalizado)
    {
        var (claveCifrado, claveHuella) = Claves();
        ArgumentException.ThrowIfNullOrWhiteSpace(numeroNormalizado);

        var claro = Encoding.UTF8.GetBytes(numeroNormalizado);
        var paquete = new byte[LargoNonce + claro.Length + LargoEtiqueta];
        var nonce = paquete.AsSpan(0, LargoNonce);
        var cifrado = paquete.AsSpan(LargoNonce, claro.Length);
        var etiqueta = paquete.AsSpan(LargoNonce + claro.Length, LargoEtiqueta);
        RandomNumberGenerator.Fill(nonce);

        using (var aes = new AesGcm(claveCifrado, LargoEtiqueta))
        {
            aes.Encrypt(nonce, claro, cifrado, etiqueta, DatosAsociados);
        }

        CryptographicOperations.ZeroMemory(claro);

        return new NumeroCuentaProtegido(
            $"{Version}.{Convert.ToBase64String(paquete)}",
            numeroNormalizado[^4..],
            Convert.ToHexStringLower(HMACSHA256.HashData(claveHuella, Encoding.UTF8.GetBytes(numeroNormalizado))));
    }

    public string Descifrar(string numeroCifrado)
    {
        var (claveCifrado, _) = Claves();

        try
        {
            if (!numeroCifrado.StartsWith(Version + ".", StringComparison.Ordinal))
            {
                throw new CryptographicException("Versión de cifrado desconocida.");
            }

            var paquete = Convert.FromBase64String(numeroCifrado[(Version.Length + 1)..]);
            var largoCifrado = paquete.Length - LargoNonce - LargoEtiqueta;
            if (largoCifrado <= 0)
            {
                throw new CryptographicException("Paquete demasiado corto.");
            }

            var claro = new byte[largoCifrado];
            using var aes = new AesGcm(claveCifrado, LargoEtiqueta);
            aes.Decrypt(
                paquete.AsSpan(0, LargoNonce),
                paquete.AsSpan(LargoNonce, largoCifrado),
                paquete.AsSpan(LargoNonce + largoCifrado, LargoEtiqueta),
                claro,
                DatosAsociados);
            return Encoding.UTF8.GetString(claro);
        }
        catch (Exception ex) when (ex is CryptographicException or FormatException)
        {
            // Clave cambiada o perdida, o dato alterado. No se revela nada del contenido.
            throw new ReglaNegocioException("No se pudo leer el número de cuenta guardado. Vuelva a registrarlo.");
        }
    }

    private (byte[] Cifrado, byte[] Huella) Claves() =>
        _claveCifrado != null && _claveHuella != null
            ? (_claveCifrado, _claveHuella)
            : throw new CuentaBancariaNoDisponibleException();

    private static byte[]? LeerClave(string? base64, int? largoExacto)
    {
        if (string.IsNullOrWhiteSpace(base64))
        {
            return null;
        }

        try
        {
            var clave = Convert.FromBase64String(base64.Trim());
            var valida = largoExacto is { } exacto ? clave.Length == exacto : clave.Length >= 32;
            return valida ? clave : null;
        }
        catch (FormatException)
        {
            return null;
        }
    }

    [LoggerMessage(EventId = 2001, Level = LogLevel.Warning,
        Message = "Cuenta bancaria: se usan claves temporales en memoria (PermitirClavesTemporales). Lo cifrado se pierde al reiniciar. No usar en producción.")]
    private static partial void LogClavesTemporales(ILogger logger);

    [LoggerMessage(EventId = 2002, Level = LogLevel.Warning,
        Message = "Cuenta bancaria: faltan o no son válidas CuentaBancaria:ClaveCifrado (32 bytes en Base64) y CuentaBancaria:ClaveHuella (32 bytes o más). La funcionalidad responde 503.")]
    private static partial void LogSinClaves(ILogger logger);
}
