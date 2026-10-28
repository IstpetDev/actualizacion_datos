using System.Diagnostics;
using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure;
using Istpet.ActualizacionDatos.Infrastructure.Multitenancy;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Istpet.ActualizacionDatos.WebApi.Endpoints;
using Istpet.ActualizacionDatos.WebApi.Middleware;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AgregarInfraestructura(builder.Configuration);

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "istpet_auth";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Strict;
        var configuracionSecure = builder.Configuration.GetValue<string>("Autenticacion:CookieSecurePolicy");
        options.Cookie.SecurePolicy = configuracionSecure switch
        {
            "Always" => CookieSecurePolicy.Always,
            "SameAsRequest" => CookieSecurePolicy.SameAsRequest,
            "None" => CookieSecurePolicy.None,
            _ => builder.Environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always
        };
        options.SlidingExpiration = true;
        options.ExpireTimeSpan = TimeSpan.FromMinutes(30);

        options.Events.OnValidatePrincipal = async ctx =>
        {
            var idStr = ctx.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var institucionStr = ctx.Principal?.FindFirst("institucion_id")?.Value;
            if (Guid.TryParse(idStr, out var personaId) && Guid.TryParse(institucionStr, out var institucionId))
            {
                var db = ctx.HttpContext.RequestServices.GetService<AplicacionDbContext>();
                if (db != null)
                {
                    var persona = await db.Personas.IgnoreQueryFilters()
                        .Where(p => p.Id == personaId && p.InstitucionId == new InstitucionId(institucionId))
                        .Select(p => new { p.AccesoHabilitado, p.Rol, p.DebeCambiarContrasena })
                        .FirstOrDefaultAsync();

                    if (persona == null || !persona.AccesoHabilitado)
                    {
                        ctx.RejectPrincipal();
                        await ctx.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
                    }
                    else
                    {
                        var claims = ctx.Principal!.Claims.Where(c => c.Type != ClaimTypes.Role && c.Type != "debe_cambiar_contrasena").ToList();
                        claims.Add(new(ClaimTypes.Role, persona.Rol.ToString()));
                        claims.Add(new("debe_cambiar_contrasena", persona.DebeCambiarContrasena ? "true" : "false"));
                        ctx.ReplacePrincipal(new ClaimsPrincipal(new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme)));
                    }
                }
            }
        };

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
builder.Services.AddOpenApi(options =>
{
    options.AddOperationTransformer((operation, context, cancellationToken) =>
    {
        if (operation.OperationId is "DescargarArchivo" or "DescargarDocumentoHojaDeVidaPersona" or "DescargarMiDocumentoHojaDeVida" or "ExportarZip" or "ExportarExcel")
        {
            if (operation.Responses != null && operation.Responses.TryGetValue("200", out var res200))
            {
                var contentType = operation.OperationId switch
                {
                    "ExportarZip" => "application/zip",
                    "ExportarExcel" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "DescargarDocumentoHojaDeVidaPersona" or "DescargarMiDocumentoHojaDeVida" => "application/pdf",
                    _ => "application/octet-stream"
                };

                if (res200 is OpenApiResponse resp)
                {
                    resp.Content ??= new Dictionary<string, OpenApiMediaType>();
                    resp.Content[contentType] = new OpenApiMediaType
                    {
                        Schema = new OpenApiSchema
                        {
                            Type = JsonSchemaType.String,
                            Format = "binary"
                        }
                    };
                }
                else if (res200.Content != null)
                {
                    res200.Content[contentType] = new OpenApiMediaType
                    {
                        Schema = new OpenApiSchema
                        {
                            Type = JsonSchemaType.String,
                            Format = "binary"
                        }
                    };
                }
            }
        }
        return Task.CompletedTask;
    });
});
builder.Services.Configure<RouteHandlerOptions>(opciones => opciones.ThrowOnBadRequest = true);
builder.Services.AddExceptionHandler<Istpet.ActualizacionDatos.WebApi.ValidacionJsonHandler>();
builder.Services.AddExceptionHandler<ManejadorGlobalExcepciones>();
builder.Services.AddProblemDetails();

var app = builder.Build();

app.UseForwardedHeaders();
app.UseExceptionHandler();
app.UseStatusCodePages(async statusCodeContext =>
{
    var httpContext = statusCodeContext.HttpContext;
    if (httpContext.Response.HasStarted || !string.IsNullOrEmpty(httpContext.Response.ContentType))
    {
        return;
    }

    var code = httpContext.Response.StatusCode;
    var mensaje = code switch
    {
        StatusCodes.Status401Unauthorized => "Debe iniciar sesión para acceder a este recurso.",
        StatusCodes.Status403Forbidden => "No tiene permisos para realizar esta operación.",
        StatusCodes.Status404NotFound => "El recurso solicitado no fue encontrado.",
        StatusCodes.Status405MethodNotAllowed => "El método HTTP no está permitido para esta ruta.",
        StatusCodes.Status415UnsupportedMediaType => "El tipo de medio no es soportado.",
        _ => $"La petición respondió con código de estado {code}."
    };

    httpContext.Response.ContentType = "application/json";
    var traceId = Activity.Current?.Id ?? httpContext.TraceIdentifier;
    await httpContext.Response.WriteAsJsonAsync(new MensajeRespuesta(mensaje, $"HTTP_{code}", null, traceId));
});
app.UseAuthentication();
app.UseAuthorization();

// La cookie autenticada es la autoridad. Solo Superadmin puede seleccionar otra institución mediante X-Institucion-Id (ADR-0034).
app.Use(async (context, next) =>
{
    var contexto = context.RequestServices.GetRequiredService<ContextoInstitucion>();
    if (context.User.Identity?.IsAuthenticated == true)
    {
        var actor = context.User.FindFirst(ClaimTypes.Name)?.Value;
        var rolTexto = context.User.FindFirst(ClaimTypes.Role)?.Value;
        var institucion = context.User.FindFirst("institucion_id")?.Value;
        var tieneRol = Enum.TryParse<RolUsuario>(rolTexto, out var rol);
        var esSuperadmin = tieneRol && rol == RolUsuario.Superadmin;
        var esRutaAuth = context.Request.Path.Equals("/api/auth/login", StringComparison.OrdinalIgnoreCase) ||
                         context.Request.Path.Equals("/api/auth/logout", StringComparison.OrdinalIgnoreCase);

        if (!esRutaAuth)
        {
            var cabecerasIdentidad = new[] { ("X-Actor", actor), ("X-Rol", rolTexto) };
            var identidadContradictoria = cabecerasIdentidad.Any(c =>
                context.Request.Headers.TryGetValue(c.Item1, out var valor) &&
                !string.Equals(valor.ToString(), c.Item2, StringComparison.OrdinalIgnoreCase));
            var institucionContradictoria = !esSuperadmin &&
                context.Request.Headers.TryGetValue("X-Institucion-Id", out var instValor) &&
                !string.Equals(instValor.ToString(), institucion, StringComparison.OrdinalIgnoreCase);

            if (identidadContradictoria || institucionContradictoria)
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                await context.Response.WriteAsJsonAsync(new MensajeRespuesta("El contexto solicitado no corresponde a la sesión autenticada.", "CONTEXTO_NO_AUTORIZADO"));
                return;
            }

            if (esSuperadmin && context.Request.Headers.TryGetValue("X-Institucion-Id", out var instSuperadmin) &&
                !string.IsNullOrWhiteSpace(instSuperadmin))
            {
                if (!Guid.TryParse(instSuperadmin.ToString(), out var instSeleccionada))
                {
                    context.Response.StatusCode = StatusCodes.Status400BadRequest;
                    await context.Response.WriteAsJsonAsync(new MensajeRespuesta("El encabezado X-Institucion-Id no tiene un formato Guid válido.", "CONTEXTO_INVALIDO"));
                    return;
                }
                institucion = instSeleccionada.ToString();
            }
        }

        contexto.ActorActual = actor;
        if (Guid.TryParse(institucion, out var institucionId)) contexto.InstitucionId = new(institucionId);
        if (tieneRol)
        {
            contexto.RolActual = rol;
            contexto.EsSuperadmin = esSuperadmin;
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

app.UseMiddleware<ProteccionDatosMiddleware>();

var connectionString = builder.Configuration.GetConnectionString("Default");
if (!string.IsNullOrWhiteSpace(connectionString))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
    await db.Database.MigrateAsync();
}

if (Array.IndexOf(args, "--publicar-aviso") is var indiceAviso && indiceAviso >= 0)
{
    if (indiceAviso + 1 >= args.Length)
        throw new ArgumentException("Debe indicar el archivo JSON del aviso autorizado.");
    var opciones = new JsonSerializerOptions(JsonSerializerDefaults.Web);
    opciones.Converters.Add(new JsonStringEnumConverter());
    var solicitud = JsonSerializer.Deserialize<PublicarAvisoRequest>(await File.ReadAllTextAsync(args[indiceAviso + 1]), opciones)
        ?? throw new ArgumentException("El archivo del aviso no es válido.");
    using var scope = app.Services.CreateScope();
    await scope.ServiceProvider.GetRequiredService<IServicioProteccionDatos>().PublicarAsync(solicitud);
    Console.WriteLine("Aviso institucional publicado. No se registraron aceptaciones por representación.");
    return;
}

if (args.Contains("--cargar-catalogos"))
{
    await app.CargarCatalogosAsync(forzar: true);
    Console.WriteLine("Catálogos cargados y verificados. Finalizando proceso (--cargar-catalogos).");
    return;
}

if (args.Contains("--migrar") || args.Contains("--migrate"))
{
    Console.WriteLine("Migraciones de base de datos ejecutadas exitosamente. Finalizando proceso (--migrar).");
    return;
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    // ADR-0016: interfaz para probar la API en desarrollo, en /scalar/v1. Nunca en producción.
    app.MapScalarApiReference(opciones => opciones.WithTitle("Actualización de datos — API (desarrollo)"));
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

        return Results.Ok(resultado.DebeCambiarContrasena || resultado.RequiereAceptarProteccionDatos
            ? resultado with { Documento = "", Nombre = null, Correo = null, CorreoVerificado = false }
            : resultado);
    }
    catch (ReglaNegocioException ex)
    {
        return Results.Json(new MensajeRespuesta(ex.Message), statusCode: StatusCodes.Status401Unauthorized);
    }
})
.WithMetadata(new PasoAccesoProteccionDatos())
.WithName("IniciarSesion")
.Produces<ResultadoLoginDto>()
.Produces<MensajeRespuesta>(StatusCodes.Status401Unauthorized)
.AllowAnonymous();

auth.MapPost("/logout", async (HttpContext httpContext) =>
{
    await httpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
    return Results.Ok(new MensajeRespuesta("Sesión cerrada correctamente."));
})
.WithMetadata(new PasoAccesoProteccionDatos())
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
.WithMetadata(new PasoAccesoProteccionDatos())
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
.WithMetadata(new PasoAccesoProteccionDatos())
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
var instituciones = app.MapGroup("/api/instituciones").WithTags("Instituciones")
    .RequireAuthorization(politica => politica.RequireRole(nameof(RolUsuario.Superadmin)));

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

personas.MapPost("/cargar-archivo", async (IFormFile archivo, IServicioPersonas servicio, CancellationToken ct) =>
{
    if (archivo == null || archivo.Length == 0)
    {
        return Results.BadRequest(new MensajeRespuesta("Debe proporcionar un archivo .xlsx o .csv no vacío."));
    }

    try
    {
        await using var stream = archivo.OpenReadStream();
        var resultado = await servicio.CargarDesdeArchivoAsync(stream, archivo.FileName, ct);
        return Results.Ok(resultado);
    }
    catch (ReglaNegocioException ex)
    {
        return Results.BadRequest(new MensajeRespuesta(ex.Message));
    }
})
.DisableAntiforgery()
.WithName("CargarPersonasArchivo")
.Produces<ResultadoCargaPersonasDto>()
.Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest);

personas.MapGet("/", async (IServicioPersonas servicio, CancellationToken ct) =>
{
    var lista = await servicio.ListarPersonasAsync(ct);
    return Results.Ok(lista);
})
.WithName("ListarPersonas")
.Produces<List<PersonaDto>>();

personas.MapPost("/acceso", async (
    CambiarAccesoPersonasRequest request,
    HttpContext httpContext,
    IContextoInstitucion contexto,
    IServicioPersonas servicio,
    CancellationToken ct) =>
{
    if (!EstaAutenticado(httpContext, contexto))
    {
        return Results.Unauthorized();
    }

    if (!EsRolAdmin(httpContext, contexto))
    {
        return Results.Json(
            new MensajeRespuesta("No tiene permisos para modificar el acceso. Se requiere rol de Administrador."),
            statusCode: StatusCodes.Status403Forbidden);
    }

    try
    {
        var resultado = await servicio.CambiarAccesoAsync(request, ct);
        return Results.Ok(resultado);
    }
    catch (ReglaNegocioException ex)
    {
        return Results.BadRequest(new MensajeRespuesta(ex.Message));
    }
})
.WithName("CambiarAccesoPersonas")
.Produces<ResultadoCambioAccesoDto>()
.Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
.Produces(StatusCodes.Status401Unauthorized)
.Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden);

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

// --- Helpers de autorización y resolución de actor ---
static string? ObtenerDocumentoActual(HttpContext httpContext, IContextoInstitucion contexto)
{
    return httpContext.User.FindFirst(ClaimTypes.Name)?.Value ?? contexto.ActorActual;
}

static bool EsRolSupervisorOAdmin(HttpContext httpContext, IContextoInstitucion contexto)
{
    var rol = contexto.RolActual;
    if (rol == null)
    {
        var claimRol = httpContext.User.FindFirst(ClaimTypes.Role)?.Value;
        if (!string.IsNullOrEmpty(claimRol) && Enum.TryParse<RolUsuario>(claimRol, ignoreCase: true, out var r))
        {
            rol = r;
        }
    }
    return rol is RolUsuario.Supervisor or RolUsuario.Admin or RolUsuario.Superadmin;
}

static bool EstaAutenticado(HttpContext httpContext, IContextoInstitucion contexto)
{
    if (httpContext.User.Identity?.IsAuthenticated == true)
    {
        return true;
    }
    return !string.IsNullOrWhiteSpace(contexto.ActorActual) || contexto.RolActual != null;
}

static bool EsRolAdmin(HttpContext httpContext, IContextoInstitucion contexto)
{
    if (contexto.EsSuperadmin)
    {
        return true;
    }

    var rol = contexto.RolActual;
    if (rol == null)
    {
        var claimRol = httpContext.User.FindFirst(ClaimTypes.Role)?.Value;
        if (!string.IsNullOrEmpty(claimRol) && Enum.TryParse<RolUsuario>(claimRol, ignoreCase: true, out var r))
        {
            rol = r;
        }
    }
    return rol is RolUsuario.Admin or RolUsuario.Superadmin;
}

static bool ValidarAccesoMisDatos(string? docParam, string? docActual, HttpContext httpContext, IContextoInstitucion contexto)
{
    // RF-DAT-002: Un usuario solo accede a sus propios datos.
    if (!EsRolSupervisorOAdmin(httpContext, contexto))
    {
        if (string.IsNullOrWhiteSpace(docActual))
        {
            return false;
        }

        if (!string.IsNullOrWhiteSpace(docParam) &&
            !string.Equals(docParam, docActual, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }
    }
    return true;
}

// --- Endpoints Mis Datos (RF-CAM-002, RF-CAM-003, RF-CAM-004, RF-FLU-001, RF-FLU-004, RF-DAT-001, RF-DAT-002) ---
var misDatos = app.MapGroup("/api/mis-datos").WithTags("MisDatos");

misDatos.MapGet("/", async (string? documento, HttpContext httpContext, IServicioDatosUsuario servicio, IContextoInstitucion contexto, CancellationToken ct) =>
{
    var docActual = ObtenerDocumentoActual(httpContext, contexto);
    var docEfectivo = !string.IsNullOrWhiteSpace(documento) ? documento : docActual;

    if (string.IsNullOrWhiteSpace(docEfectivo))
    {
        return Results.Unauthorized();
    }

    if (!ValidarAccesoMisDatos(documento, docActual, httpContext, contexto))
    {
        return Results.Json(new MensajeRespuesta("No tiene permisos para acceder a los datos de otra persona."), statusCode: StatusCodes.Status403Forbidden);
    }

    try
    {
        var datos = await servicio.ObtenerMisDatosAsync(docEfectivo, ct);
        return Results.Ok(datos);
    }
    catch (ReglaNegocioException ex)
    {
        return Results.BadRequest(new MensajeRespuesta(ex.Message));
    }
})
.WithName("ObtenerMisDatos")
.Produces<MisDatosDto>()
.Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
.Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
.Produces(StatusCodes.Status401Unauthorized);

misDatos.MapGet("/estado-edicion", async (string? documento, HttpContext httpContext, IServicioCampanas servicio, IContextoInstitucion contexto, CancellationToken ct) =>
{
    var docActual = ObtenerDocumentoActual(httpContext, contexto);
    var docEfectivo = !string.IsNullOrWhiteSpace(documento) ? documento : docActual;

    if (string.IsNullOrWhiteSpace(docEfectivo))
    {
        return Results.Unauthorized();
    }

    if (!ValidarAccesoMisDatos(documento, docActual, httpContext, contexto))
    {
        return Results.Json(new MensajeRespuesta("No tiene permisos para acceder a los datos de otra persona."), statusCode: StatusCodes.Status403Forbidden);
    }

    var estado = await servicio.ObtenerEstadoEdicionAsync(docEfectivo, ct);
    return Results.Ok(estado);
})
.WithName("ObtenerEstadoEdicion")
.Produces<EstadoEdicionDto>()
.Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
.Produces(StatusCodes.Status401Unauthorized);

misDatos.MapPut("/", async (string? documento, ActualizarDatosRequest request, HttpContext httpContext, IServicioCampanas servicio, IContextoInstitucion contexto, CancellationToken ct) =>
{
    var docActual = ObtenerDocumentoActual(httpContext, contexto);
    var docEfectivo = !string.IsNullOrWhiteSpace(documento) ? documento : docActual;

    if (string.IsNullOrWhiteSpace(docEfectivo))
    {
        return Results.Unauthorized();
    }

    if (!ValidarAccesoMisDatos(documento, docActual, httpContext, contexto))
    {
        return Results.Json(new MensajeRespuesta("No tiene permisos para modificar los datos de otra persona."), statusCode: StatusCodes.Status403Forbidden);
    }

    try
    {
        await servicio.ActualizarDatosUsuarioAsync(docEfectivo, request, ct);
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
.Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
.Produces(StatusCodes.Status401Unauthorized);

misDatos.MapPost("/enviar", async (string? documento, HttpContext httpContext, IServicioDatosUsuario servicio, IContextoInstitucion contexto, CancellationToken ct) =>
{
    var docActual = ObtenerDocumentoActual(httpContext, contexto);
    var docEfectivo = !string.IsNullOrWhiteSpace(documento) ? documento : docActual;

    if (string.IsNullOrWhiteSpace(docEfectivo))
    {
        return Results.Unauthorized();
    }

    if (!ValidarAccesoMisDatos(documento, docActual, httpContext, contexto))
    {
        return Results.Json(new MensajeRespuesta("No tiene permisos para modificar los datos de otra persona."), statusCode: StatusCodes.Status403Forbidden);
    }

    try
    {
        await servicio.EnviarARevisionAsync(docEfectivo, ct);
        return Results.Ok(new MensajeRespuesta("Actualización enviada a revisión exitosamente. La edición ha sido bloqueada."));
    }
    catch (EnvioIncompletoException ex)
    {
        // RF-HDV-009: la respuesta dice qué falta, por sección e ítem (T-04 la produce).
        return Results.BadRequest(new EnvioIncompletoRespuesta(ex.Message, [.. ex.Faltantes]));
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
.WithName("EnviarMisDatosARevision")
.Produces<MensajeRespuesta>()
.Produces<EnvioIncompletoRespuesta>(StatusCodes.Status400BadRequest)
.Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
.Produces(StatusCodes.Status401Unauthorized);

misDatos.MapGet("/observaciones", async (string? documento, HttpContext httpContext, IServicioDatosUsuario servicio, IContextoInstitucion contexto, CancellationToken ct) =>
{
    var docActual = ObtenerDocumentoActual(httpContext, contexto);
    var docEfectivo = !string.IsNullOrWhiteSpace(documento) ? documento : docActual;

    if (string.IsNullOrWhiteSpace(docEfectivo))
    {
        return Results.Unauthorized();
    }

    if (!ValidarAccesoMisDatos(documento, docActual, httpContext, contexto))
    {
        return Results.Json(new MensajeRespuesta("No tiene permisos para acceder a los datos de otra persona."), statusCode: StatusCodes.Status403Forbidden);
    }

    try
    {
        var observaciones = await servicio.ObtenerObservacionesAsync(docEfectivo, ct);
        return Results.Ok(observaciones);
    }
    catch (ReglaNegocioException ex)
    {
        return Results.BadRequest(new MensajeRespuesta(ex.Message));
    }
})
.WithName("ObtenerObservacionesMisDatos")
.Produces<List<ObservacionDto>>()
.Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
.Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
.Produces(StatusCodes.Status401Unauthorized);

// --- Endpoints Revision (RF-FLU-002, RF-FLU-003, RF-FLU-005, RF-FLU-006, RF-DAT-004, RF-DAT-005, ADR-0008) ---
var revision = app.MapGroup("/api/revision").WithTags("Revision");

revision.MapGet("/pendientes", async (HttpContext httpContext, IServicioRevision servicio, IContextoInstitucion contexto, CancellationToken ct) =>
{
    if (!EsRolSupervisorOAdmin(httpContext, contexto))
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    var pendientes = await servicio.ListarPendientesRevisionAsync(ct);
    return Results.Ok(pendientes);
})
.WithName("ListarPendientesRevision")
.Produces<List<ResumenRevisionPendienteDto>>()
.Produces(StatusCodes.Status403Forbidden);

revision.MapGet("/{documento}", async (string documento, HttpContext httpContext, IServicioRevision servicio, IContextoInstitucion contexto, CancellationToken ct) =>
{
    if (!EsRolSupervisorOAdmin(httpContext, contexto))
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    var supervisor = ObtenerDocumentoActual(httpContext, contexto) ?? "supervisor";

    try
    {
        var expediente = await servicio.ObtenerExpedienteParaRevisionAsync(documento, supervisor, ct);
        return Results.Ok(expediente);
    }
    catch (ReglaNegocioException ex) when (ex.Message.Contains("borrador", StringComparison.OrdinalIgnoreCase))
    {
        return Results.Json(new MensajeRespuesta(ex.Message), statusCode: StatusCodes.Status400BadRequest);
    }
    catch (ReglaNegocioException ex)
    {
        return Results.NotFound(new MensajeRespuesta(ex.Message));
    }
})
.WithName("ObtenerExpedienteParaRevision")
.Produces<ExpedienteRevisionDto>()
.Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
.Produces<MensajeRespuesta>(StatusCodes.Status404NotFound)
.Produces(StatusCodes.Status403Forbidden);

revision.MapGet("/{documento}/archivos", async (string documento, HttpContext httpContext, IServicioArchivos servicio, IContextoInstitucion contexto, CancellationToken ct) =>
{
    if (!EsRolSupervisorOAdmin(httpContext, contexto))
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    try
    {
        var lista = await servicio.ListarArchivosPersonaAsync(documento, ct);
        return Results.Ok(lista);
    }
    catch (ReglaNegocioException ex)
    {
        return Results.NotFound(new MensajeRespuesta(ex.Message));
    }
})
.WithName("ListarArchivosExpediente")
.Produces<List<ArchivoDto>>()
.Produces<MensajeRespuesta>(StatusCodes.Status404NotFound)
.Produces(StatusCodes.Status403Forbidden);

revision.MapPost("/{documento}/aprobar", async (string documento, HttpContext httpContext, IServicioRevision servicio, IContextoInstitucion contexto, CancellationToken ct) =>
{
    if (!EsRolSupervisorOAdmin(httpContext, contexto))
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    var supervisor = ObtenerDocumentoActual(httpContext, contexto) ?? "supervisor";

    try
    {
        await servicio.AprobarActualizacionAsync(documento, supervisor, ct);
        return Results.Ok(new MensajeRespuesta("Actualización aprobada con éxito."));
    }
    catch (ReglaNegocioException ex)
    {
        return Results.BadRequest(new MensajeRespuesta(ex.Message));
    }
})
.WithName("AprobarActualizacion")
.Produces<MensajeRespuesta>()
.Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
.Produces(StatusCodes.Status403Forbidden);

revision.MapPost("/{documento}/devolver", async (string documento, DevolverActualizacionRequest request, HttpContext httpContext, IServicioRevision servicio, IContextoInstitucion contexto, CancellationToken ct) =>
{
    if (!EsRolSupervisorOAdmin(httpContext, contexto))
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    var supervisor = ObtenerDocumentoActual(httpContext, contexto) ?? "supervisor";

    try
    {
        await servicio.DevolverActualizacionAsync(documento, request, supervisor, ct);
        return Results.Ok(new MensajeRespuesta("Actualización devuelta al usuario con observaciones."));
    }
    catch (ReglaNegocioException ex)
    {
        return Results.BadRequest(new MensajeRespuesta(ex.Message));
    }
})
.WithName("DevolverActualizacion")
.Produces<MensajeRespuesta>()
.Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
.Produces(StatusCodes.Status403Forbidden);

revision.MapPost("/{documento}/capacitaciones-obligatorias/{obligatoriaId:guid}/vincular", async (
    string documento,
    Guid obligatoriaId,
    VincularCapacitacionObligatoriaRequest request,
    HttpContext httpContext,
    IServicioRevision servicio,
    IContextoInstitucion contexto,
    CancellationToken ct) =>
{
    if (!EsRolSupervisorOAdmin(httpContext, contexto))
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    var supervisor = ObtenerDocumentoActual(httpContext, contexto) ?? "supervisor";

    try
    {
        await servicio.VincularCapacitacionObligatoriaPorAyudaAsync(documento, obligatoriaId, request, supervisor, ct);
        return Results.Ok(new MensajeRespuesta("Capacitación vinculada por ayuda con éxito."));
    }
    catch (RecursoNoEncontradoException ex)
    {
        return Results.NotFound(new MensajeRespuesta(ex.Message));
    }
    catch (ConflictoEstadoException ex)
    {
        return Results.Conflict(new MensajeRespuesta(ex.Message));
    }
    catch (ReglaNegocioException ex)
    {
        return Results.BadRequest(new MensajeRespuesta(ex.Message));
    }
})
.WithName("VincularCapacitacionObligatoriaPorAyuda")
.Produces<MensajeRespuesta>()
.Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
.Produces<MensajeRespuesta>(StatusCodes.Status404NotFound)
.Produces<MensajeRespuesta>(StatusCodes.Status409Conflict)
.Produces(StatusCodes.Status403Forbidden);

revision.MapGet("/{documento}/capacitaciones-obligatorias", async (
    string documento,
    HttpContext httpContext,
    IServicioHojaDeVida servicio,
    IContextoInstitucion contexto,
    CancellationToken ct) =>
{
    if (!EsRolSupervisorOAdmin(httpContext, contexto))
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    try
    {
        var lista = await servicio.ListarCapacitacionesObligatoriasAsync(documento, ct);
        return Results.Ok(lista);
    }
    catch (RecursoNoEncontradoException ex)
    {
        return Results.NotFound(new MensajeRespuesta(ex.Message));
    }
})
.WithName("ListarCapacitacionesObligatoriasRevision")
.Produces<List<EstadoCapacitacionObligatoriaPersonaDto>>()
.Produces<MensajeRespuesta>(StatusCodes.Status404NotFound)
.Produces(StatusCodes.Status403Forbidden);

// --- Endpoints Auditoria (RF-DAT-004, RF-DAT-005) ---
var auditoriaGroup = app.MapGroup("/api/auditoria").WithTags("Auditoria");

auditoriaGroup.MapGet("/", async (HttpContext httpContext, IServicioAuditoria servicio, IContextoInstitucion contexto, CancellationToken ct) =>
{
    if (!EsRolSupervisorOAdmin(httpContext, contexto))
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    var auditorias = await servicio.ListarAuditoriasAsync(ct);
    return Results.Ok(auditorias);
})
.WithName("ListarAuditorias")
.Produces<List<AuditoriaDto>>()
.Produces(StatusCodes.Status403Forbidden);

// --- Endpoints Archivos (RF-DAT-002, RF-DAT-003, ADR-0006) ---
var archivosGroup = app.MapGroup("/api/archivos").WithTags("Archivos");

archivosGroup.MapPost("/subir", async (
    IFormFile archivo,
    string? claveDestino,
    string? documento,
    HttpContext httpContext,
    IServicioArchivos servicio,
    IContextoInstitucion contexto,
    CancellationToken ct) =>
{
    var docActual = ObtenerDocumentoActual(httpContext, contexto);
    var docEfectivo = !string.IsNullOrWhiteSpace(documento) ? documento : docActual;

    if (string.IsNullOrWhiteSpace(docEfectivo))
    {
        return Results.Unauthorized();
    }

    if (!ValidarAccesoMisDatos(documento, docActual, httpContext, contexto))
    {
        return Results.Json(new MensajeRespuesta("No tiene permisos para subir archivos de otra persona."), statusCode: StatusCodes.Status403Forbidden);
    }

    if (archivo == null || archivo.Length == 0)
    {
        return Results.BadRequest(new MensajeRespuesta("Debe proporcionar un archivo válido no vacío."));
    }

    try
    {
        await using var stream = archivo.OpenReadStream();
        var resultado = await servicio.SubirArchivoAsync(
            docEfectivo,
            archivo.FileName,
            archivo.ContentType,
            stream,
            claveDestino,
            ct);

        return Results.Ok(resultado);
    }
    catch (SeccionNoDisponibleException ex)
    {
        return Results.Json(new MensajeRespuesta(ex.Message, "SECCION_NO_DISPONIBLE"), statusCode: StatusCodes.Status409Conflict);
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
.WithName("SubirArchivo")
.DisableAntiforgery()
.Produces<ArchivoDto>()
.Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
.Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
.Produces<MensajeRespuesta>(StatusCodes.Status409Conflict)
.Produces(StatusCodes.Status401Unauthorized);

archivosGroup.MapGet("/{id:guid}/descargar", async (
    Guid id,
    HttpContext httpContext,
    IServicioArchivos servicio,
    IContextoInstitucion contexto,
    CancellationToken ct) =>
{
    var actor = ObtenerDocumentoActual(httpContext, contexto);
    if (string.IsNullOrWhiteSpace(actor))
    {
        return Results.Unauthorized();
    }

    var rol = contexto.RolActual;
    if (rol == null)
    {
        var claimRol = httpContext.User.FindFirst(ClaimTypes.Role)?.Value;
        if (!string.IsNullOrEmpty(claimRol) && Enum.TryParse<RolUsuario>(claimRol, ignoreCase: true, out var r))
        {
            rol = r;
        }
        else
        {
            rol = RolUsuario.Usuario;
        }
    }

    try
    {
        var descarga = await servicio.ObtenerArchivoParaDescargaAsync(id, actor, rol.Value, ct);
        httpContext.Response.Headers["X-Content-Type-Options"] = "nosniff";
        return Results.File(descarga.Contenido, descarga.TipoContenido, descarga.NombreOriginal, enableRangeProcessing: false);
    }
    catch (UnauthorizedAccessException ex)
    {
        return Results.Json(new MensajeRespuesta(ex.Message), statusCode: StatusCodes.Status403Forbidden);
    }
    catch (ReglaNegocioException ex) when (ex.Message.Contains("no existe", StringComparison.OrdinalIgnoreCase))
    {
        return Results.NotFound(new MensajeRespuesta(ex.Message));
    }
    catch (ReglaNegocioException ex)
    {
        return Results.BadRequest(new MensajeRespuesta(ex.Message));
    }
})
.WithName("DescargarArchivo")
.Produces(StatusCodes.Status200OK, contentType: "application/octet-stream")
.Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
.Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
.Produces<MensajeRespuesta>(StatusCodes.Status404NotFound)
.Produces(StatusCodes.Status401Unauthorized);

archivosGroup.MapGet("/mis-archivos", async (
    string? documento,
    HttpContext httpContext,
    IServicioArchivos servicio,
    IContextoInstitucion contexto,
    CancellationToken ct) =>
{
    var docActual = ObtenerDocumentoActual(httpContext, contexto);
    var docEfectivo = !string.IsNullOrWhiteSpace(documento) ? documento : docActual;

    if (string.IsNullOrWhiteSpace(docEfectivo))
    {
        return Results.Unauthorized();
    }

    if (!ValidarAccesoMisDatos(documento, docActual, httpContext, contexto))
    {
        return Results.Json(new MensajeRespuesta("No tiene permisos para consultar archivos de otra persona."), statusCode: StatusCodes.Status403Forbidden);
    }

    try
    {
        var lista = await servicio.ListarArchivosPersonaAsync(docEfectivo, ct);
        return Results.Ok(lista);
    }
    catch (ReglaNegocioException ex)
    {
        return Results.BadRequest(new MensajeRespuesta(ex.Message));
    }
})
.WithName("ListarMisArchivos")
.Produces<List<ArchivoDto>>()
.Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
.Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
.Produces(StatusCodes.Status401Unauthorized);

archivosGroup.MapDelete("/{id:guid}", async (
    Guid id,
    string? documento,
    HttpContext httpContext,
    IServicioArchivos servicio,
    IContextoInstitucion contexto,
    CancellationToken ct) =>
{
    var docActual = ObtenerDocumentoActual(httpContext, contexto);
    var docEfectivo = !string.IsNullOrWhiteSpace(documento) ? documento : docActual;

    if (string.IsNullOrWhiteSpace(docEfectivo))
    {
        return Results.Unauthorized();
    }

    if (!ValidarAccesoMisDatos(documento, docActual, httpContext, contexto))
    {
        return Results.Json(new MensajeRespuesta("No tiene permisos para eliminar archivos de otra persona."), statusCode: StatusCodes.Status403Forbidden);
    }

    try
    {
        await servicio.EliminarArchivoAsync(id, docEfectivo, ct);
        return Results.Ok(new MensajeRespuesta("Archivo eliminado correctamente."));
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
.WithName("EliminarArchivo")
.Produces<MensajeRespuesta>()
.Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
.Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
.Produces(StatusCodes.Status401Unauthorized);

misDatos.MapGet("/archivos", async (
    string? documento,
    HttpContext httpContext,
    IServicioArchivos servicio,
    IContextoInstitucion contexto,
    CancellationToken ct) =>
{
    var docActual = ObtenerDocumentoActual(httpContext, contexto);
    var docEfectivo = !string.IsNullOrWhiteSpace(documento) ? documento : docActual;

    if (string.IsNullOrWhiteSpace(docEfectivo))
    {
        return Results.Unauthorized();
    }

    if (!ValidarAccesoMisDatos(documento, docActual, httpContext, contexto))
    {
        return Results.Json(new MensajeRespuesta("No tiene permisos para consultar archivos de otra persona."), statusCode: StatusCodes.Status403Forbidden);
    }

    try
    {
        var lista = await servicio.ListarArchivosPersonaAsync(docEfectivo, ct);
        return Results.Ok(lista);
    }
    catch (ReglaNegocioException ex)
    {
        return Results.BadRequest(new MensajeRespuesta(ex.Message));
    }
})
.WithName("ListarArchivosMisDatos")
.Produces<List<ArchivoDto>>()
.Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
.Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
.Produces(StatusCodes.Status401Unauthorized);

// --- Endpoints Exportaciones (RF-EXP-001, RF-EXP-002, RF-EXP-003, RF-EXP-004, RF-DAT-004) ---
var exportaciones = app.MapGroup("/api/exportaciones").WithTags("Exportaciones");

exportaciones.MapGet("/zip", async (
    Guid? institucionId,
    HttpContext httpContext,
    IServicioExportacion servicio,
    IContextoInstitucion contexto,
    CancellationToken ct) =>
{
    if (!EstaAutenticado(httpContext, contexto))
    {
        return Results.Unauthorized();
    }

    if (!EsRolAdmin(httpContext, contexto))
    {
        return Results.Json(new MensajeRespuesta("No tiene permisos para exportar datos. Se requiere rol de Administrador."), statusCode: StatusCodes.Status403Forbidden);
    }

    try
    {
        var archivo = await servicio.ExportarZipAsync(institucionId, ct);
        return Results.File(archivo.Contenido, archivo.TipoContenido, archivo.NombreOriginal);
    }
    catch (ReglaNegocioException ex)
    {
        return Results.BadRequest(new MensajeRespuesta(ex.Message));
    }
})
.WithName("ExportarZip")
.Produces(StatusCodes.Status200OK, contentType: "application/zip")
.Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
.Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
.Produces(StatusCodes.Status401Unauthorized);

exportaciones.MapGet("/excel", async (
    Guid? institucionId,
    HttpContext httpContext,
    IServicioExportacion servicio,
    IContextoInstitucion contexto,
    CancellationToken ct) =>
{
    if (!EstaAutenticado(httpContext, contexto))
    {
        return Results.Unauthorized();
    }

    if (!EsRolAdmin(httpContext, contexto))
    {
        return Results.Json(new MensajeRespuesta("No tiene permisos para exportar datos. Se requiere rol de Administrador."), statusCode: StatusCodes.Status403Forbidden);
    }

    try
    {
        var archivo = await servicio.ExportarExcelAsync(institucionId, ct);
        return Results.File(archivo.Contenido, archivo.TipoContenido, archivo.NombreOriginal);
    }
    catch (ReglaNegocioException ex)
    {
        return Results.BadRequest(new MensajeRespuesta(ex.Message));
    }
})
.WithName("ExportarExcel")
.Produces(StatusCodes.Status200OK, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
.Produces<MensajeRespuesta>(StatusCodes.Status400BadRequest)
.Produces<MensajeRespuesta>(StatusCodes.Status403Forbidden)
.Produces(StatusCodes.Status401Unauthorized);


await app.CargarCatalogosAsync();

app.MapCatalogos();

// --- Hoja de vida (spec-0003). Un archivo por grupo en Endpoints/ y una línea aquí (plan.md, T-00).
// Catálogos (#48) y exportación (#46) se integraron antes que este contrato y conservan su registro propio ---
app.MapHojaDeVida();
app.MapDocumentosPersonales();
app.MapFlujoActualizacion();
app.MapConfiguracionHojaDeVida();
app.MapCuentaBancaria();
app.MapProteccionDatos();
app.MapSuperadminProteccionDatos();
app.MapPersonalInstitucional();
app.MapSecciones();
app.MapConfiguracionDocumento();
app.MapPlantillasHojaDeVida();
app.MapDocumentoHojaDeVida();

await app.RunAsync();

internal sealed record RespuestaDeSalud(string Estado);

public partial class Program;
