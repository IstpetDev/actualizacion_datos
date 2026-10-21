using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Infrastructure;
using Istpet.ActualizacionDatos.Infrastructure.Multitenancy;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AgregarInfraestructura(builder.Configuration);
builder.Services.AddOpenApi();

var app = builder.Build();

app.Use(async (context, next) =>
{
    var contexto = context.RequestServices.GetRequiredService<ContextoInstitucion>();

    if (context.Request.Headers.TryGetValue("X-Institucion-Id", out var instVal) &&
        Guid.TryParse(instVal, out var instGuid))
    {
        contexto.InstitucionId = new InstitucionId(instGuid);
    }

    if (context.Request.Headers.TryGetValue("X-Actor", out var actorVal))
    {
        contexto.ActorActual = actorVal.ToString();
    }

    if (context.Request.Headers.TryGetValue("X-Rol", out var rolVal) &&
        Enum.TryParse<RolUsuario>(rolVal, ignoreCase: true, out var rol))
    {
        contexto.RolActual = rol;
        if (rol == RolUsuario.Superadmin)
        {
            contexto.EsSuperadmin = true;
        }
    }

    await next();
});

var connectionString = builder.Configuration.GetConnectionString("Default");
if (!string.IsNullOrWhiteSpace(connectionString))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
    await db.Database.MigrateAsync();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapGet("/health", () => Results.Ok(new RespuestaDeSalud("ok")))
    .WithName("ObtenerSalud")
    .Produces<RespuestaDeSalud>()
    .WithTags("Salud")
    .AllowAnonymous();

// --- Endpoints Instituciones (RF-MUL-001, RF-MUL-004) ---
var instituciones = app.MapGroup("/api/instituciones").WithTags("Instituciones");

instituciones.MapPost("/", async (CrearInstitucionRequest request, IServicioInstituciones servicio, CancellationToken ct) =>
{
    try
    {
        var resultado = await servicio.CrearInstitucionAsync(request, ct);
        return Results.Created($"/api/instituciones/{resultado.Id}", resultado);
    }
    catch (ArgumentException ex)
    {
        return Results.BadRequest(new MensajeRespuesta(ex.Message));
    }
    catch (ReglaNegocioException ex)
    {
        return Results.BadRequest(new MensajeRespuesta(ex.Message));
    }
})
.WithName("CrearInstitucion")
.Produces<InstitucionDto>(StatusCodes.Status201Created)
.Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest);

instituciones.MapGet("/", async (IServicioInstituciones servicio, CancellationToken ct) =>
{
    var lista = await servicio.ListarInstitucionesAsync(ct);
    return Results.Ok(lista);
})
.WithName("ListarInstituciones")
.Produces<List<InstitucionDto>>();

instituciones.MapGet("/{id:guid}", async (Guid id, IServicioInstituciones servicio, CancellationToken ct) =>
{
    var institucion = await servicio.ObtenerInstitucionPorIdAsync(id, ct);
    return institucion != null ? Results.Ok(institucion) : Results.NotFound();
})
.WithName("ObtenerInstitucionPorId")
.Produces<InstitucionDto>()
.Produces(StatusCodes.Status404NotFound);

instituciones.MapPost("/{id:guid}/admins", async (Guid id, AsignarAdminsRequest request, IServicioInstituciones servicio, CancellationToken ct) =>
{
    try
    {
        var admins = await servicio.AsignarAdminsAsync(id, request, ct);
        return Results.Ok(admins);
    }
    catch (ReglaNegocioException ex)
    {
        return Results.BadRequest(new MensajeRespuesta(ex.Message));
    }
})
.WithName("AsignarAdmins")
.Produces<List<PersonaDto>>()
.Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest);

instituciones.MapPost("/{id:guid}/habilitar-personas", async (Guid id, HabilitarPersonasRequest request, IServicioInstituciones servicio, CancellationToken ct) =>
{
    try
    {
        var personas = await servicio.HabilitarPersonasAsync(id, request, ct);
        return Results.Ok(personas);
    }
    catch (ReglaNegocioException ex)
    {
        return Results.BadRequest(new MensajeRespuesta(ex.Message));
    }
})
.WithName("HabilitarPersonas")
.Produces<List<PersonaDto>>()
.Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest);

// --- Endpoints Personas (RF-ACC-001, PD-09) ---
var personas = app.MapGroup("/api/personas").WithTags("Personas");

personas.MapPost("/cargar", async (CargarPersonasRequest request, IServicioPersonas servicio, CancellationToken ct) =>
{
    try
    {
        var resultado = await servicio.CargarPersonasAsync(request, ct);
        return Results.Ok(resultado);
    }
    catch (ReglaNegocioException ex)
    {
        return Results.BadRequest(new MensajeRespuesta(ex.Message));
    }
})
.WithName("CargarPersonas")
.Produces<ResultadoCargaPersonasDto>()
.Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest);

personas.MapGet("/", async (IServicioPersonas servicio, CancellationToken ct) =>
{
    var lista = await servicio.ListarPersonasAsync(ct);
    return Results.Ok(lista);
})
.WithName("ListarPersonas")
.Produces<List<PersonaDto>>();

// --- Endpoints Campanas (RF-CAM-001, PD-07) ---
var campanas = app.MapGroup("/api/campanas").WithTags("Campanas");

campanas.MapPost("/", async (CrearCampanaRequest request, IServicioCampanas servicio, CancellationToken ct) =>
{
    try
    {
        var resultado = await servicio.CrearCampanaAsync(request, ct);
        return Results.Created($"/api/campanas/{resultado.Id}", resultado);
    }
    catch (ArgumentException ex)
    {
        return Results.BadRequest(new MensajeRespuesta(ex.Message));
    }
    catch (ReglaNegocioException ex)
    {
        return Results.BadRequest(new MensajeRespuesta(ex.Message));
    }
})
.WithName("CrearCampana")
.Produces<CampanaDto>(StatusCodes.Status201Created)
.Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest);

campanas.MapGet("/", async (IServicioCampanas servicio, CancellationToken ct) =>
{
    var lista = await servicio.ListarCampanasAsync(ct);
    return Results.Ok(lista);
})
.WithName("ListarCampanas")
.Produces<List<CampanaDto>>();

campanas.MapGet("/activa", async (IServicioCampanas servicio, CancellationToken ct) =>
{
    var activa = await servicio.ObtenerCampanaActivaAsync(ct);
    return activa != null ? Results.Ok(activa) : Results.NotFound();
})
.WithName("ObtenerCampanaActiva")
.Produces<CampanaDto>()
.Produces(StatusCodes.Status404NotFound);

// --- Endpoints Mis Datos (RF-CAM-002, RF-CAM-003, RF-CAM-004) ---
var misDatos = app.MapGroup("/api/mis-datos").WithTags("MisDatos");

misDatos.MapGet("/estado-edicion", async (string documento, IServicioCampanas servicio, CancellationToken ct) =>
{
    var estado = await servicio.ObtenerEstadoEdicionAsync(documento, ct);
    return Results.Ok(estado);
})
.WithName("ObtenerEstadoEdicion")
.Produces<EstadoEdicionDto>();

misDatos.MapPut("/", async (string documento, ActualizarDatosRequest request, IServicioCampanas servicio, CancellationToken ct) =>
{
    try
    {
        await servicio.ActualizarDatosUsuarioAsync(documento, request, ct);
        return Results.Ok(new MensajeRespuesta("Datos actualizados correctamente en borrador."));
    }
    catch (ReglaNegocioException ex) when (ex.Message.Contains("fuera del período", StringComparison.OrdinalIgnoreCase))
    {
        return Results.Json(new MensajeRespuesta(ex.Message), statusCode: StatusCodes.Status403Forbidden);
    }
    catch (ReglaNegocioException ex)
    {
        return Results.BadRequest(new MensajeRespuesta(ex.Message));
    }
})
.WithName("ActualizarMisDatos")
.Produces<MensajeRespuesta>()
.Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
.Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden);

misDatos.MapPost("/archivos", async (string documento, SubirArchivoRequest request, IServicioCampanas servicio, CancellationToken ct) =>
{
    try
    {
        await servicio.SubirArchivoUsuarioAsync(documento, request, ct);
        return Results.Ok(new MensajeRespuesta("Archivo subido correctamente."));
    }
    catch (ReglaNegocioException ex) when (ex.Message.Contains("fuera del período", StringComparison.OrdinalIgnoreCase))
    {
        return Results.Json(new MensajeRespuesta(ex.Message), statusCode: StatusCodes.Status403Forbidden);
    }
    catch (ReglaNegocioException ex)
    {
        return Results.BadRequest(new MensajeRespuesta(ex.Message));
    }
})
.WithName("SubirArchivoMisDatos")
.Produces<MensajeRespuesta>()
.Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
.Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden);

await app.RunAsync();

internal sealed record RespuestaDeSalud(string Estado);

public partial class Program;
