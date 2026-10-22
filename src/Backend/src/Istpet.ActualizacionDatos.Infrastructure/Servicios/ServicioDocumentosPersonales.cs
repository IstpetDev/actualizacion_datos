namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

public class ServicioDocumentosPersonales : IServicioDocumentosPersonales
{
    private readonly AplicacionDbContext _context;
    private readonly IServicioCampanas _servicioCampanas;

    public ServicioDocumentosPersonales(
        AplicacionDbContext context,
        IServicioCampanas servicioCampanas)
    {
        _context = context;
        _servicioCampanas = servicioCampanas;
    }

    public async Task<List<DocumentoRequeridoDto>> ListarAsync(string documento, CancellationToken ct = default)
    {
        var persona = await _context.Personas
            .FirstOrDefaultAsync(p => p.Documento == documento, ct)
            ?? throw new RecursoNoEncontradoException("La persona no existe en la institución.");

        var requisitos = await _context.RequisitosDocumento
            .Where(r => r.Activo && (r.TipoFuncionarioId == null || r.TipoFuncionarioId == persona.TipoFuncionarioId))
            .ToListAsync(ct);

        var obligatoriosPorTipo = requisitos
            .GroupBy(r => r.TipoDocumentoId)
            .ToDictionary(g => g.Key, g => g.Any(r => r.EsObligatorio));

        var tipoDocIds = obligatoriosPorTipo.Keys.ToList();
        var tiposDocumento = await _context.TiposDocumento
            .Where(td => td.Activo && tipoDocIds.Contains(td.Id))
            .OrderBy(td => td.Orden)
            .ThenBy(td => td.Nombre)
            .ToListAsync(ct);

        var documentos = await _context.DocumentosPersonales
            .Where(d => d.PersonaId == persona.Id)
            .ToDictionaryAsync(d => d.TipoDocumentoId, ct);

        return tiposDocumento.Select(td =>
        {
            var registrado = documentos.TryGetValue(td.Id, out var doc) ? MapearDocumento(doc) : null;
            var esObligatorio = obligatoriosPorTipo[td.Id];
            return new DocumentoRequeridoDto(
                td.Id,
                td.Codigo,
                td.Nombre,
                td.Descripcion,
                td.TieneVencimiento,
                esObligatorio,
                registrado);
        }).ToList();
    }

    public async Task<DocumentoPersonalDto> GuardarAsync(string documento, Guid tipoDocumentoId, GuardarDocumentoPersonalRequest request, CancellationToken ct = default)
    {
        if (await _servicioCampanas.ObtenerCampanaActivaAsync(ct) == null)
        {
            throw new ReglaNegocioException("No se permite modificar documentos personales fuera del período de una campaña abierta.");
        }

        var persona = await _context.Personas
            .FirstOrDefaultAsync(p => p.Documento == documento, ct)
            ?? throw new RecursoNoEncontradoException("La persona no existe en la institución.");

        persona.AsegurarEdicionPermitida();

        var tipoDoc = await _context.TiposDocumento
            .FirstOrDefaultAsync(td => td.Id == tipoDocumentoId && td.Activo, ct)
            ?? throw new RecursoNoEncontradoException("El tipo de documento no existe o está inactivo.");

        var archivo = await _context.ArchivosAdjuntos
            .FirstOrDefaultAsync(a => a.Id == request.ArchivoId && a.PersonaId == persona.Id, ct)
            ?? throw new RecursoNoEncontradoException("El archivo adjunto no existe o no pertenece a la persona.");

        var existente = await _context.DocumentosPersonales
            .FirstOrDefaultAsync(d => d.PersonaId == persona.Id && d.TipoDocumentoId == tipoDocumentoId, ct);

        if (existente != null)
        {
            existente.Actualizar(new DatosDocumentoPersonal(
                request.NumeroDocumento,
                request.EntidadEmisora,
                request.FechaEmision,
                request.FechaVencimiento,
                request.CategoriaLicencia,
                request.PuntosLicencia));

            existente.AsociarArchivo(request.ArchivoId);
            await _context.SaveChangesAsync(ct);
            return MapearDocumento(existente);
        }

        var nuevo = new DocumentoPersonal(
            Guid.NewGuid(),
            persona.InstitucionId,
            persona.Id,
            tipoDocumentoId,
            new DatosDocumentoPersonal(
                request.NumeroDocumento,
                request.EntidadEmisora,
                request.FechaEmision,
                request.FechaVencimiento,
                request.CategoriaLicencia,
                request.PuntosLicencia));

        nuevo.AsociarArchivo(request.ArchivoId);
        _context.DocumentosPersonales.Add(nuevo);
        await _context.SaveChangesAsync(ct);

        return MapearDocumento(nuevo);
    }

    private static DocumentoPersonalDto MapearDocumento(DocumentoPersonal d) => new(
        d.Id,
        d.TipoDocumentoId,
        d.NumeroDocumento,
        d.EntidadEmisora,
        d.FechaEmision,
        d.FechaVencimiento,
        d.CategoriaLicencia,
        d.PuntosLicencia,
        d.ArchivoId,
        d.FechaActualizacionUtc);
}
