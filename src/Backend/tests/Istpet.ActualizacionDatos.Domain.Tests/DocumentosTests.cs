namespace Istpet.ActualizacionDatos.Domain.Tests;

using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.Documentos;
using Xunit;

public class DocumentosTests
{
    private readonly InstitucionId _institucionId = new(Guid.NewGuid());

    [Fact]
    public void Plantilla_se_crea_correctamente_y_publica_versiones_inmutables()
    {
        var plantilla = new PlantillaHojaDeVida(
            id: Guid.NewGuid(),
            nombre: "Plantilla Estándar",
            disenoBase: "clasico",
            configuracionJson: "{\"secciones\":[]}",
            descripcion: "Plantilla de prueba");

        Assert.Equal("Plantilla Estándar", plantilla.Nombre);
        Assert.Equal("clasico", plantilla.DisenoBase);
        Assert.False(plantilla.EsPredeterminada);
        Assert.Empty(plantilla.Versiones);

        var version1 = plantilla.PublicarVersion("Versión inicial publicada");

        Assert.Equal(1, version1.NumeroVersion);
        Assert.Equal(plantilla.DisenoBase, version1.DisenoBase);
        Assert.Equal(plantilla.ConfiguracionJson, version1.ConfiguracionJson);
        Assert.Equal("Versión inicial publicada", version1.DescripcionCambio);
        Assert.Single(plantilla.Versiones);

        // Modificamos el borrador
        plantilla.ActualizarBorrador("Plantilla Actualizada", "Nueva descripción", "{\"secciones\":[{\"codigo\":\"portada\"}]}");
        var version2 = plantilla.PublicarVersion("Segunda versión con portada");

        Assert.Equal(2, version2.NumeroVersion);
        Assert.Equal(2, plantilla.Versiones.Count);

        // La versión 1 sigue inmutable
        Assert.Equal("{\"secciones\":[]}", version1.ConfiguracionJson);
        Assert.Equal("{\"secciones\":[{\"codigo\":\"portada\"}]}", version2.ConfiguracionJson);
    }

    [Fact]
    public void Plantilla_permite_marcar_y_desmarcar_predeterminada()
    {
        var plantilla = new PlantillaHojaDeVida(
            id: Guid.NewGuid(),
            nombre: "Plantilla Predeterminada",
            disenoBase: "clasico",
            configuracionJson: "{}");

        Assert.False(plantilla.EsPredeterminada);

        plantilla.MarcarComoPredeterminada();
        Assert.True(plantilla.EsPredeterminada);

        plantilla.DesmarcarPredeterminada();
        Assert.False(plantilla.EsPredeterminada);
    }

    [Fact]
    public void Configuracion_institucion_valida_colores_hexadecimales()
    {
        var config = new ConfiguracionDocumentoInstitucion(_institucionId);

        Assert.Equal("#1A365D", config.ColorPrimario);
        Assert.Equal("#2B6CB0", config.ColorSecundario);

        config.ActualizarMarca(
            nombreVisible: "Instituto Ejemplo",
            logoArchivoId: null,
            portadaArchivoId: null,
            colorPrimario: "#FF0000",
            colorSecundario: "#00FF00",
            lema: "Un gran lema",
            textoCompromiso: "Compromiso institucional");

        Assert.Equal("#FF0000", config.ColorPrimario);
        Assert.Equal("#00FF00", config.ColorSecundario);
        Assert.Equal("Instituto Ejemplo", config.NombreVisible);

        var exPrimario = Assert.Throws<ReglaNegocioException>(() =>
            config.ActualizarMarca("Instituto", null, null, "invalido", "#00FF00", null, null));
        Assert.Contains("primario", exPrimario.Message, StringComparison.OrdinalIgnoreCase);

        var exSecundario = Assert.Throws<ReglaNegocioException>(() =>
            config.ActualizarMarca("Instituto", null, null, "#FF0000", "invalido", null, null));
        Assert.Contains("secundario", exSecundario.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Configuracion_institucion_permite_elegir_plantilla_y_version()
    {
        var config = new ConfiguracionDocumentoInstitucion(_institucionId);
        var plantillaId = Guid.NewGuid();
        var versionId = Guid.NewGuid();

        config.ElegirPlantilla(plantillaId, versionId);

        Assert.Equal(plantillaId, config.PlantillaId);
        Assert.Equal(versionId, config.VersionPlantillaId);
    }
}
