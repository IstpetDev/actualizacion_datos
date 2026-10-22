namespace Istpet.ActualizacionDatos.Domain.HojaDeVida;

// ADR-0013, decisión 1: estado de la cuenta frente a la nómina.
public enum EstadoCuentaBancaria
{
    /// <summary>Precargada desde la nómina; la persona aún no la confirma ni la corrige.</summary>
    SinConfirmar = 1,

    /// <summary>La versión de la persona es igual a la de la nómina.</summary>
    Coincide = 2,

    /// <summary>La persona registró un número distinto al de la nómina.</summary>
    Difiere = 3,

    /// <summary>
    /// La registró la persona y no hay número de nómina con qué compararla. La nómina real que entrega
    /// la institución no trae columnas bancarias (revisión del 2026-10-22), así que es el caso más común.
    /// </summary>
    SinNomina = 4
}

/// <summary>
/// Número ya protegido por la capa de aplicación (ADR-0013, decisión 3): el dominio nunca ve el número
/// en claro. Huella es el HMAC del número, con el que se compara contra la nómina sin guardar dos copias.
/// </summary>
public sealed record NumeroCuentaProtegido(string Cifrado, string UltimosDigitos, string Huella);

public sealed record DatosCuentaBancaria(
    int TipoCuentaId,
    int? BancoId,
    string? NombreBancoOtro,
    NumeroCuentaProtegido Numero);

// ADR-0013: una cuenta por persona, con institucion_id (ADR-0004).
public class CuentaBancaria : EntidadInstitucional
{
    public Guid Id { get; private set; }
    public Guid PersonaId { get; private set; }
    public int TipoCuentaId { get; private set; }
    public int? BancoId { get; private set; }
    public string? NombreBancoOtro { get; private set; }

    public string NumeroCifrado { get; private set; }
    public string UltimosDigitos { get; private set; }
    public string HuellaNumero { get; private set; }

    /// <summary>HMAC del número que trajo la nómina; nulo si no vino de la nómina.</summary>
    public string? HuellaNomina { get; private set; }

    public EstadoCuentaBancaria Estado { get; private set; }
    public DateTime FechaActualizacionUtc { get; private set; }

    private CuentaBancaria()
    {
        NumeroCifrado = null!;
        UltimosDigitos = null!;
        HuellaNumero = null!;
    }

    private CuentaBancaria(Guid id, InstitucionId institucionId, Guid personaId, DatosCuentaBancaria datos, DateTime fechaUtc)
        : base(institucionId)
    {
        if (personaId == Guid.Empty)
        {
            throw new ArgumentException("La persona es obligatoria.", nameof(personaId));
        }

        Id = id;
        PersonaId = personaId;
        NumeroCifrado = null!;
        UltimosDigitos = null!;
        HuellaNumero = null!;
        Aplicar(datos);
        FechaActualizacionUtc = fechaUtc;
    }

    /// <summary>ADR-0013, decisión 7: la cuenta de la nómina entra como propuesta, «sin confirmar».</summary>
    public static CuentaBancaria DesdeNomina(Guid id, InstitucionId institucionId, Guid personaId, DatosCuentaBancaria datos, DateTime fechaUtc) =>
        new(id, institucionId, personaId, datos, fechaUtc)
        {
            HuellaNomina = datos.Numero.Huella,
            Estado = EstadoCuentaBancaria.SinConfirmar
        };

    /// <summary>La persona registra su cuenta y no hay nómina con qué compararla.</summary>
    public static CuentaBancaria RegistradaPorPersona(Guid id, InstitucionId institucionId, Guid personaId, DatosCuentaBancaria datos, DateTime fechaUtc) =>
        new(id, institucionId, personaId, datos, fechaUtc)
        {
            Estado = EstadoCuentaBancaria.SinNomina
        };

    /// <summary>La persona confirma, sin cambios, la cuenta precargada desde la nómina.</summary>
    public void ConfirmarPropuesta(DateTime fechaUtc)
    {
        if (Estado != EstadoCuentaBancaria.SinConfirmar)
        {
            throw new ReglaNegocioException("Solo se puede confirmar una cuenta precargada desde la nómina que aún no se ha confirmado.");
        }

        Estado = EstadoCuentaBancaria.Coincide;
        FechaActualizacionUtc = fechaUtc;
    }

    /// <summary>
    /// La persona escribe su cuenta. Si hay huella de nómina, se compara: igual → «coincide»; distinta → «difiere».
    /// La huella de la nómina se conserva para poder seguir comparando; el número de la nómina no.
    /// </summary>
    public void Corregir(DatosCuentaBancaria datos, DateTime fechaUtc)
    {
        Aplicar(datos);
        Estado = HuellaNomina is null
            ? EstadoCuentaBancaria.SinNomina
            : string.Equals(HuellaNomina, HuellaNumero, StringComparison.Ordinal)
                ? EstadoCuentaBancaria.Coincide
                : EstadoCuentaBancaria.Difiere;
        FechaActualizacionUtc = fechaUtc;
    }

    /// <summary>Lo que se muestra fuera de la pantalla del dueño (ADR-0013, decisiones 4 y 5).</summary>
    public string NumeroEnmascarado => "******" + UltimosDigitos;

    private void Aplicar(DatosCuentaBancaria datos)
    {
        ArgumentNullException.ThrowIfNull(datos);
        ArgumentNullException.ThrowIfNull(datos.Numero);

        if (datos.TipoCuentaId <= 0)
        {
            throw new ReglaNegocioException("El tipo de cuenta es obligatorio.");
        }

        var otro = string.IsNullOrWhiteSpace(datos.NombreBancoOtro) ? null : datos.NombreBancoOtro.Trim();
        if (datos.BancoId is null && otro is null)
        {
            throw new ReglaNegocioException("Indique el banco: elíjalo de la lista o escriba su nombre si no está.");
        }

        if (datos.BancoId is not null && otro is not null)
        {
            throw new ReglaNegocioException("Indique el banco de la lista o escriba otro nombre, no ambos.");
        }

        if (string.IsNullOrWhiteSpace(datos.Numero.Cifrado) || string.IsNullOrWhiteSpace(datos.Numero.Huella))
        {
            throw new ArgumentException("El número debe llegar protegido (cifrado y huella).", nameof(datos));
        }

        if (datos.Numero.UltimosDigitos.Length != 4 || !datos.Numero.UltimosDigitos.All(char.IsAsciiDigit))
        {
            throw new ArgumentException("Los últimos dígitos deben ser exactamente cuatro números.", nameof(datos));
        }

        TipoCuentaId = datos.TipoCuentaId;
        BancoId = datos.BancoId;
        NombreBancoOtro = otro;
        NumeroCifrado = datos.Numero.Cifrado;
        UltimosDigitos = datos.Numero.UltimosDigitos;
        HuellaNumero = datos.Numero.Huella;
    }
}
