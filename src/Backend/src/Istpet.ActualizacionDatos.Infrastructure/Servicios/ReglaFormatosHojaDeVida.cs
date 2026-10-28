namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Application.Validacion;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

public sealed class ReglaFormatosHojaDeVida(AplicacionDbContext contexto, IServicioSecciones servicioSecciones) : IReglaCompletitudEnvio
{
    public async Task<IReadOnlyList<FaltanteEnvioDto>> EvaluarAsync(Guid personaId, CancellationToken ct = default)
    {
        var persona = await contexto.Personas.SingleAsync(p => p.Id == personaId, ct);
        var institucion = await contexto.Instituciones.SingleAsync(i => i.Id == persona.InstitucionId, ct);
        var abiertas = await servicioSecciones.ObtenerSeccionesAbiertasAsync(persona.InstitucionId, ct);
        var politica = ValidacionHojaDeVida.Politica(persona.InstitucionId.Valor, institucion.ObtenerDominiosCorreo());
        var faltantes = new List<FaltanteEnvioDto>();
        void Revisar(object datos, string regla, string seccion, Guid? id = null)
        {
            foreach (var (campo, motivos) in ValidacionHojaDeVida.Evaluar(datos, regla, politica))
                faltantes.Add(new(seccion, $"formato.{campo}", $"Revise {campo}: {string.Join(" ", motivos)}", id));
        }
        if (abiertas.Contains(SeccionHojaDeVida.FichaPersonal))
        {
            var ficha = await contexto.FichasPersonales.SingleOrDefaultAsync(f => f.PersonaId == personaId, ct);
            if (ficha is not null) Revisar(ficha, "ficha", "ficha");
        }

        if (abiertas.Contains(SeccionHojaDeVida.FormacionAcademica))
        {
            foreach (var t in await contexto.TitulosAcademicos.Where(t => t.PersonaId == personaId).ToListAsync(ct)) Revisar(t, "titulo", "titulos", t.Id);
            foreach (var t in await contexto.TitulosEnCurso.Where(t => t.PersonaId == personaId).ToListAsync(ct)) Revisar(t, "tituloEnCurso", "titulos-en-curso", t.Id);
        }

        if (abiertas.Contains(SeccionHojaDeVida.Capacitaciones))
        {
            foreach (var c in await contexto.Capacitaciones.Where(t => t.PersonaId == personaId).ToListAsync(ct)) Revisar(c, "capacitacion", "capacitaciones", c.Id);
        }

        if (abiertas.Contains(SeccionHojaDeVida.ExperienciaLaboral))
        {
            foreach (var e in await contexto.ExperienciasLaborales.Where(t => t.PersonaId == personaId).ToListAsync(ct)) Revisar(e, "experiencia", "experiencias", e.Id);
        }

        if (abiertas.Contains(SeccionHojaDeVida.Referencias))
        {
            foreach (var r in await contexto.ReferenciasPersonales.Where(t => t.PersonaId == personaId).ToListAsync(ct)) Revisar(r, "referencia", "referencias", r.Id);
        }

        if (abiertas.Contains(SeccionHojaDeVida.DocumentosPersonales))
        {
            foreach (var d in await contexto.DocumentosPersonales.Where(t => t.PersonaId == personaId).ToListAsync(ct)) Revisar(d, "documento", "documentos", d.Id);
        }

        if (abiertas.Contains(SeccionHojaDeVida.CuentaBancaria))
        {
            var cuenta = await contexto.CuentasBancarias.SingleOrDefaultAsync(c => c.PersonaId == personaId, ct);
            if (cuenta is not null) Revisar(new { cuenta.NombreBancoOtro }, "cuenta", "cuenta-bancaria", cuenta.Id);
        }

        return faltantes;
    }
}
