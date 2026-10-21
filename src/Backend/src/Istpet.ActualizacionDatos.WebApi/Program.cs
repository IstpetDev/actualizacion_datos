using System.Security.Claims;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Infrastructure;
using Istpet.ActualizacionDatos.Infrastructure.Multitenancy;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AgregarInfraestructura(builder.Configuration);

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "istpet_auth";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Strict;
        options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        options.SlidingExpiration = true;
        options.ExpireTimeSpan = TimeSpan.FromMinutes(30);

        options.Events.OnRedirectToLogin = ctx =>
        {
            ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = ctx =>
        {
            ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddOpenApi();

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

// Middleware: Contexto institucional a partir de headers o sesión autenticada
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

    // Si no vino por header pero el usuario está autenticado por cookie
    if (context.User.Identity?.IsAuthenticated == true)
    {
        if (string.IsNullOrWhiteSpace(contexto.ActorActual))
        {
            contexto.ActorActual = context.User.FindFirst(ClaimTypes.Name)?.Value;
        }

        if (contexto.RolActual == null)
        {
            var claimRol = context.User.FindFirst(ClaimTypes.Role)?.Value;
            if (!string.IsNullOrEmpty(claimRol) && Enum.TryParse<RolUsuario>(claimRol, ignoreCase: true, out var r))
            {
                contexto.RolActual = r;
                if (r == RolUsuario.Superadmin)
                {
                    contexto.EsSuperadmin = true;
                }
            }
        }

        if (contexto.InstitucionId == null)
        {
            var claimInst = context.User.FindFirst("institucion_id")?.Value;
            if (!string.IsNullOrEmpty(claimInst) && Guid.TryParse(claimInst, out var instG))
            {
                contexto.InstitucionId = new InstitucionId(instG);
            }
        }
    }

    await next();
});

// Middleware: Política global de cambio obligatorio de contraseña (RF-ACC-002, ADR-0007)
app.Use(async (context, next) =>
{
    if (context.User.Identity?.IsAuthenticated == true)
    {
        var debeCambiar = context.User.FindFirst("debe_cambiar_contrasena")?.Value;
        if (string.Equals(debeCambiar, "true", StringComparison.OrdinalIgnoreCase))
        {
            var ruta = context.Request.Path.Value ?? string.Empty;

            var permitida = ruta.Equals("/api/auth/cambiar-clave", StringComparison.OrdinalIgnoreCase) ||
                            ruta.Equals("/api/auth/logout", StringComparison.OrdinalIgnoreCase) ||
                            ruta.Equals("/api/auth/sesion", StringComparison.OrdinalIgnoreCase) ||
                            ruta.Equals("/health", StringComparison.OrdinalIgnoreCase) ||
                            ruta.StartsWith("/openapi", StringComparison.OrdinalIgnoreCase);

            if (!permitida)
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsJsonAsync(new MensajeRespuesta("Debe cambiar su contraseña antes de realizar cualquier otra acción."));
                return;
            }
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

// --- Endpoints Autenticación (RF-ACC-002, RF-ACC-003, RF-ACC-004, RF-ACC-005, RF-DAT-004, RF-DAT-005, ADR-0007) ---
var auth = app.MapGroup("/api/auth").WithTags("Autenticacion");

auth.MapPost("/login", async (LoginRequest request, HttpContext httpContext, IServicioAutenticacion servicio, CancellationToken ct) =>
{
    try
    {
        var resultado = await servicio.IniciarSesionAsync(request, ct);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, resultado.Id.ToString()),
            new(ClaimTypes.Name, resultado.Documento),
            new(ClaimTypes.Role, resultado.Rol),
            new("institucion_id", resultado.InstitucionId.ToString()),
            new("debe_cambiar_contrasena", resultado.DebeCambiarContrasena ? "true" : "false"),
            new("correo_verificado", resultado.CorreoVerificado ? "true" : "false")
        };

        var claimsIdentity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var authProperties = new AuthenticationProperties
        {
            IsPersistent = true,
            ExpiresUtc = DateTimeOffset.UtcNow.AddMinutes(30)
        };

        await httpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(claimsIdentity),
            authProperties);

        return Results.Ok(resultado);
    }
    catch (ReglaNegocioException ex)
    {
        return Results.Json(new MensajeRespuesta(ex.Message), statusCode: StatusCodes.Status401Unauthorized);
    }
})
.WithName("IniciarSesion")
.Produces<ResultadoLoginDto>()
.Produces<MensajeRespuesta>(StatusCodes.Status401Unauthorized)
.AllowAnonymous();

auth.MapPost("/logout", async (HttpContext httpContext) =>
{
    await httpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
    return Results.Ok(new MensajeRespuesta("Sesión cerrada correctamente."));
})
.WithName("CerrarSesion")
.Produces<MensajeRespuesta>()
.RequireAuthorization();

auth.MapGet("/sesion", async (HttpContext httpContext, IServicioAutenticacion servicio, CancellationToken ct) =>
{
    var documento = httpContext.User.FindFirst(ClaimTypes.Name)?.Value;
    if (string.IsNullOrWhiteSpace(documento))
    {
        return Results.Unauthorized();
    }

    var sesion = await servicio.ObtenerSesionActualAsync(documento, ct);
    return sesion != null ? Results.Ok(sesion) : Results.Unauthorized();
})
.WithName("ObtenerSesionActual")
.Produces<SesionUsuarioDto>()
.Produces(StatusCodes.Status401Unauthorized)
.RequireAuthorization();

auth.MapPost("/cambiar-clave", async (CambiarContrasenaRequest request, HttpContext httpContext, IServicioAutenticacion servicio, CancellationToken ct) =>
{
    var documento = httpContext.User.FindFirst(ClaimTypes.Name)?.Value;
    if (string.IsNullOrWhiteSpace(documento))
    {
        return Results.Unauthorized();
    }

    try
    {
        await servicio.CambiarContrasenaAsync(documento, request, ct);

        // Actualizar la cookie de sesión con debe_cambiar_contrasena = false
        var claims = httpContext.User.Claims
            .Where(c => c.Type != "debe_cambiar_contrasena")
            .ToList();
        claims.Add(new Claim("debe_cambiar_contrasena", "false"));

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        await httpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity));

        return Results.Ok(new MensajeRespuesta("Contraseña actualizada con éxito."));
    }
    catch (ReglaNegocioException ex)
    {
        return Results.BadRequest(new MensajeRespuesta(ex.Message));
    }
})
.WithName("CambiarContrasena")
.Produces<MensajeRespuesta>()
.Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
.Produces(StatusCodes.Status401Unauthorized)
.RequireAuthorization();

auth.MapPost("/enviar-codigo-correo", async (EnviarCodigoCorreoRequest request, HttpContext httpContext, IServicioAutenticacion servicio, CancellationToken ct) =>
{
    var documento = httpContext.User.FindFirst(ClaimTypes.Name)?.Value;
    if (string.IsNullOrWhiteSpace(documento))
    {
        return Results.Unauthorized();
    }

    try
    {
        await servicio.EnviarCodigoCorreoAsync(documento, request, ct);
        return Results.Ok(new MensajeRespuesta("Código de verificación enviado al correo especificado."));
    }
    catch (ReglaNegocioException ex)
    {
        return Results.BadRequest(new MensajeRespuesta(ex.Message));
    }
})
.WithName("EnviarCodigoCorreo")
.Produces<MensajeRespuesta>()
.Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
.Produces(StatusCodes.Status401Unauthorized)
.RequireAuthorization();

auth.MapPost("/verificar-codigo-correo", async (VerificarCodigoCorreoRequest request, HttpContext httpContext, IServicioAutenticacion servicio, CancellationToken ct) =>
{
    var documento = httpContext.User.FindFirst(ClaimTypes.Name)?.Value;
    if (string.IsNullOrWhiteSpace(documento))
    {
        return Results.Unauthorized();
    }

    try
    {
        await servicio.VerificarCodigoCorreoAsync(documento, request, ct);

        // Actualizar la cookie con correo_verificado = true
        var claims = httpContext.User.Claims
            .Where(c => c.Type != "correo_verificado")
            .ToList();
        claims.Add(new Claim("correo_verificado", "true"));

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        await httpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity));

        return Results.Ok(new MensajeRespuesta("Correo verificado exitosamente."));
    }
    catch (ReglaNegocioException ex)
    {
        return Results.BadRequest(new MensajeRespuesta(ex.Message));
    }
})
.WithName("VerificarCodigoCorreo")
.Produces<MensajeRespuesta>()
.Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
.Produces(StatusCodes.Status401Unauthorized)
.RequireAuthorization();

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
