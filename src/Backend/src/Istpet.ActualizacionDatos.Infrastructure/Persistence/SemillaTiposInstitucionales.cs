namespace Istpet.ActualizacionDatos.Infrastructure.Persistence;

using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Microsoft.EntityFrameworkCore;

// ADR-0019: solo completa códigos faltantes; nunca restaura valores personalizados.
public static class SemillaTiposInstitucionales
{
    public static async Task AgregarFaltantesAsync(AplicacionDbContext db, InstitucionId institucionId, CancellationToken ct = default)
    {
        var funcionarios = (await db.TiposFuncionario.IgnoreQueryFilters()
            .Where(t => t.InstitucionId == institucionId).Select(t => t.Codigo).ToListAsync(ct))
            .Concat(db.TiposFuncionario.Local.Where(t => t.InstitucionId == institucionId).Select(t => t.Codigo))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        foreach (var (codigo, nombre, esDocente) in new[] { ("DOCENTE", "Docente", true), ("ADMINISTRATIVO", "Administrativo", false) })
        {
            if (funcionarios.Add(codigo))
            {
                db.TiposFuncionario.Add(new TipoFuncionario(Guid.NewGuid(), institucionId, codigo, nombre, esDocente));
            }
        }

        var documentos = (await db.TiposDocumento.IgnoreQueryFilters()
            .Where(t => t.InstitucionId == institucionId).Select(t => t.Codigo).ToListAsync(ct))
            .Concat(db.TiposDocumento.Local.Where(t => t.InstitucionId == institucionId).Select(t => t.Codigo))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        (string Codigo, string Nombre, string Instruccion, bool Vencimiento)[] tipos =
        [
            ("CEDULA", "Cédula", "Adjunte una copia legible de ambos lados de su cédula.", true),
            ("PAPELETA_VOTACION", "Papeleta de votación", "Adjunte una copia legible de su papeleta de votación.", false),
            ("ANTECEDENTES_PENALES", "Certificado de antecedentes penales", "Adjunte su certificado de antecedentes penales.", false),
            ("DECLARACION_JURAMENTADA", "Declaración juramentada", "Adjunte su declaración juramentada notariada.", false),
            ("MECANIZADO_IESS", "Mecanizado del IESS", "Adjunte el mecanizado del IESS correspondiente a su historia laboral.", false),
            ("CERTIFICADO_MEDICO", "Certificado médico", "Adjunte su certificado médico e indique su fecha de vencimiento.", true)
        ];
        for (var indice = 0; indice < tipos.Length; indice++)
        {
            var tipo = tipos[indice];
            if (documentos.Add(tipo.Codigo))
            {
                db.TiposDocumento.Add(new TipoDocumento(Guid.NewGuid(), institucionId, tipo.Codigo, tipo.Nombre,
                    tipo.Instruccion, tipo.Vencimiento, indice + 1));
            }
        }
    }
}
