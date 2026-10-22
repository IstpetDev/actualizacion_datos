namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

public class ServicioDatosUsuario : IServicioDatosUsuario
{
    private readonly AplicacionDbContext _context;
    private readonly IServicioCampanas _servicioCampanas;
    private readonly IContextoInstitucion _contextoInstitucion;

    public ServicioDatosUsuario(
        AplicacionDbContext context,
        IServicioCampanas servicioCampanas,
        IContextoInstitucion contextoInstitucion)
    {
        _context = context;
        _servicioCampanas = servicioCampanas;
        _contextoInstitucion = contextoInstitucion;
    }

    public async Task<MisDatosDto> ObtenerMisDatosAsync(string documento, CancellationToken ct = default)
    {
        var persona = await _context.Personas
            .FirstOrDefaultAsync(p => p.Documento == documento, ct)
            ?? throw new ReglaNegocioException($"No se encontró la persona con documento {documento}.");

        var estadoEdicion = await _servicioCampanas.ObtenerEstadoEdicionAsync(documento, ct);

        var observaciones = await _context.Observaciones
            .Where(o => o.PersonaId == persona.Id)
            .Include(o => o.Marcas)
            .OrderBy(o => o.Ronda)
            .ToListAsync(ct);

        var observacionesDto = observaciones.Select(o => new ObservacionDto(
            o.Id,
            o.Ronda,
            o.Autor,
            o.Texto,
            o.FechaUtc,
            o.Marcas.Select(m => new MarcaObservacionDto(
                m.Id,
                m.TipoDestino.ToString().ToLowerInvariant(),
                m.ClaveDestino,
                m.Texto)).ToList())).ToList();

        return new MisDatosDto(
            persona.Id,
            persona.InstitucionId.Valor,
            persona.Documento,
            persona.Nombre,
            persona.Correo,
            persona.CorreoVerificado,
            persona.EstadoActualizacion.ToString(),
            persona.DatosPersonalesJson,
            persona.TratamientoDatosAceptado,
            persona.FechaAceptacionTratamientoDatosUtc,
            estadoEdicion.PuedeEditar,
            estadoEdicion.Mensaje,
            observacionesDto);
    }

    public async Task AceptarTratamientoDatosAsync(string documento, CancellationToken ct = default)
    {
        var persona = await _context.Personas
            .FirstOrDefaultAsync(p => p.Documento == documento, ct)
            ?? throw new ReglaNegocioException($"No se encontró la persona con documento {documento}.");

        var ahoraUtc = DateTime.UtcNow;
        persona.AceptarTratamientoDatos(ahoraUtc);

        // RF-DAT-004, RF-DAT-005: Registrar en auditoría sin incluir contraseñas ni contenido de datos personales
        _context.Auditorias.Add(new Auditoria(
            Guid.NewGuid(),
            persona.Documento,
            "AceptarTratamientoDatos",
            persona.InstitucionId,
            ahoraUtc,
            detalle: "Aceptación de tratamiento de datos personales registrada."));

        await _context.SaveChangesAsync(ct);
    }

    public async Task EnviarARevisionAsync(string documento, CancellationToken ct = default)
    {
        var campanaActiva = await _servicioCampanas.ObtenerCampanaActivaAsync(ct);
        if (campanaActiva == null)
        {
            throw new ReglaNegocioException("No se permite enviar a revisión fuera del período de una campaña abierta.");
        }

        var persona = await _context.Personas
            .FirstOrDefaultAsync(p => p.Documento == documento, ct)
            ?? throw new ReglaNegocioException($"No se encontró la persona con documento {documento}.");

        var ahoraUtc = DateTime.UtcNow;
        persona.EnviarARevision(ahoraUtc);

        // RF-DAT-004, RF-DAT-005: Registrar en auditoría
        _context.Auditorias.Add(new Auditoria(
            Guid.NewGuid(),
            persona.Documento,
            "EnviarRevision",
            persona.InstitucionId,
            ahoraUtc,
            detalle: "Actualización enviada a revisión por el usuario."));

        await _context.SaveChangesAsync(ct);
    }

    public async Task IniciarNuevaActualizacionAsync(string documento, CancellationToken ct = default)
    {
        // PD-HDV-04: solo con campaña abierta; el mensaje «fuera del período» se traduce a 403 como en el resto de /mis-datos.
        var campanaActiva = await _servicioCampanas.ObtenerCampanaActivaAsync(ct);
        if (campanaActiva == null)
        {
            throw new ReglaNegocioException("No se permite iniciar una nueva actualización fuera del período de una campaña abierta.");
        }

        var persona = await _context.Personas
            .FirstOrDefaultAsync(p => p.Documento == documento, ct)
            ?? throw new ReglaNegocioException($"No se encontró la persona con documento {documento}.");

        persona.IniciarNuevaActualizacion();

        // RF-DAT-004: queda constancia de quién reabrió su actualización y en qué campaña.
        _context.Auditorias.Add(new Auditoria(
            Guid.NewGuid(),
            persona.Documento,
            "IniciarNuevaActualizacion",
            persona.InstitucionId,
            DateTime.UtcNow,
            detalle: $"Nueva actualización iniciada en la campaña {campanaActiva.Id}."));

        await _context.SaveChangesAsync(ct);
    }

    public async Task<List<ObservacionDto>> ObtenerObservacionesAsync(string documento, CancellationToken ct = default)
    {
        var persona = await _context.Personas
            .FirstOrDefaultAsync(p => p.Documento == documento, ct)
            ?? throw new ReglaNegocioException($"No se encontró la persona con documento {documento}.");

        var observaciones = await _context.Observaciones
            .Where(o => o.PersonaId == persona.Id)
            .Include(o => o.Marcas)
            .OrderBy(o => o.Ronda)
            .ToListAsync(ct);

        return observaciones.Select(o => new ObservacionDto(
            o.Id,
            o.Ronda,
            o.Autor,
            o.Texto,
            o.FechaUtc,
            o.Marcas.Select(m => new MarcaObservacionDto(
                m.Id,
                m.TipoDestino.ToString().ToLowerInvariant(),
                m.ClaveDestino,
                m.Texto)).ToList())).ToList();
    }
}
