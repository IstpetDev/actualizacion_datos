namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Configuraciones.HojaDeVida;

using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class SeccionInstitucionConfiguracion : IEntityTypeConfiguration<SeccionInstitucion>
{
    public void Configure(EntityTypeBuilder<SeccionInstitucion> builder)
    {
        builder.ToTable("secciones_institucion");

        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasColumnName("id");
        builder.Property(s => s.InstitucionId).IsRequired().HasColumnName("institucion_id");
        builder.Property(s => s.Seccion)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("seccion");
        builder.Property(s => s.Habilitada).IsRequired().HasColumnName("habilitada");
        builder.Property(s => s.UltimaModificacionUtc).IsRequired().HasColumnName("ultima_modificacion_utc");
        builder.Property(s => s.ModificadoPor).HasMaxLength(150).IsRequired().HasColumnName("modificado_por");

        builder.HasIndex(s => new { s.InstitucionId, s.Seccion })
            .IsUnique()
            .HasDatabaseName("ix_secciones_institucion_institucion_seccion");

        builder.HasOne<Institucion>()
            .WithMany()
            .HasForeignKey(s => s.InstitucionId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
