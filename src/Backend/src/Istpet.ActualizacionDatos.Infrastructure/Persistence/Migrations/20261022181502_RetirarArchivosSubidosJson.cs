using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Migrations;

/// <inheritdoc />
public partial class RetirarArchivosSubidosJson : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "archivos_subidos_json",
            table: "personas");
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "archivos_subidos_json",
            table: "personas",
            type: "text",
            nullable: true);
    }
}
