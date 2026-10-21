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
    CampanaDto? CampanaActiva = null);

public sealed record ActualizarDatosRequest(
    string DatosJson);

public sealed record SubirArchivoRequest(
    string NombreArchivo,
    string TipoContenido,
    long TamanoBytes);
