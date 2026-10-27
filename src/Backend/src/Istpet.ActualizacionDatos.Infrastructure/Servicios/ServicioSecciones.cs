namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

public class ServicioSecciones : IServicioSecciones
{
    private readonly AplicacionDbContext _context;
    private readonly IContextoInstitucion _contextoInstitucion;
    private readonly Dictionary<Guid, HashSet<SeccionHojaDeVida>> _cacheSecciones = new();

    public ServicioSecciones(
        AplicacionDbContext context,
        IContextoInstitucion contextoInstitucion)
    {
        _context = context;
        _contextoInstitucion = contextoInstitucion;
    }

    public async Task<bool> EstaAbiertaAsync(InstitucionId institucionId, SeccionHojaDeVida seccion, CancellationToken ct = default)
    {
        if (seccion == SeccionHojaDeVida.FichaPersonal)
        {
            return true;
        }

        var abiertas = await ObtenerSeccionesAbiertasAsync(institucionId, ct);
        return abiertas.Contains(seccion);
    }

    public async Task<IReadOnlySet<SeccionHojaDeVida>> ObtenerSeccionesAbiertasAsync(InstitucionId institucionId, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(institucionId);

        if (_cacheSecciones.TryGetValue(institucionId.Valor, out var enCache))
        {
            return enCache;
        }

        var registros = await _context.SeccionesInstitucion
            .IgnoreQueryFilters()
            .Where(s => s.InstitucionId == institucionId)
            .ToListAsync(ct);

        var abiertas = new HashSet<SeccionHojaDeVida>();
        foreach (var seccion in CodigosSeccion.Todas)
        {
            if (seccion == SeccionHojaDeVida.FichaPersonal)
            {
                abiertas.Add(seccion);
                continue;
            }

            var reg = registros.FirstOrDefault(r => r.Seccion == seccion);
            if (reg == null || reg.Habilitada)
            {
                abiertas.Add(seccion);
            }
        }

        _cacheSecciones[institucionId.Valor] = abiertas;
        return abiertas;
    }

    public async Task<List<SeccionConfiguracionDto>> ListarConfiguracionAsync(CancellationToken ct = default)
    {
        AsegurarPermisoAdministracion();
        var institucionId = _contextoInstitucion.InstitucionId
            ?? throw new ReglaNegocioException("No se ha establecido una institución activa.");

        var registros = await _context.SeccionesInstitucion
            .IgnoreQueryFilters()
            .Where(s => s.InstitucionId == institucionId)
            .ToListAsync(ct);

        var personas = await _context.Personas
            .IgnoreQueryFilters()
            .Where(p => p.InstitucionId == institucionId && p.AccesoHabilitado)
            .Select(p => new { p.Id, p.TipoFuncionarioId })
            .ToListAsync(ct);

        var totalPersonas = personas.Count;
        var personaIds = personas.Select(p => p.Id).ToHashSet();

        // 1. Ficha personal completa
        var fichasCompletas = personaIds.Count == 0
            ? []
            : (await _context.FichasPersonales
                .IgnoreQueryFilters()
                .Where(f => f.InstitucionId == institucionId &&
                            personaIds.Contains(f.PersonaId) &&
                            !string.IsNullOrWhiteSpace(f.PrimerNombre) &&
                            !string.IsNullOrWhiteSpace(f.PrimerApellido) &&
                            f.SexoId.HasValue &&
                            f.FechaNacimiento.HasValue &&
                            f.PaisNacimientoId.HasValue &&
                            f.EstadoCivilId.HasValue &&
                            f.PaisNacionalidadId.HasValue &&
                            f.ParroquiaResidenciaId.HasValue &&
                            !string.IsNullOrWhiteSpace(f.CallePrincipal) &&
                            (!string.IsNullOrWhiteSpace(f.Celular) || !string.IsNullOrWhiteSpace(f.TelefonoConvencional)) &&
                            !string.IsNullOrWhiteSpace(f.CorreoInstitucional))
                .Select(f => f.PersonaId)
                .ToHashSetAsync(ct));

        // 2. Formación académica completa (al menos un título y ninguno sin respaldo)
        var personasConTitulo = personaIds.Count == 0
            ? []
            : (await _context.TitulosAcademicos
                .IgnoreQueryFilters()
                .Where(t => t.InstitucionId == institucionId && personaIds.Contains(t.PersonaId))
                .Select(t => t.PersonaId)
                .Union(_context.TitulosEnCurso
                    .IgnoreQueryFilters()
                    .Where(t => t.InstitucionId == institucionId && personaIds.Contains(t.PersonaId))
                    .Select(t => t.PersonaId))
                .ToHashSetAsync(ct));

        var personasConTituloSinRespaldo = personaIds.Count == 0
            ? []
            : (await _context.TitulosAcademicos
                .IgnoreQueryFilters()
                .Where(t => t.InstitucionId == institucionId && personaIds.Contains(t.PersonaId) && t.ArchivoId == null)
                .Select(t => t.PersonaId)
                .Union(_context.TitulosEnCurso
                    .IgnoreQueryFilters()
                    .Where(t => t.InstitucionId == institucionId && personaIds.Contains(t.PersonaId) && t.ArchivoId == null)
                    .Select(t => t.PersonaId))
                .ToHashSetAsync(ct));

        var formacionCompleta = new HashSet<Guid>(personasConTitulo);
        formacionCompleta.ExceptWith(personasConTituloSinRespaldo);

        // 3. Capacitaciones (ninguna sin respaldo)
        var personasCapSinRespaldo = personaIds.Count == 0
            ? []
            : (await _context.Capacitaciones
                .IgnoreQueryFilters()
                .Where(c => c.InstitucionId == institucionId && personaIds.Contains(c.PersonaId) && c.ArchivoId == null)
                .Select(c => c.PersonaId)
                .ToHashSetAsync(ct));

        // 4. Experiencia laboral (ninguna sin respaldo)
        var personasExpSinRespaldo = personaIds.Count == 0
            ? []
            : (await _context.ExperienciasLaborales
                .IgnoreQueryFilters()
                .Where(e => e.InstitucionId == institucionId && personaIds.Contains(e.PersonaId) && e.ArchivoId == null)
                .Select(e => e.PersonaId)
                .ToHashSetAsync(ct));

        // 5. Referencias personales (al menos 2 de tipo Personal)
        var referenciasCompletas = personaIds.Count == 0
            ? []
            : (await _context.ReferenciasPersonales
                .IgnoreQueryFilters()
                .Where(r => r.InstitucionId == institucionId && personaIds.Contains(r.PersonaId) && r.Tipo == TipoReferencia.Personal)
                .GroupBy(r => r.PersonaId)
                .Where(g => g.Count() >= 2)
                .Select(g => g.Key)
                .ToHashSetAsync(ct));

        // 6. Cuenta bancaria (registrada y no SinConfirmar)
        var cuentasCompletas = personaIds.Count == 0
            ? []
            : (await _context.CuentasBancarias
                .IgnoreQueryFilters()
                .Where(c => c.InstitucionId == institucionId && personaIds.Contains(c.PersonaId) && c.Estado != EstadoCuentaBancaria.SinConfirmar)
                .Select(c => c.PersonaId)
                .ToHashSetAsync(ct));

        // 7. Documentos obligatorios
        var requisitosObligatorios = await _context.RequisitosDocumento
            .IgnoreQueryFilters()
            .Where(r => r.InstitucionId == institucionId && r.Activo && r.EsObligatorio)
            .ToListAsync(ct);

        var docsConArchivo = personaIds.Count == 0
            ? []
            : (await _context.DocumentosPersonales
                .IgnoreQueryFilters()
                .Where(d => d.InstitucionId == institucionId && personaIds.Contains(d.PersonaId) && d.ArchivoId != null)
                .Select(d => new { d.PersonaId, d.TipoDocumentoId })
                .ToListAsync(ct));

        var docsPorPersona = docsConArchivo
            .GroupBy(d => d.PersonaId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.TipoDocumentoId).ToHashSet());

        var documentosCompletos = new HashSet<Guid>();
        foreach (var p in personas)
        {
            var reqs = requisitosObligatorios
                .Where(r => r.TipoFuncionarioId == null || r.TipoFuncionarioId == p.TipoFuncionarioId)
                .Select(r => r.TipoDocumentoId)
                .Distinct()
                .ToList();

            if (reqs.Count == 0)
            {
                documentosCompletos.Add(p.Id);
                continue;
            }

            if (docsPorPersona.TryGetValue(p.Id, out var tiposSubidos) && reqs.All(r => tiposSubidos.Contains(r)))
            {
                documentosCompletos.Add(p.Id);
            }
        }

        var resultado = new List<SeccionConfiguracionDto>();
        foreach (var seccion in CodigosSeccion.Todas)
        {
            var reg = registros.FirstOrDefault(r => r.Seccion == seccion);
            var habilitada = seccion == SeccionHojaDeVida.FichaPersonal || reg == null || reg.Habilitada;
            var codigo = CodigosSeccion.ObtenerCodigo(seccion);
            var nombre = CodigosSeccion.ObtenerNombre(seccion);

            int completas = seccion switch
            {
                SeccionHojaDeVida.FichaPersonal => fichasCompletas.Count,
                SeccionHojaDeVida.FormacionAcademica => formacionCompleta.Count,
                SeccionHojaDeVida.Capacitaciones => totalPersonas - personasCapSinRespaldo.Count,
                SeccionHojaDeVida.ExperienciaLaboral => totalPersonas - personasExpSinRespaldo.Count,
                SeccionHojaDeVida.Referencias => referenciasCompletas.Count,
                SeccionHojaDeVida.DocumentosPersonales => documentosCompletos.Count,
                SeccionHojaDeVida.CuentaBancaria => cuentasCompletas.Count,
                _ => 0
            };

            var incompletas = Math.Max(0, totalPersonas - completas);

            resultado.Add(new SeccionConfiguracionDto(
                codigo,
                nombre,
                habilitada,
                completas,
                incompletas,
                totalPersonas,
                reg?.UltimaModificacionUtc,
                reg?.ModificadoPor
            ));
        }

        return resultado;
    }

    public async Task<SeccionConfiguracionDto> CambiarEstadoAsync(string codigo, bool habilitada, CancellationToken ct = default)
    {
        AsegurarPermisoAdministracion();
        var institucionId = _contextoInstitucion.InstitucionId
            ?? throw new ReglaNegocioException("No se ha establecido una institución activa.");

        if (!CodigosSeccion.IntentarParsear(codigo, out var seccion))
        {
            throw new RecursoNoEncontradoException($"La sección '{codigo}' no existe.");
        }

        if (seccion == SeccionHojaDeVida.FichaPersonal && !habilitada)
        {
            throw new ReglaNegocioException("La ficha personal no puede cerrarse.");
        }

        var reg = await _context.SeccionesInstitucion
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.InstitucionId == institucionId && s.Seccion == seccion, ct);

        var actor = _contextoInstitucion.ActorActual ?? "sistema";
        var ahora = DateTime.UtcNow;

        if (reg == null)
        {
            reg = new SeccionInstitucion(institucionId, seccion, habilitada, actor, ahora);
            _context.SeccionesInstitucion.Add(reg);
        }
        else
        {
            reg.CambiarEstado(habilitada, actor, ahora);
        }

        // RF-SEC-011: Registro en auditoría sin datos personales
        var accion = habilitada ? "SECCION_HABILITADA" : "SECCION_DESHABILITADA";
        var detalle = $"Sección {CodigosSeccion.ObtenerCodigo(seccion)} {(habilitada ? "abierta" : "cerrada")}";
        _context.Auditorias.Add(new Auditoria(Guid.NewGuid(), actor, accion, institucionId, ahora, detalle: detalle));

        await _context.SaveChangesAsync(ct);
        _cacheSecciones.Remove(institucionId.Valor);

        // Retornar el DTO actualizado
        var lista = await ListarConfiguracionAsync(ct);
        return lista.First(s => s.Codigo == CodigosSeccion.ObtenerCodigo(seccion));
    }

    private void AsegurarPermisoAdministracion()
    {
        if (_contextoInstitucion.EsSuperadmin)
        {
            return;
        }

        if (_contextoInstitucion.RolActual != RolUsuario.Admin)
        {
            throw new ReglaNegocioException("No tiene permisos para gestionar la configuración de secciones.");
        }
    }
}
