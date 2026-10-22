namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using System.Security.Cryptography;
using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

public class ServicioArchivos : IServicioArchivos
{
    private readonly AplicacionDbContext _context;
    private readonly IAlmacenArchivos _almacenArchivos;
    private readonly IServicioCampanas _servicioCampanas;
    private readonly IContextoInstitucion _contextoInstitucion;

    public ServicioArchivos(
        AplicacionDbContext context,
        IAlmacenArchivos almacenArchivos,
        IServicioCampanas servicioCampanas,
        IContextoInstitucion contextoInstitucion)
    {
        _context = context;
        _almacenArchivos = almacenArchivos;
        _servicioCampanas = servicioCampanas;
        _contextoInstitucion = contextoInstitucion;
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
        persona.RegistrarArchivoSubido(nombreOriginal);

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

        return archivos.Select(a => new ArchivoDto(
            a.Id,
            a.InstitucionId.Valor,
            a.PersonaId,
            a.NombreOriginal,
            a.TipoContenido,
            a.TamanoBytes,
            a.HashSha256,
            a.ClaveDestino,
            a.FechaSubidaUtc)).ToList();
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
}
