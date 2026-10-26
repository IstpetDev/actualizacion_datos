namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Configuraciones;

using Istpet.ActualizacionDatos.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class CampanaConfiguracion : IEntityTypeConfiguration<Campana>
{
    public void Configure(EntityTypeBuilder<Campana> builder)
    {
        builder.ToTable("campanas");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.Id)
            .HasColumnName("id");

        builder.Property(c => c.InstitucionId)
            .IsRequired()
            .HasColumnName("institucion_id");

        builder.Property(c => c.Nombre)
            .HasMaxLength(200)
            .IsRequired()
            .HasColumnName("nombre");

        builder.Property(c => c.FechaInicioUtc)
            .IsRequired()
            .HasColumnName("fecha_inicio_utc");

        builder.Property(c => c.FechaFinUtc)
            .IsRequired()
            .HasColumnName("fecha_fin_utc");

        builder.Property(c => c.Activa)
            .IsRequired()
            .HasColumnName("activa");

        builder.HasOne<Institucion>()
            .WithMany()
            .HasForeignKey(c => c.InstitucionId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(c => c.InstitucionId)
            .HasDatabaseName("ix_campanas_institucion_id");
    }
}
