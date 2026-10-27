namespace Istpet.ActualizacionDatos.Application.Modelos;

using System.Text.Json.Serialization;

public sealed record SeccionConfiguracionDto(
    string Codigo,
    string Nombre,
    bool Habilitada,
    int PersonasCompletas,
    int PersonasIncompletas,
    int TotalPersonas,
    DateTime? UltimaModificacionUtc,
    string? ModificadoPor
);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record CambiarEstadoSeccionRequest(
    bool Habilitada
);
