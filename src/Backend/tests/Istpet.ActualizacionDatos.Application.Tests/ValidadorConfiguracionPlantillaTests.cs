namespace Istpet.ActualizacionDatos.Application.Tests;

using Istpet.ActualizacionDatos.Application.Documentos;
using Xunit;

public class ValidadorConfiguracionPlantillaTests
{
    [Fact]
    public void Configuracion_predeterminada_es_valida()
    {
        var config = ConfiguracionPlantilla.Predeterminada();
        var resultado = ValidadorConfiguracionPlantilla.Validar(config);

        Assert.True(resultado.EsValida);
        Assert.Empty(resultado.Errores);
    }

    [Fact]
    public void Diseno_base_desconocido_se_rechaza()
    {
        var config = new ConfiguracionPlantilla("diseno_inexistente", new List<SeccionPlantillaConfig>
        {
            new("portada", new List<string> { "nombre_completo" })
        });

        var resultado = ValidadorConfiguracionPlantilla.Validar(config);

        Assert.False(resultado.EsValida);
        Assert.Contains(resultado.Errores, e => e.Contains("diseno_inexistente", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Seccion_fuera_del_catalogo_se_rechaza_con_su_codigo()
    {
        var config = new ConfiguracionPlantilla(CatalogoCamposDocumento.DisenoClasico, new List<SeccionPlantillaConfig>
        {
            new("seccion_inventada", new List<string> { "campo_x" })
        });

        var resultado = ValidadorConfiguracionPlantilla.Validar(config);

        Assert.False(resultado.EsValida);
        Assert.Contains(resultado.Errores, e => e.Contains("seccion_inventada", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Campo_fuera_del_catalogo_se_rechaza_con_su_codigo()
    {
        var config = new ConfiguracionPlantilla(CatalogoCamposDocumento.DisenoClasico, new List<SeccionPlantillaConfig>
        {
            new(CatalogoCamposDocumento.Secciones.DatosPersonales, new List<string>
            {
                CatalogoCamposDocumento.CamposDatosPersonales.DocumentoIdentidad,
                "campo_no_permitido"
            })
        });

        var resultado = ValidadorConfiguracionPlantilla.Validar(config);

        Assert.False(resultado.EsValida);
        Assert.Contains(resultado.Errores, e => e.Contains("campo_no_permitido", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Secciones_repetidas_se_rechazan()
    {
        var config = new ConfiguracionPlantilla(CatalogoCamposDocumento.DisenoClasico, new List<SeccionPlantillaConfig>
        {
            new(CatalogoCamposDocumento.Secciones.Portada, new List<string> { CatalogoCamposDocumento.CamposPortada.NombreCompleto }),
            new(CatalogoCamposDocumento.Secciones.Portada, new List<string> { CatalogoCamposDocumento.CamposPortada.TipoPersonal })
        });

        var resultado = ValidadorConfiguracionPlantilla.Validar(config);

        Assert.False(resultado.EsValida);
        Assert.Contains(resultado.Errores, e => e.Contains(CatalogoCamposDocumento.Secciones.Portada, StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Campos_repetidos_dentro_de_la_misma_seccion_se_rechazan()
    {
        var config = new ConfiguracionPlantilla(CatalogoCamposDocumento.DisenoClasico, new List<SeccionPlantillaConfig>
        {
            new(CatalogoCamposDocumento.Secciones.Portada, new List<string>
            {
                CatalogoCamposDocumento.CamposPortada.NombreCompleto,
                CatalogoCamposDocumento.CamposPortada.NombreCompleto
            })
        });

        var resultado = ValidadorConfiguracionPlantilla.Validar(config);

        Assert.False(resultado.EsValida);
        Assert.Contains(resultado.Errores, e => e.Contains(CatalogoCamposDocumento.CamposPortada.NombreCompleto, StringComparison.OrdinalIgnoreCase));
    }

    [Theory]
    [InlineData("cuenta_bancaria")]
    [InlineData("tipo_sangre")]
    [InlineData("etnia")]
    [InlineData("discapacidad")]
    [InlineData("correo_personal")]
    [InlineData("password")]
    [InlineData("clave")]
    public void Catalogo_cerrado_nunca_contiene_campos_prohibidos(string campoProhibido)
    {
        Assert.False(CatalogoCamposDocumento.ContieneCampoEnCualquierSeccion(campoProhibido));
        Assert.Contains(campoProhibido, CatalogoCamposDocumento.CamposProhibidos);
    }

    [Theory]
    [InlineData("#1A365D", true)]
    [InlineData("#ffffff", true)]
    [InlineData("#000000", true)]
    [InlineData("1A365D", false)]
    [InlineData("#1A365", false)]
    [InlineData("#1A365DG", false)]
    [InlineData("azul", false)]
    [InlineData("", false)]
    public void Validacion_de_color_hexadecimal(string color, bool esperado)
    {
        var esValido = MarcaDocumento.EsColorHexValido(color);
        Assert.Equal(esperado, esValido);
    }

    [Fact]
    public void Marca_neutra_tiene_colores_validos_y_campos_esperados()
    {
        var neutra = MarcaDocumento.Neutra;

        Assert.True(MarcaDocumento.EsColorHexValido(neutra.ColorPrimario));
        Assert.True(MarcaDocumento.EsColorHexValido(neutra.ColorSecundario));
        Assert.NotNull(neutra.NombreVisible);
    }
}
