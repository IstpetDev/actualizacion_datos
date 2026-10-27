namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

public class ValidadorCompletitudEnvio : IValidadorCompletitudEnvio
{
    private readonly IEnumerable<IReglaCompletitudEnvio> _reglas;
    private readonly AplicacionDbContext _context;
    private readonly IServicioSecciones _servicioSecciones;

    public ValidadorCompletitudEnvio(
        IEnumerable<IReglaCompletitudEnvio> reglas,
        AplicacionDbContext context,
        IServicioSecciones servicioSecciones)
    {
        _reglas = reglas;
        _context = context;
        _servicioSecciones = servicioSecciones;
    }

    public async Task<ResultadoValidacionEnvioDto> ValidarAsync(Guid personaId, CancellationToken ct = default)
    {
        var persona = await _context.Personas.FirstOrDefaultAsync(p => p.Id == personaId, ct);
        var abiertas = persona != null
            ? await _servicioSecciones.ObtenerSeccionesAbiertasAsync(persona.InstitucionId, ct)
            : CodigosSeccion.Todas.ToHashSet();

        var todos = new List<FaltanteEnvioDto>();
        foreach (var regla in _reglas)
        {
            if (regla.Seccion.HasValue && !abiertas.Contains(regla.Seccion.Value))
            {
                continue;
            }

            var faltantes = await regla.EvaluarAsync(personaId, ct);
            if (faltantes is { Count: > 0 })
            {
                todos.AddRange(faltantes);
            }
        }

        return new ResultadoValidacionEnvioDto(todos.Count == 0, todos);
    }
}

/// <summary>
/// PD-HDV-01: datos personales obligatorios de la ficha para enviar a revisión.
/// </summary>
public class ReglaFichaPersonalObligatoria : IReglaCompletitudEnvio
{
    public SeccionHojaDeVida? Seccion => SeccionHojaDeVida.FichaPersonal;
    private readonly AplicacionDbContext _context;

    public ReglaFichaPersonalObligatoria(AplicacionDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<FaltanteEnvioDto>> EvaluarAsync(Guid personaId, CancellationToken ct = default)
    {
        var ficha = await _context.FichasPersonales
            .FirstOrDefaultAsync(f => f.PersonaId == personaId, ct);

        var faltantes = new List<FaltanteEnvioDto>();

        if (ficha == null)
        {
            faltantes.Add(new FaltanteEnvioDto("ficha", "ficha.primer-nombre", "El primer nombre es obligatorio."));
            faltantes.Add(new FaltanteEnvioDto("ficha", "ficha.primer-apellido", "El primer apellido es obligatorio."));
            faltantes.Add(new FaltanteEnvioDto("ficha", "ficha.sexo", "El sexo es obligatorio."));
            faltantes.Add(new FaltanteEnvioDto("ficha", "ficha.fecha-nacimiento", "La fecha de nacimiento es obligatoria."));
            faltantes.Add(new FaltanteEnvioDto("ficha", "ficha.pais-nacimiento", "El país de nacimiento es obligatorio."));
            faltantes.Add(new FaltanteEnvioDto("ficha", "ficha.estado-civil", "El estado civil es obligatorio."));
            faltantes.Add(new FaltanteEnvioDto("ficha", "ficha.nacionalidad", "La nacionalidad es obligatoria."));
            faltantes.Add(new FaltanteEnvioDto("ficha", "ficha.parroquia-residencia", "La parroquia de residencia es obligatoria."));
            faltantes.Add(new FaltanteEnvioDto("ficha", "ficha.calle-principal", "La calle principal es obligatoria."));
            faltantes.Add(new FaltanteEnvioDto("ficha", "ficha.telefono", "Debe registrar al menos un teléfono de contacto (celular o convencional)."));
            faltantes.Add(new FaltanteEnvioDto("ficha", "ficha.correo-institucional", "El correo institucional es obligatorio."));
            return faltantes;
        }

        if (string.IsNullOrWhiteSpace(ficha.PrimerNombre))
            faltantes.Add(new FaltanteEnvioDto("ficha", "ficha.primer-nombre", "El primer nombre es obligatorio."));

        if (string.IsNullOrWhiteSpace(ficha.PrimerApellido))
            faltantes.Add(new FaltanteEnvioDto("ficha", "ficha.primer-apellido", "El primer apellido es obligatorio."));

        if (!ficha.SexoId.HasValue)
            faltantes.Add(new FaltanteEnvioDto("ficha", "ficha.sexo", "El sexo es obligatorio."));

        if (!ficha.FechaNacimiento.HasValue)
            faltantes.Add(new FaltanteEnvioDto("ficha", "ficha.fecha-nacimiento", "La fecha de nacimiento es obligatoria."));

        if (!ficha.PaisNacimientoId.HasValue)
            faltantes.Add(new FaltanteEnvioDto("ficha", "ficha.pais-nacimiento", "El país de nacimiento es obligatorio."));

        if (!ficha.EstadoCivilId.HasValue)
            faltantes.Add(new FaltanteEnvioDto("ficha", "ficha.estado-civil", "El estado civil es obligatorio."));

        if (!ficha.PaisNacionalidadId.HasValue)
            faltantes.Add(new FaltanteEnvioDto("ficha", "ficha.nacionalidad", "La nacionalidad es obligatoria."));

        if (!ficha.ParroquiaResidenciaId.HasValue)
            faltantes.Add(new FaltanteEnvioDto("ficha", "ficha.parroquia-residencia", "La parroquia de residencia es obligatoria."));

        if (string.IsNullOrWhiteSpace(ficha.CallePrincipal))
            faltantes.Add(new FaltanteEnvioDto("ficha", "ficha.calle-principal", "La calle principal es obligatoria."));

        if (string.IsNullOrWhiteSpace(ficha.Celular) && string.IsNullOrWhiteSpace(ficha.TelefonoConvencional))
            faltantes.Add(new FaltanteEnvioDto("ficha", "ficha.telefono", "Debe registrar al menos un teléfono de contacto (celular o convencional)."));

        if (string.IsNullOrWhiteSpace(ficha.CorreoInstitucional))
            faltantes.Add(new FaltanteEnvioDto("ficha", "ficha.correo-institucional", "El correo institucional es obligatorio."));

        return faltantes;
    }
}

/// <summary>
/// RF-HDV-019, PD-HDV-09: al menos un estudio registrado, de cualquier nivel, en formación académica.
/// </summary>
public class ReglaFormacionAcademicaObligatoria : IReglaCompletitudEnvio
{
    public SeccionHojaDeVida? Seccion => SeccionHojaDeVida.FormacionAcademica;
    private readonly AplicacionDbContext _context;

    public ReglaFormacionAcademicaObligatoria(AplicacionDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<FaltanteEnvioDto>> EvaluarAsync(Guid personaId, CancellationToken ct = default)
    {
        var tieneTitulo = await _context.TitulosAcademicos
            .AnyAsync(t => t.PersonaId == personaId, ct);

        if (tieneTitulo)
        {
            return [];
        }

        var tieneTituloEnCurso = await _context.TitulosEnCurso
            .AnyAsync(t => t.PersonaId == personaId, ct);

        if (tieneTituloEnCurso)
        {
            return [];
        }

        return [new FaltanteEnvioDto("formacion", "formacion.minimo-estudios", "Debe registrar al menos un estudio en formación académica.")];
    }
}

/// <summary>
/// RF-HDV-018: al menos dos referencias de tipo personal. Las familiares no cuentan para el mínimo.
/// </summary>
public class ReglaReferenciasPersonalesObligatorias : IReglaCompletitudEnvio
{
    public SeccionHojaDeVida? Seccion => SeccionHojaDeVida.Referencias;
    private readonly AplicacionDbContext _context;

    public ReglaReferenciasPersonalesObligatorias(AplicacionDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<FaltanteEnvioDto>> EvaluarAsync(Guid personaId, CancellationToken ct = default)
    {
        var conteo = await _context.ReferenciasPersonales
            .CountAsync(r => r.PersonaId == personaId && r.Tipo == TipoReferencia.Personal, ct);

        return conteo >= 2
            ? []
            : [new FaltanteEnvioDto("referencias", "referencias.minimo-personales", "Debe registrar al menos dos referencias de tipo personal.")];
    }
}

/// <summary>
/// RF-HDV-024, PD-HDV-18: todo título, título en curso, capacitación o experiencia laboral debe tener respaldo adjunto.
/// </summary>
public class ReglaRespaldosItemsObligatorios : IReglaCompletitudEnvio
{
    private readonly AplicacionDbContext _context;
    private readonly IServicioSecciones _servicioSecciones;

    public ReglaRespaldosItemsObligatorios(AplicacionDbContext context, IServicioSecciones servicioSecciones)
    {
        _context = context;
        _servicioSecciones = servicioSecciones;
    }

    public async Task<IReadOnlyList<FaltanteEnvioDto>> EvaluarAsync(Guid personaId, CancellationToken ct = default)
    {
        var persona = await _context.Personas.FirstOrDefaultAsync(p => p.Id == personaId, ct);
        var abiertas = persona != null
            ? await _servicioSecciones.ObtenerSeccionesAbiertasAsync(persona.InstitucionId, ct)
            : CodigosSeccion.Todas.ToHashSet();

        var faltantes = new List<FaltanteEnvioDto>();

        if (abiertas.Contains(SeccionHojaDeVida.FormacionAcademica))
        {
            var titulosSinRespaldo = await _context.TitulosAcademicos
                .Where(t => t.PersonaId == personaId && t.ArchivoId == null)
                .ToListAsync(ct);

            foreach (var t in titulosSinRespaldo)
            {
                faltantes.Add(new FaltanteEnvioDto("titulos", "item.sin-respaldo", $"El título '{t.NombreTitulo}' no tiene archivo de respaldo adjunto.", t.Id));
            }

            var enCursoSinRespaldo = await _context.TitulosEnCurso
                .Where(t => t.PersonaId == personaId && t.ArchivoId == null)
                .ToListAsync(ct);

            foreach (var t in enCursoSinRespaldo)
            {
                faltantes.Add(new FaltanteEnvioDto("titulos-en-curso", "item.sin-respaldo", $"El título en curso '{t.NombrePrograma}' no tiene archivo de respaldo adjunto.", t.Id));
            }
        }

        if (abiertas.Contains(SeccionHojaDeVida.Capacitaciones))
        {
            var capsSinRespaldo = await _context.Capacitaciones
                .Where(c => c.PersonaId == personaId && c.ArchivoId == null)
                .ToListAsync(ct);

            foreach (var c in capsSinRespaldo)
            {
                faltantes.Add(new FaltanteEnvioDto("capacitaciones", "item.sin-respaldo", $"La capacitación '{c.NombreEvento}' no tiene certificado de respaldo adjunto.", c.Id));
            }
        }

        if (abiertas.Contains(SeccionHojaDeVida.ExperienciaLaboral))
        {
            var expsSinRespaldo = await _context.ExperienciasLaborales
                .Where(e => e.PersonaId == personaId && e.ArchivoId == null)
                .ToListAsync(ct);

            foreach (var e in expsSinRespaldo)
            {
                faltantes.Add(new FaltanteEnvioDto("experiencias", "item.sin-respaldo", $"La experiencia laboral en '{e.Empleador}' no tiene certificado de respaldo adjunto.", e.Id));
            }
        }

        return faltantes;
    }
}

/// <summary>
/// RF-HDV-007, RF-HDV-009: documentos personales marcados como obligatorios según los requisitos aplicables.
/// </summary>
public class ReglaDocumentosPersonalesObligatorios : IReglaCompletitudEnvio
{
    public SeccionHojaDeVida? Seccion => SeccionHojaDeVida.DocumentosPersonales;
    private readonly AplicacionDbContext _context;

    public ReglaDocumentosPersonalesObligatorios(AplicacionDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<FaltanteEnvioDto>> EvaluarAsync(Guid personaId, CancellationToken ct = default)
    {
        var persona = await _context.Personas
            .FirstOrDefaultAsync(p => p.Id == personaId, ct);

        if (persona == null)
        {
            return [];
        }

        var requisitosObligatorios = await _context.RequisitosDocumento
            .Where(r => r.Activo && r.EsObligatorio && (r.TipoFuncionarioId == null || r.TipoFuncionarioId == persona.TipoFuncionarioId))
            .ToListAsync(ct);

        var tipoDocIds = requisitosObligatorios
            .Select(r => r.TipoDocumentoId)
            .Distinct()
            .ToList();

        if (tipoDocIds.Count == 0)
        {
            return [];
        }

        var tiposDocumento = await _context.TiposDocumento
            .Where(td => td.Activo && tipoDocIds.Contains(td.Id))
            .ToDictionaryAsync(td => td.Id, ct);

        var documentosRegistrados = await _context.DocumentosPersonales
            .Where(d => d.PersonaId == personaId && tipoDocIds.Contains(d.TipoDocumentoId) && d.ArchivoId != null)
            .Select(d => d.TipoDocumentoId)
            .ToHashSetAsync(ct);

        var faltantes = new List<FaltanteEnvioDto>();
        foreach (var tipoDocId in tipoDocIds)
        {
            if (!documentosRegistrados.Contains(tipoDocId) && tiposDocumento.TryGetValue(tipoDocId, out var tipoDoc))
            {
                faltantes.Add(new FaltanteEnvioDto(
                    "documentos",
                    "documentos.obligatorio",
                    $"El documento obligatorio '{tipoDoc.Nombre}' no ha sido registrado o no tiene archivo adjunto.",
                    tipoDoc.Id));
            }
        }

        return faltantes;
    }
}
