namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Configuraciones;

using Istpet.ActualizacionDatos.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class ObservacionConfiguracion : IEntityTypeConfiguration<Observacion>
{
    public void Configure(EntityTypeBuilder<Observacion> builder)
    {
        builder.ToTable("observaciones");

        builder.HasKey(o => o.Id);

        builder.Property(o => o.Id)
            .HasColumnName("id");

        builder.Property(o => o.InstitucionId)
            .IsRequired()
            .HasColumnName("institucion_id");

        builder.Property(o => o.PersonaId)
            .IsRequired()
            .HasColumnName("persona_id");

        builder.Property(o => o.Ronda)
            .IsRequired()
            .HasColumnName("ronda");

        builder.Property(o => o.Autor)
            .HasMaxLength(200)
            .IsRequired()
            .HasColumnName("autor");

        builder.Property(o => o.Texto)
            .IsRequired()
            .HasColumnName("texto");

        builder.Property(o => o.FechaUtc)
            .IsRequired()
            .HasColumnName("fecha_utc");

        builder.HasOne<Institucion>()
            .WithMany()
            .HasForeignKey(o => o.InstitucionId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Persona>()
            .WithMany()
            .HasForeignKey(o => o.PersonaId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(o => o.Marcas)
            .WithOne()
            .HasForeignKey(m => m.ObservacionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(o => o.InstitucionId)
            .HasDatabaseName("ix_observaciones_institucion_id");

        builder.HasIndex(o => o.PersonaId)
            .HasDatabaseName("ix_observaciones_persona_id");
    }
}
