namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Configuraciones.Documentos;

using Istpet.ActualizacionDatos.Domain.Documentos;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class VersionPlantillaHojaDeVidaConfiguracion : IEntityTypeConfiguration<VersionPlantillaHojaDeVida>
{
    public void Configure(EntityTypeBuilder<VersionPlantillaHojaDeVida> builder)
    {
        builder.ToTable("versiones_plantilla_hoja_de_vida");

        builder.HasKey(v => v.Id);

        builder.Property(v => v.Id)
            .ValueGeneratedNever();

        builder.Property(v => v.PlantillaId)
            .IsRequired();

        builder.Property(v => v.NumeroVersion)
            .IsRequired();

        builder.Property(v => v.DisenoBase)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(v => v.ConfiguracionJson)
            .IsRequired()
            .HasColumnType("text");

        builder.Property(v => v.DescripcionCambio)
            .HasMaxLength(500);

        builder.Property(v => v.FechaPublicacionUtc)
            .IsRequired();

        builder.HasIndex(v => new { v.PlantillaId, v.NumeroVersion })
            .IsUnique();
    }
}
