namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

public class ServicioCampanas : IServicioCampanas
{
    private readonly AplicacionDbContext _context;
    private readonly IContextoInstitucion _contextoInstitucion;

    public ServicioCampanas(
        AplicacionDbContext context,
        IContextoInstitucion contextoInstitucion)
    {
        _context = context;
        _contextoInstitucion = contextoInstitucion;
    }

    public async Task<CampanaDto> CrearCampanaAsync(CrearCampanaRequest request, CancellationToken ct = default)
    {
        var institucionId = _contextoInstitucion.InstitucionId
            ?? throw new ReglaNegocioException("Se requiere una institución activa para crear una campaña.");

        ArgumentException.ThrowIfNullOrWhiteSpace(request.Nombre);

        // RF-CAM-001: Validación de fechas
        if (request.FechaFinUtc < request.FechaInicioUtc)
        {
            throw new ReglaNegocioException("La fecha de fin no puede ser anterior a la de inicio.");
        }

        // PD-07: No permitir solapamiento con otra campaña activa de la misma institución
        var existeSolapamiento = await _context.Campanas
            .AnyAsync(c => c.Activa && c.FechaInicioUtc <= request.FechaFinUtc && c.FechaFinUtc >= request.FechaInicioUtc, ct);

        if (existeSolapamiento)
        {
            throw new ReglaNegocioException("Ya existe una campaña activa con fechas solapadas para esta institución.");
        }

        var campana = new Campana(
            Guid.NewGuid(),
            institucionId,
            request.Nombre,
            request.FechaInicioUtc,
            request.FechaFinUtc,
            activa: true);

        _context.Campanas.Add(campana);
        await _context.SaveChangesAsync(ct);

        var ahora = DateTime.UtcNow;
        return new CampanaDto(
            campana.Id,
            campana.InstitucionId.Valor,
            campana.Nombre,
            campana.FechaInicioUtc,
            campana.FechaFinUtc,
            campana.Activa,
            campana.EstaAbiertaEn(ahora));
    }

    public async Task<List<CampanaDto>> ListarCampanasAsync(CancellationToken ct = default)
    {
        var ahora = DateTime.UtcNow;
        var campanas = await _context.Campanas
            .OrderByDescending(c => c.FechaInicioUtc)
            .ToListAsync(ct);

        return campanas.Select(c => new CampanaDto(
            c.Id,
            c.InstitucionId.Valor,
            c.Nombre,
            c.FechaInicioUtc,
            c.FechaFinUtc,
            c.Activa,
            c.EstaAbiertaEn(ahora))).ToList();
    }

    public async Task<CampanaDto?> ObtenerCampanaActivaAsync(CancellationToken ct = default)
    {
        var ahora = DateTime.UtcNow;
        var campana = await _context.Campanas
            .FirstOrDefaultAsync(c => c.Activa && ahora >= c.FechaInicioUtc && ahora <= c.FechaFinUtc, ct);

        if (campana == null)
        {
            return null;
        }

        return new CampanaDto(
            campana.Id,
            campana.InstitucionId.Valor,
            campana.Nombre,
            campana.FechaInicioUtc,
            campana.FechaFinUtc,
            campana.Activa,
            true);
    }

    public async Task<EstadoEdicionDto> ObtenerEstadoEdicionAsync(string documento, CancellationToken ct = default)
    {
        var campanaActiva = await ObtenerCampanaActivaAsync(ct);

        if (campanaActiva != null)
        {
            // RF-CAM-002: Campaña abierta permite edición
            return new EstadoEdicionDto(
                PuedeEditar: true,
                Mensaje: "Campaña abierta para edición y subida de archivos.",
                CampanaActiva: campanaActiva);
        }

        // RF-CAM-003: Sin campaña abierta solo lectura
        return new EstadoEdicionDto(
            PuedeEditar: false,
            Mensaje: "Fuera de campaña: los datos se muestran en modo solo lectura.");
    }

    public async Task ActualizarDatosUsuarioAsync(string documento, ActualizarDatosRequest request, CancellationToken ct = default)
    {
        var campanaActiva = await ObtenerCampanaActivaAsync(ct);

        // RF-CAM-003: Rechaza cualquier edición si no hay campaña abierta
        if (campanaActiva == null)
        {
            throw new ReglaNegocioException("No se permite editar datos personales fuera del período de una campaña abierta.");
        }

        var persona = await _context.Personas
            .FirstOrDefaultAsync(p => p.Documento == documento, ct)
            ?? throw new ReglaNegocioException($"No se encontró la persona con documento {documento}.");

        // RF-CAM-002: Permite editar y guardar borrador
        persona.ActualizarBorrador(request.DatosJson);
        await _context.SaveChangesAsync(ct);
    }

    public async Task SubirArchivoUsuarioAsync(string documento, SubirArchivoRequest request, CancellationToken ct = default)
    {
        var campanaActiva = await ObtenerCampanaActivaAsync(ct);

        // RF-CAM-003: Rechaza subida de archivos si no hay campaña abierta
        if (campanaActiva == null)
        {
            throw new ReglaNegocioException("No se permite subir archivos fuera del período de una campaña abierta.");
        }

        var persona = await _context.Personas
            .FirstOrDefaultAsync(p => p.Documento == documento, ct)
            ?? throw new ReglaNegocioException($"No se encontró la persona con documento {documento}.");

        // RF-CAM-002: Permite subida de archivos
        persona.RegistrarArchivoSubido(request.NombreArchivo);
        await _context.SaveChangesAsync(ct);
    }
}
