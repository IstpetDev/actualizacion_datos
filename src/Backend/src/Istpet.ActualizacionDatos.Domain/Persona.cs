namespace Istpet.ActualizacionDatos.Domain;

public class Persona : EntidadInstitucional
{
    public Guid Id { get; private set; }
    public string Documento { get; private set; }
    public string? Nombre { get; private set; }
    public string? Correo { get; private set; }
    public RolUsuario Rol { get; private set; }
    public bool AccesoHabilitado { get; private set; }
    public EstadoActualizacion EstadoActualizacion { get; private set; }
    public string? DatosPersonalesJson { get; private set; }
    public string? ArchivosSubidosJson { get; private set; }
    public DateTime FechaCreacionUtc { get; private set; }

    private Persona()
    {
        Documento = null!;
    }

    public Persona(
        Guid id,
        InstitucionId institucionId,
        string documento,
        RolUsuario rol = RolUsuario.Usuario,
        string? nombre = null,
        string? correo = null,
        bool accesoHabilitado = false,
        EstadoActualizacion estadoActualizacion = EstadoActualizacion.Borrador,
        DateTime? fechaCreacionUtc = null)
        : base(institucionId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(documento);

        Id = id;
        Documento = documento.Trim();
        Rol = rol;
        Nombre = string.IsNullOrWhiteSpace(nombre) ? null : nombre.Trim();
        Correo = string.IsNullOrWhiteSpace(correo) ? null : correo.Trim();
        AccesoHabilitado = accesoHabilitado;
        EstadoActualizacion = estadoActualizacion;
        FechaCreacionUtc = fechaCreacionUtc ?? DateTime.UtcNow;
    }

    public void HabilitarAcceso()
    {
        AccesoHabilitado = true;
    }

    public void DeshabilitarAcceso()
    {
        AccesoHabilitado = false;
    }

    public void ActualizarBorrador(string datosJson)
    {
        DatosPersonalesJson = datosJson;
    }

    public void RegistrarArchivoSubido(string archivoInfo)
    {
        ArchivosSubidosJson = archivoInfo;
    }
}
