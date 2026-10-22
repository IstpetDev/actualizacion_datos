namespace Istpet.ActualizacionDatos.Domain.HojaDeVida;

// ADR-0010, decisión 5: catálogo compartido entre instituciones (sin institucion_id).
public class ElementoCatalogo
{
    public int Id { get; private set; }
    public TipoCatalogo Tipo { get; private set; }
    public string Codigo { get; private set; }
    public string Nombre { get; private set; }
    public int? PadreId { get; private set; }

    // Identificador del mismo elemento en el sistema de talento humano de origen.
    public string? CodigoExterno { get; private set; }
    public int Orden { get; private set; }
    public bool Activo { get; private set; }

    private ElementoCatalogo()
    {
        Codigo = null!;
        Nombre = null!;
    }

    public ElementoCatalogo(
        int id,
        TipoCatalogo tipo,
        string codigo,
        string nombre,
        int? padreId = null,
        string? codigoExterno = null,
        int orden = 0,
        bool activo = true)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(codigo);
        ArgumentException.ThrowIfNullOrWhiteSpace(nombre);

        if (RequierePadre(tipo) && padreId is null)
        {
            throw new ReglaNegocioException($"Un elemento de catálogo de tipo {tipo} debe indicar su elemento padre.");
        }

        Id = id;
        Tipo = tipo;
        Codigo = codigo.Trim().ToUpperInvariant();
        Nombre = nombre.Trim();
        PadreId = padreId;
        CodigoExterno = string.IsNullOrWhiteSpace(codigoExterno) ? null : codigoExterno.Trim();
        Orden = orden;
        Activo = activo;
    }

    public void Actualizar(string nombre, int? padreId, string? codigoExterno, int orden)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(nombre);
        if (RequierePadre(Tipo) && padreId is null)
        {
            throw new ReglaNegocioException($"Un elemento de catálogo de tipo {Tipo} debe indicar su elemento padre.");
        }

        Nombre = nombre.Trim();
        PadreId = padreId;
        CodigoExterno = string.IsNullOrWhiteSpace(codigoExterno) ? null : codigoExterno.Trim();
        Orden = orden;
    }

    public void Desactivar()
    {
        Activo = false;
    }

    public void Activar()
    {
        Activo = true;
    }

    public static TipoCatalogo? TipoPadre(TipoCatalogo tipo) => tipo switch
    {
        TipoCatalogo.Provincia => TipoCatalogo.Pais,
        TipoCatalogo.Canton => TipoCatalogo.Provincia,
        TipoCatalogo.Parroquia => TipoCatalogo.Canton,
        TipoCatalogo.GradoAcademico => TipoCatalogo.NivelAcademico,
        TipoCatalogo.CampoEspecificoUnesco => TipoCatalogo.CampoAmplioUnesco,
        TipoCatalogo.CampoDetalladoUnesco => TipoCatalogo.CampoEspecificoUnesco,
        TipoCatalogo.Universidad => TipoCatalogo.Pais,
        _ => null
    };

    private static bool RequierePadre(TipoCatalogo tipo) =>
        TipoPadre(tipo) is not null && tipo != TipoCatalogo.Universidad;
}
