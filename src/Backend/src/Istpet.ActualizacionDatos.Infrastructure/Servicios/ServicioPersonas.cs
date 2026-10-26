namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using System.Globalization;
using System.IO.Compression;
using System.Text;
using System.Text.RegularExpressions;
using System.Xml;
using Istpet.ActualizacionDatos.Application;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Servicios;
using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Istpet.ActualizacionDatos.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

public class ServicioPersonas : IServicioPersonas
{
    private readonly AplicacionDbContext _context;
    private readonly IContextoInstitucion _contextoInstitucion;
    private readonly IServicioCuentaBancaria? _servicioCuentaBancaria;

    public ServicioPersonas(
        AplicacionDbContext context,
        IContextoInstitucion contextoInstitucion,
        IServicioCuentaBancaria? servicioCuentaBancaria = null)
    {
        _context = context;
        _contextoInstitucion = contextoInstitucion;
        _servicioCuentaBancaria = servicioCuentaBancaria;
    }

    public async Task<ResultadoCargaPersonasDto> CargarPersonasAsync(CargarPersonasRequest request, CancellationToken ct = default)
    {
        var institucionId = _contextoInstitucion.InstitucionId
            ?? throw new ReglaNegocioException("Se requiere una institución activa para cargar la lista de personas.");

        var totalRecibidos = request.Personas.Count;
        var documentosVistos = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var cargados = new List<string>();
        var advertencias = new List<AdvertenciaCargaDto>();
        var rechazos = new List<RechazoCargaDto>();
        var totalDuplicados = 0;
        var totalExistentesHabilitados = 0;

        // Cargar documentos existentes en la institución actual
        var existentesEnInstitucion = await _context.Personas
            .Where(p => p.InstitucionId == institucionId)
            .Select(p => p.Documento)
            .ToListAsync(ct);

        var setExistentes = new HashSet<string>(existentesEnInstitucion, StringComparer.OrdinalIgnoreCase);

        // ADR-0018: estar en la nómina habilita el acceso; las personas cargadas antes con acceso pendiente se habilitan al volver a cargarlas.
        var pendientesDeAcceso = (await _context.Personas
                .Where(p => p.InstitucionId == institucionId && p.Rol == RolUsuario.Usuario && !p.AccesoHabilitado)
                .ToListAsync(ct))
            .ToDictionary(p => p.Documento, StringComparer.OrdinalIgnoreCase);

        // Catálogos precargados para resolución eficiente en memoria
        var tiposFuncionario = await _context.TiposFuncionario
            .Where(tf => tf.InstitucionId == institucionId && tf.Activo)
            .ToListAsync(ct);

        var elementosCatalogo = await _context.ElementosCatalogo
            .Where(ec => ec.Activo)
            .ToListAsync(ct);

        for (var i = 0; i < request.Personas.Count; i++)
        {
            var item = request.Personas[i];
            var numeroFila = i + 1;

            // 1. Validación estricta del DNI / Documento (única causa para rechazar una fila según ADR-0012)
            if (string.IsNullOrWhiteSpace(item.Documento))
            {
                rechazos.Add(new RechazoCargaDto(numeroFila, "Documento no proporcionado o vacío"));
                continue;
            }

            var docLimpio = item.Documento.Trim();

            // Solo dígitos numéricos
            if (!docLimpio.All(char.IsAsciiDigit))
            {
                var anonimizado = docLimpio.Length > 4 ? docLimpio[^4..] : docLimpio;
                rechazos.Add(new RechazoCargaDto(numeroFila, "El documento contiene caracteres no numéricos", anonimizado));
                continue;
            }

            // Si tiene 9 dígitos, se autocompleta con un cero a la izquierda y se emite advertencia
            if (docLimpio.Length == 9)
            {
                docLimpio = "0" + docLimpio;
                advertencias.Add(new AdvertenciaCargaDto(numeroFila, "DNI", "DNI completado con cero inicial"));
            }

            if (docLimpio.Length != 10)
            {
                var anonimizado = docLimpio.Length > 4 ? docLimpio[^4..] : docLimpio;
                rechazos.Add(new RechazoCargaDto(numeroFila, $"El documento debe contener 10 dígitos (longitud actual: {docLimpio.Length})", anonimizado));
                continue;
            }

            // Documento repetido dentro del archivo: se rechaza la fila posterior (conservando la primera)
            if (!documentosVistos.Add(docLimpio))
            {
                var anonimizado = docLimpio[^4..];
                rechazos.Add(new RechazoCargaDto(numeroFila, "Documento repetido dentro del mismo archivo (se conserva la primera aparición)", anonimizado));
                continue;
            }

            // Persona que ya existe en la institución: se omite sin sobrescribir (PD-09)
            if (setExistentes.Contains(docLimpio))
            {
                totalDuplicados++;

                if (pendientesDeAcceso.Remove(docLimpio, out var personaPendiente))
                {
                    personaPendiente.HabilitarAcceso();
                    totalExistentesHabilitados++;
                }

                // Si no tenía cuenta bancaria y en el archivo vienen datos bancarios, se registran como propuesta (ADR-0013)
                if (_servicioCuentaBancaria != null && !string.IsNullOrWhiteSpace(item.NumCuentaBanco))
                {
                    var personaExistente = await _context.Personas.FirstOrDefaultAsync(p => p.InstitucionId == institucionId && p.Documento == docLimpio, ct);
                    if (personaExistente != null && !await _context.CuentasBancarias.AnyAsync(c => c.PersonaId == personaExistente.Id, ct))
                    {
                        await RegistrarCuentaPropuestaAsync(personaExistente.Id, item, elementosCatalogo, numeroFila, advertencias, ct);
                    }
                }

                continue;
            }

            // 2. Tratamiento de Nombre y división
            string? nombreOriginal = null;
            NombresDivididos nombresDivididos;
            if (string.IsNullOrWhiteSpace(item.Nombre))
            {
                advertencias.Add(new AdvertenciaCargaDto(numeroFila, "Nombre", "Nombre no especificado; campos de ficha personal en nulo"));
                nombresDivididos = new NombresDivididos(null, null, null, null, RequiereConfirmacion: true);
            }
            else
            {
                nombreOriginal = item.Nombre.Trim();
                nombresDivididos = DivisorNombres.Dividir(nombreOriginal);
                if (nombresDivididos.RequiereConfirmacion)
                {
                    advertencias.Add(new AdvertenciaCargaDto(numeroFila, "Nombre", "La división automática de nombres requiere confirmación"));
                }
            }

            // 3. Crear Persona
            var nuevaPersona = new Persona(
                Guid.NewGuid(),
                institucionId,
                docLimpio,
                RolUsuario.Usuario,
                nombreOriginal,
                item.Correo,
                accesoHabilitado: true, // ADR-0018: la carga por el admin de la institución habilita el acceso
                estadoActualizacion: EstadoActualizacion.Borrador);

            // El código explícito tiene prioridad; si no coincide, la fila se carga sin tipo (ADR-0012).
            if (!string.IsNullOrWhiteSpace(item.TipoFuncionarioCodigo))
            {
                var codigo = item.TipoFuncionarioCodigo.Trim().ToUpperInvariant();
                var tipo = tiposFuncionario.FirstOrDefault(tf => tf.Codigo == codigo);
                nuevaPersona.AsignarTipoFuncionario(tipo?.Id);
                if (tipo == null)
                {
                    advertencias.Add(new AdvertenciaCargaDto(numeroFila, "TipoFuncionarioCodigo", "Código sin tipo de funcionario activo en la institución"));
                }
            }
            // Compatibilidad con la nómina: resolver por cargo cuando no se indica código.
            else if (!string.IsNullOrWhiteSpace(item.CargoTrabajo))
            {
                var cargoNorm = NormalizarTexto(item.CargoTrabajo);
                var tfEncontrado = tiposFuncionario.FirstOrDefault(tf => NormalizarTexto(tf.Nombre) == cargoNorm);
                if (tfEncontrado != null)
                {
                    nuevaPersona.AsignarTipoFuncionario(tfEncontrado.Id);
                }
                else
                {
                    advertencias.Add(new AdvertenciaCargaDto(numeroFila, "Cargo de Trabajo", $"Cargo '{item.CargoTrabajo}' sin tipo de funcionario coincidente"));
                }
            }
            else
            {
                advertencias.Add(new AdvertenciaCargaDto(numeroFila, "Cargo de Trabajo", "Cargo de trabajo no especificado"));
            }

            // 5. Nacimiento
            DateOnly? fechaNacimiento = null;
            if (!string.IsNullOrWhiteSpace(item.Nacimiento))
            {
                if (TryParseFecha(item.Nacimiento.Trim(), out var parsedDate))
                {
                    if (parsedDate.Year >= 1900 && parsedDate <= DateTime.UtcNow.Date)
                    {
                        fechaNacimiento = DateOnly.FromDateTime(parsedDate);
                    }
                    else
                    {
                        advertencias.Add(new AdvertenciaCargaDto(numeroFila, "Nacimiento", $"Fecha de nacimiento '{item.Nacimiento}' fuera de rango válido"));
                    }
                }
                else
                {
                    advertencias.Add(new AdvertenciaCargaDto(numeroFila, "Nacimiento", $"Fecha de nacimiento '{item.Nacimiento}' con formato no reconocido"));
                }
            }
            else
            {
                advertencias.Add(new AdvertenciaCargaDto(numeroFila, "Nacimiento", "Fecha de nacimiento vacía"));
            }

            // 6. Estado Civil
            int? estadoCivilId = null;
            if (!string.IsNullOrWhiteSpace(item.EstadoCivil))
            {
                var ecNorm = NormalizarTexto(item.EstadoCivil);
                var ecEncontrado = elementosCatalogo.FirstOrDefault(ec =>
                    ec.Tipo == TipoCatalogo.EstadoCivil &&
                    (NormalizarTexto(ec.Nombre) == ecNorm || NormalizarTexto(ec.Codigo) == ecNorm));

                if (ecEncontrado != null)
                {
                    estadoCivilId = ecEncontrado.Id;
                }
                else
                {
                    advertencias.Add(new AdvertenciaCargaDto(numeroFila, "Estado Civil", $"Estado civil '{item.EstadoCivil}' no coincide con el catálogo"));
                }
            }
            else
            {
                advertencias.Add(new AdvertenciaCargaDto(numeroFila, "Estado Civil", "Estado civil no especificado"));
            }

            // 7. Sangre
            int? tipoSangreId = null;
            if (!string.IsNullOrWhiteSpace(item.Sangre))
            {
                var sangreLimpia = item.Sangre.Trim().Replace(" ", "", StringComparison.Ordinal);
                var sangreEncontrada = elementosCatalogo.FirstOrDefault(ec =>
                    ec.Tipo == TipoCatalogo.TipoSangre &&
                    (string.Equals(ec.Nombre.Replace(" ", "", StringComparison.Ordinal), sangreLimpia, StringComparison.OrdinalIgnoreCase) ||
                     string.Equals(ec.Codigo.Replace(" ", "", StringComparison.Ordinal), sangreLimpia, StringComparison.OrdinalIgnoreCase)));

                if (sangreEncontrada != null)
                {
                    tipoSangreId = sangreEncontrada.Id;
                }
                else
                {
                    advertencias.Add(new AdvertenciaCargaDto(numeroFila, "Sangre", $"Tipo de sangre '{item.Sangre}' no coincide con el catálogo"));
                }
            }
            else
            {
                advertencias.Add(new AdvertenciaCargaDto(numeroFila, "Sangre", "Tipo de sangre no especificado"));
            }

            // 8. Nacionalidad
            int? paisNacionalidadId = null;
            if (!string.IsNullOrWhiteSpace(item.Nacionalidad))
            {
                var nacNorm = NormalizarTexto(item.Nacionalidad);
                var paisEncontrado = elementosCatalogo.FirstOrDefault(ec =>
                    ec.Tipo == TipoCatalogo.Pais &&
                    (NormalizarTexto(ec.Nombre) == nacNorm ||
                     NormalizarTexto(ec.Codigo) == nacNorm ||
                     EsGentilicioCoincidente(nacNorm, NormalizarTexto(ec.Nombre))));

                if (paisEncontrado != null)
                {
                    paisNacionalidadId = paisEncontrado.Id;
                }
                else
                {
                    advertencias.Add(new AdvertenciaCargaDto(numeroFila, "Nacionalidad", $"Nacionalidad '{item.Nacionalidad}' no coincide con el catálogo"));
                }
            }
            else
            {
                advertencias.Add(new AdvertenciaCargaDto(numeroFila, "Nacionalidad", "Nacionalidad no especificada"));
            }

            // 9. Dirección
            string? callePrincipal = null;
            if (!string.IsNullOrWhiteSpace(item.Direccion))
            {
                var dir = item.Direccion.Trim();
                if (dir.Length <= 200)
                {
                    callePrincipal = dir;
                }
                else
                {
                    advertencias.Add(new AdvertenciaCargaDto(numeroFila, "Dirección", "Dirección excede el límite máximo de 200 caracteres"));
                }
            }
            else
            {
                advertencias.Add(new AdvertenciaCargaDto(numeroFila, "Dirección", "Dirección no especificada"));
            }

            // 10. Teléfono 2
            string? celular = null;
            string? telefonoConvencional = null;
            if (!string.IsNullOrWhiteSpace(item.Telefono2))
            {
                var telLimpio = new string(item.Telefono2.Where(char.IsAsciiDigit).ToArray());
                if (telLimpio.StartsWith("09", StringComparison.Ordinal) && telLimpio.Length == 10)
                {
                    celular = telLimpio;
                }
                else if (telLimpio.Length is >= 7 and <= 10)
                {
                    telefonoConvencional = telLimpio;
                }
                else
                {
                    advertencias.Add(new AdvertenciaCargaDto(numeroFila, "Teléfono 2", $"Teléfono '{item.Telefono2}' con formato no reconocido"));
                }
            }
            else
            {
                advertencias.Add(new AdvertenciaCargaDto(numeroFila, "Teléfono 2", "Teléfono 2 no especificado"));
            }

            // 11. Crear FichaPersonal con datos propuestos
            var ficha = new FichaPersonal(institucionId, nuevaPersona.Id);
            ficha.Actualizar(new DatosFichaPersonal(
                PrimerNombre: nombresDivididos.PrimerNombre,
                SegundoNombre: nombresDivididos.SegundoNombre,
                PrimerApellido: nombresDivididos.PrimerApellido,
                SegundoApellido: nombresDivididos.SegundoApellido,
                FechaNacimiento: fechaNacimiento,
                EstadoCivilId: estadoCivilId,
                TipoSangreId: tipoSangreId,
                PaisNacionalidadId: paisNacionalidadId,
                CallePrincipal: callePrincipal,
                Celular: celular,
                TelefonoConvencional: telefonoConvencional));

            _context.Personas.Add(nuevaPersona);
            _context.FichasPersonales.Add(ficha);

            // 12. Registrar propuesta de cuenta bancaria si viene en la nómina (ADR-0013 Dec. 7)
            await RegistrarCuentaPropuestaAsync(nuevaPersona.Id, item, elementosCatalogo, numeroFila, advertencias, ct);

            setExistentes.Add(docLimpio);
            cargados.Add(docLimpio);
        }

        await _context.SaveChangesAsync(ct);

        return new ResultadoCargaPersonasDto(
            totalRecibidos,
            cargados.Count,
            rechazos.Count,
            totalDuplicados,
            advertencias,
            rechazos,
            cargados,
            totalExistentesHabilitados);
    }

    public async Task<ResultadoCargaPersonasDto> CargarDesdeArchivoAsync(Stream stream, string nombreArchivo, CancellationToken ct = default)
    {
        List<PersonaCargaItem> items;
        if (nombreArchivo.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase))
        {
            items = ParsearExcel(stream);
        }
        else
        {
            items = ParsearCsv(stream);
        }

        if (items.Count == 0)
        {
            throw new ReglaNegocioException("No se encontraron registros válidos ni columnas reconocidas en el archivo.");
        }

        return await CargarPersonasAsync(new CargarPersonasRequest(items), ct);
    }

    private async Task RegistrarCuentaPropuestaAsync(
        Guid personaId,
        PersonaCargaItem item,
        List<ElementoCatalogo> elementosCatalogo,
        int numeroFila,
        List<AdvertenciaCargaDto> advertencias,
        CancellationToken ct)
    {
        if (_servicioCuentaBancaria == null || string.IsNullOrWhiteSpace(item.NumCuentaBanco))
        {
            return;
        }

        var numLimpio = new string(item.NumCuentaBanco.Where(char.IsAsciiDigit).ToArray());
        if (numLimpio.Length < 4)
        {
            return;
        }

        var tipoCuentaId = 71; // Ahorros por defecto (ADR-0013)
        if (!string.IsNullOrWhiteSpace(item.TipoCuentaBanco))
        {
            var tcNorm = NormalizarTexto(item.TipoCuentaBanco);
            var tc = elementosCatalogo.FirstOrDefault(e => e.Tipo == TipoCatalogo.TipoCuentaBancaria && NormalizarTexto(e.Nombre) == tcNorm);
            if (tc != null)
            {
                tipoCuentaId = tc.Id;
            }
            else if (tcNorm.Contains("corrient"))
            {
                tipoCuentaId = 72;
            }
        }

        int? bancoId = null;
        string? nombreBancoOtro = null;
        if (!string.IsNullOrWhiteSpace(item.Banco))
        {
            var bNorm = NormalizarTexto(item.Banco);
            var b = elementosCatalogo.FirstOrDefault(e => e.Tipo == TipoCatalogo.Banco && NormalizarTexto(e.Nombre) == bNorm);
            if (b != null)
            {
                bancoId = b.Id;
            }
            else
            {
                nombreBancoOtro = item.Banco.Trim();
            }
        }

        try
        {
            await _servicioCuentaBancaria.RegistrarPropuestaNominaAsync(
                personaId,
                new CuentaNominaPropuesta(tipoCuentaId, numLimpio, bancoId, nombreBancoOtro),
                ct);
        }
        catch (CuentaBancariaNoDisponibleException)
        {
            advertencias.Add(new AdvertenciaCargaDto(numeroFila, "Cuenta Bancaria", "Módulo de cuenta bancaria no disponible"));
        }
        catch (ReglaNegocioException ex)
        {
            advertencias.Add(new AdvertenciaCargaDto(numeroFila, "Cuenta Bancaria", ex.Message));
        }
    }

    private static List<PersonaCargaItem> ParsearExcel(Stream stream)
    {
        var items = new List<PersonaCargaItem>();
        using var archive = new ZipArchive(stream, ZipArchiveMode.Read, leaveOpen: true);

        var sharedStrings = new List<string>();
        var sharedEntry = archive.GetEntry("xl/sharedStrings.xml");
        if (sharedEntry != null)
        {
            using var ssStream = sharedEntry.Open();
            var docXml = new XmlDocument();
            docXml.Load(ssStream);
            var siNodes = docXml.GetElementsByTagName("si");
            foreach (XmlNode si in siNodes)
            {
                var tNode = si["t"];
                if (tNode != null)
                {
                    sharedStrings.Add(tNode.InnerText);
                }
                else
                {
                    var sb = new StringBuilder();
                    foreach (XmlNode child in si.ChildNodes)
                    {
                        if (child.Name == "r" && child["t"] != null)
                        {
                            sb.Append(child["t"]!.InnerText);
                        }
                    }
                    sharedStrings.Add(sb.ToString());
                }
            }
        }

        var sheetEntry = archive.GetEntry("xl/worksheets/sheet1.xml")
            ?? archive.Entries.FirstOrDefault(e => e.FullName.StartsWith("xl/worksheets/sheet", StringComparison.OrdinalIgnoreCase));
        if (sheetEntry == null) return items;

        using var sheetStream = sheetEntry.Open();
        var sheetDoc = new XmlDocument();
        sheetDoc.Load(sheetStream);

        var rowNodes = sheetDoc.GetElementsByTagName("row");
        var columnaPorEncabezado = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        int filaEncabezado = -1;

        for (int i = 0; i < Math.Min(10, rowNodes.Count); i++)
        {
            var row = rowNodes[i]!;
            var celdasFila = ObtenerCeldasFila(row, sharedStrings);
            foreach (var kvp in celdasFila)
            {
                var valNorm = NormalizarTexto(kvp.Value);
                if (valNorm == "dni" || valNorm == "documento" || valNorm == "cedula")
                {
                    filaEncabezado = i;
                    break;
                }
            }

            if (filaEncabezado != -1)
            {
                foreach (var kvp in celdasFila)
                {
                    var key = MapearNombreColumna(kvp.Value);
                    if (!string.IsNullOrEmpty(key) && !columnaPorEncabezado.ContainsKey(key))
                    {
                        columnaPorEncabezado[key] = kvp.Key;
                    }
                }
                break;
            }
        }

        if (filaEncabezado == -1) return items;

        for (int i = filaEncabezado + 1; i < rowNodes.Count; i++)
        {
            var row = rowNodes[i]!;
            var celdas = ObtenerCeldasFila(row, sharedStrings);

            string? ObtenerValor(string clave)
            {
                if (columnaPorEncabezado.TryGetValue(clave, out var col) && celdas.TryGetValue(col, out var v))
                {
                    var limpio = v.Trim();
                    return limpio.Equals("NULL", StringComparison.OrdinalIgnoreCase) || limpio.Equals("N/A", StringComparison.OrdinalIgnoreCase) || limpio == "-" ? null : limpio;
                }
                return null;
            }

            var doc = ObtenerValor("documento");
            if (string.IsNullOrWhiteSpace(doc)) continue;

            items.Add(new PersonaCargaItem(
                Documento: doc,
                Nombre: ObtenerValor("nombre"),
                CargoTrabajo: ObtenerValor("cargo"),
                Nacimiento: ObtenerValor("nacimiento"),
                Edad: ObtenerValor("edad"),
                EstadoCivil: ObtenerValor("estadocivil"),
                Estudios: ObtenerValor("estudios"),
                Nacionalidad: ObtenerValor("nacionalidad"),
                Direccion: ObtenerValor("direccion"),
                Ciudad: ObtenerValor("ciudad"),
                Sangre: ObtenerValor("sangre"),
                FecIngreso: ObtenerValor("fecingreso"),
                Telefono2: ObtenerValor("telefono2"),
                TipoCuentaBanco: ObtenerValor("tipocuenta"),
                Banco: ObtenerValor("banco"),
                NumCuentaBanco: ObtenerValor("numcuenta")));
        }

        return items;
    }

    private static Dictionary<string, string> ObtenerCeldasFila(XmlNode row, List<string> sharedStrings)
    {
        var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (XmlNode c in row.ChildNodes)
        {
            if (c.Name != "c") continue;
            var rAttr = c.Attributes?["r"]?.Value;
            if (string.IsNullOrEmpty(rAttr)) continue;
            var colLetter = Regex.Replace(rAttr, @"[\d]", "");

            var tAttr = c.Attributes?["t"]?.Value;
            var vNode = c["v"];
            var valor = "";
            if (vNode != null)
            {
                if (tAttr == "s" && int.TryParse(vNode.InnerText, out var idx) && idx >= 0 && idx < sharedStrings.Count)
                {
                    valor = sharedStrings[idx];
                }
                else
                {
                    valor = vNode.InnerText;
                }
            }
            dict[colLetter] = valor;
        }
        return dict;
    }

    private static List<PersonaCargaItem> ParsearCsv(Stream stream)
    {
        var items = new List<PersonaCargaItem>();
        using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, leaveOpen: true);
        string? linea;
        var delimitador = ',';
        var encabezados = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var fila = 0;

        while ((linea = reader.ReadLine()) != null)
        {
            fila++;
            if (string.IsNullOrWhiteSpace(linea)) continue;

            if (fila <= 10 && encabezados.Count == 0)
            {
                delimitador = linea.Contains(';') ? ';' : (linea.Contains('\t') ? '\t' : ',');
                var partes = linea.Split(delimitador);
                var tieneDoc = false;
                for (int i = 0; i < partes.Length; i++)
                {
                    var mapeado = MapearNombreColumna(partes[i].Trim());
                    if (mapeado == "documento")
                    {
                        tieneDoc = true;
                        break;
                    }
                }

                if (tieneDoc)
                {
                    for (int j = 0; j < partes.Length; j++)
                    {
                        var key = MapearNombreColumna(partes[j].Trim());
                        if (!string.IsNullOrEmpty(key) && !encabezados.ContainsKey(key))
                        {
                            encabezados[key] = j;
                        }
                    }
                }
                continue;
            }

            if (encabezados.Count == 0) continue;

            var cols = linea.Split(delimitador);
            string? Val(string clave)
            {
                if (encabezados.TryGetValue(clave, out var idx) && idx < cols.Length)
                {
                    var l = cols[idx].Trim().Trim('"');
                    return l.Equals("NULL", StringComparison.OrdinalIgnoreCase) || l.Equals("N/A", StringComparison.OrdinalIgnoreCase) || l == "-" ? null : l;
                }
                return null;
            }

            var doc = Val("documento");
            if (string.IsNullOrWhiteSpace(doc)) continue;

            items.Add(new PersonaCargaItem(
                Documento: doc,
                Nombre: Val("nombre"),
                CargoTrabajo: Val("cargo"),
                Nacimiento: Val("nacimiento"),
                Edad: Val("edad"),
                EstadoCivil: Val("estadocivil"),
                Estudios: Val("estudios"),
                Nacionalidad: Val("nacionalidad"),
                Direccion: Val("direccion"),
                Ciudad: Val("ciudad"),
                Sangre: Val("sangre"),
                FecIngreso: Val("fecingreso"),
                Telefono2: Val("telefono2"),
                TipoCuentaBanco: Val("tipocuenta"),
                Banco: Val("banco"),
                NumCuentaBanco: Val("numcuenta")));
        }

        return items;
    }

    private static string MapearNombreColumna(string texto)
    {
        var n = NormalizarTexto(texto);
        if (n == "dni" || n == "documento" || n == "cedula") return "documento";
        if (n == "nombre" || n.Contains("apellidos")) return "nombre";
        if (n.Contains("cargo")) return "cargo";
        if (n.Contains("nacimiento")) return "nacimiento";
        if (n == "edad") return "edad";
        if (n.Contains("estado civil") || n == "estadocivil") return "estadocivil";
        if (n.Contains("estudio") || n.Contains("instruccion")) return "estudios";
        if (n.Contains("nacionalidad") || n.Contains("pais")) return "nacionalidad";
        if (n.Contains("direccion") || n.Contains("domicilio")) return "direccion";
        if (n.Contains("ciudad") || n.Contains("canton")) return "ciudad";
        if (n.Contains("sangre")) return "sangre";
        if (n.Contains("ingreso")) return "fecingreso";
        if (n.Contains("telefono") || n.Contains("celular")) return "telefono2";
        if (n.Contains("tipo") && n.Contains("cuenta")) return "tipocuenta";
        if (n == "banco" || n.Contains("institucion financiera")) return "banco";
        if (n.Contains("num") && n.Contains("cuenta")) return "numcuenta";
        return n;
    }

    public async Task<List<PersonaDto>> ListarPersonasAsync(CancellationToken ct = default)
    {
        var personas = await _context.Personas
            .OrderBy(p => p.Documento)
            .ToListAsync(ct);

        var idsPersonasConFicha = (await _context.FichasPersonales
            .Select(f => f.PersonaId)
            .ToListAsync(ct))
            .ToHashSet();

        return personas.Select(p => new PersonaDto(
            p.Id,
            p.InstitucionId.Valor,
            p.Documento,
            p.Nombre,
            p.Correo,
            p.Rol.ToString(),
            p.AccesoHabilitado,
            p.EstadoActualizacion.ToString(),
            p.FechaCreacionUtc,
            idsPersonasConFicha.Contains(p.Id))).ToList();
    }

    private static string NormalizarTexto(string texto)
    {
        var normalizada = texto.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();
        foreach (var c in normalizada)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
            {
                sb.Append(c);
            }
        }

        return sb.ToString().Normalize(NormalizationForm.FormC);
    }

    private static bool TryParseFecha(string valor, out DateTime fecha)
    {
        if (double.TryParse(valor, NumberStyles.Float, CultureInfo.InvariantCulture, out var serial) && serial is >= 1 and <= 100000)
        {
            try
            {
                fecha = DateTime.FromOADate(serial).Date;
                return true;
            }
            catch
            {
                // continuar con parseo estandar
            }
        }

        string[] formatos = ["dd/MM/yyyy", "d/M/yyyy", "dd-MM-yyyy", "d-M-yyyy", "yyyy-MM-dd", "yyyy/MM/dd", "yyyyMMdd"];
        return DateTime.TryParseExact(
            valor,
            formatos,
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out fecha) || DateTime.TryParse(valor, new CultureInfo("es-EC"), DateTimeStyles.None, out fecha);
    }

    private static bool EsGentilicioCoincidente(string gentilicioNorm, string paisNorm)
    {
        if (paisNorm == "ecuador" && (gentilicioNorm.Contains("ecuator") || gentilicioNorm == "ec"))
        {
            return true;
        }

        if (paisNorm == "colombia" && gentilicioNorm.Contains("colomb"))
        {
            return true;
        }

        if (paisNorm == "peru" && gentilicioNorm.Contains("peru"))
        {
            return true;
        }

        if (paisNorm == "venezuela" && gentilicioNorm.Contains("venezol"))
        {
            return true;
        }

        return gentilicioNorm.Contains(paisNorm) || paisNorm.Contains(gentilicioNorm);
    }
}
