namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Configuraciones.HojaDeVida;

using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class TipoFuncionarioConfiguracion : IEntityTypeConfiguration<TipoFuncionario>
{
    public void Configure(EntityTypeBuilder<TipoFuncionario> builder)
    {
        builder.ToTable("tipos_funcionario");

        builder.HasKey(t => t.Id);

        builder.Property(t => t.Id)
            .HasColumnName("id");

        builder.Property(t => t.InstitucionId)
            .IsRequired()
            .HasColumnName("institucion_id");

        builder.Property(t => t.Codigo)
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("codigo");

        builder.Property(t => t.Nombre)
            .HasMaxLength(150)
            .IsRequired()
            .HasColumnName("nombre");

        builder.Property(t => t.EsDocente)
            .IsRequired()
            .HasColumnName("es_docente");

        builder.Property(t => t.Activo)
            .IsRequired()
            .HasColumnName("activo");

        builder.HasOne<Institucion>()
            .WithMany()
            .HasForeignKey(t => t.InstitucionId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(t => new { t.InstitucionId, t.Codigo })
            .IsUnique()
            .HasDatabaseName("ix_tipos_funcionario_institucion_id_codigo");
    }
}

public class TipoDocumentoConfiguracion : IEntityTypeConfiguration<TipoDocumento>
{
    public void Configure(EntityTypeBuilder<TipoDocumento> builder)
    {
        builder.ToTable("tipos_documento");

        builder.HasKey(t => t.Id);

        builder.Property(t => t.Id)
            .HasColumnName("id");

        builder.Property(t => t.InstitucionId)
            .IsRequired()
            .HasColumnName("institucion_id");

        builder.Property(t => t.Codigo)
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("codigo");

        builder.Property(t => t.Nombre)
            .HasMaxLength(150)
            .IsRequired()
            .HasColumnName("nombre");

        builder.Property(t => t.Descripcion)
            .HasMaxLength(500)
            .HasColumnName("descripcion");

        builder.Property(t => t.TieneVencimiento)
            .IsRequired()
            .HasColumnName("tiene_vencimiento");

        builder.Property(t => t.Orden)
            .IsRequired()
            .HasColumnName("orden");

        builder.Property(t => t.Activo)
            .IsRequired()
            .HasColumnName("activo");

        builder.HasOne<Institucion>()
            .WithMany()
            .HasForeignKey(t => t.InstitucionId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(t => new { t.InstitucionId, t.Codigo })
            .IsUnique()
            .HasDatabaseName("ix_tipos_documento_institucion_id_codigo");
    }
}

public class RequisitoDocumentoConfiguracion : IEntityTypeConfiguration<RequisitoDocumento>
{
    public void Configure(EntityTypeBuilder<RequisitoDocumento> builder)
    {
        builder.ToTable("requisitos_documento");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.Id)
            .HasColumnName("id");

        builder.Property(r => r.InstitucionId)
            .IsRequired()
            .HasColumnName("institucion_id");

        builder.Property(r => r.TipoDocumentoId)
            .IsRequired()
            .HasColumnName("tipo_documento_id");

        builder.Property(r => r.TipoFuncionarioId)
            .HasColumnName("tipo_funcionario_id");

        builder.Property(r => r.EsObligatorio)
            .IsRequired()
            .HasColumnName("es_obligatorio");

        builder.Property(r => r.Activo)
            .IsRequired()
            .HasColumnName("activo");

        builder.HasOne<Institucion>()
            .WithMany()
            .HasForeignKey(r => r.InstitucionId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<TipoDocumento>()
            .WithMany()
            .HasForeignKey(r => r.TipoDocumentoId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<TipoFuncionario>()
            .WithMany()
            .HasForeignKey(r => r.TipoFuncionarioId)
            .OnDelete(DeleteBehavior.Cascade);

        // Un requisito por combinación; NULLS NOT DISTINCT para que "todos" (sin tipo
        // de funcionario) tampoco se repita.
        builder.HasIndex(r => new { r.InstitucionId, r.TipoDocumentoId, r.TipoFuncionarioId })
            .IsUnique()
            .AreNullsDistinct(false)
            .HasDatabaseName("ix_requisitos_documento_unico");
    }
}
