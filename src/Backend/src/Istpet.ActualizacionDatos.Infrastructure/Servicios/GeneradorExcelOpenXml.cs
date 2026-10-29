namespace Istpet.ActualizacionDatos.Infrastructure.Servicios;

using System.Globalization;
using System.IO.Compression;
using System.Security;
using System.Text;

/// <summary>
/// Generador ligero de hojas de cálculo OpenXML (.xlsx) sin dependencias externas,
/// conforme a los estándares ISO/IEC 29500 para compatibilidad universal con Excel.
/// </summary>
internal static class GeneradorExcelOpenXml
{
    public sealed record FilaExportacion(
        string Documento,
        string Nombre,
        string Correo,
        string Rol,
        string Estado,
        int CantidadArchivos,
        bool TratamientoDatosAceptado,
        DateTime FechaCreacionUtc,
        string Perfil = "",
        string EstadoCapacitacionesObligatorias = "",
        string CorreoPersonal = "—");

    public sealed record FilaCapacitacionObligatoria(
        string Documento,
        string Nombre,
        string CapacitacionObligatoria,
        string Aplica,
        string Estado,
        string Horas,
        string FechaRealizacion);

    public static byte[] GenerarExcelPersonasAprobadas(
        string nombreInstitucion,
        List<FilaExportacion> filas,
        List<FilaCapacitacionObligatoria>? filasObligatorias = null)
    {
        var tieneHojaObligatorias = filasObligatorias != null && filasObligatorias.Count > 0;
        using var memoryStream = new MemoryStream();
        using (var archive = new ZipArchive(memoryStream, ZipArchiveMode.Create, leaveOpen: true))
        {
            // 1. [Content_Types].xml
            EscribirEntrada(archive, "[Content_Types].xml", ObtenerContentTypesXml(tieneHojaObligatorias));

            // 2. _rels/.rels
            EscribirEntrada(archive, "_rels/.rels", ObtenerRelsRaizXml());

            // 3. xl/workbook.xml
            EscribirEntrada(archive, "xl/workbook.xml", ObtenerWorkbookXml(nombreInstitucion, tieneHojaObligatorias));

            // 4. xl/_rels/workbook.xml.rels
            EscribirEntrada(archive, "xl/_rels/workbook.xml.rels", ObtenerWorkbookRelsXml(tieneHojaObligatorias));

            // 5. xl/styles.xml
            EscribirEntrada(archive, "xl/styles.xml", ObtenerStylesXml());

            // 6. xl/worksheets/sheet1.xml
            EscribirEntrada(archive, "xl/worksheets/sheet1.xml", ObtenerWorksheetXml(filas));

            // 7. xl/worksheets/sheet2.xml
            if (tieneHojaObligatorias)
            {
                EscribirEntrada(archive, "xl/worksheets/sheet2.xml", ObtenerWorksheetObligatoriasXml(filasObligatorias!));
            }
        }

        return memoryStream.ToArray();
    }

    private static void EscribirEntrada(ZipArchive archive, string nombreRuta, string contenido)
    {
        var entry = archive.CreateEntry(nombreRuta, CompressionLevel.Optimal);
        using var stream = entry.Open();
        using var writer = new StreamWriter(stream, new UTF8Encoding(false));
        writer.Write(contenido);
    }

    private static string ObtenerContentTypesXml(bool tieneHojaObligatorias) =>
        $"""
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
          <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
          <Default Extension="xml" ContentType="application/xml"/>
          <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
          <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
          {(tieneHojaObligatorias ? """<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>""" : "")}
          <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
        </Types>
        """;

    private static string ObtenerRelsRaizXml() =>
        """
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
          <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
        </Relationships>
        """;

    private static string ObtenerWorkbookXml(string nombreInstitucion, bool tieneHojaObligatorias)
    {
        var nombreHoja = EscaparXml("Personas Aprobadas");
        return $"""
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
          <sheets>
            <sheet name="{nombreHoja}" sheetId="1" r:id="rId1"/>
            {(tieneHojaObligatorias ? """<sheet name="Capacitaciones Obligatorias" sheetId="2" r:id="rId2"/>""" : "")}
          </sheets>
        </workbook>
        """;
    }

    private static string ObtenerWorkbookRelsXml(bool tieneHojaObligatorias) =>
        tieneHojaObligatorias
            ? """
              <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
              <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
                <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
                <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
              </Relationships>
              """
            : """
              <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
              <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
                <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
              </Relationships>
              """;

    private static string ObtenerStylesXml() =>
        """
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
          <fonts count="2">
            <font><sz val="11"/><color theme="1"/><name val="Segoe UI"/></font>
            <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Segoe UI"/></font>
          </fonts>
          <fills count="3">
            <fill><patternFill patternType="none"/></fill>
            <fill><patternFill patternType="gray125"/></fill>
            <fill><patternFill patternType="solid"><fgColor rgb="FF0F172A"/></patternFill></fill>
          </fills>
          <borders count="1">
            <border><left/><right/><top/><bottom/><diagonal/></border>
          </borders>
          <cellStyleXfs count="1">
            <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
          </cellStyleXfs>
          <cellXfs count="2">
            <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
            <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
          </cellXfs>
        </styleSheet>
        """;

    private static string ObtenerWorksheetXml(List<FilaExportacion> filas)
    {
        var totalFilas = filas.Count + 1;
        var sb = new StringBuilder();
        sb.AppendLine("""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>""");
        sb.AppendLine("""<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">""");
        sb.AppendLine(CultureInfo.InvariantCulture, $"  <dimension ref=\"A1:K{totalFilas}\"/>");
        sb.AppendLine("""
          <sheetViews>
            <sheetView tabSelected="1" workbookViewId="0">
              <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
            </sheetView>
          </sheetViews>
          <cols>
            <col min="1" max="1" width="16" customWidth="1"/>
            <col min="2" max="2" width="30" customWidth="1"/>
            <col min="3" max="3" width="32" customWidth="1"/>
            <col min="4" max="4" width="32" customWidth="1"/>
            <col min="5" max="5" width="16" customWidth="1"/>
            <col min="6" max="6" width="22" customWidth="1"/>
            <col min="7" max="7" width="18" customWidth="1"/>
            <col min="8" max="8" width="28" customWidth="1"/>
            <col min="9" max="9" width="22" customWidth="1"/>
            <col min="10" max="10" width="30" customWidth="1"/>
            <col min="11" max="11" width="30" customWidth="1"/>
          </cols>
        """);
        sb.AppendLine("  <sheetData>");

        // Fila 1: Encabezados (estilo 1 = negrita con fondo oscuro)
        sb.AppendLine("    <row r=\"1\">");
        sb.AppendLine(CrearCeldaTexto("A1", "Documento", estilo: 1));
        sb.AppendLine(CrearCeldaTexto("B1", "Nombres y Apellidos", estilo: 1));
        sb.AppendLine(CrearCeldaTexto("C1", "Correo Institucional", estilo: 1));
        sb.AppendLine(CrearCeldaTexto("D1", "Correo Personal", estilo: 1));
        sb.AppendLine(CrearCeldaTexto("E1", "Rol de Acceso", estilo: 1));
        sb.AppendLine(CrearCeldaTexto("F1", "Estado de Actualización", estilo: 1));
        sb.AppendLine(CrearCeldaTexto("G1", "Archivos Adjuntos", estilo: 1));
        sb.AppendLine(CrearCeldaTexto("H1", "Tratamiento de Datos Aceptado", estilo: 1));
        sb.AppendLine(CrearCeldaTexto("I1", "Fecha Registro (UTC)", estilo: 1));
        sb.AppendLine(CrearCeldaTexto("J1", "Perfil profesional generado", estilo: 1));
        sb.AppendLine(CrearCeldaTexto("K1", "Capacitaciones Obligatorias", estilo: 1));
        sb.AppendLine("    </row>");

        // Filas de datos
        for (var i = 0; i < filas.Count; i++)
        {
            var fila = filas[i];
            var numFila = i + 2;

            sb.AppendLine(CultureInfo.InvariantCulture, $"    <row r=\"{numFila}\">");
            sb.AppendLine(CrearCeldaTexto(string.Create(CultureInfo.InvariantCulture, $"A{numFila}"), fila.Documento));
            sb.AppendLine(CrearCeldaTexto(string.Create(CultureInfo.InvariantCulture, $"B{numFila}"), fila.Nombre));
            sb.AppendLine(CrearCeldaTexto(string.Create(CultureInfo.InvariantCulture, $"C{numFila}"), fila.Correo));
            sb.AppendLine(CrearCeldaTexto(string.Create(CultureInfo.InvariantCulture, $"D{numFila}"), fila.CorreoPersonal));
            sb.AppendLine(CrearCeldaTexto(string.Create(CultureInfo.InvariantCulture, $"E{numFila}"), fila.Rol));
            sb.AppendLine(CrearCeldaTexto(string.Create(CultureInfo.InvariantCulture, $"F{numFila}"), fila.Estado));
            sb.AppendLine(CrearCeldaNumero(string.Create(CultureInfo.InvariantCulture, $"G{numFila}"), fila.CantidadArchivos));
            sb.AppendLine(CrearCeldaTexto(string.Create(CultureInfo.InvariantCulture, $"H{numFila}"), fila.TratamientoDatosAceptado ? "Sí" : "No"));
            sb.AppendLine(CrearCeldaTexto(string.Create(CultureInfo.InvariantCulture, $"I{numFila}"), fila.FechaCreacionUtc.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture)));
            sb.AppendLine(CrearCeldaTexto(string.Create(CultureInfo.InvariantCulture, $"J{numFila}"), fila.Perfil));
            sb.AppendLine(CrearCeldaTexto(string.Create(CultureInfo.InvariantCulture, $"K{numFila}"), fila.EstadoCapacitacionesObligatorias));
            sb.AppendLine("    </row>");
        }

        sb.AppendLine("  </sheetData>");
        sb.AppendLine("</worksheet>");

        return sb.ToString();
    }

    private static string ObtenerWorksheetObligatoriasXml(List<FilaCapacitacionObligatoria> filas)
    {
        var totalFilas = filas.Count + 1;
        var sb = new StringBuilder();
        sb.AppendLine("""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>""");
        sb.AppendLine("""<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">""");
        sb.AppendLine(CultureInfo.InvariantCulture, $"  <dimension ref=\"A1:G{totalFilas}\"/>");
        sb.AppendLine("""
          <sheetViews>
            <sheetView tabSelected="0" workbookViewId="0">
              <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
            </sheetView>
          </sheetViews>
          <cols>
            <col min="1" max="1" width="16" customWidth="1"/>
            <col min="2" max="2" width="30" customWidth="1"/>
            <col min="3" max="3" width="35" customWidth="1"/>
            <col min="4" max="4" width="12" customWidth="1"/>
            <col min="5" max="5" width="24" customWidth="1"/>
            <col min="6" max="6" width="16" customWidth="1"/>
            <col min="7" max="7" width="20" customWidth="1"/>
          </cols>
        """);
        sb.AppendLine("  <sheetData>");
        sb.AppendLine("    <row r=\"1\">");
        sb.AppendLine(CrearCeldaTexto("A1", "Documento", estilo: 1));
        sb.AppendLine(CrearCeldaTexto("B1", "Nombres y Apellidos", estilo: 1));
        sb.AppendLine(CrearCeldaTexto("C1", "Capacitación Obligatoria", estilo: 1));
        sb.AppendLine(CrearCeldaTexto("D1", "Aplica", estilo: 1));
        sb.AppendLine(CrearCeldaTexto("E1", "Estado", estilo: 1));
        sb.AppendLine(CrearCeldaTexto("F1", "Horas", estilo: 1));
        sb.AppendLine(CrearCeldaTexto("G1", "Fecha Realización", estilo: 1));
        sb.AppendLine("    </row>");

        for (var i = 0; i < filas.Count; i++)
        {
            var fila = filas[i];
            var numFila = i + 2;
            sb.AppendLine(CultureInfo.InvariantCulture, $"    <row r=\"{numFila}\">");
            sb.AppendLine(CrearCeldaTexto(string.Create(CultureInfo.InvariantCulture, $"A{numFila}"), fila.Documento));
            sb.AppendLine(CrearCeldaTexto(string.Create(CultureInfo.InvariantCulture, $"B{numFila}"), fila.Nombre));
            sb.AppendLine(CrearCeldaTexto(string.Create(CultureInfo.InvariantCulture, $"C{numFila}"), fila.CapacitacionObligatoria));
            sb.AppendLine(CrearCeldaTexto(string.Create(CultureInfo.InvariantCulture, $"D{numFila}"), fila.Aplica));
            sb.AppendLine(CrearCeldaTexto(string.Create(CultureInfo.InvariantCulture, $"E{numFila}"), fila.Estado));
            sb.AppendLine(CrearCeldaTexto(string.Create(CultureInfo.InvariantCulture, $"F{numFila}"), fila.Horas));
            sb.AppendLine(CrearCeldaTexto(string.Create(CultureInfo.InvariantCulture, $"G{numFila}"), fila.FechaRealizacion));
            sb.AppendLine("    </row>");
        }

        sb.AppendLine("  </sheetData>");
        sb.AppendLine("</worksheet>");
        return sb.ToString();
    }

    private static string CrearCeldaTexto(string referencia, string? valor, int estilo = 0)
    {
        var seguro = EscaparXml(valor ?? string.Empty);
        var atributoEstilo = estilo > 0 ? string.Create(CultureInfo.InvariantCulture, $" s=\"{estilo}\"") : string.Empty;
        return string.Create(CultureInfo.InvariantCulture, $"      <c r=\"{referencia}\"{atributoEstilo} t=\"inlineStr\"><is><t xml:space=\"preserve\">{seguro}</t></is></c>");
    }

    private static string CrearCeldaNumero(string referencia, int valor, int estilo = 0)
    {
        var atributoEstilo = estilo > 0 ? string.Create(CultureInfo.InvariantCulture, $" s=\"{estilo}\"") : string.Empty;
        return string.Create(CultureInfo.InvariantCulture, $"      <c r=\"{referencia}\"{atributoEstilo}><v>{valor}</v></c>");
    }

    private static string EscaparXml(string valor) =>
        SecurityElement.Escape(valor) ?? string.Empty;
}
