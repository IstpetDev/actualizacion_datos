namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Configuraciones;

using Istpet.ActualizacionDatos.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class PersonaConfiguracion : IEntityTypeConfiguration<Persona>
{
    public void Configure(EntityTypeBuilder<Persona> builder)
    {
        builder.ToTable("personas");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.Id)
            .HasColumnName("id");

        builder.Property(p => p.InstitucionId)
            .IsRequired()
            .HasColumnName("institucion_id");

        builder.Property(p => p.Documento)
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("documento");

        builder.Property(p => p.Nombre)
            .HasMaxLength(200)
            .HasColumnName("nombre");

        builder.Property(p => p.Correo)
            .HasMaxLength(200)
            .HasColumnName("correo");

        builder.Property(p => p.Rol)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("rol");

        builder.Property(p => p.AccesoHabilitado)
            .IsRequired()
            .HasColumnName("acceso_habilitado");

        builder.Property(p => p.EstadoActualizacion)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("estado_actualizacion");

        builder.Property(p => p.DatosPersonalesJson)
            .HasColumnName("datos_personales_json");

        builder.Property(p => p.ArchivosSubidosJson)
            .HasColumnName("archivos_subidos_json");

        builder.Property(p => p.FechaCreacionUtc)
            .IsRequired()
            .HasColumnName("fecha_creacion_utc");

        builder.HasOne<Institucion>()
            .WithMany()
            .HasForeignKey(p => p.InstitucionId)
            .OnDelete(DeleteBehavior.Restrict);

        // PD-09: Unicidad del documento dentro de la misma institución;
        // permite que un mismo documento exista en instituciones distintas.
        builder.HasIndex(p => new { p.InstitucionId, p.Documento })
            .IsUnique()
            .HasDatabaseName("ix_personas_institucion_id_documento");
    }
}
