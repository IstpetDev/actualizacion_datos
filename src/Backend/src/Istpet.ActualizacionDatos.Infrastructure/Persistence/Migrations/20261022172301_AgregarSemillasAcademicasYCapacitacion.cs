using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Migrations;

/// <inheritdoc />
public partial class AgregarSemillasAcademicasYCapacitacion : Migration
{
    private static readonly string[] Columnas = ["id", "activo", "codigo", "codigo_externo", "nombre", "orden", "padre_id", "tipo"];
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.InsertData(
            table: "elementos_catalogo",
            columns: Columnas,
            values: new object[,]
            {
                { 48, true, "INSTRUCCION_PROFESIONAL", null, "Instrucción profesional", 8, null, "TipoCapacitacion" },
                { 51, true, "PRIMARIA", null, "Primaria", 1, null, "NivelAcademico" },
                { 52, true, "SECUNDARIA", null, "Secundaria", 2, null, "NivelAcademico" },
                { 61, true, "PRIMARIA", null, "Primaria completa", 1, 51, "GradoAcademico" },
                { 62, true, "BACHILLERATO", null, "Bachillerato", 2, 52, "GradoAcademico" }
            });
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DeleteData(
            table: "elementos_catalogo",
            keyColumn: "id",
            keyValue: 48);

        migrationBuilder.DeleteData(
            table: "elementos_catalogo",
            keyColumn: "id",
            keyValue: 61);

        migrationBuilder.DeleteData(
            table: "elementos_catalogo",
            keyColumn: "id",
            keyValue: 62);

        migrationBuilder.DeleteData(
            table: "elementos_catalogo",
            keyColumn: "id",
            keyValue: 51);

        migrationBuilder.DeleteData(
            table: "elementos_catalogo",
            keyColumn: "id",
            keyValue: 52);
    }
}
