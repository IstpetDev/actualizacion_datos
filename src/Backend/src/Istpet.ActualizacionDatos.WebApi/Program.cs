using Istpet.ActualizacionDatos.Infrastructure;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AgregarInfraestructura(builder.Configuration);
builder.Services.AddOpenApi();

var app = builder.Build();

var connectionString = builder.Configuration.GetConnectionString("Default");
if (!string.IsNullOrWhiteSpace(connectionString))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AplicacionDbContext>();
    await db.Database.MigrateAsync();
}

// El contrato solo se sirve en desarrollo; el documento de compilación
// (openapi/v1.json) lo genera el SDK sin arrancar el servidor en producción.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapGet("/health", () => Results.Ok(new RespuestaDeSalud("ok")))
    .WithName("ObtenerSalud")
    .Produces<RespuestaDeSalud>()
    .WithTags("Salud")
    .AllowAnonymous();

await app.RunAsync();

internal sealed record RespuestaDeSalud(string Estado);

public partial class Program;
