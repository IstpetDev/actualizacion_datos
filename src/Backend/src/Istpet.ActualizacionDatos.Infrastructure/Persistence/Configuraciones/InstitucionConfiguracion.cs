namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Configuraciones;

using Istpet.ActualizacionDatos.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class InstitucionConfiguracion : IEntityTypeConfiguration<Institucion>
{
    public void Configure(EntityTypeBuilder<Institucion> builder)
    {
        builder.ToTable("instituciones");

        builder.HasKey(i => i.Id);

        builder.Property(i => i.Id)
            .HasColumnName("id");

        builder.Property(i => i.Nombre)
            .HasMaxLength(200)
            .IsRequired()
            .HasColumnName("nombre");

        builder.Property(i => i.Activa)
            .IsRequired()
            .HasColumnName("activa");

        builder.Property(i => i.DominiosCorreoJson).HasColumnName("dominios_correo_json").HasDefaultValue("[]").IsRequired();

        builder.Property(i => i.FechaCreacionUtc)
            .IsRequired()
            .HasColumnName("fecha_creacion_utc");
    }
}
