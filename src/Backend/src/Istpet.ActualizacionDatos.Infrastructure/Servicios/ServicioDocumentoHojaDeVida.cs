namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using System.Text.Json;
using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Documentos;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

public sealed class ServicioDocumentoHojaDeVida(
    AplicacionDbContext db,
    IArmadorDatosDocumento armadorDatos,
    IServicioGeneracionPdfHojaDeVida generadorPdf,
    IAlmacenArchivos almacenArchivos,
    IContextoInstitucion contexto) : IServicioDocumentoHojaDeVida
{
    private InstitucionId InstitucionActual => contexto.InstitucionId
        ?? throw new ReglaNegocioException("Se requiere una institución activa para generar el documento de hoja de vida.");

    public async Task<DescargaArchivoDto> ObtenerDocumentoPersonaAsync(Guid personaId, CancellationToken ct = default)
    {
        var rol = contexto.RolActual;
        if (rol is not (RolUsuario.Admin or RolUsuario.Supervisor or RolUsuario.Superadmin))
        {
            throw new ReglaNegocioException("No tiene permisos para descargar el documento de la persona.");
        }

        var persona = await db.Personas
            .AsNoTracking()
            .SingleOrDefaultAsync(p => p.Id == personaId && p.InstitucionId == InstitucionActual, ct)
            ?? throw new RecursoNoEncontradoException("La persona especificada no existe en la institución.");

        var resultado = await GenerarPdfAsync(persona, ct);

        // RF-PLA-016: Auditoría de descarga por terceros sin datos personales
        db.Auditorias.Add(new Auditoria(
            id: Guid.NewGuid(),
            actor: contexto.ActorActual ?? "sistema",
            accion: "DocumentoHojaDeVida.Descargar",
            institucionId: InstitucionActual,
            fechaUtc: DateTime.UtcNow,
            detalle: $"Descarga de hoja de vida de persona {persona.Id}"));

        await db.SaveChangesAsync(ct);
        return resultado;
    }

    public async Task<DescargaArchivoDto> ObtenerMiDocumentoAsync(CancellationToken ct = default)
    {
        var actor = contexto.ActorActual
            ?? throw new ReglaNegocioException("No se encontró el documento de identidad del usuario autenticado.");

        var persona = await db.Personas
            .AsNoTracking()
            .SingleOrDefaultAsync(p => p.Documento == actor && p.InstitucionId == InstitucionActual, ct)
            ?? throw new RecursoNoEncontradoException("No se encontraron los datos de la persona autenticada en la institución.");

        return await GenerarPdfAsync(persona, ct);
    }

    private async Task<DescargaArchivoDto> GenerarPdfAsync(Persona persona, CancellationToken ct)
    {
        var institucion = await db.Instituciones
            .AsNoTracking()
            .SingleOrDefaultAsync(i => i.Id == InstitucionActual, ct);

        var configInst = await db.ConfiguracionesDocumentoInstitucion
            .AsNoTracking()
            .SingleOrDefaultAsync(c => c.InstitucionId == InstitucionActual, ct);

        ConfiguracionPlantilla configuracionPlantilla;
        if (configInst?.VersionPlantillaId.HasValue == true)
        {
            var version = await db.VersionesPlantillaHojaDeVida
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

        // Cargar bytes de logo y portada si están configurados
        byte[]? logoBytes = null;
        if (configInst?.LogoArchivoId.HasValue == true)
        {
            var archivoLogo = await db.ArchivosAdjuntos
                .AsNoTracking()
                .SingleOrDefaultAsync(a => a.Id == configInst.LogoArchivoId.Value, ct);

            if (archivoLogo != null)
            {
                try
                {
                    var stream = await almacenArchivos.AbrirAsync(archivoLogo.InstitucionId, archivoLogo.PersonaId, archivoLogo.Id, ct);
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
            var archivoPortada = await db.ArchivosAdjuntos
                .AsNoTracking()
                .SingleOrDefaultAsync(a => a.Id == configInst.PortadaArchivoId.Value, ct);

            if (archivoPortada != null)
            {
                try
                {
                    var stream = await almacenArchivos.AbrirAsync(archivoPortada.InstitucionId, archivoPortada.PersonaId, archivoPortada.Id, ct);
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
            NombreVisible: configInst?.NombreVisible ?? institucion?.Nombre ?? "Institución Educativa",
            LogoBytes: logoBytes,
            PortadaBytes: portadaBytes,
            ColorPrimario: configInst?.ColorPrimario ?? MarcaDocumento.Neutra.ColorPrimario,
            ColorSecundario: configInst?.ColorSecundario ?? MarcaDocumento.Neutra.ColorSecundario,
            Lema: configInst?.Lema,
            TextoCompromiso: configInst?.TextoCompromiso);

        var datos = await armadorDatos.ArmarDatosPersonaAsync(persona.Id, InstitucionActual, ct);

        var bytesPdf = generadorPdf.Generar(datos, marca, configuracionPlantilla);
        var memoryStream = new MemoryStream(bytesPdf);

        var nombreArchivo = $"hoja-de-vida-{persona.Documento}.pdf";
        return new DescargaArchivoDto(memoryStream, "application/pdf", nombreArchivo);
    }
}
