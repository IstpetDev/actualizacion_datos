namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

public class ServicioAuditoria : IServicioAuditoria
{
    private readonly AplicacionDbContext _context;
    private readonly IContextoInstitucion _contextoInstitucion;

    public ServicioAuditoria(
        AplicacionDbContext context,
        IContextoInstitucion contextoInstitucion)
    {
        _context = context;
        _contextoInstitucion = contextoInstitucion;
    }

    public async Task<List<AuditoriaDto>> ListarAuditoriasAsync(CancellationToken ct = default)
    {
        var query = _context.Auditorias.AsQueryable();

        // RF-DAT-005, RF-MUL-003: Filtro multitenancy aplicado si no es superadmin
        if (!_contextoInstitucion.EsSuperadmin && _contextoInstitucion.InstitucionId != null)
        {
            query = query.Where(a => a.InstitucionId == _contextoInstitucion.InstitucionId);
        }

        var auditorias = await query
            .OrderByDescending(a => a.FechaUtc)
            .ToListAsync(ct);

        return auditorias.Select(a => new AuditoriaDto(
            a.Id,
            a.Actor,
            a.Accion,
            a.InstitucionId?.Valor,
            a.FechaUtc,
            a.Detalle)).ToList();
    }
}
