namespace Istpet.ActualizacionDatos.Domain.HojaDeVida;

// ADR-0028, spec-0010: Registro de sección por institución. La ausencia de fila equivale a abierta.
public class SeccionInstitucion : EntidadInstitucional
{
    public Guid Id { get; private set; }
    public SeccionHojaDeVida Seccion { get; private set; }
    public bool Habilitada { get; private set; }
    public DateTime UltimaModificacionUtc { get; private set; }
    public string ModificadoPor { get; private set; } = null!;

    private SeccionInstitucion() { }

    public SeccionInstitucion(
        InstitucionId institucionId,
        SeccionHojaDeVida seccion,
        bool habilitada,
        string modificadoPor,
        DateTime? fechaModificacionUtc = null)
        : base(institucionId)
    {
        if (seccion == SeccionHojaDeVida.FichaPersonal && !habilitada)
        {
            throw new ReglaNegocioException("La ficha personal no puede cerrarse.");
        }

        Id = Guid.NewGuid();
        Seccion = seccion;
        Habilitada = habilitada;
        ModificadoPor = string.IsNullOrWhiteSpace(modificadoPor) ? "sistema" : modificadoPor.Trim();
        UltimaModificacionUtc = fechaModificacionUtc ?? DateTime.UtcNow;
    }

    public void CambiarEstado(bool habilitada, string modificadoPor, DateTime? fechaModificacionUtc = null)
    {
        if (Seccion == SeccionHojaDeVida.FichaPersonal && !habilitada)
        {
            throw new ReglaNegocioException("La ficha personal no puede cerrarse.");
        }

        Habilitada = habilitada;
        ModificadoPor = string.IsNullOrWhiteSpace(modificadoPor) ? "sistema" : modificadoPor.Trim();
        UltimaModificacionUtc = fechaModificacionUtc ?? DateTime.UtcNow;
    }
}
