using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional
#pragma warning disable CA1861

namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Migrations;

/// <inheritdoc />
public partial class AgregarCuentaBancaria : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "cuentas_bancarias",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                persona_id = table.Column<Guid>(type: "uuid", nullable: false),
                tipo_cuenta_id = table.Column<int>(type: "integer", nullable: false),
                banco_id = table.Column<int>(type: "integer", nullable: true),
                nombre_banco_otro = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                numero_cifrado = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                ultimos_digitos = table.Column<string>(type: "character(4)", fixedLength: true, maxLength: 4, nullable: false),
                huella_numero = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                huella_nomina = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                estado = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                fecha_actualizacion_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                institucion_id = table.Column<Guid>(type: "uuid", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_cuentas_bancarias", x => x.id);
                table.CheckConstraint("ck_cuentas_bancarias_banco", "(banco_id IS NOT NULL) <> (nombre_banco_otro IS NOT NULL)");
                table.CheckConstraint("ck_cuentas_bancarias_ultimos_digitos", "length(ultimos_digitos) = 4");
                table.ForeignKey(
                    name: "fk_cuentas_bancarias_elementos_catalogo_banco_id",
                    column: x => x.banco_id,
                    principalTable: "elementos_catalogo",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_cuentas_bancarias_elementos_catalogo_tipo_cuenta_id",
                    column: x => x.tipo_cuenta_id,
                    principalTable: "elementos_catalogo",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_cuentas_bancarias_instituciones_institucion_id",
                    column: x => x.institucion_id,
                    principalTable: "instituciones",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_cuentas_bancarias_personas_persona_id",
                    column: x => x.persona_id,
                    principalTable: "personas",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.InsertData(
            table: "elementos_catalogo",
            columns: new[] { "id", "activo", "codigo", "codigo_externo", "nombre", "orden", "padre_id", "tipo" },
            values: new object[,]
            {
                { 51, true, "AHORROS", null, "Ahorros", 1, null, "TipoCuentaBancaria" },
                { 52, true, "CORRIENTE", null, "Corriente", 2, null, "TipoCuentaBancaria" }
            });

        migrationBuilder.CreateIndex(
            name: "ix_cuentas_bancarias_banco_id",
            table: "cuentas_bancarias",
            column: "banco_id");

        migrationBuilder.CreateIndex(
            name: "ix_cuentas_bancarias_institucion_id",
            table: "cuentas_bancarias",
            column: "institucion_id");

        migrationBuilder.CreateIndex(
            name: "ix_cuentas_bancarias_tipo_cuenta_id",
            table: "cuentas_bancarias",
            column: "tipo_cuenta_id");

        migrationBuilder.CreateIndex(
            name: "ux_cuentas_bancarias_persona_id",
            table: "cuentas_bancarias",
            column: "persona_id",
            unique: true);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "cuentas_bancarias");

        migrationBuilder.DeleteData(
            table: "elementos_catalogo",
            keyColumn: "id",
            keyValue: 51);

        migrationBuilder.DeleteData(
            table: "elementos_catalogo",
            keyColumn: "id",
            keyValue: 52);
    }
}
