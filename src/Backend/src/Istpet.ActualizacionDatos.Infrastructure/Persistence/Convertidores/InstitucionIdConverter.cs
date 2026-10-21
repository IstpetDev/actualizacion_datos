namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Convertidores;

using Istpet.ActualizacionDatos.Domain;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

public sealed class InstitucionIdConverter : ValueConverter<InstitucionId, Guid>
{
    public InstitucionIdConverter()
        : base(id => id.Valor, valor => new InstitucionId(valor))
    {
    }
}
