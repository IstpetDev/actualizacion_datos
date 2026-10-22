namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

public sealed class ValidadorCatalogos(AplicacionDbContext db)
{
    public async Task ValidarAsync(int id, TipoCatalogo tipo, CancellationToken ct = default)
    {
        if (!await db.ElementosCatalogo.AnyAsync(e => e.Id == id && e.Tipo == tipo && e.Activo, ct))
        {
            throw new ReglaNegocioException($"El elemento indicado no existe, está inactivo o no pertenece al catálogo {tipo}.");
        }
    }
}
