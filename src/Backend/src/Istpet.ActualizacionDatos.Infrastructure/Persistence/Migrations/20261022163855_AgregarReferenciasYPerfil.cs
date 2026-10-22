using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Migrations;

/// <inheritdoc />
public partial class AgregarReferenciasYPerfil : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "perfil",
            table: "fichas_personales",
            type: "character varying(2000)",
            maxLength: 2000,
            nullable: true);

        migrationBuilder.CreateTable(
            name: "referencias_personales",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                tipo = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                nombres_apellidos = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                telefono = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                titulo = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                cargo_actual = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                empresa = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                institucion_id = table.Column<Guid>(type: "uuid", nullable: false),
                persona_id = table.Column<Guid>(type: "uuid", nullable: false),
                archivo_id = table.Column<Guid>(type: "uuid", nullable: true),
                fecha_actualizacion_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_referencias_personales", x => x.id);
                table.ForeignKey(
                    name: "fk_referencias_personales_archivos_adjuntos_archivo_id",
                    column: x => x.archivo_id,
                    principalTable: "archivos_adjuntos",
                    principalColumn: "id",
                    onDelete: ReferentialAction.SetNull);
                table.ForeignKey(
                    name: "fk_referencias_personales_instituciones_institucion_id",
                    column: x => x.institucion_id,
                    principalTable: "instituciones",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_referencias_personales_personas_persona_id",
                    column: x => x.persona_id,
                    principalTable: "personas",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "ix_referencias_personales_archivo_id",
            table: "referencias_personales",
            column: "archivo_id");

        migrationBuilder.CreateIndex(
            name: "ix_referencias_personales_institucion_id",
            table: "referencias_personales",
            column: "institucion_id");

        migrationBuilder.CreateIndex(
            name: "ix_referencias_personales_persona_id",
            table: "referencias_personales",
            column: "persona_id");
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "referencias_personales");

        migrationBuilder.DropColumn(
            name: "perfil",
            table: "fichas_personales");
    }
}
