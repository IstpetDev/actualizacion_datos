namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using System.Text;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.VisualBasic.FileIO;

public sealed class ServicioCatalogos(AplicacionDbContext db) : IServicioCatalogos
{
    public const int MaximoBytesCsv = 1024 * 1024;
    private const int MaximoFilasCsv = 10000;
    private static readonly string[] Cabecera = ["codigo", "nombre", "codigo_padre", "codigo_externo"];

    public async Task<List<ElementoCatalogoDto>> ConsultarAsync(TipoCatalogo tipo, int? padreId = null, CancellationToken ct = default)
    {
        ValidarTipo(tipo);
        if (padreId is <= 0)
        {
            throw new ReglaNegocioException("El padreId debe ser un identificador positivo.");
        }

        return await db.ElementosCatalogo.AsNoTracking()
            .Where(e => e.Tipo == tipo && e.Activo && (!padreId.HasValue || e.PadreId == padreId))
            .OrderBy(e => e.Orden).ThenBy(e => e.Codigo)
            .Select(e => new ElementoCatalogoDto(e.Id, e.Tipo, e.Codigo, e.Nombre, e.PadreId, e.CodigoExterno, e.Orden))
            .ToListAsync(ct);
    }

    public async Task<ResultadoImportacionCatalogoDto> ImportarAsync(TipoCatalogo tipo, Stream csv, CancellationToken ct = default)
    {
        ValidarTipo(tipo);
        var filas = await LeerCsvAsync(csv, ct);
        await using var transaccion = await db.Database.BeginTransactionAsync(ct);
        if (db.Database.IsNpgsql())
        {
            // La reserva de ids se comparte entre procesos y contenedores, no solo dentro de esta instancia.
            await db.Database.ExecuteSqlRawAsync("LOCK TABLE elementos_catalogo IN SHARE ROW EXCLUSIVE MODE", ct);
        }

        var elementos = await db.ElementosCatalogo.ToListAsync(ct);
        var existentes = elementos.Where(e => e.Tipo == tipo).ToDictionary(e => e.Codigo, StringComparer.Ordinal);
        var tipoPadre = ElementoCatalogo.TipoPadre(tipo);
        var padres = elementos.Where(e => e.Tipo == tipoPadre).ToDictionary(e => e.Codigo, StringComparer.Ordinal);
        var planes = new List<(FilaCsv Fila, ElementoCatalogo? Existente, int? PadreId)>();
        foreach (var fila in filas)
        {
            int? padreId = null;
            if (fila.CodigoPadre.Length > 0)
            {
                if (tipoPadre is null || !padres.TryGetValue(fila.CodigoPadre, out var padre))
                {
                    throw new ReglaNegocioException($"Fila {fila.Orden + 1}: el padre no existe o no es del tipo requerido ({tipoPadre?.ToString() ?? "sin padre"}).");
                }

                padreId = padre.Id;
            }
            else if (tipoPadre is not null && tipo != TipoCatalogo.Universidad)
            {
                throw new ReglaNegocioException($"Fila {fila.Orden + 1}: debe indicar un padre de tipo {tipoPadre}.");
            }

            existentes.TryGetValue(fila.Codigo, out var existente);
            if (existente is { Id: < 1000 } && EsDistinto(existente, fila, padreId))
            {
                throw new ReglaNegocioException($"Fila {fila.Orden + 1}: la importación no puede modificar un elemento de semilla.");
            }

            planes.Add((fila, existente, padreId));
        }

        var siguienteId = Math.Max(999, elementos.Select(e => e.Id).DefaultIfEmpty(0).Max());
        var creados = 0;
        var actualizados = 0;
        foreach (var (fila, existente, padreId) in planes)
        {
            if (existente is null)
            {
                db.ElementosCatalogo.Add(new ElementoCatalogo(checked(++siguienteId), tipo, fila.Codigo, fila.Nombre, padreId, fila.CodigoExterno, fila.Orden));
                creados++;
            }
            else if (EsDistinto(existente, fila, padreId))
            {
                existente.Actualizar(fila.Nombre, padreId, fila.CodigoExterno, fila.Orden);
                actualizados++;
            }
        }

        await db.SaveChangesAsync(ct);
        await transaccion.CommitAsync(ct);
        return new ResultadoImportacionCatalogoDto(tipo, creados, actualizados, filas.Count - creados - actualizados);
    }

    private static bool EsDistinto(ElementoCatalogo existente, FilaCsv fila, int? padreId) =>
        existente.Nombre != fila.Nombre || existente.PadreId != padreId || existente.CodigoExterno != fila.CodigoExterno || existente.Orden != fila.Orden;

    private static void ValidarTipo(TipoCatalogo tipo)
    {
        if (!Enum.IsDefined(tipo))
        {
            throw new ReglaNegocioException("El tipo de catálogo no existe.");
        }
    }

    private static async Task<List<FilaCsv>> LeerCsvAsync(Stream csv, CancellationToken ct)
    {
        using var contenido = new MemoryStream();
        var buffer = new byte[8192];
        int leidos;
        while ((leidos = await csv.ReadAsync(buffer.AsMemory(), ct)) > 0)
        {
            if (contenido.Length + leidos > MaximoBytesCsv)
            {
                throw new ReglaNegocioException("El CSV supera el máximo de 1 MiB.");
            }

            contenido.Write(buffer, 0, leidos);
        }

        contenido.Position = 0;
        var bytes = contenido.GetBuffer();
        if (contenido.Length >= 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF)
        {
            contenido.Position = 3;
        }

        try
        {
            using var lector = new TextFieldParser(contenido, new UTF8Encoding(false, true), detectEncoding: false)
            {
                TextFieldType = FieldType.Delimited,
                HasFieldsEnclosedInQuotes = true,
                TrimWhiteSpace = true,
            };
            lector.SetDelimiters(",");
            var cabecera = lector.ReadFields();
            if (cabecera is not null && cabecera.Length > 0)
            {
                cabecera[0] = cabecera[0].TrimStart('\uFEFF');
            }

            if (cabecera is null || !cabecera.SequenceEqual(Cabecera, StringComparer.OrdinalIgnoreCase))
            {
                throw new ReglaNegocioException("La cabecera debe ser: codigo,nombre,codigo_padre,codigo_externo.");
            }

            var filas = new List<FilaCsv>();
            var codigos = new HashSet<string>(StringComparer.Ordinal);
            while (!lector.EndOfData)
            {
                ct.ThrowIfCancellationRequested();
                var campos = lector.ReadFields();
                if (campos is null || campos.Length != 4 || filas.Count >= MaximoFilasCsv)
                {
                    throw new ReglaNegocioException("El CSV debe tener cuatro columnas por fila y como máximo 10.000 filas.");
                }

                var codigo = campos[0].Trim().ToUpperInvariant();
                var nombre = campos[1].Trim();
                var padre = campos[2].Trim().ToUpperInvariant();
                var externo = string.IsNullOrWhiteSpace(campos[3]) ? null : campos[3].Trim();
                if (codigo.Length is < 1 or > 50 || nombre.Length is < 1 or > 300 || padre.Length > 50 || externo?.Length > 50)
                {
                    throw new ReglaNegocioException($"Fila {filas.Count + 2}: código y nombre son obligatorios; los códigos admiten hasta 50 caracteres y el nombre hasta 300.");
                }

                if (!codigos.Add(codigo))
                {
                    throw new ReglaNegocioException($"Fila {filas.Count + 2}: el código está repetido en el CSV.");
                }

                filas.Add(new FilaCsv(codigo, nombre, padre, externo, filas.Count + 1));
            }

            if (filas.Count == 0)
            {
                throw new ReglaNegocioException("El CSV debe contener al menos un elemento.");
            }

            return filas;
        }
        catch (MalformedLineException)
        {
            throw new ReglaNegocioException("El CSV contiene una fila mal formada. Revise las comillas y las columnas.");
        }
        catch (DecoderFallbackException)
        {
            throw new ReglaNegocioException("El CSV debe estar codificado en UTF-8.");
        }
    }

    private sealed record FilaCsv(string Codigo, string Nombre, string CodigoPadre, string? CodigoExterno, int Orden);
}
