namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Configuraciones;

using Istpet.ActualizacionDatos.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class MarcaObservacionConfiguracion : IEntityTypeConfiguration<MarcaObservacion>
{
    public void Configure(EntityTypeBuilder<MarcaObservacion> builder)
    {
        builder.ToTable("marcas_observacion");

        builder.HasKey(m => m.Id);

        builder.Property(m => m.Id)
            .HasColumnName("id");

        builder.Property(m => m.ObservacionId)
            .IsRequired()
            .HasColumnName("observacion_id");

        builder.Property(m => m.TipoDestino)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("tipo_destino");

        builder.Property(m => m.ClaveDestino)
            .HasMaxLength(200)
            .IsRequired()
            .HasColumnName("clave_destino");

        builder.Property(m => m.Texto)
            .IsRequired()
            .HasColumnName("texto");

        builder.HasIndex(m => m.ObservacionId)
            .HasDatabaseName("ix_marcas_observacion_observacion_id");
    }
}
