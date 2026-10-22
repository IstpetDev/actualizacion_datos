namespace Istpet.ActualizacionDatos.Application.Servicios;

using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;

public interface IServicioCatalogos
{
    Task<List<ElementoCatalogoDto>> ConsultarAsync(TipoCatalogo tipo, int? padreId = null, CancellationToken ct = default);
    Task<ResultadoImportacionCatalogoDto> ImportarAsync(TipoCatalogo tipo, Stream csv, CancellationToken ct = default);
}
