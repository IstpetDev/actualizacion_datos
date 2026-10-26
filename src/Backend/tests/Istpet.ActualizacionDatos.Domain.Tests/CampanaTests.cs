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

    [Fact]
    public void EstaAbiertaEn_evalua_correctamente_el_rango()
    {
        var inicio = new DateTime(2026, 5, 1, 0, 0, 0, DateTimeKind.Utc);
        var fin = new DateTime(2026, 5, 31, 23, 59, 59, DateTimeKind.Utc);

        var campana = new Campana(Guid.NewGuid(), InstitucionId.Nuevo(), "Campaña Mayo", inicio, fin);

        Assert.True(campana.EstaAbiertaEn(new DateTime(2026, 5, 15, 12, 0, 0, DateTimeKind.Utc)));
        Assert.False(campana.EstaAbiertaEn(new DateTime(2026, 4, 30, 23, 59, 59, DateTimeKind.Utc)));
        Assert.False(campana.EstaAbiertaEn(new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc)));
    }

    [Fact]
    public void SeSolapaCon_detecta_solapamiento_entre_rangos()
    {
        var inicio = new DateTime(2026, 5, 10, 0, 0, 0, DateTimeKind.Utc);
        var fin = new DateTime(2026, 5, 20, 0, 0, 0, DateTimeKind.Utc);

        var campana = new Campana(Guid.NewGuid(), InstitucionId.Nuevo(), "Campaña Base", inicio, fin);

        // Solapamiento parcial anterior
        Assert.True(campana.SeSolapaCon(new DateTime(2026, 5, 5, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 5, 12, 0, 0, 0, DateTimeKind.Utc)));
        // Solapamiento interno
        Assert.True(campana.SeSolapaCon(new DateTime(2026, 5, 12, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 5, 18, 0, 0, 0, DateTimeKind.Utc)));
        // Solapamiento total envolvente
        Assert.True(campana.SeSolapaCon(new DateTime(2026, 5, 1, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 5, 30, 0, 0, 0, DateTimeKind.Utc)));
        // Sin solapamiento anterior
        Assert.False(campana.SeSolapaCon(new DateTime(2026, 5, 1, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 5, 9, 0, 0, 0, DateTimeKind.Utc)));
        // Sin solapamiento posterior
        Assert.False(campana.SeSolapaCon(new DateTime(2026, 5, 21, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 5, 30, 0, 0, 0, DateTimeKind.Utc)));
    }
}
