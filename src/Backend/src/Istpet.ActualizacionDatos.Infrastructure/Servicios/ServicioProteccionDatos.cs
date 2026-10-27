namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

public sealed class ServicioProteccionDatos(AplicacionDbContext db, TimeProvider reloj) : IServicioProteccionDatos
{
    public async Task<EstadoProteccionDatosDto> ObtenerEstadoAsync(Guid personaId, InstitucionId institucionId,
        RolUsuario rol, CancellationToken ct = default)
    {
        var ahora = reloj.GetUtcNow().UtcDateTime;
        var mascara = AvisoProteccionDatos.MascaraRol(rol);
        // Incluso el superadmin consulta aquí solo el aviso de su propia institución.
        var avisos = await db.AvisosProteccionDatos.IgnoreQueryFilters().AsNoTracking()
            .Where(a => a.InstitucionId == institucionId && (a.RolesDestinatarios & mascara) != 0 &&
                a.VigenteDesdeUtc <= ahora && (a.VigenteHastaUtc == null || ahora < a.VigenteHastaUtc))
            .Take(2).ToListAsync(ct);
        if (avisos.Count != 1)
            return new(false, null, null, "No hay un aviso de protección de datos vigente y único para su acceso. Contacte a su institución.");

        var aviso = avisos[0];
        var fecha = await db.AceptacionesProteccionDatos.IgnoreQueryFilters().AsNoTracking()
            .Where(a => a.InstitucionId == institucionId && a.PersonaId == personaId && a.AvisoId == aviso.Id)
            .Select(a => (DateTime?)a.FechaUtc).SingleOrDefaultAsync(ct);
        return new(fecha.HasValue, new(aviso.Id, aviso.Version, aviso.Titulo, aviso.Responsable,
            aviso.Contenido, aviso.DeclaracionAceptacion, aviso.FuenteOficial,
            aviso.VigenteDesdeUtc, aviso.VigenteHastaUtc), fecha);
    }

    public async Task<EstadoProteccionDatosDto> AceptarAsync(Guid personaId, InstitucionId institucionId,
        RolUsuario rol, AceptarAvisoRequest solicitud, CancellationToken ct = default)
    {
        if (!solicitud.Acepta || solicitud.AvisoId == Guid.Empty)
            throw new ArgumentException("Debe aceptar explícitamente la versión del aviso que se muestra.");

        await using var transaccion = await db.Database.BeginTransactionAsync(ct);
        await BloquearInstitucionAsync(institucionId, ct);
        var persona = await db.Personas.IgnoreQueryFilters()
            .SingleOrDefaultAsync(p => p.Id == personaId && p.InstitucionId == institucionId, ct);
        if (persona == null || !persona.AccesoHabilitado || persona.Rol != rol || persona.DebeCambiarContrasena)
            throw new ProteccionDatosException("Debe completar el acceso autorizado antes de aceptar el aviso.", "ACCESO_RESTRINGIDO");

        var estado = await ObtenerEstadoAsync(personaId, institucionId, rol, ct);
        if (estado.Aviso == null)
            throw new ProteccionDatosException(estado.Mensaje!, "AVISO_PROTECCION_DATOS_NO_DISPONIBLE");
        if (estado.Aviso.Id != solicitud.AvisoId)
            throw new ProteccionDatosException("El aviso cambió. Lea y acepte la versión vigente para continuar.", "VERSION_AVISO_CAMBIADA");
        if (!estado.Aceptado)
        {
            var fecha = reloj.GetUtcNow().UtcDateTime;
            db.AceptacionesProteccionDatos.Add(new(institucionId, personaId, solicitud.AvisoId, fecha));
            // Proyección histórica para compatibilidad; nunca autoriza sin evidencia vigente.
            persona.AceptarTratamientoDatos(fecha);
            await db.SaveChangesAsync(ct);
            estado = estado with { Aceptado = true, FechaAceptacionUtc = fecha };
        }
        await transaccion.CommitAsync(ct);
        return estado;
    }

    public async Task PublicarAsync(PublicarAvisoRequest solicitud, CancellationToken ct = default)
    {
        if (!solicitud.AprobacionInstitucionalConfirmada)
            throw new ArgumentException("La publicación requiere la autorización explícita de la institución.");
        var institucion = new InstitucionId(solicitud.InstitucionId);
        var aviso = new AvisoProteccionDatos(institucion, solicitud.Version, solicitud.Titulo,
            solicitud.Responsable, solicitud.Contenido, solicitud.DeclaracionAceptacion,
            solicitud.FuenteOficial, solicitud.EvidenciaAprobacion, solicitud.RolesDestinatarios,
            solicitud.VigenteDesdeUtc, solicitud.VigenteHastaUtc);
        if (aviso.VigenteHastaUtc <= reloj.GetUtcNow().UtcDateTime)
            throw new ArgumentException("No se puede publicar un aviso ya vencido.");

        await using var transaccion = await db.Database.BeginTransactionAsync(ct);
        await BloquearInstitucionAsync(institucion, ct);
        if (!await db.Instituciones.AnyAsync(i => i.Id == institucion, ct))
            throw new ArgumentException("La institución del aviso no existe.");
        if (await db.AvisosProteccionDatos.IgnoreQueryFilters().AnyAsync(a => a.InstitucionId == institucion && a.Version == aviso.Version, ct))
            throw new ReglaNegocioException("La versión ya fue publicada. Para corregirla debe crear otra versión.");
        var anteriores = await db.AvisosProteccionDatos.IgnoreQueryFilters()
            .Where(a => a.InstitucionId == institucion && (a.RolesDestinatarios & aviso.RolesDestinatarios) != 0 &&
                (a.VigenteHastaUtc == null || a.VigenteHastaUtc > aviso.VigenteDesdeUtc)).ToListAsync(ct);
        foreach (var anterior in anteriores)
        {
            if (anterior.RolesDestinatarios != aviso.RolesDestinatarios || anterior.VigenteDesdeUtc >= aviso.VigenteDesdeUtc)
                throw new ReglaNegocioException("La nueva versión debe sustituir al grupo completo de destinatarios con una vigencia posterior.");
            anterior.FinalizarVigencia(aviso.VigenteDesdeUtc);
        }
        db.AvisosProteccionDatos.Add(aviso);
        await db.SaveChangesAsync(ct);
        await transaccion.CommitAsync(ct);
    }

    private async Task BloquearInstitucionAsync(InstitucionId institucionId, CancellationToken ct)
    {
        // ponytail: serializa escrituras por institución; revisar granularidad si se mide contención.
        if (db.Database.IsNpgsql())
            await db.Database.ExecuteSqlInterpolatedAsync($"SELECT id FROM instituciones WHERE id = {institucionId.Valor} FOR UPDATE", ct);
    }
}
