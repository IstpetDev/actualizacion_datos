namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using System.Globalization;
using System.Text;
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

    public ServicioPersonas(
        AplicacionDbContext context,
        IContextoInstitucion contextoInstitucion)
    {
        _context = context;
        _contextoInstitucion = contextoInstitucion;
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

        // Cargar documentos existentes en la institución actual
        var existentesEnInstitucion = await _context.Personas
            .Where(p => p.InstitucionId == institucionId)
            .Select(p => p.Documento)
            .ToListAsync(ct);

        var setExistentes = new HashSet<string>(existentesEnInstitucion, StringComparer.OrdinalIgnoreCase);

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
                accesoHabilitado: false, // RF-MUL-002: Espera habilitación del superadmin
                estadoActualizacion: EstadoActualizacion.Borrador);

            // 4. Cargo de Trabajo
            if (!string.IsNullOrWhiteSpace(item.CargoTrabajo))
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
            cargados);
    }

    public async Task<List<PersonaDto>> ListarPersonasAsync(CancellationToken ct = default)
    {
        var personas = await _context.Personas
            .OrderBy(p => p.Documento)
            .ToListAsync(ct);

        return personas.Select(p => new PersonaDto(
            p.Id,
            p.InstitucionId.Valor,
            p.Documento,
            p.Nombre,
            p.Correo,
            p.Rol.ToString(),
            p.AccesoHabilitado,
            p.EstadoActualizacion.ToString(),
            p.FechaCreacionUtc)).ToList();
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
