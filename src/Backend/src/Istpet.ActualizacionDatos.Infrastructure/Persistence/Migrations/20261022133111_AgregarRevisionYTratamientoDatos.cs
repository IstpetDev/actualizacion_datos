using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Migrations;

/// <inheritdoc />
public partial class AgregarRevisionYTratamientoDatos : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<DateTime>(
            name: "fecha_aceptacion_tratamiento_datos_utc",
            table: "personas",
            type: "timestamp with time zone",
            nullable: true);

        migrationBuilder.AddColumn<bool>(
            name: "tratamiento_datos_aceptado",
            table: "personas",
            type: "boolean",
            nullable: false,
            defaultValue: false);

        migrationBuilder.CreateTable(
            name: "observaciones",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                persona_id = table.Column<Guid>(type: "uuid", nullable: false),
                ronda = table.Column<int>(type: "integer", nullable: false),
                autor = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                texto = table.Column<string>(type: "text", nullable: false),
                fecha_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                institucion_id = table.Column<Guid>(type: "uuid", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_observaciones", x => x.id);
                table.ForeignKey(
                    name: "fk_observaciones_instituciones_institucion_id",
                    column: x => x.institucion_id,
                    principalTable: "instituciones",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_observaciones_personas_persona_id",
                    column: x => x.persona_id,
                    principalTable: "personas",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "marcas_observacion",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                observacion_id = table.Column<Guid>(type: "uuid", nullable: false),
                tipo_destino = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                clave_destino = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                texto = table.Column<string>(type: "text", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_marcas_observacion", x => x.id);
                table.ForeignKey(
                    name: "fk_marcas_observacion_observaciones_observacion_id",
                    column: x => x.observacion_id,
                    principalTable: "observaciones",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "ix_marcas_observacion_observacion_id",
            table: "marcas_observacion",
            column: "observacion_id");

        migrationBuilder.CreateIndex(
            name: "ix_observaciones_institucion_id",
            table: "observaciones",
            column: "institucion_id");

        migrationBuilder.CreateIndex(
            name: "ix_observaciones_persona_id",
            table: "observaciones",
            column: "persona_id");
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "marcas_observacion");

        migrationBuilder.DropTable(
            name: "observaciones");

        migrationBuilder.DropColumn(
            name: "fecha_aceptacion_tratamiento_datos_utc",
            table: "personas");

        migrationBuilder.DropColumn(
            name: "tratamiento_datos_aceptado",
            table: "personas");
    }
}
