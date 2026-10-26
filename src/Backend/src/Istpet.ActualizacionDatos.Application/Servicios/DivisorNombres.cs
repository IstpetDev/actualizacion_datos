namespace Istpet.ActualizacionDatos.Application.Servicios;

using System.Text;
using Istpet.ActualizacionDatos.Application.Modelos;

/// <summary>
/// Servicio de dominio de aplicación para dividir cadenas de «apellidos y nombres»
/// en sus componentes individuales de acuerdo con las especificaciones de ADR-0012.
/// </summary>
public static class DivisorNombres
{
    private static readonly HashSet<string> Particulas = new(StringComparer.OrdinalIgnoreCase)
    {
        "de", "del", "la", "las", "los", "y", "san", "santa", "da", "di", "van", "von"
    };

    /// <summary>
    /// Divide un texto con formato «apellidos y nombres» en cuatro campos estructurados.
    /// Preserva la grafía original (mayúsculas/minúsculas y tildes).
    /// </summary>
    public static NombresDivididos Dividir(string? textoCompleto)
    {
        if (string.IsNullOrWhiteSpace(textoCompleto))
        {
            return new NombresDivididos(null, null, null, null, RequiereConfirmacion: true);
        }

        var tokens = textoCompleto
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        if (tokens.Length == 0)
        {
            return new NombresDivididos(null, null, null, null, RequiereConfirmacion: true);
        }

        var palabras = new List<string>();
        var bufferParticula = new StringBuilder();
        var huboParticulas = false;

        for (var i = 0; i < tokens.Length; i++)
        {
            var token = tokens[i];
            var esParticula = Particulas.Contains(token);

            // Si es partícula y no es el último token del texto, se agrupa con lo que sigue
            if (esParticula && i < tokens.Length - 1)
            {
                huboParticulas = true;
                bufferParticula.Append(token).Append(' ');
            }
            else
            {
                if (bufferParticula.Length > 0)
                {
                    bufferParticula.Append(token);
                    palabras.Add(bufferParticula.ToString());
                    bufferParticula.Clear();
                }
                else
                {
                    palabras.Add(token);
                }
            }
        }

        // Si quedó alguna partícula suelta al final
        if (bufferParticula.Length > 0)
        {
            palabras.Add(bufferParticula.ToString().TrimEnd());
        }

        return palabras.Count switch
        {
            0 => new NombresDivididos(null, null, null, null, RequiereConfirmacion: true),
            1 => new NombresDivididos(palabras[0], null, null, null, RequiereConfirmacion: true),
            2 => new NombresDivididos(palabras[0], null, palabras[1], null, RequiereConfirmacion: true),
            3 => new NombresDivididos(palabras[0], palabras[1], palabras[2], null, RequiereConfirmacion: true),
            4 => new NombresDivididos(palabras[0], palabras[1], palabras[2], palabras[3], RequiereConfirmacion: huboParticulas),
            _ => new NombresDivididos(
                palabras[0],
                palabras[1],
                palabras[2],
                string.Join(" ", palabras.Skip(3)),
                RequiereConfirmacion: true)
        };
    }
}
