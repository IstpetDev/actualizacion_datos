using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Migrations;

/// <inheritdoc />
public partial class AgregarSemillasTiposInstitucionales : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // ADR-0019: datos inmutables de esta migración; no llamar a una semilla que pueda cambiar.
        migrationBuilder.Sql("""
            INSERT INTO tipos_funcionario (id, institucion_id, codigo, nombre, es_docente, activo)
            SELECT gen_random_uuid(), i.id, s.codigo, s.nombre, s.es_docente, true
            FROM instituciones i
            CROSS JOIN (VALUES
                ('DOCENTE', 'Docente', true),
                ('ADMINISTRATIVO', 'Administrativo', false)
            ) AS s(codigo, nombre, es_docente)
            ON CONFLICT (institucion_id, codigo) DO NOTHING;

            INSERT INTO tipos_documento (id, institucion_id, codigo, nombre, descripcion, tiene_vencimiento, orden, activo)
            SELECT gen_random_uuid(), i.id, s.codigo, s.nombre, s.descripcion, s.tiene_vencimiento, s.orden, true
            FROM instituciones i
            CROSS JOIN (VALUES
                ('CEDULA', 'Cédula', 'Adjunte una copia legible de ambos lados de su cédula.', true, 1),
                ('PAPELETA_VOTACION', 'Papeleta de votación', 'Adjunte una copia legible de su papeleta de votación.', false, 2),
                ('ANTECEDENTES_PENALES', 'Certificado de antecedentes penales', 'Adjunte su certificado de antecedentes penales.', false, 3),
                ('DECLARACION_JURAMENTADA', 'Declaración juramentada', 'Adjunte su declaración juramentada notariada.', false, 4),
                ('MECANIZADO_IESS', 'Mecanizado del IESS', 'Adjunte el mecanizado del IESS correspondiente a su historia laboral.', false, 5),
                ('CERTIFICADO_MEDICO', 'Certificado médico', 'Adjunte su certificado médico e indique su fecha de vencimiento.', true, 6)
            ) AS s(codigo, nombre, descripcion, tiene_vencimiento, orden)
            ON CONFLICT (institucion_id, codigo) DO NOTHING;
            """);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // No eliminar tipos editables que pueden tener requisitos o documentos asociados.
    }
}
