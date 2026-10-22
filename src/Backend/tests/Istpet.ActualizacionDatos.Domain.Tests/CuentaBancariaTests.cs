namespace Istpet.ActualizacionDatos.Domain.Tests;

using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;

// ADR-0013 y RF-HDV-025, 026. El dominio recibe el número ya protegido; aquí la «huella» es un texto ficticio.
public class CuentaBancariaTests
{
    private const int Ahorros = 51;
    private static readonly DateTime Ahora = new(2026, 10, 22, 12, 0, 0, DateTimeKind.Utc);
    private static readonly InstitucionId Institucion = InstitucionId.Nuevo();

    private static NumeroCuentaProtegido Numero(string ultimos, string huella) => new("v1.cifrado-ficticio", ultimos, huella);

    private static DatosCuentaBancaria Datos(string ultimos = "1234", string huella = "huella-a", int? bancoId = null, string? otro = "Banco ficticio") =>
        new(Ahorros, bancoId, otro, Numero(ultimos, huella));

    [Fact]
    public void Registrada_por_la_persona_sin_nomina_queda_sin_nomina_y_enmascarada()
    {
        var cuenta = CuentaBancaria.RegistradaPorPersona(Guid.NewGuid(), Institucion, Guid.NewGuid(), Datos(), Ahora);

        Assert.Equal(EstadoCuentaBancaria.SinNomina, cuenta.Estado);
        Assert.Null(cuenta.HuellaNomina);
        Assert.Equal("******1234", cuenta.NumeroEnmascarado);
        Assert.Equal("Banco ficticio", cuenta.NombreBancoOtro);
    }

    [Fact]
    public void Desde_nomina_queda_sin_confirmar_y_guarda_la_huella_de_la_nomina()
    {
        var cuenta = CuentaBancaria.DesdeNomina(Guid.NewGuid(), Institucion, Guid.NewGuid(), Datos(huella: "huella-nomina"), Ahora);

        Assert.Equal(EstadoCuentaBancaria.SinConfirmar, cuenta.Estado);
        Assert.Equal("huella-nomina", cuenta.HuellaNomina);
    }

    [Fact]
    public void Confirmar_la_propuesta_la_deja_en_coincide()
    {
        var cuenta = CuentaBancaria.DesdeNomina(Guid.NewGuid(), Institucion, Guid.NewGuid(), Datos(), Ahora);

        cuenta.ConfirmarPropuesta(Ahora.AddMinutes(5));

        Assert.Equal(EstadoCuentaBancaria.Coincide, cuenta.Estado);
        Assert.Equal(Ahora.AddMinutes(5), cuenta.FechaActualizacionUtc);
    }

    [Fact]
    public void Solo_se_confirma_una_propuesta_sin_confirmar()
    {
        var propia = CuentaBancaria.RegistradaPorPersona(Guid.NewGuid(), Institucion, Guid.NewGuid(), Datos(), Ahora);
        var yaConfirmada = CuentaBancaria.DesdeNomina(Guid.NewGuid(), Institucion, Guid.NewGuid(), Datos(), Ahora);
        yaConfirmada.ConfirmarPropuesta(Ahora);

        Assert.Throws<ReglaNegocioException>(() => propia.ConfirmarPropuesta(Ahora));
        Assert.Throws<ReglaNegocioException>(() => yaConfirmada.ConfirmarPropuesta(Ahora));
    }

    [Fact]
    public void Corregir_compara_con_la_huella_de_la_nomina_en_cada_cambio()
    {
        var cuenta = CuentaBancaria.DesdeNomina(Guid.NewGuid(), Institucion, Guid.NewGuid(), Datos("1234", "huella-nomina"), Ahora);

        cuenta.Corregir(Datos("9999", "huella-otra"), Ahora);
        Assert.Equal(EstadoCuentaBancaria.Difiere, cuenta.Estado);
        Assert.Equal("huella-nomina", cuenta.HuellaNomina);
        Assert.Equal("9999", cuenta.UltimosDigitos);

        cuenta.Corregir(Datos("1234", "huella-nomina"), Ahora);
        Assert.Equal(EstadoCuentaBancaria.Coincide, cuenta.Estado);
    }

    [Fact]
    public void Corregir_una_cuenta_sin_nomina_sigue_sin_nomina()
    {
        var cuenta = CuentaBancaria.RegistradaPorPersona(Guid.NewGuid(), Institucion, Guid.NewGuid(), Datos(), Ahora);

        cuenta.Corregir(Datos("5678", "huella-b"), Ahora);

        Assert.Equal(EstadoCuentaBancaria.SinNomina, cuenta.Estado);
        Assert.Equal("5678", cuenta.UltimosDigitos);
    }

    [Theory]
    [InlineData(null, null)]
    [InlineData(null, "   ")]
    [InlineData(1000, "Banco ficticio")]
    public void El_banco_va_del_catalogo_o_escrito_pero_no_ambos_ni_ninguno(int? bancoId, string? otro)
    {
        Assert.Throws<ReglaNegocioException>(() =>
            CuentaBancaria.RegistradaPorPersona(Guid.NewGuid(), Institucion, Guid.NewGuid(), Datos(bancoId: bancoId, otro: otro), Ahora));
    }

    [Fact]
    public void El_tipo_de_cuenta_es_obligatorio()
    {
        var datos = new DatosCuentaBancaria(0, null, "Banco ficticio", Numero("1234", "h"));

        Assert.Throws<ReglaNegocioException>(() =>
            CuentaBancaria.RegistradaPorPersona(Guid.NewGuid(), Institucion, Guid.NewGuid(), datos, Ahora));
    }

    [Theory]
    [InlineData("123")]
    [InlineData("12345")]
    [InlineData("12a4")]
    public void Los_ultimos_digitos_son_cuatro_numeros(string ultimos)
    {
        Assert.Throws<ArgumentException>(() =>
            CuentaBancaria.RegistradaPorPersona(Guid.NewGuid(), Institucion, Guid.NewGuid(), Datos(ultimos: ultimos), Ahora));
    }

    [Fact]
    public void Sin_numero_protegido_no_se_crea()
    {
        var datos = new DatosCuentaBancaria(Ahorros, null, "Banco ficticio", new NumeroCuentaProtegido("", "1234", "h"));

        Assert.Throws<ArgumentException>(() =>
            CuentaBancaria.RegistradaPorPersona(Guid.NewGuid(), Institucion, Guid.NewGuid(), datos, Ahora));
    }
}
