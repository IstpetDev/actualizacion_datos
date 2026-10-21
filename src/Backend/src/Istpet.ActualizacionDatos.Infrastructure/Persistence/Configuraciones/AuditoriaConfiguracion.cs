namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Configuraciones;

using Istpet.ActualizacionDatos.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class AuditoriaConfiguracion : IEntityTypeConfiguration<Auditoria>
{
    public void Configure(EntityTypeBuilder<Auditoria> builder)
    {
        builder.ToTable("auditorias");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.Id)
            .HasColumnName("id");

        builder.Property(a => a.Actor)
            .HasMaxLength(100)
            .IsRequired()
            .HasColumnName("actor");

        builder.Property(a => a.Accion)
            .HasMaxLength(100)
            .IsRequired()
            .HasColumnName("accion");

        builder.Property(a => a.InstitucionId)
            .HasColumnName("institucion_id");

        builder.Property(a => a.FechaUtc)
            .IsRequired()
            .HasColumnName("fecha_utc");

        builder.Property(a => a.Detalle)
            .HasMaxLength(500)
            .HasColumnName("detalle");

        builder.HasIndex(a => a.InstitucionId)
            .HasDatabaseName("ix_auditorias_institucion_id");
    }
}
