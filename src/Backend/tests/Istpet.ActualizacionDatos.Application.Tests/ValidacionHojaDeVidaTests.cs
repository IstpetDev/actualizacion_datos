namespace Istpet.ActualizacionDatos.Application.Tests;

using System.Text.Json;
using Istpet.ActualizacionDatos.Application.Modelos;
using Istpet.ActualizacionDatos.Application.Validacion;

public sealed class ValidacionHojaDeVidaTests
{
    private static readonly JsonSerializerOptions Opciones = new(JsonSerializerDefaults.Web) { DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull };
    private static PoliticaValidacionDto Politica => ValidacionHojaDeVida.Politica(Guid.NewGuid(), ["institucion-ficticia.example"], new DateTimeOffset(2026, 10, 26, 17, 0, 0, TimeSpan.Zero));

    public static TheoryData<string, string, bool> Casos => new()
    {
        { "Celular", "0900000000", true }, { "Celular", "0999999999", true }, { "Celular", "0800000000", false },
        { "Celular", "090000000", false }, { "Celular", "09000000000", false }, { "Celular", "09abcdefgh", false },
        { "Celular", "٠٩٠٠٠٠٠٠٠٠", false }, { "Celular", "09 0000000", false },
        { "TelefonoConvencional", "020000000", true }, { "TelefonoConvencional", "070000000", true },
        { "TelefonoConvencional", "010000000", false }, { "TelefonoConvencional", "080000000", false },
        { "TelefonoConvencional", "02000000", false }, { "TelefonoConvencional", "02abc0000", false },
        { "CodigoPostal", "000001", true }, { "CodigoPostal", "1", true }, { "CodigoPostal", "1234567", false },
        { "CodigoPostal", "170306ssssss", false }, { "CodigoPostal", "１２３", false }, { "CodigoPostal", "12 34", false },
        { "PrimerNombre", "Nombre Fictício-Ñ", true }, { "SegundoNombre", "D’Ensayo", true },
        { "PrimerApellido", "D'Ensayo", true }, { "SegundoApellido", "Apellido Ficticio", true },
        { "PrimerNombre", "Nombre1", false }, { "SegundoNombre", "Nombre@", false },
        { "PrimerApellido", "Apellido2", false }, { "SegundoApellido", "Apellido/", false }, { "PrimerNombre", "---", false },
        { "PrimerNombre", "Nombre\tFicticio", false }, { "CallePrincipal", "Calle ficticia 1", true },
        { "CallePrincipal", "Calle\nFicticia", false }, { "NumeroCasa", "S/N", true }, { "NumeroCasa", "1\0", false },
        { "CorreoInstitucional", "persona.ficticia@institucion-ficticia.example", true },
        { "CorreoInstitucional", "PERSONA@INSTITUCION-FICTICIA.EXAMPLE", true },
        { "CorreoInstitucional", "persona@otra-ficticia.example", false },
        { "CorreoInstitucional", "a@b@institucion-ficticia.example", false },
        { "CorreoInstitucional", "a@sub.institucion-ficticia.example", false },
        { "CorreoInstitucional", "a..b@institucion-ficticia.example", false },
        { "CorreoInstitucional", "a@institucion-ficticia.example.", false },
        { "CorreoInstitucional", "a\n@institucion-ficticia.example", false },
        { "CorreoPersonal", "persona.ficticia@gmail.com", true },
        { "CorreoPersonal", "otro.correo@correo-personal.org", true },
        { "CorreoPersonal", "invalido-sin-arroba", false },
        { "CorreoPersonal", "invalido@dos@arrobas.com", false },
    };

    [Theory, MemberData(nameof(Casos))]
    public void Tabla_de_formatos_por_campo(string campo, string valor, bool valido)
    {
        var request = JsonSerializer.Deserialize<GuardarFichaPersonalRequest>(JsonSerializer.Serialize(new Dictionary<string, string> { [campo] = valor }))!;
        var errores = ValidacionHojaDeVida.Evaluar(request, "ficha", Politica);
        Assert.Equal(valido, errores.Count == 0);
        if (!valido) Assert.Contains(char.ToLowerInvariant(campo[0]) + campo[1..], errores.Keys);
    }

    [Theory]
    [InlineData(1900, 1, 1, true)]
    [InlineData(1899, 12, 31, false)]
    [InlineData(2008, 10, 26, true)]
    [InlineData(2008, 10, 27, false)]
    [InlineData(2026, 10, 27, false)]
    [InlineData(2008, 2, 29, true)]
    public void Nacimiento_respeta_limites_y_cumpleanos(int ano, int mes, int dia, bool valido) =>
        Assert.Equal(valido, ValidacionHojaDeVida.Evaluar(new GuardarFichaPersonalRequest(FechaNacimiento: new DateOnly(ano, mes, dia)), "ficha", Politica).Count == 0);

    [Fact]
    public void Limites_se_calculan_en_Ecuador_y_no_en_UTC()
    {
        var politica = ValidacionHojaDeVida.Politica(Guid.NewGuid(), [], new DateTimeOffset(2026, 10, 27, 2, 0, 0, TimeSpan.Zero));
        Assert.Equal(new DateOnly(2008, 10, 26), politica.FechaNacimientoMaxima);
        var bisiesto = ValidacionHojaDeVida.Politica(Guid.NewGuid(), [], new DateTimeOffset(2024, 2, 29, 12, 0, 0, TimeSpan.Zero));
        Assert.Equal(new DateOnly(2006, 2, 28), bisiesto.FechaNacimientoMaxima);
    }

    [Theory]
    [InlineData("ficha", "PrimerNombre", 100)]
    [InlineData("ficha", "SegundoNombre", 100)]
    [InlineData("ficha", "PrimerApellido", 100)]
    [InlineData("ficha", "SegundoApellido", 100)]
    [InlineData("referencia", "NombresApellidos", 300)]
    [InlineData("tituloEnCurso", "NombrePrograma", 300)]
    [InlineData("tituloEnCurso", "NombreInstitucionOtra", 300)]
    [InlineData("experiencia", "Funciones", 4000)]
    [InlineData("documento", "NumeroDocumento", 100)]
    [InlineData("documento", "EntidadEmisora", 150)]
    [InlineData("documento", "CategoriaLicencia", 30)]
    [InlineData("cuenta", "NombreBancoOtro", 200)]
    [InlineData("ficha", "NumeroCarnetDiscapacidad", 30)]
    [InlineData("ficha", "CallePrincipal", 200)]
    [InlineData("ficha", "CalleSecundaria", 200)]
    [InlineData("ficha", "NumeroCasa", 20)]
    [InlineData("ficha", "ReferenciaDomicilio", 300)]
    [InlineData("titulo", "NombreTitulo", 300)]
    [InlineData("titulo", "NombreInstitucionOtra", 300)]
    [InlineData("titulo", "NumeroRegistroSenescyt", 50)]
    [InlineData("capacitacion", "NombreEvento", 300)]
    [InlineData("capacitacion", "InstitucionOrganizadora", 300)]
    [InlineData("capacitacion", "Lugar", 200)]
    [InlineData("referencia", "Titulo", 200)]
    [InlineData("referencia", "CargoActual", 200)]
    [InlineData("referencia", "Empresa", 300)]
    [InlineData("experiencia", "Empleador", 300)]
    [InlineData("experiencia", "Cargo", 200)]
    [InlineData("experiencia", "Ciudad", 150)]
    public void Campos_texto_comprueban_limite_y_controles(string seccion, string campo, int maximo)
    {
        var tipo = seccion switch { "ficha" => typeof(GuardarFichaPersonalRequest), "titulo" => typeof(GuardarTituloAcademicoRequest), "capacitacion" => typeof(GuardarCapacitacionRequest), "referencia" => typeof(GuardarReferenciaRequest), "tituloEnCurso" => typeof(GuardarTituloEnCursoRequest), "documento" => typeof(GuardarDocumentoPersonalRequest), "cuenta" => typeof(GuardarCuentaBancariaRequest), _ => typeof(GuardarExperienciaLaboralRequest) };
        object Datos(string valor)
        {
            var valores = new Dictionary<string, object> { [campo] = valor };
            if (seccion == "experiencia") valores["TrabajaActualmente"] = true;
            return JsonSerializer.Deserialize(JsonSerializer.Serialize(valores), tipo)!;
        }
        var clave = char.ToLowerInvariant(campo[0]) + campo[1..];
        Assert.DoesNotContain(clave, ValidacionHojaDeVida.Evaluar(Datos(new string('a', maximo)), seccion, Politica).Keys);
        Assert.Contains(clave, ValidacionHojaDeVida.Evaluar(Datos(new string('a', maximo + 1)), seccion, Politica).Keys);
        Assert.Contains(clave, ValidacionHojaDeVida.Evaluar(Datos("Texto\0"), seccion, Politica).Keys);
    }

    [Theory]
    [InlineData("0900000000", true)]
    [InlineData("020000000", true)]
    [InlineData("080000000", false)]
    [InlineData("texto", false)]
    public void Referencias_usan_las_mismas_reglas(string telefono, bool valido) =>
        Assert.Equal(valido, ValidacionHojaDeVida.Evaluar(new GuardarReferenciaRequest("personal", "Referencia Ficticia", telefono), "referencia", Politica).Count == 0);

    [Theory]
    [InlineData(1, true)]
    [InlineData(24, true)]
    [InlineData(0, false)]
    [InlineData(-1, false)]
    public void Horas_deben_ser_positivas(int horas, bool valido) =>
        Assert.Equal(valido, ValidacionHojaDeVida.Evaluar(new GuardarCapacitacionRequest("Curso ficticio", "Institución ficticia", NumeroHoras: horas), "capacitacion", Politica).Count == 0);

    [Theory]
    [InlineData("@INSTITUCION-FICTICIA.EXAMPLE", true)]
    [InlineData("*.example", false)]
    [InlineData("https://ficticia.example", false)]
    [InlineData("ficticia.example:80", false)]
    [InlineData("@@ficticia.example", false)]
    [InlineData("ficticia.example/", false)]
    [InlineData("-ficticia.example", false)]
    public void Configuracion_normaliza_y_rechaza_dominios_malformados(string dominio, bool valido)
    {
        if (valido) Assert.Equal(["institucion-ficticia.example"], ValidacionHojaDeVida.NormalizarDominios([dominio, dominio]));
        else Assert.Throws<ValidacionCamposException>(() => ValidacionHojaDeVida.NormalizarDominios([dominio]));
    }

    [Fact]
    public void Borrador_incompleto_valido_se_admite_y_los_errores_no_hacen_eco()
    {
        Assert.Empty(ValidacionHojaDeVida.Evaluar(new GuardarFichaPersonalRequest(), "ficha", Politica));
        var excepcion = Assert.Throws<ValidacionCamposException>(() => ValidacionHojaDeVida.Validar(new GuardarFichaPersonalRequest(Celular: "dato-privado-ficticio"), "ficha", Politica));
        Assert.DoesNotContain("dato-privado-ficticio", JsonSerializer.Serialize(excepcion.Errores));
    }

    [Fact]
    public void Politica_consumida_por_pruebas_frontend_coincide_con_las_reglas_del_backend()
    {
        var politica = Politica with { InstitucionId = Guid.Empty };
        var real = JsonSerializer.SerializeToElement(politica, Opciones);
        var fixture = JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "politica-validacion.fixture.json"))).RootElement;
        Assert.True(JsonElement.DeepEquals(real, fixture));
    }

    [Theory]
    [InlineData("Texto\nFicticio", true)]
    [InlineData("Texto\r\nFicticio", true)]
    [InlineData("Texto\rFicticio", false)]
    [InlineData("Texto\tFicticio", false)]
    public void Funciones_permite_solo_saltos_de_linea_normalizados(string funciones, bool valido)
    {
        var datos = new GuardarExperienciaLaboralRequest("Empresa Ficticia", "Cargo Ficticio", new DateOnly(2020, 1, 1), TrabajaActualmente: true, Funciones: funciones);
        Assert.Equal(valido, ValidacionHojaDeVida.Evaluar(datos, "experiencia", Politica).Count == 0);
    }
}
