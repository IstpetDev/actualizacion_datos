namespace Istpet.ActualizacionDatos.Domain.Tests;

using Istpet.ActualizacionDatos.Domain;

public class AuditoriaTests
{
    [Fact]
    public void Crear_auditoria_con_datos_validos_asigna_propiedades()
    {
        var id = Guid.NewGuid();
        var institucionId = InstitucionId.Nuevo();
        var auditoria = new Auditoria(id, "superadmin", "CREAR_INSTITUCION", institucionId, detalle: "Detalle de prueba");

        Assert.Equal(id, auditoria.Id);
        Assert.Equal("superadmin", auditoria.Actor);
        Assert.Equal("CREAR_INSTITUCION", auditoria.Accion);
        Assert.Equal(institucionId, auditoria.InstitucionId);
        Assert.Equal("Detalle de prueba", auditoria.Detalle);
        Assert.True(auditoria.FechaUtc <= DateTime.UtcNow);
    }

    [Theory]
    [InlineData("", "ACCION")]
    [InlineData("   ", "ACCION")]
    [InlineData("ACTOR", "")]
    [InlineData("ACTOR", "   ")]
    public void Crear_auditoria_con_campos_vacios_lanza_excepcion(string actor, string accion)
    {
        Assert.Throws<ArgumentException>(() =>
            new Auditoria(Guid.NewGuid(), actor, accion));
    }
}
