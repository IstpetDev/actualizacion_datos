namespace Istpet.ActualizacionDatos.Application.Modelos;

// Contratos de la hoja de vida (spec-0003, T-00). Los valores de enumeraciones viajan como texto
// en minúsculas, igual que EstadoActualizacion y TipoDestino en el resto de la API.

// Catálogos (RF-HDV-014): ElementoCatalogoDto y ResultadoImportacionCatalogoDto están en ModelosCatalogo.cs (#48).

// --- Ficha personal (RF-HDV-001, RF-HDV-020, T-02) ---

public sealed record GuardarFichaPersonalRequest(
    string? PrimerNombre = null,
    string? SegundoNombre = null,
    string? PrimerApellido = null,
    string? SegundoApellido = null,
    int? SexoId = null,
    DateOnly? FechaNacimiento = null,
    int? EstadoCivilId = null,
    int? TipoSangreId = null,
    int? EtniaId = null,
    int? NacionalidadIndigenaId = null,
    int? PaisNacionalidadId = null,
    int? PaisNacimientoId = null,
    int? ParroquiaNacimientoId = null,
    int? ParroquiaResidenciaId = null,
    string? CallePrincipal = null,
    string? CalleSecundaria = null,
    string? NumeroCasa = null,
    string? ReferenciaDomicilio = null,
    string? CodigoPostal = null,
    string? TelefonoConvencional = null,
    string? Celular = null,
    string? CorreoInstitucional = null,
    int? DiscapacidadId = null,
    int? PorcentajeDiscapacidad = null,
    string? NumeroCarnetDiscapacidad = null,
    string? Perfil = null,
    Guid? FotoArchivoId = null);

public sealed record FichaPersonalDto(
    Guid PersonaId,
    string? PrimerNombre,
    string? SegundoNombre,
    string? PrimerApellido,
    string? SegundoApellido,
    int? SexoId,
    DateOnly? FechaNacimiento,
    int? EstadoCivilId,
    int? TipoSangreId,
    int? EtniaId,
    int? NacionalidadIndigenaId,
    int? PaisNacionalidadId,
    int? PaisNacimientoId,
    int? ParroquiaNacimientoId,
    int? ParroquiaResidenciaId,
    string? CallePrincipal,
    string? CalleSecundaria,
    string? NumeroCasa,
    string? ReferenciaDomicilio,
    string? CodigoPostal,
    string? TelefonoConvencional,
    string? Celular,
    string? CorreoInstitucional,
    int? DiscapacidadId,
    int? PorcentajeDiscapacidad,
    string? NumeroCarnetDiscapacidad,
    string? Perfil,
    Guid? FotoArchivoId,
    DateTime FechaActualizacionUtc);

// --- Ítems de la hoja de vida (RF-HDV-002 a 006, 017, T-02) ---
// Todo ítem lleva ArchivoId: el respaldo se sube antes con POST /api/archivos/subir (ADR-0006)
// y aquí solo se asocia. El servicio comprueba que el archivo sea de la misma persona.

public sealed record GuardarTituloAcademicoRequest(
    string NombreTitulo,
    int GradoAcademicoId,
    int? UniversidadId = null,
    string? NombreInstitucionOtra = null,
    int? CampoDetalladoUnescoId = null,
    string? NumeroRegistroSenescyt = null,
    DateOnly? FechaObtencion = null,
    DateOnly? FechaRegistroSenescyt = null,
    Guid? ArchivoId = null);

public sealed record TituloAcademicoDto(
    Guid Id,
    string NombreTitulo,
    int GradoAcademicoId,
    int? UniversidadId,
    string? NombreInstitucionOtra,
    int? CampoDetalladoUnescoId,
    string? NumeroRegistroSenescyt,
    DateOnly? FechaObtencion,
    DateOnly? FechaRegistroSenescyt,
    Guid? ArchivoId,
    DateTime FechaActualizacionUtc);

public sealed record GuardarTituloEnCursoRequest(
    string NombrePrograma,
    int GradoAcademicoId,
    int? UniversidadId = null,
    string? NombreInstitucionOtra = null,
    int? CampoDetalladoUnescoId = null,
    DateOnly? FechaInicio = null,
    DateOnly? FechaFinEstimada = null,
    bool TieneBeca = false,
    int? TipoBecaId = null,
    int? FinanciamientoBecaId = null,
    int? PorcentajeBeca = null,
    decimal? MontoBeca = null,
    Guid? ArchivoId = null);

public sealed record TituloEnCursoDto(
    Guid Id,
    string NombrePrograma,
    int GradoAcademicoId,
    int? UniversidadId,
    string? NombreInstitucionOtra,
    int? CampoDetalladoUnescoId,
    DateOnly? FechaInicio,
    DateOnly? FechaFinEstimada,
    bool TieneBeca,
    int? TipoBecaId,
    int? FinanciamientoBecaId,
    int? PorcentajeBeca,
    decimal? MontoBeca,
    Guid? ArchivoId,
    DateTime FechaActualizacionUtc);

/// <summary>TipoParticipacion: "asistente", "aprobado" o "facilitador" (PD-HDV-08).</summary>
public sealed record GuardarCapacitacionRequest(
    string NombreEvento,
    string InstitucionOrganizadora,
    int? TipoCapacitacionId = null,
    string TipoParticipacion = "asistente",
    DateOnly? FechaInicio = null,
    DateOnly? FechaFin = null,
    int? NumeroHoras = null,
    string? Lugar = null,
    bool FinanciadaPorInstitucion = false,
    Guid? ArchivoId = null);

public sealed record CapacitacionDto(
    Guid Id,
    string NombreEvento,
    string InstitucionOrganizadora,
    int? TipoCapacitacionId,
    string TipoParticipacion,
    DateOnly? FechaInicio,
    DateOnly? FechaFin,
    int? NumeroHoras,
    string? Lugar,
    bool FinanciadaPorInstitucion,
    Guid? ArchivoId,
    DateTime FechaActualizacionUtc);

public sealed record GuardarExperienciaLaboralRequest(
    string Empleador,
    string Cargo,
    DateOnly FechaInicio,
    DateOnly? FechaFin = null,
    bool TrabajaActualmente = false,
    string? Ciudad = null,
    int? PaisId = null,
    string? Funciones = null,
    Guid? ArchivoId = null);

public sealed record ExperienciaLaboralDto(
    Guid Id,
    string Empleador,
    string Cargo,
    DateOnly FechaInicio,
    DateOnly? FechaFin,
    bool TrabajaActualmente,
    string? Ciudad,
    int? PaisId,
    string? Funciones,
    Guid? ArchivoId,
    DateTime FechaActualizacionUtc);

/// <summary>Tipo: "personal" o "familiar" (RF-HDV-017).</summary>
public sealed record GuardarReferenciaRequest(
    string Tipo,
    string NombresApellidos,
    string Telefono,
    string? Titulo = null,
    string? CargoActual = null,
    string? Empresa = null);

public sealed record ReferenciaDto(
    Guid Id,
    string Tipo,
    string NombresApellidos,
    string Telefono,
    string? Titulo,
    string? CargoActual,
    string? Empresa,
    DateTime FechaActualizacionUtc);

/// <summary>Hoja de vida completa de una persona, para el usuario y para la revisión.</summary>
public sealed record HojaDeVidaDto(
    Guid PersonaId,
    string Documento,
    string EstadoActualizacion,
    bool PuedeEditar,
    FichaPersonalDto? Ficha,
    List<TituloAcademicoDto> Titulos,
    List<TituloEnCursoDto> TitulosEnCurso,
    List<CapacitacionDto> Capacitaciones,
    List<ExperienciaLaboralDto> Experiencias,
    List<ReferenciaDto> Referencias);

// --- Documentos personales (RF-HDV-007, 008, T-03) ---

public sealed record GuardarDocumentoPersonalRequest(
    Guid ArchivoId,
    string? NumeroDocumento = null,
    string? EntidadEmisora = null,
    DateOnly? FechaEmision = null,
    DateOnly? FechaVencimiento = null,
    string? CategoriaLicencia = null,
    int? PuntosLicencia = null);

public sealed record DocumentoPersonalDto(
    Guid Id,
    Guid TipoDocumentoId,
    string? NumeroDocumento,
    string? EntidadEmisora,
    DateOnly? FechaEmision,
    DateOnly? FechaVencimiento,
    string? CategoriaLicencia,
    int? PuntosLicencia,
    Guid? ArchivoId,
    DateTime FechaActualizacionUtc);

/// <summary>Un tipo de documento que aplica a la persona, con lo que ya registró (Registrado nulo si falta).</summary>
public sealed record DocumentoRequeridoDto(
    Guid TipoDocumentoId,
    string Codigo,
    string Nombre,
    string? Descripcion,
    bool TieneVencimiento,
    bool EsObligatorio,
    DocumentoPersonalDto? Registrado);

// --- Validación de completitud al enviar (RF-HDV-009, 018, 019, 023, 024, T-04) ---

/// <summary>
/// Seccion: "ficha", "formacion", "referencias", "titulos", "capacitaciones", "experiencias",
/// "documentos" o "cuenta-bancaria". Codigo: identificador estable del faltante (p. ej. "ficha.primer-nombre",
/// "referencias.minimo-personales", "item.sin-respaldo"). ItemId: el ítem afectado, si lo hay.
/// </summary>
public sealed record FaltanteEnvioDto(
    string Seccion,
    string Codigo,
    string Mensaje,
    Guid? ItemId = null);

public sealed record ResultadoValidacionEnvioDto(
    bool Completo,
    List<FaltanteEnvioDto> Faltantes);

/// <summary>Respuesta 400 del envío a revisión: incluye la lista de faltantes cuando la causa es la completitud.</summary>
public sealed record EnvioIncompletoRespuesta(
    string Mensaje,
    List<FaltanteEnvioDto> Faltantes);

// --- Configuración del admin (RF-HDV-012, 013, T-05) ---

public sealed record GuardarTipoFuncionarioRequest(
    string Codigo,
    string Nombre,
    bool EsDocente = false,
    bool Activo = true);

public sealed record TipoFuncionarioDto(
    Guid Id,
    string Codigo,
    string Nombre,
    bool EsDocente,
    bool Activo);

public sealed record GuardarTipoDocumentoRequest(
    string Codigo,
    string Nombre,
    string? Descripcion = null,
    bool TieneVencimiento = false,
    int Orden = 0,
    bool Activo = true);

public sealed record TipoDocumentoDto(
    Guid Id,
    string Codigo,
    string Nombre,
    string? Descripcion,
    bool TieneVencimiento,
    int Orden,
    bool Activo);

/// <summary>TipoFuncionarioId nulo: el requisito aplica a todas las personas de la institución.</summary>
public sealed record GuardarRequisitoDocumentoRequest(
    Guid TipoDocumentoId,
    Guid? TipoFuncionarioId = null,
    bool EsObligatorio = true,
    bool Activo = true);

public sealed record RequisitoDocumentoDto(
    Guid Id,
    Guid TipoDocumentoId,
    Guid? TipoFuncionarioId,
    bool EsObligatorio,
    bool Activo);

public sealed record AsignarTipoFuncionarioRequest(
    Guid? TipoFuncionarioId);
