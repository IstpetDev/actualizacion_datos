using Istpet.ActualizacionDatos.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AgregarInfraestructura();

var app = builder.Build();

app.MapGet("/health", () => Results.Ok(new RespuestaDeSalud("ok")))
    .AllowAnonymous();

await app.RunAsync();

internal sealed record RespuestaDeSalud(string Estado);

public partial class Program;
