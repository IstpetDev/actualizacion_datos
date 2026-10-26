using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable
#pragma warning disable CA1861

namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Migrations;

/// <inheritdoc />
public partial class AgregarPersonasYAuditoria : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "auditorias",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                actor = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                accion = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                institucion_id = table.Column<Guid>(type: "uuid", nullable: true),
                fecha_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                detalle = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_auditorias", x => x.id);
            });

        migrationBuilder.CreateTable(
            name: "personas",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                documento = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                nombre = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                correo = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                rol = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                acceso_habilitado = table.Column<bool>(type: "boolean", nullable: false),
                estado_actualizacion = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                datos_personales_json = table.Column<string>(type: "text", nullable: true),
                archivos_subidos_json = table.Column<string>(type: "text", nullable: true),
                fecha_creacion_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                institucion_id = table.Column<Guid>(type: "uuid", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_personas", x => x.id);
                table.ForeignKey(
                    name: "fk_personas_instituciones_institucion_id",
                    column: x => x.institucion_id,
                    principalTable: "instituciones",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(
            name: "ix_auditorias_institucion_id",
            table: "auditorias",
            column: "institucion_id");

        migrationBuilder.CreateIndex(
            name: "ix_personas_institucion_id_documento",
            table: "personas",
            columns: new[] { "institucion_id", "documento" },
            unique: true);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "auditorias");

        migrationBuilder.DropTable(
            name: "personas");
    }
}
