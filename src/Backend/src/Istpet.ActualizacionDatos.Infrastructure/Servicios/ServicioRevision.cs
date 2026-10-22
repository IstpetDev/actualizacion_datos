namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

public class ServicioRevision : IServicioRevision
{
    private readonly AplicacionDbContext _context;
    private readonly IContextoInstitucion _contextoInstitucion;

    public ServicioRevision(
        AplicacionDbContext context,
        IContextoInstitucion contextoInstitucion)
    {
        _context = context;
        _contextoInstitucion = contextoInstitucion;
    }

    public async Task<List<ResumenRevisionPendienteDto>> ListarPendientesRevisionAsync(CancellationToken ct = default)
    {
        // RF-FLU-006: Solo actualizaciones enviadas de la institución; nunca muestra borradores.
        var pendientes = await _context.Personas
            .Where(p => p.EstadoActualizacion == EstadoActualizacion.Enviado)
            .OrderBy(p => p.FechaCreacionUtc)
            .ToListAsync(ct);

        return pendientes.Select(p => new ResumenRevisionPendienteDto(
            p.Id,
            p.Documento,
            p.Nombre,
            p.Correo,
            p.EstadoActualizacion.ToString(),
            p.FechaCreacionUtc)).ToList();
    }

    public async Task<ExpedienteRevisionDto> ObtenerExpedienteParaRevisionAsync(string documento, string actorSupervisor, CancellationToken ct = default)
    {
        var persona = await _context.Personas
            .FirstOrDefaultAsync(p => p.Documento == documento, ct)
            ?? throw new ReglaNegocioException($"No se encontró la persona con documento {documento}.");

        // RF-FLU-006: Si está en borrador, el supervisor no puede verla
        if (persona.EstadoActualizacion == EstadoActualizacion.Borrador)
        {
            throw new ReglaNegocioException("Las solicitudes en borrador no están disponibles para revisión del supervisor.");
        }

        var ahoraUtc = DateTime.UtcNow;

        // RF-DAT-004, RF-DAT-005: Registrar en auditoría la consulta a datos de otra persona por un supervisor o admin
        // No incluye contraseñas ni el contenido de los datos personales.
        _context.Auditorias.Add(new Auditoria(
            Guid.NewGuid(),
            actorSupervisor,
            "ConsultaRevision",
            persona.InstitucionId,
            ahoraUtc,
            detalle: $"Consulta de expediente del usuario {persona.Documento} para revisión."));

        await _context.SaveChangesAsync(ct);

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

        return new ExpedienteRevisionDto(
            persona.Id,
            persona.InstitucionId.Valor,
            persona.Documento,
            persona.Nombre,
            persona.Correo,
            persona.EstadoActualizacion.ToString(),
            persona.DatosPersonalesJson,
            persona.ArchivosSubidosJson,
            persona.TratamientoDatosAceptado,
            persona.FechaAceptacionTratamientoDatosUtc,
            observacionesDto);
    }

    public async Task AprobarActualizacionAsync(string documento, string supervisor, CancellationToken ct = default)
    {
        var persona = await _context.Personas
            .FirstOrDefaultAsync(p => p.Documento == documento, ct)
            ?? throw new ReglaNegocioException($"No se encontró la persona con documento {documento}.");

        var ahoraUtc = DateTime.UtcNow;

        // RF-FLU-002: Pasa a aprobado
        // RF-FLU-005: Solo se conserva la última versión aprobada (sin tablas de histórico de datos)
        persona.AprobarActualizacion(ahoraUtc);

        // RF-DAT-004, RF-DAT-005: Auditoría
        _context.Auditorias.Add(new Auditoria(
            Guid.NewGuid(),
            supervisor,
            "AprobarRevision",
            persona.InstitucionId,
            ahoraUtc,
            detalle: $"Actualización del usuario {persona.Documento} aprobada por supervisor."));

        await _context.SaveChangesAsync(ct);
    }

    public async Task DevolverActualizacionAsync(string documento, DevolverActualizacionRequest request, string supervisor, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.ObservacionGeneral))
        {
            throw new ReglaNegocioException("La observación general es obligatoria para devolver una actualización.");
        }

        var persona = await _context.Personas
            .FirstOrDefaultAsync(p => p.Documento == documento, ct)
            ?? throw new ReglaNegocioException($"No se encontró la persona con documento {documento}.");

        var ahoraUtc = DateTime.UtcNow;

        // RF-FLU-003: Pasa a devuelto
        persona.DevolverActualizacion(ahoraUtc);

        var totalObservacionesPrevias = await _context.Observaciones
            .CountAsync(o => o.PersonaId == persona.Id, ct);
        var ronda = totalObservacionesPrevias + 1;

        var observacion = new Observacion(
            Guid.NewGuid(),
            persona.InstitucionId,
            persona.Id,
            ronda,
            supervisor,
            request.ObservacionGeneral,
            ahoraUtc);

        if (request.Marcas != null)
        {
            foreach (var item in request.Marcas)
            {
                var tipoDestino = string.Equals(item.TipoDestino, "archivo", StringComparison.OrdinalIgnoreCase)
                    ? TipoDestinoMarca.Archivo
                    : TipoDestinoMarca.Campo;

                var marca = new MarcaObservacion(
                    Guid.NewGuid(),
                    observacion.Id,
                    tipoDestino,
                    item.ClaveDestino,
                    item.Texto);

                observacion.AgregarMarca(marca);
            }
        }

        _context.Observaciones.Add(observacion);

        // RF-DAT-004, RF-DAT-005: Auditoría
        _context.Auditorias.Add(new Auditoria(
            Guid.NewGuid(),
            supervisor,
            "DevolverRevision",
            persona.InstitucionId,
            ahoraUtc,
            detalle: $"Actualización del usuario {persona.Documento} devuelta con observaciones en ronda {ronda}."));

        await _context.SaveChangesAsync(ct);
    }
}
