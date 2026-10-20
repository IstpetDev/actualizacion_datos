using Istpet.ActualizacionDatos.Domain;

namespace Istpet.ActualizacionDatos.Domain.Tests;

public class InstitucionIdTests
{
    [Fact]
    public void InstitucionId_con_igual_valor_es_igual()
    {
        var valor = Guid.NewGuid();

        Assert.Equal(new InstitucionId(valor), new InstitucionId(valor));
    }
}
