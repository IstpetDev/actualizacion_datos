namespace Istpet.ActualizacionDatos.Application.Modelos;

using Istpet.ActualizacionDatos.Domain;

public sealed record AvisoProteccionDatosDto(Guid Id, string Version, string Titulo,
    string Responsable, string Contenido, string DeclaracionAceptacion, string FuenteOficial,
    DateTime VigenteDesdeUtc, DateTime? VigenteHastaUtc);

public sealed record EstadoProteccionDatosDto(bool Aceptado, AvisoProteccionDatosDto? Aviso,
    DateTime? FechaAceptacionUtc, string? Mensaje = null);

public sealed record AceptarAvisoRequest(Guid AvisoId, bool Acepta);

public sealed record PublicarAvisoRequest(Guid InstitucionId, string Version, string Titulo,
    string Responsable, string Contenido, string DeclaracionAceptacion, string FuenteOficial,
    string EvidenciaAprobacion, RolUsuario[] RolesDestinatarios, DateTime VigenteDesdeUtc,
    DateTime? VigenteHastaUtc, bool AprobacionInstitucionalConfirmada);

public sealed record AvisoInstitucionalDto(Guid Id, Guid InstitucionId, string Version, string Titulo,
    string Responsable, string Contenido, string DeclaracionAceptacion, string FuenteOficial,
    string EvidenciaAprobacion, RolUsuario[] RolesDestinatarios, DateTime VigenteDesdeUtc,
    DateTime? VigenteHastaUtc, bool EsVigente);

public sealed record PublicarAvisoInstitucionalRequest(string Version, string Titulo,
    string Responsable, string Contenido, string DeclaracionAceptacion, string FuenteOficial,
    string EvidenciaAprobacion, RolUsuario[] RolesDestinatarios, DateTime VigenteDesdeUtc,
    DateTime? VigenteHastaUtc, bool AprobacionInstitucionalConfirmada);
