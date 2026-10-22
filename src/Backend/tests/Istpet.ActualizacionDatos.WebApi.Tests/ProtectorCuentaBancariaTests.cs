namespace Istpet.ActualizacionDatos.WebApi.Tests;

using System.Security.Cryptography;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Infrastructure.Servicios;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

// ADR-0013, decisión 3: cifrado autenticado y huella con clave. Las claves de estas pruebas se generan
// al azar en cada ejecución; ninguna clave ni cuenta real.
public class ProtectorCuentaBancariaTests
{
    private const string Cuenta = "0000001234";

    private static ProtectorCuentaBancariaAesGcm Crear(string? claveCifrado, string? claveHuella, bool temporales = false)
    {
        var valores = new Dictionary<string, string?>
        {
            ["CuentaBancaria:ClaveCifrado"] = claveCifrado,
            ["CuentaBancaria:ClaveHuella"] = claveHuella,
            ["CuentaBancaria:PermitirClavesTemporales"] = temporales ? "true" : null,
        };
        var configuracion = new ConfigurationBuilder().AddInMemoryCollection(valores).Build();
        return new ProtectorCuentaBancariaAesGcm(configuracion, NullLogger<ProtectorCuentaBancariaAesGcm>.Instance);
    }

    private static string ClaveAlAzar(int bytes = 32) => Convert.ToBase64String(RandomNumberGenerator.GetBytes(bytes));

    private static ProtectorCuentaBancariaAesGcm Configurado() => Crear(ClaveAlAzar(), ClaveAlAzar());

    [Theory]
    [InlineData("0000001234", "0000001234")]
    [InlineData("0000-001 234", "0000001234")]
    [InlineData("123456", "123456")]
    [InlineData("12345678901234567890", "12345678901234567890")]
    public void Normaliza_dejando_solo_digitos(string entrada, string esperado)
    {
        Assert.Equal(esperado, NumeroCuentaBancaria.Normalizar(entrada));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("12345")]
    [InlineData("123456789012345678901")]
    [InlineData("00000O1234")]
    [InlineData("0000.001234")]
    public void Rechaza_numeros_invalidos(string? entrada)
    {
        Assert.Throws<ReglaNegocioException>(() => NumeroCuentaBancaria.Normalizar(entrada));
    }

    [Fact]
    public void Cifra_y_descifra_sin_dejar_el_numero_en_claro()
    {
        var protector = Configurado();

        var protegido = protector.Proteger(Cuenta);

        Assert.StartsWith("v1.", protegido.Cifrado, StringComparison.Ordinal);
        Assert.DoesNotContain(Cuenta, protegido.Cifrado, StringComparison.Ordinal);
        Assert.Equal("1234", protegido.UltimosDigitos);
        Assert.Equal(64, protegido.Huella.Length);
        Assert.Equal(Cuenta, protector.Descifrar(protegido.Cifrado));
    }

    [Fact]
    public void Cada_cifrado_es_distinto_pero_la_huella_es_la_misma()
    {
        var protector = Configurado();

        var a = protector.Proteger(Cuenta);
        var b = protector.Proteger(Cuenta);

        Assert.NotEqual(a.Cifrado, b.Cifrado);
        Assert.Equal(a.Huella, b.Huella);
        Assert.NotEqual(a.Huella, protector.Proteger("0000001235").Huella);
    }

    [Fact]
    public void La_huella_depende_de_la_clave_no_solo_del_numero()
    {
        Assert.NotEqual(Configurado().Proteger(Cuenta).Huella, Configurado().Proteger(Cuenta).Huella);
    }

    [Fact]
    public void Un_dato_alterado_o_con_otra_clave_no_se_descifra()
    {
        var protector = Configurado();
        var cifrado = protector.Proteger(Cuenta).Cifrado;
        var bytes = Convert.FromBase64String(cifrado[3..]);
        bytes[^1] ^= 0x01;
        var alterado = "v1." + Convert.ToBase64String(bytes);

        Assert.Throws<ReglaNegocioException>(() => protector.Descifrar(alterado));
        Assert.Throws<ReglaNegocioException>(() => Configurado().Descifrar(cifrado));
        Assert.Throws<ReglaNegocioException>(() => protector.Descifrar("v2." + cifrado[3..]));
        Assert.Throws<ReglaNegocioException>(() => protector.Descifrar("v1.no-es-base64"));
    }

    [Theory]
    [InlineData(null, null)]
    [InlineData("clave-que-no-es-base64", "x")]
    [InlineData("AAAA", "AAAA")]
    public void Sin_claves_validas_no_esta_configurado_y_no_cifra(string? cifrado, string? huella)
    {
        var protector = Crear(cifrado, huella);

        Assert.False(protector.EstaConfigurado);
        Assert.Throws<CuentaBancariaNoDisponibleException>(() => protector.Proteger(Cuenta));
    }

    [Fact]
    public void La_clave_de_cifrado_debe_tener_exactamente_32_bytes()
    {
        Assert.False(Crear(ClaveAlAzar(16), ClaveAlAzar()).EstaConfigurado);
        Assert.False(Crear(ClaveAlAzar(64), ClaveAlAzar()).EstaConfigurado);
        Assert.True(Crear(ClaveAlAzar(32), ClaveAlAzar(64)).EstaConfigurado);
    }

    [Fact]
    public void Con_claves_temporales_permitidas_funciona_sin_configurar_claves()
    {
        var protector = Crear(null, null, temporales: true);

        Assert.True(protector.EstaConfigurado);
        Assert.Equal(Cuenta, protector.Descifrar(protector.Proteger(Cuenta).Cifrado));
    }
}
