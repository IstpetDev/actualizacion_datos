namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

public class ServicioInstituciones : IServicioInstituciones
{
    private readonly AplicacionDbContext _context;
    private readonly IContextoInstitucion _contextoInstitucion;

    public ServicioInstituciones(
        AplicacionDbContext context,
        IContextoInstitucion contextoInstitucion)
    {
        _context = context;
        _contextoInstitucion = contextoInstitucion;
    }

    public async Task<InstitucionDto> CrearInstitucionAsync(CrearInstitucionRequest request, CancellationToken ct = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(request.Nombre);

        var institucionId = InstitucionId.Nuevo();
        var institucion = new Institucion(institucionId, request.Nombre);
        _context.Instituciones.Add(institucion);

        if (request.Admins != null && request.Admins.Count > 0)
        {
            var documentosUnicos = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var adminReq in request.Admins)
            {
                if (string.IsNullOrWhiteSpace(adminReq.Documento))
                {
                    continue;
                }

                var doc = adminReq.Documento.Trim();
                if (!documentosUnicos.Add(doc))
                {
                    continue;
                }

                var admin = new Persona(
                    Guid.NewGuid(),
                    institucionId,
                    doc,
                    RolUsuario.Admin,
                    adminReq.Nombre,
                    adminReq.Correo,
                    accesoHabilitado: true);

                _context.Personas.Add(admin);
            }
        }

        await SemillaTiposInstitucionales.AgregarFaltantesAsync(_context, institucionId, ct);

        // RF-MUL-004: Auditoría de la operación inter-institucional
        var auditoria = new Auditoria(
            Guid.NewGuid(),
            _contextoInstitucion.ActorActual ?? "superadmin",
            "CREAR_INSTITUCION",
            institucionId,
            DateTime.UtcNow,
            $"Creación de la institución {request.Nombre}");
        _context.Auditorias.Add(auditoria);

        await _context.SaveChangesAsync(ct);

        return new InstitucionDto(
            institucion.Id.Valor,
            institucion.Nombre,
            institucion.Activa,
            institucion.FechaCreacionUtc);
    }

    public async Task<List<InstitucionDto>> ListarInstitucionesAsync(CancellationToken ct = default)
    {
        // RF-MUL-004: Auditoría al listar/operar entre instituciones
        var auditoria = new Auditoria(
            Guid.NewGuid(),
            _contextoInstitucion.ActorActual ?? "superadmin",
            "LISTAR_INSTITUCIONES",
            null,
            DateTime.UtcNow,
            "Consulta general de instituciones");
        _context.Auditorias.Add(auditoria);
        await _context.SaveChangesAsync(ct);

        var lista = await _context.Instituciones
            .OrderBy(i => i.Nombre)
            .ToListAsync(ct);

        return lista.Select(i => new InstitucionDto(
            i.Id.Valor,
            i.Nombre,
            i.Activa,
            i.FechaCreacionUtc)).ToList();
    }

    public async Task<InstitucionDto?> ObtenerInstitucionPorIdAsync(Guid id, CancellationToken ct = default)
    {
        var institucion = await _context.Instituciones.FirstOrDefaultAsync(i => i.Id == new InstitucionId(id), ct);
        if (institucion == null)
        {
            return null;
        }

        return new InstitucionDto(
            institucion.Id.Valor,
            institucion.Nombre,
            institucion.Activa,
            institucion.FechaCreacionUtc);
    }

    public async Task<List<PersonaDto>> AsignarAdminsAsync(Guid institucionId, AsignarAdminsRequest request, CancellationToken ct = default)
    {
        var id = new InstitucionId(institucionId);
        var institucion = await _context.Instituciones.FirstOrDefaultAsync(i => i.Id == id, ct)
            ?? throw new ReglaNegocioException($"La institución con ID {institucionId} no existe.");

        var resultado = new List<PersonaDto>();
        var documentosVistos = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // Se usa IgnoreQueryFilters para verificar y cargar en la institución específica
        var personasExistentes = await _context.Personas
            .IgnoreQueryFilters()
            .Where(p => p.InstitucionId == id)
            .ToListAsync(ct);

        foreach (var adminReq in request.Admins)
        {
            if (string.IsNullOrWhiteSpace(adminReq.Documento))
            {
                continue;
            }

            var doc = adminReq.Documento.Trim();
            if (!documentosVistos.Add(doc))
            {
                continue;
            }

            var existente = personasExistentes.FirstOrDefault(p => p.Documento.Equals(doc, StringComparison.OrdinalIgnoreCase));
            if (existente == null)
            {
                var nuevoAdmin = new Persona(
                    Guid.NewGuid(),
                    id,
                    doc,
                    RolUsuario.Admin,
                    adminReq.Nombre,
                    adminReq.Correo,
                    accesoHabilitado: true);

                _context.Personas.Add(nuevoAdmin);
                resultado.Add(MapearPersona(nuevoAdmin));
            }
            else
            {
                existente.HabilitarAcceso();
                resultado.Add(MapearPersona(existente));
            }
        }

        var auditoria = new Auditoria(
            Guid.NewGuid(),
            _contextoInstitucion.ActorActual ?? "superadmin",
            "ASIGNAR_ADMINS",
            id,
            DateTime.UtcNow,
            $"Asignación de administradores a {institucion.Nombre}");
        _context.Auditorias.Add(auditoria);

        await _context.SaveChangesAsync(ct);
        return resultado;
    }

    public async Task<List<PersonaDto>> HabilitarPersonasAsync(Guid institucionId, HabilitarPersonasRequest request, CancellationToken ct = default)
    {
        var id = new InstitucionId(institucionId);
        var institucion = await _context.Instituciones.FirstOrDefaultAsync(i => i.Id == id, ct)
            ?? throw new ReglaNegocioException($"La institución con ID {institucionId} no existe.");

        var consulta = _context.Personas
            .IgnoreQueryFilters()
            .Where(p => p.InstitucionId == id);

        if (!request.HabilitarTodos)
        {
            var docs = request.Documentos?.Where(d => !string.IsNullOrWhiteSpace(d)).Select(d => d.Trim()).ToList() ?? [];
            var ids = request.PersonaIds ?? [];

            consulta = consulta.Where(p => docs.Contains(p.Documento) || ids.Contains(p.Id));
        }

        var personas = await consulta.ToListAsync(ct);

        foreach (var persona in personas)
        {
            persona.HabilitarAcceso();
        }

        // RF-MUL-004: Auditoría
        var auditoria = new Auditoria(
            Guid.NewGuid(),
            _contextoInstitucion.ActorActual ?? "superadmin",
            "HABILITAR_PERSONAS",
            id,
            DateTime.UtcNow,
            $"Habilitación de acceso para {personas.Count} personas en {institucion.Nombre}");
        _context.Auditorias.Add(auditoria);

        await _context.SaveChangesAsync(ct);

        return personas.Select(MapearPersona).ToList();
    }

    private static PersonaDto MapearPersona(Persona p) =>
        new(p.Id, p.InstitucionId.Valor, p.Documento, p.Nombre, p.Correo, p.Rol.ToString(), p.AccesoHabilitado, p.EstadoActualizacion.ToString(), p.FechaCreacionUtc, TieneFicha: false, TipoFuncionarioId: p.TipoFuncionarioId);
}
