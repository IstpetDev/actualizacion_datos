namespace Istpet.ActualizacionDatos.Domain;

public sealed record InstitucionId(Guid Valor)
{
    public static InstitucionId Nuevo() => new(Guid.NewGuid());
}
