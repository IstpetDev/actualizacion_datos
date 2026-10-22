namespace Istpet.ActualizacionDatos.WebApi.Tests;

using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

// ADR-0004: un olvido del filtro por institución en una entidad nueva sería una fuga de datos.
// Estas pruebas leen el modelo de EF sin conectarse a la base.
public class ModeloPersistenciaTests
{
    private static AplicacionDbContext CrearContexto()
    {
        var opciones = new DbContextOptionsBuilder<AplicacionDbContext>()
            .UseNpgsql("Host=localhost;Database=modelo_sin_conexion")
            .UseSnakeCaseNamingConvention()
            .Options;

        return new AplicacionDbContext(opciones);
    }

    [Fact]
    public void Toda_entidad_institucional_tiene_filtro_global()
    {
        using var contexto = CrearContexto();

        var sinFiltro = contexto.Model.GetEntityTypes()
            .Where(e => typeof(IEntidadInstitucional).IsAssignableFrom(e.ClrType))
            .Where(e => e.GetDeclaredQueryFilters().Count == 0)
            .Select(e => e.ClrType.Name)
            .ToList();

        Assert.Empty(sinFiltro);
    }

    [Theory]
    [InlineData(typeof(FichaPersonal))]
    [InlineData(typeof(TituloAcademico))]
    [InlineData(typeof(TituloEnCurso))]
    [InlineData(typeof(Capacitacion))]
    [InlineData(typeof(ExperienciaLaboral))]
    [InlineData(typeof(DocumentoPersonal))]
    [InlineData(typeof(TipoDocumento))]
    [InlineData(typeof(TipoFuncionario))]
    [InlineData(typeof(RequisitoDocumento))]
    public void Entidades_de_hoja_de_vida_son_institucionales(Type tipo)
    {
        using var contexto = CrearContexto();

        var entidad = contexto.Model.FindEntityType(tipo);

        Assert.NotNull(entidad);
        Assert.True(typeof(IEntidadInstitucional).IsAssignableFrom(tipo));
        Assert.NotNull(entidad.FindProperty(nameof(IEntidadInstitucional.InstitucionId)));
    }

    [Fact]
    public void Catalogo_compartido_no_tiene_filtro_por_institucion()
    {
        using var contexto = CrearContexto();

        var catalogo = contexto.Model.FindEntityType(typeof(ElementoCatalogo));

        Assert.NotNull(catalogo);
        Assert.Empty(catalogo.GetDeclaredQueryFilters());
    }
}
