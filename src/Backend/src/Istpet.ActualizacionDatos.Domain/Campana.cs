namespace Istpet.ActualizacionDatos.Domain;

public class Campana : EntidadInstitucional
{
    public Guid Id { get; private set; }
    public string Nombre { get; private set; }
    public DateTime FechaInicioUtc { get; private set; }
    public DateTime FechaFinUtc { get; private set; }
    public bool Activa { get; private set; }

    private Campana()
    {
        Nombre = null!;
    }

    public Campana(
        Guid id,
        InstitucionId institucionId,
        string nombre,
        DateTime fechaInicioUtc,
        DateTime fechaFinUtc,
        bool activa = true)
        : base(institucionId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(nombre);
        if (fechaFinUtc < fechaInicioUtc)
        {
            throw new ArgumentException("La fecha de fin no puede ser anterior a la de inicio.", nameof(fechaFinUtc));
        }

        Id = id;
        Nombre = nombre.Trim();
        FechaInicioUtc = fechaInicioUtc;
        FechaFinUtc = fechaFinUtc;
        Activa = activa;
    }

    public bool EstaAbiertaEn(DateTime fechaUtc)
    {
        return Activa && fechaUtc >= FechaInicioUtc && fechaUtc <= FechaFinUtc;
    }

    public bool SeSolapaCon(DateTime inicioUtc, DateTime finUtc)
    {
        return Activa && FechaInicioUtc <= finUtc && FechaFinUtc >= inicioUtc;
    }
}
