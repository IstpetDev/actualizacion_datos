namespace Istpet.ActualizacionDatos.Domain.HojaDeVida;

// Valores de la ficha personal. Los *Id apuntan a elementos_catalogo; que cada uno
// sea del tipo correcto lo comprueba la capa de aplicación (ADR-0010, decisión 5).
public sealed record DatosFichaPersonal(
    string? PrimerNombre = null,
    string? SegundoNombre = null,
    string? PrimerApellido = null,
    string? SegundoApellido = null,
    int? SexoId = null,
    DateOnly? FechaNacimiento = null,
    int? EstadoCivilId = null,
    int? TipoSangreId = null,
    int? EtniaId = null,
    int? NacionalidadIndigenaId = null,
    int? PaisNacionalidadId = null,
    int? PaisNacimientoId = null,
    int? ParroquiaNacimientoId = null,
    int? ParroquiaResidenciaId = null,
    string? CallePrincipal = null,
    string? CalleSecundaria = null,
    string? NumeroCasa = null,
    string? ReferenciaDomicilio = null,
    string? CodigoPostal = null,
    string? TelefonoConvencional = null,
    string? Celular = null,
    string? CorreoInstitucional = null,
    int? DiscapacidadId = null,
    int? PorcentajeDiscapacidad = null,
    string? NumeroCarnetDiscapacidad = null,
    string? Perfil = null);

// ADR-0010, decisiones 1 y 2: datos personales de la hoja de vida, 1 a 1 con la persona.
// Equivale a las columnas de datos personales de `profesores` en el sistema de origen.
// La obligatoriedad de cada campo no se valida aquí sino al enviar (ADR-0009: validaciones
// en un solo lugar de la capa de aplicación); aquí solo se protegen las coherencias internas.
public class FichaPersonal : EntidadInstitucional
{
    public Guid PersonaId { get; private set; }

    public string? PrimerNombre { get; private set; }
    public string? SegundoNombre { get; private set; }
    public string? PrimerApellido { get; private set; }
    public string? SegundoApellido { get; private set; }
    public int? SexoId { get; private set; }
    public DateOnly? FechaNacimiento { get; private set; }
    public int? EstadoCivilId { get; private set; }
    public int? TipoSangreId { get; private set; }

    public int? EtniaId { get; private set; }
    public int? NacionalidadIndigenaId { get; private set; }
    public int? PaisNacionalidadId { get; private set; }
    public int? PaisNacimientoId { get; private set; }
    public int? ParroquiaNacimientoId { get; private set; }

    public int? ParroquiaResidenciaId { get; private set; }
    public string? CallePrincipal { get; private set; }
    public string? CalleSecundaria { get; private set; }
    public string? NumeroCasa { get; private set; }
    public string? ReferenciaDomicilio { get; private set; }
    public string? CodigoPostal { get; private set; }

    public string? TelefonoConvencional { get; private set; }
    public string? Celular { get; private set; }
    public string? CorreoInstitucional { get; private set; }

    public int? DiscapacidadId { get; private set; }
    public int? PorcentajeDiscapacidad { get; private set; }
    public string? NumeroCarnetDiscapacidad { get; private set; }

    // Texto libre del apartado «Perfil» del formato de hoja de vida; opcional.
    public string? Perfil { get; private set; }

    public Guid? FotoArchivoId { get; private set; }
    public DateTime FechaActualizacionUtc { get; private set; }

    private FichaPersonal()
    {
    }

    public FichaPersonal(InstitucionId institucionId, Guid personaId, DateTime? fechaUtc = null)
        : base(institucionId)
    {
        if (personaId == Guid.Empty)
        {
            throw new ArgumentException("La persona es obligatoria.", nameof(personaId));
        }

        PersonaId = personaId;
        FechaActualizacionUtc = fechaUtc ?? DateTime.UtcNow;
    }

    public void Actualizar(DatosFichaPersonal datos, DateTime? fechaUtc = null)
    {
        ArgumentNullException.ThrowIfNull(datos);

        if (datos.PorcentajeDiscapacidad is < 0 or > 100)
        {
            throw new ReglaNegocioException("El porcentaje de discapacidad debe estar entre 0 y 100.");
        }

        if (datos.DiscapacidadId is null &&
            (datos.PorcentajeDiscapacidad is not null || !string.IsNullOrWhiteSpace(datos.NumeroCarnetDiscapacidad)))
        {
            throw new ReglaNegocioException("No se puede registrar porcentaje ni carné de discapacidad sin indicar la discapacidad.");
        }

        PrimerNombre = Limpiar(datos.PrimerNombre);
        SegundoNombre = Limpiar(datos.SegundoNombre);
        PrimerApellido = Limpiar(datos.PrimerApellido);
        SegundoApellido = Limpiar(datos.SegundoApellido);
        SexoId = datos.SexoId;
        FechaNacimiento = datos.FechaNacimiento;
        EstadoCivilId = datos.EstadoCivilId;
        TipoSangreId = datos.TipoSangreId;

        EtniaId = datos.EtniaId;
        NacionalidadIndigenaId = datos.NacionalidadIndigenaId;
        PaisNacionalidadId = datos.PaisNacionalidadId;
        PaisNacimientoId = datos.PaisNacimientoId;
        ParroquiaNacimientoId = datos.ParroquiaNacimientoId;

        ParroquiaResidenciaId = datos.ParroquiaResidenciaId;
        CallePrincipal = Limpiar(datos.CallePrincipal);
        CalleSecundaria = Limpiar(datos.CalleSecundaria);
        NumeroCasa = Limpiar(datos.NumeroCasa);
        ReferenciaDomicilio = Limpiar(datos.ReferenciaDomicilio);
        CodigoPostal = Limpiar(datos.CodigoPostal);

        TelefonoConvencional = Limpiar(datos.TelefonoConvencional);
        Celular = Limpiar(datos.Celular);
        CorreoInstitucional = Limpiar(datos.CorreoInstitucional);

        DiscapacidadId = datos.DiscapacidadId;
        PorcentajeDiscapacidad = datos.DiscapacidadId is null ? null : datos.PorcentajeDiscapacidad;
        NumeroCarnetDiscapacidad = datos.DiscapacidadId is null ? null : Limpiar(datos.NumeroCarnetDiscapacidad);

        Perfil = Limpiar(datos.Perfil);

        FechaActualizacionUtc = fechaUtc ?? DateTime.UtcNow;
    }

    public void AsociarFoto(Guid? archivoId, DateTime? fechaUtc = null)
    {
        FotoArchivoId = archivoId;
        FechaActualizacionUtc = fechaUtc ?? DateTime.UtcNow;
    }

    private static string? Limpiar(string? valor) =>
        string.IsNullOrWhiteSpace(valor) ? null : valor.Trim();
}
