using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Domain;

namespace Istpet.ActualizacionDatos.Application.Tests;

public class ArquitecturaTests
{
    [Fact]
    public void Domain_no_depende_de_otras_capas()
    {
        var referencias = typeof(InstitucionId).Assembly
            .GetReferencedAssemblies()
            .Select(a => a.Name ?? string.Empty);

        Assert.DoesNotContain(referencias, n => n.StartsWith("Istpet.ActualizacionDatos", StringComparison.Ordinal));
    }

    [Fact]
    public void Application_no_depende_de_infrastructure_ni_webapi()
    {
        var referencias = typeof(IContextoInstitucion).Assembly
            .GetReferencedAssemblies()
            .Select(a => a.Name ?? string.Empty);

        Assert.DoesNotContain(referencias, n => n.Contains("Infrastructure", StringComparison.Ordinal));
        Assert.DoesNotContain(referencias, n => n.Contains("WebApi", StringComparison.Ordinal));
    }
}
