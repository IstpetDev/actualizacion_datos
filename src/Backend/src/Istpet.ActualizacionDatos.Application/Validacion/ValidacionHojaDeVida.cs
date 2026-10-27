namespace Istpet.ActualizacionDatos.Application.Validacion;

using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using Istpet.ActualizacionDatos.Domain;

public sealed record ReglaCampoDto(int? MaximoCaracteres = null, string? Patron = null, decimal? Minimo = null,
    decimal? Maximo = null, bool Entero = false, bool Multilinea = false, string? Tipo = null);

public sealed record PoliticaValidacionDto(Guid InstitucionId, string[] DominiosCorreoPermitidos,
    DateOnly FechaNacimientoMinima, DateOnly FechaNacimientoMaxima,
    Dictionary<string, Dictionary<string, ReglaCampoDto>> Reglas);

public sealed class ValidacionCamposException(Dictionary<string, string[]> errores)
    : ReglaNegocioException("Revise los campos indicados.")
{
    public Dictionary<string, string[]> Errores { get; } = errores;
}

// ADR-0024: una declaración de reglas alimenta API, envío y validación del cliente.
public static class ValidacionHojaDeVida
{
    public const string PatronCelular = "^09[0-9]{8}$";
    public const string PatronConvencional = "^0[2-7][0-9]{7}$";
    public const string PatronNombre = @"^(?=.*\p{L})[\p{L}\p{M} '\u2019-]+$";
    public const string PatronDominio = @"^(?=.*[A-Za-z])[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$";
    public const string PatronCorreo = @"^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9.-]+$";

    public static readonly Dictionary<string, Dictionary<string, ReglaCampoDto>> Reglas = new(StringComparer.Ordinal)
    {
        ["ficha"] = new()
        {
            ["primerNombre"] = new(100, PatronNombre),
            ["segundoNombre"] = new(100, PatronNombre),
            ["primerApellido"] = new(100, PatronNombre),
            ["segundoApellido"] = new(100, PatronNombre),
            ["fechaNacimiento"] = new(Tipo: "nacimiento"),
            ["callePrincipal"] = new(200),
            ["calleSecundaria"] = new(200),
            ["numeroCasa"] = new(20),
            ["referenciaDomicilio"] = new(300),
            ["codigoPostal"] = new(6, "^[0-9]{1,6}$"),
            ["celular"] = new(10, PatronCelular),
            ["telefonoConvencional"] = new(9, PatronConvencional),
            ["correoInstitucional"] = new(200, PatronCorreo, Tipo: "correo"),
            ["porcentajeDiscapacidad"] = new(Minimo: 0, Maximo: 100, Entero: true),
            ["numeroCarnetDiscapacidad"] = new(30)
        },
        ["titulo"] = new()
        {
            ["nombreTitulo"] = new(300),
            ["nombreInstitucionOtra"] = new(300),
            ["numeroRegistroSenescyt"] = new(50)
        },
        ["tituloEnCurso"] = new()
        {
            ["nombrePrograma"] = new(300),
            ["nombreInstitucionOtra"] = new(300),
            ["porcentajeBeca"] = new(Minimo: 0, Maximo: 100, Entero: true),
            ["montoBeca"] = new(Patron: @"^(?:0|[1-9][0-9]{0,15})(?:\.[0-9]{1,2})?$", Minimo: 0, Maximo: 9999999999999999.99m, Tipo: "monto")
        },
        ["capacitacion"] = new()
        {
            ["nombreEvento"] = new(300),
            ["institucionOrganizadora"] = new(300),
            ["lugar"] = new(200),
            ["numeroHoras"] = new(Minimo: 1, Maximo: int.MaxValue, Entero: true)
        },
        ["referencia"] = new()
        {
            ["nombresApellidos"] = new(300, PatronNombre),
            ["telefono"] = new(10, "^(?:09[0-9]{8}|0[2-7][0-9]{7})$"),
            ["titulo"] = new(200),
            ["cargoActual"] = new(200),
            ["empresa"] = new(300)
        },
        ["experiencia"] = new()
        {
            ["empleador"] = new(300),
            ["cargo"] = new(200),
            ["ciudad"] = new(150),
            ["funciones"] = new(4000, Multilinea: true)
        },
        ["documento"] = new()
        {
            ["numeroDocumento"] = new(100),
            ["entidadEmisora"] = new(150),
            ["categoriaLicencia"] = new(30),
            ["puntosLicencia"] = new(Minimo: 0, Maximo: int.MaxValue, Entero: true)
        },
        ["cuenta"] = new()
        {
            ["nombreBancoOtro"] = new(200),
            ["numero"] = new(Tipo: "cuenta")
        }
    };

    public static PoliticaValidacionDto Politica(Guid institucionId, string[] dominios, DateTimeOffset? instante = null)
    {
        var zona = TimeZoneInfo.FindSystemTimeZoneById("America/Guayaquil");
        var hoy = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(instante ?? DateTimeOffset.UtcNow, zona).DateTime);
        return new(institucionId, dominios, new DateOnly(1900, 1, 1), hoy.AddYears(-18), Reglas);
    }

    public static string? NormalizarTexto(string? valor) => valor?.Normalize(NormalizationForm.FormC).Trim(' ');

    public static bool Coincide(string valor, string patron) => Regex.IsMatch(valor, patron, RegexOptions.CultureInvariant, TimeSpan.FromSeconds(1));

    public static string[] NormalizarDominios(IEnumerable<string>? dominios)
    {
        var resultado = (dominios ?? []).Select(d => (d ?? "").Trim().ToLowerInvariant()).Select(d => d.StartsWith('@') ? d[1..] : d).Distinct(StringComparer.Ordinal).ToArray();
        if (resultado.Length > 10 || resultado.Any(d => d.Length is 0 or > 253 || !Coincide(d, PatronDominio)))
        {
            throw new ValidacionCamposException(new() { ["dominiosCorreoPermitidos"] = ["Indique hasta 10 dominios DNS válidos, sin rutas, puertos, espacios ni comodines."] });
        }
        return resultado;
    }

    public static Dictionary<string, string[]> Evaluar(object datos, string seccion, PoliticaValidacionDto politica)
    {
        var errores = new Dictionary<string, string[]>(StringComparer.Ordinal);
        var valores = datos.GetType().GetProperties().ToDictionary(p => char.ToLowerInvariant(p.Name[0]) + p.Name[1..], p => p.GetValue(datos), StringComparer.Ordinal);
        foreach (var (campo, regla) in Reglas[seccion])
        {
            if (!valores.TryGetValue(campo, out var valor) || valor is null) continue;
            var texto = valor is string cadena ? NormalizarTexto(cadena)! : Convert.ToString(valor, CultureInfo.InvariantCulture)!;
            if (valor is string original && original.Replace("\r\n", "\n", StringComparison.Ordinal).Any(c => char.IsControl(c) && !(regla.Multilinea && c == '\n')))
                errores[campo] = ["No se permiten caracteres de control."];
            else if (texto.Length == 0) continue;
            else if (regla.MaximoCaracteres.HasValue && texto.Length > regla.MaximoCaracteres)
                errores[campo] = [$"Use como máximo {regla.MaximoCaracteres} caracteres."];
            else if (regla.Patron is not null && !Coincide(texto, regla.Patron))
                errores[campo] = [MensajePatron(campo)];
            else if (regla.Minimo.HasValue && (!decimal.TryParse(texto, NumberStyles.Number, CultureInfo.InvariantCulture, out var numero) || numero < regla.Minimo || numero > regla.Maximo || (regla.Entero && decimal.Truncate(numero) != numero)))
                errores[campo] = [regla.Entero ? $"Indique un número entero entre {regla.Minimo} y {regla.Maximo}." : "Indique un monto no negativo con hasta 16 enteros y 2 decimales."];
            else if (regla.Tipo == "nacimiento" && valor is DateOnly fecha && (fecha < politica.FechaNacimientoMinima || fecha > politica.FechaNacimientoMaxima))
                errores[campo] = ["La fecha debe ser desde 1900 y corresponder a una persona con 18 años cumplidos."];
            else if (regla.Tipo == "correo")
            {
                var partes = texto.Split('@');
                if (partes.Length != 2 || partes[0].Length > 64 || !Coincide(partes[1], PatronDominio))
                    errores[campo] = ["Indique un correo válido con una sola @."];
                else if (politica.DominiosCorreoPermitidos.Length > 0 && !politica.DominiosCorreoPermitidos.Contains(partes[1], StringComparer.OrdinalIgnoreCase))
                    errores[campo] = [$"Use su correo {string.Join(" o ", politica.DominiosCorreoPermitidos.Select(d => "@" + d))}."];
            }
            else if (regla.Tipo == "cuenta")
            {
                var limpio = texto.Replace(" ", "", StringComparison.Ordinal).Replace("-", "", StringComparison.Ordinal);
                if (limpio.Length is < 6 or > 20 || !limpio.All(char.IsAsciiDigit)) errores[campo] = ["Indique entre 6 y 20 dígitos; se permiten espacios y guiones."];
            }
        }
        void Error(string campo, string motivo) => errores[campo] = [motivo];
        DateOnly? Fecha(string campo) => valores.GetValueOrDefault(campo) as DateOnly?;
        if (seccion == "titulo" && Fecha("fechaObtencion") is { } obtencion && Fecha("fechaRegistroSenescyt") < obtencion)
            Error("fechaRegistroSenescyt", "El registro no puede ser anterior a la obtención del título.");
        if (seccion is "capacitacion" or "experiencia" or "tituloEnCurso")
        {
            var fin = seccion == "tituloEnCurso" ? "fechaFinEstimada" : "fechaFin";
            if (Fecha("fechaInicio") is { } inicio && Fecha(fin) < inicio) Error(fin, "La fecha de fin no puede ser anterior al inicio.");
        }
        if (seccion == "documento" && Fecha("fechaEmision") is { } emision && Fecha("fechaVencimiento") < emision)
            Error("fechaVencimiento", "La fecha de vencimiento no puede ser anterior a la fecha de emisión.");
        if (seccion == "experiencia")
        {
            var actual = valores.GetValueOrDefault("trabajaActualmente") is true;
            if (actual && Fecha("fechaFin").HasValue) Error("fechaFin", "Si trabaja actualmente, deje vacía la fecha de fin.");
            if (!actual && !Fecha("fechaFin").HasValue) Error("fechaFin", "Indique fecha de fin o marque que trabaja actualmente.");
        }
        return errores;
    }

    public static void Validar(object datos, string seccion, PoliticaValidacionDto politica)
    {
        var errores = Evaluar(datos, seccion, politica);
        if (errores.Count > 0) throw new ValidacionCamposException(errores);
    }

    private static string MensajePatron(string campo) => campo switch
    {
        "celular" => "Use 10 dígitos que empiecen con 09.",
        "telefonoConvencional" => "Use 9 dígitos con prefijo del 02 al 07.",
        "telefono" => "Indique un celular de 10 dígitos con 09 o un convencional de 9 con prefijo del 02 al 07.",
        "codigoPostal" => "Use solamente entre 1 y 6 dígitos.",
        "correoInstitucional" => "Indique un correo válido con una sola @.",
        "montoBeca" => "Indique un monto no negativo con hasta 16 enteros y 2 decimales.",
        _ => "Use letras, espacios, tildes, apóstrofe o guion, sin números ni otros símbolos."
    };
}
