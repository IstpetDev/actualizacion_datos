namespace Istpet.ActualizacionDatos.WebApi.Tests;

using System.Security.Cryptography;
using System.Text.Json.Nodes;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Istpet.ActualizacionDatos.Infrastructure.Servicios;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

public sealed class CargadorCatalogosTests : IDisposable
{
    private readonly SqliteConnection _conexion = new("DataSource=:memory:");
    private readonly string _directorio = Path.Combine(Path.GetTempPath(), "catalogos-ficticios-" + Guid.NewGuid().ToString("N"));
    private readonly AplicacionDbContext _db;

    public CargadorCatalogosTests()
    {
        _conexion.Open();
        _db = new AplicacionDbContext(new DbContextOptionsBuilder<AplicacionDbContext>()
            .UseSqlite(_conexion).UseSnakeCaseNamingConvention().Options);
        _db.Database.EnsureCreated();
        Directory.CreateDirectory(_directorio);
        foreach (var archivo in Directory.GetFiles(Path.Combine(AppContext.BaseDirectory, "catalogos")))
        {
            File.Copy(archivo, Path.Combine(_directorio, Path.GetFileName(archivo)));
        }
    }

    public void Dispose()
    {
        _db.Dispose();
        _conexion.Dispose();
        Directory.Delete(_directorio, recursive: true);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Archivo_ausente_o_hash_incorrecto_falla_antes_de_importar(bool ausente)
    {
        var ruta = Path.Combine(_directorio, "Banco.csv");
        if (ausente) File.Delete(ruta);
        else await File.AppendAllTextAsync(ruta, "BANCO_FICTICIO,Banco ficticio,,\n");
        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => new CargadorCatalogos(new ServicioCatalogos(_db), _db).CargarAsync(_directorio));
        Assert.Contains("Banco.csv", error.Message, StringComparison.Ordinal);
        Assert.Equal(29, await _db.ElementosCatalogo.CountAsync());
    }

    [Theory]
    [InlineData("Banco.csv", "BANCO_FICTICIO,Banco ficticio,,\nBANCO_FICTICIO,Duplicado ficticio,,\n", TipoCatalogo.Banco, 0)]
    [InlineData("InstitutosSuperiores.csv", "IES_FICTICIA,Institución ficticia,PAIS_INEXISTENTE,\n", TipoCatalogo.Universidad, 64)]
    public async Task Archivo_invalido_no_guarda_filas_parciales_y_repetir_recupera_el_lote(string archivo, string filas, TipoCatalogo tipo, int esperados)
    {
        var ruta = Path.Combine(_directorio, archivo);
        var original = await File.ReadAllBytesAsync(ruta);
        await File.WriteAllTextAsync(ruta, "codigo,nombre,codigo_padre,codigo_externo\n" + filas);
        await ActualizarHashAsync(archivo);
        var cargador = new CargadorCatalogos(new ServicioCatalogos(_db), _db);
        await Assert.ThrowsAsync<ReglaNegocioException>(() => cargador.CargarAsync(_directorio));
        _db.ChangeTracker.Clear();
        Assert.Equal(esperados, await _db.ElementosCatalogo.CountAsync(e => e.Tipo == tipo));
        var idsPrevios = await _db.ElementosCatalogo.Select(e => e.Id).ToListAsync();
        await File.WriteAllBytesAsync(ruta, original);
        await ActualizarHashAsync(archivo);
        await cargador.CargarAsync(_directorio);
        var idsFinales = await _db.ElementosCatalogo.Select(e => e.Id).ToListAsync();
        Assert.Equal(2350, idsFinales.Count);
        Assert.All(idsPrevios, id => Assert.Contains(id, idsFinales));
    }

    [Fact]
    public async Task Disponibilidad_detecta_tipo_vacio_y_ecuador_inactivo_sin_reactivarlos()
    {
        var cargador = new CargadorCatalogos(new ServicioCatalogos(_db), _db);
        await cargador.CargarAsync(_directorio);
        var etnia = await _db.ElementosCatalogo.FirstAsync(e => e.Tipo == TipoCatalogo.Etnia);
        etnia.Desactivar();
        await _db.SaveChangesAsync();
        await cargador.CargarAsync(_directorio);
        Assert.False((await _db.ElementosCatalogo.SingleAsync(e => e.Id == etnia.Id)).Activo);
        var bancos = await _db.ElementosCatalogo.Where(e => e.Tipo == TipoCatalogo.Banco).ToListAsync();
        bancos.ForEach(b => b.Desactivar());
        await _db.SaveChangesAsync();
        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => cargador.VerificarDisponibilidadAsync());
        Assert.Contains("Banco", error.Message, StringComparison.Ordinal);
        await Assert.ThrowsAsync<InvalidOperationException>(() => cargador.CargarAsync(_directorio));
        Assert.False(await _db.ElementosCatalogo.AnyAsync(e => e.Tipo == TipoCatalogo.Banco && e.Activo));
        bancos.ForEach(b => b.Activar());
        (await _db.ElementosCatalogo.SingleAsync(e => e.Tipo == TipoCatalogo.Pais && e.Codigo == "218")).Desactivar();
        await _db.SaveChangesAsync();
        error = await Assert.ThrowsAsync<InvalidOperationException>(() => cargador.VerificarDisponibilidadAsync());
        Assert.Contains("Ecuador (218)", error.Message, StringComparison.Ordinal);
    }

    private async Task ActualizarHashAsync(string archivo)
    {
        var ruta = Path.Combine(_directorio, "fuentes.json");
        var manifiesto = JsonNode.Parse(await File.ReadAllTextAsync(ruta))!;
        var entrada = manifiesto["archivos"]!.AsArray().Single(e => e!["archivo"]!.GetValue<string>() == archivo)!;
        entrada["sha256"] = Convert.ToHexString(SHA256.HashData(await File.ReadAllBytesAsync(Path.Combine(_directorio, archivo)))).ToLowerInvariant();
        await File.WriteAllTextAsync(ruta, manifiesto.ToJsonString());
    }
}
