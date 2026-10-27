namespace Istpet.ActualizacionDatos.Application.Documentos;

public sealed record PlantillaResumenDto(
    Guid Id,
    string Nombre,
    string? Descripcion,
    string DisenoBase,
    bool EsPredeterminada,
    int TotalVersiones,
    int? UltimaVersionPublicada,
    DateTime FechaCreacionUtc,
    DateTime FechaActualizacionUtc);

public sealed record VersionPlantillaDto(
    Guid Id,
    Guid PlantillaId,
    int NumeroVersion,
    string DisenoBase,
    ConfiguracionPlantilla Configuracion,
    string? DescripcionCambio,
    DateTime FechaPublicacionUtc);

public sealed record PlantillaDetalleDto(
    Guid Id,
    string Nombre,
    string? Descripcion,
    string DisenoBase,
    bool EsPredeterminada,
    ConfiguracionPlantilla ConfiguracionBorrador,
    DateTime FechaCreacionUtc,
    DateTime FechaActualizacionUtc,
    List<VersionPlantillaDto> Versiones);

public sealed record CrearPlantillaDto(
    string Nombre,
    string? Descripcion,
    string DisenoBase,
    ConfiguracionPlantilla Configuracion);

public sealed record ActualizarPlantillaDto(
    string Nombre,
    string? Descripcion,
    string DisenoBase,
    ConfiguracionPlantilla Configuracion);

public sealed record PublicarVersionDto(
    string? DescripcionCambio);
