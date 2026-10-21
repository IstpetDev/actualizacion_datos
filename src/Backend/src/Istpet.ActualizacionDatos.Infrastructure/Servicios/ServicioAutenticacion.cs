namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

public class ServicioAutenticacion : IServicioAutenticacion
{
    private readonly AplicacionDbContext _context;
    private readonly IEnviadorCorreo _enviadorCorreo;
    private readonly PasswordHasher<Persona> _passwordHasher = new();

    public ServicioAutenticacion(
        AplicacionDbContext context,
        IEnviadorCorreo enviadorCorreo)
    {
        _context = context;
        _enviadorCorreo = enviadorCorreo;
    }

    public async Task<ResultadoLoginDto> IniciarSesionAsync(LoginRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Documento) || string.IsNullOrWhiteSpace(request.Contrasena))
        {
            throw new ReglaNegocioException("Credenciales incorrectas o usuario no habilitado.");
        }

        var doc = request.Documento.Trim();
        var query = _context.Personas.IgnoreQueryFilters().Where(p => p.Documento == doc);

        if (request.InstitucionId.HasValue)
        {
            query = query.Where(p => p.InstitucionId.Valor == request.InstitucionId.Value);
        }

        var persona = await query.FirstOrDefaultAsync(ct);

        // RF-ACC-004: Respuesta genérica sin revelar existencia
        if (persona == null)
        {
            _context.Auditorias.Add(new Auditoria(
                Guid.NewGuid(),
                doc,
                "InicioDeSesionFallido",
                detalle: "Intento fallido: documento inexistente"));
            await _context.SaveChangesAsync(ct);

            throw new ReglaNegocioException("Credenciales incorrectas o usuario no habilitado.");
        }

        if (!persona.AccesoHabilitado)
        {
            _context.Auditorias.Add(new Auditoria(
                Guid.NewGuid(),
                persona.Documento,
                "InicioDeSesionFallido",
                persona.InstitucionId,
                detalle: "Intento fallido: acceso no habilitado"));
            await _context.SaveChangesAsync(ct);

            throw new ReglaNegocioException("Credenciales incorrectas o usuario no habilitado.");
        }

        var ahoraUtc = DateTime.UtcNow;
        if (persona.EstaBloqueado(ahoraUtc))
        {
            _context.Auditorias.Add(new Auditoria(
                Guid.NewGuid(),
                persona.Documento,
                "InicioDeSesionFallido",
                persona.InstitucionId,
                detalle: "Intento fallido: cuenta bloqueada por intentos excedidos"));
            await _context.SaveChangesAsync(ct);

            throw new ReglaNegocioException("Credenciales incorrectas o usuario no habilitado.");
        }

        var esValido = false;

        // Si aún no tiene hash guardado, la contraseña inicial es su documento (RF-ACC-002, ADR-0007)
        if (string.IsNullOrEmpty(persona.PasswordHash))
        {
            if (string.Equals(request.Contrasena, persona.Documento, StringComparison.Ordinal))
            {
                esValido = true;
                persona.EstablecerPasswordHash(_passwordHasher.HashPassword(persona, request.Contrasena), debeCambiarContrasena: true);
            }
        }
        else
        {
            var verificacion = _passwordHasher.VerifyHashedPassword(persona, persona.PasswordHash, request.Contrasena);
            if (verificacion != PasswordVerificationResult.Failed)
            {
                esValido = true;
                if (verificacion == PasswordVerificationResult.SuccessRehashNeeded)
                {
                    persona.EstablecerPasswordHash(_passwordHasher.HashPassword(persona, request.Contrasena), persona.DebeCambiarContrasena);
                }
            }
        }

        if (!esValido)
        {
            persona.RegistrarIntentoFallido(ahoraUtc);

            var detalleAuditoria = persona.EstaBloqueado(ahoraUtc)
                ? "Cuenta bloqueada temporalmente tras 5 intentos fallidos consecutivos."
                : "Intento fallido: credenciales incorrectas.";

            _context.Auditorias.Add(new Auditoria(
                Guid.NewGuid(),
                persona.Documento,
                "InicioDeSesionFallido",
                persona.InstitucionId,
                detalle: detalleAuditoria));

            await _context.SaveChangesAsync(ct);

            throw new ReglaNegocioException("Credenciales incorrectas o usuario no habilitado.");
        }

        persona.ResetearIntentosFallidos();

        // RF-DAT-004, RF-DAT-005: Registro de auditoría sin incluir contraseñas
        _context.Auditorias.Add(new Auditoria(
            Guid.NewGuid(),
            persona.Documento,
            "InicioDeSesionExitoso",
            persona.InstitucionId,
            detalle: "Inicio de sesión correcto."));

        await _context.SaveChangesAsync(ct);

        return new ResultadoLoginDto(
            persona.Id,
            persona.InstitucionId.Valor,
            persona.Documento,
            persona.Nombre,
            persona.Correo,
            persona.Rol.ToString(),
            persona.DebeCambiarContrasena,
            persona.CorreoVerificado);
    }

    public async Task CambiarContrasenaAsync(string documento, CambiarContrasenaRequest request, CancellationToken ct = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(documento);

        var persona = await _context.Personas.IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Documento == documento.Trim(), ct)
            ?? throw new ReglaNegocioException("Usuario no encontrado.");

        if (string.IsNullOrWhiteSpace(request.NuevaContrasena) || request.NuevaContrasena.Length < 8)
        {
            throw new ReglaNegocioException("La nueva contraseña debe tener al menos 8 caracteres.");
        }

        // RF-ACC-003: Rechazar si la contraseña coincide con el documento
        if (string.Equals(request.NuevaContrasena.Trim(), persona.Documento, StringComparison.OrdinalIgnoreCase))
        {
            throw new ReglaNegocioException("La nueva contraseña no puede ser igual a su número de documento.");
        }

        // Si no está en cambio obligatorio, se requiere validar la contraseña actual
        if (!persona.DebeCambiarContrasena)
        {
            if (string.IsNullOrWhiteSpace(request.ContrasenaActual))
            {
                throw new ReglaNegocioException("Debe proporcionar la contraseña actual.");
            }

            if (string.IsNullOrEmpty(persona.PasswordHash))
            {
                if (!string.Equals(request.ContrasenaActual, persona.Documento, StringComparison.Ordinal))
                {
                    throw new ReglaNegocioException("La contraseña actual es incorrecta.");
                }
            }
            else
            {
                var verificacion = _passwordHasher.VerifyHashedPassword(persona, persona.PasswordHash, request.ContrasenaActual);
                if (verificacion == PasswordVerificationResult.Failed)
                {
                    throw new ReglaNegocioException("La contraseña actual es incorrecta.");
                }
            }
        }

        var nuevoHash = _passwordHasher.HashPassword(persona, request.NuevaContrasena);
        persona.CambiarContrasena(nuevoHash);

        // RF-DAT-004, RF-DAT-005: Registrar en auditoría sin la contraseña
        _context.Auditorias.Add(new Auditoria(
            Guid.NewGuid(),
            persona.Documento,
            "CambioContrasena",
            persona.InstitucionId,
            detalle: "Cambio de contraseña realizado con éxito."));

        await _context.SaveChangesAsync(ct);
    }

    public async Task EnviarCodigoCorreoAsync(string documento, EnviarCodigoCorreoRequest request, CancellationToken ct = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(documento);

        if (string.IsNullOrWhiteSpace(request.Correo) || !request.Correo.Contains('@', StringComparison.Ordinal))
        {
            throw new ReglaNegocioException("Debe proporcionar una dirección de correo válida.");
        }

        var persona = await _context.Personas.IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Documento == documento.Trim(), ct)
            ?? throw new ReglaNegocioException("Usuario no encontrado.");

        // ADR-0007: Código numérico de 6 dígitos, válido 15 minutos, máximo 5 intentos
        var codigo = RandomNumberGenerator.GetInt32(100000, 1000000).ToString("D6", CultureInfo.InvariantCulture);
        var codigoHash = CalcularHashSha256(codigo);
        var expiracionUtc = DateTime.UtcNow.AddMinutes(15);

        persona.GenerarCodigoVerificacionCorreo(codigoHash, expiracionUtc, request.Correo);

        await _enviadorCorreo.EnviarCodigoVerificacionAsync(request.Correo.Trim(), codigo, ct);

        _context.Auditorias.Add(new Auditoria(
            Guid.NewGuid(),
            persona.Documento,
            "SolicitudCodigoCorreo",
            persona.InstitucionId,
            detalle: "Código de verificación de correo solicitado."));

        await _context.SaveChangesAsync(ct);
    }

    public async Task VerificarCodigoCorreoAsync(string documento, VerificarCodigoCorreoRequest request, CancellationToken ct = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(documento);

        if (string.IsNullOrWhiteSpace(request.Codigo))
        {
            throw new ReglaNegocioException("Debe ingresar el código de verificación.");
        }

        var persona = await _context.Personas.IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Documento == documento.Trim(), ct)
            ?? throw new ReglaNegocioException("Usuario no encontrado.");

        var codigoHash = CalcularHashSha256(request.Codigo.Trim());
        var ahoraUtc = DateTime.UtcNow;

        var esValido = persona.ValidarCodigoVerificacion(codigoHash, ahoraUtc);

        if (!esValido)
        {
            _context.Auditorias.Add(new Auditoria(
                Guid.NewGuid(),
                persona.Documento,
                "VerificacionCodigoCorreoFallida",
                persona.InstitucionId,
                detalle: "Intento con código de verificación incorrecto."));

            await _context.SaveChangesAsync(ct);

            throw new ReglaNegocioException("El código de verificación proporcionado es incorrecto.");
        }

        _context.Auditorias.Add(new Auditoria(
            Guid.NewGuid(),
            persona.Documento,
            "VerificacionCodigoCorreoExitosa",
            persona.InstitucionId,
            detalle: "Correo verificado exitosamente."));

        await _context.SaveChangesAsync(ct);
    }

    public async Task<SesionUsuarioDto?> ObtenerSesionActualAsync(string documento, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(documento))
        {
            return null;
        }

        var persona = await _context.Personas.IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Documento == documento.Trim(), ct);

        if (persona == null)
        {
            return null;
        }

        return new SesionUsuarioDto(
            persona.Id,
            persona.InstitucionId.Valor,
            persona.Documento,
            persona.Nombre,
            persona.Correo,
            persona.Rol.ToString(),
            persona.DebeCambiarContrasena,
            persona.CorreoVerificado);
    }

    private static string CalcularHashSha256(string texto)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(texto));
        return Convert.ToHexString(bytes);
    }
}
