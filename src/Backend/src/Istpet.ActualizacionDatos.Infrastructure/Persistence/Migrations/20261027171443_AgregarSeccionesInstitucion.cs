using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable
#pragma warning disable CA1861

namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Migrations;

/// <inheritdoc />
public partial class AgregarSeccionesInstitucion : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "secciones_institucion",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                seccion = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                habilitada = table.Column<bool>(type: "boolean", nullable: false),
                ultima_modificacion_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                modificado_por = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                institucion_id = table.Column<Guid>(type: "uuid", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_secciones_institucion", x => x.id);
                table.ForeignKey(
                    name: "fk_secciones_institucion_instituciones_institucion_id",
                    column: x => x.institucion_id,
                    principalTable: "instituciones",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(
            name: "ix_secciones_institucion_institucion_seccion",
            table: "secciones_institucion",
            columns: new[] { "institucion_id", "seccion" },
            unique: true);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "secciones_institucion");
    }
}
