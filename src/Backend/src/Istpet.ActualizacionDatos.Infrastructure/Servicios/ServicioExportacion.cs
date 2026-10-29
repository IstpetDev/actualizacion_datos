namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using System.Globalization;
using System.IO.Compression;
using System.Text;
using System.Text.Json;
using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Documentos;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// Implementación del servicio de exportación de expedientes en ZIP y reportes en Excel.
/// Cumple con RF-EXP-001 a RF-EXP-004, RF-DAT-004 y aislamiento multitenant.
/// </summary>
public class ServicioExportacion : IServicioExportacion
{
    private readonly AplicacionDbContext _context;
    private readonly IAlmacenArchivos _almacenArchivos;
    private readonly IContextoInstitucion _contextoInstitucion;
    private readonly IArmadorDatosDocumento _armadorDatos;
    private readonly IServicioGeneracionPdfHojaDeVida _generadorPdf;
    private Dictionary<int, string>? _catalogosCv;

    public ServicioExportacion(
        AplicacionDbContext context,
        IAlmacenArchivos almacenArchivos,
        IContextoInstitucion contextoInstitucion,
        IArmadorDatosDocumento armadorDatos,
        IServicioGeneracionPdfHojaDeVida generadorPdf)
    {
        _context = context;
        _almacenArchivos = almacenArchivos;
        _contextoInstitucion = contextoInstitucion;
        _armadorDatos = armadorDatos;
        _generadorPdf = generadorPdf;
    }

    public async Task<DescargaArchivoDto> ExportarZipAsync(Guid? institucionId = null, CancellationToken ct = default)
    {
        var (institucionIdEfectivo, institucionNombre) = await ValidarYResolverInstitucionAsync(institucionId, ct);

        // RF-EXP-001 / RF-EXP-004: Solo personas con datos aprobados de la institución
        var personasAprobadas = await _context.Personas
            .AsNoTracking()
            .Where(p => p.InstitucionId == new InstitucionId(institucionIdEfectivo) && p.EstadoActualizacion == EstadoActualizacion.Aprobado)
            .OrderBy(p => p.Documento)
            .ToListAsync(ct);

        var personasIds = personasAprobadas.Select(p => p.Id).ToList();

        // Obtener archivos adjuntos de las personas aprobadas
        var archivos = await _context.ArchivosAdjuntos
            .AsNoTracking()
            .Where(a => a.InstitucionId == new InstitucionId(institucionIdEfectivo) && personasIds.Contains(a.PersonaId))
            .OrderBy(a => a.PersonaId)
            .ThenBy(a => a.NombreOriginal)
            .ToListAsync(ct);

        var archivosPorPersona = archivos.ToLookup(a => a.PersonaId);

        var ahoraUtc = DateTime.UtcNow;
        var slugInstitucion = GenerarSlug(institucionNombre);
        var nombreCarpetaRaiz = $"{slugInstitucion}_{ahoraUtc:yyyyMMdd_HHmmss}_datos";

        var memoryStream = new MemoryStream();
        using (var archive = new ZipArchive(memoryStream, ZipArchiveMode.Create, leaveOpen: true))
        {
            // Cargar configuración de documento y marca institucional para la exportación
            var configInst = await _context.ConfiguracionesDocumentoInstitucion
                .AsNoTracking()
                .SingleOrDefaultAsync(c => c.InstitucionId == new InstitucionId(institucionIdEfectivo), ct);

            ConfiguracionPlantilla configuracionPlantilla;
            if (configInst?.VersionPlantillaId.HasValue == true)
            {
                var version = await _context.VersionesPlantillaHojaDeVida
                    .AsNoTracking()
                    .SingleOrDefaultAsync(v => v.Id == configInst.VersionPlantillaId.Value, ct);

                try
                {
                    configuracionPlantilla = !string.IsNullOrWhiteSpace(version?.ConfiguracionJson)
                        ? JsonSerializer.Deserialize<ConfiguracionPlantilla>(version.ConfiguracionJson) ?? ConfiguracionPlantilla.Predeterminada()
                        : ConfiguracionPlantilla.Predeterminada();
                }
                catch
                {
                    configuracionPlantilla = ConfiguracionPlantilla.Predeterminada();
                }
            }
            else
            {
                configuracionPlantilla = ConfiguracionPlantilla.Predeterminada();
            }

            byte[]? logoBytes = null;
            if (configInst?.LogoArchivoId.HasValue == true)
            {
                var archivoLogo = await _context.ArchivosAdjuntos
                    .AsNoTracking()
                    .SingleOrDefaultAsync(a => a.Id == configInst.LogoArchivoId.Value, ct);

                if (archivoLogo != null)
                {
                    try
                    {
                        var stream = await _almacenArchivos.AbrirAsync(archivoLogo.InstitucionId, archivoLogo.PersonaId, archivoLogo.Id, ct);
                        if (stream != null)
                        {
                            using (stream)
                            using (var ms = new MemoryStream())
                            {
                                await stream.CopyToAsync(ms, ct);
                                logoBytes = ms.ToArray();
                            }
                        }
                    }
                    catch
                    {
                        logoBytes = null;
                    }
                }
            }

            byte[]? portadaBytes = null;
            if (configInst?.PortadaArchivoId.HasValue == true)
            {
                var archivoPortada = await _context.ArchivosAdjuntos
                    .AsNoTracking()
                    .SingleOrDefaultAsync(a => a.Id == configInst.PortadaArchivoId.Value, ct);

                if (archivoPortada != null)
                {
                    try
                    {
                        var stream = await _almacenArchivos.AbrirAsync(archivoPortada.InstitucionId, archivoPortada.PersonaId, archivoPortada.Id, ct);
                        if (stream != null)
                        {
                            using (stream)
                            using (var ms = new MemoryStream())
                            {
                                await stream.CopyToAsync(ms, ct);
                                portadaBytes = ms.ToArray();
                            }
                        }
                    }
                    catch
                    {
                        portadaBytes = null;
                    }
                }
            }

            var marca = new MarcaDocumento(
                NombreVisible: configInst?.NombreVisible ?? institucionNombre,
                LogoBytes: logoBytes,
                PortadaBytes: portadaBytes,
                ColorPrimario: configInst?.ColorPrimario ?? MarcaDocumento.Neutra.ColorPrimario,
                ColorSecundario: configInst?.ColorSecundario ?? MarcaDocumento.Neutra.ColorSecundario,
                Lema: configInst?.Lema,
                TextoCompromiso: configInst?.TextoCompromiso);

            // 1. Generar index.md (inventario de la exportación)
            var contenidoIndice = ConstruirIndiceMarkdown(institucionNombre, institucionIdEfectivo, ahoraUtc, personasAprobadas, archivosPorPersona);
            var indexEntry = archive.CreateEntry($"{nombreCarpetaRaiz}/index.md", CompressionLevel.Optimal);
            using (var indexStream = indexEntry.Open())
            using (var writer = new StreamWriter(indexStream, new UTF8Encoding(false)))
            {
                await writer.WriteAsync(contenidoIndice);
            }

            // 2. Empaquetar documentos físicos en subcarpetas por persona
            foreach (var persona in personasAprobadas)
            {
                var documentoSeguro = SanearSegmentoRuta(persona.Documento, persona.Id.ToString("N"));
                var expediente = await ObtenerExpedienteAsync(persona, ct);

                // HTML legado (PD-PLA-17)
                var entradaCv = archive.CreateEntry($"{nombreCarpetaRaiz}/{documentoSeguro}/hoja-de-vida.html", CompressionLevel.Optimal);
                using (var salidaCv = new StreamWriter(entradaCv.Open(), new UTF8Encoding(false)))
                {
                    await salidaCv.WriteAsync(GeneradorCvHtml.Generar(expediente));
                }

                // PDF oficial desde plantilla y marca institucional (RF-PLA-013)
                try
                {
                    var datosDoc = await _armadorDatos.ArmarDatosPersonaAsync(persona.Id, new InstitucionId(institucionIdEfectivo), ct);
                    var bytesPdf = _generadorPdf.Generar(datosDoc, marca, configuracionPlantilla);
                    var entradaPdf = archive.CreateEntry($"{nombreCarpetaRaiz}/{documentoSeguro}/hoja-de-vida.pdf", CompressionLevel.Optimal);
                    using var streamSalidaPdf = entradaPdf.Open();
                    await streamSalidaPdf.WriteAsync(bytesPdf, ct);
                }
                catch
                {
                    // Un fallo en una persona se ignora sin perder las demás (RF-PLA-013)
                }

                var archivosPersona = archivosPorPersona[persona.Id].ToList();
                var nombresUsados = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "hoja-de-vida.html", "hoja-de-vida.pdf" };

                foreach (var archivo in archivosPersona)
                {
                    var nombreSaneado = SanearNombreArchivoZip(archivo.NombreOriginal, archivo.Id);
                    var nombreArchivoSeguro = GenerarNombreArchivoUnico(nombreSaneado, nombresUsados);
                    var rutaEnZip = $"{nombreCarpetaRaiz}/{documentoSeguro}/{nombreArchivoSeguro}";

                    try
                    {
                        var streamFisico = await _almacenArchivos.AbrirAsync(
                            new InstitucionId(institucionIdEfectivo),
                            persona.Id,
                            archivo.Id,
                            ct);

                        if (streamFisico != null)
                        {
                            using (streamFisico)
                            {
                                var archivoEntry = archive.CreateEntry(rutaEnZip, CompressionLevel.Optimal);
                                using var entryStream = archivoEntry.Open();
                                await streamFisico.CopyToAsync(entryStream, ct);
                            }
                        }
                    }
                    catch (FileNotFoundException)
                    {
                        // Si el archivo físico no se localiza en disco, continuar sin interrumpir el empaquetado global
                    }
                }
            }
        }

        memoryStream.Position = 0;

        // RF-DAT-004: Registro de auditoría
        var actorZip = _contextoInstitucion.ActorActual ?? "sistema";
        _context.Auditorias.Add(new Auditoria(
            Guid.NewGuid(),
            actorZip,
            "ExportacionZip",
            new InstitucionId(institucionIdEfectivo),
            ahoraUtc,
            detalle: $"Generación de paquete ZIP para {institucionNombre} con {personasAprobadas.Count} personas aprobadas y {archivos.Count} archivos."));
        await _context.SaveChangesAsync(ct);

        return new DescargaArchivoDto(
            memoryStream,
            "application/zip",
            $"{nombreCarpetaRaiz}.zip");
    }

    public async Task<DescargaArchivoDto> ExportarExcelAsync(Guid? institucionId = null, CancellationToken ct = default)
    {
        var (institucionIdEfectivo, institucionNombre) = await ValidarYResolverInstitucionAsync(institucionId, ct);

        var ahoraUtc = DateTime.UtcNow;

        // Campañas para verificar vencimiento (RF-CAP-016 / T-10)
        var campanas = await _context.Campanas
            .AsNoTracking()
            .Where(c => c.InstitucionId == new InstitucionId(institucionIdEfectivo))
            .ToListAsync(ct);
        var campanaAbierta = campanas.Any(c => c.EstaAbiertaEn(ahoraUtc));
        var hayCampanaVencida = campanas.Any(c => c.FechaFinUtc < ahoraUtc);

        // RF-EXP-001 / RF-EXP-004: Solo personas con datos aprobados de la institución
        // RF-CAP-016: Si la campaña ha vencido y no hay campaña abierta, el admin puede ver y exportar borradores incompletos
        List<Persona> personas;
        if (!campanaAbierta && hayCampanaVencida)
        {
            personas = await _context.Personas
                .AsNoTracking()
                .Where(p => p.InstitucionId == new InstitucionId(institucionIdEfectivo) &&
                           (p.EstadoActualizacion == EstadoActualizacion.Aprobado || p.EstadoActualizacion == EstadoActualizacion.Borrador))
                .OrderBy(p => p.Documento)
                .ToListAsync(ct);
        }
        else
        {
            personas = await _context.Personas
                .AsNoTracking()
                .Where(p => p.InstitucionId == new InstitucionId(institucionIdEfectivo) && p.EstadoActualizacion == EstadoActualizacion.Aprobado)
                .OrderBy(p => p.Documento)
                .ToListAsync(ct);
        }

        var personasIds = personas.Select(p => p.Id).ToList();

        var conteoArchivos = await _context.ArchivosAdjuntos
            .AsNoTracking()
            .Where(a => a.InstitucionId == new InstitucionId(institucionIdEfectivo) && personasIds.Contains(a.PersonaId))
            .GroupBy(a => a.PersonaId)
            .Select(g => new { PersonaId = g.Key, Total = g.Count() })
            .ToDictionaryAsync(x => x.PersonaId, x => x.Total, ct);

        var correosPersonales = await _context.FichasPersonales
            .AsNoTracking()
            .Where(f => personasIds.Contains(f.PersonaId))
            .ToDictionaryAsync(f => f.PersonaId, f => f.CorreoPersonal ?? "—", ct);

        var perfiles = new Dictionary<Guid, string>();
        foreach (var persona in personas) perfiles[persona.Id] = (await ObtenerExpedienteAsync(persona, ct)).Perfil;

        // Cargar obligatorias activas y capacitaciones para reporte detallado (RF-CAP-011)
        var obligatorias = await _context.CapacitacionesObligatorias
            .AsNoTracking()
            .Where(c => c.InstitucionId == new InstitucionId(institucionIdEfectivo) && c.Activo)
            .OrderBy(c => c.Orden)
            .ThenBy(c => c.Nombre)
            .ToListAsync(ct);

        var capacitaciones = await _context.Capacitaciones
            .AsNoTracking()
            .Where(c => personasIds.Contains(c.PersonaId) && c.InstitucionId == new InstitucionId(institucionIdEfectivo))
            .ToListAsync(ct);

        var filasObligatorias = new List<GeneradorExcelOpenXml.FilaCapacitacionObligatoria>();
        var resumenObligatoriasPorPersona = new Dictionary<Guid, string>();

        foreach (var p in personas)
        {
            if (obligatorias.Count == 0)
            {
                resumenObligatoriasPorPersona[p.Id] = "—";
                continue;
            }

            var totalAplica = 0;
            var cumplidas = 0;

            foreach (var ob in obligatorias)
            {
                var aplica = ob.AplicaA(p.TipoFuncionarioId);
                if (!aplica)
                {
                    filasObligatorias.Add(new GeneradorExcelOpenXml.FilaCapacitacionObligatoria(
                        p.Documento,
                        p.Nombre ?? "—",
                        ob.Nombre,
                        "No",
                        "No aplica",
                        "—",
                        ob.FechaRealizacion?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? "—"));
                    continue;
                }

                totalAplica++;
                var vinculada = capacitaciones.FirstOrDefault(c => c.PersonaId == p.Id && c.CapacitacionObligatoriaId == ob.Id);
                string estadoTexto;
                string horasTexto = vinculada?.NumeroHoras?.ToString(CultureInfo.InvariantCulture) ?? ob.HorasEsperadas?.ToString(CultureInfo.InvariantCulture) ?? "—";

                if (vinculada != null)
                {
                    cumplidas++;
                    estadoTexto = p.EstadoActualizacion == EstadoActualizacion.Aprobado ? "Aprobada" : "Cargada";
                }
                else if (ob.EsExentoPorNuevoIngreso(p.FechaIngresoInstitucion))
                {
                    cumplidas++;
                    estadoTexto = "Exento (nuevo ingreso)";
                }
                else
                {
                    estadoTexto = "Pendiente";
                }

                filasObligatorias.Add(new GeneradorExcelOpenXml.FilaCapacitacionObligatoria(
                    p.Documento,
                    p.Nombre ?? "—",
                    ob.Nombre,
                    "Sí",
                    estadoTexto,
                    horasTexto,
                    ob.FechaRealizacion?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? "—"));
            }

            resumenObligatoriasPorPersona[p.Id] = totalAplica > 0 ? $"{cumplidas}/{totalAplica} cumplidas" : "Sin obligatorias aplicables";
        }

        var filas = personas.Select(p => new GeneradorExcelOpenXml.FilaExportacion(
            Documento: p.Documento,
            Nombre: p.Nombre ?? "—",
            Correo: p.Correo ?? "—",
            Rol: p.Rol.ToString(),
            Estado: p.EstadoActualizacion == EstadoActualizacion.Borrador ? "Incompleto, no enviado" : p.EstadoActualizacion.ToString(),
            CantidadArchivos: conteoArchivos.GetValueOrDefault(p.Id, 0),
            TratamientoDatosAceptado: p.TratamientoDatosAceptado,
            FechaCreacionUtc: p.FechaCreacionUtc,
            Perfil: perfiles[p.Id],
            EstadoCapacitacionesObligatorias: resumenObligatoriasPorPersona.GetValueOrDefault(p.Id, "—"),
            CorreoPersonal: correosPersonales.GetValueOrDefault(p.Id, "—")
        )).ToList();

        var bytesExcel = GeneradorExcelOpenXml.GenerarExcelPersonasAprobadas(institucionNombre, filas, filasObligatorias);
        var memoryStream = new MemoryStream(bytesExcel);

        var slugInstitucion = GenerarSlug(institucionNombre);
        var nombreArchivo = $"{slugInstitucion}_{ahoraUtc:yyyyMMdd_HHmmss}_datos.xlsx";

        // RF-DAT-004: Registro de auditoría
        var actorExcel = _contextoInstitucion.ActorActual ?? "sistema";
        _context.Auditorias.Add(new Auditoria(
            Guid.NewGuid(),
            actorExcel,
            "ExportacionExcel",
            new InstitucionId(institucionIdEfectivo),
            ahoraUtc,
            detalle: $"Generación de reporte Excel para {institucionNombre} con {personas.Count} personas."));
        await _context.SaveChangesAsync(ct);

        return new DescargaArchivoDto(
            memoryStream,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            nombreArchivo);
    }

    private async Task<GeneradorCvHtml.Expediente> ObtenerExpedienteAsync(Persona persona, CancellationToken ct)
    {
        // Filtros explícitos: el superadmin también puede exportar una institución seleccionada.
        var id = persona.Id;
        var institucion = persona.InstitucionId;
        _catalogosCv ??= await _context.ElementosCatalogo.AsNoTracking().ToDictionaryAsync(e => e.Id, e => e.Nombre, ct);
        return new(
            await _context.FichasPersonales.FirstOrDefaultAsync(f => f.PersonaId == id && f.InstitucionId == institucion, ct),
            await _context.TitulosAcademicos.Where(t => t.PersonaId == id && t.InstitucionId == institucion).ToListAsync(ct),
            await _context.TitulosEnCurso.Where(t => t.PersonaId == id && t.InstitucionId == institucion).ToListAsync(ct),
            await _context.Capacitaciones.Where(t => t.PersonaId == id && t.InstitucionId == institucion).ToListAsync(ct),
            await _context.ExperienciasLaborales.Where(t => t.PersonaId == id && t.InstitucionId == institucion).ToListAsync(ct),
            await _context.ReferenciasPersonales.Where(t => t.PersonaId == id && t.InstitucionId == institucion).ToListAsync(ct),
            await _context.DocumentosPersonales.Where(t => t.PersonaId == id && t.InstitucionId == institucion).ToListAsync(ct),
            await _context.CuentasBancarias.FirstOrDefaultAsync(t => t.PersonaId == id && t.InstitucionId == institucion, ct), _catalogosCv);
    }

    private async Task<(Guid Id, string Nombre)> ValidarYResolverInstitucionAsync(Guid? institucionId, CancellationToken ct)
    {
        // RF-EXP-003: Supervisor y Usuario reciben rechazo por falta de permisos
        if (_contextoInstitucion.RolActual == RolUsuario.Supervisor || _contextoInstitucion.RolActual == RolUsuario.Usuario)
        {
            throw new ReglaNegocioException("No tiene permisos para generar exportaciones de datos. Esta operación es exclusiva para administradores.");
        }

        Guid institucionIdEfectivo;

        if (_contextoInstitucion.EsSuperadmin)
        {
            if (institucionId.HasValue)
            {
                institucionIdEfectivo = institucionId.Value;
            }
            else if (_contextoInstitucion.InstitucionId != null)
            {
                institucionIdEfectivo = _contextoInstitucion.InstitucionId.Valor;
            }
            else
            {
                throw new ReglaNegocioException("Debe especificar la institución a exportar.");
            }
        }
        else
        {
            // Rol Admin: Solo puede exportar su propia institución
            if (_contextoInstitucion.InstitucionId == null)
            {
                throw new ReglaNegocioException("No se ha establecido el contexto institucional del administrador.");
            }

            institucionIdEfectivo = _contextoInstitucion.InstitucionId.Valor;

            if (institucionId.HasValue && institucionId.Value != institucionIdEfectivo)
            {
                throw new ReglaNegocioException("No tiene permisos para exportar datos de otra institución.");
            }
        }

        var institucion = await _context.Instituciones
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == new InstitucionId(institucionIdEfectivo), ct);

        var nombreInstitucion = institucion?.Nombre ?? "Institución";

        return (institucionIdEfectivo, nombreInstitucion);
    }

    private static string ConstruirIndiceMarkdown(
        string nombreInstitucion,
        Guid institucionId,
        DateTime fechaUtc,
        List<Persona> personas,
        ILookup<Guid, ArchivoAdjunto> archivosPorPersona)
    {
        var sb = new StringBuilder();
        sb.AppendLine(CultureInfo.InvariantCulture, $"# Índice de Expedientes Consolidados — {nombreInstitucion}");
        sb.AppendLine();
        sb.AppendLine(CultureInfo.InvariantCulture, $"- **Institución ID:** `{institucionId}`");
        sb.AppendLine(CultureInfo.InvariantCulture, $"- **Fecha de Generación (UTC):** `{fechaUtc:yyyy-MM-dd HH:mm:ss}`");
        sb.AppendLine(CultureInfo.InvariantCulture, $"- **Total de Personas con Datos Aprobados:** {personas.Count}");
        var totalArchivos = personas.Sum(p => archivosPorPersona[p.Id].Count());
        sb.AppendLine(CultureInfo.InvariantCulture, $"- **Total de Documentos Adjuntos:** {totalArchivos}");
        sb.AppendLine();
        sb.AppendLine("---");
        sb.AppendLine();
        sb.AppendLine("## 1. Resumen de Personas Aprobadas");
        sb.AppendLine();
        sb.AppendLine("| Documento | Nombre | Correo | Rol | Documentos Adjuntos |");
        sb.AppendLine("| --- | --- | --- | --- | --- |");

        foreach (var p in personas)
        {
            var cant = archivosPorPersona[p.Id].Count();
            sb.AppendLine(CultureInfo.InvariantCulture, $"| {FormatearCodigoEnLineaMarkdown(p.Documento)} | {p.Nombre ?? "—"} | {p.Correo ?? "—"} | {p.Rol} | {cant} |");
        }

        sb.AppendLine();
        sb.AppendLine("---");
        sb.AppendLine();
        sb.AppendLine("## 2. Detalle de Expedientes y Archivos Adjuntos");
        sb.AppendLine();

        foreach (var p in personas)
        {
            var documentoSeguro = SanearSegmentoRuta(p.Documento, p.Id.ToString("N"));
            var docs = archivosPorPersona[p.Id].ToList();
            sb.AppendLine(CultureInfo.InvariantCulture, $"### Persona: {p.Documento} — {p.Nombre ?? "Sin nombre"}");
            sb.AppendLine(CultureInfo.InvariantCulture, $"- **Correo:** {p.Correo ?? "—"}");
            sb.AppendLine(CultureInfo.InvariantCulture, $"- **Carpeta en paquete:** {FormatearCodigoEnLineaMarkdown($"{documentoSeguro}/")}");

            if (docs.Count == 0)
            {
                sb.AppendLine("- *Sin documentos adjuntos.*");
            }
            else
            {
                sb.AppendLine("- **Archivos:**");
                for (var idx = 0; idx < docs.Count; idx++)
                {
                    var a = docs[idx];
                    var kb = a.TamanoBytes / 1024.0;
                    var nombreMarkdown = FormatearCodigoEnLineaMarkdown(a.NombreOriginal);
                    sb.AppendLine(CultureInfo.InvariantCulture, $"  {idx + 1}. {nombreMarkdown} ({kb:F1} KB, `{a.TipoContenido}`) — SHA-256: `{a.HashSha256}`");
                }
            }

            sb.AppendLine();
        }

        return sb.ToString();
    }

    private static readonly HashSet<char> CaracteresInvalidosNombreArchivo =
        new(Path.GetInvalidFileNameChars().Concat(['/', '\\', ':', '*', '?', '"', '<', '>', '|']));

    internal static string SanearNombreArchivoZip(string? nombreOriginal, Guid archivoId)
        => SanearHojaRuta(nombreOriginal, $"{archivoId}.bin");

    internal static string SanearSegmentoRuta(string? segmento, string reemplazoSiVacio)
        => SanearHojaRuta(segmento, reemplazoSiVacio);

    private static string SanearHojaRuta(string? valor, string reemplazoSiVacio)
    {
        if (string.IsNullOrWhiteSpace(valor))
        {
            return reemplazoSiVacio;
        }

        var normalizado = valor.Replace('\\', '/');
        var hoja = Path.GetFileName(normalizado.AsSpan());

        var sb = new StringBuilder(hoja.Length);
        foreach (var c in hoja)
        {
            if (!char.IsControl(c) && !CaracteresInvalidosNombreArchivo.Contains(c))
            {
                sb.Append(c);
            }
        }

        var resultado = sb.ToString().Trim();
        if (string.IsNullOrEmpty(resultado) || resultado is "." or "..")
        {
            return reemplazoSiVacio;
        }

        return resultado;
    }

    internal static string FormatearCodigoEnLineaMarkdown(string? texto)
    {
        if (string.IsNullOrEmpty(texto))
        {
            return "``";
        }

        var sinSaltoDoble = texto.Replace("\r\n", "\n");
        var sb = new StringBuilder(sinSaltoDoble.Length);
        foreach (var c in sinSaltoDoble)
        {
            if (c is '\r' or '\n')
            {
                sb.Append(' ');
            }
            else if (!char.IsControl(c))
            {
                sb.Append(c);
            }
        }

        var limpio = sb.ToString();
        var maxComillas = 0;
        var actual = 0;
        foreach (var c in limpio)
        {
            if (c == '`')
            {
                actual++;
                if (actual > maxComillas)
                {
                    maxComillas = actual;
                }
            }
            else
            {
                actual = 0;
            }
        }

        var delimitador = new string('`', maxComillas + 1);
        var requiereEspacio = limpio.StartsWith('`') || limpio.EndsWith('`') || limpio.StartsWith(' ') || limpio.EndsWith(' ');
        return requiereEspacio
            ? $"{delimitador} {limpio} {delimitador}"
            : $"{delimitador}{limpio}{delimitador}";
    }

    internal static string GenerarNombreArchivoUnico(string nombreOriginal, HashSet<string> nombresUsados)
    {
        var nombreBase = Path.GetFileNameWithoutExtension(nombreOriginal);
        var extension = Path.GetExtension(nombreOriginal);

        var candidato = nombreOriginal;
        var contador = 2;

        while (nombresUsados.Contains(candidato))
        {
            candidato = $"{nombreBase}_{contador}{extension}";
            contador++;
        }

        nombresUsados.Add(candidato);
        return candidato;
    }

    private static string GenerarSlug(string texto)
    {
        if (string.IsNullOrWhiteSpace(texto))
        {
            return "institucion";
        }

        var normalizado = texto.Trim().ToLowerInvariant()
            .Replace('á', 'a').Replace('é', 'e').Replace('í', 'i').Replace('ó', 'o').Replace('ú', 'u')
            .Replace('ñ', 'n');

        var sb = new StringBuilder();
        foreach (var c in normalizado)
        {
            if (char.IsLetterOrDigit(c))
            {
                sb.Append(c);
            }
            else if (c == ' ' || c == '-' || c == '_')
            {
                sb.Append('_');
            }
        }

        var res = sb.ToString().Trim('_');
        while (res.Contains("__"))
        {
            res = res.Replace("__", "_");
        }

        return string.IsNullOrWhiteSpace(res) ? "institucion" : res;
    }
}
