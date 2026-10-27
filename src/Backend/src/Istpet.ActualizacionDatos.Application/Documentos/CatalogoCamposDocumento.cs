namespace Istpet.ActualizacionDatos.Application.Documentos;

/// <summary>
/// RF-PLA-005: Catálogo cerrado de secciones y campos permitidos para la generación del documento de hoja de vida.
/// Se prohíbe explícitamente incluir cuenta bancaria, tipo de sangre, etnia, discapacidad, correo personal o datos de acceso.
/// </summary>
public static class CatalogoCamposDocumento
{
    public const string DisenoClasico = "clasico";

    public static readonly IReadOnlySet<string> DisenosBaseSoportados = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        DisenoClasico
    };

    public static class Secciones
    {
        public const string Portada = "portada";
        public const string DatosPersonales = "datos_personales";
        public const string Perfil = "perfil";
        public const string Compromiso = "compromiso";
        public const string Formacion = "formacion";
        public const string Experiencia = "experiencia";
        public const string Capacitaciones = "capacitaciones";
        public const string Referencias = "referencias";
        public const string Anexos = "anexos";
    }

    public static class CamposPortada
    {
        public const string NombreCompleto = "nombre_completo";
        public const string TipoPersonal = "tipo_personal";
    }

    public static class CamposDatosPersonales
    {
        public const string Foto = "foto";
        public const string DocumentoIdentidad = "documento_identidad";
        public const string LugarFechaNacimiento = "lugar_fecha_nacimiento";
        public const string EstadoCivil = "estado_civil";
        public const string CiudadDireccion = "ciudad_direccion";
        public const string TelefonoEmail = "telefono_email";
        public const string RegistroSenescyt = "registro_senescyt";
    }

    public static class CamposPerfil
    {
        public const string TextoPerfil = "texto_perfil";
    }

    public static class CamposCompromiso
    {
        public const string TextoCompromiso = "texto_compromiso";
        public const string BloqueFirma = "bloque_firma";
    }

    public static class CamposFormacion
    {
        public const string ListaTitulos = "lista_titulos";
    }

    public static class CamposExperiencia
    {
        public const string ListaExperiencias = "lista_experiencias";
    }

    public static class CamposCapacitaciones
    {
        public const string ListaCapacitaciones = "lista_capacitaciones";
    }

    public static class CamposReferencias
    {
        public const string ListaReferencias = "lista_referencias";
    }

    public static class CamposAnexos
    {
        public const string PortadaAnexos = "portada_anexos";
    }

    private static readonly Dictionary<string, HashSet<string>> MapaSeccionesYCampos = new(StringComparer.OrdinalIgnoreCase)
    {
        [Secciones.Portada] = new(StringComparer.OrdinalIgnoreCase)
        {
            CamposPortada.NombreCompleto,
            CamposPortada.TipoPersonal
        },
        [Secciones.DatosPersonales] = new(StringComparer.OrdinalIgnoreCase)
        {
            CamposDatosPersonales.Foto,
            CamposDatosPersonales.DocumentoIdentidad,
            CamposDatosPersonales.LugarFechaNacimiento,
            CamposDatosPersonales.EstadoCivil,
            CamposDatosPersonales.CiudadDireccion,
            CamposDatosPersonales.TelefonoEmail,
            CamposDatosPersonales.RegistroSenescyt
        },
        [Secciones.Perfil] = new(StringComparer.OrdinalIgnoreCase)
        {
            CamposPerfil.TextoPerfil
        },
        [Secciones.Compromiso] = new(StringComparer.OrdinalIgnoreCase)
        {
            CamposCompromiso.TextoCompromiso,
            CamposCompromiso.BloqueFirma
        },
        [Secciones.Formacion] = new(StringComparer.OrdinalIgnoreCase)
        {
            CamposFormacion.ListaTitulos
        },
        [Secciones.Experiencia] = new(StringComparer.OrdinalIgnoreCase)
        {
            CamposExperiencia.ListaExperiencias
        },
        [Secciones.Capacitaciones] = new(StringComparer.OrdinalIgnoreCase)
        {
            CamposCapacitaciones.ListaCapacitaciones
        },
        [Secciones.Referencias] = new(StringComparer.OrdinalIgnoreCase)
        {
            CamposReferencias.ListaReferencias
        },
        [Secciones.Anexos] = new(StringComparer.OrdinalIgnoreCase)
        {
            CamposAnexos.PortadaAnexos
        }
    };

    /// <summary>
    /// Campos prohibidos expresamente por RF-PLA-005, ADR-0013 y políticas de minimización de datos.
    /// </summary>
    public static readonly IReadOnlySet<string> CamposProhibidos = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "cuenta_bancaria",
        "tipo_sangre",
        "etnia",
        "discapacidad",
        "nacionalidad_indigena",
        "carnet_discapacidad",
        "correo_personal",
        "password",
        "clave"
    };

    public static bool EsDisenoSoportado(string? diseno) =>
        !string.IsNullOrWhiteSpace(diseno) && DisenosBaseSoportados.Contains(diseno);

    public static bool EsSeccionValida(string? seccion) =>
        !string.IsNullOrWhiteSpace(seccion) && MapaSeccionesYCampos.ContainsKey(seccion);

    public static bool EsCampoValido(string? seccion, string? campo)
    {
        if (string.IsNullOrWhiteSpace(seccion) || string.IsNullOrWhiteSpace(campo)) return false;
        return MapaSeccionesYCampos.TryGetValue(seccion, out var campos) && campos.Contains(campo);
    }

    public static bool ContieneCampoEnCualquierSeccion(string campo)
    {
        if (string.IsNullOrWhiteSpace(campo)) return false;
        return MapaSeccionesYCampos.Values.Any(c => c.Contains(campo));
    }

    public static IReadOnlyCollection<string> ObtenerCamposDeSeccion(string seccion)
    {
        return MapaSeccionesYCampos.TryGetValue(seccion, out var campos)
            ? campos.ToList()
            : Array.Empty<string>();
    }
}
