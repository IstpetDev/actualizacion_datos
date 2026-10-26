namespace Istpet.ActualizacionDatos.Domain;

using System.Text.Json;

public class Institucion
{
    public InstitucionId Id { get; private set; }
    public string Nombre { get; private set; }
    public bool Activa { get; private set; }
    public DateTime FechaCreacionUtc { get; private set; }

    public string DominiosCorreoJson { get; private set; } = "[]";

    public string[] ObtenerDominiosCorreo() => JsonSerializer.Deserialize<string[]>(DominiosCorreoJson) ?? [];

    public void ConfigurarDominiosCorreo(string[] dominios) => DominiosCorreoJson = JsonSerializer.Serialize(dominios);

    private Institucion()
    {
        Id = null!;
        Nombre = null!;
    }

    public Institucion(InstitucionId id, string nombre, bool activa = true, DateTime? fechaCreacionUtc = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(nombre);
        Id = id ?? throw new ArgumentNullException(nameof(id));
        Nombre = nombre.Trim();
        Activa = activa;
        FechaCreacionUtc = fechaCreacionUtc ?? DateTime.UtcNow;
    }
}
