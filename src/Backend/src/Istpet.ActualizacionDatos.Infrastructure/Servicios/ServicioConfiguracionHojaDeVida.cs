namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Npgsql;

public sealed class ServicioConfiguracionHojaDeVida(
    AplicacionDbContext db,
    IContextoInstitucion contexto) : IServicioConfiguracionHojaDeVida
{
    private InstitucionId InstitucionActual => contexto.InstitucionId
        ?? throw new ReglaNegocioException("Se requiere una institución activa para configurar la hoja de vida.");

    // El filtro explícito también limita al superadmin a la institución seleccionada.
    private IQueryable<TipoFuncionario> TiposFuncionario => db.TiposFuncionario.Where(t => t.InstitucionId == InstitucionActual);
    private IQueryable<TipoDocumento> TiposDocumento => db.TiposDocumento.Where(t => t.InstitucionId == InstitucionActual);
    private IQueryable<RequisitoDocumento> Requisitos => db.RequisitosDocumento.Where(r => r.InstitucionId == InstitucionActual);

    public async Task<List<TipoFuncionarioDto>> ListarTiposFuncionarioAsync(CancellationToken ct = default) =>
        (await TiposFuncionario.AsNoTracking().OrderBy(t => t.Nombre).ThenBy(t => t.Codigo).ToListAsync(ct)).Select(Dto).ToList();

    public async Task<TipoFuncionarioDto> CrearTipoFuncionarioAsync(GuardarTipoFuncionarioRequest request, CancellationToken ct = default)
    {
        ValidarTipo(request.Codigo, request.Nombre);
        var codigo = request.Codigo.Trim().ToUpperInvariant();
        if (await TiposFuncionario.AnyAsync(t => t.Codigo == codigo, ct))
        {
            throw new ReglaNegocioException("El código del tipo de funcionario ya existe en la institución.");
        }
        var tipo = new TipoFuncionario(Guid.NewGuid(), InstitucionActual, codigo, request.Nombre, request.EsDocente, request.Activo);
        db.TiposFuncionario.Add(tipo);
        await GuardarAsync(ct);
        return Dto(tipo);
    }

    public async Task<TipoFuncionarioDto> ActualizarTipoFuncionarioAsync(Guid id, GuardarTipoFuncionarioRequest request, CancellationToken ct = default)
    {
        var tipo = await ObtenerTipoFuncionarioAsync(id, ct);
        ValidarTipo(request.Codigo, request.Nombre);
        ValidarCodigoEstable(tipo.Codigo, request.Codigo);
        tipo.Actualizar(request.Nombre, request.EsDocente, request.Activo);
        await GuardarAsync(ct);
        return Dto(tipo);
    }

    public async Task EliminarTipoFuncionarioAsync(Guid id, CancellationToken ct = default)
    {
        var tipo = await ObtenerTipoFuncionarioAsync(id, ct);
        tipo.Actualizar(tipo.Nombre, tipo.EsDocente, activo: false);
        await GuardarAsync(ct);
    }

    public async Task<List<TipoDocumentoDto>> ListarTiposDocumentoAsync(CancellationToken ct = default) =>
        (await TiposDocumento.AsNoTracking().OrderBy(t => t.Orden).ThenBy(t => t.Nombre).ThenBy(t => t.Codigo).ToListAsync(ct)).Select(Dto).ToList();

    public async Task<TipoDocumentoDto> CrearTipoDocumentoAsync(GuardarTipoDocumentoRequest request, CancellationToken ct = default)
    {
        ValidarTipo(request.Codigo, request.Nombre, request.Descripcion);
        var codigo = request.Codigo.Trim().ToUpperInvariant();
        if (await TiposDocumento.AnyAsync(t => t.Codigo == codigo, ct))
        {
            throw new ReglaNegocioException("El código del tipo de documento ya existe en la institución.");
        }
        var tipo = new TipoDocumento(Guid.NewGuid(), InstitucionActual, codigo, request.Nombre, request.Descripcion, request.TieneVencimiento, request.Orden, request.Activo);
        db.TiposDocumento.Add(tipo);
        await GuardarAsync(ct);
        return Dto(tipo);
    }

    public async Task<TipoDocumentoDto> ActualizarTipoDocumentoAsync(Guid id, GuardarTipoDocumentoRequest request, CancellationToken ct = default)
    {
        var tipo = await ObtenerTipoDocumentoAsync(id, ct);
        ValidarTipo(request.Codigo, request.Nombre, request.Descripcion);
        ValidarCodigoEstable(tipo.Codigo, request.Codigo);
        tipo.Actualizar(request.Nombre, request.Descripcion, request.TieneVencimiento, request.Orden, request.Activo);
        await GuardarAsync(ct);
        return Dto(tipo);
    }

    public async Task EliminarTipoDocumentoAsync(Guid id, CancellationToken ct = default)
    {
        var tipo = await ObtenerTipoDocumentoAsync(id, ct);
        tipo.Actualizar(tipo.Nombre, tipo.Descripcion, tipo.TieneVencimiento, tipo.Orden, activo: false);
        await GuardarAsync(ct);
    }

    public async Task<List<RequisitoDocumentoDto>> ListarRequisitosAsync(CancellationToken ct = default) =>
        (await Requisitos.AsNoTracking().OrderBy(r => r.Id).ToListAsync(ct)).Select(Dto).ToList();

    public async Task<RequisitoDocumentoDto> CrearRequisitoAsync(GuardarRequisitoDocumentoRequest request, CancellationToken ct = default)
    {
        await ValidarReferenciasAsync(request, ct);
        if (await Requisitos.AnyAsync(r => r.TipoDocumentoId == request.TipoDocumentoId && r.TipoFuncionarioId == request.TipoFuncionarioId, ct))
        {
            throw new ReglaNegocioException("El requisito ya existe para esa combinación de documento y funcionario.");
        }
        var requisito = new RequisitoDocumento(Guid.NewGuid(), InstitucionActual, request.TipoDocumentoId, request.TipoFuncionarioId, request.EsObligatorio, request.Activo);
        db.RequisitosDocumento.Add(requisito);
        await GuardarAsync(ct);
        return Dto(requisito);
    }

    public async Task<RequisitoDocumentoDto> ActualizarRequisitoAsync(Guid id, GuardarRequisitoDocumentoRequest request, CancellationToken ct = default)
    {
        var requisito = await ObtenerRequisitoAsync(id, ct);
        await ValidarReferenciasAsync(request, ct);
        if (requisito.TipoDocumentoId != request.TipoDocumentoId || requisito.TipoFuncionarioId != request.TipoFuncionarioId)
        {
            throw new ReglaNegocioException("La combinación del requisito es estable; desactive el requisito y cree otro para cambiarla.");
        }
        requisito.Actualizar(request.EsObligatorio, request.Activo);
        await GuardarAsync(ct);
        return Dto(requisito);
    }

    public async Task EliminarRequisitoAsync(Guid id, CancellationToken ct = default)
    {
        var requisito = await ObtenerRequisitoAsync(id, ct);
        requisito.Actualizar(requisito.EsObligatorio, activo: false);
        await GuardarAsync(ct);
    }

    public async Task AsignarTipoFuncionarioAsync(Guid personaId, AsignarTipoFuncionarioRequest request, CancellationToken ct = default)
    {
        var institucion = InstitucionActual;
        var persona = await db.Personas.SingleOrDefaultAsync(p => p.Id == personaId && p.InstitucionId == institucion, ct)
            ?? throw new RecursoNoEncontradoException("La persona no existe en la institución.");
        if (request.TipoFuncionarioId is Guid tipoId)
        {
            var tipo = await ObtenerTipoFuncionarioAsync(tipoId, ct);
            if (!tipo.Activo)
            {
                throw new ReglaNegocioException("El tipo de funcionario está inactivo.");
            }
        }
        persona.AsignarTipoFuncionario(request.TipoFuncionarioId);
        await GuardarAsync(ct);
    }

    private async Task<TipoFuncionario> ObtenerTipoFuncionarioAsync(Guid id, CancellationToken ct) =>
        await TiposFuncionario.SingleOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new RecursoNoEncontradoException("El tipo de funcionario no existe en la institución.");

    private async Task<TipoDocumento> ObtenerTipoDocumentoAsync(Guid id, CancellationToken ct) =>
        await TiposDocumento.SingleOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new RecursoNoEncontradoException("El tipo de documento no existe en la institución.");

    private async Task<RequisitoDocumento> ObtenerRequisitoAsync(Guid id, CancellationToken ct) =>
        await Requisitos.SingleOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new RecursoNoEncontradoException("El requisito no existe en la institución.");

    private async Task ValidarReferenciasAsync(GuardarRequisitoDocumentoRequest request, CancellationToken ct)
    {
        var documento = await ObtenerTipoDocumentoAsync(request.TipoDocumentoId, ct);
        if (request.Activo && !documento.Activo)
        {
            throw new ReglaNegocioException("El tipo de documento está inactivo.");
        }
        if (request.TipoFuncionarioId is Guid tipoId)
        {
            var funcionario = await ObtenerTipoFuncionarioAsync(tipoId, ct);
            if (request.Activo && !funcionario.Activo)
            {
                throw new ReglaNegocioException("El tipo de funcionario está inactivo.");
            }
        }
    }

    private async Task GuardarAsync(CancellationToken ct)
    {
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            // Los índices protegen también las altas concurrentes, incluidas las de requisitos para todos.
            throw new ReglaNegocioException("El código o la combinación del requisito ya existe en la institución.");
        }
    }

    private static void ValidarTipo(string codigo, string nombre, string? descripcion = null)
    {
        if (string.IsNullOrWhiteSpace(codigo) || codigo.Trim().Length > 50 ||
            string.IsNullOrWhiteSpace(nombre) || nombre.Trim().Length > 150 || descripcion?.Trim().Length > 500)
        {
            throw new ReglaNegocioException("Código y nombre son obligatorios (máximo 50 y 150 caracteres); la descripción admite hasta 500 caracteres.");
        }
    }

    private static void ValidarCodigoEstable(string codigoActual, string codigo)
    {
        if (!string.Equals(codigoActual, codigo.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            throw new ReglaNegocioException("El código es una clave estable y no se puede modificar.");
        }
    }

    private static TipoFuncionarioDto Dto(TipoFuncionario t) => new(t.Id, t.Codigo, t.Nombre, t.EsDocente, t.Activo);
    private static TipoDocumentoDto Dto(TipoDocumento t) => new(t.Id, t.Codigo, t.Nombre, t.Descripcion, t.TieneVencimiento, t.Orden, t.Activo);
    private static RequisitoDocumentoDto Dto(RequisitoDocumento r) => new(r.Id, r.TipoDocumentoId, r.TipoFuncionarioId, r.EsObligatorio, r.Activo);
}
