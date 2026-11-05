using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable
#pragma warning disable CA1861

namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Migrations;

/// <inheritdoc />
public partial class AgregarSubindicesSeccion : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<Guid>(
            name: "subindice_seccion_id",
            table: "titulos_en_curso",
            type: "uuid",
            nullable: true);

        migrationBuilder.AddColumn<Guid>(
            name: "subindice_seccion_id",
            table: "titulos_academicos",
            type: "uuid",
            nullable: true);

        migrationBuilder.AddColumn<Guid>(
            name: "subindice_seccion_id",
            table: "referencias_personales",
            type: "uuid",
            nullable: true);

        migrationBuilder.AddColumn<Guid>(
            name: "subindice_seccion_id",
            table: "experiencias_laborales",
            type: "uuid",
            nullable: true);

        migrationBuilder.AddColumn<Guid>(
            name: "subindice_seccion_id",
            table: "capacitaciones",
            type: "uuid",
            nullable: true);

        migrationBuilder.CreateTable(
            name: "subindices_seccion",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                seccion = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                nombre = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                descripcion = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                tipo_funcionario_id = table.Column<Guid>(type: "uuid", nullable: true),
                es_obligatorio = table.Column<bool>(type: "boolean", nullable: false),
                orden = table.Column<int>(type: "integer", nullable: false),
                activo = table.Column<bool>(type: "boolean", nullable: false),
                institucion_id = table.Column<Guid>(type: "uuid", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_subindices_seccion", x => x.id);
                table.ForeignKey(
                    name: "fk_subindices_seccion_instituciones_institucion_id",
                    column: x => x.institucion_id,
                    principalTable: "instituciones",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_subindices_seccion_tipos_funcionario_tipo_funcionario_id",
                    column: x => x.tipo_funcionario_id,
                    principalTable: "tipos_funcionario",
                    principalColumn: "id",
                    onDelete: ReferentialAction.SetNull);
            });

        migrationBuilder.CreateIndex(
            name: "ix_titulos_en_curso_subindice_seccion_id",
            table: "titulos_en_curso",
            column: "subindice_seccion_id");

        migrationBuilder.CreateIndex(
            name: "ix_titulos_academicos_subindice_seccion_id",
            table: "titulos_academicos",
            column: "subindice_seccion_id");

        migrationBuilder.CreateIndex(
            name: "ix_referencias_personales_subindice_seccion_id",
            table: "referencias_personales",
            column: "subindice_seccion_id");

        migrationBuilder.CreateIndex(
            name: "ix_experiencias_laborales_subindice_seccion_id",
            table: "experiencias_laborales",
            column: "subindice_seccion_id");

        migrationBuilder.CreateIndex(
            name: "ix_capacitaciones_subindice_seccion_id",
            table: "capacitaciones",
            column: "subindice_seccion_id");

        migrationBuilder.CreateIndex(
            name: "ix_subindices_seccion_institucion_id",
            table: "subindices_seccion",
            column: "institucion_id");

        migrationBuilder.CreateIndex(
            name: "ix_subindices_seccion_institucion_seccion_alcance_nombre_activo",
            table: "subindices_seccion",
            columns: new[] { "institucion_id", "seccion", "tipo_funcionario_id", "nombre" },
            unique: true,
            filter: "activo = true")
            .Annotation("Npgsql:NullsDistinct", false);

        migrationBuilder.CreateIndex(
            name: "ix_subindices_seccion_tipo_funcionario_id",
            table: "subindices_seccion",
            column: "tipo_funcionario_id");

        migrationBuilder.AddForeignKey(
            name: "fk_capacitaciones_subindices_seccion_subindice_seccion_id",
            table: "capacitaciones",
            column: "subindice_seccion_id",
            principalTable: "subindices_seccion",
            principalColumn: "id",
            onDelete: ReferentialAction.Restrict);

        migrationBuilder.AddForeignKey(
            name: "fk_experiencias_laborales_subindices_seccion_subindice_seccion",
            table: "experiencias_laborales",
            column: "subindice_seccion_id",
            principalTable: "subindices_seccion",
            principalColumn: "id",
            onDelete: ReferentialAction.Restrict);

        migrationBuilder.AddForeignKey(
            name: "fk_referencias_personales_subindices_seccion_subindice_seccion",
            table: "referencias_personales",
            column: "subindice_seccion_id",
            principalTable: "subindices_seccion",
            principalColumn: "id",
            onDelete: ReferentialAction.Restrict);

        migrationBuilder.AddForeignKey(
            name: "fk_titulos_academicos_subindices_seccion_subindice_seccion_id",
            table: "titulos_academicos",
            column: "subindice_seccion_id",
            principalTable: "subindices_seccion",
            principalColumn: "id",
            onDelete: ReferentialAction.Restrict);

        migrationBuilder.AddForeignKey(
            name: "fk_titulos_en_curso_subindices_seccion_subindice_seccion_id",
            table: "titulos_en_curso",
            column: "subindice_seccion_id",
            principalTable: "subindices_seccion",
            principalColumn: "id",
            onDelete: ReferentialAction.Restrict);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "fk_capacitaciones_subindices_seccion_subindice_seccion_id",
            table: "capacitaciones");

        migrationBuilder.DropForeignKey(
            name: "fk_experiencias_laborales_subindices_seccion_subindice_seccion",
            table: "experiencias_laborales");

        migrationBuilder.DropForeignKey(
            name: "fk_referencias_personales_subindices_seccion_subindice_seccion",
            table: "referencias_personales");

        migrationBuilder.DropForeignKey(
            name: "fk_titulos_academicos_subindices_seccion_subindice_seccion_id",
            table: "titulos_academicos");

        migrationBuilder.DropForeignKey(
            name: "fk_titulos_en_curso_subindices_seccion_subindice_seccion_id",
            table: "titulos_en_curso");

        migrationBuilder.DropTable(
            name: "subindices_seccion");

        migrationBuilder.DropIndex(
            name: "ix_titulos_en_curso_subindice_seccion_id",
            table: "titulos_en_curso");

        migrationBuilder.DropIndex(
            name: "ix_titulos_academicos_subindice_seccion_id",
            table: "titulos_academicos");

        migrationBuilder.DropIndex(
            name: "ix_referencias_personales_subindice_seccion_id",
            table: "referencias_personales");

        migrationBuilder.DropIndex(
            name: "ix_experiencias_laborales_subindice_seccion_id",
            table: "experiencias_laborales");

        migrationBuilder.DropIndex(
            name: "ix_capacitaciones_subindice_seccion_id",
            table: "capacitaciones");

        migrationBuilder.DropColumn(
            name: "subindice_seccion_id",
            table: "titulos_en_curso");

        migrationBuilder.DropColumn(
            name: "subindice_seccion_id",
            table: "titulos_academicos");

        migrationBuilder.DropColumn(
            name: "subindice_seccion_id",
            table: "referencias_personales");

        migrationBuilder.DropColumn(
            name: "subindice_seccion_id",
            table: "experiencias_laborales");

        migrationBuilder.DropColumn(
            name: "subindice_seccion_id",
            table: "capacitaciones");
    }
}
