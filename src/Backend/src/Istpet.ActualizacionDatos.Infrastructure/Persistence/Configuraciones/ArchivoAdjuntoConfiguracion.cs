namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Configuraciones;

using Istpet.ActualizacionDatos.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class ArchivoAdjuntoConfiguracion : IEntityTypeConfiguration<ArchivoAdjunto>
{
    public void Configure(EntityTypeBuilder<ArchivoAdjunto> builder)
    {
        builder.ToTable("archivos_adjuntos");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.Id)
            .HasColumnName("id");

        builder.Property(a => a.InstitucionId)
            .IsRequired()
            .HasColumnName("institucion_id");

        builder.Property(a => a.PersonaId)
            .IsRequired()
            .HasColumnName("persona_id");

        builder.Property(a => a.NombreOriginal)
            .HasMaxLength(255)
            .IsRequired()
            .HasColumnName("nombre_original");

        builder.Property(a => a.TipoContenido)
            .HasMaxLength(100)
            .IsRequired()
            .HasColumnName("tipo_contenido");

        builder.Property(a => a.TamanoBytes)
            .IsRequired()
            .HasColumnName("tamano_bytes");

        builder.Property(a => a.HashSha256)
            .HasMaxLength(64)
            .IsRequired()
            .HasColumnName("hash_sha256");

        builder.Property(a => a.RutaRelativa)
            .HasMaxLength(500)
            .IsRequired()
            .HasColumnName("ruta_relativa");

        builder.Property(a => a.ClaveDestino)
            .HasMaxLength(100)
            .HasColumnName("clave_destino");

        builder.Property(a => a.FechaSubidaUtc)
            .IsRequired()
            .HasColumnName("fecha_subida_utc");

        builder.HasOne<Institucion>()
            .WithMany()
            .HasForeignKey(a => a.InstitucionId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Persona>()
            .WithMany()
            .HasForeignKey(a => a.PersonaId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(a => a.InstitucionId)
            .HasDatabaseName("ix_archivos_adjuntos_institucion_id");

        builder.HasIndex(a => a.PersonaId)
            .HasDatabaseName("ix_archivos_adjuntos_persona_id");
    }
}
