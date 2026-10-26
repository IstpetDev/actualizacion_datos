namespace Istpet.ActualizacionDatos.Application.Tests;

using Istpet.ActualizacionDatos.Application.Servicios;
using Xunit;

public class DivisorNombresTests
{
    [Fact]
    public void Caso1_CuatroPalabrasSinParticulas_NoRequiereConfirmacion()
    {
        // Caso obligatorio ADR-0012: PEREZ GOMEZ ANA MARIA → Pérez, Gómez, Ana, María (sin confirmación).
        var resultado = DivisorNombres.Dividir("PEREZ GOMEZ ANA MARIA");

        Assert.Equal("PEREZ", resultado.PrimerApellido);
        Assert.Equal("GOMEZ", resultado.SegundoApellido);
        Assert.Equal("ANA", resultado.PrimerNombre);
        Assert.Equal("MARIA", resultado.SegundoNombre);
        Assert.False(resultado.RequiereConfirmacion);
    }

    [Fact]
    public void Caso2_TresPalabrasSinParticulas_RequiereConfirmacion()
    {
        // Caso obligatorio ADR-0012: PEREZ GOMEZ ANA → Pérez, Gómez, Ana, nulo (con confirmación).
        var resultado = DivisorNombres.Dividir("PEREZ GOMEZ ANA");

        Assert.Equal("PEREZ", resultado.PrimerApellido);
        Assert.Equal("GOMEZ", resultado.SegundoApellido);
        Assert.Equal("ANA", resultado.PrimerNombre);
        Assert.Null(resultado.SegundoNombre);
        Assert.True(resultado.RequiereConfirmacion);
    }

    [Fact]
    public void Caso3_ParticulasMultiplesCompuestas_UneParticulaYRequiereConfirmacion()
    {
        // Caso obligatorio ADR-0012: DE LA TORRE RUIZ LUIS → DE LA TORRE, Ruiz, Luis, nulo (con confirmación).
        var resultado = DivisorNombres.Dividir("DE LA TORRE RUIZ LUIS");

        Assert.Equal("DE LA TORRE", resultado.PrimerApellido);
        Assert.Equal("RUIZ", resultado.SegundoApellido);
        Assert.Equal("LUIS", resultado.PrimerNombre);
        Assert.Null(resultado.SegundoNombre);
        Assert.True(resultado.RequiereConfirmacion);
    }

    [Fact]
    public void Caso4_DosPalabras_AsignaPrimerApellidoYPrimerNombre_RequiereConfirmacion()
    {
        // Caso obligatorio ADR-0012: PEREZ ANA → Pérez, nulo, Ana, nulo (con confirmación).
        var resultado = DivisorNombres.Dividir("PEREZ ANA");

        Assert.Equal("PEREZ", resultado.PrimerApellido);
        Assert.Null(resultado.SegundoApellido);
        Assert.Equal("ANA", resultado.PrimerNombre);
        Assert.Null(resultado.SegundoNombre);
        Assert.True(resultado.RequiereConfirmacion);
    }

    [Theory]
    [InlineData("   ")]
    [InlineData("")]
    [InlineData(null)]
    public void Caso5_VacioOBloqueado_TodosNulos_RequiereConfirmacion(string? entrada)
    {
        // Caso obligatorio ADR-0012: "   " → todos nulos (con confirmación).
        var resultado = DivisorNombres.Dividir(entrada);

        Assert.Null(resultado.PrimerApellido);
        Assert.Null(resultado.SegundoApellido);
        Assert.Null(resultado.PrimerNombre);
        Assert.Null(resultado.SegundoNombre);
        Assert.True(resultado.RequiereConfirmacion);
    }

    [Fact]
    public void UnaSolaPalabra_AsignaPrimerApellido_RequiereConfirmacion()
    {
        var resultado = DivisorNombres.Dividir("PEREZ");

        Assert.Equal("PEREZ", resultado.PrimerApellido);
        Assert.Null(resultado.SegundoApellido);
        Assert.Null(resultado.PrimerNombre);
        Assert.Null(resultado.SegundoNombre);
        Assert.True(resultado.RequiereConfirmacion);
    }

    [Fact]
    public void MasDeCuatroPalabras_UneDesdeLaCuarta_RequiereConfirmacion()
    {
        var resultado = DivisorNombres.Dividir("LOPEZ PEREZ CARLOS ALBERTO SEBASTIAN");

        Assert.Equal("LOPEZ", resultado.PrimerApellido);
        Assert.Equal("PEREZ", resultado.SegundoApellido);
        Assert.Equal("CARLOS", resultado.PrimerNombre);
        Assert.Equal("ALBERTO SEBASTIAN", resultado.SegundoNombre);
        Assert.True(resultado.RequiereConfirmacion);
    }

    [Fact]
    public void CuatroPalabrasConParticulas_RequiereConfirmacion()
    {
        // 4 palabras pero hubo partícula: SAN MARTIN GOMEZ JUAN CARLOS -> 4 palabras resultantes
        var resultado = DivisorNombres.Dividir("SAN MARTIN GOMEZ JUAN CARLOS");

        Assert.Equal("SAN MARTIN", resultado.PrimerApellido);
        Assert.Equal("GOMEZ", resultado.SegundoApellido);
        Assert.Equal("JUAN", resultado.PrimerNombre);
        Assert.Equal("CARLOS", resultado.SegundoNombre);
        Assert.True(resultado.RequiereConfirmacion);
    }

    [Fact]
    public void PreservaTildesYEspaciosMultiples()
    {
        var resultado = DivisorNombres.Dividir("  PÉREZ    GÓMEZ   MARÍA   JOSÉ  ");

        Assert.Equal("PÉREZ", resultado.PrimerApellido);
        Assert.Equal("GÓMEZ", resultado.SegundoApellido);
        Assert.Equal("MARÍA", resultado.PrimerNombre);
        Assert.Equal("JOSÉ", resultado.SegundoNombre);
        Assert.False(resultado.RequiereConfirmacion);
    }
}
