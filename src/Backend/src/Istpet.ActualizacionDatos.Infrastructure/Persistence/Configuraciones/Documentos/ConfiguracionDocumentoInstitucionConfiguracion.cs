namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Configuraciones.Documentos;

using Istpet.ActualizacionDatos.Domain.Documentos;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class ConfiguracionDocumentoInstitucionConfiguracion : IEntityTypeConfiguration<ConfiguracionDocumentoInstitucion>
{
    public void Configure(EntityTypeBuilder<ConfiguracionDocumentoInstitucion> builder)
    {
        builder.ToTable("configuraciones_documento_institucion");

        builder.HasKey(c => c.InstitucionId);

        builder.Property(c => c.InstitucionId)
            .IsRequired()
            .HasColumnName("institucion_id");

        builder.Property(c => c.NombreVisible)
            .HasMaxLength(150);

        builder.Property(c => c.ColorPrimario)
            .IsRequired()
            .HasMaxLength(7);

        builder.Property(c => c.ColorSecundario)
            .IsRequired()
            .HasMaxLength(7);

        builder.Property(c => c.Lema)
            .HasMaxLength(250);

        builder.Property(c => c.TextoCompromiso)
            .HasMaxLength(1000);

        builder.Property(c => c.FechaActualizacionUtc)
            .IsRequired();
    }
}
