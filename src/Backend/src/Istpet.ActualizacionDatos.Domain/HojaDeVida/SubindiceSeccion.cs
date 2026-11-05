namespace Istpet.ActualizacionDatos.Domain.HojaDeVida;

// ADR-0043, spec-0021: Subíndice libre configurable por institución y sección multi-registro.
// Sin TipoFuncionarioId, aplica a todas las personas de la institución.
public class SubindiceSeccion : EntidadInstitucional
{
    public Guid Id { get; private set; }
    public SeccionHojaDeVida Seccion { get; private set; }
    public string Nombre { get; private set; }
    public string? Descripcion { get; private set; }
    public Guid? TipoFuncionarioId { get; private set; }
    public bool EsObligatorio { get; private set; }
    public int Orden { get; private set; }
    public bool Activo { get; private set; }

    private SubindiceSeccion()
    {
        Nombre = null!;
    }

    public SubindiceSeccion(
        Guid id,
        InstitucionId institucionId,
        SeccionHojaDeVida seccion,
        string nombre,
        string? descripcion = null,
        Guid? tipoFuncionarioId = null,
        bool esObligatorio = true,
        int orden = 0,
        bool activo = true)
        : base(institucionId)
    {
        if (id == Guid.Empty)
        {
            throw new ArgumentException("El ID es obligatorio.", nameof(id));
        }

        ValidarSeccion(seccion);
        Nombre = ValidarNombre(nombre);
        Descripcion = ValidarDescripcion(descripcion);
        Id = id;
        Seccion = seccion;
        TipoFuncionarioId = tipoFuncionarioId;
        EsObligatorio = esObligatorio;
        Orden = orden;
        Activo = activo;
    }

    public static bool EsSeccionSoportada(SeccionHojaDeVida seccion) =>
        seccion is SeccionHojaDeVida.FormacionAcademica
            or SeccionHojaDeVida.ExperienciaLaboral
            or SeccionHojaDeVida.Capacitaciones
            or SeccionHojaDeVida.Referencias;

    public bool AplicaA(Guid? tipoFuncionarioId) =>
        Activo && (TipoFuncionarioId is null || TipoFuncionarioId == tipoFuncionarioId);

    public void Actualizar(
        SeccionHojaDeVida seccion,
        string nombre,
        string? descripcion,
        Guid? tipoFuncionarioId,
        bool esObligatorio,
        int orden,
        bool activo)
    {
        ValidarSeccion(seccion);
        Seccion = seccion;
        Nombre = ValidarNombre(nombre);
        Descripcion = ValidarDescripcion(descripcion);
        TipoFuncionarioId = tipoFuncionarioId;
        EsObligatorio = esObligatorio;
        Orden = orden;
        Activo = activo;
    }

    public void Desactivar()
    {
        Activo = false;
    }

    private static void ValidarSeccion(SeccionHojaDeVida seccion)
    {
        if (!EsSeccionSoportada(seccion))
        {
            throw new ReglaNegocioException("La sección seleccionada no admite subíndices configurables.");
        }
    }

    private static string ValidarNombre(string? nombre)
    {
        if (string.IsNullOrWhiteSpace(nombre) || nombre.Trim().Length > 150)
        {
            throw new ReglaNegocioException("El nombre del subíndice es obligatorio y no puede superar 150 caracteres.");
        }

        return nombre.Trim();
    }

    private static string? ValidarDescripcion(string? descripcion)
    {
        if (string.IsNullOrWhiteSpace(descripcion))
        {
            return null;
        }

        var limpia = descripcion.Trim();
        if (limpia.Length > 500)
        {
            throw new ReglaNegocioException("La descripción del subíndice no puede superar 500 caracteres.");
        }

        return limpia;
    }
}
