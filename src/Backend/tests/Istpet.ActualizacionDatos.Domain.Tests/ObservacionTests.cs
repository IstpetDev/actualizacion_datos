namespace Istpet.ActualizacionDatos.Domain.Tests;

using Istpet.ActualizacionDatos.Domain;

public class ObservacionTests
{
    [Fact]
    public void Crear_observacion_con_datos_validos_inicializa_correctamente()
    {
        var instId = InstitucionId.Nuevo();
        var personaId = Guid.NewGuid();
        var obsId = Guid.NewGuid();

        var observacion = new Observacion(
            obsId,
            instId,
            personaId,
            ronda: 1,
            autor: "supervisor_docente",
            texto: "Falta adjuntar el certificado de votación actualizado.");

        Assert.Equal(obsId, observacion.Id);
        Assert.Equal(instId, observacion.InstitucionId);
        Assert.Equal(personaId, observacion.PersonaId);
        Assert.Equal(1, observacion.Ronda);
        Assert.Equal("supervisor_docente", observacion.Autor);
        Assert.Equal("Falta adjuntar el certificado de votación actualizado.", observacion.Texto);
        Assert.Empty(observacion.Marcas);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Crear_observacion_sin_texto_general_lanza_excepcion(string textoInvalido)
    {
        // RF-FLU-003, ADR-0008: La observación general es obligatoria para devolver
        Assert.Throws<ReglaNegocioException>(() =>
            new Observacion(
                Guid.NewGuid(),
                InstitucionId.Nuevo(),
                Guid.NewGuid(),
                1,
                "supervisor",
                textoInvalido));
    }

    [Fact]
    public void Observacion_con_marcas_de_campo_y_archivo_agrega_marcas()
    {
        var obsId = Guid.NewGuid();
        var observacion = new Observacion(
            obsId,
            InstitucionId.Nuevo(),
            Guid.NewGuid(),
            1,
            "supervisor",
            "Por favor revise los campos señalados.");

        var marcaCampo = new MarcaObservacion(
            Guid.NewGuid(),
            obsId,
            TipoDestinoMarca.Campo,
            claveDestino: "telefono",
            texto: "El número debe tener 10 dígitos.");

        var marcaArchivo = new MarcaObservacion(
            Guid.NewGuid(),
            obsId,
            TipoDestinoMarca.Archivo,
            claveDestino: "cedula_pdf",
            texto: "El documento está borroso, vuelva a escanear.");

        observacion.AgregarMarca(marcaCampo);
        observacion.AgregarMarca(marcaArchivo);

        Assert.Equal(2, observacion.Marcas.Count);
        Assert.Contains(observacion.Marcas, m => m.TipoDestino == TipoDestinoMarca.Campo && m.ClaveDestino == "telefono");
        Assert.Contains(observacion.Marcas, m => m.TipoDestino == TipoDestinoMarca.Archivo && m.ClaveDestino == "cedula_pdf");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Crear_marca_sin_texto_lanza_excepcion(string textoInvalido)
    {
        Assert.Throws<ReglaNegocioException>(() =>
            new MarcaObservacion(
                Guid.NewGuid(),
                Guid.NewGuid(),
                TipoDestinoMarca.Campo,
                "direccion",
                textoInvalido));
    }
}
