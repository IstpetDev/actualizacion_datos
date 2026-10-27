using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Migrations;

/// <inheritdoc />
public partial class AgregarAvisosProteccionDatos : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddUniqueConstraint(
            name: "ak_personas_id_institucion_id",
            table: "personas",
            columns: ["id", "institucion_id"]);

        migrationBuilder.CreateTable(
            name: "avisos_proteccion_datos",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                version = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                titulo = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                responsable = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                contenido = table.Column<string>(type: "character varying(100000)", maxLength: 100000, nullable: false),
                declaracion_aceptacion = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                fuente_oficial = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: false),
                evidencia_aprobacion = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                roles_destinatarios = table.Column<int>(type: "integer", nullable: false),
                vigente_desde_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                vigente_hasta_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                institucion_id = table.Column<Guid>(type: "uuid", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_avisos_proteccion_datos", x => x.id);
                table.UniqueConstraint("ak_avisos_proteccion_datos_id_institucion_id", x => new { x.id, x.institucion_id });
                table.CheckConstraint("ck_aviso_roles", "roles_destinatarios BETWEEN 1 AND 15");
                table.CheckConstraint("ck_aviso_vigencia", "vigente_hasta_utc IS NULL OR vigente_hasta_utc > vigente_desde_utc");
                table.ForeignKey(
                    name: "fk_avisos_proteccion_datos_instituciones_institucion_id",
                    column: x => x.institucion_id,
                    principalTable: "instituciones",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateTable(
            name: "aceptaciones_proteccion_datos",
            columns: table => new
            {
                institucion_id = table.Column<Guid>(type: "uuid", nullable: false),
                persona_id = table.Column<Guid>(type: "uuid", nullable: false),
                aviso_id = table.Column<Guid>(type: "uuid", nullable: false),
                fecha_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_aceptaciones_proteccion_datos", x => new { x.institucion_id, x.persona_id, x.aviso_id });
                table.ForeignKey(
                    name: "fk_aceptaciones_proteccion_datos_avisos_proteccion_datos_aviso",
                    columns: x => new { x.aviso_id, x.institucion_id },
                    principalTable: "avisos_proteccion_datos",
                    principalColumns: ["id", "institucion_id"],
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_aceptaciones_proteccion_datos_personas_persona_id_instituci",
                    columns: x => new { x.persona_id, x.institucion_id },
                    principalTable: "personas",
                    principalColumns: ["id", "institucion_id"],
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(
            name: "ix_aceptaciones_proteccion_datos_aviso_id_institucion_id",
            table: "aceptaciones_proteccion_datos",
            columns: ["aviso_id", "institucion_id"]);

        migrationBuilder.CreateIndex(
            name: "ix_aceptaciones_proteccion_datos_persona_id_institucion_id",
            table: "aceptaciones_proteccion_datos",
            columns: ["persona_id", "institucion_id"]);

        migrationBuilder.CreateIndex(
            name: "ix_avisos_proteccion_datos_institucion_id_version",
            table: "avisos_proteccion_datos",
            columns: ["institucion_id", "version"],
            unique: true);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "aceptaciones_proteccion_datos");

        migrationBuilder.DropTable(
            name: "avisos_proteccion_datos");

        migrationBuilder.DropUniqueConstraint(
            name: "ak_personas_id_institucion_id",
            table: "personas");
    }
}
