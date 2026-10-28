namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using System.Security.Cryptography;
using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

public class ServicioArchivos : IServicioArchivos
{
    private readonly AplicacionDbContext _context;
    private readonly IAlmacenArchivos _almacenArchivos;
    private readonly IServicioCampanas _servicioCampanas;
    private readonly IContextoInstitucion _contextoInstitucion;
    private readonly IServicioSecciones _servicioSecciones;

    public ServicioArchivos(
        AplicacionDbContext context,
        IAlmacenArchivos almacenArchivos,
        IServicioCampanas servicioCampanas,
        IContextoInstitucion contextoInstitucion,
        IServicioSecciones servicioSecciones)
    {
        _context = context;
        _almacenArchivos = almacenArchivos;
        _servicioCampanas = servicioCampanas;
        _contextoInstitucion = contextoInstitucion;
        _servicioSecciones = servicioSecciones;
    }

    public async Task<ArchivoDto> SubirArchivoAsync(
        string documento,
        string nombreOriginal,
        string tipoContenido,
        Stream contenido,
        string? claveDestino = null,
        CancellationToken ct = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(documento);
        ArgumentException.ThrowIfNullOrWhiteSpace(nombreOriginal);

        // RF-CAM-003: Rechaza subida de archivos si no hay campaña abierta
        var campanaActiva = await _servicioCampanas.ObtenerCampanaActivaAsync(ct);
        if (campanaActiva == null)
        {
            throw new ReglaNegocioException("No se permite subir archivos fuera del período de una campaña abierta.");
        }

        var persona = await _context.Personas
            .FirstOrDefaultAsync(p => p.Documento == documento, ct)
            ?? throw new ReglaNegocioException($"No se encontró la persona con documento {documento}.");

        // RF-FLU-001: Bloquea subida si está en revisión o ya aprobada
        if (persona.EstadoActualizacion == EstadoActualizacion.Enviado ||
            persona.EstadoActualizacion == EstadoActualizacion.Aprobado)
        {
            throw new ReglaNegocioException("No se permite subir archivos mientras la solicitud está en revisión o ya ha sido aprobada.");
        }

        if (!string.IsNullOrWhiteSpace(claveDestino))
        {
            var seccion = MapearSeccionPorClaveDestino(claveDestino);
            if (seccion.HasValue && !await _servicioSecciones.EstaAbiertaAsync(persona.InstitucionId, seccion.Value, ct))
            {
                throw new SeccionNoDisponibleException();
            }
        }

        // ADR-0006: Validar extensión permitida
        if (!ValidadorFirmaArchivo.EsExtensionPermitida(nombreOriginal))
        {
            throw new ReglaNegocioException("Tipo de archivo no permitido. Solo se admiten archivos en formato PDF, JPG y PNG.");
        }

        // ADR-0006: Validar límite de tamaño (10 MB)
        using var memoryStream = new MemoryStream();
        await contenido.CopyToAsync(memoryStream, ct);

        if (memoryStream.Length == 0)
        {
            throw new ReglaNegocioException("El archivo subido está vacío.");
        }

        if (memoryStream.Length > ValidadorFirmaArchivo.TamanoMaximoBytes)
        {
            throw new ReglaNegocioException($"El archivo supera el tamaño máximo permitido de 10 MB ({ValidadorFirmaArchivo.TamanoMaximoBytes} bytes).");
        }

        var bytes = memoryStream.ToArray();

        // ADR-0006: Validar firma real del contenido (bytes iniciales)
        if (!ValidadorFirmaArchivo.ValidarFirmaContenido(nombreOriginal, bytes))
        {
            throw new ReglaNegocioException("El contenido del archivo no coincide con su extensión o no tiene un formato válido permitido.");
        }

        // Calcular SHA-256
        var hashBytes = SHA256.HashData(bytes);
        var hashHex = Convert.ToHexStringLower(hashBytes);

        // ADR-0006 y ADR-0008: Si ya existe un archivo para la misma persona y misma clave destino en borrador/devuelto, reemplazarlo
        if (!string.IsNullOrWhiteSpace(claveDestino))
        {
            var claveNormalizada = claveDestino.Trim();
            var anterior = await _context.ArchivosAdjuntos
                .FirstOrDefaultAsync(a => a.PersonaId == persona.Id && a.ClaveDestino == claveNormalizada, ct);

            if (anterior != null)
            {
                await _almacenArchivos.EliminarAsync(anterior.InstitucionId, anterior.PersonaId, anterior.Id, ct);
                _context.ArchivosAdjuntos.Remove(anterior);
            }
        }

        var archivoId = Guid.NewGuid();
        memoryStream.Position = 0;

        // Guardar en el disco del servidor detrás de IAlmacenArchivos
        var rutaRelativa = await _almacenArchivos.GuardarAsync(persona.InstitucionId, persona.Id, archivoId, memoryStream, ct);

        var extension = Path.GetExtension(nombreOriginal);
        var mimeNormalizado = ValidadorFirmaArchivo.ObtenerMimeTypePorExtension(extension);

        var entidad = new ArchivoAdjunto(
            archivoId,
            persona.InstitucionId,
            persona.Id,
            nombreOriginal,
            mimeNormalizado,
            bytes.Length,
            hashHex,
            rutaRelativa,
            claveDestino,
            DateTime.UtcNow);

        _context.ArchivosAdjuntos.Add(entidad);

        await _context.SaveChangesAsync(ct);

        return new ArchivoDto(
            entidad.Id,
            entidad.InstitucionId.Valor,
            entidad.PersonaId,
            entidad.NombreOriginal,
            entidad.TipoContenido,
            entidad.TamanoBytes,
            entidad.HashSha256,
            entidad.ClaveDestino,
            entidad.FechaSubidaUtc);
    }

    public async Task<DescargaArchivoDto> ObtenerArchivoParaDescargaAsync(
        Guid archivoId,
        string actorSolicitante,
        RolUsuario rolSolicitante,
        CancellationToken ct = default)
    {
        // RF-DAT-003: Filtro multitenant asegura pertenencia a la institución
        var archivo = await _context.ArchivosAdjuntos
            .FirstOrDefaultAsync(a => a.Id == archivoId, ct)
            ?? throw new ReglaNegocioException("El archivo solicitado no existe o no pertenece a la institución.");

        // RF-DAT-002: El usuario común solo puede descargar sus propios archivos
        if (rolSolicitante == RolUsuario.Usuario)
        {
            var personaSolicitante = await _context.Personas
                .FirstOrDefaultAsync(p => p.Documento == actorSolicitante, ct);

            if (personaSolicitante == null || archivo.PersonaId != personaSolicitante.Id)
            {
                throw new UnauthorizedAccessException("No tiene permisos para acceder a archivos de otra persona.");
            }
        }
        else
        {
            // RF-DAT-004, RF-DAT-005: Supervisor o Admin consultando archivos de otra persona
            _context.Auditorias.Add(new Auditoria(
                Guid.NewGuid(),
                actorSolicitante,
                "DescargaArchivo",
                archivo.InstitucionId,
                DateTime.UtcNow,
                detalle: $"Descarga del archivo {archivo.Id} ({archivo.TipoContenido})"));

            await _context.SaveChangesAsync(ct);
        }

        var stream = await _almacenArchivos.AbrirAsync(archivo.InstitucionId, archivo.PersonaId, archivo.Id, ct);
        if (stream == null)
        {
            throw new ReglaNegocioException("El archivo físico no fue encontrado en el almacenamiento del servidor.");
        }

        return new DescargaArchivoDto(stream, archivo.TipoContenido, archivo.NombreOriginal);
    }

    public async Task<List<ArchivoDto>> ListarArchivosPersonaAsync(string documento, CancellationToken ct = default)
    {
        var persona = await _context.Personas
            .FirstOrDefaultAsync(p => p.Documento == documento, ct)
            ?? throw new ReglaNegocioException($"No se encontró la persona con documento {documento}.");

        var archivos = await _context.ArchivosAdjuntos
            .Where(a => a.PersonaId == persona.Id)
            .OrderBy(a => a.FechaSubidaUtc)
            .ToListAsync(ct);

        // Mapear áreas y referencias activas de la persona
        var mapaAreas = new Dictionary<Guid, string>();

        var fotoId = await _context.FichasPersonales
            .Where(f => f.PersonaId == persona.Id && f.FotoArchivoId != null)
            .Select(f => f.FotoArchivoId!.Value)
            .FirstOrDefaultAsync(ct);
        if (fotoId != Guid.Empty)
        {
            mapaAreas[fotoId] = "Fotografía Personal";
        }

        var docsPersonales = await (
            from d in _context.DocumentosPersonales
            join td in _context.TiposDocumento on d.TipoDocumentoId equals td.Id
            where d.PersonaId == persona.Id && d.ArchivoId != null
            select new { ArchivoId = d.ArchivoId!.Value, td.Nombre }
        ).ToListAsync(ct);
        foreach (var doc in docsPersonales)
        {
            mapaAreas[doc.ArchivoId] = string.IsNullOrWhiteSpace(doc.Nombre)
                ? "Documento Personal"
                : $"Documento Personal: {doc.Nombre}";
        }

        var titulos = await _context.TitulosAcademicos
            .Where(t => t.PersonaId == persona.Id && t.ArchivoId != null)
            .Select(t => new { ArchivoId = t.ArchivoId!.Value, t.NombreTitulo })
            .ToListAsync(ct);
        foreach (var t in titulos)
        {
            mapaAreas[t.ArchivoId] = string.IsNullOrWhiteSpace(t.NombreTitulo)
                ? "Formación Académica"
                : $"Formación Académica: {t.NombreTitulo}";
        }

        var titulosEnCurso = await _context.TitulosEnCurso
            .Where(tc => tc.PersonaId == persona.Id && tc.ArchivoId != null)
            .Select(tc => new { ArchivoId = tc.ArchivoId!.Value, tc.NombrePrograma })
            .ToListAsync(ct);
        foreach (var tc in titulosEnCurso)
        {
            mapaAreas[tc.ArchivoId] = string.IsNullOrWhiteSpace(tc.NombrePrograma)
                ? "Título en Curso"
                : $"Título en Curso: {tc.NombrePrograma}";
        }

        var capacitaciones = await _context.Capacitaciones
            .Where(c => c.PersonaId == persona.Id && c.ArchivoId != null)
            .Select(c => new { ArchivoId = c.ArchivoId!.Value, c.NombreEvento })
            .ToListAsync(ct);
        foreach (var c in capacitaciones)
        {
            mapaAreas[c.ArchivoId] = string.IsNullOrWhiteSpace(c.NombreEvento)
                ? "Capacitación"
                : $"Capacitación: {c.NombreEvento}";
        }

        var experiencias = await _context.ExperienciasLaborales
            .Where(e => e.PersonaId == persona.Id && e.ArchivoId != null)
            .Select(e => new { ArchivoId = e.ArchivoId!.Value, e.Empleador, e.Cargo })
            .ToListAsync(ct);
        foreach (var e in experiencias)
        {
            var detalle = !string.IsNullOrWhiteSpace(e.Empleador) ? e.Empleador : e.Cargo;
            mapaAreas[e.ArchivoId] = string.IsNullOrWhiteSpace(detalle)
                ? "Experiencia Laboral"
                : $"Experiencia Laboral: {detalle}";
        }

        var referencias = await _context.ReferenciasPersonales
            .Where(r => r.PersonaId == persona.Id && r.ArchivoId != null)
            .Select(r => new { ArchivoId = r.ArchivoId!.Value, r.NombresApellidos })
            .ToListAsync(ct);
        foreach (var r in referencias)
        {
            mapaAreas[r.ArchivoId] = string.IsNullOrWhiteSpace(r.NombresApellidos)
                ? "Referencia Personal"
                : $"Referencia Personal: {r.NombresApellidos}";
        }

        var resultado = new List<ArchivoDto>();
        foreach (var a in archivos)
        {
            string? areaClasificada;
            if (mapaAreas.TryGetValue(a.Id, out var areaRef))
            {
                areaClasificada = areaRef;
            }
            else if (!string.IsNullOrWhiteSpace(a.ClaveDestino))
            {
                areaClasificada = FormatearClaveDestinoAmigable(a.ClaveDestino);
            }
            else
            {
                // Archivo sustituido / huérfano sin clave ni referencia vigente:
                // Se excluye de la lista activa del expediente para no mostrar duplicados injustificados.
                continue;
            }

            resultado.Add(new ArchivoDto(
                a.Id,
                a.InstitucionId.Valor,
                a.PersonaId,
                a.NombreOriginal,
                a.TipoContenido,
                a.TamanoBytes,
                a.HashSha256,
                areaClasificada,
                a.FechaSubidaUtc));
        }

        return resultado;
    }

    private static string FormatearClaveDestinoAmigable(string clave)
    {
        var normalizada = clave.Trim().ToLowerInvariant();
        if (normalizada == "foto:perfil" || normalizada == "foto" || normalizada == "ficha")
            return "Fotografía Personal";
        if (normalizada == "marca")
            return "Marca Institucional";
        if (normalizada.StartsWith("documento:", StringComparison.OrdinalIgnoreCase) ||
            normalizada.StartsWith("doc:", StringComparison.OrdinalIgnoreCase))
            return "Documento Personal";
        if (normalizada.StartsWith("titulo:", StringComparison.OrdinalIgnoreCase) ||
            normalizada.StartsWith("titulo-en-curso:", StringComparison.OrdinalIgnoreCase) ||
            normalizada == "formacion")
            return "Formación Académica";
        if (normalizada.StartsWith("capacitacion:", StringComparison.OrdinalIgnoreCase))
            return "Capacitación";
        if (normalizada.StartsWith("experiencia:", StringComparison.OrdinalIgnoreCase))
            return "Experiencia Laboral";
        if (normalizada.StartsWith("referencia:", StringComparison.OrdinalIgnoreCase))
            return "Referencia Personal";
        if (normalizada.StartsWith("cuenta:", StringComparison.OrdinalIgnoreCase) || normalizada.Contains("cuenta"))
            return "Cuenta Bancaria";
        return clave;
    }

    public async Task EliminarArchivoAsync(Guid archivoId, string documento, CancellationToken ct = default)
    {
        var campanaActiva = await _servicioCampanas.ObtenerCampanaActivaAsync(ct);
        if (campanaActiva == null)
        {
            throw new ReglaNegocioException("No se permite eliminar archivos fuera del período de una campaña abierta.");
        }

        var persona = await _context.Personas
            .FirstOrDefaultAsync(p => p.Documento == documento, ct)
            ?? throw new ReglaNegocioException($"No se encontró la persona con documento {documento}.");

        if (persona.EstadoActualizacion == EstadoActualizacion.Enviado ||
            persona.EstadoActualizacion == EstadoActualizacion.Aprobado)
        {
            throw new ReglaNegocioException("No se permite eliminar archivos mientras la solicitud está en revisión o ya ha sido aprobada.");
        }

        var archivo = await _context.ArchivosAdjuntos
            .FirstOrDefaultAsync(a => a.Id == archivoId && a.PersonaId == persona.Id, ct)
            ?? throw new ReglaNegocioException("El archivo no existe o no pertenece a la persona.");

        await _almacenArchivos.EliminarAsync(archivo.InstitucionId, archivo.PersonaId, archivo.Id, ct);
        _context.ArchivosAdjuntos.Remove(archivo);

        await _context.SaveChangesAsync(ct);
    }

    public async Task RetirarArchivoSupervisorAsync(
        Guid archivoId,
        string motivo,
        string actorSolicitante,
        RolUsuario rolSolicitante,
        CancellationToken ct = default)
    {
        if (rolSolicitante is not (RolUsuario.Supervisor or RolUsuario.Admin or RolUsuario.Superadmin))
        {
            throw new UnauthorizedAccessException("Solo un supervisor o administrador puede retirar adjuntos del expediente.");
        }

        if (string.IsNullOrWhiteSpace(motivo) || motivo.Trim().Length < 5)
        {
            throw new ReglaNegocioException("Debe ingresar un motivo obligatorio para retirar el archivo (mínimo 5 caracteres).");
        }

        var archivo = await _context.ArchivosAdjuntos
            .FirstOrDefaultAsync(a => a.Id == archivoId, ct)
            ?? throw new ReglaNegocioException("El archivo solicitado no existe o no pertenece a la institución.");

        var persona = await _context.Personas
            .FirstOrDefaultAsync(p => p.Id == archivo.PersonaId, ct);

        // 1. Registrar auditoría inmutable
        var detalleAuditoria = $"Retiro del archivo {archivo.Id} ({archivo.NombreOriginal}, Hash: {archivo.HashSha256}) de la persona {(persona?.Documento ?? archivo.PersonaId.ToString())}. Motivo: {motivo.Trim()}";
        _context.Auditorias.Add(new Auditoria(
            Guid.NewGuid(),
            actorSolicitante,
            "RetiroAdjuntoSupervisor",
            archivo.InstitucionId,
            DateTime.UtcNow,
            detalle: detalleAuditoria));

        // 2. Desvincular referencias en secciones
        var fichas = await _context.FichasPersonales
            .Where(f => f.PersonaId == archivo.PersonaId && f.FotoArchivoId == archivo.Id)
            .ToListAsync(ct);
        foreach (var f in fichas)
        {
            f.AsociarFoto(null);
        }

        var docs = await _context.DocumentosPersonales
            .Where(d => d.PersonaId == archivo.PersonaId && d.ArchivoId == archivo.Id)
            .ToListAsync(ct);
        foreach (var d in docs)
        {
            d.AsociarArchivo(null);
        }

        var titulos = await _context.TitulosAcademicos
            .Where(t => t.PersonaId == archivo.PersonaId && t.ArchivoId == archivo.Id)
            .ToListAsync(ct);
        foreach (var t in titulos)
        {
            t.AsociarArchivo(null);
        }

        var titulosEnCurso = await _context.TitulosEnCurso
            .Where(tc => tc.PersonaId == archivo.PersonaId && tc.ArchivoId == archivo.Id)
            .ToListAsync(ct);
        foreach (var tc in titulosEnCurso)
        {
            tc.AsociarArchivo(null);
        }

        var capacitaciones = await _context.Capacitaciones
            .Where(c => c.PersonaId == archivo.PersonaId && c.ArchivoId == archivo.Id)
            .ToListAsync(ct);
        foreach (var c in capacitaciones)
        {
            c.AsociarArchivo(null);
        }

        var experiencias = await _context.ExperienciasLaborales
            .Where(e => e.PersonaId == archivo.PersonaId && e.ArchivoId == archivo.Id)
            .ToListAsync(ct);
        foreach (var e in experiencias)
        {
            e.AsociarArchivo(null);
        }

        var referencias = await _context.ReferenciasPersonales
            .Where(r => r.PersonaId == archivo.PersonaId && r.ArchivoId == archivo.Id)
            .ToListAsync(ct);
        foreach (var r in referencias)
        {
            r.AsociarArchivo(null);
        }

        // 3. Eliminar físicamente del disco (ADR-0039)
        await _almacenArchivos.EliminarAsync(archivo.InstitucionId, archivo.PersonaId, archivo.Id, ct);

        // 4. Remover registro de la base de datos
        _context.ArchivosAdjuntos.Remove(archivo);

        await _context.SaveChangesAsync(ct);
    }

    private static SeccionHojaDeVida? MapearSeccionPorClaveDestino(string claveDestino)
    {
        var clave = claveDestino.Trim().ToLowerInvariant();
        if (clave.StartsWith("titulo:", StringComparison.OrdinalIgnoreCase) ||
            clave.StartsWith("titulo-en-curso:", StringComparison.OrdinalIgnoreCase) ||
            clave == "formacion" || clave == "titulo" || clave == "titulos")
            return SeccionHojaDeVida.FormacionAcademica;
        if (clave.StartsWith("capacitacion:", StringComparison.OrdinalIgnoreCase) ||
            clave == "capacitacion" || clave == "capacitaciones")
            return SeccionHojaDeVida.Capacitaciones;
        if (clave.StartsWith("experiencia:", StringComparison.OrdinalIgnoreCase) ||
            clave == "experiencia" || clave == "experiencias")
            return SeccionHojaDeVida.ExperienciaLaboral;
        if (clave.StartsWith("referencia:", StringComparison.OrdinalIgnoreCase) ||
            clave == "referencia" || clave == "referencias")
            return SeccionHojaDeVida.Referencias;
        if (clave.StartsWith("documento:", StringComparison.OrdinalIgnoreCase) ||
            clave.StartsWith("doc:", StringComparison.OrdinalIgnoreCase) ||
            clave == "documentos" || clave == "documento")
            return SeccionHojaDeVida.DocumentosPersonales;
        if (clave.StartsWith("cuenta:", StringComparison.OrdinalIgnoreCase) ||
            clave.StartsWith("cuenta-bancaria:", StringComparison.OrdinalIgnoreCase) ||
            clave == "cuenta-bancaria" || clave == "cuenta_bancaria")
            return SeccionHojaDeVida.CuentaBancaria;
        if (clave.StartsWith("foto:", StringComparison.OrdinalIgnoreCase) ||
            clave == "foto" || clave == "ficha")
            return SeccionHojaDeVida.FichaPersonal;

        return null;
    }
}
