namespace Istpet.ActualizacionDatos.Application.Servicios;

using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;

// RF-HDV-014, ADR-0010 dec. 5. Implementa T-01 (#29).
public interface IServicioCatalogos
{
    /// <summary>Elementos activos de un tipo, ordenados por Orden y Nombre; padreId filtra por elemento padre.</summary>
    Task<List<ElementoCatalogoDto>> ListarAsync(TipoCatalogo tipo, int? padreId = null, CancellationToken ct = default);

    /// <summary>
    /// Importa un CSV con columnas codigo, nombre, codigo_padre, codigo_externo. Idempotente: un código
    /// existente del mismo tipo se actualiza, no se duplica. Solo superadmin.
    /// </summary>
    Task<ResultadoImportacionCatalogoDto> ImportarAsync(TipoCatalogo tipo, Stream csv, CancellationToken ct = default);
}

// RF-HDV-001: un campo de catálogo solo acepta elementos activos del tipo esperado.
// La base no lo impide (ADR-0010 dec. 5, contrapartida); lo comprueba la capa de aplicación.
public interface IValidadorCatalogos
{
    /// <summary>
    /// Si id tiene valor, exige que sea un elemento activo del tipo indicado; si no, lanza
    /// ReglaNegocioException con el nombre del campo. Un id nulo es válido (la obligatoriedad la decide T-04).
    /// </summary>
    Task AsegurarElementoAsync(int? id, TipoCatalogo tipo, string campo, CancellationToken ct = default);
}
