namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Application.Validacion;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

public class ServicioHojaDeVida : IServicioHojaDeVida
{
    private readonly AplicacionDbContext _context;
    private readonly IServicioCampanas _servicioCampanas;
    private readonly ValidadorCatalogos _validadorCatalogos;
    private readonly IServicioSecciones _servicioSecciones;

    public ServicioHojaDeVida(
        AplicacionDbContext context,
        IServicioCampanas servicioCampanas,
        ValidadorCatalogos validadorCatalogos,
        IServicioSecciones servicioSecciones)
    {
        _context = context;
        _servicioCampanas = servicioCampanas;
        _validadorCatalogos = validadorCatalogos;
        _servicioSecciones = servicioSecciones;
    }

    public async Task<HojaDeVidaDto> ObtenerAsync(string documento, CancellationToken ct = default)
    {
        var persona = await _context.Personas
            .FirstOrDefaultAsync(p => p.Documento == documento, ct)
            ?? throw new RecursoNoEncontradoException("La persona no existe en la institución.");

        var campanaActiva = await _servicioCampanas.ObtenerCampanaActivaAsync(ct);
        var puedeEditar = campanaActiva != null && persona.PuedeEditarHojaDeVida;

        var ficha = await _context.FichasPersonales
            .FirstOrDefaultAsync(f => f.PersonaId == persona.Id, ct);

        var titulos = await _context.TitulosAcademicos
            .Where(t => t.PersonaId == persona.Id)
            .OrderByDescending(t => t.FechaObtencion)
            .ThenByDescending(t => t.FechaActualizacionUtc)
            .ToListAsync(ct);

        var enCurso = await _context.TitulosEnCurso
            .Where(t => t.PersonaId == persona.Id)
            .OrderByDescending(t => t.FechaInicio)
            .ThenByDescending(t => t.FechaActualizacionUtc)
            .ToListAsync(ct);

        var caps = await _context.Capacitaciones
            .Where(c => c.PersonaId == persona.Id)
            .OrderByDescending(c => c.FechaInicio)
            .ThenByDescending(c => c.FechaActualizacionUtc)
            .ToListAsync(ct);

        var exps = await _context.ExperienciasLaborales
            .Where(e => e.PersonaId == persona.Id)
            .OrderByDescending(e => e.TrabajaActualmente)
            .ThenByDescending(e => e.FechaFin)
            .ThenByDescending(e => e.FechaInicio)
            .ToListAsync(ct);

        var refs = await _context.ReferenciasPersonales
            .Where(r => r.PersonaId == persona.Id)
            .OrderBy(r => r.Tipo)
            .ThenBy(r => r.NombresApellidos)
            .ToListAsync(ct);

        var abiertasEnum = await _servicioSecciones.ObtenerSeccionesAbiertasAsync(persona.InstitucionId, ct);
        var abiertasCodigos = abiertasEnum.Select(CodigosSeccion.ObtenerCodigo).ToList();

        return new HojaDeVidaDto(
            persona.Id,
            persona.Documento,
            persona.EstadoActualizacion.ToString().ToLowerInvariant(),
            puedeEditar,
            ficha == null ? null : MapearFicha(ficha) with { Perfil = PerfilProfesional.Generar(titulos.Count, enCurso.Count, caps.Count, exps.Count) },
            titulos.Select(MapearTitulo).ToList(),
            enCurso.Select(MapearTituloEnCurso).ToList(),
            caps.Select(MapearCapacitacion).ToList(),
            exps.Select(MapearExperiencia).ToList(),
            refs.Select(MapearReferencia).ToList(),
            abiertasCodigos,
            await ListarCapacitacionesObligatoriasAsync(documento, ct));
    }

    public async Task<HojaDeVidaDto> ObtenerParaRevisionAsync(string documento, CancellationToken ct = default)
    {
        return await ObtenerAsync(documento, ct);
    }

    public async Task<FichaPersonalDto?> ObtenerFichaAsync(string documento, CancellationToken ct = default)
    {
        var persona = await _context.Personas
            .FirstOrDefaultAsync(p => p.Documento == documento, ct)
            ?? throw new RecursoNoEncontradoException("La persona no existe en la institución.");

        var ficha = await _context.FichasPersonales
            .FirstOrDefaultAsync(f => f.PersonaId == persona.Id, ct);

        return ficha == null ? null : MapearFicha(ficha);
    }

    public async Task<FichaPersonalDto> GuardarFichaAsync(string documento, GuardarFichaPersonalRequest request, CancellationToken ct = default)
    {
        var persona = await PersonaEditableAsync(documento, ct);
        await AsegurarSeccionAbiertaAsync(persona, SeccionHojaDeVida.FichaPersonal, ct);
        await ValidarFormatoAsync(request, "ficha", persona.InstitucionId, ct);

        if (request.SexoId.HasValue) await _validadorCatalogos.ValidarAsync(request.SexoId.Value, TipoCatalogo.Sexo, ct);
        if (request.EstadoCivilId.HasValue) await _validadorCatalogos.ValidarAsync(request.EstadoCivilId.Value, TipoCatalogo.EstadoCivil, ct);
        if (request.TipoSangreId.HasValue) await _validadorCatalogos.ValidarAsync(request.TipoSangreId.Value, TipoCatalogo.TipoSangre, ct);
        if (request.EtniaId.HasValue) await _validadorCatalogos.ValidarAsync(request.EtniaId.Value, TipoCatalogo.Etnia, ct);
        if (request.NacionalidadIndigenaId.HasValue) await _validadorCatalogos.ValidarAsync(request.NacionalidadIndigenaId.Value, TipoCatalogo.NacionalidadIndigena, ct);
        if (request.PaisNacionalidadId.HasValue) await _validadorCatalogos.ValidarAsync(request.PaisNacionalidadId.Value, TipoCatalogo.Pais, ct);
        if (request.PaisNacimientoId.HasValue) await _validadorCatalogos.ValidarAsync(request.PaisNacimientoId.Value, TipoCatalogo.Pais, ct);
        if (request.ParroquiaNacimientoId.HasValue) await _validadorCatalogos.ValidarAsync(request.ParroquiaNacimientoId.Value, TipoCatalogo.Parroquia, ct);
        if (request.ParroquiaResidenciaId.HasValue) await _validadorCatalogos.ValidarAsync(request.ParroquiaResidenciaId.Value, TipoCatalogo.Parroquia, ct);
        if (request.DiscapacidadId.HasValue) await _validadorCatalogos.ValidarAsync(request.DiscapacidadId.Value, TipoCatalogo.Discapacidad, ct);

        await AsegurarArchivoPropioAsync(persona.Id, request.FotoArchivoId, esFoto: true, ct);

        var ficha = await _context.FichasPersonales
            .FirstOrDefaultAsync(f => f.PersonaId == persona.Id, ct);

        if (ficha == null)
        {
            ficha = new FichaPersonal(persona.InstitucionId, persona.Id);
            _context.FichasPersonales.Add(ficha);
        }

        ficha.Actualizar(new DatosFichaPersonal(
            request.PrimerNombre,
            request.SegundoNombre,
            request.PrimerApellido,
            request.SegundoApellido,
            request.SexoId,
            request.FechaNacimiento,
            request.EstadoCivilId,
            request.TipoSangreId,
            request.EtniaId,
            request.NacionalidadIndigenaId,
            request.PaisNacionalidadId,
            request.PaisNacimientoId,
            request.ParroquiaNacimientoId,
            request.ParroquiaResidenciaId,
            request.CallePrincipal,
            request.CalleSecundaria,
            request.NumeroCasa,
            request.ReferenciaDomicilio,
            request.CodigoPostal,
            request.TelefonoConvencional,
            request.Celular,
            request.CorreoInstitucional,
            request.CorreoPersonal,
            request.DiscapacidadId,
            request.PorcentajeDiscapacidad,
            request.NumeroCarnetDiscapacidad,
            ficha.Perfil));

        ficha.AsociarFoto(request.FotoArchivoId);

        // ADR-0037: el nombre confirmado reemplaza al original de la nómina.
        persona.ActualizarNombre(string.Join(" ", new[]
        {
            ficha.PrimerApellido, ficha.SegundoApellido, ficha.PrimerNombre, ficha.SegundoNombre
        }.Where(parte => !string.IsNullOrWhiteSpace(parte))));

        if (string.IsNullOrWhiteSpace(persona.Correo) && !string.IsNullOrWhiteSpace(ficha.CorreoInstitucional))
        {
            persona.ActualizarCorreo(ficha.CorreoInstitucional);
        }

        await _context.SaveChangesAsync(ct);
        return MapearFicha(ficha);
    }

    public async Task<TituloAcademicoDto> AgregarTituloAsync(string documento, GuardarTituloAcademicoRequest request, CancellationToken ct = default)
    {
        var persona = await PersonaEditableAsync(documento, ct);
        await AsegurarSeccionAbiertaAsync(persona, SeccionHojaDeVida.FormacionAcademica, ct);
        await ValidarFormatoAsync(request, "titulo", persona.InstitucionId, ct);
        await ValidarCatalogosTituloAsync(request, ct);
        await AsegurarArchivoPropioAsync(persona.Id, request.ArchivoId, esFoto: false, ct);

        var titulo = new TituloAcademico(
            Guid.NewGuid(),
            persona.InstitucionId,
            persona.Id,
            new DatosTituloAcademico(
                request.NombreTitulo,
                request.GradoAcademicoId,
                request.UniversidadId,
                request.NombreInstitucionOtra,
                request.CampoDetalladoUnescoId,
                request.NumeroRegistroSenescyt,
                request.FechaObtencion,
                request.FechaRegistroSenescyt));

        titulo.AsociarArchivo(request.ArchivoId);
        _context.TitulosAcademicos.Add(titulo);
        await _context.SaveChangesAsync(ct);

        return MapearTitulo(titulo);
    }

    public async Task<TituloAcademicoDto> ActualizarTituloAsync(string documento, Guid id, GuardarTituloAcademicoRequest request, CancellationToken ct = default)
    {
        var persona = await PersonaEditableAsync(documento, ct);
        await AsegurarSeccionAbiertaAsync(persona, SeccionHojaDeVida.FormacionAcademica, ct);
        await ValidarFormatoAsync(request, "titulo", persona.InstitucionId, ct);
        var titulo = await _context.TitulosAcademicos
            .FirstOrDefaultAsync(t => t.Id == id && t.PersonaId == persona.Id, ct)
            ?? throw new RecursoNoEncontradoException("El título académico no existe.");

        await ValidarCatalogosTituloAsync(request, ct);
        await AsegurarArchivoPropioAsync(persona.Id, request.ArchivoId, esFoto: false, ct);

        titulo.Actualizar(new DatosTituloAcademico(
            request.NombreTitulo,
            request.GradoAcademicoId,
            request.UniversidadId,
            request.NombreInstitucionOtra,
            request.CampoDetalladoUnescoId,
            request.NumeroRegistroSenescyt,
            request.FechaObtencion,
            request.FechaRegistroSenescyt));

        titulo.AsociarArchivo(request.ArchivoId);
        await _context.SaveChangesAsync(ct);

        return MapearTitulo(titulo);
    }

    public async Task EliminarTituloAsync(string documento, Guid id, CancellationToken ct = default)
    {
        var persona = await PersonaEditableAsync(documento, ct);
        await AsegurarSeccionAbiertaAsync(persona, SeccionHojaDeVida.FormacionAcademica, ct);
        var titulo = await _context.TitulosAcademicos
            .FirstOrDefaultAsync(t => t.Id == id && t.PersonaId == persona.Id, ct)
            ?? throw new RecursoNoEncontradoException("El título académico no existe.");

        _context.TitulosAcademicos.Remove(titulo);
        await _context.SaveChangesAsync(ct);
    }

    public async Task<TituloEnCursoDto> AgregarTituloEnCursoAsync(string documento, GuardarTituloEnCursoRequest request, CancellationToken ct = default)
    {
        var persona = await PersonaEditableAsync(documento, ct);
        await AsegurarSeccionAbiertaAsync(persona, SeccionHojaDeVida.FormacionAcademica, ct);
        await ValidarFormatoAsync(request, "tituloEnCurso", persona.InstitucionId, ct);
        await ValidarCatalogosTituloEnCursoAsync(request, ct);
        await AsegurarArchivoPropioAsync(persona.Id, request.ArchivoId, esFoto: false, ct);

        var enCurso = new TituloEnCurso(
            Guid.NewGuid(),
            persona.InstitucionId,
            persona.Id,
            new DatosTituloEnCurso(
                request.NombrePrograma,
                request.GradoAcademicoId,
                request.UniversidadId,
                request.NombreInstitucionOtra,
                request.CampoDetalladoUnescoId,
                request.FechaInicio,
                request.FechaFinEstimada,
                request.TieneBeca,
                request.TipoBecaId,
                request.FinanciamientoBecaId,
                request.PorcentajeBeca,
                request.MontoBeca));

        enCurso.AsociarArchivo(request.ArchivoId);
        _context.TitulosEnCurso.Add(enCurso);
        await _context.SaveChangesAsync(ct);

        return MapearTituloEnCurso(enCurso);
    }

    public async Task<TituloEnCursoDto> ActualizarTituloEnCursoAsync(string documento, Guid id, GuardarTituloEnCursoRequest request, CancellationToken ct = default)
    {
        var persona = await PersonaEditableAsync(documento, ct);
        await AsegurarSeccionAbiertaAsync(persona, SeccionHojaDeVida.FormacionAcademica, ct);
        await ValidarFormatoAsync(request, "tituloEnCurso", persona.InstitucionId, ct);
        var enCurso = await _context.TitulosEnCurso
            .FirstOrDefaultAsync(t => t.Id == id && t.PersonaId == persona.Id, ct)
            ?? throw new RecursoNoEncontradoException("El título en curso no existe.");

        await ValidarCatalogosTituloEnCursoAsync(request, ct);
        await AsegurarArchivoPropioAsync(persona.Id, request.ArchivoId, esFoto: false, ct);

        enCurso.Actualizar(new DatosTituloEnCurso(
            request.NombrePrograma,
            request.GradoAcademicoId,
            request.UniversidadId,
            request.NombreInstitucionOtra,
            request.CampoDetalladoUnescoId,
            request.FechaInicio,
            request.FechaFinEstimada,
            request.TieneBeca,
            request.TipoBecaId,
            request.FinanciamientoBecaId,
            request.PorcentajeBeca,
            request.MontoBeca));

        enCurso.AsociarArchivo(request.ArchivoId);
        await _context.SaveChangesAsync(ct);

        return MapearTituloEnCurso(enCurso);
    }

    public async Task EliminarTituloEnCursoAsync(string documento, Guid id, CancellationToken ct = default)
    {
        var persona = await PersonaEditableAsync(documento, ct);
        await AsegurarSeccionAbiertaAsync(persona, SeccionHojaDeVida.FormacionAcademica, ct);
        var enCurso = await _context.TitulosEnCurso
            .FirstOrDefaultAsync(t => t.Id == id && t.PersonaId == persona.Id, ct)
            ?? throw new RecursoNoEncontradoException("El título en curso no existe.");

        _context.TitulosEnCurso.Remove(enCurso);
        await _context.SaveChangesAsync(ct);
    }

    public async Task<CapacitacionDto> AgregarCapacitacionAsync(string documento, GuardarCapacitacionRequest request, CancellationToken ct = default)
    {
        var persona = await PersonaEditableAsync(documento, ct);
        await AsegurarSeccionAbiertaAsync(persona, SeccionHojaDeVida.Capacitaciones, ct);
        await ValidarFormatoAsync(request, "capacitacion", persona.InstitucionId, ct);
        var participacion = ParsearTipoParticipacion(request.TipoParticipacion);

        if (request.TipoCapacitacionId.HasValue)
        {
            await _validadorCatalogos.ValidarAsync(request.TipoCapacitacionId.Value, TipoCatalogo.TipoCapacitacion, ct);
        }

        await AsegurarArchivoPropioAsync(persona.Id, request.ArchivoId, esFoto: false, ct);

        if (request.CapacitacionObligatoriaId.HasValue)
        {
            await ValidarObligatoriaAsync(request.CapacitacionObligatoriaId.Value, persona, ct);
            await DesvincularPreviaMismaObligatoriaAsync(persona.Id, request.CapacitacionObligatoriaId.Value, null, ct);
        }

        var capacitacion = new Capacitacion(
            Guid.NewGuid(),
            persona.InstitucionId,
            persona.Id,
            new DatosCapacitacion(
                request.NombreEvento,
                request.InstitucionOrganizadora,
                request.TipoCapacitacionId,
                participacion,
                request.FechaInicio,
                request.FechaFin,
                request.NumeroHoras,
                request.Lugar,
                request.FinanciadaPorInstitucion,
                request.CapacitacionObligatoriaId));

        capacitacion.AsociarArchivo(request.ArchivoId);
        _context.Capacitaciones.Add(capacitacion);
        await _context.SaveChangesAsync(ct);

        return MapearCapacitacion(capacitacion);
    }

    public async Task<CapacitacionDto> ActualizarCapacitacionAsync(string documento, Guid id, GuardarCapacitacionRequest request, CancellationToken ct = default)
    {
        var persona = await PersonaEditableAsync(documento, ct);
        await AsegurarSeccionAbiertaAsync(persona, SeccionHojaDeVida.Capacitaciones, ct);
        await ValidarFormatoAsync(request, "capacitacion", persona.InstitucionId, ct);
        var capacitacion = await _context.Capacitaciones
            .FirstOrDefaultAsync(c => c.Id == id && c.PersonaId == persona.Id, ct)
            ?? throw new RecursoNoEncontradoException("La capacitación no existe.");

        var participacion = ParsearTipoParticipacion(request.TipoParticipacion);

        if (request.TipoCapacitacionId.HasValue)
        {
            await _validadorCatalogos.ValidarAsync(request.TipoCapacitacionId.Value, TipoCatalogo.TipoCapacitacion, ct);
        }

        await AsegurarArchivoPropioAsync(persona.Id, request.ArchivoId, esFoto: false, ct);

        if (request.CapacitacionObligatoriaId.HasValue)
        {
            await ValidarObligatoriaAsync(request.CapacitacionObligatoriaId.Value, persona, ct);
            await DesvincularPreviaMismaObligatoriaAsync(persona.Id, request.CapacitacionObligatoriaId.Value, capacitacion.Id, ct);
        }

        capacitacion.Actualizar(new DatosCapacitacion(
            request.NombreEvento,
            request.InstitucionOrganizadora,
            request.TipoCapacitacionId,
            participacion,
            request.FechaInicio,
            request.FechaFin,
            request.NumeroHoras,
            request.Lugar,
            request.FinanciadaPorInstitucion,
            request.CapacitacionObligatoriaId));

        capacitacion.AsociarArchivo(request.ArchivoId);
        await _context.SaveChangesAsync(ct);

        return MapearCapacitacion(capacitacion);
    }

    public async Task EliminarCapacitacionAsync(string documento, Guid id, CancellationToken ct = default)
    {
        var persona = await PersonaEditableAsync(documento, ct);
        await AsegurarSeccionAbiertaAsync(persona, SeccionHojaDeVida.Capacitaciones, ct);
        var capacitacion = await _context.Capacitaciones
            .FirstOrDefaultAsync(c => c.Id == id && c.PersonaId == persona.Id, ct)
            ?? throw new RecursoNoEncontradoException("La capacitación no existe.");

        _context.Capacitaciones.Remove(capacitacion);
        await _context.SaveChangesAsync(ct);
    }

    public async Task<ExperienciaLaboralDto> AgregarExperienciaAsync(string documento, GuardarExperienciaLaboralRequest request, CancellationToken ct = default)
    {
        var persona = await PersonaEditableAsync(documento, ct);
        await AsegurarSeccionAbiertaAsync(persona, SeccionHojaDeVida.ExperienciaLaboral, ct);
        await ValidarFormatoAsync(request, "experiencia", persona.InstitucionId, ct);

        if (request.PaisId.HasValue)
        {
            await _validadorCatalogos.ValidarAsync(request.PaisId.Value, TipoCatalogo.Pais, ct);
        }

        await AsegurarArchivoPropioAsync(persona.Id, request.ArchivoId, esFoto: false, ct);

        var experiencia = new ExperienciaLaboral(
            Guid.NewGuid(),
            persona.InstitucionId,
            persona.Id,
            new DatosExperienciaLaboral(
                request.Empleador,
                request.Cargo,
                request.FechaInicio,
                request.FechaFin,
                request.TrabajaActualmente,
                request.Ciudad,
                request.PaisId,
                request.Funciones));

        experiencia.AsociarArchivo(request.ArchivoId);
        _context.ExperienciasLaborales.Add(experiencia);
        await _context.SaveChangesAsync(ct);

        return MapearExperiencia(experiencia);
    }

    public async Task<ExperienciaLaboralDto> ActualizarExperienciaAsync(string documento, Guid id, GuardarExperienciaLaboralRequest request, CancellationToken ct = default)
    {
        var persona = await PersonaEditableAsync(documento, ct);
        await AsegurarSeccionAbiertaAsync(persona, SeccionHojaDeVida.ExperienciaLaboral, ct);
        await ValidarFormatoAsync(request, "experiencia", persona.InstitucionId, ct);
        var experiencia = await _context.ExperienciasLaborales
            .FirstOrDefaultAsync(e => e.Id == id && e.PersonaId == persona.Id, ct)
            ?? throw new RecursoNoEncontradoException("La experiencia laboral no existe.");

        if (request.PaisId.HasValue)
        {
            await _validadorCatalogos.ValidarAsync(request.PaisId.Value, TipoCatalogo.Pais, ct);
        }

        await AsegurarArchivoPropioAsync(persona.Id, request.ArchivoId, esFoto: false, ct);

        experiencia.Actualizar(new DatosExperienciaLaboral(
            request.Empleador,
            request.Cargo,
            request.FechaInicio,
            request.FechaFin,
            request.TrabajaActualmente,
            request.Ciudad,
            request.PaisId,
            request.Funciones));

        experiencia.AsociarArchivo(request.ArchivoId);
        await _context.SaveChangesAsync(ct);

        return MapearExperiencia(experiencia);
    }

    public async Task EliminarExperienciaAsync(string documento, Guid id, CancellationToken ct = default)
    {
        var persona = await PersonaEditableAsync(documento, ct);
        await AsegurarSeccionAbiertaAsync(persona, SeccionHojaDeVida.ExperienciaLaboral, ct);
        var experiencia = await _context.ExperienciasLaborales
            .FirstOrDefaultAsync(e => e.Id == id && e.PersonaId == persona.Id, ct)
            ?? throw new RecursoNoEncontradoException("La experiencia laboral no existe.");

        _context.ExperienciasLaborales.Remove(experiencia);
        await _context.SaveChangesAsync(ct);
    }

    public async Task<ReferenciaDto> AgregarReferenciaAsync(string documento, GuardarReferenciaRequest request, CancellationToken ct = default)
    {
        var persona = await PersonaEditableAsync(documento, ct);
        await AsegurarSeccionAbiertaAsync(persona, SeccionHojaDeVida.Referencias, ct);
        await ValidarFormatoAsync(request, "referencia", persona.InstitucionId, ct);
        var tipo = ParsearTipoReferencia(request.Tipo);

        var conteo = await _context.ReferenciasPersonales
            .CountAsync(r => r.PersonaId == persona.Id && r.Tipo == tipo, ct);

        if (conteo >= 5)
        {
            throw new ReglaNegocioException($"No se pueden registrar más de cinco referencias de tipo {request.Tipo.ToLowerInvariant()}.");
        }

        var referencia = new ReferenciaPersonal(
            Guid.NewGuid(),
            persona.InstitucionId,
            persona.Id,
            new DatosReferencia(
                tipo,
                request.NombresApellidos,
                request.Telefono,
                request.Titulo,
                request.CargoActual,
                request.Empresa));

        _context.ReferenciasPersonales.Add(referencia);
        await _context.SaveChangesAsync(ct);

        return MapearReferencia(referencia);
    }

    public async Task<ReferenciaDto> ActualizarReferenciaAsync(string documento, Guid id, GuardarReferenciaRequest request, CancellationToken ct = default)
    {
        var persona = await PersonaEditableAsync(documento, ct);
        await AsegurarSeccionAbiertaAsync(persona, SeccionHojaDeVida.Referencias, ct);
        await ValidarFormatoAsync(request, "referencia", persona.InstitucionId, ct);
        var referencia = await _context.ReferenciasPersonales
            .FirstOrDefaultAsync(r => r.Id == id && r.PersonaId == persona.Id, ct)
            ?? throw new RecursoNoEncontradoException("La referencia no existe.");

        var nuevoTipo = ParsearTipoReferencia(request.Tipo);

        if (referencia.Tipo != nuevoTipo)
        {
            var conteo = await _context.ReferenciasPersonales
                .CountAsync(r => r.PersonaId == persona.Id && r.Tipo == nuevoTipo, ct);

            if (conteo >= 5)
            {
                throw new ReglaNegocioException($"No se pueden registrar más de cinco referencias de tipo {request.Tipo.ToLowerInvariant()}.");
            }
        }

        referencia.Actualizar(new DatosReferencia(
            nuevoTipo,
            request.NombresApellidos,
            request.Telefono,
            request.Titulo,
            request.CargoActual,
            request.Empresa));

        await _context.SaveChangesAsync(ct);

        return MapearReferencia(referencia);
    }

    public async Task EliminarReferenciaAsync(string documento, Guid id, CancellationToken ct = default)
    {
        var persona = await PersonaEditableAsync(documento, ct);
        await AsegurarSeccionAbiertaAsync(persona, SeccionHojaDeVida.Referencias, ct);
        var referencia = await _context.ReferenciasPersonales
            .FirstOrDefaultAsync(r => r.Id == id && r.PersonaId == persona.Id, ct)
            ?? throw new RecursoNoEncontradoException("La referencia no existe.");

        _context.ReferenciasPersonales.Remove(referencia);
        await _context.SaveChangesAsync(ct);
    }

    private async Task ValidarFormatoAsync(object datos, string seccion, InstitucionId institucionId, CancellationToken ct)
    {
        var institucion = await _context.Instituciones.SingleAsync(i => i.Id == institucionId, ct);
        ValidacionHojaDeVida.Validar(datos, seccion, ValidacionHojaDeVida.Politica(institucionId.Valor, institucion.ObtenerDominiosCorreo()));
    }

    private async Task<Persona> PersonaEditableAsync(string documento, CancellationToken ct)
    {
        if (await _servicioCampanas.ObtenerCampanaActivaAsync(ct) == null)
        {
            throw new ReglaNegocioException("No se permite modificar la hoja de vida fuera del período de una campaña abierta.");
        }

        var persona = await _context.Personas
            .FirstOrDefaultAsync(p => p.Documento == documento, ct)
            ?? throw new RecursoNoEncontradoException("La persona no existe en la institución.");

        persona.AsegurarEdicionPermitida();
        return persona;
    }

    private async Task AsegurarSeccionAbiertaAsync(Persona persona, SeccionHojaDeVida seccion, CancellationToken ct)
    {
        if (!await _servicioSecciones.EstaAbiertaAsync(persona.InstitucionId, seccion, ct))
        {
            throw new SeccionNoDisponibleException();
        }
    }

    private async Task AsegurarArchivoPropioAsync(Guid personaId, Guid? archivoId, bool esFoto, CancellationToken ct)
    {
        if (archivoId == null)
        {
            return;
        }

        var archivo = await _context.ArchivosAdjuntos
            .FirstOrDefaultAsync(a => a.Id == archivoId.Value && a.PersonaId == personaId, ct)
            ?? throw new RecursoNoEncontradoException("El archivo adjunto no existe o no pertenece a la persona.");

        if (esFoto && archivo.TipoContenido != "image/png" && archivo.TipoContenido != "image/jpeg")
        {
            throw new ReglaNegocioException("La foto debe ser un archivo de imagen (PNG o JPG).");
        }
    }

    private async Task ValidarCatalogosTituloAsync(GuardarTituloAcademicoRequest request, CancellationToken ct)
    {
        await _validadorCatalogos.ValidarAsync(request.GradoAcademicoId, TipoCatalogo.GradoAcademico, ct);

        if (request.UniversidadId.HasValue)
        {
            await _validadorCatalogos.ValidarAsync(request.UniversidadId.Value, TipoCatalogo.Universidad, ct);
        }

        if (request.CampoDetalladoUnescoId.HasValue)
        {
            await _validadorCatalogos.ValidarAsync(request.CampoDetalladoUnescoId.Value, TipoCatalogo.CampoDetalladoUnesco, ct);
        }
    }

    private async Task ValidarCatalogosTituloEnCursoAsync(GuardarTituloEnCursoRequest request, CancellationToken ct)
    {
        await _validadorCatalogos.ValidarAsync(request.GradoAcademicoId, TipoCatalogo.GradoAcademico, ct);

        if (request.UniversidadId.HasValue)
        {
            await _validadorCatalogos.ValidarAsync(request.UniversidadId.Value, TipoCatalogo.Universidad, ct);
        }

        if (request.CampoDetalladoUnescoId.HasValue)
        {
            await _validadorCatalogos.ValidarAsync(request.CampoDetalladoUnescoId.Value, TipoCatalogo.CampoDetalladoUnesco, ct);
        }

        if (request.TieneBeca)
        {
            if (request.TipoBecaId.HasValue)
            {
                await _validadorCatalogos.ValidarAsync(request.TipoBecaId.Value, TipoCatalogo.TipoBeca, ct);
            }

            if (request.FinanciamientoBecaId.HasValue)
            {
                await _validadorCatalogos.ValidarAsync(request.FinanciamientoBecaId.Value, TipoCatalogo.FinanciamientoBeca, ct);
            }
        }
    }

    private static TipoParticipacionCapacitacion ParsearTipoParticipacion(string? tipo)
    {
        if (Enum.TryParse<TipoParticipacionCapacitacion>(tipo, ignoreCase: true, out var participacion) &&
            Enum.IsDefined(participacion))
        {
            return participacion;
        }

        throw new ReglaNegocioException("El tipo de participación debe ser asistente, aprobado o facilitador.");
    }

    private static TipoReferencia ParsearTipoReferencia(string? tipo)
    {
        if (Enum.TryParse<TipoReferencia>(tipo, ignoreCase: true, out var tipoReferencia) &&
            Enum.IsDefined(tipoReferencia))
        {
            return tipoReferencia;
        }

        throw new ReglaNegocioException("El tipo de referencia debe ser personal o familiar.");
    }

    private static FichaPersonalDto MapearFicha(FichaPersonal f) => new(
        f.PersonaId,
        f.PrimerNombre,
        f.SegundoNombre,
        f.PrimerApellido,
        f.SegundoApellido,
        f.SexoId,
        f.FechaNacimiento,
        f.EstadoCivilId,
        f.TipoSangreId,
        f.EtniaId,
        f.NacionalidadIndigenaId,
        f.PaisNacionalidadId,
        f.PaisNacimientoId,
        f.ParroquiaNacimientoId,
        f.ParroquiaResidenciaId,
        f.CallePrincipal,
        f.CalleSecundaria,
        f.NumeroCasa,
        f.ReferenciaDomicilio,
        f.CodigoPostal,
        f.TelefonoConvencional,
        f.Celular,
        f.CorreoInstitucional,
        f.CorreoPersonal,
        f.DiscapacidadId,
        f.PorcentajeDiscapacidad,
        f.NumeroCarnetDiscapacidad,
        null,
        f.FotoArchivoId,
        f.FechaActualizacionUtc);

    private static TituloAcademicoDto MapearTitulo(TituloAcademico t) => new(
        t.Id,
        t.NombreTitulo,
        t.GradoAcademicoId,
        t.UniversidadId,
        t.NombreInstitucionOtra,
        t.CampoDetalladoUnescoId,
        t.NumeroRegistroSenescyt,
        t.FechaObtencion,
        t.FechaRegistroSenescyt,
        t.ArchivoId,
        t.FechaActualizacionUtc);

    private static TituloEnCursoDto MapearTituloEnCurso(TituloEnCurso t) => new(
        t.Id,
        t.NombrePrograma,
        t.GradoAcademicoId,
        t.UniversidadId,
        t.NombreInstitucionOtra,
        t.CampoDetalladoUnescoId,
        t.FechaInicio,
        t.FechaFinEstimada,
        t.TieneBeca,
        t.TipoBecaId,
        t.FinanciamientoBecaId,
        t.PorcentajeBeca,
        t.MontoBeca,
        t.ArchivoId,
        t.FechaActualizacionUtc);

    private static CapacitacionDto MapearCapacitacion(Capacitacion c) => new(
        c.Id,
        c.NombreEvento,
        c.InstitucionOrganizadora,
        c.TipoCapacitacionId,
        c.TipoParticipacion.ToString().ToLowerInvariant(),
        c.FechaInicio,
        c.FechaFin,
        c.NumeroHoras,
        c.Lugar,
        c.FinanciadaPorInstitucion,
        c.ArchivoId,
        c.FechaActualizacionUtc,
        c.CapacitacionObligatoriaId);

    public async Task<List<EstadoCapacitacionObligatoriaPersonaDto>> ListarCapacitacionesObligatoriasAsync(string documento, CancellationToken ct = default)
    {
        var persona = await _context.Personas
            .FirstOrDefaultAsync(p => p.Documento == documento, ct)
            ?? throw new RecursoNoEncontradoException("La persona no existe en la institución.");

        var obligatorias = await _context.CapacitacionesObligatorias
            .Where(o => o.InstitucionId == persona.InstitucionId && o.Activo)
            .OrderBy(o => o.Orden)
            .ThenBy(o => o.Nombre)
            .ToListAsync(ct);

        var obligatoriasAplicables = obligatorias.Where(o => o.AplicaA(persona.TipoFuncionarioId)).ToList();
        if (obligatoriasAplicables.Count == 0)
        {
            return [];
        }

        var capacitaciones = await _context.Capacitaciones
            .Where(c => c.PersonaId == persona.Id && c.CapacitacionObligatoriaId != null)
            .ToListAsync(ct);

        var marcasObservadas = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (persona.EstadoActualizacion == EstadoActualizacion.Devuelto)
        {
            var ultimaObservacion = await _context.Observaciones
                .Where(o => o.PersonaId == persona.Id)
                .OrderByDescending(o => o.FechaUtc)
                .FirstOrDefaultAsync(ct);

            if (ultimaObservacion != null)
            {
                var marcas = await _context.MarcasObservacion
                    .Where(m => m.ObservacionId == ultimaObservacion.Id)
                    .Select(m => m.ClaveDestino)
                    .ToListAsync(ct);

                foreach (var m in marcas)
                {
                    marcasObservadas.Add(m);
                }
            }
        }

        var justificaciones = ObtenerJustificacionesNuevoIngreso(persona.DatosPersonalesJson);

        var resultado = new List<EstadoCapacitacionObligatoriaPersonaDto>();
        foreach (var ob in obligatoriasAplicables)
        {
            var vinculada = capacitaciones.FirstOrDefault(c => c.CapacitacionObligatoriaId == ob.Id);
            string estado;
            Guid? capId = vinculada?.Id;
            string? justificacion = null;
            DateTime? fechaJustificacion = null;

            if (vinculada != null)
            {
                var esObservada = marcasObservadas.Contains($"capacitacion:{vinculada.Id}") ||
                                  marcasObservadas.Contains($"capacitacion_obligatoria:{ob.Id}") ||
                                  marcasObservadas.Contains($"capacitaciones.obligatoria.{ob.Id}");
                estado = esObservada ? "observada" : "cargada";
            }
            else if (ob.EsExentoPorNuevoIngreso(persona.FechaIngresoInstitucion))
            {
                estado = "exento-nuevo-ingreso";
            }
            else if (justificaciones.TryGetValue(ob.Id, out var itemJustificado))
            {
                estado = "justificada-nuevo-ingreso";
                justificacion = itemJustificado.Justificacion;
                fechaJustificacion = itemJustificado.FechaUtc;
            }
            else
            {
                estado = "pendiente";
            }

            resultado.Add(new EstadoCapacitacionObligatoriaPersonaDto(
                ob.Id,
                ob.Nombre,
                ob.InstitucionOrganizadora,
                ob.HorasEsperadas,
                ob.FechaRealizacion,
                ob.TipoFuncionarioId,
                estado,
                capId,
                justificacion,
                fechaJustificacion,
                persona.FechaIngresoInstitucion));
        }

        return resultado;
    }

    public async Task VincularCapacitacionObligatoriaAsync(string documento, Guid obligatoriaId, VincularCapacitacionObligatoriaRequest request, CancellationToken ct = default)
    {
        var persona = await PersonaEditableAsync(documento, ct);
        await AsegurarSeccionAbiertaAsync(persona, SeccionHojaDeVida.Capacitaciones, ct);

        var ob = await ValidarObligatoriaAsync(obligatoriaId, persona, ct);

        var capacitacion = await _context.Capacitaciones
            .FirstOrDefaultAsync(c => c.Id == request.CapacitacionId && c.PersonaId == persona.Id, ct)
            ?? throw new RecursoNoEncontradoException("La capacitación no existe o no pertenece a la persona.");

        if (capacitacion.CapacitacionObligatoriaId.HasValue && capacitacion.CapacitacionObligatoriaId != obligatoriaId)
        {
            throw new ConflictoEstadoException("La capacitación ya se encuentra vinculada a otra obligación institucional.");
        }

        await DesvincularPreviaMismaObligatoriaAsync(persona.Id, obligatoriaId, capacitacion.Id, ct);

        capacitacion.VincularCapacitacionObligatoria(obligatoriaId);
        await _context.SaveChangesAsync(ct);
    }

    public async Task JustificarNuevoIngresoAsync(string documento, Guid obligatoriaId, JustificarNuevoIngresoRequest request, CancellationToken ct = default)
    {
        var persona = await PersonaEditableAsync(documento, ct);
        await AsegurarSeccionAbiertaAsync(persona, SeccionHojaDeVida.Capacitaciones, ct);

        if (string.IsNullOrWhiteSpace(request.Justificacion) || request.Justificacion.Trim().Length > 500)
        {
            throw new ReglaNegocioException("La justificación es obligatoria y no puede superar 500 caracteres.");
        }

        await ValidarObligatoriaAsync(obligatoriaId, persona, ct);

        var justificaciones = ObtenerJustificacionesNuevoIngreso(persona.DatosPersonalesJson);
        justificaciones[obligatoriaId] = new JustificacionItem(request.Justificacion.Trim(), DateTime.UtcNow);

        GuardarJustificacionesNuevoIngreso(persona, justificaciones);
        await _context.SaveChangesAsync(ct);
    }

    private async Task<CapacitacionObligatoria> ValidarObligatoriaAsync(Guid obligatoriaId, Persona persona, CancellationToken ct)
    {
        var ob = await _context.CapacitacionesObligatorias
            .FirstOrDefaultAsync(o => o.Id == obligatoriaId && o.InstitucionId == persona.InstitucionId && o.Activo, ct)
            ?? throw new RecursoNoEncontradoException("La capacitación obligatoria no existe en la institución o está inactiva.");

        if (!ob.AplicaA(persona.TipoFuncionarioId))
        {
            throw new RecursoNoEncontradoException("La capacitación obligatoria no aplica a su tipo de funcionario.");
        }

        return ob;
    }

    private async Task DesvincularPreviaMismaObligatoriaAsync(Guid personaId, Guid obligatoriaId, Guid? excluirCapacitacionId, CancellationToken ct)
    {
        var query = _context.Capacitaciones
            .Where(c => c.PersonaId == personaId && c.CapacitacionObligatoriaId == obligatoriaId);

        if (excluirCapacitacionId.HasValue)
        {
            query = query.Where(c => c.Id != excluirCapacitacionId.Value);
        }

        var previas = await query.ToListAsync(ct);
        foreach (var p in previas)
        {
            p.VincularCapacitacionObligatoria(null);
        }
    }

    private sealed record JustificacionItem(string Justificacion, DateTime FechaUtc);

    private static Dictionary<Guid, JustificacionItem> ObtenerJustificacionesNuevoIngreso(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("justificaciones_capacitaciones", out var prop))
            {
                var dict = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, JustificacionItem>>(prop.GetRawText());
                if (dict != null)
                {
                    return dict
                        .Where(kvp => Guid.TryParse(kvp.Key, out _))
                        .ToDictionary(kvp => Guid.Parse(kvp.Key), kvp => kvp.Value);
                }
            }
        }
        catch (System.Text.Json.JsonException)
        {
        }
        return [];
    }

    private static void GuardarJustificacionesNuevoIngreso(Persona persona, Dictionary<Guid, JustificacionItem> justificaciones)
    {
        Dictionary<string, object?> root = [];
        if (!string.IsNullOrWhiteSpace(persona.DatosPersonalesJson))
        {
            try
            {
                var parsed = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object?>>(persona.DatosPersonalesJson);
                if (parsed != null)
                {
                    root = parsed;
                }
            }
            catch (System.Text.Json.JsonException)
            {
            }
        }

        var dictStr = justificaciones.ToDictionary(k => k.Key.ToString(), v => v.Value);
        root["justificaciones_capacitaciones"] = dictStr;
        persona.ActualizarBorrador(System.Text.Json.JsonSerializer.Serialize(root));
    }

    private static ExperienciaLaboralDto MapearExperiencia(ExperienciaLaboral e) => new(
        e.Id,
        e.Empleador,
        e.Cargo,
        e.FechaInicio,
        e.FechaFin,
        e.TrabajaActualmente,
        e.Ciudad,
        e.PaisId,
        e.Funciones,
        e.ArchivoId,
        e.FechaActualizacionUtc);

    private static ReferenciaDto MapearReferencia(ReferenciaPersonal r) => new(
        r.Id,
        r.Tipo.ToString().ToLowerInvariant(),
        r.NombresApellidos,
        r.Telefono,
        r.Titulo,
        r.CargoActual,
        r.Empresa,
        r.FechaActualizacionUtc);
}
