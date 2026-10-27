namespace Istpet.ActualizacionDatos.Application.Documentos;

public sealed record ConfiguracionDocumentoDto(
    Guid InstitucionId,
    Guid? PlantillaId,
    Guid? VersionPlantillaId,
    string? NombrePlantilla,
    int? NumeroVersion,
    string? NombreVisible,
    Guid? LogoArchivoId,
    Guid? PortadaArchivoId,
    string ColorPrimario,
    string ColorSecundario,
    string? Lema,
    string? TextoCompromiso,
    bool TieneConfiguracionPropia,
    bool HayNuevaVersionDisponible,
    Guid? UltimaVersionDisponibleId,
    int? UltimoNumeroVersionDisponible);

public sealed record ActualizarMarcaDto(
    string? NombreVisible,
    Guid? LogoArchivoId,
    Guid? PortadaArchivoId,
    string ColorPrimario,
    string ColorSecundario,
    string? Lema,
    string? TextoCompromiso);

public sealed record ElegirPlantillaDto(
    Guid PlantillaId,
    Guid? VersionPlantillaId = null);
