using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional
#pragma warning disable CA1861

namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Migrations;

/// <inheritdoc />
public partial class AgregarHojaDeVida : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<Guid>(
            name: "tipo_funcionario_id",
            table: "personas",
            type: "uuid",
            nullable: true);

        migrationBuilder.CreateTable(
            name: "elementos_catalogo",
            columns: table => new
            {
                id = table.Column<int>(type: "integer", nullable: false),
                tipo = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                codigo = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                nombre = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                padre_id = table.Column<int>(type: "integer", nullable: true),
                codigo_externo = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                orden = table.Column<int>(type: "integer", nullable: false),
                activo = table.Column<bool>(type: "boolean", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_elementos_catalogo", x => x.id);
                table.ForeignKey(
                    name: "fk_elementos_catalogo_elementos_catalogo_padre_id",
                    column: x => x.padre_id,
                    principalTable: "elementos_catalogo",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateTable(
            name: "tipos_documento",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                codigo = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                nombre = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                descripcion = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                tiene_vencimiento = table.Column<bool>(type: "boolean", nullable: false),
                orden = table.Column<int>(type: "integer", nullable: false),
                activo = table.Column<bool>(type: "boolean", nullable: false),
                institucion_id = table.Column<Guid>(type: "uuid", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_tipos_documento", x => x.id);
                table.ForeignKey(
                    name: "fk_tipos_documento_instituciones_institucion_id",
                    column: x => x.institucion_id,
                    principalTable: "instituciones",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateTable(
            name: "tipos_funcionario",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                codigo = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                nombre = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                es_docente = table.Column<bool>(type: "boolean", nullable: false),
                activo = table.Column<bool>(type: "boolean", nullable: false),
                institucion_id = table.Column<Guid>(type: "uuid", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_tipos_funcionario", x => x.id);
                table.ForeignKey(
                    name: "fk_tipos_funcionario_instituciones_institucion_id",
                    column: x => x.institucion_id,
                    principalTable: "instituciones",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateTable(
            name: "capacitaciones",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                nombre_evento = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                institucion_organizadora = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                tipo_capacitacion_id = table.Column<int>(type: "integer", nullable: true),
                tipo_participacion = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                fecha_inicio = table.Column<DateOnly>(type: "date", nullable: true),
                fecha_fin = table.Column<DateOnly>(type: "date", nullable: true),
                numero_horas = table.Column<int>(type: "integer", nullable: true),
                lugar = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                financiada_por_institucion = table.Column<bool>(type: "boolean", nullable: false),
                institucion_id = table.Column<Guid>(type: "uuid", nullable: false),
                persona_id = table.Column<Guid>(type: "uuid", nullable: false),
                archivo_id = table.Column<Guid>(type: "uuid", nullable: true),
                fecha_actualizacion_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_capacitaciones", x => x.id);
                table.ForeignKey(
                    name: "fk_capacitaciones_archivos_adjuntos_archivo_id",
                    column: x => x.archivo_id,
                    principalTable: "archivos_adjuntos",
                    principalColumn: "id",
                    onDelete: ReferentialAction.SetNull);
                table.ForeignKey(
                    name: "fk_capacitaciones_elementos_catalogo_tipo_capacitacion_id",
                    column: x => x.tipo_capacitacion_id,
                    principalTable: "elementos_catalogo",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_capacitaciones_instituciones_institucion_id",
                    column: x => x.institucion_id,
                    principalTable: "instituciones",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_capacitaciones_personas_persona_id",
                    column: x => x.persona_id,
                    principalTable: "personas",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "experiencias_laborales",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                empleador = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                cargo = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                fecha_inicio = table.Column<DateOnly>(type: "date", nullable: false),
                fecha_fin = table.Column<DateOnly>(type: "date", nullable: true),
                trabaja_actualmente = table.Column<bool>(type: "boolean", nullable: false),
                ciudad = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                pais_id = table.Column<int>(type: "integer", nullable: true),
                funciones = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                institucion_id = table.Column<Guid>(type: "uuid", nullable: false),
                persona_id = table.Column<Guid>(type: "uuid", nullable: false),
                archivo_id = table.Column<Guid>(type: "uuid", nullable: true),
                fecha_actualizacion_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_experiencias_laborales", x => x.id);
                table.ForeignKey(
                    name: "fk_experiencias_laborales_archivos_adjuntos_archivo_id",
                    column: x => x.archivo_id,
                    principalTable: "archivos_adjuntos",
                    principalColumn: "id",
                    onDelete: ReferentialAction.SetNull);
                table.ForeignKey(
                    name: "fk_experiencias_laborales_elementos_catalogo_pais_id",
                    column: x => x.pais_id,
                    principalTable: "elementos_catalogo",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_experiencias_laborales_instituciones_institucion_id",
                    column: x => x.institucion_id,
                    principalTable: "instituciones",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_experiencias_laborales_personas_persona_id",
                    column: x => x.persona_id,
                    principalTable: "personas",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "fichas_personales",
            columns: table => new
            {
                persona_id = table.Column<Guid>(type: "uuid", nullable: false),
                primer_nombre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                segundo_nombre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                primer_apellido = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                segundo_apellido = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                sexo_id = table.Column<int>(type: "integer", nullable: true),
                fecha_nacimiento = table.Column<DateOnly>(type: "date", nullable: true),
                estado_civil_id = table.Column<int>(type: "integer", nullable: true),
                tipo_sangre_id = table.Column<int>(type: "integer", nullable: true),
                etnia_id = table.Column<int>(type: "integer", nullable: true),
                nacionalidad_indigena_id = table.Column<int>(type: "integer", nullable: true),
                pais_nacionalidad_id = table.Column<int>(type: "integer", nullable: true),
                pais_nacimiento_id = table.Column<int>(type: "integer", nullable: true),
                parroquia_nacimiento_id = table.Column<int>(type: "integer", nullable: true),
                parroquia_residencia_id = table.Column<int>(type: "integer", nullable: true),
                calle_principal = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                calle_secundaria = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                numero_casa = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                referencia_domicilio = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                codigo_postal = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                telefono_convencional = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                celular = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                correo_institucional = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                discapacidad_id = table.Column<int>(type: "integer", nullable: true),
                porcentaje_discapacidad = table.Column<int>(type: "integer", nullable: true),
                numero_carnet_discapacidad = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                foto_archivo_id = table.Column<Guid>(type: "uuid", nullable: true),
                fecha_actualizacion_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                institucion_id = table.Column<Guid>(type: "uuid", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_fichas_personales", x => x.persona_id);
                table.CheckConstraint("ck_fichas_personales_porcentaje_discapacidad", "porcentaje_discapacidad IS NULL OR porcentaje_discapacidad BETWEEN 0 AND 100");
                table.ForeignKey(
                    name: "fk_fichas_personales_archivos_adjuntos_foto_archivo_id",
                    column: x => x.foto_archivo_id,
                    principalTable: "archivos_adjuntos",
                    principalColumn: "id",
                    onDelete: ReferentialAction.SetNull);
                table.ForeignKey(
                    name: "fk_fichas_personales_elementos_catalogo_discapacidad_id",
                    column: x => x.discapacidad_id,
                    principalTable: "elementos_catalogo",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_fichas_personales_elementos_catalogo_estado_civil_id",
                    column: x => x.estado_civil_id,
                    principalTable: "elementos_catalogo",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_fichas_personales_elementos_catalogo_etnia_id",
                    column: x => x.etnia_id,
                    principalTable: "elementos_catalogo",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_fichas_personales_elementos_catalogo_nacionalidad_indigena_",
                    column: x => x.nacionalidad_indigena_id,
                    principalTable: "elementos_catalogo",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_fichas_personales_elementos_catalogo_pais_nacimiento_id",
                    column: x => x.pais_nacimiento_id,
                    principalTable: "elementos_catalogo",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_fichas_personales_elementos_catalogo_pais_nacionalidad_id",
                    column: x => x.pais_nacionalidad_id,
                    principalTable: "elementos_catalogo",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_fichas_personales_elementos_catalogo_parroquia_nacimiento_id",
                    column: x => x.parroquia_nacimiento_id,
                    principalTable: "elementos_catalogo",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_fichas_personales_elementos_catalogo_parroquia_residencia_id",
                    column: x => x.parroquia_residencia_id,
                    principalTable: "elementos_catalogo",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_fichas_personales_elementos_catalogo_sexo_id",
                    column: x => x.sexo_id,
                    principalTable: "elementos_catalogo",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_fichas_personales_elementos_catalogo_tipo_sangre_id",
                    column: x => x.tipo_sangre_id,
                    principalTable: "elementos_catalogo",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_fichas_personales_instituciones_institucion_id",
                    column: x => x.institucion_id,
                    principalTable: "instituciones",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_fichas_personales_personas_persona_id",
                    column: x => x.persona_id,
                    principalTable: "personas",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "titulos_academicos",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                nombre_titulo = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                grado_academico_id = table.Column<int>(type: "integer", nullable: false),
                universidad_id = table.Column<int>(type: "integer", nullable: true),
                nombre_institucion_otra = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                campo_detallado_unesco_id = table.Column<int>(type: "integer", nullable: true),
                numero_registro_senescyt = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                fecha_obtencion = table.Column<DateOnly>(type: "date", nullable: true),
                fecha_registro_senescyt = table.Column<DateOnly>(type: "date", nullable: true),
                institucion_id = table.Column<Guid>(type: "uuid", nullable: false),
                persona_id = table.Column<Guid>(type: "uuid", nullable: false),
                archivo_id = table.Column<Guid>(type: "uuid", nullable: true),
                fecha_actualizacion_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_titulos_academicos", x => x.id);
                table.CheckConstraint("ck_titulos_academicos_institucion", "universidad_id IS NOT NULL OR nombre_institucion_otra IS NOT NULL");
                table.ForeignKey(
                    name: "fk_titulos_academicos_archivos_adjuntos_archivo_id",
                    column: x => x.archivo_id,
                    principalTable: "archivos_adjuntos",
                    principalColumn: "id",
                    onDelete: ReferentialAction.SetNull);
                table.ForeignKey(
                    name: "fk_titulos_academicos_elementos_catalogo_campo_detallado_unesc",
                    column: x => x.campo_detallado_unesco_id,
                    principalTable: "elementos_catalogo",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_titulos_academicos_elementos_catalogo_grado_academico_id",
                    column: x => x.grado_academico_id,
                    principalTable: "elementos_catalogo",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_titulos_academicos_elementos_catalogo_universidad_id",
                    column: x => x.universidad_id,
                    principalTable: "elementos_catalogo",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_titulos_academicos_instituciones_institucion_id",
                    column: x => x.institucion_id,
                    principalTable: "instituciones",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_titulos_academicos_personas_persona_id",
                    column: x => x.persona_id,
                    principalTable: "personas",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "titulos_en_curso",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                nombre_programa = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                grado_academico_id = table.Column<int>(type: "integer", nullable: false),
                universidad_id = table.Column<int>(type: "integer", nullable: true),
                nombre_institucion_otra = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                campo_detallado_unesco_id = table.Column<int>(type: "integer", nullable: true),
                fecha_inicio = table.Column<DateOnly>(type: "date", nullable: true),
                fecha_fin_estimada = table.Column<DateOnly>(type: "date", nullable: true),
                tiene_beca = table.Column<bool>(type: "boolean", nullable: false),
                tipo_beca_id = table.Column<int>(type: "integer", nullable: true),
                financiamiento_beca_id = table.Column<int>(type: "integer", nullable: true),
                porcentaje_beca = table.Column<int>(type: "integer", nullable: true),
                monto_beca = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                institucion_id = table.Column<Guid>(type: "uuid", nullable: false),
                persona_id = table.Column<Guid>(type: "uuid", nullable: false),
                archivo_id = table.Column<Guid>(type: "uuid", nullable: true),
                fecha_actualizacion_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_titulos_en_curso", x => x.id);
                table.CheckConstraint("ck_titulos_en_curso_institucion", "universidad_id IS NOT NULL OR nombre_institucion_otra IS NOT NULL");
                table.CheckConstraint("ck_titulos_en_curso_porcentaje_beca", "porcentaje_beca IS NULL OR porcentaje_beca BETWEEN 0 AND 100");
                table.ForeignKey(
                    name: "fk_titulos_en_curso_archivos_adjuntos_archivo_id",
                    column: x => x.archivo_id,
                    principalTable: "archivos_adjuntos",
                    principalColumn: "id",
                    onDelete: ReferentialAction.SetNull);
                table.ForeignKey(
                    name: "fk_titulos_en_curso_elementos_catalogo_campo_detallado_unesco_",
                    column: x => x.campo_detallado_unesco_id,
                    principalTable: "elementos_catalogo",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_titulos_en_curso_elementos_catalogo_financiamiento_beca_id",
                    column: x => x.financiamiento_beca_id,
                    principalTable: "elementos_catalogo",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_titulos_en_curso_elementos_catalogo_grado_academico_id",
                    column: x => x.grado_academico_id,
                    principalTable: "elementos_catalogo",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_titulos_en_curso_elementos_catalogo_tipo_beca_id",
                    column: x => x.tipo_beca_id,
                    principalTable: "elementos_catalogo",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_titulos_en_curso_elementos_catalogo_universidad_id",
                    column: x => x.universidad_id,
                    principalTable: "elementos_catalogo",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_titulos_en_curso_instituciones_institucion_id",
                    column: x => x.institucion_id,
                    principalTable: "instituciones",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_titulos_en_curso_personas_persona_id",
                    column: x => x.persona_id,
                    principalTable: "personas",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "documentos_personales",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                tipo_documento_id = table.Column<Guid>(type: "uuid", nullable: false),
                numero_documento = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                entidad_emisora = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                fecha_emision = table.Column<DateOnly>(type: "date", nullable: true),
                fecha_vencimiento = table.Column<DateOnly>(type: "date", nullable: true),
                categoria_licencia = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                puntos_licencia = table.Column<int>(type: "integer", nullable: true),
                institucion_id = table.Column<Guid>(type: "uuid", nullable: false),
                persona_id = table.Column<Guid>(type: "uuid", nullable: false),
                archivo_id = table.Column<Guid>(type: "uuid", nullable: true),
                fecha_actualizacion_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_documentos_personales", x => x.id);
                table.ForeignKey(
                    name: "fk_documentos_personales_archivos_adjuntos_archivo_id",
                    column: x => x.archivo_id,
                    principalTable: "archivos_adjuntos",
                    principalColumn: "id",
                    onDelete: ReferentialAction.SetNull);
                table.ForeignKey(
                    name: "fk_documentos_personales_instituciones_institucion_id",
                    column: x => x.institucion_id,
                    principalTable: "instituciones",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_documentos_personales_personas_persona_id",
                    column: x => x.persona_id,
                    principalTable: "personas",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "fk_documentos_personales_tipos_documento_tipo_documento_id",
                    column: x => x.tipo_documento_id,
                    principalTable: "tipos_documento",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateTable(
            name: "requisitos_documento",
            columns: table => new
            {
                id = table.Column<Guid>(type: "uuid", nullable: false),
                tipo_documento_id = table.Column<Guid>(type: "uuid", nullable: false),
                tipo_funcionario_id = table.Column<Guid>(type: "uuid", nullable: true),
                es_obligatorio = table.Column<bool>(type: "boolean", nullable: false),
                activo = table.Column<bool>(type: "boolean", nullable: false),
                institucion_id = table.Column<Guid>(type: "uuid", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_requisitos_documento", x => x.id);
                table.ForeignKey(
                    name: "fk_requisitos_documento_instituciones_institucion_id",
                    column: x => x.institucion_id,
                    principalTable: "instituciones",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "fk_requisitos_documento_tipos_documento_tipo_documento_id",
                    column: x => x.tipo_documento_id,
                    principalTable: "tipos_documento",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "fk_requisitos_documento_tipos_funcionario_tipo_funcionario_id",
                    column: x => x.tipo_funcionario_id,
                    principalTable: "tipos_funcionario",
                    principalColumn: "id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.InsertData(
            table: "elementos_catalogo",
            columns: new[] { "id", "activo", "codigo", "codigo_externo", "nombre", "orden", "padre_id", "tipo" },
            values: new object[,]
            {
                { 1, true, "HOMBRE", null, "Hombre", 1, null, "Sexo" },
                { 2, true, "MUJER", null, "Mujer", 2, null, "Sexo" },
                { 11, true, "SOLTERO", null, "Soltero(a)", 1, null, "EstadoCivil" },
                { 12, true, "CASADO", null, "Casado(a)", 2, null, "EstadoCivil" },
                { 13, true, "DIVORCIADO", null, "Divorciado(a)", 3, null, "EstadoCivil" },
                { 14, true, "VIUDO", null, "Viudo(a)", 4, null, "EstadoCivil" },
                { 15, true, "UNION_HECHO", null, "Unión de hecho", 5, null, "EstadoCivil" },
                { 21, true, "A_POS", null, "A+", 1, null, "TipoSangre" },
                { 22, true, "A_NEG", null, "A-", 2, null, "TipoSangre" },
                { 23, true, "B_POS", null, "B+", 3, null, "TipoSangre" },
                { 24, true, "B_NEG", null, "B-", 4, null, "TipoSangre" },
                { 25, true, "AB_POS", null, "AB+", 5, null, "TipoSangre" },
                { 26, true, "AB_NEG", null, "AB-", 6, null, "TipoSangre" },
                { 27, true, "O_POS", null, "O+", 7, null, "TipoSangre" },
                { 28, true, "O_NEG", null, "O-", 8, null, "TipoSangre" },
                { 41, true, "PEDAGOGICA", "1", "Capacitación pedagógica / docente", 1, null, "TipoCapacitacion" },
                { 42, true, "TECNICA", "2", "Capacitación técnica / profesional", 2, null, "TipoCapacitacion" },
                { 43, true, "DISCIPLINAR", "3", "Actualización disciplinar", 3, null, "TipoCapacitacion" },
                { 44, true, "SEMINARIO_TALLER", "4", "Seminario / taller", 4, null, "TipoCapacitacion" },
                { 45, true, "CONGRESO_SIMPOSIO", "5", "Congreso / simposio", 5, null, "TipoCapacitacion" },
                { 46, true, "CERTIFICACION", "6", "Certificación", 6, null, "TipoCapacitacion" },
                { 47, true, "OTRO", "7", "Otro", 7, null, "TipoCapacitacion" }
            });

        migrationBuilder.CreateIndex(
            name: "ix_personas_tipo_funcionario_id",
            table: "personas",
            column: "tipo_funcionario_id");

        migrationBuilder.CreateIndex(
            name: "ix_capacitaciones_archivo_id",
            table: "capacitaciones",
            column: "archivo_id");

        migrationBuilder.CreateIndex(
            name: "ix_capacitaciones_institucion_id",
            table: "capacitaciones",
            column: "institucion_id");

        migrationBuilder.CreateIndex(
            name: "ix_capacitaciones_persona_id",
            table: "capacitaciones",
            column: "persona_id");

        migrationBuilder.CreateIndex(
            name: "ix_capacitaciones_tipo_capacitacion_id",
            table: "capacitaciones",
            column: "tipo_capacitacion_id");

        migrationBuilder.CreateIndex(
            name: "ix_documentos_personales_archivo_id",
            table: "documentos_personales",
            column: "archivo_id");

        migrationBuilder.CreateIndex(
            name: "ix_documentos_personales_institucion_id",
            table: "documentos_personales",
            column: "institucion_id");

        migrationBuilder.CreateIndex(
            name: "ix_documentos_personales_persona_id",
            table: "documentos_personales",
            column: "persona_id");

        migrationBuilder.CreateIndex(
            name: "ix_documentos_personales_persona_id_tipo_documento_id",
            table: "documentos_personales",
            columns: new[] { "persona_id", "tipo_documento_id" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "ix_documentos_personales_tipo_documento_id",
            table: "documentos_personales",
            column: "tipo_documento_id");

        migrationBuilder.CreateIndex(
            name: "ix_elementos_catalogo_padre_id",
            table: "elementos_catalogo",
            column: "padre_id");

        migrationBuilder.CreateIndex(
            name: "ix_elementos_catalogo_tipo_codigo",
            table: "elementos_catalogo",
            columns: new[] { "tipo", "codigo" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "ix_experiencias_laborales_archivo_id",
            table: "experiencias_laborales",
            column: "archivo_id");

        migrationBuilder.CreateIndex(
            name: "ix_experiencias_laborales_institucion_id",
            table: "experiencias_laborales",
            column: "institucion_id");

        migrationBuilder.CreateIndex(
            name: "ix_experiencias_laborales_pais_id",
            table: "experiencias_laborales",
            column: "pais_id");

        migrationBuilder.CreateIndex(
            name: "ix_experiencias_laborales_persona_id",
            table: "experiencias_laborales",
            column: "persona_id");

        migrationBuilder.CreateIndex(
            name: "ix_fichas_personales_discapacidad_id",
            table: "fichas_personales",
            column: "discapacidad_id");

        migrationBuilder.CreateIndex(
            name: "ix_fichas_personales_estado_civil_id",
            table: "fichas_personales",
            column: "estado_civil_id");

        migrationBuilder.CreateIndex(
            name: "ix_fichas_personales_etnia_id",
            table: "fichas_personales",
            column: "etnia_id");

        migrationBuilder.CreateIndex(
            name: "ix_fichas_personales_foto_archivo_id",
            table: "fichas_personales",
            column: "foto_archivo_id");

        migrationBuilder.CreateIndex(
            name: "ix_fichas_personales_institucion_id",
            table: "fichas_personales",
            column: "institucion_id");

        migrationBuilder.CreateIndex(
            name: "ix_fichas_personales_nacionalidad_indigena_id",
            table: "fichas_personales",
            column: "nacionalidad_indigena_id");

        migrationBuilder.CreateIndex(
            name: "ix_fichas_personales_pais_nacimiento_id",
            table: "fichas_personales",
            column: "pais_nacimiento_id");

        migrationBuilder.CreateIndex(
            name: "ix_fichas_personales_pais_nacionalidad_id",
            table: "fichas_personales",
            column: "pais_nacionalidad_id");

        migrationBuilder.CreateIndex(
            name: "ix_fichas_personales_parroquia_nacimiento_id",
            table: "fichas_personales",
            column: "parroquia_nacimiento_id");

        migrationBuilder.CreateIndex(
            name: "ix_fichas_personales_parroquia_residencia_id",
            table: "fichas_personales",
            column: "parroquia_residencia_id");

        migrationBuilder.CreateIndex(
            name: "ix_fichas_personales_sexo_id",
            table: "fichas_personales",
            column: "sexo_id");

        migrationBuilder.CreateIndex(
            name: "ix_fichas_personales_tipo_sangre_id",
            table: "fichas_personales",
            column: "tipo_sangre_id");

        migrationBuilder.CreateIndex(
            name: "ix_requisitos_documento_tipo_documento_id",
            table: "requisitos_documento",
            column: "tipo_documento_id");

        migrationBuilder.CreateIndex(
            name: "ix_requisitos_documento_tipo_funcionario_id",
            table: "requisitos_documento",
            column: "tipo_funcionario_id");

        migrationBuilder.CreateIndex(
            name: "ix_requisitos_documento_unico",
            table: "requisitos_documento",
            columns: new[] { "institucion_id", "tipo_documento_id", "tipo_funcionario_id" },
            unique: true)
            .Annotation("Npgsql:NullsDistinct", false);

        migrationBuilder.CreateIndex(
            name: "ix_tipos_documento_institucion_id_codigo",
            table: "tipos_documento",
            columns: new[] { "institucion_id", "codigo" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "ix_tipos_funcionario_institucion_id_codigo",
            table: "tipos_funcionario",
            columns: new[] { "institucion_id", "codigo" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "ix_titulos_academicos_archivo_id",
            table: "titulos_academicos",
            column: "archivo_id");

        migrationBuilder.CreateIndex(
            name: "ix_titulos_academicos_campo_detallado_unesco_id",
            table: "titulos_academicos",
            column: "campo_detallado_unesco_id");

        migrationBuilder.CreateIndex(
            name: "ix_titulos_academicos_grado_academico_id",
            table: "titulos_academicos",
            column: "grado_academico_id");

        migrationBuilder.CreateIndex(
            name: "ix_titulos_academicos_institucion_id",
            table: "titulos_academicos",
            column: "institucion_id");

        migrationBuilder.CreateIndex(
            name: "ix_titulos_academicos_persona_id",
            table: "titulos_academicos",
            column: "persona_id");

        migrationBuilder.CreateIndex(
            name: "ix_titulos_academicos_universidad_id",
            table: "titulos_academicos",
            column: "universidad_id");

        migrationBuilder.CreateIndex(
            name: "ix_titulos_en_curso_archivo_id",
            table: "titulos_en_curso",
            column: "archivo_id");

        migrationBuilder.CreateIndex(
            name: "ix_titulos_en_curso_campo_detallado_unesco_id",
            table: "titulos_en_curso",
            column: "campo_detallado_unesco_id");

        migrationBuilder.CreateIndex(
            name: "ix_titulos_en_curso_financiamiento_beca_id",
            table: "titulos_en_curso",
            column: "financiamiento_beca_id");

        migrationBuilder.CreateIndex(
            name: "ix_titulos_en_curso_grado_academico_id",
            table: "titulos_en_curso",
            column: "grado_academico_id");

        migrationBuilder.CreateIndex(
            name: "ix_titulos_en_curso_institucion_id",
            table: "titulos_en_curso",
            column: "institucion_id");

        migrationBuilder.CreateIndex(
            name: "ix_titulos_en_curso_persona_id",
            table: "titulos_en_curso",
            column: "persona_id");

        migrationBuilder.CreateIndex(
            name: "ix_titulos_en_curso_tipo_beca_id",
            table: "titulos_en_curso",
            column: "tipo_beca_id");

        migrationBuilder.CreateIndex(
            name: "ix_titulos_en_curso_universidad_id",
            table: "titulos_en_curso",
            column: "universidad_id");

        migrationBuilder.AddForeignKey(
            name: "fk_personas_tipos_funcionario_tipo_funcionario_id",
            table: "personas",
            column: "tipo_funcionario_id",
            principalTable: "tipos_funcionario",
            principalColumn: "id",
            onDelete: ReferentialAction.SetNull);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "fk_personas_tipos_funcionario_tipo_funcionario_id",
            table: "personas");

        migrationBuilder.DropTable(
            name: "capacitaciones");

        migrationBuilder.DropTable(
            name: "documentos_personales");

        migrationBuilder.DropTable(
            name: "experiencias_laborales");

        migrationBuilder.DropTable(
            name: "fichas_personales");

        migrationBuilder.DropTable(
            name: "requisitos_documento");

        migrationBuilder.DropTable(
            name: "titulos_academicos");

        migrationBuilder.DropTable(
            name: "titulos_en_curso");

        migrationBuilder.DropTable(
            name: "tipos_documento");

        migrationBuilder.DropTable(
            name: "tipos_funcionario");

        migrationBuilder.DropTable(
            name: "elementos_catalogo");

        migrationBuilder.DropIndex(
            name: "ix_personas_tipo_funcionario_id",
            table: "personas");

        migrationBuilder.DropColumn(
            name: "tipo_funcionario_id",
            table: "personas");
    }
}
