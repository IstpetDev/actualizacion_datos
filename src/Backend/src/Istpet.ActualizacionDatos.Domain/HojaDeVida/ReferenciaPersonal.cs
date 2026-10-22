namespace Istpet.ActualizacionDatos.Domain.HojaDeVida;

public enum TipoReferencia
{
    Personal,
    Familiar
}

public sealed record DatosReferencia(
    TipoReferencia Tipo,
    string NombresApellidos,
    string Telefono,
    string? Titulo = null,
    string? CargoActual = null,
    string? Empresa = null);

// Referencias de la hoja de vida (formato institucional de docentes). El formato pide dos
// personales y dos familiares; que haya al menos dos personales se comprueba al enviar,
// en la capa de aplicación (ADR-0009: validaciones en un solo lugar), no aquí.
public class ReferenciaPersonal : RegistroHojaDeVida
{
    public TipoReferencia Tipo { get; private set; }
    public string NombresApellidos { get; private set; }
    public string Telefono { get; private set; }
    public string? Titulo { get; private set; }
    public string? CargoActual { get; private set; }
    public string? Empresa { get; private set; }

    private ReferenciaPersonal()
    {
        NombresApellidos = null!;
        Telefono = null!;
    }

    public ReferenciaPersonal(Guid id, InstitucionId institucionId, Guid personaId, DatosReferencia datos, DateTime? fechaUtc = null)
        : base(id, institucionId, personaId, fechaUtc)
    {
        NombresApellidos = null!;
        Telefono = null!;
        Aplicar(datos);
    }

    public void Actualizar(DatosReferencia datos, DateTime? fechaUtc = null)
    {
        Aplicar(datos);
        MarcarActualizado(fechaUtc);
    }

    private void Aplicar(DatosReferencia datos)
    {
        ArgumentNullException.ThrowIfNull(datos);

        if (!Enum.IsDefined(datos.Tipo))
        {
            throw new ReglaNegocioException("El tipo de referencia no es válido.");
        }

        Tipo = datos.Tipo;
        NombresApellidos = Obligatorio(datos.NombresApellidos, "nombres y apellidos de la referencia");
        Telefono = Obligatorio(datos.Telefono, "teléfono de la referencia");
        Titulo = Limpiar(datos.Titulo);
        CargoActual = Limpiar(datos.CargoActual);
        Empresa = Limpiar(datos.Empresa);
    }
}
