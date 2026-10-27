namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using System.Text.RegularExpressions;
using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Documentos;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.Documentos;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

public sealed partial class ServicioConfiguracionDocumento(
    AplicacionDbContext db,
    IContextoInstitucion contexto) : IServicioConfiguracionDocumento
{
    private InstitucionId InstitucionActual => contexto.InstitucionId
        ?? throw new ReglaNegocioException("Se requiere una institución activa para configurar el documento.");

    [GeneratedRegex("^#[0-9A-Fa-f]{6}$")]
    private static partial Regex HexColorRegex();

    public async Task<ConfiguracionDocumentoDto> ObtenerConfiguracionAsync(CancellationToken ct = default)
    {
        var config = await db.ConfiguracionesDocumentoInstitucion
            .SingleOrDefaultAsync(c => c.InstitucionId == InstitucionActual, ct);

        if (config == null)
        {
            var plantillaPred = await db.PlantillasHojaDeVida
                .AsNoTracking()
                .Where(p => p.EsPredeterminada)
                .FirstOrDefaultAsync(ct)
                ?? await db.PlantillasHojaDeVida.AsNoTracking().FirstOrDefaultAsync(ct);

            VersionPlantillaHojaDeVida? versionPred = null;
            if (plantillaPred != null)
            {
                versionPred = await db.VersionesPlantillaHojaDeVida
                    .AsNoTracking()
                    .Where(v => v.PlantillaId == plantillaPred.Id)
                    .OrderByDescending(v => v.NumeroVersion)
                    .FirstOrDefaultAsync(ct);
            }

            return new ConfiguracionDocumentoDto(
                InstitucionId: InstitucionActual.Valor,
                PlantillaId: plantillaPred?.Id,
                VersionPlantillaId: versionPred?.Id,
                NombrePlantilla: plantillaPred?.Nombre,
                NumeroVersion: versionPred?.NumeroVersion,
                NombreVisible: null,
                LogoArchivoId: null,
                PortadaArchivoId: null,
                ColorPrimario: MarcaDocumento.Neutra.ColorPrimario,
                ColorSecundario: MarcaDocumento.Neutra.ColorSecundario,
                Lema: null,
                TextoCompromiso: null,
                TieneConfiguracionPropia: false,
                HayNuevaVersionDisponible: false,
                UltimaVersionDisponibleId: versionPred?.Id,
                UltimoNumeroVersionDisponible: versionPred?.NumeroVersion);
        }

        PlantillaHojaDeVida? plantilla = null;
        VersionPlantillaHojaDeVida? version = null;
        VersionPlantillaHojaDeVida? ultimaVersion = null;

        if (config.PlantillaId.HasValue)
        {
            plantilla = await db.PlantillasHojaDeVida
                .AsNoTracking()
                .SingleOrDefaultAsync(p => p.Id == config.PlantillaId.Value, ct);

            if (config.VersionPlantillaId.HasValue)
            {
                version = await db.VersionesPlantillaHojaDeVida
                    .AsNoTracking()
                    .SingleOrDefaultAsync(v => v.Id == config.VersionPlantillaId.Value, ct);
            }

            ultimaVersion = await db.VersionesPlantillaHojaDeVida
                .AsNoTracking()
                .Where(v => v.PlantillaId == config.PlantillaId.Value)
                .OrderByDescending(v => v.NumeroVersion)
                .FirstOrDefaultAsync(ct);
        }

        var hayNuevaVersion = ultimaVersion != null && version != null && ultimaVersion.NumeroVersion > version.NumeroVersion;

        return new ConfiguracionDocumentoDto(
            InstitucionId: config.InstitucionId.Valor,
            PlantillaId: config.PlantillaId,
            VersionPlantillaId: config.VersionPlantillaId,
            NombrePlantilla: plantilla?.Nombre,
            NumeroVersion: version?.NumeroVersion,
            NombreVisible: config.NombreVisible,
            LogoArchivoId: config.LogoArchivoId,
            PortadaArchivoId: config.PortadaArchivoId,
            ColorPrimario: config.ColorPrimario,
            ColorSecundario: config.ColorSecundario,
            Lema: config.Lema,
            TextoCompromiso: config.TextoCompromiso,
            TieneConfiguracionPropia: true,
            HayNuevaVersionDisponible: hayNuevaVersion,
            UltimaVersionDisponibleId: ultimaVersion?.Id,
            UltimoNumeroVersionDisponible: ultimaVersion?.NumeroVersion);
    }

    public async Task<ConfiguracionDocumentoDto> ActualizarMarcaAsync(ActualizarMarcaDto dto, CancellationToken ct = default)
    {
        ValidarColor(dto.ColorPrimario, nameof(dto.ColorPrimario));
        ValidarColor(dto.ColorSecundario, nameof(dto.ColorSecundario));

        if (dto.LogoArchivoId.HasValue)
        {
            var existe = await db.ArchivosAdjuntos.AnyAsync(a => a.Id == dto.LogoArchivoId.Value, ct);
            if (!existe)
            {
                throw new ReglaNegocioException("El archivo de logo especificado no existe.");
            }
        }

        if (dto.PortadaArchivoId.HasValue)
        {
            var existe = await db.ArchivosAdjuntos.AnyAsync(a => a.Id == dto.PortadaArchivoId.Value, ct);
            if (!existe)
            {
                throw new ReglaNegocioException("El archivo de portada especificado no existe.");
            }
        }

        var config = await db.ConfiguracionesDocumentoInstitucion
            .SingleOrDefaultAsync(c => c.InstitucionId == InstitucionActual, ct);

        if (config == null)
        {
            var plantillaPred = await db.PlantillasHojaDeVida
                .Where(p => p.EsPredeterminada)
                .FirstOrDefaultAsync(ct)
                ?? await db.PlantillasHojaDeVida.FirstOrDefaultAsync(ct);

            VersionPlantillaHojaDeVida? versionPred = null;
            if (plantillaPred != null)
            {
                versionPred = await db.VersionesPlantillaHojaDeVida
                    .Where(v => v.PlantillaId == plantillaPred.Id)
                    .OrderByDescending(v => v.NumeroVersion)
                    .FirstOrDefaultAsync(ct);
            }

            config = new ConfiguracionDocumentoInstitucion(InstitucionActual);
            if (plantillaPred != null && versionPred != null)
            {
                config.ElegirPlantilla(plantillaPred.Id, versionPred.Id);
            }

            config.ActualizarMarca(
                nombreVisible: dto.NombreVisible,
                logoArchivoId: dto.LogoArchivoId,
                portadaArchivoId: dto.PortadaArchivoId,
                colorPrimario: dto.ColorPrimario,
                colorSecundario: dto.ColorSecundario,
                lema: dto.Lema,
                textoCompromiso: dto.TextoCompromiso);

            db.ConfiguracionesDocumentoInstitucion.Add(config);
        }
        else
        {
            config.ActualizarMarca(
                nombreVisible: dto.NombreVisible,
                logoArchivoId: dto.LogoArchivoId,
                portadaArchivoId: dto.PortadaArchivoId,
                colorPrimario: dto.ColorPrimario,
                colorSecundario: dto.ColorSecundario,
                lema: dto.Lema,
                textoCompromiso: dto.TextoCompromiso);
        }

        db.Auditorias.Add(new Auditoria(
            id: Guid.NewGuid(),
            actor: contexto.ActorActual ?? "sistema",
            accion: "ConfiguracionDocumento.ActualizarMarca",
            institucionId: InstitucionActual,
            fechaUtc: DateTime.UtcNow,
            detalle: "Actualización de marca institucional para documento"));

        await db.SaveChangesAsync(ct);
        return await ObtenerConfiguracionAsync(ct);
    }

    public async Task<ConfiguracionDocumentoDto> ElegirPlantillaAsync(ElegirPlantillaDto dto, CancellationToken ct = default)
    {
        var plantilla = await db.PlantillasHojaDeVida
            .SingleOrDefaultAsync(p => p.Id == dto.PlantillaId, ct)
            ?? throw new ReglaNegocioException("La plantilla especificada no existe.");

        VersionPlantillaHojaDeVida versionElegida;
        if (dto.VersionPlantillaId.HasValue)
        {
            versionElegida = await db.VersionesPlantillaHojaDeVida
                .SingleOrDefaultAsync(v => v.Id == dto.VersionPlantillaId.Value && v.PlantillaId == dto.PlantillaId, ct)
                ?? throw new ReglaNegocioException("La versión especificada no pertenece a la plantilla elegida.");
        }
        else
        {
            versionElegida = await db.VersionesPlantillaHojaDeVida
                .Where(v => v.PlantillaId == dto.PlantillaId)
                .OrderByDescending(v => v.NumeroVersion)
                .FirstOrDefaultAsync(ct)
                ?? throw new ReglaNegocioException("La plantilla especificada no tiene versiones publicadas.");
        }

        var config = await db.ConfiguracionesDocumentoInstitucion
            .SingleOrDefaultAsync(c => c.InstitucionId == InstitucionActual, ct);

        if (config == null)
        {
            config = new ConfiguracionDocumentoInstitucion(InstitucionActual);
            config.ElegirPlantilla(plantilla.Id, versionElegida.Id);
            db.ConfiguracionesDocumentoInstitucion.Add(config);
        }
        else
        {
            config.ElegirPlantilla(plantilla.Id, versionElegida.Id);
        }

        db.Auditorias.Add(new Auditoria(
            id: Guid.NewGuid(),
            actor: contexto.ActorActual ?? "sistema",
            accion: "ConfiguracionDocumento.ElegirPlantilla",
            institucionId: InstitucionActual,
            fechaUtc: DateTime.UtcNow,
            detalle: $"Plantilla elegida: {plantilla.Id}, Versión: {versionElegida.NumeroVersion}"));

        await db.SaveChangesAsync(ct);
        return await ObtenerConfiguracionAsync(ct);
    }

    public async Task<ConfiguracionDocumentoDto> AceptarNuevaVersionAsync(CancellationToken ct = default)
    {
        var config = await db.ConfiguracionesDocumentoInstitucion
            .SingleOrDefaultAsync(c => c.InstitucionId == InstitucionActual, ct)
            ?? throw new ReglaNegocioException("La institución no tiene una configuración de documento registrada.");

        if (!config.PlantillaId.HasValue)
        {
            throw new ReglaNegocioException("La institución no tiene una plantilla asignada.");
        }

        var ultimaVersion = await db.VersionesPlantillaHojaDeVida
            .Where(v => v.PlantillaId == config.PlantillaId.Value)
            .OrderByDescending(v => v.NumeroVersion)
            .FirstOrDefaultAsync(ct)
            ?? throw new ReglaNegocioException("No se encontró ninguna versión para la plantilla asignada.");

        config.ElegirPlantilla(config.PlantillaId.Value, ultimaVersion.Id);

        db.Auditorias.Add(new Auditoria(
            id: Guid.NewGuid(),
            actor: contexto.ActorActual ?? "sistema",
            accion: "ConfiguracionDocumento.AceptarNuevaVersion",
            institucionId: InstitucionActual,
            fechaUtc: DateTime.UtcNow,
            detalle: $"Nueva versión aceptada: {ultimaVersion.NumeroVersion}"));

        await db.SaveChangesAsync(ct);
        return await ObtenerConfiguracionAsync(ct);
    }

    private static void ValidarColor(string color, string nombreCampo)
    {
        if (string.IsNullOrWhiteSpace(color) || !HexColorRegex().IsMatch(color.Trim()))
        {
            throw new ReglaNegocioException($"El campo '{nombreCampo}' debe ser un código hexadecimal válido con formato '#RRGGBB'.");
        }
    }
}
