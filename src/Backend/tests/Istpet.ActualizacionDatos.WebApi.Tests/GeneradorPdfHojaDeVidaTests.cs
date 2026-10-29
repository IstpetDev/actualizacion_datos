namespace Istpet.ActualizacionDatos.WebApi.Tests;

using System.Diagnostics;
using Istpet.ActualizacionDatos.Application.Documentos;
using Istpet.ActualizacionDatos.Application.Validacion;
using Istpet.ActualizacionDatos.Infrastructure.Documentos;
using UglyToad.PdfPig;
using Xunit;

public class GeneradorPdfHojaDeVidaTests
{
    private readonly GeneradorPdfHojaDeVida _generador = new();

    private static DatosDocumentoHojaDeVida CrearDatosEjemplo(
        bool esVistaPrevia = false,
        byte[]? fotoBytes = null,
        bool incluirListas = true)
    {
        var datosPersonales = new DatosPersonalesDocumento(
            PrimerNombre: "Carlos",
            SegundoNombre: "Eduardo",
            PrimerApellido: "Pérez",
            SegundoApellido: "Gómez",
            DocumentoIdentidad: "0102030405",
            TipoPersonal: "Docente Ocasional",
            LugarNacimiento: "Quito",
            FechaNacimiento: new DateOnly(1985, 5, 20),
            EstadoCivil: "Soltero/a",
            CiudadResidencia: "Cuenca",
            DireccionDomicilio: "Av. Ficticia 123 y Calle Secundaria",
            Celular: "0991234567",
            TelefonoConvencional: "072888999",
            CorreoInstitucional: "carlos.perez@instituto.test",
            CorreoPersonal: "carlos.personal@correo.test",
            RegistroSenescyt: new RegistroSenescytPrincipal("1005-2015-123456", new DateOnly(2015, 8, 12))
        );

        var formaciones = incluirListas ? new List<ItemFormacionAcademica>
        {
            new("Licenciatura en Sistemas Ficticios", "Tercer Nivel", "Universidad de Prueba", new DateOnly(2015, 6, 15), "1005-2015-123456"),
            new("Maestría en Tecnologías Ficticias", "Cuarto Nivel", "Instituto Superior de Prueba", new DateOnly(2020, 11, 30), "1005-2020-789012")
        } : new List<ItemFormacionAcademica>();

        var experiencias = incluirListas ? new List<ItemExperienciaLaboral>
        {
            new("Empresa Ficticia A", "Analista de Sistemas", new DateOnly(2016, 1, 1), new DateOnly(2019, 12, 31), false, "Quito", "Ecuador", "Desarrollo de software y mantenimiento."),
            new("Institución Ficticia B", "Docente Técnico", new DateOnly(2020, 2, 1), null, true, "Cuenca", "Ecuador", "Cátedra de programación estructurada.")
        } : new List<ItemExperienciaLaboral>();

        var capacitaciones = incluirListas ? new List<ItemCapacitacion>
        {
            new("Taller de Pedagogía Virtual Ficticia", "Centro de Formación Docente", "Pedagogía", "Asistente", 40, "Online", new DateOnly(2021, 5, 10), new DateOnly(2021, 5, 15)),
            new("Seminario de Seguridad Informática", "Sociedad Ficticia", "Tecnología", "Ponente", 20, "Cuenca", new DateOnly(2022, 9, 1), new DateOnly(2022, 9, 3))
        } : new List<ItemCapacitacion>();

        var referencias = incluirListas ? new List<ItemReferencia>
        {
            new("Juan Ficticio Pérez", "Personal", "0997654321", "Ingeniero", "Gerente", "Empresa A"),
            new("María Ficticia Gómez", "Familiar", "0981122334", "Licenciada", "Supervisora", "Empresa B")
        } : new List<ItemReferencia>();

        var perfil = PerfilProfesional.Generar(formaciones.Count, 0, capacitaciones.Count, experiencias.Count);

        return new DatosDocumentoHojaDeVida(
            DatosPersonales: datosPersonales,
            PerfilProfesional: perfil,
            Formaciones: formaciones,
            Experiencias: experiencias,
            Capacitaciones: capacitaciones,
            Referencias: referencias,
            FechaGeneracion: new DateOnly(2026, 10, 27),
            EsVistaPrevia: esVistaPrevia,
            FotoBytes: fotoBytes);
    }

    [Fact]
    public void Genera_pdf_valido_con_datos_personales_y_perfil_determinado()
    {
        var datos = CrearDatosEjemplo();
        var marca = MarcaDocumento.Neutra;
        var config = ConfiguracionPlantilla.Predeterminada();

        var pdfBytes = _generador.Generar(datos, marca, config);

        Assert.NotNull(pdfBytes);
        Assert.NotEmpty(pdfBytes);

        using var stream = new MemoryStream(pdfBytes);
        using var documento = PdfDocument.Open(stream);

        Assert.True(documento.NumberOfPages >= 2);

        var textoCompleto = string.Join(" ", documento.GetPages().Select(p => p.Text));

        Assert.Contains("Carlos Eduardo Pérez Gómez", textoCompleto);
        Assert.Contains("0102030405", textoCompleto);
        Assert.Contains("Docente Ocasional", textoCompleto);
        Assert.Contains("Licenciatura en Sistemas Ficticios", textoCompleto);
        Assert.Contains("Empresa Ficticia A", textoCompleto);
        Assert.Contains("Taller de Pedagogía Virtual Ficticia", textoCompleto);
        Assert.Contains("Juan Ficticio Pérez", textoCompleto);
        Assert.Contains("Trayectoria declarada en la hoja de vida", textoCompleto);
    }

    [Fact]
    public void Persona_sin_foto_no_falla_y_muestra_marcador_neutro()
    {
        var datos = CrearDatosEjemplo(fotoBytes: null);
        var pdfBytes = _generador.Generar(datos, MarcaDocumento.Neutra, ConfiguracionPlantilla.Predeterminada());

        using var stream = new MemoryStream(pdfBytes);
        using var documento = PdfDocument.Open(stream);
        var textoCompleto = string.Join(" ", documento.GetPages().Select(p => p.Text));

        Assert.Contains("Sin foto", textoCompleto);
    }

    [Fact]
    public void Imagenes_con_bytes_corruptos_no_rompen_la_generacion()
    {
        var bytesCorruptos = new byte[] { 0x01, 0x02, 0x03, 0x04, 0x05 };
        var datos = CrearDatosEjemplo(fotoBytes: bytesCorruptos);
        var marcaCorrupta = new MarcaDocumento(
            NombreVisible: "Instituto Ficticio",
            ColorPrimario: "#1A365D",
            ColorSecundario: "#2B6CB0",
            LogoBytes: bytesCorruptos,
            PortadaBytes: bytesCorruptos);

        var pdfBytes = _generador.Generar(datos, marcaCorrupta, ConfiguracionPlantilla.Predeterminada());

        Assert.NotNull(pdfBytes);
        Assert.NotEmpty(pdfBytes);
    }

    [Fact]
    public void Seccion_vacia_se_omite_cuando_MostrarSiVacia_es_false()
    {
        var datos = CrearDatosEjemplo(incluirListas: false);
        var config = ConfiguracionPlantilla.Predeterminada();

        var pdfBytes = _generador.Generar(datos, MarcaDocumento.Neutra, config);

        using var stream = new MemoryStream(pdfBytes);
        using var documento = PdfDocument.Open(stream);
        var textoCompleto = string.Join(" ", documento.GetPages().Select(p => p.Text));

        Assert.DoesNotContain("FORMACIÓN ACADÉMICA", textoCompleto);
        Assert.DoesNotContain("EXPERIENCIA LABORAL", textoCompleto);
        Assert.DoesNotContain("CAPACITACIONES Y TALLERES", textoCompleto);
        Assert.DoesNotContain("REFERENCIAS PERSONALES", textoCompleto);
    }

    [Fact]
    public void Compromiso_institucional_incluye_nombre_y_cedula_con_bloque_de_firma()
    {
        var datos = CrearDatosEjemplo();
        var marca = new MarcaDocumento(
            NombreVisible: "Instituto Modelo",
            ColorPrimario: "#0D47A1",
            ColorSecundario: "#1976D2",
            TextoCompromiso: "Compromiso de ética profesional del personal docente.");

        var pdfBytes = _generador.Generar(datos, marca, ConfiguracionPlantilla.Predeterminada());

        using var stream = new MemoryStream(pdfBytes);
        using var documento = PdfDocument.Open(stream);
        var textoCompleto = string.Join(" ", documento.GetPages().Select(p => p.Text));

        Assert.Contains("Compromiso de ética profesional del personal docente.", textoCompleto);
        Assert.Contains("Carlos Eduardo Pérez Gómez", textoCompleto);
        Assert.Contains("0102030405", textoCompleto);
        Assert.Contains("Firma del Funcionario", textoCompleto);
    }

    [Fact]
    public void Marca_de_agua_vista_previa_aparece_solo_cuando_es_vista_previa()
    {
        var datosVistaPrevia = CrearDatosEjemplo(esVistaPrevia: true);
        var pdfVistaPrevia = _generador.Generar(datosVistaPrevia, MarcaDocumento.Neutra, ConfiguracionPlantilla.Predeterminada());

        using (var stream = new MemoryStream(pdfVistaPrevia))
        using (var doc = PdfDocument.Open(stream))
        {
            foreach (var pagina in doc.GetPages())
            {
                Assert.Contains("VISTA PREVIA", pagina.Text);
            }
        }

        var datosOficial = CrearDatosEjemplo(esVistaPrevia: false);
        var pdfOficial = _generador.Generar(datosOficial, MarcaDocumento.Neutra, ConfiguracionPlantilla.Predeterminada());

        using (var stream = new MemoryStream(pdfOficial))
        using (var doc = PdfDocument.Open(stream))
        {
            var textoCompleto = string.Join(" ", doc.GetPages().Select(p => p.Text));
            Assert.DoesNotContain("VISTA PREVIA", textoCompleto);
        }
    }

    [Fact]
    public void Caracteres_especiales_y_tags_html_se_renderizan_literales_sin_ejecutarse()
    {
        var datos = new DatosDocumentoHojaDeVida(
            DatosPersonales: new DatosPersonalesDocumento(
                PrimerNombre: "<script>alert('xss')</script>",
                SegundoNombre: null,
                PrimerApellido: "{{interpolacion}}",
                SegundoApellido: null,
                DocumentoIdentidad: "0000000000",
                TipoPersonal: "<b>Negrita</b>"),
            PerfilProfesional: "Perfil con <b>etiquetas</b> y <img src='x' onerror='alert(1)'>",
            Formaciones: new List<ItemFormacionAcademica> { new("<a href='http://malicioso'>Link</a>") },
            Experiencias: new List<ItemExperienciaLaboral>(),
            Capacitaciones: new List<ItemCapacitacion>(),
            Referencias: new List<ItemReferencia>(),
            FechaGeneracion: new DateOnly(2026, 10, 27));

        var pdfBytes = _generador.Generar(datos, MarcaDocumento.Neutra, ConfiguracionPlantilla.Predeterminada());

        using var stream = new MemoryStream(pdfBytes);
        using var documento = PdfDocument.Open(stream);
        var textoCompleto = string.Join(" ", documento.GetPages().Select(p => p.Text));

        Assert.Contains("<script>alert('xss')</script>", textoCompleto);
        Assert.Contains("{{interpolacion}}", textoCompleto);
        Assert.Contains("<b>etiquetas</b>", textoCompleto);
    }

    [Fact]
    public void Dos_marcas_distintas_producen_documentos_diferenciados()
    {
        var datos = CrearDatosEjemplo();
        var marcaA = new MarcaDocumento("Instituto Alfa", "#112233", "#445566", Lema: "Lema Alfa");
        var marcaB = new MarcaDocumento("Instituto Beta", "#778899", "#AABBCC", Lema: "Lema Beta");

        var pdfA = _generador.Generar(datos, marcaA, ConfiguracionPlantilla.Predeterminada());
        var pdfB = _generador.Generar(datos, marcaB, ConfiguracionPlantilla.Predeterminada());

        using var docA = PdfDocument.Open(new MemoryStream(pdfA));
        using var docB = PdfDocument.Open(new MemoryStream(pdfB));

        var textoA = string.Join(" ", docA.GetPages().Select(p => p.Text));
        var textoB = string.Join(" ", docB.GetPages().Select(p => p.Text));

        Assert.Contains("Instituto Alfa", textoA);
        Assert.Contains("Lema Alfa", textoA);
        Assert.DoesNotContain("Instituto Beta", textoA);

        Assert.Contains("Instituto Beta", textoB);
        Assert.Contains("Lema Beta", textoB);
        Assert.DoesNotContain("Instituto Alfa", textoB);
    }

    [Fact]
    public void Rendimiento_listas_largas_cumple_con_limite_de_dos_segundos_y_cinco_megabytes()
    {
        // PD-PLA-16: 40 formaciones, 40 experiencias, 60 capacitaciones y 20 referencias
        var formaciones = Enumerable.Range(1, 40)
            .Select(i => new ItemFormacionAcademica($"Título Universitario {i}", "Tercer Nivel", $"Universidad Ficticia {i}", new DateOnly(2010 + (i % 10), 1, 1), $"REG-{i:0000}"))
            .ToList();

        var experiencias = Enumerable.Range(1, 40)
            .Select(i => new ItemExperienciaLaboral($"Empresa Ficticia {i}", $"Cargo {i}", new DateOnly(2015, 1, 1), new DateOnly(2016, 1, 1), false, "Quito", "Ecuador", $"Funciones desempeñadas en el puesto {i}"))
            .ToList();

        var capacitaciones = Enumerable.Range(1, 60)
            .Select(i => new ItemCapacitacion($"Curso de Actualización {i}", $"Institución {i}", "Pedagógico", "Asistente", 40, "Online", new DateOnly(2021, 1, 1), new DateOnly(2021, 1, 5)))
            .ToList();

        var referencias = Enumerable.Range(1, 20)
            .Select(i => new ItemReferencia($"Referente Ficticio {i}", "Personal", "0990000000", "Ingeniero", "Jefe", "Empresa X"))
            .ToList();

        var datos = new DatosDocumentoHojaDeVida(
            DatosPersonales: new DatosPersonalesDocumento("Juan", null, "Pérez", null, "0102030405", "Docente"),
            PerfilProfesional: PerfilProfesional.Generar(formaciones.Count, 0, capacitaciones.Count, experiencias.Count),
            Formaciones: formaciones,
            Experiencias: experiencias,
            Capacitaciones: capacitaciones,
            Referencias: referencias,
            FechaGeneracion: new DateOnly(2026, 10, 27));

        var stopwatch = Stopwatch.StartNew();
        var pdfBytes = _generador.Generar(datos, MarcaDocumento.Neutra, ConfiguracionPlantilla.Predeterminada());
        stopwatch.Stop();

        // Métrica PD-PLA-16: Menor a 2 segundos
        Assert.True(stopwatch.ElapsedMilliseconds < 2000, $"La generación tardó {stopwatch.ElapsedMilliseconds} ms, superando el límite de 2000 ms.");

        // Métrica PD-PLA-16: Menor a 5 MB (5 * 1024 * 1024 bytes)
        const int cincoMegabytes = 5 * 1024 * 1024;
        Assert.True(pdfBytes.Length < cincoMegabytes, $"El tamaño del PDF fue de {pdfBytes.Length} bytes, superando el límite de 5 MB.");

        // Comprobación de integridad: todos los ítems están presentes en el PDF
        using var stream = new MemoryStream(pdfBytes);
        using var doc = PdfDocument.Open(stream);
        var textoCompleto = string.Join(" ", doc.GetPages().Select(p => p.Text));

        Assert.Contains("Título Universitario 1", textoCompleto);
        Assert.Contains("Título Universitario 40", textoCompleto);
        Assert.Contains("Empresa Ficticia 40", textoCompleto);
        Assert.Contains("Curso de Actualización 60", textoCompleto);
        Assert.Contains("Referente Ficticio 20", textoCompleto);
    }

    [Fact]
    public void Exporta_pdf_de_ejemplo_para_revision_manual()
    {
        var datos = CrearDatosEjemplo(esVistaPrevia: false);
        var marca = new MarcaDocumento(
            NombreVisible: "Instituto Superior Tecnológico de Prueba",
            ColorPrimario: "#1A365D",
            ColorSecundario: "#2B6CB0",
            Lema: "Excelencia y Formación Continua (Datos Ficticios)",
            TextoCompromiso: "Declaro bajo juramento que los datos contenidos en este documento son fidedignos y de mi exclusiva responsabilidad.");

        var pdfBytes = _generador.Generar(datos, marca, ConfiguracionPlantilla.Predeterminada());

        var rutaScratch = @"C:\Users\DESARROLLADOR-PC02\.gemini\antigravity-cli\brain\d5123d39-660a-4b11-b81f-f4913fe5dc3c\scratch\hoja-de-vida-ejemplo.pdf";
        if (Directory.Exists(Path.GetDirectoryName(rutaScratch)))
        {
            File.WriteAllBytes(rutaScratch, pdfBytes);
        }

        Assert.True(pdfBytes.Length > 0);
    }
}
