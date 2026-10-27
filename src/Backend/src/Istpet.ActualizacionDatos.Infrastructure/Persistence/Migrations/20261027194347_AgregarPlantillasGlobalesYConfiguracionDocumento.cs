using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable
#pragma warning disable CA1861

namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Migrations;

/// <inheritdoc />
public partial class AgregarPlantillasGlobalesYConfiguracionDocumento : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "configuraciones_documento_institucion",
            columns: table => new
            {
                institucion_id = table.Column<Guid>(type: "uuid", nullable: false),
                plantilla_id = table.Column<Guid>(type: "uuid", nullable: true),
                version_plantilla_id = table.Column<Guid>(type: "uuid", nullable: true),
                nombre_visible = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                logo_archivo_id = table.Column<Guid>(type: "uuid", nullable: true),
                portada_archivo_id = table.Column<Guid>(type: "uuid", nullable: true),
                color_primario = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: false),
                color_secundario = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: false),
                lema = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                texto_compromiso = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                fecha_actualizacion_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_configuraciones_documento_institucion", x => x.institucion_id);
            });

        migrationBuilder.CreateTable(
            name: "plantillas_hoja_de_vida",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                nombre = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                descripcion = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                diseno_base = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                configuracion_json = table.Column<string>(type: "text", nullable: false),
                es_predeterminada = table.Column<bool>(type: "boolean", nullable: false),
                fecha_creacion_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                fecha_actualizacion_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_plantillas_hoja_de_vida", x => x.id);
            });

        migrationBuilder.CreateTable(
            name: "versiones_plantilla_hoja_de_vida",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                plantilla_id = table.Column<Guid>(type: "uuid", nullable: false),
                numero_version = table.Column<int>(type: "integer", nullable: false),
                diseno_base = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                configuracion_json = table.Column<string>(type: "text", nullable: false),
                descripcion_cambio = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                fecha_publicacion_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_versiones_plantilla_hoja_de_vida", x => x.id);
                table.ForeignKey(
                    name: "fk_versiones_plantilla_hoja_de_vida_plantillas_hoja_de_vida_pl",
                    column: x => x.plantilla_id,
                    principalTable: "plantillas_hoja_de_vida",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "ix_versiones_plantilla_hoja_de_vida_plantilla_id_numero_version",
            table: "versiones_plantilla_hoja_de_vida",
            columns: new[] { "plantilla_id", "numero_version" },
            unique: true);

        var plantillaId = new Guid("11111111-1111-1111-1111-111111111111");
        var versionId = new Guid("22222222-2222-2222-2222-222222222222");
        var fecha = new DateTime(2026, 10, 27, 0, 0, 0, DateTimeKind.Utc);
        var configJson = System.Text.Json.JsonSerializer.Serialize(
            Istpet.ActualizacionDatos.Application.Documentos.ConfiguracionPlantilla.Predeterminada());

        migrationBuilder.InsertData(
            table: "plantillas_hoja_de_vida",
            columns: new[] { "id", "nombre", "descripcion", "diseno_base", "configuracion_json", "es_predeterminada", "fecha_creacion_utc", "fecha_actualizacion_utc" },
            values: new object[] { plantillaId, "Plantilla Institucional Clásica", "Plantilla oficial predeterminada del sistema de actualización de datos.", "clasico", configJson, true, fecha, fecha });

        migrationBuilder.InsertData(
            table: "versiones_plantilla_hoja_de_vida",
            columns: new[] { "id", "plantilla_id", "numero_version", "diseno_base", "configuracion_json", "descripcion_cambio", "fecha_publicacion_utc" },
            values: new object[] { versionId, plantillaId, 1, "clasico", configJson, "Versión 1 inicial predeterminada del sistema.", fecha });
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        var plantillaId = new Guid("11111111-1111-1111-1111-111111111111");
        var versionId = new Guid("22222222-2222-2222-2222-222222222222");

        migrationBuilder.DeleteData(
            table: "versiones_plantilla_hoja_de_vida",
            keyColumn: "id",
            keyColumnType: "uuid",
            keyValue: versionId);

        migrationBuilder.DeleteData(
            table: "plantillas_hoja_de_vida",
            keyColumn: "id",
            keyColumnType: "uuid",
            keyValue: plantillaId);

        migrationBuilder.DropTable(
            name: "configuraciones_documento_institucion");

        migrationBuilder.DropTable(
            name: "versiones_plantilla_hoja_de_vida");

        migrationBuilder.DropTable(
            name: "plantillas_hoja_de_vida");
    }
}
