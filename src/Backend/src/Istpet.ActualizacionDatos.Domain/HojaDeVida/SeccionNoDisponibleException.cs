namespace Istpet.ActualizacionDatos.Domain.HojaDeVida;

public sealed class SeccionNoDisponibleException : ReglaNegocioException
{
    public SeccionNoDisponibleException(string? mensaje = null)
        : base(mensaje ?? "La sección ya no está disponible.")
    {
    }
}
