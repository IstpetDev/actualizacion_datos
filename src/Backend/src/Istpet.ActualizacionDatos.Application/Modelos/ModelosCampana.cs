namespace Istpet.ActualizacionDatos.Application.Modelos;

public sealed record CrearCampanaRequest(
    string Nombre,
    DateTime FechaInicioUtc,
    DateTime FechaFinUtc);

public sealed record CampanaDto(
    Guid Id,
    Guid InstitucionId,
    string Nombre,
    DateTime FechaInicioUtc,
    DateTime FechaFinUtc,
    bool Activa,
    bool EstaAbierta);

public sealed record EstadoEdicionDto(
    bool PuedeEditar,
    string Mensaje,
    CampanaDto? CampanaActiva = null,
    string? EstadoActualizacion = null,
    bool PuedeIniciarNuevaActualizacion = false);

public sealed record ActualizarDatosRequest(
    string DatosJson);
