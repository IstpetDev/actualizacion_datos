namespace Istpet.ActualizacionDatos.WebApi.Tests;

using System.Globalization;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

// Aísla las reglas de specs anteriores que inyectaban identidad por cabeceras.
// Spec-0011 usa otra fábrica con cookies y política REALES; este doble solo existe en tests.
public sealed class FabricaPruebas : WebApplicationFactory<Program>
{
    public static readonly Guid AvisoFicticioId = Guid.Parse("00000000-0000-0000-0000-000000000010");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureTestServices(servicios =>
        {
            servicios.AddAuthentication(opciones =>
            {
                opciones.DefaultAuthenticateScheme = "SeleccionPrueba";
                opciones.DefaultChallengeScheme = CookieAuthenticationDefaults.AuthenticationScheme;
            }).AddPolicyScheme("SeleccionPrueba", "Selección exclusiva de pruebas", opciones =>
            {
                opciones.ForwardDefaultSelector = contexto => contexto.Request.Headers.ContainsKey("X-Actor")
                    ? "IdentidadPrueba" : CookieAuthenticationDefaults.AuthenticationScheme;
            }).AddScheme<AuthenticationSchemeOptions, IdentidadPrueba>("IdentidadPrueba", _ => { });
            servicios.AddScoped<IServicioProteccionDatos, PoliticaDeAccesoAnterior>();
        });
    }

    private sealed class IdentidadPrueba(IOptionsMonitor<AuthenticationSchemeOptions> opciones,
        ILoggerFactory logger, UrlEncoder encoder, AplicacionDbContext db, DbContextOptions<AplicacionDbContext> opcionesDb)
        : AuthenticationHandler<AuthenticationSchemeOptions>(opciones, logger, encoder)
    {
        protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var actor = Request.Headers["X-Actor"].ToString();
            if (string.IsNullOrEmpty(actor)) return AuthenticateResult.NoResult();
            var cookie = await Context.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            if (cookie.Succeeded && cookie.Principal!.FindFirstValue(ClaimTypes.Name) == actor &&
                string.Equals(cookie.Principal.FindFirstValue(ClaimTypes.Role), Request.Headers["X-Rol"], StringComparison.OrdinalIgnoreCase) &&
                string.Equals(cookie.Principal.FindFirstValue("institucion_id"), Request.Headers["X-Institucion-Id"], StringComparison.OrdinalIgnoreCase))
                return AuthenticateResult.Success(new(cookie.Principal, Scheme.Name));
            var rol = Enum.TryParse<RolUsuario>(Request.Headers["X-Rol"], true, out var valor) ? valor : RolUsuario.Usuario;
            var institucion = Guid.TryParse(Request.Headers["X-Institucion-Id"], out var inst) ? inst : Guid.Parse("00000000-0000-0000-0000-000000000001");
            var id = !opcionesDb.Extensions.Any(e => e.Info.IsDatabaseProvider) ? Guid.Empty : await db.Personas.IgnoreQueryFilters()
                .Where(p => p.Documento == actor && p.InstitucionId == new InstitucionId(institucion))
                .Select(p => p.Id).FirstOrDefaultAsync();
            var claims = new Claim[] {
                new(ClaimTypes.NameIdentifier, id.ToString()), new(ClaimTypes.Name, actor),
                new(ClaimTypes.Role, rol.ToString()), new("institucion_id", institucion.ToString()),
                new("debe_cambiar_contrasena", "false")
            };
            return AuthenticateResult.Success(new(new(new ClaimsIdentity(claims, Scheme.Name)), Scheme.Name));
        }
    }

    private sealed class PoliticaDeAccesoAnterior(AplicacionDbContext db, DbContextOptions<AplicacionDbContext> opcionesDb) : IServicioProteccionDatos
    {
        public async Task<EstadoProteccionDatosDto> ObtenerEstadoAsync(Guid personaId, InstitucionId institucionId,
            RolUsuario rol, CancellationToken ct = default)
        {
            var fecha = !opcionesDb.Extensions.Any(e => e.Info.IsDatabaseProvider) ? null : await db.Personas.IgnoreQueryFilters()
                .Where(p => p.Id == personaId && p.InstitucionId == institucionId)
                .Select(p => p.FechaAceptacionTratamientoDatosUtc).FirstOrDefaultAsync(ct);
            return new(true, null, fecha);
        }

        public async Task<EstadoProteccionDatosDto> AceptarAsync(Guid personaId, InstitucionId institucionId,
            RolUsuario rol, AceptarAvisoRequest solicitud, CancellationToken ct = default)
        {
            var persona = await db.Personas.IgnoreQueryFilters().SingleAsync(p => p.Id == personaId && p.InstitucionId == institucionId, ct);
            var fecha = DateTime.UtcNow;
            persona.AceptarTratamientoDatos(fecha);
            db.Auditorias.Add(new(Guid.NewGuid(), persona.Documento, "AceptarTratamientoDatos", institucionId, fecha,
                detalle: "Aceptación ficticia del flujo anterior; spec-0011 se verifica con su servicio real."));
            await db.SaveChangesAsync(ct);
            return new(true, null, fecha);
        }

        public Task PublicarAsync(PublicarAvisoRequest solicitud, CancellationToken ct = default) =>
            throw new NotSupportedException("Esta fábrica no verifica publicación ni aceptación versionada.");
    }
}
