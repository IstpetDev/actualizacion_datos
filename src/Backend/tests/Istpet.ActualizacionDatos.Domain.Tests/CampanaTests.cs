namespace Istpet.ActualizacionDatos.Domain.Tests;

using Istpet.ActualizacionDatos.Domain;

public class CampanaTests
{
    [Fact]
    public void Crear_campana_con_rango_valido_asigna_propiedades()
    {
        var institucionId = InstitucionId.Nuevo();
        var inicio = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var fin = new DateTime(2026, 1, 31, 23, 59, 59, DateTimeKind.Utc);

        var campana = new Campana(
            Guid.NewGuid(),
            institucionId,
            "Campaña 2026-I",
            inicio,
            fin);

        Assert.Equal(institucionId, campana.InstitucionId);
        Assert.Equal("Campaña 2026-I", campana.Nombre);
        Assert.Equal(inicio, campana.FechaInicioUtc);
        Assert.Equal(fin, campana.FechaFinUtc);
        Assert.True(campana.Activa);
    }

    [Fact]
    public void Crear_campana_con_fecha_fin_anterior_a_inicio_lanza_excepcion()
    {
        var institucionId = InstitucionId.Nuevo();
        var inicio = new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc);
        var fin = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        var excepcion = Assert.Throws<ArgumentException>(() =>
            new Campana(Guid.NewGuid(), institucionId, "Campaña Inválida", inicio, fin));

        Assert.Contains("anterior", excepcion.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Crear_campana_con_nombre_vacio_lanza_excepcion(string nombreInvalido)
    {
        var institucionId = InstitucionId.Nuevo();
        var inicio = DateTime.UtcNow;
        var fin = inicio.AddDays(10);

        Assert.Throws<ArgumentException>(() =>
            new Campana(Guid.NewGuid(), institucionId, nombreInvalido, inicio, fin));
    }
}
