namespace Istpet.ActualizacionDatos.Application.Modelos;

using Istpet.ActualizacionDatos.Domain.HojaDeVida;

public sealed record ElementoCatalogoDto(
    int Id,
    TipoCatalogo Tipo,
    string Codigo,
    string Nombre,
    int? PadreId,
    string? CodigoExterno,
    int Orden);

public sealed record ResultadoImportacionCatalogoDto(
    TipoCatalogo Tipo,
    int Creados,
    int Actualizados,
    int SinCambios);
