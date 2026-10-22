namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Configuraciones.HojaDeVida;

using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class ElementoCatalogoConfiguracion : IEntityTypeConfiguration<ElementoCatalogo>
{
    public void Configure(EntityTypeBuilder<ElementoCatalogo> builder)
    {
        builder.ToTable("elementos_catalogo");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Id)
            .ValueGeneratedNever()
            .HasColumnName("id");

        builder.Property(e => e.Tipo)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("tipo");

        builder.Property(e => e.Codigo)
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("codigo");

        builder.Property(e => e.Nombre)
            .HasMaxLength(300)
            .IsRequired()
            .HasColumnName("nombre");

        builder.Property(e => e.PadreId)
            .HasColumnName("padre_id");

        builder.Property(e => e.CodigoExterno)
            .HasMaxLength(50)
            .HasColumnName("codigo_externo");

        builder.Property(e => e.Orden)
            .IsRequired()
            .HasColumnName("orden");

        builder.Property(e => e.Activo)
            .IsRequired()
            .HasColumnName("activo");

        builder.HasOne<ElementoCatalogo>()
            .WithMany()
            .HasForeignKey(e => e.PadreId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(e => new { e.Tipo, e.Codigo })
            .IsUnique()
            .HasDatabaseName("ix_elementos_catalogo_tipo_codigo");

        builder.HasIndex(e => e.PadreId)
            .HasDatabaseName("ix_elementos_catalogo_padre_id");

        builder.HasData(SemillaCatalogos.Elementos());
    }
}
