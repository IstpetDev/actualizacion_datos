namespace Istpet.ActualizacionDatos.Domain.HojaDeVida;

public sealed record DatosDocumentoPersonal(
    string? NumeroDocumento = null,
    string? EntidadEmisora = null,
    DateOnly? FechaEmision = null,
    DateOnly? FechaVencimiento = null,
    string? CategoriaLicencia = null,
    int? PuntosLicencia = null);

// Documento del expediente personal (cédula, certificado de votación, licencia, etc.).
// Equivale a `doc_funcionario_documento` del sistema de origen. Uno por persona y tipo:
// sin historial ni estados de vigencia (ADR-0010, decisión 9).
public class DocumentoPersonal : RegistroHojaDeVida
{
    public Guid TipoDocumentoId { get; private set; }
    public string? NumeroDocumento { get; private set; }
    public string? EntidadEmisora { get; private set; }
    public DateOnly? FechaEmision { get; private set; }
    public DateOnly? FechaVencimiento { get; private set; }

    // ADR-0010, decisión 12: solo aplican a licencias de conducir; sin lógica propia.
    public string? CategoriaLicencia { get; private set; }
    public int? PuntosLicencia { get; private set; }

    private DocumentoPersonal()
    {
    }

    public DocumentoPersonal(
        Guid id,
        InstitucionId institucionId,
        Guid personaId,
        Guid tipoDocumentoId,
        DatosDocumentoPersonal datos,
        DateTime? fechaUtc = null)
        : base(id, institucionId, personaId, fechaUtc)
    {
        if (tipoDocumentoId == Guid.Empty)
        {
            throw new ArgumentException("El tipo de documento es obligatorio.", nameof(tipoDocumentoId));
        }

        TipoDocumentoId = tipoDocumentoId;
        Aplicar(datos);
    }

    public void Actualizar(DatosDocumentoPersonal datos, DateTime? fechaUtc = null)
    {
        Aplicar(datos);
        MarcarActualizado(fechaUtc);
    }

    private void Aplicar(DatosDocumentoPersonal datos)
    {
        ArgumentNullException.ThrowIfNull(datos);

        if (datos.FechaEmision is not null && datos.FechaVencimiento is not null &&
            datos.FechaVencimiento < datos.FechaEmision)
        {
            throw new ReglaNegocioException("La fecha de vencimiento no puede ser anterior a la fecha de emisión.");
        }

        if (datos.PuntosLicencia is < 0)
        {
            throw new ReglaNegocioException("Los puntos de la licencia no pueden ser negativos.");
        }

        NumeroDocumento = Limpiar(datos.NumeroDocumento);
        EntidadEmisora = Limpiar(datos.EntidadEmisora);
        FechaEmision = datos.FechaEmision;
        FechaVencimiento = datos.FechaVencimiento;
        CategoriaLicencia = Limpiar(datos.CategoriaLicencia);
        PuntosLicencia = datos.PuntosLicencia;
    }
}
