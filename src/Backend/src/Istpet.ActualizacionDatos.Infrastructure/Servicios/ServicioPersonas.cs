namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

public class ServicioPersonas : IServicioPersonas
{
    private readonly AplicacionDbContext _context;
    private readonly IContextoInstitucion _contextoInstitucion;

    public ServicioPersonas(
        AplicacionDbContext context,
        IContextoInstitucion contextoInstitucion)
    {
        _context = context;
        _contextoInstitucion = contextoInstitucion;
    }

    public async Task<ResultadoCargaPersonasDto> CargarPersonasAsync(CargarPersonasRequest request, CancellationToken ct = default)
    {
        var institucionId = _contextoInstitucion.InstitucionId
            ?? throw new ReglaNegocioException("Se requiere una institución activa para cargar la lista de personas.");

        var totalRecibidos = request.Personas.Count;
        var documentosVistos = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var cargados = new List<string>();
        var totalDuplicados = 0;

        // Cargar documentos existentes en la institución actual
        var existentesEnInstitucion = await _context.Personas
            .Select(p => p.Documento)
            .ToListAsync(ct);

        var setExistentes = new HashSet<string>(existentesEnInstitucion, StringComparer.OrdinalIgnoreCase);

        foreach (var item in request.Personas)
        {
            if (string.IsNullOrWhiteSpace(item.Documento))
            {
                continue;
            }

            var doc = item.Documento.Trim();

            // PD-09: Deduplicación en la ingesta
            if (!documentosVistos.Add(doc) || setExistentes.Contains(doc))
            {
                totalDuplicados++;
                continue;
            }

            var nuevaPersona = new Persona(
                Guid.NewGuid(),
                institucionId,
                doc,
                RolUsuario.Usuario,
                item.Nombre,
                item.Correo,
                accesoHabilitado: false, // RF-MUL-002: Espera habilitación del superadmin
                estadoActualizacion: EstadoActualizacion.Borrador);

            _context.Personas.Add(nuevaPersona);
            setExistentes.Add(doc);
            cargados.Add(doc);
        }

        await _context.SaveChangesAsync(ct);

        return new ResultadoCargaPersonasDto(
            totalRecibidos,
            cargados.Count,
            totalDuplicados,
            cargados);
    }

    public async Task<List<PersonaDto>> ListarPersonasAsync(CancellationToken ct = default)
    {
        var personas = await _context.Personas
            .OrderBy(p => p.Documento)
            .ToListAsync(ct);

        return personas.Select(p => new PersonaDto(
            p.Id,
            p.InstitucionId.Valor,
            p.Documento,
            p.Nombre,
            p.Correo,
            p.Rol.ToString(),
            p.AccesoHabilitado,
            p.EstadoActualizacion.ToString(),
            p.FechaCreacionUtc)).ToList();
    }
}
