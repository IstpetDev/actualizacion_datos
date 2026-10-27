using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable
#pragma warning disable CA1861

namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AgregarCapacitacionesObligatoriasYFechaIngreso : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "fecha_ingreso_institucion",
                table: "personas",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "capacitacion_obligatoria_id",
                table: "capacitaciones",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "capacitaciones_obligatorias",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    nombre = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    institucion_organizadora = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    horas_esperadas = table.Column<int>(type: "integer", nullable: true),
                    fecha_realizacion = table.Column<DateOnly>(type: "date", nullable: true),
                    tipo_funcionario_id = table.Column<Guid>(type: "uuid", nullable: true),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    orden = table.Column<int>(type: "integer", nullable: false),
                    institucion_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_capacitaciones_obligatorias", x => x.id);
                    table.ForeignKey(
                        name: "fk_capacitaciones_obligatorias_instituciones_institucion_id",
                        column: x => x.institucion_id,
                        principalTable: "instituciones",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_capacitaciones_obligatorias_tipos_funcionario_tipo_funciona",
                        column: x => x.tipo_funcionario_id,
                        principalTable: "tipos_funcionario",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "ix_capacitaciones_capacitacion_obligatoria_id",
                table: "capacitaciones",
                column: "capacitacion_obligatoria_id");

            migrationBuilder.CreateIndex(
                name: "ix_capacitaciones_obligatorias_institucion_nombre_activo",
                table: "capacitaciones_obligatorias",
                columns: new[] { "institucion_id", "nombre" },
                unique: true,
                filter: "activo = true");

            migrationBuilder.CreateIndex(
                name: "ix_capacitaciones_obligatorias_tipo_funcionario_id",
                table: "capacitaciones_obligatorias",
                column: "tipo_funcionario_id");

            migrationBuilder.AddForeignKey(
                name: "fk_capacitaciones_capacitaciones_obligatorias_capacitacion_obl",
                table: "capacitaciones",
                column: "capacitacion_obligatoria_id",
                principalTable: "capacitaciones_obligatorias",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_capacitaciones_capacitaciones_obligatorias_capacitacion_obl",
                table: "capacitaciones");

            migrationBuilder.DropTable(
                name: "capacitaciones_obligatorias");

            migrationBuilder.DropIndex(
                name: "ix_capacitaciones_capacitacion_obligatoria_id",
                table: "capacitaciones");

            migrationBuilder.DropColumn(
                name: "fecha_ingreso_institucion",
                table: "personas");

            migrationBuilder.DropColumn(
                name: "capacitacion_obligatoria_id",
                table: "capacitaciones");
        }
    }
}
