namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Application.Validacion;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

// RF-HDV-025 a 027, ADR-0013. Toda consulta pasa por el filtro de institución (ADR-0004):
// una persona de otra institución no se encuentra (404).
public class ServicioCuentaBancaria : IServicioCuentaBancaria
{
    private readonly AplicacionDbContext _context;
    private readonly IProtectorCuentaBancaria _protector;
    private readonly IServicioCampanas _servicioCampanas;

    public ServicioCuentaBancaria(
        AplicacionDbContext context,
        IProtectorCuentaBancaria protector,
        IServicioCampanas servicioCampanas)
    {
        _context = context;
        _protector = protector;
        _servicioCampanas = servicioCampanas;
    }

    public async Task<CuentaBancariaDto?> ObtenerMiaAsync(string documento, CancellationToken ct = default)
    {
        var persona = await PersonaAsync(documento, ct);
        var cuenta = await CuentaDeAsync(persona.Id, ct);
        return cuenta == null ? null : await ADtoAsync(cuenta, ct);
    }

    public async Task<NumeroCuentaCompletoDto> LeerMiNumeroAsync(string documento, CancellationToken ct = default)
    {
        AsegurarDisponible();
        var persona = await PersonaAsync(documento, ct);
        var cuenta = await CuentaDeAsync(persona.Id, ct)
            ?? throw new RecursoNoEncontradoException("No tiene una cuenta bancaria registrada.");

        var numero = _protector.Descifrar(cuenta.NumeroCifrado);

        // ADR-0013 dec. 6: cada lectura del número completo queda registrada, sin el número.
        Auditar(persona.Documento, "LeerNumeroCuentaBancaria", persona.InstitucionId,
            $"Lectura del número completo de la cuenta terminada en {cuenta.UltimosDigitos} por su dueño.");
        await _context.SaveChangesAsync(ct);

        return new NumeroCuentaCompletoDto(numero);
    }

    public async Task<CuentaBancariaDto> GuardarMiaAsync(string documento, GuardarCuentaBancariaRequest request, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        AsegurarDisponible();
        var persona = await PersonaEditableAsync(documento, ct);

        ValidacionHojaDeVida.Validar(request, "cuenta", ValidacionHojaDeVida.Politica(Guid.Empty, []));
        var numero = NumeroCuentaBancaria.Normalizar(request.Numero);
        await AsegurarCatalogosAsync(request.TipoCuentaId, request.BancoId, ct);
        var datos = new DatosCuentaBancaria(request.TipoCuentaId, request.BancoId, request.NombreBancoOtro, _protector.Proteger(numero));
        var ahora = DateTime.UtcNow;

        var cuenta = await CuentaDeAsync(persona.Id, ct);
        if (cuenta == null)
        {
            cuenta = CuentaBancaria.RegistradaPorPersona(Guid.NewGuid(), persona.InstitucionId, persona.Id, datos, ahora);
            _context.CuentasBancarias.Add(cuenta);
        }
        else
        {
            cuenta.Corregir(datos, ahora);
        }

        Auditar(persona.Documento, "GuardarCuentaBancaria", persona.InstitucionId,
            $"Cuenta terminada en {cuenta.UltimosDigitos}; estado {Texto(cuenta.Estado)}.");
        await _context.SaveChangesAsync(ct);

        return await ADtoAsync(cuenta, ct);
    }

    public async Task<CuentaBancariaDto> ConfirmarMiaAsync(string documento, CancellationToken ct = default)
    {
        var persona = await PersonaEditableAsync(documento, ct);
        var cuenta = await CuentaDeAsync(persona.Id, ct)
            ?? throw new RecursoNoEncontradoException("No tiene una cuenta bancaria para confirmar.");

        cuenta.ConfirmarPropuesta(DateTime.UtcNow);

        Auditar(persona.Documento, "ConfirmarCuentaBancaria", persona.InstitucionId,
            $"Cuenta de la nómina terminada en {cuenta.UltimosDigitos} confirmada por su dueño.");
        await _context.SaveChangesAsync(ct);

        return await ADtoAsync(cuenta, ct);
    }

    public async Task<CuentaBancariaDto?> ObtenerParaRevisionAsync(string documento, CancellationToken ct = default)
    {
        var persona = await PersonaAsync(documento, ct);
        var cuenta = await CuentaDeAsync(persona.Id, ct);
        return cuenta == null ? null : await ADtoAsync(cuenta, ct);
    }

    public async Task<List<EstadoCuentaPersonaDto>> ListarEstadosAsync(CancellationToken ct = default)
    {
        var personas = await _context.Personas
            .Where(p => p.Rol == RolUsuario.Usuario)
            .OrderBy(p => p.Nombre)
            .ThenBy(p => p.Documento)
            .Select(p => new { p.Id, p.Documento, p.Nombre })
            .ToListAsync(ct);

        var cuentas = await _context.CuentasBancarias.ToDictionaryAsync(c => c.PersonaId, ct);
        var nombres = await NombresCatalogoAsync(cuentas.Values, ct);

        return personas.Select(p => cuentas.TryGetValue(p.Id, out var c)
                ? new EstadoCuentaPersonaDto(p.Id, p.Documento, p.Nombre, Texto(c.Estado), NombreBanco(c, nombres), nombres.GetValueOrDefault(c.TipoCuentaId), c.UltimosDigitos)
                : new EstadoCuentaPersonaDto(p.Id, p.Documento, p.Nombre, "sin-registrar", null, null, null))
            .ToList();
    }

    public async Task<bool> RegistrarPropuestaNominaAsync(Guid personaId, CuentaNominaPropuesta propuesta, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(propuesta);
        AsegurarDisponible();

        var persona = await _context.Personas.FirstOrDefaultAsync(p => p.Id == personaId, ct)
            ?? throw new RecursoNoEncontradoException("La persona no existe en la institución.");

        if (await _context.CuentasBancarias.AnyAsync(c => c.PersonaId == persona.Id, ct))
        {
            return false;
        }

        ValidacionHojaDeVida.Validar(propuesta, "cuenta", ValidacionHojaDeVida.Politica(Guid.Empty, []));
        var numero = NumeroCuentaBancaria.Normalizar(propuesta.Numero);
        await AsegurarCatalogosAsync(propuesta.TipoCuentaId, propuesta.BancoId, ct);
        var datos = new DatosCuentaBancaria(propuesta.TipoCuentaId, propuesta.BancoId, propuesta.NombreBancoOtro, _protector.Proteger(numero));

        _context.CuentasBancarias.Add(CuentaBancaria.DesdeNomina(Guid.NewGuid(), persona.InstitucionId, persona.Id, datos, DateTime.UtcNow));
        return true; // La carga confirma con su propio SaveChanges, junto con la persona.
    }

    /// <summary>Texto estable para la API y el frontend.</summary>
    public static string Texto(EstadoCuentaBancaria estado) => estado switch
    {
        EstadoCuentaBancaria.SinConfirmar => "sin-confirmar",
        EstadoCuentaBancaria.Coincide => "coincide",
        EstadoCuentaBancaria.Difiere => "difiere",
        EstadoCuentaBancaria.SinNomina => "sin-nomina",
        _ => throw new ArgumentOutOfRangeException(nameof(estado))
    };

    private void AsegurarDisponible()
    {
        if (!_protector.EstaConfigurado)
        {
            throw new CuentaBancariaNoDisponibleException();
        }
    }

    private async Task<Persona> PersonaAsync(string documento, CancellationToken ct) =>
        await _context.Personas.FirstOrDefaultAsync(p => p.Documento == documento, ct)
        ?? throw new RecursoNoEncontradoException("La persona no existe en la institución.");

    private async Task<Persona> PersonaEditableAsync(string documento, CancellationToken ct)
    {
        if (await _servicioCampanas.ObtenerCampanaActivaAsync(ct) == null)
        {
            throw new ReglaNegocioException("No se permite modificar la cuenta bancaria fuera del período de una campaña abierta.");
        }

        var persona = await PersonaAsync(documento, ct);
        persona.AsegurarEdicionPermitida();
        return persona;
    }

    private Task<CuentaBancaria?> CuentaDeAsync(Guid personaId, CancellationToken ct) =>
        _context.CuentasBancarias.FirstOrDefaultAsync(c => c.PersonaId == personaId, ct);

    private async Task AsegurarCatalogosAsync(int tipoCuentaId, int? bancoId, CancellationToken ct)
    {
        if (!await _context.ElementosCatalogo.AnyAsync(e => e.Id == tipoCuentaId && e.Tipo == TipoCatalogo.TipoCuentaBancaria && e.Activo, ct))
        {
            throw new ReglaNegocioException("El tipo de cuenta no es válido.");
        }

        if (bancoId is { } banco && !await _context.ElementosCatalogo.AnyAsync(e => e.Id == banco && e.Tipo == TipoCatalogo.Banco && e.Activo, ct))
        {
            throw new ReglaNegocioException("El banco no es válido.");
        }
    }

    private void Auditar(string actor, string accion, InstitucionId institucionId, string detalle) =>
        _context.Auditorias.Add(new Auditoria(Guid.NewGuid(), actor, accion, institucionId, DateTime.UtcNow, detalle: detalle));

    private async Task<CuentaBancariaDto> ADtoAsync(CuentaBancaria cuenta, CancellationToken ct)
    {
        var nombres = await NombresCatalogoAsync([cuenta], ct);
        return new CuentaBancariaDto(
            cuenta.Id,
            cuenta.TipoCuentaId,
            nombres.GetValueOrDefault(cuenta.TipoCuentaId),
            cuenta.BancoId,
            NombreBanco(cuenta, nombres),
            cuenta.NumeroEnmascarado,
            cuenta.UltimosDigitos,
            Texto(cuenta.Estado),
            cuenta.FechaActualizacionUtc);
    }

    private async Task<Dictionary<int, string>> NombresCatalogoAsync(IEnumerable<CuentaBancaria> cuentas, CancellationToken ct)
    {
        var ids = cuentas.SelectMany(c => c.BancoId is { } b ? new[] { c.TipoCuentaId, b } : new[] { c.TipoCuentaId }).Distinct().ToList();
        return await _context.ElementosCatalogo
            .Where(e => ids.Contains(e.Id))
            .ToDictionaryAsync(e => e.Id, e => e.Nombre, ct);
    }

    private static string NombreBanco(CuentaBancaria cuenta, Dictionary<int, string> nombres) =>
        cuenta.BancoId is { } banco ? nombres.GetValueOrDefault(banco, "Banco") : cuenta.NombreBancoOtro ?? "Banco";
}

// PD-HDV-17: la cuenta bancaria es obligatoria para enviar. Regla que ejecuta el validador de completitud (T-04).
public class ReglaCuentaBancariaObligatoria : IReglaCompletitudEnvio
{
    private readonly AplicacionDbContext _context;

    public ReglaCuentaBancariaObligatoria(AplicacionDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<FaltanteEnvioDto>> EvaluarAsync(Guid personaId, CancellationToken ct = default)
    {
        var cuenta = await _context.CuentasBancarias.FirstOrDefaultAsync(c => c.PersonaId == personaId, ct);

        if (cuenta == null)
        {
            return [new FaltanteEnvioDto("cuenta-bancaria", "cuenta-bancaria.sin-registrar", "Registre su cuenta bancaria.")];
        }

        return cuenta.Estado == EstadoCuentaBancaria.SinConfirmar
            ? [new FaltanteEnvioDto("cuenta-bancaria", "cuenta-bancaria.sin-confirmar", "Confirme o corrija la cuenta bancaria precargada desde la nómina.", cuenta.Id)]
            : [];
    }
}
