using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Migrations;

/// <inheritdoc />
public partial class AgregarAutenticacionYCorreo : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<DateTime>(
            name: "bloqueado_hasta_utc",
            table: "personas",
            type: "timestamp with time zone",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "codigo_verificacion_correo_hash",
            table: "personas",
            type: "character varying(200)",
            maxLength: 200,
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "codigo_verificacion_expiracion_utc",
            table: "personas",
            type: "timestamp with time zone",
            nullable: true);

        migrationBuilder.AddColumn<bool>(
            name: "correo_verificado",
            table: "personas",
            type: "boolean",
            nullable: false,
            defaultValue: false);

        migrationBuilder.AddColumn<bool>(
            name: "debe_cambiar_contrasena",
            table: "personas",
            type: "boolean",
            nullable: false,
            defaultValue: false);

        migrationBuilder.AddColumn<int>(
            name: "intentos_codigo_verificacion",
            table: "personas",
            type: "integer",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.AddColumn<int>(
            name: "intentos_fallidos",
            table: "personas",
            type: "integer",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.AddColumn<string>(
            name: "password_hash",
            table: "personas",
            type: "character varying(500)",
            maxLength: 500,
            nullable: true);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "bloqueado_hasta_utc",
            table: "personas");

        migrationBuilder.DropColumn(
            name: "codigo_verificacion_correo_hash",
            table: "personas");

        migrationBuilder.DropColumn(
            name: "codigo_verificacion_expiracion_utc",
            table: "personas");

        migrationBuilder.DropColumn(
            name: "correo_verificado",
            table: "personas");

        migrationBuilder.DropColumn(
            name: "debe_cambiar_contrasena",
            table: "personas");

        migrationBuilder.DropColumn(
            name: "intentos_codigo_verificacion",
            table: "personas");

        migrationBuilder.DropColumn(
            name: "intentos_fallidos",
            table: "personas");

        migrationBuilder.DropColumn(
            name: "password_hash",
            table: "personas");
    }
}
