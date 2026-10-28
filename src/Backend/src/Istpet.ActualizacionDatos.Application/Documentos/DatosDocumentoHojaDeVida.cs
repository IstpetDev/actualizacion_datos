namespace Istpet.ActualizacionDatos.Application.Documentos;

public sealed record ItemFormacionAcademica(
    string Titulo,
    string? GradoAcademico = null,
    string? Institucion = null,
    DateOnly? FechaObtencion = null,
    string? NumeroRegistroSenescyt = null);

public sealed record ItemExperienciaLaboral(
    string Empleador,
    string Cargo,
    DateOnly FechaInicio,
    DateOnly? FechaFin = null,
    bool TrabajaActualmente = false,
    string? Ciudad = null,
    string? Pais = null,
    string? Funciones = null);

public sealed record ItemCapacitacion(
    string NombreEvento,
    string? InstitucionOrganizadora = null,
    string? TipoCapacitacion = null,
    string? TipoParticipacion = null,
    int? NumeroHoras = null,
    string? Lugar = null,
    DateOnly? FechaInicio = null,
    DateOnly? FechaFin = null);

public sealed record ItemReferencia(
    string NombresApellidos,
    string? Tipo = null,
    string? Telefono = null,
    string? Titulo = null,
    string? CargoActual = null,
    string? Empresa = null);

public sealed record RegistroSenescytPrincipal(
    string? NumeroRegistro,
    DateOnly? FechaRegistro);

public sealed record DatosPersonalesDocumento(
    string PrimerNombre,
    string? SegundoNombre,
    string PrimerApellido,
    string? SegundoApellido,
    string DocumentoIdentidad,
    string? TipoPersonal = null,
    string? LugarNacimiento = null,
    DateOnly? FechaNacimiento = null,
    string? EstadoCivil = null,
    string? CiudadResidencia = null,
    string? DireccionDomicilio = null,
    string? Celular = null,
    string? TelefonoConvencional = null,
    string? CorreoInstitucional = null,
    RegistroSenescytPrincipal? RegistroSenescyt = null)
{
    public string NombreCompleto =>
        string.Join(" ", new[] { PrimerNombre, SegundoNombre, PrimerApellido, SegundoApellido }
            .Where(p => !string.IsNullOrWhiteSpace(p)));
}

/// <summary>
/// Contrato inmutable desacoplado de base de datos para la generación del documento de hoja de vida (ADR-0032).
/// </summary>
public sealed record DatosDocumentoHojaDeVida(
    DatosPersonalesDocumento DatosPersonales,
    string PerfilProfesional,
    IReadOnlyList<ItemFormacionAcademica> Formaciones,
    IReadOnlyList<ItemExperienciaLaboral> Experiencias,
    IReadOnlyList<ItemCapacitacion> Capacitaciones,
    IReadOnlyList<ItemReferencia> Referencias,
    DateOnly FechaGeneracion,
    bool EsVistaPrevia = false,
    byte[]? FotoBytes = null);
