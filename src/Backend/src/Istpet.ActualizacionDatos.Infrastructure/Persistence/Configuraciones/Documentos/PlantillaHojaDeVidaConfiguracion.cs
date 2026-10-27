namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Configuraciones.Documentos;

using Istpet.ActualizacionDatos.Domain.Documentos;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class PlantillaHojaDeVidaConfiguracion : IEntityTypeConfiguration<PlantillaHojaDeVida>
{
    public void Configure(EntityTypeBuilder<PlantillaHojaDeVida> builder)
    {
        builder.ToTable("plantillas_hoja_de_vida");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.Id)
            .ValueGeneratedNever();

        builder.Property(p => p.Nombre)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(p => p.Descripcion)
            .HasMaxLength(500);

        builder.Property(p => p.DisenoBase)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(p => p.ConfiguracionJson)
            .IsRequired()
            .HasColumnType("text");

        builder.Property(p => p.EsPredeterminada)
            .IsRequired();

        builder.Property(p => p.FechaCreacionUtc)
            .IsRequired();

        builder.Property(p => p.FechaActualizacionUtc)
            .IsRequired();

        builder.HasMany(p => p.Versiones)
            .WithOne()
            .HasForeignKey(v => v.PlantillaId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
