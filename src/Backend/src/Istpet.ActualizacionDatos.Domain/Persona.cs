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
    public DateTime FechaCreacionUtc { get; private set; }

    // ADR-0010: el tipo de funcionario define qué documentos personales se piden
    public Guid? TipoFuncionarioId { get; private set; }

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

    // Tratamiento de datos según RF-DAT-001
    public bool TratamientoDatosAceptado { get; private set; }
    public DateTime? FechaAceptacionTratamientoDatosUtc { get; private set; }

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
        bool correoVerificado = false,
        bool tratamientoDatosAceptado = false,
        DateTime? fechaAceptacionTratamientoDatosUtc = null)
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
        TratamientoDatosAceptado = tratamientoDatosAceptado;
        FechaAceptacionTratamientoDatosUtc = fechaAceptacionTratamientoDatosUtc;
    }

    public void HabilitarAcceso()
    {
        AccesoHabilitado = true;
    }

    public void DeshabilitarAcceso()
    {
        AccesoHabilitado = false;
    }

    public bool PuedeEditarHojaDeVida =>
        EstadoActualizacion == EstadoActualizacion.Borrador ||
        EstadoActualizacion == EstadoActualizacion.Devuelto;

    // ADR-0010, decisión 11: las secciones de la hoja de vida se editan en el lugar,
    // por eso todo cambio en ellas pasa por esta comprobación.
    public void AsegurarEdicionPermitida()
    {
        if (!PuedeEditarHojaDeVida)
        {
            throw new ReglaNegocioException("No se puede modificar la información mientras está en revisión o ya ha sido aprobada.");
        }
    }

    public void AsignarTipoFuncionario(Guid? tipoFuncionarioId)
    {
        TipoFuncionarioId = tipoFuncionarioId;
    }

    public void ActualizarBorrador(string datosJson)
    {
        AsegurarEdicionPermitida();
        DatosPersonalesJson = datosJson;
    }

    // PD-HDV-04 (spec-0003) y RF-FLU-005: quien ya fue aprobado vuelve a actualizar con una acción
    // explícita al entrar. La campaña abierta la comprueba el servicio, que es quien la conoce.
    public void IniciarNuevaActualizacion()
    {
        if (EstadoActualizacion != EstadoActualizacion.Aprobado)
        {
            throw new ReglaNegocioException("Solo se puede iniciar una nueva actualización cuando la anterior ya fue aprobada.");
        }

        EstadoActualizacion = EstadoActualizacion.Borrador;
    }

    public void AceptarTratamientoDatos(DateTime fechaUtc)
    {
        TratamientoDatosAceptado = true;
        FechaAceptacionTratamientoDatosUtc = fechaUtc;
    }

    public void EnviarARevision(DateTime ahoraUtc)
    {
        if (!TratamientoDatosAceptado)
        {
            throw new ReglaNegocioException("Debe aceptar el tratamiento de datos personales antes de enviar la solicitud a revisión.");
        }

        if (string.IsNullOrWhiteSpace(Correo))
        {
            throw new ReglaNegocioException("Debe ingresar y registrar su correo electrónico antes de enviar la actualización a revisión.");
        }

        if (EstadoActualizacion != EstadoActualizacion.Borrador &&
            EstadoActualizacion != EstadoActualizacion.Devuelto)
        {
            throw new ReglaNegocioException($"No se puede enviar a revisión una solicitud en estado {EstadoActualizacion}.");
        }

        EstadoActualizacion = EstadoActualizacion.Enviado;
    }

    public void AprobarActualizacion(DateTime ahoraUtc)
    {
        if (EstadoActualizacion != EstadoActualizacion.Enviado)
        {
            throw new ReglaNegocioException("Solo se pueden aprobar solicitudes en estado Enviado.");
        }

        EstadoActualizacion = EstadoActualizacion.Aprobado;
    }

    public void DevolverActualizacion(DateTime ahoraUtc)
    {
        if (EstadoActualizacion != EstadoActualizacion.Enviado)
        {
            throw new ReglaNegocioException("Solo se pueden devolver solicitudes en estado Enviado.");
        }

        EstadoActualizacion = EstadoActualizacion.Devuelto;
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
