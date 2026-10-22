namespace Istpet.ActualizacionDatos.Domain;

public class MarcaObservacion
{
    public Guid Id { get; private set; }
    public Guid ObservacionId { get; private set; }
    public TipoDestinoMarca TipoDestino { get; private set; }
    public string ClaveDestino { get; private set; }
    public string Texto { get; private set; }

    private MarcaObservacion()
    {
        ClaveDestino = null!;
        Texto = null!;
    }

    public MarcaObservacion(
        Guid id,
        Guid observacionId,
        TipoDestinoMarca tipoDestino,
        string claveDestino,
        string texto)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(claveDestino);
        if (string.IsNullOrWhiteSpace(texto))
        {
            throw new ReglaNegocioException("El texto de la observación en la marca es obligatorio.");
        }

        Id = id;
        ObservacionId = observacionId;
        TipoDestino = tipoDestino;
        ClaveDestino = claveDestino.Trim();
        Texto = texto.Trim();
    }
}
