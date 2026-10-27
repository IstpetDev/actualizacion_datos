namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using System.Text.Json;
using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Documentos;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.Documentos;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

public sealed class ServicioPlantillasHojaDeVida(
    AplicacionDbContext db,
    IContextoInstitucion contexto) : IServicioPlantillasHojaDeVida
{
    private void ExigirSuperadmin()
    {
        if (!contexto.EsSuperadmin)
        {
            throw new ReglaNegocioException("Solo el superadmin puede administrar plantillas de hoja de vida globales.");
        }
    }

    public async Task<List<PlantillaResumenDto>> ListarPlantillasAsync(bool soloPublicadas = false, CancellationToken ct = default)
    {
        var forzarSoloPublicadas = soloPublicadas || !contexto.EsSuperadmin;

        var plantillas = await db.PlantillasHojaDeVida
            .AsNoTracking()
            .OrderByDescending(p => p.EsPredeterminada)
            .ThenBy(p => p.Nombre)
            .ToListAsync(ct);

        var versiones = await db.VersionesPlantillaHojaDeVida
            .AsNoTracking()
            .Select(v => new { v.PlantillaId, v.NumeroVersion })
            .ToListAsync(ct);

        var resultado = new List<PlantillaResumenDto>();

        foreach (var p in plantillas)
        {
            var versDePlantilla = versiones.Where(v => v.PlantillaId == p.Id).ToList();
            if (forzarSoloPublicadas && versDePlantilla.Count == 0)
            {
                continue;
            }

            var ultVersion = versDePlantilla.Count > 0 ? versDePlantilla.Max(v => v.NumeroVersion) : (int?)null;

            resultado.Add(new PlantillaResumenDto(
                Id: p.Id,
                Nombre: p.Nombre,
                Descripcion: p.Descripcion,
                DisenoBase: p.DisenoBase,
                EsPredeterminada: p.EsPredeterminada,
                TotalVersiones: versDePlantilla.Count,
                UltimaVersionPublicada: ultVersion,
                FechaCreacionUtc: p.FechaCreacionUtc,
                FechaActualizacionUtc: p.FechaActualizacionUtc));
        }

        return resultado;
    }

    public async Task<PlantillaDetalleDto> ObtenerPlantillaPorIdAsync(Guid id, CancellationToken ct = default)
    {
        var plantilla = await db.PlantillasHojaDeVida
            .AsNoTracking()
            .SingleOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new ReglaNegocioException("La plantilla especificada no existe.");

        var versiones = await db.VersionesPlantillaHojaDeVida
            .AsNoTracking()
            .Where(v => v.PlantillaId == id)
            .OrderByDescending(v => v.NumeroVersion)
            .ToListAsync(ct);

        if (!contexto.EsSuperadmin && versiones.Count == 0)
        {
            throw new ReglaNegocioException("La plantilla especificada no tiene versiones públicas disponibles.");
        }

        ConfiguracionPlantilla configBorrador;
        try
        {
            configBorrador = JsonSerializer.Deserialize<ConfiguracionPlantilla>(plantilla.ConfiguracionJson)
                ?? ConfiguracionPlantilla.Predeterminada();
        }
        catch
        {
            configBorrador = ConfiguracionPlantilla.Predeterminada();
        }

        var versionesDto = versiones.Select(v =>
        {
            ConfiguracionPlantilla configVersion;
            try
            {
                configVersion = JsonSerializer.Deserialize<ConfiguracionPlantilla>(v.ConfiguracionJson)
                    ?? ConfiguracionPlantilla.Predeterminada();
            }
            catch
            {
                configVersion = ConfiguracionPlantilla.Predeterminada();
            }

            return new VersionPlantillaDto(
                Id: v.Id,
                PlantillaId: v.PlantillaId,
                NumeroVersion: v.NumeroVersion,
                DisenoBase: v.DisenoBase,
                Configuracion: configVersion,
                DescripcionCambio: v.DescripcionCambio,
                FechaPublicacionUtc: v.FechaPublicacionUtc);
        }).ToList();

        return new PlantillaDetalleDto(
            Id: plantilla.Id,
            Nombre: plantilla.Nombre,
            Descripcion: plantilla.Descripcion,
            DisenoBase: plantilla.DisenoBase,
            EsPredeterminada: plantilla.EsPredeterminada,
            ConfiguracionBorrador: configBorrador,
            FechaCreacionUtc: plantilla.FechaCreacionUtc,
            FechaActualizacionUtc: plantilla.FechaActualizacionUtc,
            Versiones: versionesDto);
    }

    public async Task<PlantillaDetalleDto> CrearPlantillaAsync(CrearPlantillaDto dto, CancellationToken ct = default)
    {
        ExigirSuperadmin();

        var resultadoValidacion = ValidadorConfiguracionPlantilla.Validar(dto.Configuracion);
        if (!resultadoValidacion.EsValida)
        {
            throw new ReglaNegocioException($"La configuración de la plantilla contiene errores: {string.Join(", ", resultadoValidacion.Errores)}");
        }

        var json = JsonSerializer.Serialize(dto.Configuracion);
        var plantilla = new PlantillaHojaDeVida(
            id: Guid.NewGuid(),
            nombre: dto.Nombre,
            disenoBase: dto.DisenoBase,
            configuracionJson: json,
            descripcion: dto.Descripcion,
            esPredeterminada: false);

        db.PlantillasHojaDeVida.Add(plantilla);

        db.Auditorias.Add(new Auditoria(
            id: Guid.NewGuid(),
            actor: contexto.ActorActual ?? "sistema",
            accion: "PlantillaHojaDeVida.Crear",
            institucionId: contexto.InstitucionId,
            fechaUtc: DateTime.UtcNow,
            detalle: $"Creación de plantilla global '{plantilla.Nombre}' ({plantilla.Id})"));

        await db.SaveChangesAsync(ct);
        return await ObtenerPlantillaPorIdAsync(plantilla.Id, ct);
    }

    public async Task<PlantillaDetalleDto> ActualizarPlantillaAsync(Guid id, ActualizarPlantillaDto dto, CancellationToken ct = default)
    {
        ExigirSuperadmin();

        var resultadoValidacion = ValidadorConfiguracionPlantilla.Validar(dto.Configuracion);
        if (!resultadoValidacion.EsValida)
        {
            throw new ReglaNegocioException($"La configuración de la plantilla contiene errores: {string.Join(", ", resultadoValidacion.Errores)}");
        }

        var plantilla = await db.PlantillasHojaDeVida
            .SingleOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new ReglaNegocioException("La plantilla especificada no existe.");

        var json = JsonSerializer.Serialize(dto.Configuracion);
        plantilla.ActualizarBorrador(dto.Nombre, dto.Descripcion, json);

        db.Auditorias.Add(new Auditoria(
            id: Guid.NewGuid(),
            actor: contexto.ActorActual ?? "sistema",
            accion: "PlantillaHojaDeVida.Actualizar",
            institucionId: contexto.InstitucionId,
            fechaUtc: DateTime.UtcNow,
            detalle: $"Actualización de borrador de plantilla '{plantilla.Nombre}' ({plantilla.Id})"));

        await db.SaveChangesAsync(ct);
        return await ObtenerPlantillaPorIdAsync(plantilla.Id, ct);
    }

    public async Task<VersionPlantillaDto> PublicarVersionAsync(Guid id, PublicarVersionDto dto, CancellationToken ct = default)
    {
        ExigirSuperadmin();

        var plantilla = await db.PlantillasHojaDeVida
            .Include(p => p.Versiones)
            .SingleOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new ReglaNegocioException("La plantilla especificada no existe.");

        var nuevaVersion = plantilla.PublicarVersion(dto.DescripcionCambio);
        db.VersionesPlantillaHojaDeVida.Add(nuevaVersion);

        db.Auditorias.Add(new Auditoria(
            id: Guid.NewGuid(),
            actor: contexto.ActorActual ?? "sistema",
            accion: "PlantillaHojaDeVida.PublicarVersion",
            institucionId: contexto.InstitucionId,
            fechaUtc: DateTime.UtcNow,
            detalle: $"Publicación de versión {nuevaVersion.NumeroVersion} de plantilla '{plantilla.Nombre}' ({plantilla.Id})"));

        await db.SaveChangesAsync(ct);

        ConfiguracionPlantilla configVersion;
        try
        {
            configVersion = JsonSerializer.Deserialize<ConfiguracionPlantilla>(nuevaVersion.ConfiguracionJson)
                ?? ConfiguracionPlantilla.Predeterminada();
        }
        catch
        {
            configVersion = ConfiguracionPlantilla.Predeterminada();
        }

        return new VersionPlantillaDto(
            Id: nuevaVersion.Id,
            PlantillaId: nuevaVersion.PlantillaId,
            NumeroVersion: nuevaVersion.NumeroVersion,
            DisenoBase: nuevaVersion.DisenoBase,
            Configuracion: configVersion,
            DescripcionCambio: nuevaVersion.DescripcionCambio,
            FechaPublicacionUtc: nuevaVersion.FechaPublicacionUtc);
    }

    public async Task MarcarComoPredeterminadaAsync(Guid id, CancellationToken ct = default)
    {
        ExigirSuperadmin();

        var plantilla = await db.PlantillasHojaDeVida
            .SingleOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new ReglaNegocioException("La plantilla especificada no existe.");

        var anterioresPredeterminadas = await db.PlantillasHojaDeVida
            .Where(p => p.EsPredeterminada && p.Id != id)
            .ToListAsync(ct);

        foreach (var anterior in anterioresPredeterminadas)
        {
            anterior.DesmarcarPredeterminada();
        }

        plantilla.MarcarComoPredeterminada();

        db.Auditorias.Add(new Auditoria(
            id: Guid.NewGuid(),
            actor: contexto.ActorActual ?? "sistema",
            accion: "PlantillaHojaDeVida.MarcarPredeterminada",
            institucionId: contexto.InstitucionId,
            fechaUtc: DateTime.UtcNow,
            detalle: $"Plantilla '{plantilla.Nombre}' ({plantilla.Id}) marcada como predeterminada global"));

        await db.SaveChangesAsync(ct);
    }
}
