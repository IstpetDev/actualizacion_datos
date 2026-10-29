namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using Istpet.ActualizacionDatos.Application.Documentos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Application.Validacion;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

public sealed class ArmadorDatosDocumento(
    AplicacionDbContext db,
    IAlmacenArchivos almacenArchivos) : IArmadorDatosDocumento
{
    public async Task<DatosDocumentoHojaDeVida> ArmarDatosPersonaAsync(
        Guid personaId,
        InstitucionId institucionId,
        CancellationToken ct = default)
    {
        var persona = await db.Personas
            .IgnoreQueryFilters()
            .AsNoTracking()
            .SingleOrDefaultAsync(p => p.Id == personaId && p.InstitucionId == institucionId, ct)
            ?? throw new ReglaNegocioException("La persona especificada no existe en la institución.");

        var ficha = await db.FichasPersonales
            .IgnoreQueryFilters()
            .AsNoTracking()
            .SingleOrDefaultAsync(f => f.PersonaId == personaId && f.InstitucionId == institucionId, ct);

        var titulos = await db.TitulosAcademicos
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(t => t.PersonaId == personaId && t.InstitucionId == institucionId)
            .OrderByDescending(t => t.FechaObtencion)
            .ToListAsync(ct);

        var titulosEnCurso = await db.TitulosEnCurso
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(t => t.PersonaId == personaId && t.InstitucionId == institucionId)
            .ToListAsync(ct);

        var capacitaciones = await db.Capacitaciones
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(c => c.PersonaId == personaId && c.InstitucionId == institucionId)
            .OrderByDescending(c => c.FechaInicio)
            .ToListAsync(ct);

        var experiencias = await db.ExperienciasLaborales
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(e => e.PersonaId == personaId && e.InstitucionId == institucionId)
            .OrderByDescending(e => e.FechaInicio)
            .ToListAsync(ct);

        var referencias = await db.ReferenciasPersonales
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(r => r.PersonaId == personaId && r.InstitucionId == institucionId)
            .ToListAsync(ct);

        TipoFuncionario? tipoFuncionario = null;
        if (persona.TipoFuncionarioId.HasValue)
        {
            tipoFuncionario = await db.TiposFuncionario
                .IgnoreQueryFilters()
                .AsNoTracking()
                .SingleOrDefaultAsync(t => t.Id == persona.TipoFuncionarioId.Value, ct);
        }

        // Cargar catálogo de nombres legibles
        var catalogos = await db.ElementosCatalogo
            .AsNoTracking()
            .ToDictionaryAsync(e => e.Id, e => e.Nombre, ct);

        string? Catalogo(int? id) => id.HasValue ? catalogos.GetValueOrDefault(id.Value) : null;

        // Foto de la persona
        byte[]? fotoBytes = null;
        if (ficha?.FotoArchivoId.HasValue == true)
        {
            try
            {
                var streamFoto = await almacenArchivos.AbrirAsync(institucionId, persona.Id, ficha.FotoArchivoId.Value, ct);
                if (streamFoto != null)
                {
                    using (streamFoto)
                    using (var ms = new MemoryStream())
                    {
                        await streamFoto.CopyToAsync(ms, ct);
                        fotoBytes = ms.ToArray();
                    }
                }
            }
            catch
            {
                fotoBytes = null;
            }
        }

        // Nombres y apellidos
        string primerNombre;
        string? segundoNombre = null;
        string primerApellido;
        string? segundoApellido = null;

        if (ficha != null && !string.IsNullOrWhiteSpace(ficha.PrimerNombre) && !string.IsNullOrWhiteSpace(ficha.PrimerApellido))
        {
            primerNombre = ficha.PrimerNombre;
            segundoNombre = ficha.SegundoNombre;
            primerApellido = ficha.PrimerApellido;
            segundoApellido = ficha.SegundoApellido;
        }
        else
        {
            var divididos = DivisorNombres.Dividir(persona.Nombre);
            primerNombre = divididos.PrimerNombre ?? persona.Nombre ?? "—";
            segundoNombre = divididos.SegundoNombre;
            primerApellido = divididos.PrimerApellido ?? "—";
            segundoApellido = divididos.SegundoApellido;
        }

        // Título de mayor nivel y registro SENESCYT principal (PD-PLA-08)
        RegistroSenescytPrincipal? registroSenescytPrincipal = null;
        if (titulos.Count > 0)
        {
            // Determinar peso de mayor nivel
            var elementosGrado = await db.ElementosCatalogo
                .AsNoTracking()
                .Where(e => e.Tipo == TipoCatalogo.GradoAcademico)
                .ToListAsync(ct);

            var elementosNivel = await db.ElementosCatalogo
                .AsNoTracking()
                .Where(e => e.Tipo == TipoCatalogo.NivelAcademico)
                .ToListAsync(ct);

            var gradosDict = elementosGrado.ToDictionary(g => g.Id);
            var nivelesDict = elementosNivel.ToDictionary(n => n.Id);

            int ObtenerPesoTitulo(TituloAcademico t)
            {
                if (!gradosDict.TryGetValue(t.GradoAcademicoId, out var grado) || grado.PadreId == null)
                {
                    return 0;
                }

                if (!nivelesDict.TryGetValue(grado.PadreId.Value, out var nivel))
                {
                    return 0;
                }

                if (int.TryParse(nivel.Codigo, out var num))
                {
                    return num * 10;
                }

                return nivel.Orden * 10;
            }

            var tituloMayor = titulos
                .OrderByDescending(ObtenerPesoTitulo)
                .ThenByDescending(t => !string.IsNullOrWhiteSpace(t.NumeroRegistroSenescyt))
                .ThenByDescending(t => t.FechaObtencion)
                .First();

            if (!string.IsNullOrWhiteSpace(tituloMayor.NumeroRegistroSenescyt) || tituloMayor.FechaObtencion.HasValue)
            {
                registroSenescytPrincipal = new RegistroSenescytPrincipal(
                    NumeroRegistro: tituloMayor.NumeroRegistroSenescyt,
                    FechaRegistro: tituloMayor.FechaObtencion);
            }
        }

        // Dirección formateada
        string? direccionDomicilio = null;
        if (ficha != null)
        {
            var partesDireccion = new List<string>();
            if (!string.IsNullOrWhiteSpace(ficha.CallePrincipal)) partesDireccion.Add(ficha.CallePrincipal);
            if (!string.IsNullOrWhiteSpace(ficha.NumeroCasa)) partesDireccion.Add($"N° {ficha.NumeroCasa}");
            if (!string.IsNullOrWhiteSpace(ficha.CalleSecundaria)) partesDireccion.Add($"y {ficha.CalleSecundaria}");
            if (partesDireccion.Count > 0)
            {
                direccionDomicilio = string.Join(" ", partesDireccion);
            }
        }

        var datosPersonales = new DatosPersonalesDocumento(
            PrimerNombre: primerNombre,
            SegundoNombre: segundoNombre,
            PrimerApellido: primerApellido,
            SegundoApellido: segundoApellido,
            DocumentoIdentidad: persona.Documento,
            TipoPersonal: tipoFuncionario?.Nombre,
            LugarNacimiento: Catalogo(ficha?.ParroquiaNacimientoId) ?? Catalogo(ficha?.PaisNacimientoId),
            FechaNacimiento: ficha?.FechaNacimiento,
            EstadoCivil: Catalogo(ficha?.EstadoCivilId),
            CiudadResidencia: Catalogo(ficha?.ParroquiaResidenciaId),
            DireccionDomicilio: direccionDomicilio,
            Celular: ficha?.Celular,
            TelefonoConvencional: ficha?.TelefonoConvencional,
            CorreoInstitucional: ficha?.CorreoInstitucional ?? persona.Correo,
            CorreoPersonal: ficha?.CorreoPersonal,
            RegistroSenescyt: registroSenescytPrincipal);

        // Perfil profesional generado determinista (ADR-0025)
        var perfilProfesional = PerfilProfesional.Generar(
            titulos.Count,
            titulosEnCurso.Count,
            capacitaciones.Count,
            experiencias.Count);

        // Mapeo de listas ordenadas
        var formacionesDto = titulos.Select(t => new ItemFormacionAcademica(
            Titulo: t.NombreTitulo,
            GradoAcademico: Catalogo(t.GradoAcademicoId),
            Institucion: Catalogo(t.UniversidadId) ?? t.NombreInstitucionOtra,
            FechaObtencion: t.FechaObtencion,
            NumeroRegistroSenescyt: t.NumeroRegistroSenescyt)).ToList();

        var experienciasDto = experiencias.Select(e => new ItemExperienciaLaboral(
            Empleador: e.Empleador,
            Cargo: e.Cargo,
            FechaInicio: e.FechaInicio,
            FechaFin: e.FechaFin,
            TrabajaActualmente: e.TrabajaActualmente,
            Ciudad: e.Ciudad,
            Pais: Catalogo(e.PaisId),
            Funciones: e.Funciones)).ToList();

        var capacitacionesDto = capacitaciones.Select(c => new ItemCapacitacion(
            NombreEvento: c.NombreEvento,
            InstitucionOrganizadora: c.InstitucionOrganizadora,
            TipoCapacitacion: Catalogo(c.TipoCapacitacionId),
            TipoParticipacion: c.TipoParticipacion.ToString(),
            NumeroHoras: c.NumeroHoras,
            Lugar: c.Lugar,
            FechaInicio: c.FechaInicio,
            FechaFin: c.FechaFin)).ToList();

        var referenciasDto = referencias.Select(r => new ItemReferencia(
            NombresApellidos: r.NombresApellidos,
            Tipo: r.Tipo.ToString(),
            Telefono: r.Telefono,
            Titulo: r.Titulo,
            CargoActual: r.CargoActual,
            Empresa: r.Empresa)).ToList();

        // RF-PLA-012: Vista previa si la actualización no está aprobada
        var esVistaPrevia = persona.EstadoActualizacion != EstadoActualizacion.Aprobado;

        return new DatosDocumentoHojaDeVida(
            DatosPersonales: datosPersonales,
            PerfilProfesional: perfilProfesional,
            Formaciones: formacionesDto,
            Experiencias: experienciasDto,
            Capacitaciones: capacitacionesDto,
            Referencias: referenciasDto,
            FechaGeneracion: DateOnly.FromDateTime(DateTime.UtcNow),
            EsVistaPrevia: esVistaPrevia,
            FotoBytes: fotoBytes);
    }
}
