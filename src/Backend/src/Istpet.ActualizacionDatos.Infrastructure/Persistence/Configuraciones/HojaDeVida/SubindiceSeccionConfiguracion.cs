namespace Istpet.ActualizacionDatos.Infrastructure.Persistence.Configuraciones.HojaDeVida;

using Istpet.ActualizacionDatos.Domain;
using Istpet.ActualizacionDatos.Domain.HojaDeVida;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class SubindiceSeccionConfiguracion : IEntityTypeConfiguration<SubindiceSeccion>
{
    public void Configure(EntityTypeBuilder<SubindiceSeccion> builder)
    {
        builder.ToTable("subindices_seccion");

        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasColumnName("id");

        builder.Property(s => s.InstitucionId)
            .IsRequired()
            .HasColumnName("institucion_id");

        builder.Property(s => s.Seccion)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired()
            .HasColumnName("seccion");

        builder.Property(s => s.Nombre)
            .HasMaxLength(150)
            .IsRequired()
            .HasColumnName("nombre");

        builder.Property(s => s.Descripcion)
            .HasMaxLength(500)
            .HasColumnName("descripcion");

        builder.Property(s => s.TipoFuncionarioId)
            .HasColumnName("tipo_funcionario_id");

        builder.Property(s => s.EsObligatorio)
            .IsRequired()
            .HasColumnName("es_obligatorio");

        builder.Property(s => s.Orden)
            .IsRequired()
            .HasColumnName("orden");

        builder.Property(s => s.Activo)
            .IsRequired()
            .HasColumnName("activo");

        builder.HasOne<Institucion>()
            .WithMany()
            .HasForeignKey(s => s.InstitucionId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<TipoFuncionario>()
            .WithMany()
            .HasForeignKey(s => s.TipoFuncionarioId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(s => s.InstitucionId)
            .HasDatabaseName("ix_subindices_seccion_institucion_id");

        builder.HasIndex(s => new { s.InstitucionId, s.Seccion, s.TipoFuncionarioId, s.Nombre })
            .IsUnique()
            .AreNullsDistinct(false)
            .HasFilter("activo = true")
            .HasDatabaseName("ix_subindices_seccion_institucion_seccion_alcance_nombre_activo");
    }
}
