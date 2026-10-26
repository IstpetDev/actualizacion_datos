namespace Istpet.ActualizacionDatos.Domain.HojaDeVida;

// ADR-0009 (restricción) y ADR-0010, decisión 6: el tipo de documento es un dato
// por institución, no un enum. El código es la clave estable para marcas y exportación.
// Formatos y tamaño máximo los fija ADR-0006 para todos los tipos (ADR-0010, decisión 8).
public class TipoDocumento : EntidadInstitucional
{
    public Guid Id { get; private set; }
    public string Codigo { get; private set; }
    public string Nombre { get; private set; }
    public string? Descripcion { get; private set; }
    public bool TieneVencimiento { get; private set; }
    public int Orden { get; private set; }
    public bool Activo { get; private set; }

    private TipoDocumento()
    {
        Codigo = null!;
        Nombre = null!;
    }

    public TipoDocumento(
        Guid id,
        InstitucionId institucionId,
        string codigo,
        string nombre,
        string? descripcion = null,
        bool tieneVencimiento = false,
        int orden = 0,
        bool activo = true)
        : base(institucionId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(codigo);
        ArgumentException.ThrowIfNullOrWhiteSpace(nombre);

        Id = id;
        Codigo = codigo.Trim().ToUpperInvariant();
        Nombre = nombre.Trim();
        Descripcion = string.IsNullOrWhiteSpace(descripcion) ? null : descripcion.Trim();
        TieneVencimiento = tieneVencimiento;
        Orden = orden;
        Activo = activo;
    }

    public void Actualizar(string nombre, string? descripcion, bool tieneVencimiento, int orden, bool activo)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(nombre);
        Nombre = nombre.Trim();
        Descripcion = string.IsNullOrWhiteSpace(descripcion) ? null : descripcion.Trim();
        TieneVencimiento = tieneVencimiento;
        Orden = orden;
        Activo = activo;
    }
}
