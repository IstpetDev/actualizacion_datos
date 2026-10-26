namespace Istpet.ActualizacionDatos.Domain.HojaDeVida;

// ADR-0010, decisión 6: propio de cada institución (p. ej. docente, administrativo, instructor).
public class TipoFuncionario : EntidadInstitucional
{
    public Guid Id { get; private set; }
    public string Codigo { get; private set; }
    public string Nombre { get; private set; }
    public bool EsDocente { get; private set; }
    public bool Activo { get; private set; }

    private TipoFuncionario()
    {
        Codigo = null!;
        Nombre = null!;
    }

    public TipoFuncionario(
        Guid id,
        InstitucionId institucionId,
        string codigo,
        string nombre,
        bool esDocente = false,
        bool activo = true)
        : base(institucionId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(codigo);
        ArgumentException.ThrowIfNullOrWhiteSpace(nombre);

        Id = id;
        Codigo = codigo.Trim().ToUpperInvariant();
        Nombre = nombre.Trim();
        EsDocente = esDocente;
        Activo = activo;
    }

    public void Actualizar(string nombre, bool esDocente, bool activo)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(nombre);
        Nombre = nombre.Trim();
        EsDocente = esDocente;
        Activo = activo;
    }
}
