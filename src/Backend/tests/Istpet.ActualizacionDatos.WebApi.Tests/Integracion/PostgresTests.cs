using Npgsql;
using Testcontainers.PostgreSql;

namespace Istpet.ActualizacionDatos.WebApi.Tests.Integracion;

[Trait("Categoria", "Integracion")]
public sealed class PostgresTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _contenedor = new PostgreSqlBuilder("postgres:17-alpine").Build();

    public async Task InitializeAsync()
    {
        await _contenedor.StartAsync();
    }

    public async Task DisposeAsync()
    {
        await _contenedor.DisposeAsync();
    }

    [Fact]
    public async Task Postgres_responde_select_1()
    {
        await using var conexion = new NpgsqlConnection(_contenedor.GetConnectionString());
        await conexion.OpenAsync();
        await using var comando = new NpgsqlCommand("SELECT 1", conexion);

        var resultado = await comando.ExecuteScalarAsync();

        Assert.Equal(1, resultado);
    }
}
