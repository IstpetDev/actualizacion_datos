namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Configuraciones;

using Istpet.ActualizacionDatos.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public sealed class AvisoProteccionDatosConfiguracion : IEntityTypeConfiguration<AvisoProteccionDatos>
{
    public void Configure(EntityTypeBuilder<AvisoProteccionDatos> builder)
    {
        builder.ToTable("avisos_proteccion_datos", tabla =>
        {
            tabla.HasCheckConstraint("ck_aviso_roles", "roles_destinatarios BETWEEN 1 AND 15");
            tabla.HasCheckConstraint("ck_aviso_vigencia", "vigente_hasta_utc IS NULL OR vigente_hasta_utc > vigente_desde_utc");
        });
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).HasColumnName("id");
        builder.Property(a => a.InstitucionId).HasColumnName("institucion_id");
        builder.Property(a => a.RolesDestinatarios).HasColumnName("roles_destinatarios");
        builder.Property(a => a.VigenteDesdeUtc).HasColumnName("vigente_desde_utc")
            .HasConversion(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
        builder.Property(a => a.VigenteHastaUtc).HasColumnName("vigente_hasta_utc")
            .HasConversion(v => v, v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : (DateTime?)null);
        builder.HasAlternateKey(a => new { a.Id, a.InstitucionId });
        builder.HasIndex(a => new { a.InstitucionId, a.Version }).IsUnique();
        builder.Property(a => a.Version).HasColumnName("version").HasMaxLength(64).IsRequired();
        builder.Property(a => a.Titulo).HasColumnName("titulo").HasMaxLength(200).IsRequired();
        builder.Property(a => a.Responsable).HasColumnName("responsable").HasMaxLength(500).IsRequired();
        builder.Property(a => a.Contenido).HasColumnName("contenido").HasMaxLength(100_000).IsRequired();
        builder.Property(a => a.DeclaracionAceptacion).HasColumnName("declaracion_aceptacion").HasMaxLength(1_000).IsRequired();
        builder.Property(a => a.FuenteOficial).HasColumnName("fuente_oficial").HasMaxLength(2_048).IsRequired();
        builder.Property(a => a.EvidenciaAprobacion).HasColumnName("evidencia_aprobacion").HasMaxLength(1_000).IsRequired();
        builder.HasOne<Institucion>().WithMany().HasForeignKey(a => a.InstitucionId).OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class AceptacionProteccionDatosConfiguracion : IEntityTypeConfiguration<AceptacionProteccionDatos>
{
    public void Configure(EntityTypeBuilder<AceptacionProteccionDatos> builder)
    {
        builder.ToTable("aceptaciones_proteccion_datos");
        builder.Property(a => a.InstitucionId).HasColumnName("institucion_id");
        builder.Property(a => a.PersonaId).HasColumnName("persona_id");
        builder.Property(a => a.AvisoId).HasColumnName("aviso_id");
        builder.Property(a => a.FechaUtc).HasColumnName("fecha_utc")
            .HasConversion(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
        builder.HasKey(a => new { a.InstitucionId, a.PersonaId, a.AvisoId });
        builder.HasOne<Persona>().WithMany()
            .HasForeignKey(a => new { a.PersonaId, a.InstitucionId })
            .HasPrincipalKey(p => new { p.Id, p.InstitucionId }).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<AvisoProteccionDatos>().WithMany()
            .HasForeignKey(a => new { a.AvisoId, a.InstitucionId })
            .HasPrincipalKey(a => new { a.Id, a.InstitucionId }).OnDelete(DeleteBehavior.Restrict);
    }
}
