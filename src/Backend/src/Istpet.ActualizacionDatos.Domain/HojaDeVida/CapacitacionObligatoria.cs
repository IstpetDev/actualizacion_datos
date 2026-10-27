namespace Istpet.ActualizacionDatos.Domain.HojaDeVida;

// ADR-0029, ADR-0032: Capacitación obligatoria configurada por la institución.
// Sin TipoFuncionarioId, aplica a todas las personas de la institución.
// Si tiene FechaRealizacion y la persona tiene FechaIngresoInstitucion posterior,
// se considera exenta automáticamente por nuevo ingreso.
public class CapacitacionObligatoria : EntidadInstitucional
{
    public Guid Id { get; private set; }
    public string Nombre { get; private set; }
    public string? InstitucionOrganizadora { get; private set; }
    public int? HorasEsperadas { get; private set; }
    public DateOnly? FechaRealizacion { get; private set; }
    public Guid? TipoFuncionarioId { get; private set; }
    public bool Activo { get; private set; }
    public int Orden { get; private set; }

    private CapacitacionObligatoria()
    {
        Nombre = null!;
    }

    public CapacitacionObligatoria(
        Guid id,
        InstitucionId institucionId,
        string nombre,
        string? institucionOrganizadora = null,
        int? horasEsperadas = null,
        DateOnly? fechaRealizacion = null,
        Guid? tipoFuncionarioId = null,
        bool activo = true,
        int orden = 0)
        : base(institucionId)
    {
        if (id == Guid.Empty)
        {
            throw new ArgumentException("El ID es obligatorio.", nameof(id));
        }

        if (string.IsNullOrWhiteSpace(nombre))
        {
            throw new ReglaNegocioException("El nombre de la capacitación obligatoria es obligatorio.");
        }

        if (horasEsperadas is <= 0)
        {
            throw new ReglaNegocioException("Las horas esperadas deben ser mayores a cero.");
        }

        Id = id;
        Nombre = nombre.Trim();
        InstitucionOrganizadora = string.IsNullOrWhiteSpace(institucionOrganizadora) ? null : institucionOrganizadora.Trim();
        HorasEsperadas = horasEsperadas;
        FechaRealizacion = fechaRealizacion;
        TipoFuncionarioId = tipoFuncionarioId;
        Activo = activo;
        Orden = orden;
    }

    public bool AplicaA(Guid? tipoFuncionarioId) =>
        Activo && (TipoFuncionarioId is null || TipoFuncionarioId == tipoFuncionarioId);

    public bool EsExentoPorNuevoIngreso(DateOnly? fechaIngresoPersona) =>
        FechaRealizacion.HasValue && fechaIngresoPersona.HasValue && fechaIngresoPersona.Value > FechaRealizacion.Value;

    public void Actualizar(
        string nombre,
        string? institucionOrganizadora,
        int? horasEsperadas,
        DateOnly? fechaRealizacion,
        Guid? tipoFuncionarioId,
        bool activo,
        int orden)
    {
        if (string.IsNullOrWhiteSpace(nombre))
        {
            throw new ReglaNegocioException("El nombre de la capacitación obligatoria es obligatorio.");
        }

        if (horasEsperadas is <= 0)
        {
            throw new ReglaNegocioException("Las horas esperadas deben ser mayores a cero.");
        }

        Nombre = nombre.Trim();
        InstitucionOrganizadora = string.IsNullOrWhiteSpace(institucionOrganizadora) ? null : institucionOrganizadora.Trim();
        HorasEsperadas = horasEsperadas;
        FechaRealizacion = fechaRealizacion;
        TipoFuncionarioId = tipoFuncionarioId;
        Activo = activo;
        Orden = orden;
    }

    public void Desactivar()
    {
        Activo = false;
    }

    public void Activar()
    {
        Activo = true;
    }
}
