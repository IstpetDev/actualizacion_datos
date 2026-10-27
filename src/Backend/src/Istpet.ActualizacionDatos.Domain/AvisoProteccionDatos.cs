namespace Istpet.ActualizacionDatos.Domain;

public sealed class AvisoProteccionDatos : EntidadInstitucional
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Version { get; private set; } = null!;
    public string Titulo { get; private set; } = null!;
    public string Responsable { get; private set; } = null!;
    public string Contenido { get; private set; } = null!;
    public string DeclaracionAceptacion { get; private set; } = null!;
    public string FuenteOficial { get; private set; } = null!;
    public string EvidenciaAprobacion { get; private set; } = null!;
    public int RolesDestinatarios { get; private set; }
    public DateTime VigenteDesdeUtc { get; private set; }
    public DateTime? VigenteHastaUtc { get; private set; }

    private AvisoProteccionDatos() { }

    public AvisoProteccionDatos(InstitucionId institucionId, string version, string titulo,
        string responsable, string contenido, string declaracionAceptacion, string fuenteOficial,
        string evidenciaAprobacion, RolUsuario[] rolesDestinatarios, DateTime vigenteDesdeUtc,
        DateTime? vigenteHastaUtc = null) : base(institucionId)
    {
        Version = Texto(version, 64);
        Titulo = Texto(titulo, 200);
        Responsable = Texto(responsable, 500);
        Contenido = Texto(contenido, 100_000);
        DeclaracionAceptacion = Texto(declaracionAceptacion, 1_000);
        FuenteOficial = Texto(fuenteOficial, 2_048);
        EvidenciaAprobacion = Texto(evidenciaAprobacion, 1_000);
        if (!Uri.TryCreate(FuenteOficial, UriKind.Absolute, out var fuente) ||
            fuente.Scheme != Uri.UriSchemeHttps || !string.IsNullOrEmpty(fuente.UserInfo))
            throw new ArgumentException("La fuente oficial debe ser una dirección HTTPS sin credenciales.");
        ArgumentNullException.ThrowIfNull(rolesDestinatarios);
        if (rolesDestinatarios.Length == 0)
            throw new ArgumentException("Debe indicar los roles destinatarios del aviso.");
        RolesDestinatarios = rolesDestinatarios.Aggregate(0, (mascara, rol) => mascara | MascaraRol(rol));
        if (vigenteDesdeUtc.Kind != DateTimeKind.Utc ||
            (vigenteHastaUtc.HasValue && (vigenteHastaUtc.Value.Kind != DateTimeKind.Utc || vigenteHastaUtc <= vigenteDesdeUtc)))
            throw new ArgumentException("La vigencia debe expresarse en UTC y su fin debe ser posterior al inicio.");
        VigenteDesdeUtc = vigenteDesdeUtc;
        VigenteHastaUtc = vigenteHastaUtc;
    }

    public static int MascaraRol(RolUsuario rol) => Enum.IsDefined(rol)
        ? 1 << ((int)rol - 1)
        : throw new ArgumentException("Rol destinatario inválido.");

    public bool AplicaA(RolUsuario rol) => (RolesDestinatarios & MascaraRol(rol)) != 0;

    public void FinalizarVigencia(DateTime fechaUtc)
    {
        if (fechaUtc.Kind != DateTimeKind.Utc || fechaUtc <= VigenteDesdeUtc ||
            (VigenteHastaUtc.HasValue && fechaUtc > VigenteHastaUtc.Value))
            throw new ReglaNegocioException("No se puede ampliar ni invertir la vigencia de un aviso publicado.");
        VigenteHastaUtc = fechaUtc;
    }

    private static string Texto(string valor, int maximo)
    {
        if (string.IsNullOrWhiteSpace(valor) || valor.Trim().Length > maximo)
            throw new ArgumentException($"Los textos del aviso son obligatorios y deben respetar su longitud máxima ({maximo}).");
        return valor.Trim();
    }
}
