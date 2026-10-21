namespace Istpet.ActualizacionDatos.Domain.Tests;

using Istpet.ActualizacionDatos.Domain;

public class InstitucionTests
{
    [Fact]
    public void Crear_institucion_valida_asigna_propiedades()
    {
        var id = InstitucionId.Nuevo();
        var institucion = new Institucion(id, "Instituto Tecnológico Ejemplo");

        Assert.Equal(id, institucion.Id);
        Assert.Equal("Instituto Tecnológico Ejemplo", institucion.Nombre);
        Assert.True(institucion.Activa);
        Assert.True(institucion.FechaCreacionUtc <= DateTime.UtcNow);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Crear_institucion_con_nombre_vacio_lanza_excepcion(string nombreInvalido)
    {
        var id = InstitucionId.Nuevo();

        Assert.Throws<ArgumentException>(() => new Institucion(id, nombreInvalido));
    }
}
