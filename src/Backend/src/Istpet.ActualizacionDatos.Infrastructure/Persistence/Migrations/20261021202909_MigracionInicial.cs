using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Migrations;

/// <inheritdoc />
public partial class MigracionInicial : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "instituciones",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                nombre = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                activa = table.Column<bool>(type: "boolean", nullable: false),
                fecha_creacion_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_instituciones", x => x.id);
            });

        migrationBuilder.CreateTable(
            name: "campanas",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                nombre = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                fecha_inicio_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                fecha_fin_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                activa = table.Column<bool>(type: "boolean", nullable: false),
                institucion_id = table.Column<Guid>(type: "uuid", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_campanas", x => x.id);
                table.ForeignKey(
                    name: "fk_campanas_instituciones_institucion_id",
                    column: x => x.institucion_id,
                    principalTable: "instituciones",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(
            name: "ix_campanas_institucion_id",
            table: "campanas",
            column: "institucion_id");
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "campanas");

        migrationBuilder.DropTable(
            name: "instituciones");
    }
}
