namespace Istpet.ActualizacionDatos.Domain.HojaDeVida;

// ADR-0010, decisión 7: qué documento se pide a qué tipo de funcionario.
// Sin tipo de funcionario, el requisito aplica a todas las personas de la institución.
public class RequisitoDocumento : EntidadInstitucional
{
    public Guid Id { get; private set; }
    public Guid TipoDocumentoId { get; private set; }
    public Guid? TipoFuncionarioId { get; private set; }
    public bool EsObligatorio { get; private set; }
    public bool Activo { get; private set; }

    private RequisitoDocumento()
    {
    }

    public RequisitoDocumento(
        Guid id,
        InstitucionId institucionId,
        Guid tipoDocumentoId,
        Guid? tipoFuncionarioId = null,
        bool esObligatorio = true,
        bool activo = true)
        : base(institucionId)
    {
        if (tipoDocumentoId == Guid.Empty)
        {
            throw new ArgumentException("El tipo de documento es obligatorio.", nameof(tipoDocumentoId));
        }

        Id = id;
        TipoDocumentoId = tipoDocumentoId;
        TipoFuncionarioId = tipoFuncionarioId;
        EsObligatorio = esObligatorio;
        Activo = activo;
    }

    public bool AplicaA(Guid? tipoFuncionarioId) =>
        Activo && (TipoFuncionarioId is null || TipoFuncionarioId == tipoFuncionarioId);

    public void Actualizar(bool esObligatorio, bool activo)
    {
        EsObligatorio = esObligatorio;
        Activo = activo;
    }
}
