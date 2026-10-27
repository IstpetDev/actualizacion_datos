namespace Istpet.ActualizacionDatos.Application;

public sealed class ProteccionDatosException(string mensaje, string codigo) : Exception(mensaje)
{
    public string Codigo { get; } = codigo;
}
