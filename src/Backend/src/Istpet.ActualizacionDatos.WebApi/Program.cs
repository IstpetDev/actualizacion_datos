using Istpet.ActualizacionDatos.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AgregarInfraestructura();
builder.Services.AddOpenApi();

var app = builder.Build();

app.MapOpenApi();

app.MapGet("/health", () => Results.Ok(new RespuestaDeSalud("ok")))
    .WithName("ObtenerSalud")
    .Produces<RespuestaDeSalud>()
    .WithTags("Salud")
    .AllowAnonymous();

await app.RunAsync();

internal sealed record RespuestaDeSalud(string Estado);

public partial class Program;
