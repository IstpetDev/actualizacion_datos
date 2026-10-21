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

    // Autenticación según ADR-0007
    public string? PasswordHash { get; private set; }
    public bool DebeCambiarContrasena { get; private set; } = true;
    public int IntentosFallidos { get; private set; }
    public DateTime? BloqueadoHastaUtc { get; private set; }

    // Verificación de correo según ADR-0007 (RF-ACC-005)
    public bool CorreoVerificado { get; private set; }
    public string? CodigoVerificacionCorreoHash { get; private set; }
    public DateTime? CodigoVerificacionExpiracionUtc { get; private set; }
    public int IntentosCodigoVerificacion { get; private set; }

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
        DateTime? fechaCreacionUtc = null,
        string? passwordHash = null,
        bool debeCambiarContrasena = true,
        bool correoVerificado = false)
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
        PasswordHash = passwordHash;
        DebeCambiarContrasena = debeCambiarContrasena;
        CorreoVerificado = correoVerificado;
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

    public void EstablecerPasswordHash(string passwordHash, bool debeCambiarContrasena = true)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(passwordHash);
        PasswordHash = passwordHash;
        DebeCambiarContrasena = debeCambiarContrasena;
    }

    public void CambiarContrasena(string nuevoPasswordHash)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(nuevoPasswordHash);
        PasswordHash = nuevoPasswordHash;
        DebeCambiarContrasena = false;
        ResetearIntentosFallidos();
    }

    public void RegistrarIntentoFallido(DateTime ahoraUtc)
    {
        IntentosFallidos++;
        if (IntentosFallidos >= 5)
        {
            BloqueadoHastaUtc = ahoraUtc.AddMinutes(15);
        }
    }

    public void ResetearIntentosFallidos()
    {
        IntentosFallidos = 0;
        BloqueadoHastaUtc = null;
    }

    public bool EstaBloqueado(DateTime ahoraUtc)
    {
        if (BloqueadoHastaUtc.HasValue)
        {
            if (ahoraUtc < BloqueadoHastaUtc.Value)
            {
                return true;
            }
            // El bloqueo ya expiró
            ResetearIntentosFallidos();
        }
        return false;
    }

    public void ActualizarCorreo(string nuevoCorreo)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(nuevoCorreo);
        var correoNormalizado = nuevoCorreo.Trim();
        if (!string.Equals(Correo, correoNormalizado, StringComparison.OrdinalIgnoreCase))
        {
            Correo = correoNormalizado;
            CorreoVerificado = false;
            CodigoVerificacionCorreoHash = null;
            CodigoVerificacionExpiracionUtc = null;
            IntentosCodigoVerificacion = 0;
        }
    }

    public void GenerarCodigoVerificacionCorreo(string codigoHash, DateTime expiracionUtc, string? nuevoCorreo = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(codigoHash);

        if (!string.IsNullOrWhiteSpace(nuevoCorreo))
        {
            ActualizarCorreo(nuevoCorreo);
        }

        if (string.IsNullOrWhiteSpace(Correo))
        {
            throw new ReglaNegocioException("No se puede generar un código de verificación sin un correo electrónico.");
        }

        CodigoVerificacionCorreoHash = codigoHash;
        CodigoVerificacionExpiracionUtc = expiracionUtc;
        IntentosCodigoVerificacion = 0;
    }

    public bool ValidarCodigoVerificacion(string codigoHash, DateTime ahoraUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(codigoHash);

        if (string.IsNullOrWhiteSpace(CodigoVerificacionCorreoHash) ||
            !CodigoVerificacionExpiracionUtc.HasValue ||
            ahoraUtc > CodigoVerificacionExpiracionUtc.Value)
        {
            throw new ReglaNegocioException("El código de verificación ha expirado o no ha sido solicitado.");
        }

        if (IntentosCodigoVerificacion >= 5)
        {
            throw new ReglaNegocioException("Se ha superado el número máximo de intentos para este código.");
        }

        IntentosCodigoVerificacion++;

        if (CodigoVerificacionCorreoHash != codigoHash)
        {
            return false;
        }

        CorreoVerificado = true;
        CodigoVerificacionCorreoHash = null;
        CodigoVerificacionExpiracionUtc = null;
        IntentosCodigoVerificacion = 0;
        return true;
    }
}
