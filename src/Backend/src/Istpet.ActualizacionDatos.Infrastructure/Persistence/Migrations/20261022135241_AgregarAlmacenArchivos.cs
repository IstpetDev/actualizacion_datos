using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Migrations;

/// <inheritdoc />
public partial class AgregarAlmacenArchivos : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "archivos_adjuntos",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                persona_id = table.Column<Guid>(type: "uuid", nullable: false),
                nombre_original = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                tipo_contenido = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                tamano_bytes = table.Column<long>(type: "bigint", nullable: false),
                hash_sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                ruta_relativa = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                clave_destino = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                fecha_subida_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                institucion_id = table.Column<Guid>(type: "uuid", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_archivos_adjuntos", x => x.id);
                table.ForeignKey(
                    name: "fk_archivos_adjuntos_instituciones_institucion_id",
                    column: x => x.institucion_id,
                    principalTable: "instituciones",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_archivos_adjuntos_personas_persona_id",
                    column: x => x.persona_id,
                    principalTable: "personas",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "ix_archivos_adjuntos_institucion_id",
            table: "archivos_adjuntos",
            column: "institucion_id");

        migrationBuilder.CreateIndex(
            name: "ix_archivos_adjuntos_persona_id",
            table: "archivos_adjuntos",
            column: "persona_id");
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "archivos_adjuntos");
    }
}
