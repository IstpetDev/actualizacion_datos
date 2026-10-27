namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Configuraciones.HojaDeVida;

using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class CapacitacionObligatoriaConfiguracion : IEntityTypeConfiguration<CapacitacionObligatoria>
{
    public void Configure(EntityTypeBuilder<CapacitacionObligatoria> builder)
    {
        builder.ToTable("capacitaciones_obligatorias");

        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasColumnName("id");

        builder.Property(c => c.InstitucionId)
            .IsRequired()
            .HasColumnName("institucion_id");

        builder.Property(c => c.Nombre)
            .HasMaxLength(300)
            .IsRequired()
            .HasColumnName("nombre");

        builder.Property(c => c.InstitucionOrganizadora)
            .HasMaxLength(300)
            .HasColumnName("institucion_organizadora");

        builder.Property(c => c.HorasEsperadas)
            .HasColumnName("horas_esperadas");

        builder.Property(c => c.FechaRealizacion)
            .HasColumnName("fecha_realizacion");

        builder.Property(c => c.TipoFuncionarioId)
            .HasColumnName("tipo_funcionario_id");

        builder.Property(c => c.Activo)
            .IsRequired()
            .HasColumnName("activo");

        builder.Property(c => c.Orden)
            .IsRequired()
            .HasColumnName("orden");

        builder.HasOne<Institucion>()
            .WithMany()
            .HasForeignKey(c => c.InstitucionId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<TipoFuncionario>()
            .WithMany()
            .HasForeignKey(c => c.TipoFuncionarioId)
            .OnDelete(DeleteBehavior.SetNull);

        // Nombre único entre activas por institución
        builder.HasIndex(c => new { c.InstitucionId, c.Nombre })
            .IsUnique()
            .HasFilter("activo = true")
            .HasDatabaseName("ix_capacitaciones_obligatorias_institucion_nombre_activo");
    }
}
