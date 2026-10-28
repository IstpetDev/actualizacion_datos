namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Application.Validacion;
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
        if (!_contextoInstitucion.EsSuperadmin)
            throw new ReglaNegocioException("No tiene permisos para asignar administradores.");

        var id = new InstitucionId(institucionId);
        var institucion = await _context.Instituciones.FirstOrDefaultAsync(i => i.Id == id, ct)
            ?? throw new ReglaNegocioException($"La institución con ID {institucionId} no existe.");

        var resultado = new List<PersonaDto>();
        var documentosVistos = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

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

            var persona = await AsignarSinGuardarAsync(id,
                new AsignarPersonalInstitucionalRequest(doc, "Admin", adminReq.Nombre, adminReq.Correo), RolUsuario.Admin, ct);
            resultado.Add(MapearPersona(persona));
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

    public async Task<List<PersonaDto>> ListarPersonalAsync(Guid institucionId, CancellationToken ct = default)
    {
        var id = AsegurarGestionPermitida(institucionId);
        await AsegurarInstitucionAsync(id, ct);
        var personas = await _context.Personas.AsNoTracking()
            .Where(p => p.InstitucionId == id &&
                (p.Rol == RolUsuario.Supervisor || (_contextoInstitucion.EsSuperadmin && p.Rol == RolUsuario.Admin)))
            .OrderBy(p => p.Nombre).ThenBy(p => p.Documento)
            .ToListAsync(ct);

        _context.Auditorias.Add(new Auditoria(Guid.NewGuid(), _contextoInstitucion.ActorActual ?? "admin",
            "LISTAR_PERSONAL_INSTITUCIONAL", id, detalle: $"Consulta de {personas.Count} cuentas administrativas o de supervisión."));
        await _context.SaveChangesAsync(ct);
        return personas.Select(MapearPersona).ToList();
    }

    public async Task<PersonaDto> AsignarPersonalAsync(Guid institucionId, AsignarPersonalInstitucionalRequest request, CancellationToken ct = default)
    {
        var id = AsegurarGestionPermitida(institucionId);
        var rol = string.Equals(request.Rol, "Admin", StringComparison.OrdinalIgnoreCase) ? RolUsuario.Admin :
            string.Equals(request.Rol, "Supervisor", StringComparison.OrdinalIgnoreCase) ? RolUsuario.Supervisor :
            throw new ValidacionCamposException(new() { ["rol"] = ["Seleccione Admin o Supervisor."] });
        if (!_contextoInstitucion.EsSuperadmin && rol != RolUsuario.Supervisor)
            throw new ReglaNegocioException("No tiene permisos para asignar administradores.");

        await AsegurarInstitucionAsync(id, ct);
        var persona = await AsignarSinGuardarAsync(id, request, rol, ct);
        await _context.SaveChangesAsync(ct);
        return MapearPersona(persona);
    }

    private InstitucionId AsegurarGestionPermitida(Guid institucionId)
    {
        var id = new InstitucionId(institucionId);
        if (!_contextoInstitucion.EsSuperadmin &&
            (_contextoInstitucion.RolActual != RolUsuario.Admin || _contextoInstitucion.InstitucionId != id))
            throw new ReglaNegocioException("No tiene permisos para gestionar personal de esta institución.");
        return id;
    }

    private async Task AsegurarInstitucionAsync(InstitucionId id, CancellationToken ct)
    {
        if (!await _context.Instituciones.AnyAsync(i => i.Id == id, ct))
            throw new RecursoNoEncontradoException("La institución no existe.");
    }

    private async Task<Persona> AsignarSinGuardarAsync(InstitucionId id, AsignarPersonalInstitucionalRequest request, RolUsuario rol, CancellationToken ct)
    {
        var documento = request.Documento?.Trim();
        var nombre = ValidacionHojaDeVida.NormalizarTexto(request.Nombre);
        var correo = ValidacionHojaDeVida.NormalizarTexto(request.Correo);
        var errores = new Dictionary<string, string[]>();
        if (documento is not { Length: 10 } || !documento.All(char.IsAsciiDigit))
            errores["documento"] = ["Ingrese un documento de diez dígitos."];
        if (nombre is { Length: > 403 } || nombre?.Any(char.IsControl) == true)
            errores["nombre"] = ["El nombre admite hasta 403 caracteres y no puede contener controles."];
        var erroresCorreo = ValidacionHojaDeVida.Evaluar(new { CorreoInstitucional = correo }, "ficha", ValidacionHojaDeVida.Politica(id.Valor, []));
        if (erroresCorreo.TryGetValue("correoInstitucional", out var mensajes)) errores["correo"] = mensajes;
        if (errores.Count > 0) throw new ValidacionCamposException(errores);

        var persona = await _context.Personas.SingleOrDefaultAsync(p => p.InstitucionId == id && p.Documento == documento, ct);
        var anterior = persona?.Rol.ToString() ?? "Sin cuenta";
        if (persona == null)
        {
            persona = new Persona(Guid.NewGuid(), id, documento!, rol, nombre, correo, accesoHabilitado: true);
            _context.Personas.Add(persona);
        }
        else
        {
            if (persona.Rol == RolUsuario.Superadmin ||
                (!_contextoInstitucion.EsSuperadmin && persona.Rol == RolUsuario.Admin))
                throw new ReglaNegocioException("No tiene permisos para modificar esta cuenta administrativa.");
            persona.AsignarRolInstitucional(rol);
        }

        _context.Auditorias.Add(new Auditoria(Guid.NewGuid(), _contextoInstitucion.ActorActual ?? "admin",
            "ASIGNAR_PERSONAL_INSTITUCIONAL", id,
            detalle: $"PersonaId={persona.Id}; rol anterior={anterior}; rol nuevo={rol}; acceso habilitado."));
        return persona;
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
