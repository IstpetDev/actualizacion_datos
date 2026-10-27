namespace Istpet.ActualizacionDatos.Application.Modelos;

public sealed record MensajeRespuesta(
    string Mensaje,
    string? Codigo = null,
    Dictionary<string, string[]>? Errores = null,
    string? TraceId = null);
