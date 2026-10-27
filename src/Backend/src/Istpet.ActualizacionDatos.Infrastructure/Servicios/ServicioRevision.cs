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
    private readonly IAlmacenArchivos _almacenArchivos;
    private readonly IServicioHojaDeVida _servicioHojaDeVida;

    public ServicioRevision(
        AplicacionDbContext context,
        IContextoInstitucion contextoInstitucion,
        IAlmacenArchivos almacenArchivos,
        IServicioHojaDeVida servicioHojaDeVida)
    {
        _context = context;
        _contextoInstitucion = contextoInstitucion;
        _almacenArchivos = almacenArchivos;
        _servicioHojaDeVida = servicioHojaDeVida;
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

        var ahoraUtc = DateTime.UtcNow;
        var esBorradorIncompletoPostCampana = false;

        // RF-FLU-006 / RF-CAP-016:
        // Si está en borrador, el supervisor nunca puede verla.
        // El admin puede consultarla en modo solo lectura únicamente tras el fin de la campaña (marcada como «incompleto, no enviado»).
        if (persona.EstadoActualizacion == EstadoActualizacion.Borrador)
        {
            var esAdmin = _contextoInstitucion.RolActual is RolUsuario.Admin or RolUsuario.Superadmin;
            var campanas = await _context.Campanas
                .AsNoTracking()
                .Where(c => c.InstitucionId == persona.InstitucionId)
                .ToListAsync(ct);
            var campanaAbierta = campanas.Any(c => c.EstaAbiertaEn(ahoraUtc));
            var hayCampanaVencida = campanas.Any(c => c.FechaFinUtc < ahoraUtc);

            if (!esAdmin || campanaAbierta || !hayCampanaVencida)
            {
                throw new ReglaNegocioException("Las solicitudes en borrador no están disponibles para revisión del supervisor.");
            }

            esBorradorIncompletoPostCampana = true;
        }

        // RF-DAT-004, RF-DAT-005, RF-CAP-016: Registrar en auditoría la consulta a datos de otra persona
        var accionAuditoria = esBorradorIncompletoPostCampana ? "ConsultaBorradorIncompletoPostCampana" : "ConsultaRevision";
        var detalleAuditoria = esBorradorIncompletoPostCampana
            ? $"Consulta de borrador incompleto de {persona.Documento} tras vencer la campaña (solo lectura)."
            : $"Consulta de expediente del usuario {persona.Documento} para revisión.";

        _context.Auditorias.Add(new Auditoria(
            Guid.NewGuid(),
            actorSupervisor,
            accionAuditoria,
            persona.InstitucionId,
            ahoraUtc,
            detalle: detalleAuditoria));

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

        var capacitacionesObligatorias = await _servicioHojaDeVida.ListarCapacitacionesObligatoriasAsync(persona.Documento, ct);

        return new ExpedienteRevisionDto(
            persona.Id,
            persona.InstitucionId.Valor,
            persona.Documento,
            persona.Nombre,
            persona.Correo,
            esBorradorIncompletoPostCampana ? "Incompleto, no enviado" : persona.EstadoActualizacion.ToString(),
            persona.DatosPersonalesJson,
            persona.TratamientoDatosAceptado,
            persona.FechaAceptacionTratamientoDatosUtc,
            observacionesDto,
            capacitacionesObligatorias);
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

        // ADR-0006: al aprobarse, los archivos que sustituye se eliminan.
        var sustituidos = await ObtenerArchivosSustituidosAsync(persona.Id, ct);
        _context.ArchivosAdjuntos.RemoveRange(sustituidos);
        if (sustituidos.Count > 0)
        {
            _context.Auditorias.Add(new Auditoria(
                Guid.NewGuid(),
                supervisor,
                "EliminarArchivosSustituidos",
                persona.InstitucionId,
                ahoraUtc,
                detalle: $"{sustituidos.Count} archivo(s) sin uso eliminados al aprobar."));
        }

        await _context.SaveChangesAsync(ct);

        // El disco se limpia después de confirmar la base: si falla, queda un archivo sin registro,
        // nunca un registro que apunte a un archivo inexistente.
        foreach (var archivo in sustituidos)
        {
            await _almacenArchivos.EliminarAsync(archivo.InstitucionId, archivo.PersonaId, archivo.Id, ct);
        }
    }

    /// <summary>
    /// Archivos de la persona que ya no respaldan nada: sin clave de destino (los de la hoja de vida se asocian
    /// por archivo_id, no por clave) y sin ningún ítem, documento o foto que los referencie. Los que tienen clave
    /// los gestiona la subida por clave, que ya reemplaza el anterior al subir (ServicioArchivos).
    /// </summary>
    private async Task<List<ArchivoAdjunto>> ObtenerArchivosSustituidosAsync(Guid personaId, CancellationToken ct)
    {
        var referenciados = new HashSet<Guid>();
        referenciados.UnionWith(await IdsReferenciadosAsync(_context.TitulosAcademicos, personaId, ct));
        referenciados.UnionWith(await IdsReferenciadosAsync(_context.TitulosEnCurso, personaId, ct));
        referenciados.UnionWith(await IdsReferenciadosAsync(_context.Capacitaciones, personaId, ct));
        referenciados.UnionWith(await IdsReferenciadosAsync(_context.ExperienciasLaborales, personaId, ct));
        referenciados.UnionWith(await IdsReferenciadosAsync(_context.ReferenciasPersonales, personaId, ct));
        referenciados.UnionWith(await IdsReferenciadosAsync(_context.DocumentosPersonales, personaId, ct));
        referenciados.UnionWith(await _context.FichasPersonales
            .Where(f => f.PersonaId == personaId && f.FotoArchivoId != null)
            .Select(f => f.FotoArchivoId!.Value)
            .ToListAsync(ct));

        var sinClave = await _context.ArchivosAdjuntos
            .Where(a => a.PersonaId == personaId && a.ClaveDestino == null)
            .ToListAsync(ct);

        return sinClave.Where(a => !referenciados.Contains(a.Id)).ToList();
    }

    private static Task<List<Guid>> IdsReferenciadosAsync<T>(IQueryable<T> registros, Guid personaId, CancellationToken ct)
        where T : Domain.HojaDeVida.RegistroHojaDeVida =>
        registros
            .Where(r => r.PersonaId == personaId && r.ArchivoId != null)
            .Select(r => r.ArchivoId!.Value)
            .ToListAsync(ct);

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
                TipoDestinoMarca tipoDestino;
                if (string.Equals(item.TipoDestino, "archivo", StringComparison.OrdinalIgnoreCase))
                {
                    tipoDestino = TipoDestinoMarca.Archivo;
                }
                else if (string.Equals(item.TipoDestino, "item", StringComparison.OrdinalIgnoreCase))
                {
                    tipoDestino = TipoDestinoMarca.Item;
                    await ValidarClaveDestinoItemAsync(persona.Id, item.ClaveDestino, ct);
                }
                else if (string.Equals(item.TipoDestino, "campo", StringComparison.OrdinalIgnoreCase))
                {
                    tipoDestino = TipoDestinoMarca.Campo;
                }
                else
                {
                    throw new ReglaNegocioException($"Tipo de destino '{item.TipoDestino}' no reconocido. Los valores permitidos son: campo, archivo, item.");
                }

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

    public async Task VincularCapacitacionObligatoriaPorAyudaAsync(
        string documento,
        Guid obligatoriaId,
        VincularCapacitacionObligatoriaRequest request,
        string supervisor,
        CancellationToken ct = default)
    {
        var persona = await _context.Personas
            .FirstOrDefaultAsync(p => p.Documento == documento, ct)
            ?? throw new RecursoNoEncontradoException($"No se encontró la persona con documento {documento}.");

        if (persona.EstadoActualizacion == EstadoActualizacion.Aprobado)
        {
            throw new ConflictoEstadoException("No se puede vincular capacitaciones a una actualización ya aprobada.");
        }

        var obligatoria = await _context.CapacitacionesObligatorias
            .FirstOrDefaultAsync(co => co.Id == obligatoriaId && co.Activo, ct)
            ?? throw new RecursoNoEncontradoException("La obligación institucional no existe o no está activa.");

        if (obligatoria.TipoFuncionarioId.HasValue && obligatoria.TipoFuncionarioId != persona.TipoFuncionarioId)
        {
            throw new RecursoNoEncontradoException("La obligación institucional no aplica a esta persona.");
        }

        var capacitacion = await _context.Capacitaciones
            .FirstOrDefaultAsync(c => c.Id == request.CapacitacionId, ct);

        if (capacitacion == null || capacitacion.PersonaId != persona.Id)
        {
            throw new ConflictoEstadoException("La capacitación no existe o pertenece a otra persona.");
        }

        if (capacitacion.CapacitacionObligatoriaId.HasValue && capacitacion.CapacitacionObligatoriaId.Value != obligatoriaId)
        {
            throw new ConflictoEstadoException("La capacitación ya se encuentra vinculada a otra obligación institucional.");
        }

        var previas = await _context.Capacitaciones
            .Where(c => c.PersonaId == persona.Id && c.CapacitacionObligatoriaId == obligatoriaId && c.Id != capacitacion.Id)
            .ToListAsync(ct);

        foreach (var previa in previas)
        {
            previa.VincularCapacitacionObligatoria(null);
        }

        capacitacion.VincularCapacitacionObligatoria(obligatoriaId);

        var ahoraUtc = DateTime.UtcNow;

        _context.Auditorias.Add(new Auditoria(
            Guid.NewGuid(),
            supervisor,
            "VinculoPorAyudaCapacitacion",
            persona.InstitucionId,
            ahoraUtc,
            detalle: $"Vínculo por ayuda de capacitación a la obligación institucional para el usuario {persona.Documento}."));

        await _context.SaveChangesAsync(ct);
    }

    private async Task ValidarClaveDestinoItemAsync(Guid personaId, string? claveDestino, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(claveDestino))
        {
            throw new ReglaNegocioException("La clave de destino del ítem es obligatoria.");
        }

        string tipo;
        string idStr;

        if (claveDestino.StartsWith("capacitaciones.obligatoria.", StringComparison.OrdinalIgnoreCase))
        {
            tipo = "capacitacion-obligatoria";
            idStr = claveDestino["capacitaciones.obligatoria.".Length..].Trim();
        }
        else
        {
            var separador = claveDestino.IndexOf(':');
            if (separador <= 0 || separador == claveDestino.Length - 1)
            {
                throw new ReglaNegocioException($"La clave de destino '{claveDestino}' no tiene un formato válido tipo:id (por ejemplo, 'titulo:{{guid}}').");
            }

            tipo = claveDestino[..separador].Trim().ToLowerInvariant();
            idStr = claveDestino[(separador + 1)..].Trim();
        }

        if (!Guid.TryParse(idStr, out var itemId))
        {
            throw new ReglaNegocioException($"El identificador '{idStr}' en la clave de destino '{claveDestino}' no es un GUID válido.");
        }

        var existe = tipo switch
        {
            "titulo" or "titulo-academico" or "titulo_academico" =>
                await _context.TitulosAcademicos.AnyAsync(t => t.Id == itemId && t.PersonaId == personaId, ct),
            "titulo-en-curso" or "titulo_en_curso" or "titulocurso" =>
                await _context.TitulosEnCurso.AnyAsync(t => t.Id == itemId && t.PersonaId == personaId, ct),
            "capacitacion" or "capacitaciones" or "curso" or "cursos" =>
                await _context.Capacitaciones.AnyAsync(c => c.Id == itemId && c.PersonaId == personaId, ct),
            "capacitacion-obligatoria" or "capacitacion_obligatoria" or "capacitacionobligatoria" or "obligatoria" =>
                await ValidarObligatoriaAplicaPersonaAsync(personaId, itemId, ct),
            "experiencia" or "experiencias" or "experiencia-laboral" or "experiencia_laboral" =>
                await _context.ExperienciasLaborales.AnyAsync(e => e.Id == itemId && e.PersonaId == personaId, ct),
            "referencia" or "referencias" or "referencia-personal" or "referencia_personal" =>
                await _context.ReferenciasPersonales.AnyAsync(r => r.Id == itemId && r.PersonaId == personaId, ct),
            "documento" or "documentos" or "documento-personal" or "documento_personal" =>
                await _context.DocumentosPersonales.AnyAsync(d => d.Id == itemId && d.PersonaId == personaId, ct),
            _ => throw new ReglaNegocioException($"Tipo de ítem '{tipo}' no reconocido en la clave de destino. Tipos válidos: titulo, titulo-en-curso, capacitacion, capacitacion-obligatoria, experiencia, referencia, documento.")
        };

        if (!existe)
        {
            throw new ReglaNegocioException($"El ítem '{claveDestino}' no existe o no pertenece a la persona.");
        }
    }

    private async Task<bool> ValidarObligatoriaAplicaPersonaAsync(Guid personaId, Guid obligatoriaId, CancellationToken ct)
    {
        var persona = await _context.Personas.FirstOrDefaultAsync(p => p.Id == personaId, ct);
        if (persona == null)
        {
            return false;
        }

        return await _context.CapacitacionesObligatorias.AnyAsync(co =>
            co.Id == obligatoriaId &&
            co.Activo &&
            co.InstitucionId == persona.InstitucionId &&
            (co.TipoFuncionarioId == null || co.TipoFuncionarioId == persona.TipoFuncionarioId), ct);
    }
}
