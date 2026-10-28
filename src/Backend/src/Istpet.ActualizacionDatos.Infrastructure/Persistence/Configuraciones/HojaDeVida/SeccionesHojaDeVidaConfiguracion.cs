namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Configuraciones.HojaDeVida;

using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using static ConfiguracionComunHojaDeVida;

public class TituloAcademicoConfiguracion : IEntityTypeConfiguration<TituloAcademico>
{
    public void Configure(EntityTypeBuilder<TituloAcademico> builder)
    {
        ConfigurarRegistro(builder, "titulos_academicos");

        builder.Property(t => t.NombreTitulo).HasMaxLength(300).IsRequired().HasColumnName("nombre_titulo");
        builder.Property(t => t.NombreInstitucionOtra).HasMaxLength(300).HasColumnName("nombre_institucion_otra");
        builder.Property(t => t.NumeroRegistroSenescyt).HasMaxLength(50).HasColumnName("numero_registro_senescyt");
        builder.Property(t => t.FechaObtencion).HasColumnName("fecha_obtencion");
        builder.Property(t => t.FechaRegistroSenescyt).HasColumnName("fecha_registro_senescyt");

        RelacionCatalogoObligatoria(builder, t => t.GradoAcademicoId, "grado_academico_id");
        RelacionCatalogo(builder, t => t.UniversidadId, "universidad_id");
        RelacionCatalogo(builder, t => t.CampoDetalladoUnescoId, "campo_detallado_unesco_id");

        builder.ToTable(t => t.HasCheckConstraint(
            "ck_titulos_academicos_institucion",
            "universidad_id IS NOT NULL OR nombre_institucion_otra IS NOT NULL"));
    }
}

public class TituloEnCursoConfiguracion : IEntityTypeConfiguration<TituloEnCurso>
{
    public void Configure(EntityTypeBuilder<TituloEnCurso> builder)
    {
        ConfigurarRegistro(builder, "titulos_en_curso");

        builder.Property(t => t.NombrePrograma).HasMaxLength(300).IsRequired().HasColumnName("nombre_programa");
        builder.Property(t => t.NombreInstitucionOtra).HasMaxLength(300).HasColumnName("nombre_institucion_otra");
        builder.Property(t => t.FechaInicio).HasColumnName("fecha_inicio");
        builder.Property(t => t.FechaFinEstimada).HasColumnName("fecha_fin_estimada");
        builder.Property(t => t.TieneBeca).IsRequired().HasColumnName("tiene_beca");
        builder.Property(t => t.PorcentajeBeca).HasColumnName("porcentaje_beca");
        builder.Property(t => t.MontoBeca).HasPrecision(12, 2).HasColumnName("monto_beca");

        RelacionCatalogoObligatoria(builder, t => t.GradoAcademicoId, "grado_academico_id");
        RelacionCatalogo(builder, t => t.UniversidadId, "universidad_id");
        RelacionCatalogo(builder, t => t.CampoDetalladoUnescoId, "campo_detallado_unesco_id");
        RelacionCatalogo(builder, t => t.TipoBecaId, "tipo_beca_id");
        RelacionCatalogo(builder, t => t.FinanciamientoBecaId, "financiamiento_beca_id");

        builder.ToTable(t =>
        {
            t.HasCheckConstraint(
                "ck_titulos_en_curso_institucion",
                "universidad_id IS NOT NULL OR nombre_institucion_otra IS NOT NULL");
            t.HasCheckConstraint(
                "ck_titulos_en_curso_porcentaje_beca",
                "porcentaje_beca IS NULL OR porcentaje_beca BETWEEN 0 AND 100");
        });
    }
}

public class CapacitacionConfiguracion : IEntityTypeConfiguration<Capacitacion>
{
    public void Configure(EntityTypeBuilder<Capacitacion> builder)
    {
        ConfigurarRegistro(builder, "capacitaciones");

        builder.Property(c => c.NombreEvento).HasMaxLength(300).IsRequired().HasColumnName("nombre_evento");
        builder.Property(c => c.InstitucionOrganizadora).HasMaxLength(300).IsRequired().HasColumnName("institucion_organizadora");
        builder.Property(c => c.TipoParticipacion)
            .HasConversion<string>()
            .HasMaxLength(30)
            .IsRequired()
            .HasColumnName("tipo_participacion");
        builder.Property(c => c.FechaInicio).HasColumnName("fecha_inicio");
        builder.Property(c => c.FechaFin).HasColumnName("fecha_fin");
        builder.Property(c => c.NumeroHoras).HasColumnName("numero_horas");
        builder.Property(c => c.Lugar).HasMaxLength(200).HasColumnName("lugar");
        builder.Property(c => c.FinanciadaPorInstitucion).IsRequired().HasColumnName("financiada_por_institucion");
        builder.Property(c => c.CapacitacionObligatoriaId).HasColumnName("capacitacion_obligatoria_id");

        builder.HasOne<CapacitacionObligatoria>()
            .WithMany()
            .HasForeignKey(c => c.CapacitacionObligatoriaId)
            .OnDelete(DeleteBehavior.Restrict);

        RelacionCatalogo(builder, c => c.TipoCapacitacionId, "tipo_capacitacion_id");
    }
}

public class ReferenciaPersonalConfiguracion : IEntityTypeConfiguration<ReferenciaPersonal>
{
    public void Configure(EntityTypeBuilder<ReferenciaPersonal> builder)
    {
        ConfigurarRegistro(builder, "referencias_personales");

        builder.Property(r => r.Tipo)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired()
            .HasColumnName("tipo");
        builder.Property(r => r.NombresApellidos).HasMaxLength(300).IsRequired().HasColumnName("nombres_apellidos");
        builder.Property(r => r.Telefono).HasMaxLength(30).IsRequired().HasColumnName("telefono");
        builder.Property(r => r.Titulo).HasMaxLength(200).HasColumnName("titulo");
        builder.Property(r => r.CargoActual).HasMaxLength(200).HasColumnName("cargo_actual");
        builder.Property(r => r.Empresa).HasMaxLength(300).HasColumnName("empresa");
    }
}

public class ExperienciaLaboralConfiguracion : IEntityTypeConfiguration<ExperienciaLaboral>
{
    public void Configure(EntityTypeBuilder<ExperienciaLaboral> builder)
    {
        ConfigurarRegistro(builder, "experiencias_laborales");

        builder.Property(e => e.Empleador).HasMaxLength(300).IsRequired().HasColumnName("empleador");
        builder.Property(e => e.Cargo).HasMaxLength(200).IsRequired().HasColumnName("cargo");
        builder.Property(e => e.FechaInicio).IsRequired().HasColumnName("fecha_inicio");
        builder.Property(e => e.FechaFin).HasColumnName("fecha_fin");
        builder.Property(e => e.TrabajaActualmente).IsRequired().HasColumnName("trabaja_actualmente");
        builder.Property(e => e.Ciudad).HasMaxLength(150).HasColumnName("ciudad");
        builder.Property(e => e.Funciones).HasMaxLength(4000).HasColumnName("funciones");

        RelacionCatalogo(builder, e => e.PaisId, "pais_id");
    }
}

public class DocumentoPersonalConfiguracion : IEntityTypeConfiguration<DocumentoPersonal>
{
    public void Configure(EntityTypeBuilder<DocumentoPersonal> builder)
    {
        ConfigurarRegistro(builder, "documentos_personales");

        builder.Property(d => d.TipoDocumentoId).IsRequired().HasColumnName("tipo_documento_id");
        builder.Property(d => d.NumeroDocumento).HasMaxLength(100).HasColumnName("numero_documento");
        builder.Property(d => d.EntidadEmisora).HasMaxLength(150).HasColumnName("entidad_emisora");
        builder.Property(d => d.FechaEmision).HasColumnName("fecha_emision");
        builder.Property(d => d.FechaVencimiento).HasColumnName("fecha_vencimiento");
        builder.Property(d => d.CategoriaLicencia).HasMaxLength(30).HasColumnName("categoria_licencia");
        builder.Property(d => d.PuntosLicencia).HasColumnName("puntos_licencia");

        builder.HasOne<TipoDocumento>()
            .WithMany()
            .HasForeignKey(d => d.TipoDocumentoId)
            .OnDelete(DeleteBehavior.Restrict);

        // ADR-0010, decisión 9: un solo documento vigente por persona y tipo.
        builder.HasIndex(d => new { d.PersonaId, d.TipoDocumentoId })
            .IsUnique()
            .HasDatabaseName("ix_documentos_personales_persona_id_tipo_documento_id");
    }
}
